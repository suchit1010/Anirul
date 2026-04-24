import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { TaskRow } from "@/components/TaskRow";
import { useColors } from "@/hooks/useColors";
import { useHealth } from "@/contexts/HealthContext";

export default function CareScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, toggleTask, getActiveMedications } = useHealth();

  const pending = state.tasks.filter((t) => t.status !== "completed");
  const done = state.tasks.filter((t) => t.status === "completed");
  const meds = getActiveMedications();

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomPad = Platform.OS === "web" ? 110 : 100;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 + webTopInset }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Care plan</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          What to check, take, and follow up on
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: webBottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statsRow]}>
          <Stat icon="check-circle" label="Pending" value={pending.length} color={colors.accent} />
          <Stat icon="award" label="Done" value={done.length} color={colors.primaryLight} />
          <Stat icon="package" label="Active meds" value={meds.length} color="#2563EB" />
        </View>

        <SectionHeader title="Today & upcoming" />
        {pending.length === 0 ? (
          <EmptyState icon="check-circle" title="All caught up" description="Nothing pending right now." />
        ) : (
          pending.map((t) => <TaskRow key={t.id} task={t} onToggle={() => toggleTask(t.id)} />)
        )}

        <SectionHeader title="Active medications" />
        {meds.map((m) => (
          <View
            key={m.id}
            style={[styles.medCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.medIcon, { backgroundColor: colors.primaryPale }]}>
              <Feather name="package" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.medName, { color: colors.foreground }]}>
                {m.name} <Text style={{ color: colors.mutedForeground }}>· {m.dose}</Text>
              </Text>
              <Text style={[styles.medMeta, { color: colors.mutedForeground }]}>
                {m.frequency} {m.prescribedBy ? `· ${m.prescribedBy}` : ""}
              </Text>
            </View>
          </View>
        ))}

        {done.length > 0 ? (
          <>
            <SectionHeader title="Completed" />
            {done.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={() => toggleTask(t.id)} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: number;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontFamily: "DMSerifDisplay_400Regular", fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 4 },
  stat: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-start",
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: -0.5 },
  statLabel: { fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 1 },
  medCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  medIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  medName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  medMeta: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
});
