import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

type Variant = "primary" | "secondary" | "ghost";

interface Props {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Feather.glyphMap;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  variant = "primary",
  loading,
  disabled,
  fullWidth = true,
}: Props) {
  const colors = useColors();
  const palette =
    variant === "secondary"
      ? { bg: colors.primaryPale, fg: colors.primary, border: "transparent" }
      : variant === "ghost"
        ? { bg: "transparent", fg: colors.primary, border: colors.primarySoft }
        : { bg: colors.primary, fg: colors.primaryForeground, border: "transparent" };

  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: variant === "ghost" ? 1.5 : 0,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={palette.fg} size="small" />
        ) : (
          <>
            {icon ? <Feather name={icon} size={16} color={palette.fg} /> : null}
            <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
