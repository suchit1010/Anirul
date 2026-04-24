import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: Props) {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primaryPale }]}>
        <Feather name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {description ? (
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 24 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    marginBottom: 4,
    textAlign: "center",
  },
  desc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
});
