import Constants from "expo-constants";

import type { ChatMessage, LanguageCode } from "@/types/health";

function apiBase(): string {
  const domain =
    process.env["EXPO_PUBLIC_DOMAIN"] ||
    (Constants.expoConfig?.extra?.["domain"] as string | undefined) ||
    (typeof window !== "undefined" ? window.location.host : "");
  if (!domain) return "/api";
  if (domain.startsWith("http")) return `${domain.replace(/\/$/, "")}/api`;
  return `https://${domain}/api`;
}

export interface ChatReply {
  reply: string;
  provider: "openai" | "anthropic" | "gemini";
  model: string;
}

export async function callChat(args: {
  messages: ChatMessage[];
  healthSummary: string;
  language: LanguageCode;
  signal?: AbortSignal;
}): Promise<ChatReply> {
  const { messages, healthSummary, language, signal } = args;
  const trimmed = messages.slice(-12).map((m) => ({ role: m.role, text: m.text }));
  const res = await fetch(`${apiBase()}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: trimmed, healthSummary, language }),
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`chat ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as ChatReply;
}

export async function transcribeAudio(args: {
  blob: Blob;
  mime: string;
  language?: LanguageCode;
}): Promise<string> {
  const fd = new FormData();
  const ext = args.mime.includes("webm")
    ? "webm"
    : args.mime.includes("mp4")
      ? "mp4"
      : args.mime.includes("ogg")
        ? "ogg"
        : "wav";
  // Some RN web envs need a File-like object
  const file =
    typeof File !== "undefined"
      ? new File([args.blob], `audio.${ext}`, { type: args.mime })
      : args.blob;
  fd.append("audio", file as Blob, `audio.${ext}`);
  if (args.language) fd.append("language", args.language);
  const res = await fetch(`${apiBase()}/voice/transcribe`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`transcribe ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { text: string };
  return data.text ?? "";
}

export async function ttsUrl(text: string, voice: string = "shimmer"): Promise<string> {
  const res = await fetch(`${apiBase()}/voice/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`tts ${res.status}: ${body.slice(0, 200)}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
