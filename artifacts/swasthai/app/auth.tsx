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
  const [hintType, setHintType] = useState<"info" | "success" | "error">("info");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  const sendCode = async () => {
    setPhoneError(null);
    const cleaned = phone.replace(/\D/g, "");
    if (!cleaned) {
      setPhoneError("Enter your phone number");
      return;
    }
    if (cleaned.length < 8) {
      setPhoneError("Enter at least 8 digits (with country code)");
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
        setHintType("info");
        setHint(`Demo: Tap the button below to use code ${r.demoCode}`);
      } else {
        setHintType("success");
        setHint(`Code sent to ${r.phone}. Check SMS.`);
      }
    } catch (err) {
      setPhoneError((err as Error).message || "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setCodeError(null);
    if (!code.trim()) {
      setCodeError("Enter the 6-digit code");
      return;
    }
    if (code.trim().length < 4) {
      setCodeError("Code must be at least 4 digits");
      return;
    }
    setBusy(true);
    try {
      const r = await authApi.verify(normalizedPhone || phone, code.trim());
      await signIn(r.token, r.user);
      router.replace("/");
    } catch (err) {
      setCodeError((err as Error).message || "Verification failed");
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
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.brandDot, { backgroundColor: colors.primary }]}>
            <Feather name="activity" size={24} color="#fff" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>SwasthAI</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Your private health memory
          </Text>
        </View>

        {/* Content */}
        {step === "phone" ? (
          <View style={styles.form}>
            <View style={styles.stepIndicator}>
              <View style={[styles.step, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
              <View style={[styles.step, { backgroundColor: colors.border }]}>
                <Text style={[styles.stepNumber, { color: colors.mutedForeground }]}>2</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Enter your mobile number
            </Text>
            <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
              We'll send you a secure code to verify it's really you.
            </Text>

            <View style={styles.inputWrapper}>
              <View style={[styles.inputContainer, { borderColor: phoneError ? colors.destructive : colors.border, backgroundColor: colors.card }]}>
                <Feather name="phone" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  value={phone}
                  onChangeText={(val) => {
                    setPhone(val);
                    setPhoneError(null);
                  }}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  editable={!busy}
                  style={[
                    styles.input,
                    { color: colors.foreground },
                  ]}
                />
              </View>
              {phoneError ? (
                <View style={styles.errorContainer}>
                  <Feather name="alert-circle" size={12} color={colors.destructive} />
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{phoneError}</Text>
                </View>
              ) : null}
            </View>

            <Pressable
              onPress={sendCode}
              disabled={busy || !phone.trim()}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: colors.primary,
                  opacity: busy || !phone.trim() ? 0.5 : pressed ? 0.9 : 1,
                },
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={styles.ctaText}>Send secure code</Text>
                </>
              )}
            </Pressable>

            <Text style={[styles.note, { color: colors.mutedForeground }]}>
              A one-time code will be sent via SMS. Never shared. No ads, no tracking.
            </Text>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.stepIndicator}>
              <View style={[styles.step, { backgroundColor: colors.primary }]}>
                <Feather name="check" size={14} color="#fff" />
              </View>
              <View style={[styles.stepLine, { backgroundColor: colors.primary }]} />
              <View style={[styles.step, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Verify your code
            </Text>
            <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
              Enter the 6-digit code sent to{"\n"}
              <Text style={{ fontFamily: "Inter_600SemiBold" }}>{normalizedPhone}</Text>
            </Text>

            <View style={styles.inputWrapper}>
              <View style={[styles.inputContainer, { borderColor: codeError ? colors.destructive : colors.border, backgroundColor: colors.card }]}>
                <Feather name="shield" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  value={code}
                  onChangeText={(val) => {
                    setCode(val.replace(/[^0-9]/g, ""));
                    setCodeError(null);
                  }}
                  placeholder="000000"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  editable={!busy}
                  style={[
                    styles.codeInput,
                    { color: colors.foreground },
                  ]}
                />
              </View>
              {codeError ? (
                <View style={styles.errorContainer}>
                  <Feather name="alert-circle" size={12} color={colors.destructive} />
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{codeError}</Text>
                </View>
              ) : null}
            </View>

            {demoCode ? (
              <Pressable 
                onPress={() => setCode(demoCode)} 
                style={({ pressed }) => [
                  styles.demoChip,
                  { backgroundColor: colors.primaryPale, opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <Feather name="zap" size={14} color={colors.primary} />
                <Text style={[styles.demoChipText, { color: colors.primary }]}>
                  Demo: Use code {demoCode}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={verify}
              disabled={busy || code.length < 4}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: colors.primary,
                  opacity: busy || code.length < 4 ? 0.5 : pressed ? 0.9 : 1,
                },
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="check-circle" size={16} color="#fff" />
                  <Text style={styles.ctaText}>Verify and sign in</Text>
                </>
              )}
            </Pressable>

            <Pressable 
              onPress={() => { setStep("phone"); setPhone(""); setCode(""); setPhoneError(null); setCodeError(null); }} 
              disabled={busy}
              style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="arrow-left" size={14} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                Use a different number
              </Text>
            </Pressable>
          </View>
        )}

        {/* Messages */}
        {hint ? (
          <View style={[
            styles.messageBox,
            {
              backgroundColor: hintType === "success" ? colors.primaryPale : colors.card,
              borderColor: hintType === "success" ? colors.primary : colors.border,
            }
          ]}>
            <Feather 
              name={hintType === "success" ? "check-circle" : "info"} 
              size={14} 
              color={hintType === "success" ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.messageText, { color: hintType === "success" ? colors.primary : colors.mutedForeground }]}>
              {hint}
            </Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.securityBadge}>
            <Feather name="lock" size={12} color={colors.primary} />
            <Text style={[styles.securityText, { color: colors.mutedForeground }]}>
              ABHA-aligned • End-to-end encrypted • You own your data
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 0 },
  header: { alignItems: "center", marginBottom: 32, marginTop: 8 },
  brandDot: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 32,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },

  form: { gap: 24, marginBottom: 24 },

  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  stepLine: {
    height: 2,
    flex: 1,
    maxWidth: 30,
  },

  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  sectionDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },

  inputWrapper: { gap: 8, marginBottom: 8 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    height: 50,
    gap: 10,
  },
  inputIcon: { width: 16, height: 16 },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    paddingVertical: 12,
  },
  codeInput: {
    letterSpacing: 8,
    fontFamily: "Inter_600SemiBold",
    fontSize: 24,
  },

  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },

  demoChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  demoChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    marginVertical: 8,
  },
  ctaText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },

  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  linkText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },

  note: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 4,
  },

  messageBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  messageText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },

  footer: { marginBottom: 8 },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  securityText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
});
