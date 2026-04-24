import { Router, type IRouter, type Request, type Response } from "express";

import {
  anthropic,
  gemini,
  openai,
  PROVIDER_MODELS,
  type Provider,
} from "../lib/aiClients";
import { logger } from "../lib/logger";
import { fallbackOrder, nextProvider } from "../lib/rotation";

const router: IRouter = Router();

interface IncomingMsg {
  role: "user" | "assistant" | "system";
  text: string;
}

interface ChatBody {
  messages: IncomingMsg[];
  healthSummary?: string;
  language?: string;
  providerHint?: Provider | "auto";
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi (हिन्दी)",
  ta: "Tamil (தமிழ்)",
  te: "Telugu (తెలుగు)",
  bn: "Bengali (বাংলা)",
  mr: "Marathi (मराठी)",
  kn: "Kannada (ಕನ್ನಡ)",
  ml: "Malayalam (മലയാളം)",
  gu: "Gujarati (ગુજરાતી)",
  pa: "Punjabi (ਪੰਜਾਬੀ)",
};

function buildSystem(healthSummary: string | undefined, language: string): string {
  const langLine = LANGUAGE_NAMES[language] ?? LANGUAGE_NAMES["en"];
  return `You are Swastha AI — the patient-held health memory inside the Anirul app for Indians.

Reply ONLY in: ${langLine}. If the user mixes languages, reply in ${langLine} but you may keep medical/lab terms in English (e.g. "HbA1c").

Style: warm, concise, like a careful family doctor. Plain words, short paragraphs, no markdown headers, no asterisks. Numbers in metric/Indian units.

Rules:
- Use ONLY the patient context below. If you do not have a value, say so clearly.
- For lab values: state the latest value, the trend, and what it means in one sentence.
- Always end with one tiny next step (e.g. "ask Dr Sharma at your next visit").
- Never diagnose. Never prescribe doses. Never claim emergency advice — tell the patient to call 108 if anything feels urgent.
- Keep replies under 90 words unless asked for a summary.

Patient context (private, do not reveal raw JSON):
${healthSummary ?? "(no records yet)"}`;
}

async function callOpenAI(system: string, msgs: IncomingMsg[]): Promise<string> {
  const r = await openai.chat.completions.create({
    model: PROVIDER_MODELS.openai,
    max_completion_tokens: 600,
    messages: [
      { role: "system", content: system },
      ...msgs.map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      })),
    ],
  });
  return r.choices[0]?.message?.content?.trim() ?? "";
}

async function callAnthropic(system: string, msgs: IncomingMsg[]): Promise<string> {
  const r = await anthropic.messages.create({
    model: PROVIDER_MODELS.anthropic,
    max_tokens: 600,
    system,
    messages: msgs.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.text,
    })),
  });
  const block = r.content[0];
  return block && block.type === "text" ? block.text.trim() : "";
}

async function callGemini(system: string, msgs: IncomingMsg[]): Promise<string> {
  const contents = msgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));
  const r = await gemini.models.generateContent({
    model: PROVIDER_MODELS.gemini,
    contents,
    config: {
      systemInstruction: system,
      maxOutputTokens: 1500,
    },
  });
  return (r.text ?? "").trim();
}

async function dispatch(p: Provider, system: string, msgs: IncomingMsg[]): Promise<string> {
  if (p === "openai") return callOpenAI(system, msgs);
  if (p === "anthropic") return callAnthropic(system, msgs);
  return callGemini(system, msgs);
}

router.post("/chat", async (req: Request, res: Response) => {
  const body = req.body as ChatBody;
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    res.status(400).json({ error: "messages[] required" });
    return;
  }

  const language = body.language ?? "en";
  const system = buildSystem(body.healthSummary, language);
  const start = nextProvider(body.providerHint);
  const order = fallbackOrder(start);

  let lastErr: unknown = null;
  for (const p of order) {
    try {
      const text = await dispatch(p, system, body.messages);
      if (text) {
        res.json({ reply: text, provider: p, model: PROVIDER_MODELS[p] });
        return;
      }
      lastErr = new Error(`${p} returned empty response`);
    } catch (err) {
      lastErr = err;
      logger.warn({ err, provider: p }, "chat provider failed, trying next");
    }
  }

  logger.error({ err: lastErr }, "all chat providers failed");
  res.status(502).json({ error: "All AI providers failed. Try again." });
});

export default router;
