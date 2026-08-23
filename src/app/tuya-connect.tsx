import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated from "react-native-reanimated";

import { AnimatedPressable } from "@/components/animated-pressable";
import { GlassSurface } from "@/components/glass-surface";
import { Icon } from "@/components/icon";
import { ScreenShell } from "@/components/screen-shell";
import { Fonts, Palette, Radii, Shadows } from "@/constants/theme";
import { useFocusScale } from "@/hooks/use-focus-scale";
import { useScrollToTopOnNavigate } from "@/hooks/use-scroll-to-top";
import {
  clearTuyaCredentials,
  getTuyaConnectionStatus,
  isTuyaConnected,
  saveTuyaCredentials,
  testTuyaCredentials,
} from "@/services/tuya-connection";
import {
  type TuyaCredentialsInput,
  type TuyaRegion,
  TuyaRegionLabels,
} from "@/types/tuya";
import { confirmDelete } from "@/utils/confirm-delete";
import { haptics } from "@/utils/haptics";

const REGIONS: TuyaRegion[] = ["us", "eu", "cn", "in"];

function connectButtonLabel(testing: boolean, connected: boolean) {
  if (testing) {
    return "Testing…";
  }
  return connected ? "Reconnect" : "Connect";
}

function RegionPill({
  option,
  active,
  onSelect,
}: {
  option: TuyaRegion;
  active: boolean;
  onSelect: (region: TuyaRegion) => void;
}) {
  const handlePress = useCallback(() => onSelect(option), [onSelect, option]);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={handlePress}
      scaleTo={0.94}
      style={styles.regionPillWrap}
    >
      <GlassSurface
        isInteractive
        style={styles.regionPill}
        tintColor={active ? Palette.wine : undefined}
      >
        <Text
          style={[styles.regionPillText, active && styles.regionPillTextActive]}
        >
          {TuyaRegionLabels[option]}
        </Text>
      </GlassSurface>
    </AnimatedPressable>
  );
}

export default function TuyaConnectScreen() {
  const router = useRouter();
  const scrollRef = useScrollToTopOnNavigate();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [region, setRegion] = useState<TuyaRegion>("us");
  const [secretVisible, setSecretVisible] = useState(false);
  const [connected, setConnected] = useState(false);
  const [saved, setSaved] = useState<{
    clientId: string;
    deviceId: string;
    region: TuyaRegion;
  }>({ clientId: "", deviceId: "", region: "us" });
  const [testing, setTesting] = useState(false);
  const hasChanges =
    clientId.trim() !== saved.clientId ||
    deviceId.trim() !== saved.deviceId ||
    region !== saved.region ||
    clientSecret.trim().length > 0;
  const secretInputRef = useRef<TextInput>(null);
  const deviceIdInputRef = useRef<TextInput>(null);
  const clientIdFocus = useFocusScale();
  const secretFocus = useFocusScale();
  const deviceIdFocus = useFocusScale();

  useEffect(() => {
    let active = true;
    void getTuyaConnectionStatus().then((status) => {
      if (!active) {
        return;
      }
      const loaded = {
        clientId: status.clientId ?? "",
        deviceId: status.deviceId ?? "",
        region: status.region ?? "us",
      };
      setClientId(loaded.clientId);
      setDeviceId(loaded.deviceId);
      setRegion(loaded.region);
      setSaved(loaded);
      setConnected(isTuyaConnected(status));
    });
    return () => {
      active = false;
    };
  }, []);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/cellar");
    }
  };

  const handleConnect = useCallback(async () => {
    if (testing || !hasChanges) {
      return;
    }
    const trimmedClientId = clientId.trim();
    const trimmedSecret = clientSecret.trim();
    const trimmedDeviceId = deviceId.trim();

    if (!(trimmedClientId && trimmedSecret && trimmedDeviceId)) {
      Alert.alert(
        "Missing details",
        "Enter your Client ID, Client Secret and Device ID."
      );
      return;
    }

    const credentials: TuyaCredentialsInput = {
      clientId: trimmedClientId,
      clientSecret: trimmedSecret,
      deviceId: trimmedDeviceId,
      region,
    };

    setTesting(true);
    try {
      await testTuyaCredentials(credentials);
      await saveTuyaCredentials(credentials);
      setClientSecret("");
      setSaved({
        clientId: trimmedClientId,
        deviceId: trimmedDeviceId,
        region,
      });
      setConnected(true);
      haptics.success();
      Alert.alert(
        "Connected",
        "Your cellar sensor is linked — its readings will show on the Cellar tab."
      );
    } catch (error) {
      Alert.alert(
        "Couldn't connect",
        error instanceof Error
          ? error.message
          : "Check your credentials and try again."
      );
    } finally {
      setTesting(false);
    }
  }, [testing, hasChanges, clientId, clientSecret, deviceId, region]);

  const handleDisconnect = useCallback(async () => {
    const confirmed = await confirmDelete({
      confirmLabel: "Disconnect",
      message:
        "Your target temperature and humidity stay put — only the live sensor link is removed.",
      title: "Disconnect Tuya?",
    });
    if (!confirmed) {
      return;
    }
    await clearTuyaCredentials();
    setClientId("");
    setClientSecret("");
    setDeviceId("");
    setSaved({ clientId: "", deviceId: "", region });
    setConnected(false);
  }, [region]);

  const handleConnectPress = useCallback(() => {
    void handleConnect();
  }, [handleConnect]);

  const handleDisconnectPress = useCallback(() => {
    void handleDisconnect();
  }, [handleDisconnect]);

  const focusSecretInput = useCallback(
    () => secretInputRef.current?.focus(),
    []
  );
  const focusDeviceIdInput = useCallback(
    () => deviceIdInputRef.current?.focus(),
    []
  );
  const toggleSecretVisible = useCallback(
    () => setSecretVisible((visible) => !visible),
    []
  );

  return (
    <ScreenShell>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <View style={styles.page}>
            <View style={styles.topBar}>
              <AnimatedPressable
                accessibilityLabel="Go back"
                accessibilityRole="button"
                onPress={goBack}
              >
                <GlassSurface isInteractive style={styles.backButton}>
                  <Icon color={Palette.ink} name="arrowLeft" size={21} />
                </GlassSurface>
              </AnimatedPressable>
            </View>

            <View style={styles.intro}>
              <Text style={styles.eyebrow}>CELLAR SENSOR</Text>
              <Text style={styles.title}>Connect to Tuya.</Text>
              <Text style={styles.subtitle}>
                Link a Tuya-based temperature and humidity sensor to see live
                readings on the Cellar tab.
              </Text>
            </View>

            <GlassSurface style={styles.helpCard}>
              <Text style={styles.helpTitle}>Where to find these</Text>
              <Text style={styles.helpBody}>
                {
                  "Create a Cloud Project at iot.tuya.com, link your Smart Life/Tuya account to it under Devices, then copy the project's Client ID and Client Secret, and the Device ID of your sensor from the Devices list. Pick the Data Center your project was created under below."
                }
              </Text>
            </GlassSurface>

            <View style={styles.fields}>
              <Animated.View style={clientIdFocus.animatedStyle}>
                <GlassSurface style={styles.field}>
                  <Text style={styles.fieldLabel}>CLIENT ID</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="off"
                    autoCorrect={false}
                    importantForAutofill="no"
                    onBlur={clientIdFocus.onBlur}
                    onChangeText={setClientId}
                    onFocus={clientIdFocus.onFocus}
                    onSubmitEditing={focusSecretInput}
                    placeholder="Cloud Project Client ID"
                    placeholderTextColor={Palette.muted}
                    returnKeyType="next"
                    selectionColor={Palette.wine}
                    spellCheck={false}
                    style={styles.fieldInput}
                    submitBehavior="submit"
                    textContentType="none"
                    value={clientId}
                  />
                </GlassSurface>
              </Animated.View>

              <Animated.View style={secretFocus.animatedStyle}>
                <GlassSurface style={styles.field}>
                  <Text style={styles.fieldLabel}>CLIENT SECRET</Text>
                  <View style={styles.secretRow}>
                    <TextInput
                      autoCapitalize="none"
                      autoComplete="off"
                      autoCorrect={false}
                      importantForAutofill="no"
                      onBlur={secretFocus.onBlur}
                      onChangeText={setClientSecret}
                      onFocus={secretFocus.onFocus}
                      onSubmitEditing={focusDeviceIdInput}
                      placeholder={
                        connected
                          ? "•••••••• (already set)"
                          : "Cloud Project Client Secret"
                      }
                      placeholderTextColor={Palette.muted}
                      ref={secretInputRef}
                      returnKeyType="next"
                      secureTextEntry={!secretVisible}
                      selectionColor={Palette.wine}
                      spellCheck={false}
                      style={[styles.fieldInput, styles.secretInput]}
                      submitBehavior="submit"
                      textContentType="none"
                      value={clientSecret}
                    />
                    <AnimatedPressable
                      accessibilityLabel={
                        secretVisible
                          ? "Hide client secret"
                          : "Show client secret"
                      }
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={toggleSecretVisible}
                      scaleTo={0.85}
                      style={styles.secretToggle}
                    >
                      <Icon
                        color={Palette.muted}
                        name={secretVisible ? "eyeOff" : "eye"}
                        size={19}
                      />
                    </AnimatedPressable>
                  </View>
                </GlassSurface>
              </Animated.View>

              <Animated.View style={deviceIdFocus.animatedStyle}>
                <GlassSurface style={styles.field}>
                  <Text style={styles.fieldLabel}>DEVICE ID</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="off"
                    autoCorrect={false}
                    importantForAutofill="no"
                    onBlur={deviceIdFocus.onBlur}
                    onChangeText={setDeviceId}
                    onFocus={deviceIdFocus.onFocus}
                    onSubmitEditing={handleConnectPress}
                    placeholder="Your sensor's Device ID"
                    placeholderTextColor={Palette.muted}
                    ref={deviceIdInputRef}
                    returnKeyType="done"
                    selectionColor={Palette.wine}
                    spellCheck={false}
                    style={styles.fieldInput}
                    textContentType="none"
                    value={deviceId}
                  />
                </GlassSurface>
              </Animated.View>

              <View>
                <Text style={styles.fieldLabelStandalone}>DATA CENTER</Text>
                <View style={styles.regionRow}>
                  {REGIONS.map((option) => (
                    <RegionPill
                      active={option === region}
                      key={option}
                      onSelect={setRegion}
                      option={option}
                    />
                  ))}
                </View>
              </View>

              <AnimatedPressable
                accessibilityRole="button"
                disabled={testing || !hasChanges}
                onPress={handleConnectPress}
              >
                <GlassSurface
                  isInteractive
                  style={styles.primaryButton}
                  tintColor={Palette.wine}
                >
                  <Icon
                    color={Palette.white}
                    name={testing ? "hourglass" : "check"}
                    size={18}
                  />
                  <Text style={styles.primaryButtonText}>
                    {connectButtonLabel(testing, connected)}
                  </Text>
                </GlassSurface>
              </AnimatedPressable>

              {connected ? (
                <AnimatedPressable
                  accessibilityRole="button"
                  onPress={handleDisconnectPress}
                >
                  <GlassSurface isInteractive style={styles.outlineButton}>
                    <Icon color={Palette.wine} name="wifiOff" size={18} />
                    <Text style={styles.outlineButtonText}>Disconnect</Text>
                  </GlassSurface>
                </AnimatedPressable>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  eyebrow: {
    color: Palette.plum,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.1,
    lineHeight: 16,
  },
  field: {
    borderRadius: 22,
    paddingBottom: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  fieldInput: {
    backgroundColor: "transparent",
    color: Palette.ink,
    fontSize: 17,
    lineHeight: 24,
    paddingVertical: 6,
  },
  fieldLabel: {
    color: Palette.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  fieldLabelStandalone: {
    color: Palette.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  fields: { gap: 12, marginTop: 24 },
  flex: { flex: 1 },
  helpBody: {
    color: Palette.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  helpCard: {
    backgroundColor: Palette.blush,
    borderColor: "transparent",
    borderRadius: Radii.card,
    marginTop: 28,
    padding: 18,
  },
  helpTitle: {
    color: Palette.ink,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  intro: { marginTop: 12 },
  outlineButton: {
    alignItems: "center",
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 21,
  },
  outlineButtonText: { color: Palette.wine, fontSize: 14, fontWeight: "700" },
  page: { maxWidth: 640, paddingHorizontal: 24, width: "100%" },
  primaryButton: {
    alignItems: "center",
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 52,
    paddingHorizontal: 21,
  },
  primaryButtonText: { color: Palette.white, fontSize: 14, fontWeight: "700" },
  regionPill: {
    alignItems: "center",
    borderRadius: Radii.pill,
    justifyContent: "center",
    minHeight: 44,
    ...Shadows.card,
  },
  regionPillText: { color: Palette.ink, fontSize: 12, fontWeight: "700" },
  regionPillTextActive: { color: Palette.white },
  regionPillWrap: { flex: 1 },
  regionRow: { flexDirection: "row", gap: 8 },
  scrollContent: { alignItems: "center", paddingBottom: 68 },
  scrollView: { backgroundColor: "transparent", flex: 1 },
  secretInput: { flex: 1 },
  secretRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  secretToggle: {
    alignItems: "center",
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  subtitle: {
    color: Palette.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 14,
    maxWidth: 460,
  },
  title: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 38,
    fontWeight: "600",
    letterSpacing: -1.1,
    lineHeight: 44,
    marginTop: 10,
  },
  topBar: { alignItems: "center", flexDirection: "row", height: 82 },
});
