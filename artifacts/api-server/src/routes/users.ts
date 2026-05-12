import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { ne, eq } from "drizzle-orm";
import { requireSession, type AuthedRequest } from "../middlewares/session";

const router = Router();

router.get("/users/me", requireSession, async (req: AuthedRequest, res) => {
  const userId = req.currentUserId!;
  const [user] = await db
    .select({
      id: usersTable.id,
      phone: usersTable.phone,
      name: usersTable.name,
      isOnline: usersTable.isOnline,
      lastSeen: usersTable.lastSeen,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    ...user,
    lastSeen: user.lastSeen ? user.lastSeen.toISOString() : null,
  });
});

router.get("/users", requireSession, async (req: AuthedRequest, res) => {
  const userId = req.currentUserId!;
  const users = await db
    .select({
      id: usersTable.id,
      phone: usersTable.phone,
      name: usersTable.name,
      isOnline: usersTable.isOnline,
      lastSeen: usersTable.lastSeen,
    })
    .from(usersTable)
    .where(ne(usersTable.id, userId));

  res.json(
    users.map((u) => ({
      ...u,
      lastSeen: u.lastSeen ? u.lastSeen.toISOString() : null,
    })),
  );
});

export default router;
