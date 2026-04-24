import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AI_NAME } from "@/constants/brand";
import { LANGUAGES, getLanguageInfo } from "@/constants/languages";
import { useHealth } from "@/contexts/HealthContext";
import { useColors } from "@/hooks/useColors";
import { SUGGESTED_PROMPTS } from "@/lib/answerEngine";
import { transcribeAudio, ttsUrl } from "@/lib/swasthaiAPI";
import {
  type ActiveRecorder,
  playUrl,
  startRecording,
  stopPlayback,
  voiceSupport,
} from "@/lib/voice";
import type { ChatMessage } from "@/types/health";

const PROVIDER_BADGE: Record<NonNullable<ChatMessage["provider"]>, string> = {
  openai: "GPT",
  anthropic: "Claude",
  gemini: "Gemini",
  local: "Memory",
};

export default function MemoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, sendMessage, clearMessages, setLanguage, setVoiceAutoplay } =
    useHealth();
  const lang = getLanguageInfo(state.prefs.language);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [recorder, setRecorder] = useState<ActiveRecorder | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const support = voiceSupport();

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [state.messages.length, thinking, transcribing]);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  const speak = async (id: string, content: string) => {
    if (!content) return;
    if (speakingId) {
      stopPlayback();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(id);
    try {
      const url = await ttsUrl(content);
      playUrl(url, () => setSpeakingId(null));
    } catch {
      setSpeakingId(null);
      Alert.alert("Voice unavailable", "Could not play audio right now.");
    }
  };

  const send = async (raw?: string) => {
    const value = (raw ?? text).trim();
    if (!value || thinking) return;
    setText("");
    setThinking(true);
    if (Platform.OS !== "web") Haptics.selectionAsync();
    const reply = await sendMessage(value);
    setThinking(false);
    if (state.prefs.voiceAutoplay && reply.text) {
      void speak(reply.id, reply.text);
    }
  };

  const onMicPress = async () => {
    if (support !== "full") {
      Alert.alert(
        "Voice input",
        "Microphone is available in the web preview. On mobile, it'll be enabled in the next build.",
      );
      return;
    }
    if (recorder) {
      try {
        const { blob, mime } = await recorder.stop();
        setRecorder(null);
        setTranscribing(true);
        const transcript = await transcribeAudio({
          blob,
          mime,
          language: state.prefs.language,
        });
        setTranscribing(false);
        if (transcript.trim()) {
          await send(transcript.trim());
        }
      } catch {
        setRecorder(null);
        setTranscribing(false);
        Alert.alert("Mic error", "Could not capture audio. Try again.");
      }
      return;
    }
    try {
      const r = await startRecording();
      setRecorder(r);
      if (Platform.OS !== "web") Haptics.selectionAsync();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Microphone permission denied.";
      Alert.alert("Mic blocked", msg);
    }
  };

  const onClear = () => {
    Alert.alert(
      "Clear conversation?",
      "Your health data stays. Only the chat history is reset.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: () => clearMessages() },
      ],
    );
  };

  const recording = recorder !== null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[styles.head, { backgroundColor: colors.primary, paddingTop: insets.top + 14 }]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headBtn}>
          <Feather name="x" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headTitle}>{AI_NAME}</Text>
          <Text style={styles.headSub}>Your private health memory</Text>
        </View>
        <Pressable
          onPress={() => setLangOpen(true)}
          hitSlop={12}
          style={[styles.headBtn, { width: "auto", paddingHorizontal: 10 }]}
        >
          <Text style={styles.langBadge}>{lang.native}</Text>
        </Pressable>
        <Pressable
          onPress={() => setVoiceAutoplay(!state.prefs.voiceAutoplay)}
          hitSlop={12}
          style={[
            styles.headBtn,
            state.prefs.voiceAutoplay ? { backgroundColor: "rgba(255,255,255,0.28)" } : null,
          ]}
        >
          <Feather
            name={state.prefs.voiceAutoplay ? "volume-2" : "volume-x"}
            size={18}
            color="#fff"
          />
        </Pressable>
        <Pressable onPress={onClear} hitSlop={12} style={styles.headBtn}>
          <Feather name="rotate-ccw" size={18} color="#fff" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 12 }}
        >
          {state.messages.map((m) => {
            const isAi = m.role === "assistant";
            const badge = m.provider ? PROVIDER_BADGE[m.provider] : null;
            return (
              <View
                key={m.id}
                style={[styles.bubbleWrap, { alignSelf: isAi ? "flex-start" : "flex-end" }]}
              >
                {isAi ? (
                  <View style={styles.aiRow}>
                    <View style={[styles.aiAvatar, { backgroundColor: colors.primary }]}>
                      <Feather name="activity" size={11} color="#fff" />
                    </View>
                    <Text style={[styles.aiName, { color: colors.mutedForeground }]}>
                      {AI_NAME}
                    </Text>
                    {badge ? (
                      <View style={[styles.providerPill, { backgroundColor: colors.primaryPale }]}>
                        <Text style={[styles.providerPillText, { color: colors.primary }]}>
                          {badge}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
                <View
                  style={[
                    styles.bubble,
                    isAi
                      ? {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          borderWidth: StyleSheet.hairlineWidth,
                        }
                      : { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      { color: isAi ? colors.foreground : "#fff" },
                    ]}
                  >
                    {m.text}
                  </Text>
                  {isAi && m.text ? (
                    <Pressable
                      onPress={() => speak(m.id, m.text)}
                      style={styles.speakBtn}
                      hitSlop={10}
                    >
                      <Feather
                        name={speakingId === m.id ? "stop-circle" : "volume-2"}
                        size={14}
                        color={colors.primary}
                      />
                      <Text style={[styles.speakText, { color: colors.primary }]}>
                        {speakingId === m.id ? "Stop" : "Listen"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
          {transcribing ? (
            <View style={[styles.bubbleWrap, { alignSelf: "flex-end" }]}>
              <View style={[styles.bubble, { backgroundColor: colors.muted }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={[styles.bubbleText, { color: colors.mutedForeground }]}>
                    Transcribing…
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
          {thinking ? (
            <View style={[styles.bubbleWrap, { alignSelf: "flex-start" }]}>
              <View style={styles.aiRow}>
                <View style={[styles.aiAvatar, { backgroundColor: colors.primary }]}>
                  <Feather name="activity" size={11} color="#fff" />
                </View>
                <Text style={[styles.aiName, { color: colors.mutedForeground }]}>
                  {AI_NAME} is thinking…
                </Text>
              </View>
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <View style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
                  <View style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
                  <View style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {state.messages.length <= 2 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingBottom: 8 }}
          >
            {SUGGESTED_PROMPTS.map((p) => (
              <Pressable
                key={p}
                onPress={() => send(p)}
                style={[
                  styles.suggestion,
                  { backgroundColor: colors.primaryPale, borderColor: colors.primarySoft },
                ]}
              >
                <Text style={[styles.suggestionText, { color: colors.primary }]}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View
          style={[
            styles.composer,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <Pressable
            onPress={onMicPress}
            disabled={transcribing || thinking}
            style={[
              styles.micBtn,
              {
                backgroundColor: recording ? colors.destructive : colors.primaryPale,
                borderColor: recording ? colors.destructive : colors.primarySoft,
                opacity: transcribing || thinking ? 0.5 : 1,
              },
            ]}
          >
            {recording ? (
              <View style={styles.recordingDot} />
            ) : (
              <Feather name="mic" size={18} color={colors.primary} />
            )}
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={recording ? "Recording… tap mic to stop" : lang.inputPlaceholder}
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                color: colors.foreground,
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
            multiline
            editable={!recording}
            onSubmitEditing={() => send()}
          />
          <Pressable
            onPress={() => send()}
            disabled={!text.trim() || thinking || recording}
            style={[
              styles.sendBtn,
              {
                backgroundColor: text.trim() && !recording ? colors.primary : colors.muted,
                opacity: thinking ? 0.5 : 1,
              },
            ]}
          >
            <Feather name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={langOpen} animationType="slide" onRequestClose={() => setLangOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
          <View style={styles.modalHead}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Choose language</Text>
            <Pressable onPress={() => setLangOpen(false)} hitSlop={12}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {LANGUAGES.map((l) => {
              const selected = l.code === state.prefs.language;
              return (
                <Pressable
                  key={l.code}
                  onPress={async () => {
                    await setLanguage(l.code);
                    setLangOpen(false);
                  }}
                  style={[
                    styles.langRow,
                    {
                      backgroundColor: selected ? colors.primaryPale : colors.card,
                      borderColor: selected ? colors.primarySoft : colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.langNative,
                        { color: selected ? colors.primary : colors.foreground },
                      ]}
                    >
                      {l.native}
                    </Text>
                    <Text style={[styles.langLabel, { color: colors.mutedForeground }]}>
                      {l.label} · {l.greet}
                    </Text>
                  </View>
                  {selected ? <Feather name="check" size={18} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headBtn: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 0,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  langBadge: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  headTitle: { color: "#fff", fontFamily: "DMSerifDisplay_400Regular", fontSize: 18 },
  headSub: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 1,
  },
  bubbleWrap: { maxWidth: "85%", marginBottom: 14 },
  aiRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4, marginLeft: 2 },
  aiAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  aiName: { fontFamily: "Inter_500Medium", fontSize: 11 },
  providerPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  providerPillText: { fontFamily: "Inter_600SemiBold", fontSize: 9, letterSpacing: 0.4 },
  bubble: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  speakBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  speakText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  dot: { width: 6, height: 6, borderRadius: 3, opacity: 0.6 },
  suggestion: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  suggestionText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#fff" },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalTitle: { fontFamily: "DMSerifDisplay_400Regular", fontSize: 22 },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  langNative: { fontFamily: "Inter_700Bold", fontSize: 16 },
  langLabel: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
});
