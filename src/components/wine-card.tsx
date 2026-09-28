import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@/components/animated-pressable";
import { GlassSurface } from "@/components/glass-surface";
import { WineThumbnail } from "@/components/wine-thumbnail";
import { Fonts, Palette } from "@/constants/theme";
import type { WineRecentView, WineSearchResult } from "@/types/wine";
import { wineOrigin, wineVintageDetails } from "@/utils/wine-format";

export function WineCard({
  wine,
  fullWidth = false,
  onPress,
}: {
  wine: WineSearchResult | WineRecentView;
  fullWidth?: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      accessibilityHint="Opens this wine's details"
      accessibilityRole="button"
      onPress={onPress}
      style={fullWidth ? styles.pressFull : styles.pressCard}
    >
      <GlassSurface
        isInteractive
        style={[styles.wineCard, fullWidth && styles.wineCardFull]}
      >
        <WineThumbnail wine={wine} />
        <View style={styles.wineCardContent}>
          <Text numberOfLines={1} style={styles.wineName}>
            {wine.name}
          </Text>
          <Text numberOfLines={1} style={styles.wineDetails}>
            {wineVintageDetails(wine)}
          </Text>
          <Text numberOfLines={1} style={styles.wineProducer}>
            {wineOrigin(wine)}
          </Text>
        </View>
      </GlassSurface>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pressCard: { width: 342 },
  pressFull: { width: "100%" },
  wineCard: {
    alignItems: "center",
    borderRadius: 22,
    flexDirection: "row",
    gap: 13,
    minHeight: 128,
    padding: 12,
    width: "100%",
  },
  wineCardContent: { flex: 1 },
  wineCardFull: { minHeight: 116, width: "100%" },
  wineDetails: {
    color: Palette.wine,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 4,
  },
  wineName: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 23,
  },
  wineProducer: {
    color: Palette.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 2,
  },
});
