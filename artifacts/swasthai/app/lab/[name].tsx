import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LabValueCard } from "@/components/LabValueCard";
import { TrendSparkline } from "@/components/TrendSparkline";
import { useColors } from "@/hooks/useColors";
import { useHealth } from "@/contexts/HealthContext";

export default function LabTrendScreen() {
  const colors = useColors();
  const { name } = useLocalSearchParams<{ name: string }>();
  const decoded = decodeURIComponent(String(name ?? ""));
  const { getLabHistory } = useHealth();
  const history = getLabHistory(decoded);
  const values = history.map((l) => l.value);
  const latest = history[history.length - 1];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16 }}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>{decoded}</Text>
      {latest ? (
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Reference {latest.referenceLow} – {latest.referenceHigh} {latest.unit}
        </Text>
      ) : null}

      {values.length >= 2 ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TrendSparkline values={values} label="History" unit={latest?.unit} width={300} height={120} />
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "center" }]}>
          <Feather name="bar-chart-2" size={28} color={colors.mutedForeground} />
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            Need 2+ data points to show a trend.
          </Text>
        </View>
      )}

      <Text style={[styles.section, { color: colors.foreground }]}>Readings</Text>
      {history
        .slice()
        .reverse()
        .map((lab) => (
          <View
            key={lab.id}
            style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowDate, { color: colors.mutedForeground }]}>
                {new Date(lab.date).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
              <Text style={[styles.rowVal, { color: colors.foreground }]}>
                {lab.value} {lab.unit}
              </Text>
            </View>
            <View style={{ width: 140 }}>
              <LabValueCard lab={lab} />
            </View>
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 28,
    letterSpacing: -0.5,
  },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2, marginBottom: 16 },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  empty: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 8, textAlign: "center" },
  section: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    marginTop: 8,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    alignItems: "center",
  },
  rowDate: { fontFamily: "Inter_500Medium", fontSize: 11 },
  rowVal: { fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 2 },
});
