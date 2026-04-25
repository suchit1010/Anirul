import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);

  const sendCode = async () => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 8) {
      Alert.alert("Phone needed", "Enter your mobile number with country code.");
      return;
    }
    setBusy(true);
    setHint(null);
    setDemoCode(null);
    try {
      const r = await authApi.start(phone);
      setNormalizedPhone(r.phone);
      setStep("code");
      if (!r.smsConfigured && r.demoCode) {
        setDemoCode(r.demoCode);
        setHint(`SMS isn't configured yet — using demo code ${r.demoCode}.`);
      } else {
        setHint(`Code sent to ${r.phone}.`);
      }
    } catch (err) {
      Alert.alert("Could not send code", (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (code.trim().length < 4) {
      Alert.alert("Enter the code", "Enter the 6-digit code from the SMS.");
      return;
    }
    setBusy(true);
    try {
      const r = await authApi.verify(normalizedPhone || phone, code.trim());
      await signIn(r.token, r.user);
      router.replace("/");
    } catch (err) {
      Alert.alert("Could not sign in", (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.brandDot, { backgroundColor: colors.primary }]}>
          <Feather name="activity" size={22} color="#fff" />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>SwasthAI</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Your private health memory.{"\n"}Sign in with your mobile number.
        </Text>

        {step === "phone" ? (
          <View style={styles.card}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Mobile number</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              autoComplete="tel"
              style={[
                styles.input,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
              ]}
            />
            <Pressable
              onPress={sendCode}
              disabled={busy}
              style={[styles.cta, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={styles.ctaText}>Send code</Text>
                </>
              )}
            </Pressable>
            <Text style={[styles.smallNote, { color: colors.mutedForeground }]}>
              We send a one-time code over SMS. We never share your number with anyone — ever.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Code sent to {normalizedPhone}
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="6-digit code"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={[
                styles.input,
                styles.codeInput,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
              ]}
            />
            {demoCode ? (
              <Pressable onPress={() => setCode(demoCode)} style={styles.demoChip}>
                <Feather name="zap" size={12} color={colors.primary} />
                <Text style={[styles.demoChipText, { color: colors.primary }]}>
                  Tap to use demo code {demoCode}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={verify}
              disabled={busy}
              style={[styles.cta, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.ctaText}>Verify and continue</Text>
                </>
              )}
            </Pressable>
            <Pressable onPress={() => setStep("phone")} style={styles.linkButton}>
              <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
                Use a different number
              </Text>
            </Pressable>
          </View>
        )}

        {hint ? (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>{hint}</Text>
        ) : null}

        <View style={[styles.legalRow]}>
          <Feather name="lock" size={12} color={colors.mutedForeground} />
          <Text style={[styles.legalText, { color: colors.mutedForeground }]}>
            ABHA-aligned. End-to-end private. You own your data.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, gap: 16 },
  brandDot: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 36,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  card: {
    gap: 12,
    marginBottom: 8,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
  },
  codeInput: {
    letterSpacing: 6,
    textAlign: "center",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  ctaText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  smallNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  demoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "rgba(13,61,42,0.08)",
  },
  demoChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  linkText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
    justifyContent: "center",
  },
  legalText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
});
