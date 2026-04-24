import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionHeader } from "@/components/SectionHeader";
import { useColors } from "@/hooks/useColors";
import { useHealth } from "@/contexts/HealthContext";
import { extractFromText, SAMPLE_REPORT } from "@/lib/extract";
import { DocSource, HealthDocument } from "@/types/health";

const SOURCES: { key: DocSource; icon: keyof typeof Feather.glyphMap; label: string; sub: string }[] = [
  { key: "upload", icon: "file-text", label: "PDF / text", sub: "Lab report, discharge summary" },
  { key: "camera", icon: "camera", label: "Camera", sub: "Snap a paper report" },
  { key: "whatsapp", icon: "message-circle", label: "From WhatsApp", sub: "Forwarded text or PDF" },
  { key: "audio", icon: "mic", label: "Voice note", sub: "Doctor conversation" },
];

export default function UploadScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addDocument } = useHealth();

  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState<DocSource>("upload");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof extractFromText> | null>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomPad = Platform.OS === "web" ? 110 : 100;

  const handleExtract = async () => {
    if (!text.trim()) {
      Alert.alert("Add some text", "Paste a report or use the sample to try the extractor.");
      return;
    }
    setProcessing(true);
    setResult(null);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await new Promise((r) => setTimeout(r, 900));
    const extracted = extractFromText(text);
    setResult(extracted);
    setProcessing(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    const doc: HealthDocument = {
      id: `doc-${Date.now().toString(36)}`,
      title: title.trim() || "Untitled report",
      source,
      status: "completed",
      uploadedAt: new Date().toISOString(),
      rawText: text,
      extractedLabs: result.labs,
      extractedMeds: result.medications,
      extractedDiagnoses: result.diagnoses,
      language: result.language,
      confidence: result.confidence,
    };
    await addDocument(doc);
    setText("");
    setTitle("");
    setResult(null);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.push("/timeline");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 + webTopInset }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Add to memory</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Upload anything — we extract labs, meds, diagnoses
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: webBottomPad }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SectionHeader title="Source" />
        <View style={styles.sourceGrid}>
          {SOURCES.map((s) => {
            const active = source === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => setSource(s.key)}
                style={[
                  styles.sourceCard,
                  {
                    backgroundColor: active ? colors.primaryPale : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Feather
                  name={s.icon}
                  size={20}
                  color={active ? colors.primary : colors.mutedForeground}
                />
                <Text style={[styles.sourceLabel, { color: colors.foreground }]}>
                  {s.label}
                </Text>
                <Text style={[styles.sourceSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {s.sub}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <SectionHeader title="Title" />
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Apollo lab report — March"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
          ]}
        />

        <SectionHeader title="Report text" action="Use sample" onAction={() => setText(SAMPLE_REPORT)} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Paste lab report, prescription, WhatsApp text, or voice transcript..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          textAlignVertical="top"
          style={[
            styles.textarea,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
          ]}
        />

        <View style={{ marginTop: 16 }}>
          <PrimaryButton
            label={processing ? "Extracting..." : "Extract with AI"}
            icon="zap"
            onPress={handleExtract}
            loading={processing}
          />
        </View>

        {result ? (
          <View style={[styles.resultCard, { backgroundColor: colors.primaryPale, borderColor: colors.primarySoft }]}>
            <View style={styles.resultHeader}>
              <Feather name="check-circle" size={16} color={colors.primary} />
              <Text style={[styles.resultTitle, { color: colors.primary }]}>
                Extracted · {Math.round(result.confidence * 100)}% confidence
              </Text>
              <View style={[styles.langPill, { backgroundColor: colors.primary }]}>
                <Text style={styles.langText}>{result.language}</Text>
              </View>
            </View>

            <ResultBlock label="Lab values" count={result.labs.length}>
              {result.labs.map((l) => (
                <Text key={l.id} style={[styles.resultLine, { color: colors.foreground }]}>
                  {l.name}: <Text style={{ fontFamily: "Inter_700Bold" }}>{l.value} {l.unit}</Text>
                  <Text style={{ color: colors.mutedForeground }}>  ({l.status.toLowerCase()})</Text>
                </Text>
              ))}
            </ResultBlock>

            <ResultBlock label="Medications" count={result.medications.length}>
              {result.medications.map((m) => (
                <Text key={m.id} style={[styles.resultLine, { color: colors.foreground }]}>
                  {m.name} {m.dose} · {m.frequency}
                </Text>
              ))}
            </ResultBlock>

            <ResultBlock label="Diagnoses" count={result.diagnoses.length}>
              {result.diagnoses.map((d, i) => (
                <Text key={i} style={[styles.resultLine, { color: colors.foreground }]}>
                  · {d}
                </Text>
              ))}
            </ResultBlock>

            <View style={{ marginTop: 14 }}>
              <PrimaryButton label="Save to timeline" icon="save" onPress={handleSave} />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function ResultBlock({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={[styles.blockLabel, { color: colors.mutedForeground }]}>
        {label.toUpperCase()} · {count}
      </Text>
      {count === 0 ? (
        <Text style={[styles.resultLine, { color: colors.mutedForeground, fontStyle: "italic" }]}>
          None detected
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontFamily: "DMSerifDisplay_400Regular", fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  sourceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sourceCard: {
    flexBasis: "48%",
    flexGrow: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  sourceLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginTop: 4 },
  sourceSub: { fontFamily: "Inter_400Regular", fontSize: 11 },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  textarea: {
    minHeight: 200,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  resultCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  resultTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 },
  langPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  langText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 10 },
  blockLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  resultLine: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 19,
  },
});
