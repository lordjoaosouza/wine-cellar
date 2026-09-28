import { useCallback, useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/animated-pressable";
import { ChromeCloseButton } from "@/components/chrome-close-button";
import { GlassSurface } from "@/components/glass-surface";
import { Icon } from "@/components/icon";
import { Fonts, Palette, Radii } from "@/constants/theme";
import {
  getApiBaseUrl,
  getDefaultApiBaseUrl,
  setApiBaseUrl,
} from "@/services/api-config";
import { haptics } from "@/utils/haptics";

export function ServerSettingsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const canSave = url.trim().length > 0 && url.trim() !== savedUrl;

  useEffect(() => {
    if (visible) {
      void getApiBaseUrl().then((current) => {
        setSavedUrl(current);
        setUrl(current);
      });
    }
  }, [visible]);

  const handleSave = useCallback(async () => {
    if (!canSave) {
      return;
    }
    const trimmed = url.trim();
    await setApiBaseUrl(trimmed);
    haptics.success();
    onClose();
  }, [canSave, url, onClose]);

  const handleSavePress = useCallback(() => {
    void handleSave();
  }, [handleSave]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.topRow}>
          <Text style={styles.title}>Server</Text>
          <ChromeCloseButton
            accessibilityLabel="Close server settings"
            onPress={onClose}
          />
        </View>
        <Text style={styles.subtitle}>
          The address of your Wine Cellar API — e.g. your Tailscale hostname.
        </Text>
        <GlassSurface style={styles.field}>
          <Text style={styles.fieldLabel}>API HOST</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            keyboardType="url"
            onChangeText={setUrl}
            onSubmitEditing={handleSavePress}
            placeholder={getDefaultApiBaseUrl()}
            placeholderTextColor={Palette.muted}
            returnKeyType="done"
            spellCheck={false}
            style={styles.fieldInput}
            value={url}
          />
        </GlassSurface>
        <AnimatedPressable
          accessibilityRole="button"
          disabled={!canSave}
          onPress={handleSavePress}
        >
          <GlassSurface
            isInteractive
            style={styles.button}
            tintColor={Palette.wine}
          >
            <Icon color={Palette.white} name="check" size={18} />
            <Text style={styles.buttonText}>Save</Text>
          </GlassSurface>
        </AnimatedPressable>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 52,
  },
  buttonText: { color: Palette.white, fontSize: 14, fontWeight: "700" },
  field: {
    borderRadius: 22,
    marginTop: 18,
    paddingBottom: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  fieldInput: { color: Palette.ink, fontSize: 16, paddingVertical: 6 },
  fieldLabel: {
    color: Palette.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  safe: { flex: 1, padding: 24 },
  subtitle: {
    color: Palette.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  title: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 24,
    fontWeight: "600",
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
