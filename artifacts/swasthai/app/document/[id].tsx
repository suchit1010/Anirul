import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { LabValueCard } from "@/components/LabValueCard";
import { useColors } from "@/hooks/useColors";
import { useHealth } from "@/contexts/HealthContext";

export default function DocumentScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useHealth();
  const doc = state.documents.find((d) => d.id === id);

  if (!doc) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center" }}>
        <EmptyState icon="file" title="Document not found" />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
      <Text style={[styles.title, { color: colors.foreground }]}>{doc.title}</Text>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        {doc.source.toUpperCase()} · {new Date(doc.uploadedAt).toLocaleDateString()}
      </Text>

      {doc.confidence ? (
        <View style={[styles.confCard, { backgroundColor: colors.primaryPale }]}>
          <Feather name="check-circle" size={16} color={colors.primary} />
          <Text style={[styles.confText, { color: colors.primary }]}>
            Extracted with {Math.round(doc.confidence * 100)}% confidence · {doc.language}
          </Text>
        </View>
      ) : null}

      {doc.extractedLabs && doc.extractedLabs.length > 0 ? (
        <>
          <Text style={[styles.section, { color: colors.foreground }]}>Lab values</Text>
          <View style={styles.grid}>
            {doc.extractedLabs.map((lab) => (
              <View key={lab.id} style={{ flexBasis: "48%", flexGrow: 1 }}>
                <LabValueCard lab={lab} />
              </View>
            ))}
          </View>
        </>
      ) : null}

      {doc.rawText ? (
        <>
          <Text style={[styles.section, { color: colors.foreground }]}>Original text</Text>
          <View style={[styles.rawCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.raw, { color: colors.foreground }]}>{doc.rawText}</Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: "DMSerifDisplay_400Regular", fontSize: 24, letterSpacing: -0.5 },
  meta: { fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 4, letterSpacing: 0.5 },
  confCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  confText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  section: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginTop: 22, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  rawCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  raw: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 19 },
});
