import { Router, type IRouter, type Response } from "express";
import { db, documentsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";

import { requireAuth, type AuthedRequest } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/documents", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.userId, req.user!.id))
      .orderBy(desc(documentsTable.uploadedAt));
    res.json({ documents: rows });
  } catch (err) {
    logger.error({ err }, "list documents failed");
    res.status(500).json({ error: "Could not load documents" });
  }
});

router.post("/documents", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const body = (req.body ?? {}) as {
      title?: string;
      source?: string;
      objectPath?: string;
      mimeType?: string;
      rawText?: string;
      extractedLabs?: unknown[];
      extractedMeds?: unknown[];
      extractedDiagnoses?: string[];
      language?: string;
      confidence?: number;
      provider?: string;
    };
    if (!body.title) {
      res.status(400).json({ error: "title required" });
      return;
    }
    const inserted = await db
      .insert(documentsTable)
      .values({
        userId: req.user!.id,
        title: body.title,
        source: body.source ?? "upload",
        status: "completed",
        objectPath: body.objectPath ?? null,
        mimeType: body.mimeType ?? null,
        rawText: body.rawText ?? null,
        extractedLabs: body.extractedLabs ?? [],
        extractedMeds: body.extractedMeds ?? [],
        extractedDiagnoses: body.extractedDiagnoses ?? [],
        language: body.language ?? "english",
        confidence: body.confidence ?? 0,
        provider: body.provider ?? null,
      })
      .returning();
    res.json({ document: inserted[0] });
  } catch (err) {
    logger.error({ err }, "create document failed");
    res.status(500).json({ error: "Could not save document" });
  }
});

router.delete("/documents/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const idParam = req.params["id"];
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    if (!id) {
      res.status(400).json({ error: "id required" });
      return;
    }
    await db
      .delete(documentsTable)
      .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, req.user!.id)));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "delete document failed");
    res.status(500).json({ error: "Could not delete document" });
  }
});

export default router;
