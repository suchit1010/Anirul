import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import {
  documentsApi,
  extractApi,
  storageApi,
  type ExtractionResponse,
} from "@/lib/api";
import { SAMPLE_REPORT } from "@/lib/extract";
import { DocSource, HealthDocument, LabValue, Medication } from "@/types/health";

const SOURCES: { key: DocSource; icon: keyof typeof Feather.glyphMap; label: string; sub: string }[] = [
  { key: "camera", icon: "camera", label: "Photo / scan", sub: "Snap a paper report" },
  { key: "upload", icon: "file-text", label: "PDF / text", sub: "Lab report, discharge" },
  { key: "whatsapp", icon: "message-circle", label: "From WhatsApp", sub: "Forwarded text" },
  { key: "audio", icon: "mic", label: "Voice note", sub: "Doctor conversation" },
];

interface PickedImage {
  uri: string;
  base64: string;
  mimeType: string;
  fileName: string;
  size: number;
}

function statusOf(value: number, low?: number, high?: number): LabValue["status"] {
  if (low !== undefined && value < low) return "LOW";
  if (high !== undefined) {
    if (value > high * 1.5) return "CRITICAL";
    if (value > high) return "HIGH";
  }
  return "NORMAL";
}

export default function UploadScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addDocument } = useHealth();

  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState<DocSource>("camera");
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [result, setResult] = useState<(ExtractionResponse & { savedObjectPath?: string }) | null>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomPad = Platform.OS === "web" ? 110 : 100;

  const reset = () => {
    setPicked(null);
    setResult(null);
    setUploadProgress(null);
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access to pick a report.");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.85,
    });
    handlePickerResult(r);
  };

  const captureWithCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow camera access to snap a report.");
      return;
    }
    const r = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.85,
    });
    handlePickerResult(r);
  };

  const handlePickerResult = (r: ImagePicker.ImagePickerResult) => {
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    if (!a.base64 || !a.uri) {
      Alert.alert("Could not read image", "Please pick another image.");
      return;
    }
    setPicked({
      uri: a.uri,
      base64: a.base64,
      mimeType: a.mimeType || "image/jpeg",
      fileName: a.fileName || `scan-${Date.now()}.jpg`,
      size: a.fileSize || 0,
    });
    setResult(null);
  };

  const uploadImageToStorage = async (img: PickedImage): Promise<string | null> => {
    try {
      setUploadProgress("Securing upload...");
      const { uploadURL, objectPath } = await storageApi.requestUploadUrl({
        name: img.fileName,
        size: img.size,
        contentType: img.mimeType,
      });
      setUploadProgress("Uploading to private storage...");
      const blob =
        Platform.OS === "web"
          ? await (await fetch(img.uri)).blob()
          : await (await fetch(`data:${img.mimeType};base64,${img.base64}`)).blob();
      const put = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": img.mimeType },
        body: blob,
      });
      if (!put.ok) {
        throw new Error(`Upload failed (${put.status})`);
      }
      return objectPath;
    } catch (err) {
      console.warn("upload failed", err);
      setUploadProgress(null);
      return null;
    }
  };

  const handleExtract = async () => {
    if (!picked && !text.trim()) {
      Alert.alert("Nothing to extract", "Snap or pick a report image, or paste some text.");
      return;
    }

    setProcessing(true);
    setResult(null);
    setUploadProgress(null);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      let savedObjectPath: string | undefined = undefined;
      let extracted: ExtractionResponse;

      if (picked) {
        savedObjectPath = (await uploadImageToStorage(picked)) ?? undefined;
        setUploadProgress("Asking AI to read the report...");
        extracted = await extractApi.fromImageBase64(picked.base64, picked.mimeType);
      } else {
        setUploadProgress("Asking AI to read the text...");
        extracted = await extractApi.fromText(text);
      }

      setResult({ ...extracted, savedObjectPath });
      setUploadProgress(null);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      Alert.alert("Extraction failed", (err as Error).message);
      setUploadProgress(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    const finalTitle = title.trim() || result.summary?.slice(0, 60) || "Untitled report";
    const labs: LabValue[] = result.labs.map((l) => ({
      ...l,
      status: statusOf(l.value, l.referenceLow, l.referenceHigh),
    }));
    const meds: Medication[] = result.medications.map((m) => ({
      ...m,
      active: m.active ?? true,
    }));

    const localId = `doc-${Date.now().toString(36)}`;
    const doc: HealthDocument = {
      id: localId,
      title: finalTitle,
      source,
      status: "completed",
      uploadedAt: new Date().toISOString(),
      rawText: picked ? `[Image] ${picked.fileName}` : text,
      extractedLabs: labs,
      extractedMeds: meds,
      extractedDiagnoses: result.diagnoses,
      language: (result.language as HealthDocument["language"]) || "english",
      confidence: result.confidence,
    };

    await addDocument(doc);

    // Persist to server (best-effort)
    try {
      await documentsApi.create({
        title: finalTitle,
        source,
        objectPath: result.savedObjectPath ?? null,
        mimeType: picked?.mimeType ?? null,
        rawText: picked ? null : text,
        extractedLabs: labs,
        extractedMeds: meds,
        extractedDiagnoses: result.diagnoses,
        language: result.language,
        confidence: result.confidence,
        provider: result.provider,
      });
    } catch (err) {
      console.warn("server doc save failed", err);
    }

    setText("");
    setTitle("");
    reset();
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.push("/timeline");
  };

  const showImagePicker = source === "camera" || source === "upload";
  const showTextArea = source === "whatsapp" || source === "audio" || (!picked && source !== "camera");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 + webTopInset }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Add to memory</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Snap a report — real AI reads labs, meds, diagnoses
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
                onPress={() => {
                  setSource(s.key);
                  reset();
                }}
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

        {showImagePicker ? (
          <View style={{ marginTop: 14 }}>
            {picked ? (
              <View style={[styles.preview, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Image source={{ uri: picked.uri }} style={styles.previewImg} resizeMode="cover" />
                <Pressable
                  onPress={() => setPicked(null)}
                  style={[styles.removeBtn, { backgroundColor: colors.background }]}
                >
                  <Feather name="x" size={16} color={colors.foreground} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.pickRow}>
                <Pressable
                  onPress={captureWithCamera}
                  style={[styles.pickBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
                  <Feather name="camera" size={18} color={colors.primary} />
                  <Text style={[styles.pickLabel, { color: colors.foreground }]}>Open camera</Text>
                </Pressable>
                <Pressable
                  onPress={pickFromLibrary}
                  style={[styles.pickBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
                  <Feather name="image" size={18} color={colors.primary} />
                  <Text style={[styles.pickLabel, { color: colors.foreground }]}>From gallery</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : null}

        {(showTextArea && !picked) ? (
          <>
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
          </>
        ) : null}

        {picked ? (
          <>
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
          </>
        ) : null}

        <View style={{ marginTop: 16 }}>
          <PrimaryButton
            label={processing ? (uploadProgress ?? "Extracting...") : "Extract with AI"}
            icon="zap"
            onPress={handleExtract}
            loading={processing}
          />
        </View>

        {processing && uploadProgress ? (
          <View style={styles.progressRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
              {uploadProgress}
            </Text>
          </View>
        ) : null}

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

            {result.summary ? (
              <Text style={[styles.summary, { color: colors.foreground }]}>
                {result.summary}
              </Text>
            ) : null}
            <Text style={[styles.providerLine, { color: colors.mutedForeground }]}>
              Read by {result.provider} · {result.model}
            </Text>

            <ResultBlock label="Lab values" count={result.labs.length}>
              {result.labs.map((l) => (
                <Text key={l.id} style={[styles.resultLine, { color: colors.foreground }]}>
                  {l.name}: <Text style={{ fontFamily: "Inter_700Bold" }}>{l.value} {l.unit}</Text>
                  <Text style={{ color: colors.mutedForeground }}>  ({String(l.status).toLowerCase()})</Text>
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
  pickRow: { flexDirection: "row", gap: 10 },
  pickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pickLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  preview: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    position: "relative",
  },
  previewImg: { width: "100%", height: 240 },
  removeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
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
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    justifyContent: "center",
  },
  progressText: { fontFamily: "Inter_400Regular", fontSize: 12 },
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
  summary: { fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 19, marginTop: 6 },
  providerLine: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 4, fontStyle: "italic" },
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
