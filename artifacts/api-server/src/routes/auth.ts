import { Router, type IRouter, type Request, type Response } from "express";
import { db, otpCodesTable, sessionsTable, usersTable } from "@workspace/db";
import { and, desc, eq, gt, isNull } from "drizzle-orm";

import { sendSms, smsConfigured } from "../lib/sms";
import {
  createSession,
  generateOtp,
  hashCode,
  type AuthedRequest,
  requireAuth,
} from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function normalizePhone(input: string): string {
  const cleaned = (input || "").replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return `+${cleaned}`;
}

router.post("/auth/start", async (req: Request, res: Response) => {
  try {
    const { phone } = (req.body ?? {}) as { phone?: string };
    if (!phone || phone.replace(/\D/g, "").length < 8) {
      res.status(400).json({ error: "Valid phone number required" });
      return;
    }
    const normalized = normalizePhone(phone);
    const code = generateOtp();
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await db.insert(otpCodesTable).values({ phone: normalized, codeHash, expiresAt });

    const sms = await sendSms(
      normalized,
      `${code} is your SwasthAI verification code. Valid for 10 minutes.`,
    );

    res.json({
      ok: true,
      phone: normalized,
      smsConfigured,
      // demoCode is only returned when Twilio is NOT configured, for dev/testing only
      demoCode: sms.demoCode,
    });
  } catch (err) {
    logger.error({ err }, "auth/start failed");
    res.status(500).json({ error: "Could not start authentication" });
  }
});

router.post("/auth/verify", async (req: Request, res: Response) => {
  try {
    const { phone, code } = (req.body ?? {}) as { phone?: string; code?: string };
    if (!phone || !code) {
      res.status(400).json({ error: "phone and code required" });
      return;
    }
    const normalized = normalizePhone(phone);

    const row = await db
      .select()
      .from(otpCodesTable)
      .where(
        and(
          eq(otpCodesTable.phone, normalized),
          isNull(otpCodesTable.consumedAt),
          gt(otpCodesTable.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(otpCodesTable.createdAt))
      .limit(1);

    const otp = row[0];
    if (!otp) {
      res.status(400).json({ error: "No active code. Request a new one." });
      return;
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      res.status(429).json({ error: "Too many attempts. Request a new code." });
      return;
    }

    const submittedHash = hashCode(code.trim());
    if (submittedHash !== otp.codeHash) {
      await db
        .update(otpCodesTable)
        .set({ attempts: otp.attempts + 1 })
        .where(eq(otpCodesTable.id, otp.id));
      res.status(400).json({ error: "Incorrect code" });
      return;
    }

    await db
      .update(otpCodesTable)
      .set({ consumedAt: new Date() })
      .where(eq(otpCodesTable.id, otp.id));

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, normalized))
      .limit(1);
    let user = existing[0];
    if (!user) {
      const inserted = await db
        .insert(usersTable)
        .values({ phone: normalized, role: "patient" })
        .returning();
      user = inserted[0];
    }

    if (!user) {
      res.status(500).json({ error: "Could not create user" });
      return;
    }

    const session = await createSession(user.id);
    res.json({
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      user,
    });
  } catch (err) {
    logger.error({ err }, "auth/verify failed");
    res.status(500).json({ error: "Could not verify code" });
  }
});

router.get("/auth/me", async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ user: req.user });
});

router.post("/auth/logout", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (token) {
      await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

export default router;
