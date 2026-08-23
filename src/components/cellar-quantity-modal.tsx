import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/animated-pressable";
import { ChromeCloseButton } from "@/components/chrome-close-button";
import { GlassSurface } from "@/components/glass-surface";
import { Icon } from "@/components/icon";
import { ModalShell } from "@/components/modal-shell";
import { Fonts, Palette, Radii, Shadows } from "@/constants/theme";
import { confirmDelete } from "@/utils/confirm-delete";
import { haptics } from "@/utils/haptics";

export function CellarQuantityModal({
  visible,
  wineName,
  wineVintage,
  initialQuantity,
  inCellar,
  onClose,
  onConfirm,
  onRemove,
}: {
  visible: boolean;
  wineName: string;
  wineVintage?: string | null;
  initialQuantity: number;
  inCellar: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  onRemove?: () => void;
}) {
  const [quantity, setQuantity] = useState(Math.max(1, initialQuantity));

  useEffect(() => {
    if (visible) {
      setQuantity(Math.max(1, initialQuantity));
    }
  }, [initialQuantity, visible]);

  const handleRemove = useCallback(async () => {
    if (!onRemove) {
      return;
    }
    const confirmed = await confirmDelete({
      message: "This can't be undone.",
      title: `Remove ${wineName} from cellar?`,
    });
    if (!confirmed) {
      return;
    }
    haptics.remove();
    onRemove();
  }, [onRemove, wineName]);

  const handleRemovePress = useCallback(() => {
    void handleRemove();
  }, [handleRemove]);

  const decrementQuantity = useCallback(() => {
    setQuantity((value) => Math.max(1, value - 1));
  }, []);

  const incrementQuantity = useCallback(() => {
    setQuantity((value) => Math.min(99, value + 1));
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(quantity);
  }, [onConfirm, quantity]);

  const panel = (
    <SafeAreaProvider>
      <SafeAreaView edges={["bottom"]} style={styles.safe}>
        <AnimatedPressable
          accessibilityLabel="Dismiss"
          onPress={onClose}
          scaleTo={1}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
          <View style={styles.top}>
            <View style={styles.headingBlock}>
              <Text style={styles.eyebrow}>
                {inCellar ? "IN YOUR CELLAR" : "ADD TO CELLAR"}
              </Text>
              <Text style={styles.heading}>
                {inCellar ? "Update bottles" : "How many bottles?"}
              </Text>
              <Text style={styles.wineName}>
                {[wineName, wineVintage].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <ChromeCloseButton
              accessibilityLabel="Close quantity"
              onPress={onClose}
            />
          </View>

          <View style={styles.stepper}>
            <AnimatedPressable
              accessibilityLabel="Fewer bottles"
              accessibilityRole="button"
              disabled={quantity <= 1}
              onPress={decrementQuantity}
              style={[styles.stepButton, quantity <= 1 && styles.stepDisabled]}
            >
              <Icon
                color={quantity <= 1 ? Palette.placeholderDark : Palette.wine}
                name="minus"
                size={18}
              />
            </AnimatedPressable>
            <View style={styles.quantityBlock}>
              <Text style={styles.quantity}>{quantity}</Text>
              <Text style={styles.quantityLabel}>
                {quantity === 1 ? "Bottle" : "Bottles"}
              </Text>
            </View>
            <AnimatedPressable
              accessibilityLabel="More bottles"
              accessibilityRole="button"
              disabled={quantity >= 99}
              onPress={incrementQuantity}
              style={[styles.stepButton, quantity >= 99 && styles.stepDisabled]}
            >
              <Icon
                color={quantity >= 99 ? Palette.placeholderDark : Palette.wine}
                name="plus"
                size={18}
              />
            </AnimatedPressable>
          </View>

          <AnimatedPressable accessibilityRole="button" onPress={handleConfirm}>
            <GlassSurface
              isInteractive
              style={styles.confirmButton}
              tintColor={Palette.wine}
            >
              <Icon
                color={Palette.white}
                name={inCellar ? "check" : "plus"}
                size={18}
              />
              <Text style={styles.confirmText}>
                {inCellar ? "Update cellar" : "Add to my cellar"}
              </Text>
            </GlassSurface>
          </AnimatedPressable>

          {inCellar && onRemove ? (
            <AnimatedPressable
              accessibilityRole="button"
              onPress={handleRemovePress}
              style={styles.removeButton}
            >
              <Icon color={Palette.wine} name="trash" size={16} />
              <Text style={styles.removeText}>Remove from cellar</Text>
            </AnimatedPressable>
          ) : null}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );

  return (
    <ModalShell
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
      webOverlayStyle={styles.webOverlay}
    >
      {panel}
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(26, 18, 22, 0.36)",
  },
  confirmButton: {
    alignItems: "center",
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 52,
  },
  confirmText: { color: Palette.white, fontSize: 14, fontWeight: "700" },
  eyebrow: {
    color: Palette.plum,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  heading: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 34,
  },
  headingBlock: { flex: 1, gap: 6, paddingRight: 8 },
  quantity: {
    color: Palette.wineDark,
    fontFamily: Fonts.serif,
    fontSize: 48,
    fontWeight: "600",
    lineHeight: 54,
  },
  quantityBlock: { alignItems: "center", minWidth: 96 },
  quantityLabel: {
    color: Palette.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginTop: 2,
  },
  removeButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 44,
  },
  removeText: { color: Palette.wine, fontSize: 14, fontWeight: "700" },
  safe: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Palette.white,
    borderRadius: Radii.sheet,
    marginBottom: 12,
    marginHorizontal: 12,
    paddingBottom: 18,
    paddingHorizontal: 22,
    paddingTop: 20,
    ...Shadows.raised,
  },
  stepButton: {
    alignItems: "center",
    backgroundColor: Palette.blush,
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  stepDisabled: { backgroundColor: Palette.surface },
  stepper: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    marginTop: 22,
    paddingHorizontal: 8,
  },
  top: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  webOverlay: {
    bottom: 0,
    left: 0,
    position: "fixed",
    right: 0,
    top: 0,
    zIndex: 1200,
  },
  wineName: { color: Palette.muted, fontSize: 14, lineHeight: 20 },
});
