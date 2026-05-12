import { Router } from "express";
import { db, messagesTable, usersTable } from "@workspace/db";
import { eq, or, and, desc, count } from "drizzle-orm";
import { requireSession, type AuthedRequest } from "../middlewares/session";

const router = Router();

const rateLimitMap = new Map<number, { count: number; windowStart: number }>();
const RATE_LIMIT = 30;
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

function encryptText(text: string): string {
  return Array.from(text)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
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

router.get("/messages/:userId", requireSession, async (req: AuthedRequest, res) => {
  const currentUserId = req.currentUserId!;
  const otherUserId = Number(req.params.userId);

  if (isNaN(otherUserId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const msgs = await db
    .select({
      id: messagesTable.id,
      fromUserId: messagesTable.fromUserId,
      toUserId: messagesTable.toUserId,
      text: messagesTable.text,
      encryptedText: messagesTable.encryptedText,
      isEncrypted: messagesTable.isEncrypted,
      timestamp: messagesTable.timestamp,
      fromName: usersTable.name,
    })
    .from(messagesTable)
    .leftJoin(usersTable, eq(messagesTable.fromUserId, usersTable.id))
    .where(
      or(
        and(
          eq(messagesTable.fromUserId, currentUserId),
          eq(messagesTable.toUserId, otherUserId),
        ),
        and(
          eq(messagesTable.fromUserId, otherUserId),
          eq(messagesTable.toUserId, currentUserId),
        ),
      ),
    )
    .orderBy(desc(messagesTable.timestamp))
    .limit(50);

  res.json(
    msgs.reverse().map((m) => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
      fromName: m.fromName ?? null,
    })),
  );
});

router.post("/messages", requireSession, async (req: AuthedRequest, res) => {
  const currentUserId = req.currentUserId!;

  if (!checkRateLimit(currentUserId)) {
    res.status(429).json({ error: "Rate limit exceeded. Max 30 messages per minute." });
    return;
  }

  const { toUserId, text } = req.body;
  if (!toUserId || !text) {
    res.status(400).json({ error: "toUserId and text are required" });
    return;
  }

  const cleanText = sanitizeText(String(text));
  if (!cleanText) {
    res.status(400).json({ error: "Message text cannot be empty" });
    return;
  }

  const encryptedText = encryptText(cleanText);

  const [msg] = await db
    .insert(messagesTable)
    .values({
      fromUserId: currentUserId,
      toUserId: Number(toUserId),
      text: cleanText,
      encryptedText,
      isEncrypted: true,
    })
    .returning();

  const [fromUser] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, currentUserId))
    .limit(1);

  req.log.info({ msgId: msg.id, from: currentUserId, to: toUserId }, "Message sent");
  res.status(201).json({
    ...msg,
    timestamp: msg.timestamp.toISOString(),
    fromName: fromUser?.name ?? null,
  });
});

router.get("/messages/stats", requireSession, async (req: AuthedRequest, res) => {
  const userId = req.currentUserId!;

  const [sentResult] = await db
    .select({ value: count() })
    .from(messagesTable)
    .where(eq(messagesTable.fromUserId, userId));

  const [receivedResult] = await db
    .select({ value: count() })
    .from(messagesTable)
    .where(eq(messagesTable.toUserId, userId));

  const [encryptedResult] = await db
    .select({ value: count() })
    .from(messagesTable)
    .where(and(eq(messagesTable.fromUserId, userId), eq(messagesTable.isEncrypted, true)));

  const contacts = await db
    .selectDistinct({ id: messagesTable.toUserId })
    .from(messagesTable)
    .where(eq(messagesTable.fromUserId, userId));

  res.json({
    totalSent: sentResult.value,
    totalReceived: receivedResult.value,
    encryptedCount: encryptedResult.value,
    contactCount: contacts.length,
  });
});

export default router;
