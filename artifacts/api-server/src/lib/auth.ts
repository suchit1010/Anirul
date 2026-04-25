import crypto from "node:crypto";
import { db, sessionsTable, usersTable, type User } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

const SESSION_TTL_DAYS = 60;

export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ userId, token, expiresAt });
  return { token, expiresAt };
}

export async function userFromToken(token: string): Promise<User | null> {
  if (!token) return null;
  const rows = await db
    .select({
      session: sessionsTable,
      user: usersTable,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
    .where(eq(sessionsTable.token, token))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.session.expiresAt.getTime() < Date.now()) return null;
  return row.user;
}

export interface AuthedRequest extends Request {
  user?: User;
}

export function getBearer(req: Request): string {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7).trim();
  return "";
}

export async function attachUser(req: AuthedRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = getBearer(req);
    if (token) {
      const user = await userFromToken(token);
      if (user) req.user = user;
    }
  } catch {
    // ignore
  }
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}
