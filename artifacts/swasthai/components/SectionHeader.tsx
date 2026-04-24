import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, action, onAction }: Props) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, { color: colors.primary }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 24,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  action: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
