import { Router } from "express";
import { db, usersTable, messagesTable } from "@workspace/db";
import { eq, count, desc, ne } from "drizzle-orm";

const router = Router();

router.get("/admin/users", async (_req, res) => {
  const users = await db
    .select({
      id: usersTable.id,
      phone: usersTable.phone,
      name: usersTable.name,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  const usersWithCounts = await Promise.all(
    users.map(async (u) => {
      const [msgCount] = await db
        .select({ value: count() })
        .from(messagesTable)
        .where(eq(messagesTable.fromUserId, u.id));
      return {
        id: u.id,
        phone: u.phone,
        name: u.name,
        messageCount: msgCount.value,
        createdAt: u.createdAt.toISOString(),
      };
    }),
  );

  res.json(usersWithCounts);
});

router.get("/admin/messages", async (_req, res) => {
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
    .orderBy(desc(messagesTable.timestamp))
    .limit(100);

  res.json(
    msgs.map((m) => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
      fromName: m.fromName ?? null,
    })),
  );
});

// POST /api/admin/purge — wipe all messages + non-test users, reset sessions
// Protected by a secret key passed as ?key=... query param
router.get("/admin/purge", async (req, res) => {
  const SECRET = process.env.ADMIN_PURGE_KEY ?? "shifr-purge-2025";
  if (req.query.key !== SECRET) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Delete all messages
  await db.delete(messagesTable);

  // Reset sessions and online status for ALL users
  await db
    .update(usersTable)
    .set({ sessionId: null, isOnline: false });

  // Delete all users except the seeded test contact
  await db
    .delete(usersTable)
    .where(ne(usersTable.phone, "+0000000000"));

  res.json({ ok: true, message: "Database purged. All users logged out." });
});

export default router;
