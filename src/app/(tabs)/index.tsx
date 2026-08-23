import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { AnimatedPressable } from "@/components/animated-pressable";
import { GlassSurface } from "@/components/glass-surface";
import { Icon } from "@/components/icon";
import { LabelScanModal } from "@/components/label-scan-modal";
import { MiniBottle } from "@/components/mini-bottle";
import { ScreenShell } from "@/components/screen-shell";
import { useTabHeaderSlotHeight } from "@/components/tab-screen-header";
import { WineCard } from "@/components/wine-card";
import {
  BottomTabInset,
  Fonts,
  Palette,
  Radii,
  Shadows,
} from "@/constants/theme";
import { useScrollToTopOnNavigate } from "@/hooks/use-scroll-to-top";
import { clearRecentViews, getRecentViews } from "@/services/wine-search";
import type { WineRecentView, WineSearchResult } from "@/types/wine";
import { confirmDelete } from "@/utils/confirm-delete";
import {
  openHomeSearchWithResults,
  requestHomeSearch,
} from "@/utils/search-intent";

function SectionHeading({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <AnimatedPressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={onAction}
          scaleTo={0.92}
          style={styles.sectionActionHit}
        >
          <Icon color={Palette.plum} name="trash" size={14} />
          <Text style={styles.sectionAction}>{action}</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

function RecentWineSlide({
  wine,
  onOpen,
}: {
  wine: WineRecentView;
  onOpen: (wine: WineSearchResult) => void;
}) {
  const handlePress = useCallback(() => onOpen(wine), [onOpen, wine]);
  return (
    <View style={styles.wineSlide}>
      <WineCard onPress={handlePress} wine={wine} />
    </View>
  );
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const headerSlotHeight = useTabHeaderSlotHeight();
  const router = useRouter();
  const scrollRef = useScrollToTopOnNavigate();
  const [recentWines, setRecentWines] = useState<WineRecentView[]>([]);
  const [scanOpen, setScanOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getRecentViews().then((storedViews) => {
        if (active) {
          setRecentWines(storedViews);
        }
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const handleOpenWine = useCallback(
    (wine: WineSearchResult) => {
      router.push({
        params: { id: wine.id },
        pathname: "/wine/[id]",
      });
    },
    [router]
  );

  const handleClearHistory = useCallback(async () => {
    const confirmed = await confirmDelete({
      confirmLabel: "Clear",
      title: "Clear recently viewed?",
    });
    if (!confirmed) {
      return;
    }
    await clearRecentViews();
    setRecentWines([]);
  }, []);

  const openScan = useCallback(() => setScanOpen(true), []);
  const closeScan = useCallback(() => setScanOpen(false), []);
  const openCellar = useCallback(() => router.push("/cellar"), [router]);

  return (
    <View style={styles.screen}>
      <ScreenShell>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <View style={styles.page}>
            <View style={{ height: headerSlotHeight }} />

            <View style={styles.intro}>
              <Text style={styles.eyebrow}>YOUR PERSONAL WINE INDEX</Text>
              <Text style={[styles.title, compact && styles.titleCompact]}>
                Find a bottle worth remembering.
              </Text>
              <Text style={styles.introBody}>
                Search the world of wine, scan a label, and keep every discovery
                close.
              </Text>
            </View>

            <GlassSurface isInteractive style={styles.searchField}>
              <AnimatedPressable
                accessibilityLabel="Search by wine, winery, or region"
                accessibilityRole="button"
                onPress={requestHomeSearch}
                scaleTo={0.99}
                style={styles.searchHit}
              >
                <Icon color={Palette.muted} name="search" size={21} />
                <Text numberOfLines={1} style={styles.searchPlaceholder}>
                  Search wine, winery, or region
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                accessibilityLabel="Scan a wine label"
                accessibilityRole="button"
                hitSlop={8}
                onPress={openScan}
                style={styles.cameraButton}
              >
                <Icon color={Palette.white} name="camera" size={18} />
              </AnimatedPressable>
            </GlassSurface>

            <View
              style={[
                styles.discoveryCard,
                compact && styles.discoveryCardCompact,
              ]}
            >
              <View
                style={[
                  styles.discoveryMain,
                  compact && styles.discoveryMainCompact,
                ]}
              >
                <View style={styles.discoveryCopy}>
                  <View style={styles.featureTag}>
                    <View style={styles.featureDot} />
                    <Text style={styles.featureTagText}>LABEL RECOGNITION</Text>
                  </View>
                  <Text style={styles.discoveryTitle}>
                    Point. Capture. Discover.
                  </Text>
                  <Text style={styles.discoveryBody}>
                    Photograph a label to uncover its vintage, grapes, producer,
                    and story in seconds.
                  </Text>
                </View>
                <View
                  style={[
                    styles.discoveryVisual,
                    compact && styles.discoveryVisualCompact,
                  ]}
                >
                  <View style={styles.focusCornerTopLeft} />
                  <View style={styles.focusCornerTopRight} />
                  <MiniBottle height={138} />
                </View>
              </View>
              <AnimatedPressable
                accessibilityRole="button"
                onPress={openScan}
                scaleTo={0.985}
                style={styles.scanButton}
              >
                <Icon color={Palette.wine} name="camera" size={19} />
                <Text style={styles.scanButtonText}>Scan a label</Text>
              </AnimatedPressable>
            </View>

            <View style={styles.section}>
              <SectionHeading
                action={recentWines.length > 0 ? "Clear" : undefined}
                onAction={handleClearHistory}
                title="Recently viewed"
              />
              {recentWines.length > 0 ? (
                <ScrollView
                  contentContainerStyle={styles.wineList}
                  directionalLockEnabled
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  style={styles.wineScroller}
                >
                  {recentWines.map((wine) => (
                    <RecentWineSlide
                      key={wine.id}
                      onOpen={handleOpenWine}
                      wine={wine}
                    />
                  ))}
                </ScrollView>
              ) : (
                <GlassSurface style={styles.emptyHistory}>
                  <Text style={styles.emptyHistoryText}>
                    Wines you open will stay here for a quick return.
                  </Text>
                </GlassSurface>
              )}
            </View>

            <GlassSurface
              style={[styles.cellarCard, compact && styles.cellarCardCompact]}
            >
              <View style={styles.cellarIcon}>
                <Icon color={Palette.wine} name="wineGlass" size={26} />
              </View>
              <View style={styles.cellarContent}>
                <Text style={styles.cellarEyebrow}>YOUR CELLAR</Text>
                <Text style={styles.cellarTitle}>
                  Build a collection with intention
                </Text>
                <Text style={styles.cellarBody}>
                  Keep the bottles you love organized in one quiet place.
                </Text>
              </View>
              <AnimatedPressable
                accessibilityLabel="Open my cellar"
                accessibilityRole="button"
                onPress={openCellar}
                scaleTo={0.94}
                style={styles.cellarAction}
              >
                <Text style={styles.cellarActionText}>View cellar</Text>
                <Icon color={Palette.wine} name="arrowRight" size={17} />
              </AnimatedPressable>
            </GlassSurface>
          </View>
        </ScrollView>
      </ScreenShell>
      <LabelScanModal
        onClose={closeScan}
        onIdentified={openHomeSearchWithResults}
        visible={scanOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cameraButton: {
    alignItems: "center",
    backgroundColor: Palette.wine,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
    ...Shadows.button,
  },
  cellarAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingLeft: 14,
    paddingVertical: 10,
  },
  cellarActionText: { color: Palette.wine, fontSize: 13, fontWeight: "700" },
  cellarBody: {
    color: Palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  cellarCard: {
    alignItems: "center",
    borderRadius: Radii.card,
    flexDirection: "row",
    marginTop: 42,
    minHeight: 142,
    padding: 26,
  },
  cellarCardCompact: { alignItems: "flex-start", flexWrap: "wrap", rowGap: 18 },
  cellarContent: { flex: 1, minWidth: 180 },
  cellarEyebrow: {
    color: Palette.plum,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.7,
    lineHeight: 14,
  },
  cellarIcon: {
    alignItems: "center",
    backgroundColor: Palette.lilac,
    borderRadius: 18,
    height: 58,
    justifyContent: "center",
    marginRight: 17,
    width: 58,
  },
  cellarTitle: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 21,
    fontWeight: "600",
    lineHeight: 27,
    marginTop: 2,
  },
  discoveryBody: {
    color: "#D8C6CF",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 11,
    maxWidth: 470,
  },
  discoveryCard: {
    backgroundColor: Palette.wineDark,
    borderRadius: Radii.sheet,
    gap: 20,
    overflow: "hidden",
    padding: 38,
    ...Shadows.raised,
  },
  discoveryCardCompact: { padding: 25 },
  discoveryCopy: { flex: 1, justifyContent: "center", zIndex: 1 },
  discoveryMain: { alignItems: "stretch", flexDirection: "row", gap: 28 },
  discoveryMainCompact: { flexDirection: "column", gap: 24 },
  discoveryTitle: {
    color: Palette.white,
    fontFamily: Fonts.serif,
    fontSize: 34,
    fontWeight: "600",
    letterSpacing: -0.6,
    lineHeight: 39,
  },
  discoveryVisual: {
    alignItems: "center",
    backgroundColor: Palette.wineInset,
    borderColor: Palette.plum,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minHeight: 220,
    minWidth: 250,
    overflow: "hidden",
    width: "32%",
  },
  discoveryVisualCompact: { height: 202, minWidth: 0, width: "100%" },
  emptyHistory: {
    alignItems: "center",
    borderRadius: 22,
    justifyContent: "center",
    minHeight: 96,
    padding: 20,
  },
  emptyHistoryText: {
    color: Palette.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  eyebrow: {
    color: Palette.plum,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.2,
    lineHeight: 16,
  },
  featureDot: {
    backgroundColor: Palette.lilac,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  featureTag: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginBottom: 15,
  },
  featureTagText: {
    color: Palette.lilac,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.7,
  },
  focusCornerTopLeft: {
    borderColor: Palette.white,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    height: 22,
    left: 14,
    position: "absolute",
    top: 14,
    width: 22,
  },
  focusCornerTopRight: {
    borderColor: Palette.white,
    borderRightWidth: 2,
    borderTopWidth: 2,
    height: 22,
    position: "absolute",
    right: 14,
    top: 14,
    width: 22,
  },
  intro: { marginBottom: 30, marginTop: 0 },
  introBody: {
    color: Palette.muted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 14,
    maxWidth: 590,
  },
  page: { maxWidth: 1160, paddingHorizontal: 24, paddingTop: 0, width: "100%" },
  scanButton: {
    alignItems: "center",
    backgroundColor: Palette.white,
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 52,
    width: "100%",
    ...Shadows.card,
  },
  scanButtonText: { color: Palette.wine, fontSize: 15, fontWeight: "800" },
  screen: { flex: 1 },
  scrollContent: { alignItems: "center", paddingBottom: BottomTabInset + 96 },
  scrollView: { backgroundColor: "transparent", flex: 1 },
  searchField: {
    alignItems: "center",
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 12,
    height: 56,
    marginBottom: 20,
    paddingLeft: 18,
    paddingRight: 8,
    width: "100%",
  },
  searchHit: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
    height: "100%",
  },
  searchPlaceholder: { color: Palette.muted, flex: 1, fontSize: 16 },
  section: { marginTop: 42, maxWidth: "100%", minWidth: 0, width: "100%" },
  sectionAction: { color: Palette.plum, fontSize: 13, fontWeight: "700" },
  sectionActionHit: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    paddingVertical: 4,
  },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  sectionTitle: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 27,
    fontWeight: "600",
    letterSpacing: -0.3,
    lineHeight: 33,
  },
  title: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 50,
    fontWeight: "600",
    letterSpacing: -1.5,
    lineHeight: 55,
    marginTop: 10,
    maxWidth: 780,
  },
  titleCompact: { fontSize: 39, letterSpacing: -1, lineHeight: 44 },
  wineList: {
    gap: 16,
    paddingHorizontal: 12,
    paddingRight: 36,
    paddingVertical: 12,
  },
  wineScroller: {
    marginHorizontal: -12,
    maxWidth: "100%",
    minWidth: 0,
    overflow: "visible",
    width: "100%",
  },
  wineSlide: { paddingVertical: 2 },
});
