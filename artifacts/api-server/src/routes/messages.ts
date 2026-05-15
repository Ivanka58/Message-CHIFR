import { Router } from "express";
import { db, messagesTable, usersTable } from "@workspace/db";
import { eq, or, and, desc, count, isNull } from "drizzle-orm";
import { requireSession, type AuthedRequest } from "../middlewares/session";
import { sendPushToUser } from "./push";

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

// IMPORTANT: /messages/stats and /messages/unread MUST be before /messages/:userId
// otherwise Express matches "stats"/"unread" as a userId param.

router.get("/messages/stats", requireSession, async (req: AuthedRequest, res) => {
  const userId = req.currentUserId!;
  const [sentResult] = await db.select({ value: count() }).from(messagesTable).where(eq(messagesTable.fromUserId, userId));
  const [receivedResult] = await db.select({ value: count() }).from(messagesTable).where(eq(messagesTable.toUserId, userId));
  const contacts = await db.selectDistinct({ id: messagesTable.toUserId }).from(messagesTable).where(eq(messagesTable.fromUserId, userId));
  res.json({
    totalSent: sentResult.value,
    totalReceived: receivedResult.value,
    encryptedCount: 0,
    contactCount: contacts.length,
  });
});

router.get("/messages/unread", requireSession, async (req: AuthedRequest, res) => {
  const userId = req.currentUserId!;
  const results = await db
    .select({ fromUserId: messagesTable.fromUserId, cnt: count() })
    .from(messagesTable)
    .where(and(eq(messagesTable.toUserId, userId), isNull(messagesTable.readAt)))
    .groupBy(messagesTable.fromUserId);

  const map: Record<number, number> = {};
  for (const r of results) {
    map[r.fromUserId] = Number(r.cnt);
  }
  res.json(map);
});

// GET /messages/:userId — fetch conversation and auto-mark incoming as read
router.get("/messages/:userId", requireSession, async (req: AuthedRequest, res) => {
  const currentUserId = req.currentUserId!;
  const otherUserId = Number(req.params.userId);
  if (isNaN(otherUserId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const conversation = or(
    and(eq(messagesTable.fromUserId, currentUserId), eq(messagesTable.toUserId, otherUserId)),
    and(eq(messagesTable.fromUserId, otherUserId), eq(messagesTable.toUserId, currentUserId)),
  );

  // Mark unread incoming messages as read
  await db
    .update(messagesTable)
    .set({ readAt: new Date() })
    .where(and(
      eq(messagesTable.toUserId, currentUserId),
      eq(messagesTable.fromUserId, otherUserId),
      isNull(messagesTable.readAt),
    ));

  const msgs = await db
    .select({
      id: messagesTable.id,
      fromUserId: messagesTable.fromUserId,
      toUserId: messagesTable.toUserId,
      text: messagesTable.text,
      isEncrypted: messagesTable.isEncrypted,
      timestamp: messagesTable.timestamp,
      readAt: messagesTable.readAt,
      fromName: usersTable.name,
    })
    .from(messagesTable)
    .leftJoin(usersTable, eq(messagesTable.fromUserId, usersTable.id))
    .where(conversation)
    .orderBy(desc(messagesTable.timestamp))
    .limit(100);

  res.json(
    msgs.reverse().map((m) => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
      readAt: m.readAt ? m.readAt.toISOString() : null,
      fromName: m.fromName ?? null,
    })),
  );
});

// POST /messages — send a message + push notification
router.post("/messages", requireSession, async (req: AuthedRequest, res) => {
  const currentUserId = req.currentUserId!;

  if (!checkRateLimit(currentUserId)) {
    res.status(429).json({ error: "Rate limit exceeded." });
    return;
  }

  const { toUserId, text } = req.body as { toUserId: number; text: string };
  if (!toUserId || !text) { res.status(400).json({ error: "toUserId and text are required" }); return; }

  const cleanText = sanitizeText(String(text));
  if (!cleanText) { res.status(400).json({ error: "Message text cannot be empty" }); return; }

  const [msg] = await db
    .insert(messagesTable)
    .values({ fromUserId: currentUserId, toUserId: Number(toUserId), text: cleanText, isEncrypted: false })
    .returning();

  const [fromUser] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, currentUserId)).limit(1);

  req.log.info({ msgId: msg.id, from: currentUserId, to: toUserId }, "Message sent");

  sendPushToUser(Number(toUserId), {
    title: `SHIFR — ${fromUser?.name ?? "Неизвестный"}`,
    body: cleanText.length > 120 ? cleanText.slice(0, 117) + "…" : cleanText,
    tag: `msg-from-${currentUserId}`,
  }).catch(() => {});

  res.status(201).json({
    ...msg,
    timestamp: msg.timestamp.toISOString(),
    readAt: null,
    fromName: fromUser?.name ?? null,
  });
});

export default router;
