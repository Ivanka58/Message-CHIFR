import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { ne, eq } from "drizzle-orm";
import { requireSession, type AuthedRequest } from "../middlewares/session";

const router = Router();

const userFields = {
  id: usersTable.id,
  phone: usersTable.phone,
  name: usersTable.name,
  avatar: usersTable.avatar,
  isOnline: usersTable.isOnline,
  lastSeen: usersTable.lastSeen,
};

function formatUser(u: {
  id: number;
  phone: string;
  name: string;
  avatar: string | null;
  isOnline: boolean;
  lastSeen: Date | null;
}) {
  return {
    ...u,
    lastSeen: u.lastSeen ? u.lastSeen.toISOString() : null,
  };
}

router.get("/users/me", requireSession, async (req: AuthedRequest, res) => {
  const userId = req.currentUserId!;
  const [user] = await db.select(userFields).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

router.patch("/users/me", requireSession, async (req: AuthedRequest, res) => {
  const userId = req.currentUserId!;
  const { name, avatar } = req.body as { name?: string; avatar?: string };

  const updates: Partial<{ name: string; avatar: string }> = {};
  if (typeof name === "string" && name.trim()) updates.name = name.trim().slice(0, 50);
  if (typeof avatar === "string") updates.avatar = avatar.slice(0, 200);

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();

  res.json(formatUser({ ...updated, lastSeen: updated.lastSeen ?? null }));
});

router.get("/users", requireSession, async (req: AuthedRequest, res) => {
  const userId = req.currentUserId!;
  const users = await db.select(userFields).from(usersTable).where(ne(usersTable.id, userId));
  res.json(users.map(formatUser));
});

router.get("/users/:id", requireSession, async (req: AuthedRequest, res) => {
  const targetId = Number(req.params.id);
  if (isNaN(targetId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [user] = await db.select(userFields).from(usersTable).where(eq(usersTable.id, targetId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

export default router;
