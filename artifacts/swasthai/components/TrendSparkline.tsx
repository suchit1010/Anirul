import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

interface Props {
  values: number[];
  width?: number;
  height?: number;
  label?: string;
  unit?: string;
}

export function TrendSparkline({ values, width = 220, height = 80, label, unit }: Props) {
  const colors = useColors();
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 8;
  const w = width - padding * 2;
  const h = height - padding * 2;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * w;
    const y = padding + h - ((v - min) / range) * h;
    return { x, y };
  });

  const pathD = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
    .join(" ");

  const trend = values[values.length - 1]! - values[0]!;
  const trendColor = trend > 0 ? colors.destructive : trend < 0 ? colors.success : colors.mutedForeground;

  return (
    <View style={styles.wrap}>
      {label ? (
        <View style={styles.headerRow}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
          <Text style={[styles.delta, { color: trendColor }]}>
            {trend > 0 ? "+" : ""}
            {trend.toFixed(1)} {unit}
          </Text>
        </View>
      ) : null}
      <Svg width={width} height={height}>
        <Path d={pathD} stroke={trendColor} strokeWidth={2.5} fill="none" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={trendColor} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "flex-start" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 4 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12 },
  delta: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
