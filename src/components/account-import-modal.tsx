import { useCallback, useState } from "react";
import { Alert, Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/animated-pressable";
import { ChromeCloseButton } from "@/components/chrome-close-button";
import { GlassSurface } from "@/components/glass-surface";
import { Icon } from "@/components/icon";
import { Fonts, Palette, Radii } from "@/constants/theme";
import { importAccountArchive } from "@/services/account";
import { haptics } from "@/utils/haptics";

export function AccountImportModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = useCallback(async () => {
    let archive: unknown;
    try {
      archive = JSON.parse(text);
    } catch {
      Alert.alert(
        "Invalid file",
        "That doesn't look like a valid export archive."
      );
      return;
    }

    setIsImporting(true);
    try {
      await importAccountArchive(archive);
      haptics.success();
      setText("");
      onClose();
      Alert.alert(
        "Imported",
        "Your cellar, wishlist and ratings have been restored."
      );
    } catch (error) {
      Alert.alert(
        "Couldn't import",
        error instanceof Error ? error.message : "Check the file and try again."
      );
    } finally {
      setIsImporting(false);
    }
  }, [text, onClose]);

  const handleImportPress = useCallback(() => {
    void handleImport();
  }, [handleImport]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.topRow}>
          <Text style={styles.title}>Import everything</Text>
          <ChromeCloseButton
            accessibilityLabel="Close import"
            onPress={onClose}
          />
        </View>
        <Text style={styles.subtitle}>
          Paste the contents of a previously exported archive file below.
        </Text>
        <GlassSurface style={styles.field}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            onChangeText={setText}
            placeholder="Paste exported JSON here…"
            placeholderTextColor={Palette.muted}
            style={styles.input}
            value={text}
          />
        </GlassSurface>
        <AnimatedPressable
          accessibilityRole="button"
          disabled={isImporting || text.trim().length === 0}
          onPress={handleImportPress}
        >
          <GlassSurface
            isInteractive
            style={styles.button}
            tintColor={Palette.wine}
          >
            <Icon color={Palette.white} name="import" size={18} />
            <Text style={styles.buttonText}>
              {isImporting ? "Importing…" : "Import"}
            </Text>
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
  field: { borderRadius: 22, flex: 1, marginTop: 16, padding: 16 },
  input: {
    color: Palette.ink,
    flex: 1,
    fontSize: 14,
    textAlignVertical: "top",
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
