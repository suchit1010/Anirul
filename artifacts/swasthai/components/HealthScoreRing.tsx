import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  score: number;
  label?: string;
  size?: number;
}

export function HealthScoreRing({ score, label = "Health Score", size = 120 }: Props) {
  const colors = useColors();
  const ringColor =
    score >= 75 ? "#34D399" : score >= 60 ? "#FBBF24" : "#F87171";

  return (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: ringColor,
          backgroundColor: "rgba(255,255,255,0.06)",
        },
      ]}
    >
      <Text style={[styles.score, { color: colors.primaryForeground }]}>
        {Math.round(score)}
      </Text>
      <Text style={[styles.label, { color: colors.primaryForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  score: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    opacity: 0.75,
    marginTop: 2,
  },
});
