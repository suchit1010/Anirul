import crypto from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { sharesTable } from "@workspace/db/schema/shares";

import { requireAuth, type AuthedRequest } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const DEFAULT_PASSCODE = "doctor2026";
const MAX_EXPIRY_DAYS = 365;

function normalizeExpiryDays(value: unknown): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 30;
  return Math.max(1, Math.min(MAX_EXPIRY_DAYS, Math.floor(parsed)));
}

function doctorPasscodeValid(req: Request): boolean {
  const required = process.env["DOCTOR_PASSCODE"] || DEFAULT_PASSCODE;
  const provided =
    (req.header("x-doctor-passcode") || "").trim() ||
    (typeof req.query["passcode"] === "string" ? req.query["passcode"].trim() : "");
  return !!provided && provided === required;
}

router.post("/shares/create", requireAuth, async (req: AuthedRequest, res: Response) => {
  const expiresInDays = normalizeExpiryDays(req.body?.expiresInDays);
  const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 240) : null;
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  try {
    const inserted = await db
      .insert(sharesTable)
      .values({
        patientId: req.user!.id,
        token,
        note,
        expiresAt,
      })
      .returning();

    res.json({
      share: inserted[0],
      shareToken: token,
      expiresAt,
    });
  } catch (err) {
    logger.error({ err }, "create share failed");
    res.status(500).json({ error: "Could not create share link" });
  }
});

router.get("/shares", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(sharesTable)
      .where(eq(sharesTable.patientId, req.user!.id));
    res.json({ shares: rows });
  } catch (err) {
    logger.error({ err }, "list shares failed");
    res.status(500).json({ error: "Could not list share links" });
  }
});

router.post("/shares/:id/revoke", requireAuth, async (req: AuthedRequest, res: Response) => {
  const idParam = req.params["id"];
  const shareId = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!shareId) {
    res.status(400).json({ error: "share id required" });
    return;
  }

  try {
    const updated = await db
      .update(sharesTable)
      .set({ revokedAt: new Date() })
      .where(and(eq(sharesTable.id, shareId), eq(sharesTable.patientId, req.user!.id)))
      .returning();

    if (!updated.length) {
      res.status(404).json({ error: "Share not found" });
      return;
    }
    res.json({ share: updated[0] });
  } catch (err) {
    logger.error({ err }, "revoke share failed");
    res.status(500).json({ error: "Could not revoke share" });
  }
});

router.post("/doctor/verify-access", async (req: Request, res: Response) => {
  if (!doctorPasscodeValid(req)) {
    res.status(401).json({ error: "Doctor passcode required" });
    return;
  }

  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (!token) {
    res.status(400).json({ error: "token required" });
    return;
  }

  try {
    const now = new Date();
    const rows = await db
      .select({
        share: sharesTable,
        patient: usersTable,
      })
      .from(sharesTable)
      .innerJoin(usersTable, eq(usersTable.id, sharesTable.patientId))
      .where(
        and(
          eq(sharesTable.token, token),
          isNull(sharesTable.revokedAt),
          or(isNull(sharesTable.expiresAt), gt(sharesTable.expiresAt, now)),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      res.status(403).json({ error: "Invalid, expired, or revoked token" });
      return;
    }

    res.json({
      accessGranted: true,
      patientId: row.patient.id,
      patient: {
        id: row.patient.id,
        name: row.patient.name,
        phone: row.patient.phone,
      },
      share: {
        id: row.share.id,
        note: row.share.note,
        expiresAt: row.share.expiresAt,
      },
    });
  } catch (err) {
    logger.error({ err }, "verify share token failed");
    res.status(500).json({ error: "Could not verify share token" });
  }
});

export default router;
