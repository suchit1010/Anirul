import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { LabValueCard } from "@/components/LabValueCard";
import { useColors } from "@/hooks/useColors";
import { useHealth } from "@/contexts/HealthContext";
import { documentsApi } from "@/lib/api";

export default function DocumentScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, deleteDocument } = useHealth();
  const doc = state.documents.find((d) => d.id === id);

  if (!doc) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center" }}>
        <EmptyState icon="file" title="Document not found" />
      </View>
    );
  }

  const onDelete = () => {
    Alert.alert(
      "Delete document?",
      "This removes the document and any lab values it contributed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await documentsApi.delete(doc.id);
            } catch {
              // Keep local delete behavior even if server delete fails.
            }
            await deleteDocument(doc.id);
            router.back();
          },
        },
      ],
    );
  };

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

      {doc.extractedDiagnoses && doc.extractedDiagnoses.length > 0 ? (
        <>
          <Text style={[styles.section, { color: colors.foreground }]}>Diagnoses</Text>
          <View style={styles.tagRow}>
            {doc.extractedDiagnoses.map((d) => (
              <View key={d} style={[styles.tag, { backgroundColor: colors.primaryPale }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{d}</Text>
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

      <Pressable
        onPress={onDelete}
        style={({ pressed }) => [
          styles.deleteBtn,
          { backgroundColor: colors.destructiveLight, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Feather name="trash-2" size={16} color={colors.destructive} />
        <Text style={[styles.deleteText, { color: colors.destructive }]}>Delete from memory</Text>
      </Pressable>
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
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  tagText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  rawCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  raw: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 19 },
  deleteBtn: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  deleteText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
