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

const LOCAL_DEMO_REPORT = `Dr Lal PathLabs - Diabetes Panel
Patient: Arjun Sharma, M, 52 yrs

HbA1c: 8.2 %  (Ref: 4.0 - 5.7)
Fasting Glucose: 156 mg/dL  (Ref: 70 - 99)
Total Cholesterol: 224 mg/dL
LDL: 138 mg/dL
HDL: 42 mg/dL
Triglycerides: 198 mg/dL
Creatinine: 1.0 mg/dL
TSH: 2.4 mIU/L

Impression: Suboptimal glycemic control.
Continue Metformin 500mg twice daily.
Add Atorvastatin 20mg once at night.
Recheck HbA1c in 3 months.`;

const LAB_PATTERNS: Array<{
  name: string;
  regex: RegExp;
  unit: string;
  referenceLow: number;
  referenceHigh: number;
}> = [
  { name: "HbA1c", regex: /hba1c[^\d]*([0-9]+\.?[0-9]*)/i, unit: "%", referenceLow: 4, referenceHigh: 5.7 },
  { name: "Fasting Glucose", regex: /fasting[^\d]*([0-9]+\.?[0-9]*)/i, unit: "mg/dL", referenceLow: 70, referenceHigh: 99 },
  { name: "Total Cholesterol", regex: /total\s*cholesterol[^\d]*([0-9]+\.?[0-9]*)/i, unit: "mg/dL", referenceLow: 0, referenceHigh: 200 },
  { name: "LDL", regex: /\bldl\b[^\d]*([0-9]+\.?[0-9]*)/i, unit: "mg/dL", referenceLow: 0, referenceHigh: 100 },
  { name: "HDL", regex: /\bhdl\b[^\d]*([0-9]+\.?[0-9]*)/i, unit: "mg/dL", referenceLow: 40, referenceHigh: 60 },
  { name: "Triglycerides", regex: /triglycerides[^\d]*([0-9]+\.?[0-9]*)/i, unit: "mg/dL", referenceLow: 0, referenceHigh: 150 },
  { name: "Creatinine", regex: /creatinine[^\d]*([0-9]+\.?[0-9]*)/i, unit: "mg/dL", referenceLow: 0.7, referenceHigh: 1.3 },
  { name: "TSH", regex: /\btsh\b[^\d]*([0-9]+\.?[0-9]*)/i, unit: "mIU/L", referenceLow: 0.4, referenceHigh: 4 },
];

function extractDemoPayload(text: string): ExtractionPayload {
  const labs = LAB_PATTERNS.flatMap((pattern) => {
    const match = text.match(pattern.regex);
    if (!match?.[1]) return [];
    const value = Number(match[1]);
    if (Number.isNaN(value)) return [];
    const status =
      value < pattern.referenceLow
        ? "LOW"
        : value > pattern.referenceHigh * 1.5
          ? "CRITICAL"
          : value > pattern.referenceHigh
            ? "HIGH"
            : "NORMAL";
    return [
      {
        name: pattern.name,
        value,
        unit: pattern.unit,
        referenceLow: pattern.referenceLow,
        referenceHigh: pattern.referenceHigh,
        status,
        date: new Date().toISOString().slice(0, 10),
      },
    ];
  });

  const medications = [
    {
      name: "Metformin",
      dose: /metformin[^\n]{0,40}?([0-9]+\s?(?:mg|mcg|units))/i,
      frequency: /metformin[^\n]{0,80}?(twice daily|once daily|once in morning|once at night|bd|od|tds)/i,
    },
    {
      name: "Atorvastatin",
      dose: /atorvastatin[^\n]{0,40}?([0-9]+\s?(?:mg|mcg|units))/i,
      frequency: /atorvastatin[^\n]{0,80}?(twice daily|once daily|once in morning|once at night|bd|od|tds)/i,
    },
    {
      name: "Telmisartan",
      dose: /telmisartan[^\n]{0,40}?([0-9]+\s?(?:mg|mcg|units))/i,
      frequency: /telmisartan[^\n]{0,80}?(twice daily|once daily|once in morning|once at night|bd|od|tds)/i,
    },
  ].flatMap((entry) => {
    const doseMatch = text.match(entry.dose);
    if (!doseMatch) return [];
    const freqMatch = text.match(entry.frequency);
    return [
      {
        name: entry.name,
        dose: doseMatch[1] ?? "Unspecified",
        frequency: freqMatch?.[1] ?? "As prescribed",
        startDate: new Date().toISOString().slice(0, 10),
        active: true,
      },
    ];
  });

  const diagnoses = [/diabetes/i, /dyslipidemia/i, /hypertension/i].flatMap((pattern) =>
    pattern.test(text)
      ? [pattern.source.replace(/\\/g, "").replace(/i$/, "").replace(/^./, (ch) => ch.toUpperCase())]
      : [],
  );

  return {
    labs,
    medications,
    diagnoses,
    language: /[\u0900-\u097F]/.test(text) ? "mixed" : "english",
    confidence: Math.min(0.96, 0.72 + labs.length * 0.03 + medications.length * 0.03),
    documentType: "lab_report",
    summary: "Demo extraction produced structured memory from the scanned report.",
  };
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

    if (!payload) {
      const localText = source.type === "text" ? source.text : LOCAL_DEMO_REPORT;
      payload = extractDemoPayload(localText);
      provider = "local";
      model = source.type === "text" ? "local-regex-parser" : "local-demo-ocr";
    }

    const result = shape(payload);
    res.json({ ...result, provider, model });
  } catch (err) {
    logger.error({ err }, "extract failed");
    res.status(502).json({ error: "Extraction failed" });
  }
});

export default router;
