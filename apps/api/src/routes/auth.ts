import { Router } from "express";
import { randomUUID } from "crypto";
import { db, usersTable } from "@shifr/db";
import { eq } from "drizzle-orm";
import { logger } from "../logger.js";

const router = Router();

const DEMO_CODE = "A-123456";

function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+\-\s()]/g, "").trim();
}

function generateName(phone: string): string {
  const suffix = phone.slice(-4);
  return `User_${suffix}`;
}

router.post("/auth/login", async (req, res) => {
  const { phone } = req.body;
  if (!phone || typeof phone !== "string") {
    res.status(400).json({ error: "Phone number required" });
    return;
  }

  const cleanPhone = sanitizePhone(phone);
  if (!cleanPhone) {
    res.status(400).json({ error: "Invalid phone number" });
    return;
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.phone, cleanPhone))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(usersTable).values({
      phone: cleanPhone,
      name: generateName(cleanPhone),
      isOnline: false,
    });
  }

  logger.info({ phone: cleanPhone }, "Login requested");
  res.json({ message: "Verification code sent", code: DEMO_CODE });
});

router.post("/auth/verify", async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    res.status(400).json({ error: "Phone and code required" });
    return;
  }

  if (code !== DEMO_CODE) {
    res.status(401).json({ error: "Invalid verification code" });
    return;
  }

  const cleanPhone = sanitizePhone(phone);
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, cleanPhone))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const sessionId = randomUUID();
  await db
    .update(usersTable)
    .set({ sessionId, isOnline: true, lastSeen: new Date() })
    .where(eq(usersTable.id, user.id));

  logger.info({ userId: user.id }, "User verified");
  res.json({
    sessionId,
    userId: user.id,
    name: user.name,
    phone: user.phone,
  });
});

export default router;
