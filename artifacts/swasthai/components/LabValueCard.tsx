import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { LabValue } from "@/types/health";

interface Props {
  lab: LabValue;
  trend?: "up" | "down" | "flat";
}

export function LabValueCard({ lab, trend }: Props) {
  const colors = useColors();
  const palette =
    lab.status === "CRITICAL"
      ? { bg: colors.destructiveLight, fg: colors.destructive }
      : lab.status === "HIGH"
        ? { bg: colors.accentLight, fg: "#854F0B" }
        : lab.status === "LOW"
          ? { bg: "#DBEAFE", fg: "#1E40AF" }
          : { bg: colors.primaryPale, fg: colors.primary };

  const trendIcon = trend === "up" ? "trending-up" : trend === "down" ? "trending-down" : "minus";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.name, { color: colors.mutedForeground }]} numberOfLines={1}>
          {lab.name}
        </Text>
        {trend ? (
          <Feather name={trendIcon} size={14} color={colors.mutedForeground} />
        ) : null}
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: colors.foreground }]}>{lab.value}</Text>
        <Text style={[styles.unit, { color: colors.mutedForeground }]}>{lab.unit}</Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: palette.bg }]}>
        <Text style={[styles.statusText, { color: palette.fg }]}>
          {lab.status === "NORMAL" ? "Normal" : lab.status === "HIGH" ? "High" : lab.status === "LOW" ? "Low" : "Critical"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  name: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    flex: 1,
    marginRight: 6,
  },
  valueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  value: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.5,
  },
  unit: { fontFamily: "Inter_400Regular", fontSize: 11 },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
  },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
});
