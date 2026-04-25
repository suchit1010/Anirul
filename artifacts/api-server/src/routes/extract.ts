import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";

import { anthropic, gemini, PROVIDER_MODELS } from "../lib/aiClients";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const EXTRACTION_INSTRUCTIONS = `You are a medical record extractor for an Indian health record app.

Read the attached medical document (lab report, prescription, discharge summary, doctor note, or pharmacy bill — may be in English, Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam, Gujarati, Punjabi, or a mix; may use Devanagari numerals).

Return ONLY a single JSON object with this exact shape — no markdown fences, no commentary:

{
  "labs": [
    { "name": "HbA1c", "value": 7.8, "unit": "%", "referenceLow": 4.0, "referenceHigh": 5.7, "status": "HIGH", "date": "YYYY-MM-DD" }
  ],
  "medications": [
    { "name": "Metformin", "dose": "500 mg", "frequency": "twice daily", "startDate": "YYYY-MM-DD", "active": true }
  ],
  "diagnoses": ["Type 2 Diabetes"],
  "language": "english | hindi | tamil | telugu | bengali | marathi | kannada | malayalam | gujarati | punjabi | mixed",
  "confidence": 0.0,
  "documentType": "lab_report | prescription | discharge_summary | doctor_note | pharmacy_bill | other",
  "summary": "One short sentence in English describing what the document says."
}

Rules:
- "status" for labs is one of: NORMAL, LOW, HIGH, CRITICAL. Compute it from the value vs the reference range when reference values are present.
- Use ISO date format (YYYY-MM-DD). If no date is visible, use today.
- Convert any Devanagari/local numerals to ASCII digits.
- Use standard Indian/metric units (mg/dL, mmol/L, %, ng/mL, etc).
- If a field is unknown, omit it (do not invent values).
- "confidence" is your overall extraction confidence (0.0 to 1.0).
- If the document is not medical, return labs=[], medications=[], diagnoses=[], confidence=0, documentType="other".`;

interface ExtractionPayload {
  labs: Array<{
    name: string;
    value: number;
    unit?: string;
    referenceLow?: number;
    referenceHigh?: number;
    status?: string;
    date?: string;
  }>;
  medications: Array<{
    name: string;
    dose?: string;
    frequency?: string;
    startDate?: string;
    active?: boolean;
  }>;
  diagnoses: string[];
  language: string;
  confidence: number;
  documentType?: string;
  summary?: string;
}

function safeParseJson(raw: string): ExtractionPayload | null {
  if (!raw) return null;
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as ExtractionPayload;
    return parsed;
  } catch {
    return null;
  }
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function shape(payload: ExtractionPayload | null) {
  if (!payload) {
    return {
      labs: [],
      medications: [],
      diagnoses: [],
      language: "english" as const,
      confidence: 0,
      summary: "Could not extract structured data from this document.",
      documentType: "other",
    };
  }
  const today = new Date().toISOString().slice(0, 10);
  return {
    labs: (payload.labs ?? []).map((l) => ({
      id: makeId("lab"),
      name: l.name,
      value: typeof l.value === "number" ? l.value : Number(l.value) || 0,
      unit: l.unit ?? "",
      status: (l.status ?? "NORMAL").toUpperCase(),
      date: (l.date ?? today) + "T00:00:00.000Z",
      referenceLow: l.referenceLow,
      referenceHigh: l.referenceHigh,
    })),
    medications: (payload.medications ?? []).map((m) => ({
      id: makeId("med"),
      name: m.name,
      dose: m.dose ?? "Unspecified",
      frequency: m.frequency ?? "As prescribed",
      startDate: (m.startDate ?? today) + "T00:00:00.000Z",
      active: m.active ?? true,
    })),
    diagnoses: payload.diagnoses ?? [],
    language: payload.language ?? "english",
    confidence: typeof payload.confidence === "number" ? payload.confidence : 0.7,
    summary: payload.summary,
    documentType: payload.documentType ?? "other",
  };
}

async function extractWithAnthropic(
  source: { type: "image"; mediaType: string; data: string } | { type: "pdf"; data: string } | { type: "text"; text: string },
): Promise<{ payload: ExtractionPayload | null; provider: string; model: string }> {
  const userContent: Array<unknown> =
    source.type === "text"
      ? [{ type: "text", text: `Document text:\n\n${source.text}` }]
      : source.type === "image"
        ? [
            {
              type: "image",
              source: { type: "base64", media_type: source.mediaType, data: source.data },
            },
          ]
        : [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: source.data },
            },
          ];

  const r = await anthropic.messages.create({
    model: PROVIDER_MODELS.anthropic,
    max_tokens: 2000,
    system: EXTRACTION_INSTRUCTIONS,
    messages: [
      {
        role: "user",
        content: userContent as never,
      },
    ],
  });
  const block = r.content[0];
  const text = block && block.type === "text" ? block.text : "";
  return { payload: safeParseJson(text), provider: "anthropic", model: PROVIDER_MODELS.anthropic };
}

async function extractWithGemini(
  source: { type: "image"; mediaType: string; data: string } | { type: "pdf"; data: string } | { type: "text"; text: string },
): Promise<{ payload: ExtractionPayload | null; provider: string; model: string }> {
  const parts: Array<Record<string, unknown>> =
    source.type === "text"
      ? [{ text: `Document text:\n\n${source.text}` }]
      : source.type === "image"
        ? [{ inlineData: { mimeType: source.mediaType, data: source.data } }]
        : [{ inlineData: { mimeType: "application/pdf", data: source.data } }];

  const r = await gemini.models.generateContent({
    model: PROVIDER_MODELS.gemini,
    contents: [{ role: "user", parts: parts as never }],
    config: {
      systemInstruction: EXTRACTION_INSTRUCTIONS,
      responseMimeType: "application/json",
      maxOutputTokens: 2000,
    },
  });
  const text = (r.text ?? "").trim();
  return { payload: safeParseJson(text), provider: "gemini", model: PROVIDER_MODELS.gemini };
}

router.post("/extract", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    const bodyText = (req.body?.text as string) || "";
    const bodyImageBase64 = (req.body?.imageBase64 as string) || "";
    const bodyMediaType = (req.body?.mediaType as string) || "image/jpeg";

    let source:
      | { type: "image"; mediaType: string; data: string }
      | { type: "pdf"; data: string }
      | { type: "text"; text: string }
      | null = null;

    if (file) {
      const mime = file.mimetype || "application/octet-stream";
      if (mime === "application/pdf") {
        source = { type: "pdf", data: file.buffer.toString("base64") };
      } else if (mime.startsWith("image/")) {
        source = { type: "image", mediaType: mime, data: file.buffer.toString("base64") };
      } else if (mime.startsWith("text/")) {
        source = { type: "text", text: file.buffer.toString("utf8") };
      } else {
        // Try as image by default (some camera uploads come through as octet-stream)
        source = { type: "image", mediaType: "image/jpeg", data: file.buffer.toString("base64") };
      }
    } else if (bodyImageBase64) {
      source = { type: "image", mediaType: bodyMediaType, data: bodyImageBase64 };
    } else if (bodyText.trim()) {
      source = { type: "text", text: bodyText };
    }

    if (!source) {
      res.status(400).json({ error: "Provide a file, imageBase64, or text" });
      return;
    }

    let payload: ExtractionPayload | null = null;
    let provider = "anthropic";
    let model = PROVIDER_MODELS.anthropic;

    try {
      const r = await extractWithAnthropic(source);
      payload = r.payload;
      provider = r.provider;
      model = r.model;
    } catch (err) {
      logger.warn({ err }, "anthropic extract failed, trying gemini");
    }

    if (!payload) {
      try {
        const r = await extractWithGemini(source);
        if (r.payload) {
          payload = r.payload;
          provider = r.provider;
          model = r.model;
        }
      } catch (err) {
        logger.warn({ err }, "gemini extract failed");
      }
    }

    const result = shape(payload);
    res.json({ ...result, provider, model });
  } catch (err) {
    logger.error({ err }, "extract failed");
    res.status(502).json({ error: "Extraction failed" });
  }
});

export default router;
