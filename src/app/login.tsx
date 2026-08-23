import { Stack } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AnimatedPressable } from "@/components/animated-pressable";
import { GlassSurface } from "@/components/glass-surface";
import { Icon } from "@/components/icon";
import { ScreenShell } from "@/components/screen-shell";
import { ServerSettingsModal } from "@/components/server-settings-modal";
import { Fonts, Palette, Radii } from "@/constants/theme";
import { useSession } from "@/contexts/auth-context";
import { ApiError } from "@/services/api-client";
import { haptics } from "@/utils/haptics";

const CODE_LENGTH = 6;
const NON_DIGIT_PATTERN = /\D/g;

function CodeInput({
  value,
  onChangeText,
  onSubmitEditing,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
}) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const focusInput = useCallback(() => inputRef.current?.focus(), []);
  const handleFocus = useCallback(() => setFocused(true), []);
  const handleBlur = useCallback(() => setFocused(false), []);
  const handleChangeText = useCallback(
    (text: string) => {
      onChangeText(text.replace(NON_DIGIT_PATTERN, "").slice(0, CODE_LENGTH));
    },
    [onChangeText]
  );

  return (
    <View style={styles.codeWrap}>
      <AnimatedPressable
        accessibilityElementsHidden
        accessibilityRole="none"
        importantForAccessibility="no-hide-descendants"
        onPress={focusInput}
        style={styles.codeBoxes}
      >
        {Array.from({ length: CODE_LENGTH }, (_, index) => {
          const digit = value[index];
          const isActive = focused && index === value.length;
          return (
            <View
              key={`code-box-${
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length digit slots, never reordered
                index
              }`}
              style={[
                styles.codeBox,
                (digit || isActive) && styles.codeBoxFilled,
              ]}
            >
              <Text style={styles.codeDigit}>{digit ?? ""}</Text>
            </View>
          );
        })}
      </AnimatedPressable>
      <TextInput
        accessibilityLabel="6-digit code"
        autoComplete="one-time-code"
        autoFocus
        caretHidden
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        onBlur={handleBlur}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onSubmitEditing={onSubmitEditing}
        ref={inputRef}
        returnKeyType="done"
        style={styles.codeHiddenInput}
        textContentType="oneTimeCode"
        value={value}
      />
    </View>
  );
}

type Step = "email" | "code";

export default function LoginScreen() {
  const { requestCode, verifyCode } = useSession();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);

  const handleRequestCode = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed || isSubmitting) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    Keyboard.dismiss();
    try {
      await requestCode(trimmed);
      setStep("code");
      haptics.success();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Could not send the code. Try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [email, isSubmitting, requestCode]);

  const handleVerifyCode = useCallback(async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 6 || isSubmitting) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    Keyboard.dismiss();
    try {
      await verifyCode(email.trim(), trimmed);
      haptics.success();
    } catch (verifyError) {
      setError(
        verifyError instanceof ApiError
          ? verifyError.message
          : "Invalid or expired code."
      );
      haptics.warning();
    } finally {
      setIsSubmitting(false);
    }
  }, [code, email, isSubmitting, verifyCode]);

  const handleRequestCodePress = useCallback(() => {
    void handleRequestCode();
  }, [handleRequestCode]);

  const handleVerifyCodePress = useCallback(() => {
    void handleVerifyCode();
  }, [handleVerifyCode]);

  const handleSubmitPress = useCallback(() => {
    void (step === "email" ? handleRequestCode() : handleVerifyCode());
  }, [step, handleRequestCode, handleVerifyCode]);

  const handleUseDifferentEmail = useCallback(() => {
    setStep("email");
    setCode("");
    setError(null);
  }, []);

  const openServerSettings = useCallback(() => setServerSettingsOpen(true), []);
  const closeServerSettings = useCallback(
    () => setServerSettingsOpen(false),
    []
  );

  return (
    <ScreenShell>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <AnimatedPressable
          accessibilityLabel="Server settings"
          accessibilityRole="button"
          onPress={openServerSettings}
          style={styles.serverButton}
        >
          <GlassSurface isInteractive style={styles.serverButtonHit}>
            <Icon color={Palette.muted} name="gear" size={17} />
          </GlassSurface>
        </AnimatedPressable>

        <View style={styles.page}>
          <Text style={styles.eyebrow}>WINE CELLAR</Text>
          <Text style={styles.title}>
            {step === "email" ? "Sign in with email." : "Check your inbox."}
          </Text>
          <Text style={styles.subtitle}>
            {step === "email"
              ? "We'll email you a one-time code — no password needed."
              : `Enter the 6-digit code we sent to ${email.trim()}.`}
          </Text>

          {step === "email" ? (
            <GlassSurface style={styles.field}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                autoFocus
                keyboardType="email-address"
                onChangeText={setEmail}
                onSubmitEditing={handleRequestCodePress}
                placeholder="you@email.com"
                placeholderTextColor={Palette.muted}
                returnKeyType="send"
                style={styles.fieldInput}
                value={email}
              />
            </GlassSurface>
          ) : (
            <CodeInput
              onChangeText={setCode}
              onSubmitEditing={handleVerifyCodePress}
              value={code}
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <AnimatedPressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={handleSubmitPress}
          >
            <GlassSurface
              isInteractive
              style={styles.primaryButton}
              tintColor={Palette.wine}
            >
              <Text style={styles.primaryButtonText}>
                {step === "email" ? "Send code" : "Verify"}
              </Text>
              <Icon color={Palette.white} name="arrowRight" size={18} />
            </GlassSurface>
          </AnimatedPressable>

          {step === "code" ? (
            <AnimatedPressable
              accessibilityRole="button"
              onPress={handleUseDifferentEmail}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                Use a different email
              </Text>
            </AnimatedPressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
      <ServerSettingsModal
        onClose={closeServerSettings}
        visible={serverSettingsOpen}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  codeBox: {
    alignItems: "center",
    backgroundColor: Palette.white,
    borderColor: Palette.separator,
    borderRadius: 14,
    borderWidth: 1.5,
    height: 52,
    justifyContent: "center",
    width: 44,
  },
  codeBoxes: { flexDirection: "row", gap: 8, justifyContent: "center" },
  codeBoxFilled: { borderColor: Palette.wine },
  codeDigit: { color: Palette.ink, fontSize: 20, fontWeight: "700" },
  codeHiddenInput: {
    ...StyleSheet.absoluteFill,
    color: "transparent",
    opacity: 0,
  },
  codeWrap: { position: "relative" },
  error: { color: Palette.wine, fontSize: 13, marginTop: 4 },
  eyebrow: {
    color: Palette.plum,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.1,
  },
  field: {
    borderRadius: 22,
    paddingBottom: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  fieldInput: { color: Palette.ink, fontSize: 17, paddingVertical: 6 },
  fieldLabel: {
    color: Palette.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  flex: { flex: 1, justifyContent: "center" },
  page: {
    alignSelf: "center",
    gap: 16,
    maxWidth: 420,
    paddingHorizontal: 24,
    width: "100%",
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 21,
  },
  primaryButtonText: { color: Palette.white, fontSize: 14, fontWeight: "700" },
  secondaryButton: { alignItems: "center", paddingVertical: 8 },
  secondaryButtonText: {
    color: Palette.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  serverButton: { position: "absolute", right: 20, top: 20 },
  serverButtonHit: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  subtitle: { color: Palette.muted, fontSize: 14, lineHeight: 21 },
  title: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 34,
    fontWeight: "600",
    letterSpacing: -1,
    lineHeight: 40,
  },
});
