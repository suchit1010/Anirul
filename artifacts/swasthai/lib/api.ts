import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const TOKEN_KEY = "swasthai:auth-token:v1";
let cachedToken: string | null | undefined = undefined;

export async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  try {
    const t = await AsyncStorage.getItem(TOKEN_KEY);
    cachedToken = t;
    return t;
  } catch {
    cachedToken = null;
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  try {
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

export function apiBase(): string {
  const domain =
    process.env["EXPO_PUBLIC_DOMAIN"] ||
    (Constants.expoConfig?.extra?.["domain"] as string | undefined) ||
    (typeof window !== "undefined" ? window.location.host : "");
  if (!domain) return "/api";
  if (domain.startsWith("http")) return `${domain.replace(/\/$/, "")}/api`;
  return `https://${domain}/api`;
}

export function storageObjectUrl(objectPath: string): string {
  const base = apiBase();
  if (!objectPath) return "";
  if (objectPath.startsWith("/")) return `${base}/storage${objectPath}`;
  return `${base}/storage/objects/${objectPath}`;
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (init.auth !== false) {
    const token = await getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${apiBase()}${path}`, { ...init, headers });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    const msg =
      (parsed && typeof parsed === "object" && parsed !== null && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : undefined) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return parsed as T;
}

export interface AuthUser {
  id: string;
  phone: string;
  name?: string | null;
  role: string;
  language: string;
  profile?: Record<string, unknown> | null;
}

export interface AuthStartResponse {
  ok: true;
  phone: string;
  smsConfigured: boolean;
  demoCode?: string;
}

export interface AuthVerifyResponse {
  ok: true;
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export const authApi = {
  start: (phone: string) =>
    request<AuthStartResponse>("/auth/start", {
      method: "POST",
      body: JSON.stringify({ phone }),
      auth: false,
    }),
  verify: (phone: string, code: string) =>
    request<AuthVerifyResponse>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
      auth: false,
    }),
  me: () => request<{ user: AuthUser }>("/auth/me"),
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
};

export interface UploadUrlResponse {
  uploadURL: string;
  objectPath: string;
}

export const storageApi = {
  requestUploadUrl: (params: { name: string; size: number; contentType: string }) =>
    request<UploadUrlResponse>("/storage/uploads/request-url", {
      method: "POST",
      body: JSON.stringify(params),
    }),
};

export interface ExtractedLab {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: "NORMAL" | "LOW" | "HIGH" | "CRITICAL";
  date: string;
  referenceLow?: number;
  referenceHigh?: number;
}

export interface ExtractedMed {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  startDate: string;
  active: boolean;
}

export interface ExtractionResponse {
  labs: ExtractedLab[];
  medications: ExtractedMed[];
  diagnoses: string[];
  language: string;
  confidence: number;
  summary?: string;
  documentType?: string;
  provider: string;
  model: string;
}

export const extractApi = {
  fromText: (text: string) =>
    request<ExtractionResponse>("/extract", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  fromImageBase64: (imageBase64: string, mediaType: string = "image/jpeg") =>
    request<ExtractionResponse>("/extract", {
      method: "POST",
      body: JSON.stringify({ imageBase64, mediaType }),
    }),
  fromFile: async (file: { uri: string; name: string; type: string }) => {
    const fd = new FormData();
    fd.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
    return request<ExtractionResponse>("/extract", {
      method: "POST",
      body: fd,
    });
  },
};

export interface SavedDocument {
  id: string;
  userId: string;
  title: string;
  source: string;
  status: string;
  objectPath: string | null;
  mimeType: string | null;
  rawText: string | null;
  extractedLabs: unknown[];
  extractedMeds: unknown[];
  extractedDiagnoses: string[];
  language: string | null;
  confidence: number | null;
  provider: string | null;
  uploadedAt: string;
}

export const documentsApi = {
  list: () => request<{ documents: SavedDocument[] }>("/documents"),
  create: (doc: Partial<SavedDocument> & { title: string }) =>
    request<{ document: SavedDocument }>("/documents", {
      method: "POST",
      body: JSON.stringify(doc),
    }),
  delete: (id: string) => request<{ ok: true }>(`/documents/${id}`, { method: "DELETE" }),
};
