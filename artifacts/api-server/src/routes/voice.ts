import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { toFile } from "openai/uploads";

import { openai } from "../lib/aiClients";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.post(
  "/voice/transcribe",
  upload.single("audio"),
  async (req: Request, res: Response) => {
    try {
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) {
        res.status(400).json({ error: "audio file required (field 'audio')" });
        return;
      }
      const language = (req.body?.language as string) || undefined;
      const ext = (file.mimetype.includes("wav") && "wav") ||
        (file.mimetype.includes("mp4") && "mp4") ||
        (file.mimetype.includes("mp3") && "mp3") ||
        (file.mimetype.includes("ogg") && "ogg") ||
        "webm";
      const upload = await toFile(file.buffer, `audio.${ext}`, {
        type: file.mimetype || "audio/webm",
      });
      const r = await openai.audio.transcriptions.create({
        file: upload,
        model: "gpt-4o-mini-transcribe",
        ...(language ? { language } : {}),
      });
      res.json({ text: r.text ?? "" });
    } catch (err) {
      logger.error({ err }, "transcribe failed");
      res.status(502).json({ error: "Could not transcribe audio." });
    }
  },
);

router.post("/voice/speak", async (req: Request, res: Response) => {
  try {
    const text = (req.body?.text as string) || "";
    const voice = ((req.body?.voice as string) || "shimmer") as
      | "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
    if (!text.trim()) {
      res.status(400).json({ error: "text required" });
      return;
    }
    const trimmed = text.length > 1500 ? text.slice(0, 1500) : text;

    const r = await openai.chat.completions.create({
      model: "gpt-audio",
      modalities: ["text", "audio"],
      audio: { voice, format: "mp3" },
      messages: [
        { role: "system", content: "You are a text-to-speech assistant. Repeat the user's text verbatim, with warm natural intonation. Do not add commentary." },
        { role: "user", content: trimmed },
      ],
    });
    const msg = r.choices[0]?.message as unknown as { audio?: { data?: string } };
    const data = msg?.audio?.data;
    if (!data) {
      res.status(502).json({ error: "No audio returned" });
      return;
    }
    const buf = Buffer.from(data, "base64");
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(buf.length));
    res.setHeader("Cache-Control", "no-store");
    res.send(buf);
  } catch (err) {
    logger.error({ err }, "tts failed");
    res.status(502).json({ error: "Could not synthesize voice." });
  }
});

export default router;
