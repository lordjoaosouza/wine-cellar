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
import { WineThumbnail } from "@/components/wine-thumbnail";
import {
  BottomTabInset,
  Fonts,
  Palette,
  Radii,
  Shadows,
} from "@/constants/theme";
import { useScrollToTopOnNavigate } from "@/hooks/use-scroll-to-top";
import { getWishlist, removeFromWishlist } from "@/services/wine-wishlist";
import type { WineWishlistItem } from "@/types/wine";
import { requestHomeSearch } from "@/utils/search-intent";
import { wineOrigin, wineVintageDetails } from "@/utils/wine-format";

function WishlistRow({
  wine,
  exclusiveRef,
  onOpen,
  onRemove,
}: {
  wine: WineWishlistItem;
  exclusiveRef: SwipeDeleteExclusiveRef;
  onOpen: (wine: WineWishlistItem) => void;
  onRemove: (id: string) => Promise<void>;
}) {
  const handlePress = useCallback(() => onOpen(wine), [onOpen, wine]);
  const handleDelete = useCallback(() => {
    void onRemove(wine.id);
  }, [onRemove, wine.id]);

  return (
    <SwipeDeleteRow
      accessibilityLabel={`Remove ${wine.name} from wishlist`}
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
          </View>
        </AnimatedPressable>
      </GlassSurface>
    </SwipeDeleteRow>
  );
}

export default function WishlistScreen() {
  const router = useRouter();
  const scrollRef = useScrollToTopOnNavigate();
  const headerSlotHeight = useTabHeaderSlotHeight();
  const [items, setItems] = useState<WineWishlistItem[]>([]);
  const openSwipeRef = useRef<SwipeDeleteExclusiveRef["current"]>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getWishlist().then((saved) => {
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
    (wine: WineWishlistItem) => {
      router.push({
        params: { id: wine.id },
        pathname: "/wine/[id]",
      });
    },
    [router]
  );

  const handleRemove = useCallback(async (id: string) => {
    const next = await removeFromWishlist(id);
    setItems(next);
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
            <Text style={styles.eyebrow}>BOTTLES TO SEEK</Text>
            <Text style={styles.title}>Wines you’re still chasing.</Text>
            <Text style={styles.subtitle}>
              Save the labels you want to find, taste, or bring home, and come
              back when the moment is right.
            </Text>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statsCopy}>
              <Text style={styles.statsLabel}>ON YOUR LIST</Text>
              <Text style={styles.statsCount}>{items.length}</Text>
              <Text style={styles.statsUnit}>
                {items.length === 1 ? "Bottle" : "Bottles"}
              </Text>
            </View>
            <View style={styles.bottleShelf}>
              <BottleShelf />
            </View>
          </View>

          {items.length > 0 ? (
            <View style={styles.list}>
              {items.map((wine) => (
                <WishlistRow
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
                <Icon color={Palette.wine} name="bookmark" size={24} />
              </View>
              <Text style={styles.emptyTitle}>Your list is empty</Text>
              <Text style={styles.emptyBody}>
                Open a wine profile and save the first bottle you want to find.
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
