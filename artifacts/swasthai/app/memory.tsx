import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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
import { useHealth } from "@/contexts/HealthContext";
import { useColors } from "@/hooks/useColors";
import { SUGGESTED_PROMPTS } from "@/lib/answerEngine";

export default function MemoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, sendMessage, clearMessages } = useHealth();
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [state.messages.length, thinking]);

  const send = async (raw?: string) => {
    const value = (raw ?? text).trim();
    if (!value || thinking) return;
    setText("");
    setThinking(true);
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    await new Promise((r) => setTimeout(r, 450));
    await sendMessage(value);
    setThinking(false);
  };

  const onClear = () => {
    Alert.alert("Clear conversation?", "Your health data stays. Only the chat history is reset.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => clearMessages() },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.head,
          { backgroundColor: colors.primary, paddingTop: insets.top + 14 },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headBtn}>
          <Feather name="x" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headTitle}>{AI_NAME}</Text>
          <Text style={styles.headSub}>Your private health memory</Text>
        </View>
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
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 12,
          }}
        >
          {state.messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.bubbleWrap,
                { alignSelf: m.role === "user" ? "flex-end" : "flex-start" },
              ]}
            >
              {m.role === "assistant" ? (
                <View style={styles.aiRow}>
                  <View style={[styles.aiAvatar, { backgroundColor: colors.primary }]}>
                    <Feather name="activity" size={11} color="#fff" />
                  </View>
                  <Text style={[styles.aiName, { color: colors.mutedForeground }]}>{AI_NAME}</Text>
                </View>
              ) : null}
              <View
                style={[
                  styles.bubble,
                  m.role === "user"
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    { color: m.role === "user" ? "#fff" : colors.foreground },
                  ]}
                >
                  {m.text}
                </Text>
              </View>
            </View>
          ))}
          {thinking ? (
            <View style={[styles.bubbleWrap, { alignSelf: "flex-start" }]}>
              <View style={styles.aiRow}>
                <View style={[styles.aiAvatar, { backgroundColor: colors.primary }]}>
                  <Feather name="activity" size={11} color="#fff" />
                </View>
                <Text style={[styles.aiName, { color: colors.mutedForeground }]}>{AI_NAME} is thinking…</Text>
              </View>
              <View
                style={[
                  styles.bubble,
                  { backgroundColor: colors.card, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
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
                style={[styles.suggestion, { backgroundColor: colors.primaryPale, borderColor: colors.primarySoft }]}
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
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`Ask ${AI_NAME} about your health…`}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
            multiline
            onSubmitEditing={() => send()}
          />
          <Pressable
            onPress={() => send()}
            disabled={!text.trim() || thinking}
            style={[
              styles.sendBtn,
              {
                backgroundColor: text.trim() ? colors.primary : colors.muted,
                opacity: thinking ? 0.5 : 1,
              },
            ]}
          >
            <Feather name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headTitle: { color: "#fff", fontFamily: "DMSerifDisplay_400Regular", fontSize: 18 },
  headSub: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  bubbleWrap: { maxWidth: "85%", marginBottom: 14 },
  aiRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4, marginLeft: 2 },
  aiAvatar: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
  },
  aiName: { fontFamily: "Inter_500Medium", fontSize: 11 },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, opacity: 0.6 },
  suggestion: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
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
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
});
