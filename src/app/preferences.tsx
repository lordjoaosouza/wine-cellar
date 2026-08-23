import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated from "react-native-reanimated";

import { AccountImportModal } from "@/components/account-import-modal";
import { AnimatedPressable } from "@/components/animated-pressable";
import { GlassSurface } from "@/components/glass-surface";
import { Icon } from "@/components/icon";
import { ProfileAvatar } from "@/components/profile-avatar";
import { ScreenShell } from "@/components/screen-shell";
import { ServerSettingsModal } from "@/components/server-settings-modal";
import { Fonts, Palette, Radii, Shadows } from "@/constants/theme";
import { useFocusScale } from "@/hooks/use-focus-scale";
import { useScrollToTopOnNavigate } from "@/hooks/use-scroll-to-top";
import { useUserProfile } from "@/hooks/use-user-profile";
import { exportAccountArchive } from "@/services/account";
import { getApiBaseUrl } from "@/services/api-config";
import { logout } from "@/services/auth";
import { getUserProfile } from "@/services/user-profile";
import { haptics } from "@/utils/haptics";
import { promptPickPhoto } from "@/utils/pick-photo";

export default function PreferencesScreen() {
  const router = useRouter();
  const scrollRef = useScrollToTopOnNavigate();
  const { profile, updateProfile } = useUserProfile();
  const [name, setName] = useState(profile.name);
  const [newApiKey, setNewApiKey] = useState("");
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);
  const [apiHost, setApiHost] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const apiKeyInputRef = useRef<TextInput>(null);
  const nameFocus = useFocusScale();
  const apiKeyFocus = useFocusScale();

  useEffect(() => {
    let active = true;
    void getUserProfile().then((stored) => {
      if (active) {
        setName(stored.name);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void getApiBaseUrl().then((url) => {
      if (active) {
        setApiHost(url);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const canUpdate = name.trim() !== profile.name || newApiKey.trim().length > 0;

  const handleUpdate = useCallback(async () => {
    if (!canUpdate) {
      return;
    }
    const nextName = name.trim();
    const nextApiKey = newApiKey.trim();
    setName(nextName);
    Keyboard.dismiss();
    haptics.success();
    await updateProfile({
      name: nextName,
      ...(nextApiKey ? { openaiApiKey: nextApiKey } : {}),
    });
    setNewApiKey("");
  }, [canUpdate, name, newApiKey, updateProfile]);

  const handleAvatarPress = useCallback(async () => {
    haptics.tap();
    const result = await promptPickPhoto({
      hasExisting: !!profile.avatarUri,
      title: "Profile photo",
    });
    if (!result) {
      return;
    }
    await updateProfile({ avatarUri: "removed" in result ? null : result.uri });
  }, [profile.avatarUri, updateProfile]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const archive = await exportAccountArchive();
      await Share.share({ message: JSON.stringify(archive) });
    } catch (error) {
      Alert.alert(
        "Couldn't export",
        error instanceof Error ? error.message : "Try again."
      );
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await logout();
  }, []);

  const handleAvatarPressTrigger = useCallback(() => {
    void handleAvatarPress();
  }, [handleAvatarPress]);

  const handleUpdatePress = useCallback(() => {
    void handleUpdate();
  }, [handleUpdate]);

  const handleExportPress = useCallback(() => {
    void handleExport();
  }, [handleExport]);

  const handleSignOutPress = useCallback(() => {
    void handleSignOut();
  }, [handleSignOut]);

  const focusApiKeyInput = useCallback(
    () => apiKeyInputRef.current?.focus(),
    []
  );
  const toggleApiKeyVisible = useCallback(
    () => setApiKeyVisible((visible) => !visible),
    []
  );
  const openServerSettings = useCallback(() => setServerSettingsOpen(true), []);
  const closeServerSettings = useCallback(
    () => setServerSettingsOpen(false),
    []
  );
  const openImport = useCallback(() => setImportOpen(true), []);
  const closeImport = useCallback(() => setImportOpen(false), []);
  const goToTuyaConnect = useCallback(
    () => router.push("/tuya-connect"),
    [router]
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
              <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
              <Text style={styles.title}>How we address you.</Text>
              <Text style={styles.subtitle}>
                Keep your name and photo close. This is what appears on your
                cellar.
              </Text>
            </View>

            <View style={styles.avatarButton}>
              <View style={styles.avatarStage}>
                <AnimatedPressable
                  accessibilityLabel="Change profile photo"
                  accessibilityRole="button"
                  onPress={handleAvatarPressTrigger}
                  style={styles.avatarClip}
                >
                  <ProfileAvatar
                    profile={profile}
                    size={132}
                    style={
                      profile.avatarUri ? undefined : styles.avatarFallback
                    }
                  />
                </AnimatedPressable>
                <AnimatedPressable
                  accessibilityLabel="Change profile photo"
                  accessibilityRole="button"
                  onPress={handleAvatarPressTrigger}
                  style={styles.cameraBadge}
                >
                  <Icon color={Palette.white} name="camera" size={16} />
                </AnimatedPressable>
              </View>
              <Text style={styles.avatarHint}>Tap to change your photo</Text>
            </View>

            <View style={styles.fields}>
              <Animated.View style={nameFocus.animatedStyle}>
                <GlassSurface style={styles.field}>
                  <Text style={styles.fieldLabel}>NAME</Text>
                  <TextInput
                    autoCapitalize="words"
                    autoComplete="off"
                    autoCorrect={false}
                    importantForAutofill="no"
                    onBlur={nameFocus.onBlur}
                    onChangeText={setName}
                    onFocus={nameFocus.onFocus}
                    onSubmitEditing={focusApiKeyInput}
                    placeholder="Your full name"
                    placeholderTextColor={Palette.muted}
                    returnKeyType="next"
                    selectionColor={Palette.wine}
                    style={styles.fieldInput}
                    submitBehavior="submit"
                    textContentType="none"
                    value={name}
                  />
                </GlassSurface>
              </Animated.View>
              <GlassSurface style={styles.field}>
                <Text style={styles.fieldLabel}>EMAIL</Text>
                <Text style={styles.fieldStatic}>{profile.email}</Text>
              </GlassSurface>
              <Animated.View style={apiKeyFocus.animatedStyle}>
                <GlassSurface style={styles.field}>
                  <Text style={styles.fieldLabel}>OPENAI API KEY</Text>
                  <View style={styles.secretRow}>
                    <TextInput
                      autoCapitalize="none"
                      autoComplete="off"
                      autoCorrect={false}
                      importantForAutofill="no"
                      onBlur={apiKeyFocus.onBlur}
                      onChangeText={setNewApiKey}
                      onFocus={apiKeyFocus.onFocus}
                      onSubmitEditing={handleUpdatePress}
                      placeholder={
                        profile.hasOpenaiApiKey
                          ? "•••••••• (already set)"
                          : "sk-..."
                      }
                      placeholderTextColor={Palette.muted}
                      ref={apiKeyInputRef}
                      returnKeyType="done"
                      secureTextEntry={!apiKeyVisible}
                      selectionColor={Palette.wine}
                      spellCheck={false}
                      style={[styles.fieldInput, styles.secretInput]}
                      textContentType="none"
                      value={newApiKey}
                    />
                    <AnimatedPressable
                      accessibilityLabel={
                        apiKeyVisible ? "Hide API key" : "Show API key"
                      }
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={toggleApiKeyVisible}
                      scaleTo={0.85}
                      style={styles.secretToggle}
                    >
                      <Icon
                        color={Palette.muted}
                        name={apiKeyVisible ? "eyeOff" : "eye"}
                        size={19}
                      />
                    </AnimatedPressable>
                  </View>
                </GlassSurface>
              </Animated.View>
              <Text style={styles.fieldHint}>
                Stored on the server, encrypted at rest. Used to search wines,
                read labels, and find photos — get a key at platform.openai.com.
              </Text>
              <AnimatedPressable
                accessibilityRole="button"
                disabled={!canUpdate}
                onPress={handleUpdatePress}
              >
                <GlassSurface
                  isInteractive
                  style={styles.primaryButton}
                  tintColor={Palette.wine}
                >
                  <Icon color={Palette.white} name="check" size={18} />
                  <Text style={styles.primaryButtonText}>Update</Text>
                </GlassSurface>
              </AnimatedPressable>
            </View>

            <View style={styles.separator} />

            <View style={styles.sectionHeading}>
              <Text style={styles.eyebrow}>CONNECTIONS</Text>
              <Text style={styles.sectionTitle}>Where things live.</Text>
            </View>

            <View style={styles.fields}>
              <AnimatedPressable
                accessibilityRole="button"
                onPress={openServerSettings}
              >
                <GlassSurface isInteractive style={styles.connectionRow}>
                  <View style={styles.connectionIcon}>
                    <Icon color={Palette.wine} name="gear" size={19} />
                  </View>
                  <View style={styles.connectionCopy}>
                    <Text style={styles.connectionLabel}>API SERVER</Text>
                    <Text numberOfLines={1} style={styles.connectionValue}>
                      {apiHost || "Not set"}
                    </Text>
                  </View>
                  <Icon color={Palette.muted} name="chevronRight" size={18} />
                </GlassSurface>
              </AnimatedPressable>

              <AnimatedPressable
                accessibilityRole="button"
                onPress={goToTuyaConnect}
              >
                <GlassSurface isInteractive style={styles.connectionRow}>
                  <View style={styles.connectionIcon}>
                    <Icon color={Palette.wine} name="thermometer" size={19} />
                  </View>
                  <View style={styles.connectionCopy}>
                    <Text style={styles.connectionLabel}>CELLAR SENSOR</Text>
                    <Text style={styles.connectionValue}>Tuya</Text>
                  </View>
                  <Icon color={Palette.muted} name="chevronRight" size={18} />
                </GlassSurface>
              </AnimatedPressable>
            </View>

            <View style={styles.separator} />

            <View style={styles.actions}>
              <AnimatedPressable
                accessibilityRole="button"
                disabled={isExporting}
                onPress={handleExportPress}
              >
                <GlassSurface isInteractive style={styles.outlineButton}>
                  <Icon color={Palette.wine} name="export" size={18} />
                  <Text style={styles.outlineButtonText}>
                    {isExporting ? "Exporting…" : "Export everything"}
                  </Text>
                </GlassSurface>
              </AnimatedPressable>
              <AnimatedPressable
                accessibilityRole="button"
                onPress={openImport}
              >
                <GlassSurface
                  isInteractive
                  style={styles.primaryButton}
                  tintColor={Palette.wine}
                >
                  <Icon color={Palette.white} name="import" size={18} />
                  <Text style={styles.primaryButtonText}>
                    Import everything
                  </Text>
                </GlassSurface>
              </AnimatedPressable>
              <Text style={styles.exportNote}>
                A full archive of your cellar, ratings, and wishlist.
              </Text>
              <AnimatedPressable
                accessibilityRole="button"
                onPress={handleSignOutPress}
                style={styles.signOutButton}
              >
                <Icon color={Palette.wine} name="signOut" size={16} />
                <Text style={styles.signOutText}>Sign out</Text>
              </AnimatedPressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <AccountImportModal onClose={closeImport} visible={importOpen} />
      <ServerSettingsModal
        onClose={closeServerSettings}
        visible={serverSettingsOpen}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10, marginTop: 24 },
  avatarButton: { alignItems: "center", marginTop: 36 },
  avatarClip: {
    borderRadius: 66,
    height: 132,
    overflow: "hidden",
    width: 132,
    ...Shadows.card,
  },
  avatarFallback: { backgroundColor: Palette.lilac },
  avatarHint: {
    color: Palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
    maxWidth: 280,
    textAlign: "center",
  },
  avatarStage: { height: 132, width: 132 },
  backButton: {
    alignItems: "center",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  cameraBadge: {
    alignItems: "center",
    backgroundColor: Palette.wine,
    borderRadius: 17,
    bottom: 6,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: 6,
    width: 34,
    ...Shadows.button,
  },
  connectionCopy: { flex: 1 },
  connectionIcon: {
    alignItems: "center",
    backgroundColor: Palette.blush,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  connectionLabel: {
    color: Palette.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  connectionRow: {
    alignItems: "center",
    borderRadius: 22,
    flexDirection: "row",
    gap: 14,
    minHeight: 64,
    paddingHorizontal: 16,
  },
  connectionValue: {
    color: Palette.ink,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  exportNote: {
    color: Palette.placeholderDark,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    textAlign: "center",
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
  fieldHint: {
    color: Palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 2,
    marginTop: -2,
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
  fieldStatic: {
    color: Palette.muted,
    fontSize: 17,
    lineHeight: 24,
    paddingVertical: 6,
  },
  fields: { gap: 12, marginTop: 32 },
  flex: { flex: 1 },
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
    minHeight: 52,
    paddingHorizontal: 21,
  },
  primaryButtonText: { color: Palette.white, fontSize: 14, fontWeight: "700" },
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
  sectionHeading: { marginTop: 4 },
  sectionTitle: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 26,
    fontWeight: "600",
    letterSpacing: -0.4,
    marginTop: 6,
  },
  separator: {
    backgroundColor: Palette.separator,
    height: StyleSheet.hairlineWidth,
    marginBottom: 4,
    marginTop: 32,
  },
  signOutButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 20,
    minHeight: 44,
  },
  signOutText: { color: Palette.wine, fontSize: 14, fontWeight: "700" },
  subtitle: {
    color: Palette.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 14,
    maxWidth: 420,
  },
  title: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 42,
    fontWeight: "600",
    letterSpacing: -1.2,
    lineHeight: 48,
    marginTop: 10,
  },
  topBar: { alignItems: "center", flexDirection: "row", height: 82 },
});
