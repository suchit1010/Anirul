import { Router, type IRouter, type Request, type Response } from "express";
import { db, documentsTable, usersTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";

import { logger } from "../lib/logger";

const router: IRouter = Router();

const DEFAULT_PASSCODE = "doctor2026";

function checkAccess(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const required = process.env["DOCTOR_PASSCODE"] || DEFAULT_PASSCODE;
  const provided =
    (req.header("x-doctor-passcode") || "").trim() ||
    (typeof req.query["passcode"] === "string" ? req.query["passcode"].trim() : "");
  if (!provided) {
    return { ok: false, status: 401, error: "Doctor passcode required" };
  }
  if (provided !== required) {
    return { ok: false, status: 403, error: "Invalid doctor passcode" };
  }
  return { ok: true };
}

interface LabRow {
  id?: string;
  name?: string;
  value?: number | string;
  unit?: string;
  status?: string;
  date?: string;
  referenceLow?: number;
  referenceHigh?: number;
}

interface MedRow {
  id?: string;
  name?: string;
  dose?: string;
  frequency?: string;
  startDate?: string;
  active?: boolean;
}

router.get("/doctor/patients", async (req: Request, res: Response) => {
  const access = checkAccess(req);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }
  try {
    const rows = await db
      .select({
        id: usersTable.id,
        phone: usersTable.phone,
        name: usersTable.name,
        language: usersTable.language,
        createdAt: usersTable.createdAt,
        documentCount: sql<number>`coalesce(count(${documentsTable.id}), 0)::int`,
        lastUploadAt: sql<string | null>`max(${documentsTable.uploadedAt})`,
      })
      .from(usersTable)
      .leftJoin(documentsTable, eq(documentsTable.userId, usersTable.id))
      .groupBy(usersTable.id)
      .orderBy(desc(sql`max(${documentsTable.uploadedAt})`));
    res.json({ patients: rows });
  } catch (err) {
    logger.error({ err }, "doctor list patients failed");
    res.status(500).json({ error: "Could not load patients" });
  }
});

router.get("/doctor/patients/:id", async (req: Request, res: Response) => {
  const access = checkAccess(req);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }
  const idParam = req.params["id"];
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) {
    res.status(400).json({ error: "id required" });
    return;
  }
  try {
    const userRows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);
    const patient = userRows[0];
    if (!patient) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }
    const docs = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.userId, id))
      .orderBy(desc(documentsTable.uploadedAt));

    const labMap = new Map<string, LabRow[]>();
    const meds: (MedRow & { sourceDocId: string })[] = [];
    const diagnoses = new Set<string>();

    for (const d of docs) {
      const labs = (d.extractedLabs as LabRow[] | null) || [];
      for (const lab of labs) {
        if (!lab.name) continue;
        const arr = labMap.get(lab.name) || [];
        arr.push({ ...lab, date: lab.date || d.uploadedAt.toISOString() });
        labMap.set(lab.name, arr);
      }
      const docMeds = (d.extractedMeds as MedRow[] | null) || [];
      for (const m of docMeds) {
        meds.push({ ...m, sourceDocId: d.id });
      }
      const docDiags = (d.extractedDiagnoses as string[] | null) || [];
      for (const dg of docDiags) {
        diagnoses.add(dg);
      }
    }

    const labsTrend = Array.from(labMap.entries()).map(([name, points]) => {
      const sorted = points
        .map((p) => ({
          ...p,
          ts: new Date(p.date || Date.now()).getTime(),
          numericValue: typeof p.value === "number" ? p.value : Number(p.value),
        }))
        .filter((p) => !Number.isNaN(p.numericValue))
        .sort((a, b) => a.ts - b.ts);
      const latest = sorted[sorted.length - 1];
      return {
        name,
        unit: latest?.unit || "",
        latest: latest
          ? {
              value: latest.numericValue,
              status: latest.status || "NORMAL",
              date: new Date(latest.ts).toISOString(),
              referenceLow: latest.referenceLow,
              referenceHigh: latest.referenceHigh,
            }
          : null,
        points: sorted.map((p) => ({
          date: new Date(p.ts).toISOString(),
          value: p.numericValue,
        })),
      };
    });

    res.json({
      patient: {
        id: patient.id,
        phone: patient.phone,
        name: patient.name,
        language: patient.language,
        profile: patient.profile,
        createdAt: patient.createdAt,
      },
      stats: {
        documentCount: docs.length,
        labCount: labsTrend.length,
        medicationCount: meds.length,
        diagnosisCount: diagnoses.size,
      },
      documents: docs.map((d) => ({
        id: d.id,
        title: d.title,
        source: d.source,
        status: d.status,
        uploadedAt: d.uploadedAt,
        language: d.language,
        confidence: d.confidence,
        provider: d.provider,
        objectPath: d.objectPath,
        labCount: ((d.extractedLabs as unknown[] | null) || []).length,
        medCount: ((d.extractedMeds as unknown[] | null) || []).length,
      })),
      labsTrend,
      medications: meds,
      diagnoses: Array.from(diagnoses),
    });
  } catch (err) {
    logger.error({ err }, "doctor patient detail failed");
    res.status(500).json({ error: "Could not load patient" });
  }
});

export default router;
