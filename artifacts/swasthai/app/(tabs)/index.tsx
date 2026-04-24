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
import { TaskRow } from "@/components/TaskRow";
import { TrendSparkline } from "@/components/TrendSparkline";
import { APP_NAME, POWERED_BY } from "@/constants/brand";
import { useColors } from "@/hooks/useColors";
import { useResponsive } from "@/hooks/useResponsive";
import { useHealth } from "@/contexts/HealthContext";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const r = useResponsive();
  const {
    state,
    getPendingAlerts,
    getLabHistory,
    acknowledgeAlert,
    getPendingTasks,
    toggleTask,
    getActiveMedications,
  } = useHealth();

  const alerts = getPendingAlerts();
  const tasks = getPendingTasks().slice(0, 4);
  const a1cHistory = getLabHistory("HbA1c");
  const a1cValues = a1cHistory.map((l) => l.value);
  const meds = getActiveMedications();

  const latestByName = new Map<string, (typeof state.labs)[number]>();
  for (const lab of [...state.labs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )) {
    if (!latestByName.has(lab.name)) latestByName.set(lab.name, lab);
  }
  const featuredLabs = Array.from(latestByName.values()).slice(0, r.isWide ? 6 : 4);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomPad = Platform.OS === "web" ? 110 : 100;
  const heroPadH = r.isDesktop ? 36 : r.isTablet ? 28 : 20;
  const contentPadH = r.isDesktop ? 36 : r.isTablet ? 24 : 16;
  const maxW = r.isDesktop ? 1280 : r.isTablet ? 880 : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: webBottomPad, alignItems: "center" }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero header */}
        <View
          style={[
            styles.hero,
            {
              backgroundColor: colors.primary,
              paddingTop: insets.top + 20 + webTopInset,
              paddingHorizontal: heroPadH,
              width: "100%",
            },
          ]}
        >
          <View style={{ width: "100%", maxWidth: maxW, alignSelf: "center" }}>
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.brandRow}>
                  <View style={styles.brandMark}>
                    <Feather name="activity" size={14} color="#0D3D2A" />
                  </View>
                  <Text style={styles.brandName}>{APP_NAME}</Text>
                  <View style={styles.brandSep} />
                  <Text style={styles.brandPowered}>{POWERED_BY}</Text>
                </View>
                <Text style={[styles.greeting, { color: colors.primaryForeground }]}>
                  Namaste,
                </Text>
                <Text style={[styles.heroName, { fontSize: r.isWide ? 36 : 28 }]}>
                  {state.patientName.split(" ")[0]}
                </Text>
                {state.abhaLinked ? (
                  <View style={styles.abhaBadge}>
                    <Feather name="shield" size={11} color="#fff" />
                    <Text style={styles.abhaText}>ABHA linked</Text>
                  </View>
                ) : null}
              </View>

              {r.isWide ? (
                <View style={styles.heroKpiRow}>
                  <HeroKpi label="Health Score" value={state.healthScore} accent="#34D399" />
                  <HeroKpi label="Continuity" value={`${state.continuityScore}%`} accent="#FBBF24" />
                  <HeroKpi label="Active Meds" value={meds.length} accent="#60A5FA" />
                  <HeroKpi label="Open Alerts" value={alerts.length} accent="#F87171" />
                </View>
              ) : (
                <HealthScoreRing score={state.healthScore} size={96} />
              )}
            </View>

            {!r.isWide ? (
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
            ) : null}
          </View>
        </View>

        <View
          style={{
            width: "100%",
            maxWidth: maxW,
            paddingHorizontal: contentPadH,
          }}
        >
          {r.isWide ? (
            // Dashboard layout — two columns
            <View style={styles.dashRow}>
              {/* Left column: alerts + tasks */}
              <View style={styles.colLeft}>
                <SectionHeader
                  title={`Alerts (${alerts.length})`}
                  action="Doctor brief"
                  onAction={() => router.push("/doctor-brief")}
                />
                {alerts.length === 0 ? (
                  <EmptyTile icon="check-circle" text="No active alerts" />
                ) : (
                  alerts.map((a) => (
                    <AlertCard key={a.id} alert={a} onAcknowledge={() => acknowledgeAlert(a.id)} />
                  ))
                )}

                <SectionHeader title="Today's care" action="View all" onAction={() => router.push("/care")} />
                {tasks.length === 0 ? (
                  <EmptyTile icon="check-square" text="All caught up" />
                ) : (
                  tasks.map((t) => <TaskRow key={t.id} task={t} onToggle={() => toggleTask(t.id)} />)
                )}
              </View>

              {/* Right column: labs + trend + meds */}
              <View style={styles.colRight}>
                <SectionHeader
                  title="Latest results"
                  action="See all"
                  onAction={() => router.push("/timeline")}
                />
                <View style={styles.labsGridWide}>
                  {featuredLabs.map((lab) => (
                    <Pressable
                      key={lab.id}
                      onPress={() => router.push(`/lab/${encodeURIComponent(lab.name)}`)}
                      style={styles.labWrapWide}
                    >
                      <LabValueCard lab={lab} />
                    </Pressable>
                  ))}
                </View>

                {a1cValues.length >= 2 ? (
                  <>
                    <SectionHeader title="HbA1c trend" />
                    <View style={[styles.trendCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <TrendSparkline values={a1cValues} label="Last 8 months" unit="%" width={r.isDesktop ? 540 : 380} height={120} />
                      <Text style={[styles.trendNote, { color: colors.mutedForeground }]}>
                        HbA1c moved from {a1cValues[0]}% to {a1cValues[a1cValues.length - 1]}% — trending up. {AI_NAME_HINT()} flagged this for your next visit.
                      </Text>
                    </View>
                  </>
                ) : null}

                <SectionHeader title="Active medications" action="Care plan" onAction={() => router.push("/care")} />
                <View style={styles.medGrid}>
                  {meds.map((m) => (
                    <View
                      key={m.id}
                      style={[styles.medChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <View style={[styles.medDot, { backgroundColor: colors.primary }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.medChipName, { color: colors.foreground }]}>
                          {m.name}{" "}
                          <Text style={{ color: colors.mutedForeground }}>{m.dose}</Text>
                        </Text>
                        <Text style={[styles.medChipMeta, { color: colors.mutedForeground }]}>
                          {m.frequency}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            // Phone layout — single column
            <>
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
                      HbA1c moved from {a1cValues[0]}% to {a1cValues[a1cValues.length - 1]}% — trending up.
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
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function AI_NAME_HINT() {
  return "Swastha AI";
}

function HeroKpi({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <View style={styles.kpi}>
      <View style={[styles.kpiDot, { backgroundColor: accent }]} />
      <Text style={styles.kpiVal}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function EmptyTile({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  const colors = useColors();
  return (
    <View style={[styles.emptyTile, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Feather name={icon} size={18} color={colors.primary} />
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
        {text}
      </Text>
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
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  brandMark: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#FBBF24",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    color: "#fff",
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  brandSep: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  brandPowered: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.3,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  greeting: { fontFamily: "Inter_400Regular", fontSize: 13, opacity: 0.75 },
  heroName: {
    fontFamily: "DMSerifDisplay_400Regular",
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
  heroKpiRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  kpi: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 120,
  },
  kpiDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  kpiVal: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    letterSpacing: -0.5,
  },
  kpiLabel: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginTop: 2,
  },
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
  dashRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 8,
  },
  colLeft: { flex: 1, minWidth: 0 },
  colRight: { flex: 1.4, minWidth: 0 },
  labsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  labWrap: { flexBasis: "48%", flexGrow: 1 },
  labsGridWide: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  labWrapWide: { flexBasis: "31%", flexGrow: 1, minWidth: 160 },
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
  medGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  medChip: {
    flexBasis: "31%",
    flexGrow: 1,
    minWidth: 160,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  medDot: { width: 8, height: 8, borderRadius: 4 },
  medChipName: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  medChipMeta: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
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
  emptyTile: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
});
