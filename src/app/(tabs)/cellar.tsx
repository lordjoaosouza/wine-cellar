import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import { AnimatedPressable } from "@/components/animated-pressable";
import { CellarClimateCard } from "@/components/cellar-climate-card";
import { GlassSurface } from "@/components/glass-surface";
import { Icon } from "@/components/icon";
import { BottleShelf } from "@/components/mini-bottle";
import { ScreenShell } from "@/components/screen-shell";
import {
  type SwipeDeleteExclusiveRef,
  SwipeDeleteRow,
} from "@/components/swipe-delete-row";
import { useTabHeaderSlotHeight } from "@/components/tab-screen-header";
import { WineThumbnail } from "@/components/wine-thumbnail";
import {
  BottomTabInset,
  Fonts,
  Palette,
  Radii,
  Shadows,
} from "@/constants/theme";
import { useScrollToTopOnNavigate } from "@/hooks/use-scroll-to-top";
import {
  cellarBottleCount,
  getCellar,
  removeFromCellar,
} from "@/services/wine-cellar";
import type { WineCellarItem } from "@/types/wine";
import { requestHomeSearch } from "@/utils/search-intent";
import { wineOrigin, wineVintageDetails } from "@/utils/wine-format";

function CellarRow({
  wine,
  exclusiveRef,
  onOpen,
  onRemove,
}: {
  wine: WineCellarItem;
  exclusiveRef: SwipeDeleteExclusiveRef;
  onOpen: (wine: WineCellarItem) => void;
  onRemove: (id: string) => Promise<void>;
}) {
  const handlePress = useCallback(() => onOpen(wine), [onOpen, wine]);
  const handleDelete = useCallback(() => {
    void onRemove(wine.id);
  }, [onRemove, wine.id]);

  return (
    <SwipeDeleteRow
      accessibilityLabel={`Remove ${wine.name} from cellar`}
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
            <Text style={styles.wineQuantity}>
              {wine.quantity} {wine.quantity === 1 ? "bottle" : "bottles"}
            </Text>
          </View>
        </AnimatedPressable>
      </GlassSurface>
    </SwipeDeleteRow>
  );
}

export default function CellarScreen() {
  const router = useRouter();
  const scrollRef = useScrollToTopOnNavigate();
  const headerSlotHeight = useTabHeaderSlotHeight();
  const [items, setItems] = useState<WineCellarItem[]>([]);
  const openSwipeRef = useRef<SwipeDeleteExclusiveRef["current"]>(null);
  const bottles = cellarBottleCount(items);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getCellar().then((saved) => {
        if (active) {
          setItems(saved);
        }
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const handleOpenWine = useCallback(
    (wine: WineCellarItem) => {
      router.push({ params: { id: wine.id }, pathname: "/wine/[id]" });
    },
    [router]
  );

  const handleRemove = useCallback(async (id: string) => {
    setItems(await removeFromCellar(id));
  }, []);

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
            <Text style={styles.eyebrow}>YOUR PRIVATE COLLECTION</Text>
            <Text style={styles.title}>Bottles worth remembering.</Text>
            <Text style={styles.subtitle}>
              Save the wines you love and let your collection take shape over
              time.
            </Text>
          </View>

          <View style={styles.collectionCard}>
            <View style={styles.collectionCopy}>
              <Text style={styles.collectionLabel}>IN YOUR CELLAR</Text>
              <Text style={styles.collectionCount}>{bottles}</Text>
              <Text style={styles.collectionUnit}>
                {bottles === 1 ? "Bottle" : "Bottles"}
              </Text>
            </View>
            <View style={styles.bottleShelf}>
              <BottleShelf />
            </View>
          </View>

          <CellarClimateCard />

          {items.length > 0 ? (
            <View style={styles.list}>
              {items.map((wine) => (
                <CellarRow
                  exclusiveRef={openSwipeRef}
                  key={wine.id}
                  onOpen={handleOpenWine}
                  onRemove={handleRemove}
                  wine={wine}
                />
              ))}
            </View>
          ) : (
            <GlassSurface style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon color={Palette.wine} name="plus" size={24} />
              </View>
              <Text style={styles.emptyTitle}>Your cellar is ready</Text>
              <Text style={styles.emptyBody}>
                Open a wine profile and add the first bottle you want to
                remember.
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
  collectionCard: {
    backgroundColor: Palette.wineDark,
    borderRadius: Radii.sheet,
    flexDirection: "row",
    marginTop: 38,
    minHeight: 240,
    overflow: "hidden",
    padding: 25,
    ...Shadows.raised,
  },
  collectionCopy: { flex: 1, justifyContent: "center", zIndex: 1 },
  collectionCount: {
    color: Palette.white,
    fontFamily: Fonts.serif,
    fontSize: 72,
    fontWeight: "600",
    lineHeight: 78,
    marginTop: 4,
  },
  collectionLabel: {
    color: Palette.lilac,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
  collectionUnit: { color: "#CDBAC4", fontSize: 13, marginTop: -4 },
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
  list: { gap: 10, marginTop: 32 },
  page: { maxWidth: 980, paddingHorizontal: 24, paddingTop: 0, width: "100%" },
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
  scrollContent: { alignItems: "center", paddingBottom: BottomTabInset + 96 },
  scrollView: { backgroundColor: "transparent", flex: 1 },
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
  wineQuantity: {
    color: Palette.plum,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 4,
  },
});
