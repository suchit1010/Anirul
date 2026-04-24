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
import {
  CareTask,
  ChatMessage,
  HealthAlert,
  HealthDocument,
  HealthState,
  LabValue,
  Medication,
} from "@/types/health";

const STORAGE_KEY = "swasthai:health-state:v2";

interface HealthContextValue {
  state: HealthState;
  loading: boolean;
  addDocument: (doc: HealthDocument) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  acknowledgeAlert: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  resetData: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => Promise<void>;
  getLabHistory: (name: string) => LabValue[];
  getActiveMedications: () => Medication[];
  getPendingAlerts: () => HealthAlert[];
  getPendingTasks: () => CareTask[];
}

const HealthContext = createContext<HealthContextValue | null>(null);

function migrate(parsed: Partial<HealthState>): HealthState {
  return {
    ...SEED_STATE,
    ...parsed,
    messages: parsed.messages ?? SEED_STATE.messages,
  };
}

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HealthState>(SEED_STATE);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setState(migrate(JSON.parse(raw)));
        } else {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_STATE));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: HealthState) => {
    setState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

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
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
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
      // Optimistically render the user message
      setState(stateWithUser);
      // Generate the assistant reply from the latest snapshot
      const reply = answerQuestion(trimmed, stateWithUser);
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now().toString(36)}-a`,
        role: "assistant",
        text: reply,
        createdAt: new Date().toISOString(),
      };
      await persist({
        ...stateWithUser,
        messages: [...stateWithUser.messages, aiMsg],
      });
    },
    [state, persist],
  );

  const clearMessages = useCallback(async () => {
    await persist({ ...state, messages: SEED_STATE.messages });
  }, [state, persist]);

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
