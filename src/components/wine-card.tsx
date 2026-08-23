import { Image } from "expo-image";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@/components/animated-pressable";
import { GlassSurface } from "@/components/glass-surface";
import { Icon } from "@/components/icon";
import { WineIllustration } from "@/components/wine-illustration";
import { Fonts, Palette, Shadows } from "@/constants/theme";
import type { WineRecentView, WineSearchResult } from "@/types/wine";
import { wineOrigin, wineVintageDetails } from "@/utils/wine-format";

function BottlePlaceholder({ type }: { type: string | null }) {
  return (
    <View accessible={false} style={styles.bottleStage}>
      <WineIllustration size={68} type={type} />
    </View>
  );
}

export function WineCard({
  wine,
  fullWidth = false,
  onPress,
  imageUrl: imageUrlOverride,
}: {
  wine: WineSearchResult | WineRecentView;
  fullWidth?: boolean;
  onPress: () => void;
  imageUrl?: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = imageFailed
    ? null
    : ((imageUrlOverride === undefined ? wine.imageUrl : imageUrlOverride) ??
      null);
  const handleImageError = useCallback(() => setImageFailed(true), []);

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
        {imageUrl ? (
          <View style={styles.recentLabelStage}>
            <Image
              accessibilityLabel={`Label for ${wine.name}`}
              contentFit="contain"
              onError={handleImageError}
              source={{ uri: imageUrl }}
              style={styles.recentLabelImage}
            />
          </View>
        ) : (
          <BottlePlaceholder type={wine.type} />
        )}
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
          {wine.guideScore === null ? null : (
            <View style={styles.ratingRow}>
              <Icon color={Palette.plum} name="starFilled" size={13} />
              <Text style={styles.ratingText}>
                {wine.guideScore.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </GlassSurface>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  bottleStage: {
    alignItems: "center",
    backgroundColor: Palette.white,
    borderRadius: 13,
    height: 102,
    justifyContent: "center",
    minWidth: 74,
    width: 74,
    ...Shadows.card,
  },
  pressCard: { width: 342 },
  pressFull: { width: "100%" },
  ratingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    marginTop: 3,
  },
  ratingText: { color: Palette.plum, fontSize: 11, fontWeight: "700" },
  recentLabelImage: { height: "94%", width: "94%" },
  recentLabelStage: {
    alignItems: "center",
    backgroundColor: Palette.white,
    borderRadius: 13,
    height: 102,
    justifyContent: "center",
    minWidth: 74,
    width: 74,
    ...Shadows.card,
  },
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
