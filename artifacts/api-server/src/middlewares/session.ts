import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthedRequest extends Request {
  currentUserId?: number;
}

export async function requireSession(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const sessionId = req.headers["x-session-id"] as string | undefined;
  if (!sessionId) {
    res.status(401).json({ error: "Missing session ID" });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.sessionId, sessionId))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid session" });
    return;
  }

  req.currentUserId = user.id;
  next();
}
