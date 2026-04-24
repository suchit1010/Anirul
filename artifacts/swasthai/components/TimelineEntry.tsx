import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export type TimelineKind = "visit" | "lab" | "med" | "alert" | "task";

interface Props {
  kind: TimelineKind;
  title: string;
  subtitle?: string;
  date: string;
  detail?: string;
  isLast?: boolean;
}

export function TimelineEntry({ kind, title, subtitle, date, detail, isLast }: Props) {
  const colors = useColors();
  const config = (() => {
    switch (kind) {
      case "visit":
        return { icon: "user" as const, color: "#2563EB", bg: "#DBEAFE" };
      case "lab":
        return { icon: "activity" as const, color: colors.accent, bg: colors.accentLight };
      case "med":
        return { icon: "package" as const, color: colors.primary, bg: colors.primaryPale };
      case "alert":
        return { icon: "alert-triangle" as const, color: colors.destructive, bg: colors.destructiveLight };
      case "task":
        return { icon: "check-circle" as const, color: colors.primaryLight, bg: colors.primaryPale };
    }
  })();

  const formatted = new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: config.bg }]}>
          <Feather name={config.icon} size={14} color={config.color} />
        </View>
        {!isLast ? <View style={[styles.line, { backgroundColor: colors.border }]} /> : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>{formatted}</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>{subtitle}</Text>
        ) : null}
        {detail ? (
          <Text style={[styles.detail, { color: colors.foreground }]} numberOfLines={3}>
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", paddingBottom: 14 },
  left: { width: 40, alignItems: "center" },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  line: {
    flex: 1,
    width: 1.5,
    marginTop: 2,
    marginBottom: -14,
  },
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginLeft: 8,
  },
  date: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginBottom: 2,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 2,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  detail: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
});
