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
import {
  CareTask,
  HealthAlert,
  HealthDocument,
  HealthState,
  LabValue,
  Medication,
} from "@/types/health";

const STORAGE_KEY = "swasthai:health-state:v1";

interface HealthContextValue {
  state: HealthState;
  loading: boolean;
  addDocument: (doc: HealthDocument) => Promise<void>;
  acknowledgeAlert: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  resetData: () => Promise<void>;
  getLabHistory: (name: string) => LabValue[];
  getActiveMedications: () => Medication[];
  getPendingAlerts: () => HealthAlert[];
  getPendingTasks: () => CareTask[];
}

const HealthContext = createContext<HealthContextValue | null>(null);

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HealthState>(SEED_STATE);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setState(JSON.parse(raw) as HealthState);
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
      const next: HealthState = {
        ...state,
        documents: [doc, ...state.documents],
        labs: [...newLabs, ...state.labs],
        medications: [...newMeds, ...state.medications],
      };
      await persist(next);
    },
    [state, persist],
  );

  const acknowledgeAlert = useCallback(
    async (id: string) => {
      const next: HealthState = {
        ...state,
        alerts: state.alerts.map((a) =>
          a.id === id ? { ...a, acknowledged: true } : a,
        ),
      };
      await persist(next);
    },
    [state, persist],
  );

  const toggleTask = useCallback(
    async (id: string) => {
      const next: HealthState = {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === id
            ? { ...t, status: t.status === "completed" ? "pending" : "completed" }
            : t,
        ),
      };
      await persist(next);
    },
    [state, persist],
  );

  const resetData = useCallback(async () => {
    await persist(SEED_STATE);
  }, [persist]);

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
      acknowledgeAlert,
      toggleTask,
      resetData,
      getLabHistory,
      getActiveMedications,
      getPendingAlerts,
      getPendingTasks,
    }),
    [
      state,
      loading,
      addDocument,
      acknowledgeAlert,
      toggleTask,
      resetData,
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
