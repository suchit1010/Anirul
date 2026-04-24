import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { HealthAlert } from "@/types/health";

interface Props {
  alert: HealthAlert;
  onAcknowledge?: () => void;
}

export function AlertCard({ alert, onAcknowledge }: Props) {
  const colors = useColors();
  const palette =
    alert.severity === "critical"
      ? { bg: colors.destructiveLight, border: colors.destructive, fg: colors.destructive, icon: "alert-octagon" as const }
      : alert.severity === "warning"
        ? { bg: colors.accentLight, border: colors.accent, fg: "#854F0B", icon: "alert-triangle" as const }
        : { bg: colors.primaryPale, border: colors.primaryLight, fg: colors.primary, icon: "info" as const };

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onAcknowledge?.();
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.bg,
          borderLeftColor: palette.border,
        },
      ]}
    >
      <Feather name={palette.icon} size={18} color={palette.fg} style={{ marginTop: 2 }} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.foreground }]}>{alert.title}</Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={3}>
          {alert.description}
        </Text>
      </View>
      {!alert.acknowledged && onAcknowledge ? (
        <Pressable onPress={handlePress} hitSlop={8} style={styles.dismiss}>
          <Feather name="x" size={16} color={colors.mutedForeground} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
    marginBottom: 10,
  },
  body: { flex: 1 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 2 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
  dismiss: { padding: 4 },
});
