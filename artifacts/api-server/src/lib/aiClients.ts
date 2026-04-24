import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

function envOr(name: string, fallback?: string): string {
  const v = process.env[name];
  if (!v) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing env var: ${name}`);
  }
  return v;
}

export const openai: OpenAI = new OpenAI({
  baseURL: envOr("AI_INTEGRATIONS_OPENAI_BASE_URL"),
  apiKey: envOr("AI_INTEGRATIONS_OPENAI_API_KEY"),
});

export const anthropic: Anthropic = new Anthropic({
  baseURL: envOr("AI_INTEGRATIONS_ANTHROPIC_BASE_URL"),
  apiKey: envOr("AI_INTEGRATIONS_ANTHROPIC_API_KEY"),
});

export const gemini: GoogleGenAI = new GoogleGenAI({
  apiKey: envOr("AI_INTEGRATIONS_GEMINI_API_KEY"),
  httpOptions: {
    apiVersion: "",
    baseUrl: envOr("AI_INTEGRATIONS_GEMINI_BASE_URL"),
  },
});

export type Provider = "openai" | "anthropic" | "gemini";
export const PROVIDER_ORDER: Provider[] = ["gemini", "openai", "anthropic"];

export const PROVIDER_MODELS: Record<Provider, string> = {
  openai: "gpt-5-mini",
  anthropic: "claude-haiku-4-5",
  gemini: "gemini-2.5-flash",
};
