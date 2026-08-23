import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import { AnimatedPressable } from "@/components/animated-pressable";
import { GlassSurface } from "@/components/glass-surface";
import { Icon } from "@/components/icon";
import { BottleShelf } from "@/components/mini-bottle";
import { ScreenShell } from "@/components/screen-shell";
import {
  type SwipeDeleteExclusiveRef,
  SwipeDeleteRow,
} from "@/components/swipe-delete-row";
import { useTabHeaderSlotHeight } from "@/components/tab-screen-header";
import { WineIllustration } from "@/components/wine-illustration";
import {
  BottomTabInset,
  Fonts,
  Palette,
  Radii,
  Shadows,
} from "@/constants/theme";
import { useScrollToTopOnNavigate } from "@/hooks/use-scroll-to-top";
import { getRatings, removeRating } from "@/services/wine-ratings";
import type { WineRating } from "@/types/wine";
import { requestHomeSearch } from "@/utils/search-intent";
import { wineOrigin, wineVintageDetails } from "@/utils/wine-format";

function RatingThumbnail({ rating }: { rating: WineRating }) {
  if (rating.photoUrl) {
    return (
      <View style={styles.photoFrame}>
        <Image
          accessibilityLabel={`Your tasting photo for ${rating.name}`}
          contentFit="cover"
          source={{ uri: rating.photoUrl }}
          style={styles.photoThumb}
        />
        <View style={styles.photoBadge}>
          <Icon color={Palette.white} name="camera" size={10} />
        </View>
      </View>
    );
  }
  if (rating.imageUrl) {
    return (
      <Image
        accessibilityLabel={`Label for ${rating.name}`}
        contentFit="contain"
        source={{ uri: rating.imageUrl }}
        style={styles.labelImage}
      />
    );
  }
  return <WineIllustration size={68} type={rating.type} />;
}

function RatedRow({
  rating,
  exclusiveRef,
  onOpen,
  onRemove,
}: {
  rating: WineRating;
  exclusiveRef: SwipeDeleteExclusiveRef;
  onOpen: (rating: WineRating) => void;
  onRemove: (id: string) => Promise<void>;
}) {
  const handlePress = useCallback(() => onOpen(rating), [onOpen, rating]);
  const handleDelete = useCallback(() => {
    void onRemove(rating.id);
  }, [onRemove, rating.id]);

  return (
    <SwipeDeleteRow
      accessibilityLabel={`Remove rating for ${rating.name}`}
      exclusiveRef={exclusiveRef}
      onDelete={handleDelete}
    >
      <GlassSurface isInteractive style={styles.wineCard}>
        <AnimatedPressable
          accessibilityHint="Opens this wine's details"
          accessibilityRole="button"
          onPress={handlePress}
          style={styles.wineCardMain}
        >
          <View
            accessible={false}
            style={[
              styles.labelStage,
              rating.photoUrl || rating.imageUrl
                ? styles.labelStageImage
                : styles.labelStagePlaceholder,
            ]}
          >
            <RatingThumbnail rating={rating} />
          </View>
          <View style={styles.wineCardContent}>
            <Text numberOfLines={1} style={styles.wineName}>
              {rating.name}
            </Text>
            <Text numberOfLines={1} style={styles.wineDetails}>
              {wineVintageDetails(rating)}
            </Text>
            <Text numberOfLines={1} style={styles.wineProducer}>
              {wineOrigin(rating)}
            </Text>
            <Text style={styles.score}>
              Your score {rating.score.toFixed(1)}
            </Text>
          </View>
        </AnimatedPressable>
      </GlassSurface>
    </SwipeDeleteRow>
  );
}

export default function RatedScreen() {
  const router = useRouter();
  const scrollRef = useScrollToTopOnNavigate();
  const headerSlotHeight = useTabHeaderSlotHeight();
  const [items, setItems] = useState<WineRating[]>([]);
  const openSwipeRef = useRef<SwipeDeleteExclusiveRef["current"]>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getRatings().then((saved) => {
        if (active) {
          setItems(saved);
        }
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const handleRemove = useCallback(async (wineId: string) => {
    await removeRating(wineId);
    setItems(await getRatings());
  }, []);

  const handleOpenWine = useCallback(
    (rating: WineRating) => {
      router.push({
        params: { id: rating.id },
        pathname: "/wine/[id]",
      });
    },
    [router]
  );

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.page}>
          <View style={{ height: headerSlotHeight }} />

          <View style={styles.intro}>
            <Text style={styles.eyebrow}>YOUR TASTING NOTES</Text>
            <Text style={styles.title}>Wines you’ve already rated.</Text>
            <Text style={styles.subtitle}>
              Keep score of the bottles you taste and come back to the ones that
              earned a place.
            </Text>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statsCopy}>
              <Text style={styles.statsLabel}>RATED SO FAR</Text>
              <Text style={styles.statsCount}>{items.length}</Text>
              <Text style={styles.statsUnit}>
                {items.length === 1 ? "Wine" : "Wines"}
              </Text>
            </View>
            <View style={styles.bottleShelf}>
              <BottleShelf />
            </View>
          </View>

          {items.length > 0 ? (
            <View style={styles.list}>
              {items.map((rating) => (
                <RatedRow
                  exclusiveRef={openSwipeRef}
                  key={rating.id}
                  onOpen={handleOpenWine}
                  onRemove={handleRemove}
                  rating={rating}
                />
              ))}
            </View>
          ) : (
            <GlassSurface style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon color={Palette.wine} name="star" size={24} />
              </View>
              <Text style={styles.emptyTitle}>No ratings yet</Text>
              <Text style={styles.emptyBody}>
                Open a wine profile and rate the first bottle you want to
                remember tasting.
              </Text>
              <AnimatedPressable
                accessibilityRole="button"
                onPress={requestHomeSearch}
              >
                <GlassSurface
                  isInteractive
                  style={styles.primaryButton}
                  tintColor={Palette.wine}
                >
                  <Text style={styles.primaryButtonText}>Discover a wine</Text>
                  <Icon color={Palette.white} name="arrowRight" size={18} />
                </GlassSurface>
              </AnimatedPressable>
            </GlassSurface>
          )}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  bottleShelf: { justifyContent: "flex-end", width: "48%" },
  emptyBody: {
    color: Palette.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    maxWidth: 380,
    textAlign: "center",
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: Palette.lilac,
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  emptyState: {
    alignItems: "center",
    borderRadius: Radii.card,
    justifyContent: "center",
    marginTop: 32,
    minHeight: 280,
    padding: 28,
  },
  emptyTitle: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 25,
    fontWeight: "600",
    marginTop: 17,
  },
  eyebrow: {
    color: Palette.plum,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.1,
    lineHeight: 16,
  },
  intro: { marginTop: 0 },
  labelImage: { height: "94%", width: "94%" },
  labelStage: {
    alignItems: "center",
    borderRadius: 13,
    height: 102,
    justifyContent: "center",
    minWidth: 74,
    width: 74,
  },
  labelStageImage: { backgroundColor: Palette.white, ...Shadows.card },
  labelStagePlaceholder: { backgroundColor: Palette.white, ...Shadows.card },
  list: { gap: 10, marginTop: 32 },
  page: { maxWidth: 980, paddingHorizontal: 24, paddingTop: 0, width: "100%" },
  photoBadge: {
    alignItems: "center",
    backgroundColor: "rgba(26, 18, 22, 0.55)",
    borderRadius: 10,
    bottom: 6,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: 6,
    width: 20,
  },
  photoFrame: {
    borderRadius: 13,
    height: "100%",
    overflow: "hidden",
    width: "100%",
  },
  photoThumb: { height: "100%", width: "100%" },
  primaryButton: {
    alignItems: "center",
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 8,
    marginTop: 22,
    minHeight: 48,
    paddingHorizontal: 19,
  },
  primaryButtonText: { color: Palette.white, fontSize: 13, fontWeight: "700" },
  score: { color: Palette.plum, fontSize: 11, fontWeight: "700", marginTop: 4 },
  scrollContent: { alignItems: "center", paddingBottom: BottomTabInset + 96 },
  scrollView: { backgroundColor: "transparent", flex: 1 },
  statsCard: {
    backgroundColor: Palette.wineDark,
    borderRadius: Radii.sheet,
    flexDirection: "row",
    marginTop: 38,
    minHeight: 240,
    overflow: "hidden",
    padding: 25,
    ...Shadows.raised,
  },
  statsCopy: { flex: 1, justifyContent: "center", zIndex: 1 },
  statsCount: {
    color: Palette.white,
    fontFamily: Fonts.serif,
    fontSize: 72,
    fontWeight: "600",
    lineHeight: 78,
    marginTop: 4,
  },
  statsLabel: {
    color: Palette.lilac,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
  statsUnit: { color: "#CDBAC4", fontSize: 13, marginTop: -4 },
  subtitle: {
    color: Palette.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 14,
    maxWidth: 520,
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
  wineCard: {
    borderRadius: 22,
    boxShadow: "none",
    elevation: 0,
    minHeight: 116,
    padding: 12,
    shadowOpacity: 0,
    width: "100%",
  },
  wineCardContent: { flex: 1 },
  wineCardMain: {
    alignItems: "center",
    flexDirection: "row",
    gap: 13,
    width: "100%",
  },
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
