import { Router } from "express";
import { db, messagesTable, usersTable } from "@shifr/db";
import { eq, or, and, desc, count, isNull } from "drizzle-orm";
import { requireSession, type AuthedRequest } from "../middlewares/session.js";
import { sendPushToUser } from "./push.js";

const router = Router();

const rateLimitMap = new Map<number, { count: number; windowStart: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function sanitizeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

function formatMsg(m: typeof messagesTable.$inferSelect & { fromName?: string | null }) {
  return {
    ...m,
    timestamp: m.timestamp.toISOString(),
    readAt: m.readAt ? m.readAt.toISOString() : null,
    editedAt: m.editedAt ? m.editedAt.toISOString() : null,
    fromName: m.fromName ?? null,
  };
}

router.get("/messages/stats", requireSession, async (req: AuthedRequest, res) => {
  const userId = req.currentUserId!;
  const [sentResult] = await db.select({ value: count() }).from(messagesTable).where(eq(messagesTable.fromUserId, userId));
  const [receivedResult] = await db.select({ value: count() }).from(messagesTable).where(eq(messagesTable.toUserId, userId));
  const contacts = await db.selectDistinct({ id: messagesTable.toUserId }).from(messagesTable).where(eq(messagesTable.fromUserId, userId));
  res.json({ totalSent: sentResult.value, totalReceived: receivedResult.value, encryptedCount: 0, contactCount: contacts.length });
});

router.get("/messages/unread", requireSession, async (req: AuthedRequest, res) => {
  const userId = req.currentUserId!;
  const results = await db
    .select({ fromUserId: messagesTable.fromUserId, cnt: count() })
    .from(messagesTable)
    .where(and(eq(messagesTable.toUserId, userId), isNull(messagesTable.readAt), eq(messagesTable.deletedForRecipient, false)))
    .groupBy(messagesTable.fromUserId);
  const map: Record<number, number> = {};
  for (const r of results) map[r.fromUserId] = Number(r.cnt);
  res.json(map);
});

router.get("/messages/:userId", requireSession, async (req: AuthedRequest, res) => {
  const currentUserId = req.currentUserId!;
  const otherUserId = Number(req.params.userId);
  if (isNaN(otherUserId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const conversation = or(
    and(eq(messagesTable.fromUserId, currentUserId), eq(messagesTable.toUserId, otherUserId)),
    and(eq(messagesTable.fromUserId, otherUserId), eq(messagesTable.toUserId, currentUserId)),
  );

  await db.update(messagesTable)
    .set({ readAt: new Date() })
    .where(and(eq(messagesTable.toUserId, currentUserId), eq(messagesTable.fromUserId, otherUserId), isNull(messagesTable.readAt)));

  const msgs = await db
    .select({
      id: messagesTable.id,
      fromUserId: messagesTable.fromUserId,
      toUserId: messagesTable.toUserId,
      text: messagesTable.text,
      encryptedText: messagesTable.encryptedText,
      isEncrypted: messagesTable.isEncrypted,
      timestamp: messagesTable.timestamp,
      readAt: messagesTable.readAt,
      editedAt: messagesTable.editedAt,
      deletedForSender: messagesTable.deletedForSender,
      deletedForRecipient: messagesTable.deletedForRecipient,
      fromName: usersTable.name,
    })
    .from(messagesTable)
    .leftJoin(usersTable, eq(messagesTable.fromUserId, usersTable.id))
    .where(conversation)
    .orderBy(desc(messagesTable.timestamp))
    .limit(100);

  const filtered = msgs
    .reverse()
    .filter((m) => {
      if (m.fromUserId === currentUserId) return !m.deletedForSender;
      return !m.deletedForRecipient;
    })
    .map((m) => formatMsg(m));

  res.json(filtered);
});

router.post("/messages", requireSession, async (req: AuthedRequest, res) => {
  const currentUserId = req.currentUserId!;
  if (!checkRateLimit(currentUserId)) { res.status(429).json({ error: "Rate limit exceeded." }); return; }

  const { toUserId, text } = req.body as { toUserId: number; text: string };
  if (!toUserId || !text) { res.status(400).json({ error: "toUserId and text are required" }); return; }

  const cleanText = sanitizeText(String(text));
  if (!cleanText) { res.status(400).json({ error: "Message text cannot be empty" }); return; }

  const [msg] = await db
    .insert(messagesTable)
    .values({ fromUserId: currentUserId, toUserId: Number(toUserId), text: cleanText, isEncrypted: false })
    .returning();

  const [fromUser] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, currentUserId)).limit(1);

  sendPushToUser(Number(toUserId), {
    title: `SHIFR — ${fromUser?.name ?? "Неизвестный"}`,
    body: cleanText.length > 120 ? cleanText.slice(0, 117) + "…" : cleanText,
    tag: `msg-from-${currentUserId}`,
  }).catch(() => {});

  res.status(201).json(formatMsg({ ...msg, fromName: fromUser?.name ?? null }));
});

router.delete("/messages/:id", requireSession, async (req: AuthedRequest, res) => {
  const msgId = Number(req.params.id);
  const scope = req.query.scope as string;
  if (isNaN(msgId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (scope !== "self" && scope !== "all") { res.status(400).json({ error: "scope must be 'self' or 'all'" }); return; }

  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId)).limit(1);
  if (!msg) { res.status(404).json({ error: "Not found" }); return; }

  const userId = req.currentUserId!;
  const isSender = msg.fromUserId === userId;
  const isRecipient = msg.toUserId === userId;
  if (!isSender && !isRecipient) { res.status(403).json({ error: "Forbidden" }); return; }

  if (scope === "all") {
    if (!isSender) { res.status(403).json({ error: "Only sender can delete for all" }); return; }
    await db.delete(messagesTable).where(eq(messagesTable.id, msgId));
  } else {
    const update = isSender ? { deletedForSender: true } : { deletedForRecipient: true };
    await db.update(messagesTable).set(update).where(eq(messagesTable.id, msgId));
  }

  res.json({ ok: true });
});

router.patch("/messages/:id", requireSession, async (req: AuthedRequest, res) => {
  const msgId = Number(req.params.id);
  if (isNaN(msgId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { text } = req.body as { text: string };
  const cleanText = sanitizeText(String(text ?? ""));
  if (!cleanText) { res.status(400).json({ error: "Text required" }); return; }

  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId)).limit(1);
  if (!msg) { res.status(404).json({ error: "Not found" }); return; }
  if (msg.fromUserId !== req.currentUserId!) { res.status(403).json({ error: "Not your message" }); return; }

  const [updated] = await db
    .update(messagesTable)
    .set({ text: cleanText, editedAt: new Date() })
    .where(eq(messagesTable.id, msgId))
    .returning();

  res.json(formatMsg({ ...updated, fromName: null }));
});

export default router;
