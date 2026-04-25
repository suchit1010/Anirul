const PASSCODE_KEY = "swasthai-doctor-passcode-v1";

export function getPasscode(): string {
  try {
    return localStorage.getItem(PASSCODE_KEY) || "";
  } catch {
    return "";
  }
}

export function setPasscode(value: string) {
  try {
    if (value) localStorage.setItem(PASSCODE_KEY, value);
    else localStorage.removeItem(PASSCODE_KEY);
  } catch {
    // ignore
  }
}

function apiBase(): string {
  return "/api";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  const passcode = getPasscode();
  if (passcode) headers.set("X-Doctor-Passcode", passcode);
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
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return parsed as T;
}

export interface PatientSummary {
  id: string;
  phone: string;
  name: string | null;
  language: string;
  createdAt: string;
  documentCount: number;
  lastUploadAt: string | null;
}

export interface PatientDocument {
  id: string;
  title: string;
  source: string;
  status: string;
  uploadedAt: string;
  language: string | null;
  confidence: number | null;
  provider: string | null;
  objectPath: string | null;
  labCount: number;
  medCount: number;
}

export interface LabTrend {
  name: string;
  unit: string;
  latest: {
    value: number;
    status: string;
    date: string;
    referenceLow?: number;
    referenceHigh?: number;
  } | null;
  points: { date: string; value: number }[];
}

export interface MedicationRow {
  id?: string;
  name?: string;
  dose?: string;
  frequency?: string;
  startDate?: string;
  active?: boolean;
  sourceDocId?: string;
}

export interface PatientDetail {
  patient: {
    id: string;
    phone: string;
    name: string | null;
    language: string;
    profile: Record<string, unknown> | null;
    createdAt: string;
  };
  stats: {
    documentCount: number;
    labCount: number;
    medicationCount: number;
    diagnosisCount: number;
  };
  documents: PatientDocument[];
  labsTrend: LabTrend[];
  medications: MedicationRow[];
  diagnoses: string[];
}

export const doctorApi = {
  listPatients: () => request<{ patients: PatientSummary[] }>("/doctor/patients"),
  getPatient: (id: string) => request<PatientDetail>(`/doctor/patients/${id}`),
};
