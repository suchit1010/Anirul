import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { SEED_STATE } from "@/constants/seed";
import { answerQuestion } from "@/lib/answerEngine";
import {
  buildAlertsForLabs,
  recomputeContinuity,
  recomputeHealthScore,
  recomputeRisks,
} from "@/lib/healthEngine";
import { buildHealthSummary } from "@/lib/healthSummary";
import { documentsApi, type SavedDocument } from "@/lib/api";
import { callChat } from "@/lib/swasthaiAPI";
import {
  AppPrefs,
  CareTask,
  ChatMessage,
  HealthAlert,
  HealthDocument,
  HealthState,
  LabValue,
  LanguageCode,
  Medication,
} from "@/types/health";

const STORAGE_KEY = "swasthai:health-state:v3";

interface HealthContextValue {
  state: HealthState;
  loading: boolean;
  addDocument: (doc: HealthDocument) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  acknowledgeAlert: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  resetData: () => Promise<void>;
  sendMessage: (text: string) => Promise<ChatMessage>;
  clearMessages: () => Promise<void>;
  setLanguage: (code: LanguageCode) => Promise<void>;
  setVoiceAutoplay: (on: boolean) => Promise<void>;
  getLabHistory: (name: string) => LabValue[];
  getActiveMedications: () => Medication[];
  getPendingAlerts: () => HealthAlert[];
  getPendingTasks: () => CareTask[];
}

const HealthContext = createContext<HealthContextValue | null>(null);

const DEFAULT_PREFS: AppPrefs = { language: "en", voiceAutoplay: false };

function makeId(prefix: string, seed: string) {
  return `${prefix}-${seed}`;
}

function normalizeDocSource(source: string | null | undefined): HealthDocument["source"] {
  if (source === "upload" || source === "whatsapp" || source === "audio" || source === "camera") {
    return source;
  }
  return "upload";
}

function normalizeDocStatus(status: string | null | undefined): HealthDocument["status"] {
  if (status === "processing" || status === "completed" || status === "failed") {
    return status;
  }
  return "completed";
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function toText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function mapServerDocuments(docs: SavedDocument[]): {
  documents: HealthDocument[];
  labs: LabValue[];
  medications: Medication[];
  diagnoses: HealthState["diagnoses"];
} {
  const documents: HealthDocument[] = [];
  const labs: LabValue[] = [];
  const medications: Medication[] = [];

  docs.forEach((d) => {
    const docLabs: LabValue[] = [];
    const rawLabs = Array.isArray(d.extractedLabs) ? d.extractedLabs : [];
    rawLabs.forEach((row, idx) => {
      const item = row as Record<string, unknown>;
      const rawStatus = toText(item.status, "NORMAL").toUpperCase();
      const status: LabValue["status"] =
        rawStatus === "LOW" || rawStatus === "HIGH" || rawStatus === "CRITICAL"
          ? rawStatus
          : "NORMAL";
      const lab = {
        id: toText(item.id) || makeId("lab", `${d.id}-${idx}`),
        name: toText(item.name, "Unknown"),
        value: toNumber(item.value),
        unit: toText(item.unit),
        status,
        date: toText(item.date) || d.uploadedAt,
        referenceLow: typeof item.referenceLow === "number" ? item.referenceLow : undefined,
        referenceHigh: typeof item.referenceHigh === "number" ? item.referenceHigh : undefined,
        documentId: d.id,
      } satisfies LabValue;
      docLabs.push(lab);
      labs.push(lab);
    });

    const docMeds: Medication[] = [];
    const rawMeds = Array.isArray(d.extractedMeds) ? d.extractedMeds : [];
    rawMeds.forEach((row, idx) => {
      const item = row as Record<string, unknown>;
      const med = {
        id: toText(item.id) || makeId("med", `${d.id}-${idx}`),
        name: toText(item.name, "Unknown medication"),
        dose: toText(item.dose, "Unspecified"),
        frequency: toText(item.frequency, "As prescribed"),
        startDate: toText(item.startDate) || d.uploadedAt,
        active: typeof item.active === "boolean" ? item.active : true,
      } satisfies Medication;
      docMeds.push(med);
      medications.push(med);
    });

    documents.push({
      id: d.id,
      title: d.title,
      source: normalizeDocSource(d.source),
      status: normalizeDocStatus(d.status),
      uploadedAt: d.uploadedAt,
      rawText: d.rawText ?? undefined,
      extractedLabs: docLabs,
      extractedMeds: docMeds,
      extractedDiagnoses: d.extractedDiagnoses ?? [],
      language: d.language ?? undefined,
      confidence: d.confidence ?? undefined,
    });
  });

  const diagnosisMap = new Map<string, HealthState["diagnoses"][number]>();
  docs.forEach((d) => {
    const rows = Array.isArray(d.extractedDiagnoses) ? d.extractedDiagnoses : [];
    rows.forEach((dx, idx) => {
      const name = (dx || "").trim();
      if (!name || diagnosisMap.has(name.toLowerCase())) return;
      diagnosisMap.set(name.toLowerCase(), {
        id: makeId("dx", `${d.id}-${idx}`),
        name,
        date: d.uploadedAt,
      });
    });
  });

  return {
    documents,
    labs,
    medications,
    diagnoses: Array.from(diagnosisMap.values()),
  };
}

function withComputedState(base: HealthState): HealthState {
  const alerts = buildAlertsForLabs(base.labs);
  const withAlerts = { ...base, alerts };
  const risks = recomputeRisks(withAlerts);
  const withRisks = { ...withAlerts, risks };
  const healthScore = recomputeHealthScore(withRisks);
  const continuityScore = recomputeContinuity(withRisks);
  return { ...withRisks, healthScore, continuityScore };
}

function migrate(parsed: Partial<HealthState>): HealthState {
  return {
    ...SEED_STATE,
    ...parsed,
    messages: parsed.messages ?? SEED_STATE.messages,
    prefs: { ...DEFAULT_PREFS, ...(parsed.prefs ?? {}) },
  };
}

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HealthState>(SEED_STATE);
  const [loading, setLoading] = useState<boolean>(true);

  const persist = useCallback(async (next: HealthState) => {
    setState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const syncFromServer = useCallback(
    async (baseState: HealthState): Promise<HealthState> => {
      try {
        const response = await documentsApi.list();
        const serverDocs = response.documents ?? [];
        if (serverDocs.length === 0) return baseState;

        const mapped = mapServerDocuments(serverDocs);
        const merged = withComputedState({
          ...baseState,
          documents: mapped.documents,
          labs: mapped.labs,
          medications: mapped.medications,
          diagnoses: mapped.diagnoses,
          visits: [],
        });
        await persist(merged);
        return merged;
      } catch {
        return baseState;
      }
    },
    [persist],
  );

  useEffect(() => {
    (async () => {
      let initial = SEED_STATE;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          initial = migrate(JSON.parse(raw));
          setState(initial);
        } else {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_STATE));
        }
      } catch {
        // ignore
      } finally {
        await syncFromServer(initial);
        setLoading(false);
      }
    })();
  }, [syncFromServer]);

  const addDocument = useCallback(
    async (doc: HealthDocument) => {
      const newLabs = doc.extractedLabs ?? [];
      const newMeds = doc.extractedMeds ?? [];
      const labsWithDoc: LabValue[] = newLabs.map((l) => ({
        ...l,
        documentId: doc.id,
      }));
      const newAlerts = buildAlertsForLabs(labsWithDoc);
      const intermediate: HealthState = {
        ...state,
        documents: [doc, ...state.documents],
        labs: [...labsWithDoc, ...state.labs],
        medications: [...newMeds, ...state.medications],
        alerts: [...newAlerts, ...state.alerts],
      };
      const risks = recomputeRisks(intermediate);
      const withRisks = { ...intermediate, risks };
      const healthScore = recomputeHealthScore(withRisks);
      const continuityScore = recomputeContinuity(withRisks);
      const sysMsg: ChatMessage = {
        id: `msg-${Date.now().toString(36)}`,
        role: "assistant",
        text: `Saved "${doc.title}" to memory. I extracted ${newLabs.length} lab value(s)${newAlerts.length ? ` and flagged ${newAlerts.length} new alert(s)` : ""}. Ask me anything about it.`,
        createdAt: new Date().toISOString(),
        provider: "local",
      };
      await persist({
        ...withRisks,
        healthScore,
        continuityScore,
        messages: [...state.messages, sysMsg],
      });
    },
    [state, persist],
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      const intermediate: HealthState = {
        ...state,
        documents: state.documents.filter((d) => d.id !== id),
        labs: state.labs.filter((l) => l.documentId !== id),
      };
      const risks = recomputeRisks(intermediate);
      const withRisks = { ...intermediate, risks };
      const healthScore = recomputeHealthScore(withRisks);
      const continuityScore = recomputeContinuity(withRisks);
      await persist({ ...withRisks, healthScore, continuityScore });
    },
    [state, persist],
  );

  const acknowledgeAlert = useCallback(
    async (id: string) => {
      const intermediate: HealthState = {
        ...state,
        alerts: state.alerts.map((a) =>
          a.id === id ? { ...a, acknowledged: true } : a,
        ),
      };
      const healthScore = recomputeHealthScore(intermediate);
      await persist({ ...intermediate, healthScore });
    },
    [state, persist],
  );

  const toggleTask = useCallback(
    async (id: string) => {
      const intermediate: HealthState = {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === id
            ? { ...t, status: t.status === "completed" ? "pending" : "completed" }
            : t,
        ),
      };
      const continuityScore = recomputeContinuity(intermediate);
      await persist({ ...intermediate, continuityScore });
    },
    [state, persist],
  );

  const resetData = useCallback(async () => {
    await persist(SEED_STATE);
  }, [persist]);

  const sendMessage = useCallback(
    async (text: string): Promise<ChatMessage> => {
      const trimmed = text.trim();
      if (!trimmed) {
        return {
          id: "noop",
          role: "assistant",
          text: "",
          createdAt: new Date().toISOString(),
          provider: "local",
        };
      }
      const userMsg: ChatMessage = {
        id: `msg-${Date.now().toString(36)}-u`,
        role: "user",
        text: trimmed,
        createdAt: new Date().toISOString(),
      };
      const stateWithUser: HealthState = {
        ...state,
        messages: [...state.messages, userMsg],
      };
      setState(stateWithUser);

      let aiText = "";
      let provider: ChatMessage["provider"] = "local";
      let model: string | undefined;
      try {
        const summary = buildHealthSummary(stateWithUser);
        const r = await callChat({
          messages: stateWithUser.messages,
          healthSummary: summary,
          language: stateWithUser.prefs.language,
        });
        aiText = r.reply;
        provider = r.provider;
        model = r.model;
      } catch {
        aiText = answerQuestion(trimmed, stateWithUser);
        provider = "local";
      }

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now().toString(36)}-a`,
        role: "assistant",
        text: aiText || "Sorry, I couldn't respond right now. Please try again.",
        createdAt: new Date().toISOString(),
        provider,
        model,
      };
      await persist({
        ...stateWithUser,
        messages: [...stateWithUser.messages, aiMsg],
      });
      return aiMsg;
    },
    [state, persist],
  );

  const clearMessages = useCallback(async () => {
    await persist({ ...state, messages: SEED_STATE.messages });
  }, [state, persist]);

  const setLanguage = useCallback(
    async (code: LanguageCode) => {
      await persist({ ...state, prefs: { ...state.prefs, language: code } });
    },
    [state, persist],
  );

  const setVoiceAutoplay = useCallback(
    async (on: boolean) => {
      await persist({ ...state, prefs: { ...state.prefs, voiceAutoplay: on } });
    },
    [state, persist],
  );

  const getLabHistory = useCallback(
    (name: string) =>
      state.labs
        .filter((l) => l.name.toLowerCase() === name.toLowerCase())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [state.labs],
  );

  const getActiveMedications = useCallback(
    () => state.medications.filter((m) => m.active),
    [state.medications],
  );

  const getPendingAlerts = useCallback(
    () => state.alerts.filter((a) => !a.acknowledged),
    [state.alerts],
  );

  const getPendingTasks = useCallback(
    () => state.tasks.filter((t) => t.status !== "completed"),
    [state.tasks],
  );

  const value = useMemo<HealthContextValue>(
    () => ({
      state,
      loading,
      addDocument,
      deleteDocument,
      acknowledgeAlert,
      toggleTask,
      resetData,
      sendMessage,
      clearMessages,
      setLanguage,
      setVoiceAutoplay,
      getLabHistory,
      getActiveMedications,
      getPendingAlerts,
      getPendingTasks,
    }),
    [
      state,
      loading,
      addDocument,
      deleteDocument,
      acknowledgeAlert,
      toggleTask,
      resetData,
      sendMessage,
      clearMessages,
      setLanguage,
      setVoiceAutoplay,
      getLabHistory,
      getActiveMedications,
      getPendingAlerts,
      getPendingTasks,
    ],
  );

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>;
}

export function useHealth() {
  const ctx = useContext(HealthContext);
  if (!ctx) throw new Error("useHealth must be used within HealthProvider");
  return ctx;
}
