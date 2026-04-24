import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { CareTask } from "@/types/health";

interface Props {
  task: CareTask;
  onToggle?: () => void;
}

export function TaskRow({ task, onToggle }: Props) {
  const colors = useColors();
  const due = new Date(task.dueDate);
  const now = new Date();
  const overdue = due < now && task.status !== "completed";
  const completed = task.status === "completed";

  const priorityColor =
    task.priority === "high"
      ? colors.destructive
      : task.priority === "moderate"
        ? colors.accent
        : colors.primaryLight;

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle?.();
  };

  const dueLabel = overdue
    ? "Overdue"
    : due.toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: completed ? colors.primary : colors.border,
            backgroundColor: completed ? colors.primary : "transparent",
          },
        ]}
      >
        {completed ? <Feather name="check" size={14} color={colors.primaryForeground} /> : null}
      </View>
      <View style={styles.body}>
        <Text
          style={[
            styles.title,
            {
              color: completed ? colors.mutedForeground : colors.foreground,
              textDecorationLine: completed ? "line-through" : "none",
            },
          ]}
        >
          {task.title}
        </Text>
        {task.description ? (
          <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <View style={[styles.dot, { backgroundColor: priorityColor }]} />
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {task.priority.toUpperCase()} · {dueLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  body: { flex: 1 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 2 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  meta: { fontFamily: "Inter_500Medium", fontSize: 10, letterSpacing: 0.5 },
});
