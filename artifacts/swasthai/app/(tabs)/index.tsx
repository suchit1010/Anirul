import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlertCard } from "@/components/AlertCard";
import { HealthScoreRing } from "@/components/HealthScoreRing";
import { LabValueCard } from "@/components/LabValueCard";
import { SectionHeader } from "@/components/SectionHeader";
import { TrendSparkline } from "@/components/TrendSparkline";
import { useColors } from "@/hooks/useColors";
import { useHealth } from "@/contexts/HealthContext";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, getPendingAlerts, getLabHistory, acknowledgeAlert } = useHealth();

  const alerts = getPendingAlerts();
  const a1cHistory = getLabHistory("HbA1c");
  const a1cValues = a1cHistory.map((l) => l.value);

  const latestByName = new Map<string, (typeof state.labs)[number]>();
  for (const lab of [...state.labs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )) {
    if (!latestByName.has(lab.name)) latestByName.set(lab.name, lab);
  }
  const featuredLabs = Array.from(latestByName.values()).slice(0, 4);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomPad = Platform.OS === "web" ? 110 : 100;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: webBottomPad,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero header */}
        <View
          style={[
            styles.hero,
            {
              backgroundColor: colors.primary,
              paddingTop: insets.top + 20 + webTopInset,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.greeting, { color: colors.primaryForeground }]}>
                Namaste,
              </Text>
              <Text style={styles.heroName}>{state.patientName.split(" ")[0]}</Text>
              {state.abhaLinked ? (
                <View style={styles.abhaBadge}>
                  <Feather name="shield" size={11} color="#fff" />
                  <Text style={styles.abhaText}>ABHA linked</Text>
                </View>
              ) : null}
            </View>
            <HealthScoreRing score={state.healthScore} size={96} />
          </View>

          <View style={styles.continuityRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.contLabel}>Care continuity</Text>
              <View style={styles.contBarBg}>
                <View
                  style={[
                    styles.contBarFill,
                    { width: `${state.continuityScore}%` },
                  ]}
                />
              </View>
            </View>
            <Text style={styles.contNum}>{state.continuityScore}%</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {alerts.length > 0 ? (
            <>
              <SectionHeader
                title={`Alerts (${alerts.length})`}
                action="Doctor brief"
                onAction={() => router.push("/doctor-brief")}
              />
              {alerts.slice(0, 3).map((a) => (
                <AlertCard key={a.id} alert={a} onAcknowledge={() => acknowledgeAlert(a.id)} />
              ))}
            </>
          ) : null}

          <SectionHeader title="Latest results" action="See all" onAction={() => router.push("/timeline")} />
          <View style={styles.labsGrid}>
            {featuredLabs.map((lab) => (
              <Pressable
                key={lab.id}
                onPress={() => router.push(`/lab/${encodeURIComponent(lab.name)}`)}
                style={styles.labWrap}
              >
                <LabValueCard lab={lab} />
              </Pressable>
            ))}
          </View>

          {a1cValues.length >= 2 ? (
            <>
              <SectionHeader title="HbA1c trend" />
              <View style={[styles.trendCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TrendSparkline values={a1cValues} label="Last 8 months" unit="%" />
                <Text style={[styles.trendNote, { color: colors.mutedForeground }]}>
                  HbA1c moved from {a1cValues[0]}% to {a1cValues[a1cValues.length - 1]}% — trending up. Discuss with Dr Sharma at next visit.
                </Text>
              </View>
            </>
          ) : null}

          <SectionHeader title="Quick actions" />
          <View style={styles.actionsGrid}>
            <QuickAction icon="upload-cloud" label="Add report" onPress={() => router.push("/upload")} />
            <QuickAction icon="clock" label="Timeline" onPress={() => router.push("/timeline")} />
            <QuickAction icon="check-square" label="Care plan" onPress={() => router.push("/care")} />
            <QuickAction icon="users" label="Family" onPress={() => router.push("/profile")} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: colors.primaryPale }]}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.actionLabel, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: { fontFamily: "Inter_400Regular", fontSize: 13, opacity: 0.75 },
  heroName: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 28,
    color: "#fff",
    marginTop: 2,
    letterSpacing: -0.5,
  },
  abhaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  abhaText: { color: "#fff", fontSize: 10, fontFamily: "Inter_500Medium" },
  continuityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
  },
  contLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 6 },
  contBarBg: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 3,
    overflow: "hidden",
  },
  contBarFill: { height: "100%", backgroundColor: "#34D399", borderRadius: 3 },
  contNum: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.5,
  },
  labsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  labWrap: { flexBasis: "48%", flexGrow: 1 },
  trendCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  trendNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCard: {
    flexBasis: "48%",
    flexGrow: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 },
});
