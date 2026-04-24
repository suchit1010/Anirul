import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useHealth } from "@/contexts/HealthContext";

export default function DoctorBriefScreen() {
  const colors = useColors();
  const { state, getActiveMedications } = useHealth();
  const meds = getActiveMedications();
  const flagged = state.labs.filter((l) => l.status !== "NORMAL");
  const recentVisit = state.visits[0];

  return (
    <ScrollView style={{ backgroundColor: colors.background }}>
      <View style={[styles.head, { backgroundColor: colors.primary }]}>
        <View style={styles.badge}>
          <Feather name="file-text" size={12} color="#fff" />
          <Text style={styles.badgeText}>AI Pre-Consult Brief</Text>
        </View>
        <Text style={styles.patient}>{state.patientName}</Text>
        <Text style={styles.meta}>52 yrs · M · ABHA verified</Text>

        <View style={styles.contRow}>
          <View>
            <Text style={styles.contNum}>{state.continuityScore}%</Text>
            <Text style={styles.contLabel}>Continuity</Text>
          </View>
          <View style={styles.contBarWrap}>
            <View style={[styles.contBarFill, { width: `${state.continuityScore}%` }]} />
          </View>
        </View>
      </View>

      <View style={{ padding: 16 }}>
        <Section title="Active Diagnoses">
          {state.diagnoses.map((d) => (
            <Text key={d.id} style={[styles.line, { color: colors.foreground }]}>
              · {d.name}{" "}
              <Text style={{ color: colors.mutedForeground }}>
                (since {new Date(d.date).getFullYear()})
              </Text>
            </Text>
          ))}
        </Section>

        <Section title="Red Flags">
          <View style={[styles.flag, { backgroundColor: colors.accentLight, borderLeftColor: colors.accent }]}>
            <Text style={[styles.flagTitle, { color: colors.foreground }]}>
              HbA1c trending up: 6.8 → 7.2 → 7.8 over 8 months
            </Text>
            <Text style={[styles.flagDesc, { color: colors.mutedForeground }]}>
              Suboptimal glycemic control. Consider intensifying therapy or adherence review.
            </Text>
          </View>
          <View style={[styles.flag, { backgroundColor: colors.accentLight, borderLeftColor: colors.accent }]}>
            <Text style={[styles.flagTitle, { color: colors.foreground }]}>
              LDL above goal (132 mg/dL, target &lt;100)
            </Text>
            <Text style={[styles.flagDesc, { color: colors.mutedForeground }]}>
              Atorvastatin 10mg started 45 days ago. Recheck lipid panel in 2 months.
            </Text>
          </View>
        </Section>

        <Section title="Current Medications">
          {meds.map((m) => (
            <Text key={m.id} style={[styles.line, { color: colors.foreground }]}>
              · {m.name} {m.dose} — {m.frequency.toLowerCase()}
            </Text>
          ))}
        </Section>

        <Section title="Recent Labs (flagged)">
          {flagged.slice(0, 6).map((l) => (
            <Text key={l.id} style={[styles.line, { color: colors.foreground }]}>
              · {l.name}: <Text style={{ fontFamily: "Inter_700Bold" }}>{l.value} {l.unit}</Text>
              <Text style={{ color: colors.mutedForeground }}>
                {" "}({l.status.toLowerCase()}, ref {l.referenceLow}–{l.referenceHigh})
              </Text>
            </Text>
          ))}
        </Section>

        {recentVisit ? (
          <Section title="Last Visit">
            <Text style={[styles.line, { color: colors.foreground }]}>
              {recentVisit.doctor} · {recentVisit.hospital}
            </Text>
            <Text style={[styles.line, { color: colors.mutedForeground, marginTop: 4 }]}>
              {recentVisit.notes}
            </Text>
          </Section>
        ) : null}

        <Section title="Suggested Actions">
          <Text style={[styles.line, { color: colors.foreground }]}>
            · Reinforce metformin adherence; consider adding SGLT2i if HbA1c stays &gt; 7.5
          </Text>
          <Text style={[styles.line, { color: colors.foreground }]}>
            · Confirm BP log; titrate telmisartan if systolic &gt; 140
          </Text>
          <Text style={[styles.line, { color: colors.foreground }]}>
            · Order: Repeat HbA1c, lipid profile, urine ACR
          </Text>
        </Section>
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { padding: 20, paddingBottom: 24 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  badgeText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 10 },
  patient: { color: "#fff", fontFamily: "DMSerifDisplay_400Regular", fontSize: 22 },
  meta: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  contRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: 12,
  },
  contNum: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 22 },
  contLabel: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontFamily: "Inter_500Medium" },
  contBarWrap: { flex: 1, height: 4, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 2 },
  contBarFill: { height: "100%", backgroundColor: "#34D399", borderRadius: 2 },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  line: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
  flag: {
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    marginBottom: 8,
  },
  flagTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 3 },
  flagDesc: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
});
