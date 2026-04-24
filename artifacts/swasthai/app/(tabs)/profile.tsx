import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SectionHeader } from "@/components/SectionHeader";
import { useColors } from "@/hooks/useColors";
import { useHealth } from "@/contexts/HealthContext";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, resetData } = useHealth();

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomPad = Platform.OS === "web" ? 110 : 100;

  const onReset = () => {
    Alert.alert(
      "Reset demo data?",
      "This restores the seed health profile. Your locally added documents will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => resetData(),
        },
      ],
    );
  };

  const initials = state.patientName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: webBottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + 24 + webTopInset, backgroundColor: colors.primary },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.16)" }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{state.patientName}</Text>
          {state.abhaLinked ? (
            <View style={styles.abhaBadge}>
              <Feather name="shield" size={11} color="#fff" />
              <Text style={styles.abhaText}>ABHA · 12-3456-7890-1234</Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => router.push("/doctor-brief")}
            style={({ pressed }) => [
              styles.briefBtn,
              { backgroundColor: "rgba(255,255,255,0.16)", opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="file-text" size={14} color="#fff" />
            <Text style={styles.briefBtnText}>Generate doctor brief</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <SectionHeader title="Family" />
          {state.family.map((f) => (
            <View
              key={f.id}
              style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.famAvatar, { backgroundColor: colors.primaryPale }]}>
                <Text style={[styles.famInit, { color: colors.primary }]}>{f.initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{f.name}</Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                  {f.relation} · {f.age} yrs
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </View>
          ))}

          <SectionHeader title="Risk profile" />
          {state.risks.map((r) => {
            const trendColor =
              r.trend === "worsening"
                ? colors.destructive
                : r.trend === "improving"
                  ? colors.primaryLight
                  : colors.mutedForeground;
            return (
              <View
                key={r.category}
                style={[styles.riskCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.riskHead}>
                  <Text style={[styles.riskName, { color: colors.foreground }]}>{r.category}</Text>
                  <View style={styles.riskScoreRow}>
                    <Text style={[styles.riskScore, { color: colors.foreground }]}>{r.score}</Text>
                    <Feather
                      name={
                        r.trend === "worsening"
                          ? "trending-up"
                          : r.trend === "improving"
                            ? "trending-down"
                            : "minus"
                      }
                      size={14}
                      color={trendColor}
                    />
                  </View>
                </View>
                <View style={[styles.riskBarBg, { backgroundColor: colors.muted }]}>
                  <View
                    style={[
                      styles.riskBarFill,
                      {
                        width: `${Math.min(100, r.score)}%`,
                        backgroundColor: r.score > 60 ? colors.destructive : r.score > 35 ? colors.accent : colors.primaryLight,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.riskFactors, { color: colors.mutedForeground }]}>
                  {r.factors.join(" · ")}
                </Text>
              </View>
            );
          })}

          <SectionHeader title="Privacy & sharing" />
          <SettingsRow icon="lock" label="Consent center" sub="Active grants and history" />
          <SettingsRow icon="share-2" label="Share with doctor" sub="Generate one-time link" />
          <SettingsRow icon="credit-card" label="Private payments" sub="Stealth address for sensitive care" />

          <SectionHeader title="App" />
          <SettingsRow icon="bell" label="Notifications" sub="WhatsApp, push, SMS" />
          <SettingsRow icon="globe" label="Language" sub="English (auto-detect)" />
          <Pressable onPress={onReset}>
            <SettingsRow icon="refresh-cw" label="Reset demo data" destructive />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  sub,
  destructive,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sub?: string;
  destructive?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View
        style={[
          styles.famAvatar,
          { backgroundColor: destructive ? colors.destructiveLight : colors.primaryPale },
        ]}
      >
        <Feather name={icon} size={16} color={destructive ? colors.destructive : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.rowTitle,
            { color: destructive ? colors.destructive : colors.foreground },
          ]}
        >
          {label}
        </Text>
        {sub ? (
          <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{sub}</Text>
        ) : null}
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: "#fff",
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 28,
  },
  name: {
    color: "#fff",
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 22,
    letterSpacing: -0.4,
  },
  abhaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  abhaText: { color: "#fff", fontSize: 10, fontFamily: "Inter_500Medium" },
  briefBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    marginTop: 16,
  },
  briefBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  famAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  famInit: { fontFamily: "Inter_700Bold", fontSize: 14 },
  rowTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  rowSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  riskCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  riskHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  riskName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  riskScoreRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  riskScore: { fontFamily: "Inter_700Bold", fontSize: 16 },
  riskBarBg: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 8 },
  riskBarFill: { height: "100%", borderRadius: 3 },
  riskFactors: { fontFamily: "Inter_400Regular", fontSize: 11 },
});
