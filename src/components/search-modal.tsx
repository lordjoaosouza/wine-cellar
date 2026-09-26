import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/animated-pressable";
import { ChromeCloseButton } from "@/components/chrome-close-button";
import { GlassSurface } from "@/components/glass-surface";
import { Icon } from "@/components/icon";
import { LabelScanModal } from "@/components/label-scan-modal";
import { ModalShell } from "@/components/modal-shell";
import { WineCard } from "@/components/wine-card";
import {
  Fonts,
  Palette,
  paragraphLeading,
  Radii,
  Shadows,
} from "@/constants/theme";
import { ResearchUnavailableError, searchWines } from "@/services/wine-search";
import type { WineSearchResult } from "@/types/wine";
import {
  setHomeSearchOpen,
  subscribeHomeSearchOpen,
  takePendingHomeSearchPreset,
} from "@/utils/search-intent";

const MIN_QUERY_LENGTH = 3;

const SEARCH_PHASES = [
  "Checking your cellar's catalog…",
  "Asking the sommelier…",
];
const PHASE_INTERVAL_MS = 1800;

function useShimmer(delay = 0) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 700 }),
          withTiming(0, { duration: 700 })
        ),
        -1,
        true
      )
    );
  }, [delay, pulse]);
  return useAnimatedStyle(() => ({ opacity: 0.35 + pulse.value * 0.4 }));
}

function SkeletonCard({ delay }: { delay: number }) {
  const shimmerStyle = useShimmer(delay);
  return (
    <Animated.View style={[styles.skeletonCard, shimmerStyle]}>
      <View style={styles.skeletonThumb} />
      <View style={styles.skeletonLines}>
        <View style={[styles.skeletonLine, { width: "70%" }]} />
        <View style={[styles.skeletonLine, { width: "45%" }]} />
        <View style={[styles.skeletonLine, { width: "55%" }]} />
      </View>
    </Animated.View>
  );
}

function SearchingState({ stage }: { stage: string | null }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const iconPulse = useSharedValue(0);

  useEffect(() => {
    iconPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0, { duration: 700 })
      ),
      -1,
      true
    );
  }, [iconPulse]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhaseIndex((current) => (current + 1) % SEARCH_PHASES.length);
    }, PHASE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + iconPulse.value * 0.6,
    transform: [{ scale: 0.94 + iconPulse.value * 0.06 }],
  }));

  return (
    <View>
      <View style={styles.searchingHeader}>
        <Animated.View style={iconStyle}>
          <Icon color={Palette.wine} name="wineGlass" size={32} />
        </Animated.View>
        <Text style={styles.stateTitle}>Searching…</Text>
        <Text style={styles.stateBody}>
          {stage ? `${stage}…` : SEARCH_PHASES[phaseIndex]}
        </Text>
        {stage ? (
          <Text style={styles.stateHint}>
            New wines are researched on the web by your server's AI — this can
            take a minute or two per wine.
          </Text>
        ) : null}
      </View>
      <View style={styles.skeletonList}>
        <SkeletonCard delay={0} />
        <SkeletonCard delay={120} />
        <SkeletonCard delay={240} />
      </View>
    </View>
  );
}

function SearchResultCard({
  wine,
  onOpen,
}: {
  wine: WineSearchResult;
  onOpen: (wine: WineSearchResult) => void;
}) {
  const handlePress = useCallback(() => onOpen(wine), [onOpen, wine]);
  return <WineCard fullWidth onPress={handlePress} wine={wine} />;
}

function SearchModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WineSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const reset = useCallback(() => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setLoading(false);
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (!visible) {
      reset();
      setScanOpen(false);
      return;
    }

    const preset = takePendingHomeSearchPreset();
    if (preset) {
      setQuery(preset.label);
      setResults(preset.results);
      setHasSearched(true);
      setFeedback(
        preset.results.length === 0
          ? "Couldn't identify a wine from that label. Try typing what you can read instead."
          : null
      );
      return;
    }

    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [reset, visible]);

  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setFeedback(`Enter at least ${MIN_QUERY_LENGTH} characters to search.`);
      return;
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    setLoading(true);
    setStage(null);
    setFeedback(null);
    try {
      const response = await searchWines(trimmed, (next) => {
        if (requestIdRef.current === requestId) {
          setStage(next);
        }
      });
      if (requestIdRef.current !== requestId) {
        return;
      }
      setResults(response.results);
      setHasSearched(true);
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }
      setResults([]);
      setHasSearched(true);
      setFeedback(
        error instanceof ResearchUnavailableError
          ? "The AI model on your server isn't running. Start Ollama and try again."
          : "Couldn't reach the sommelier — check your connection and try again."
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  const handleScanIdentified = useCallback(
    (preset: { label: string; results: WineSearchResult[] }) => {
      setQuery(preset.label);
      setResults(preset.results);
      setHasSearched(true);
      setFeedback(
        preset.results.length === 0
          ? "Couldn't identify a wine from that label. Try typing what you can read instead."
          : null
      );
    },
    []
  );

  const handleOpenWine = useCallback(
    (wine: WineSearchResult) => {
      onClose();
      router.push({
        params: { id: wine.id },
        pathname: "/wine/[id]",
      });
    },
    [onClose, router]
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (feedback) {
        setFeedback(null);
      }
    },
    [feedback]
  );

  const handleSubmitSearch = useCallback(() => {
    void runSearch(query);
  }, [runSearch, query]);

  const handleClearQuery = useCallback(() => setQuery(""), []);

  const handleOpenScan = useCallback(() => {
    Keyboard.dismiss();
    setScanOpen(true);
  }, []);

  const closeScan = useCallback(() => setScanOpen(false), []);

  const panel = (
    <SafeAreaProvider>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.screen}
      >
        <SafeAreaView
          edges={["top", "bottom", "left", "right"]}
          style={styles.safe}
        >
          <View style={styles.top}>
            <View style={styles.topRow}>
              <View style={styles.headingBlock}>
                <Text style={styles.eyebrow}>FIND A BOTTLE</Text>
                <Text style={styles.heading}>Search</Text>
              </View>
              <ChromeCloseButton
                accessibilityLabel="Close search"
                onPress={onClose}
                style={styles.closeWrap}
              />
            </View>

            <GlassSurface isInteractive style={styles.field}>
              <Icon color={Palette.muted} name="search" size={21} />
              <TextInput
                accessibilityLabel="Search by wine, winery, or region"
                autoCapitalize="words"
                autoCorrect={false}
                autoFocus
                onChangeText={handleQueryChange}
                onSubmitEditing={handleSubmitSearch}
                placeholder="Wine, winery, or region"
                placeholderTextColor={Palette.muted}
                ref={inputRef}
                returnKeyType="search"
                selectionColor={Palette.wine}
                style={styles.input}
                underlineColorAndroid="transparent"
                value={query}
              />
              {query.length > 0 ? (
                <AnimatedPressable
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={handleClearQuery}
                  scaleTo={0.85}
                  style={styles.clear}
                >
                  <Icon color={Palette.white} name="close" size={12} />
                </AnimatedPressable>
              ) : null}
              <AnimatedPressable
                accessibilityLabel="Scan a wine label"
                accessibilityRole="button"
                hitSlop={8}
                onPress={handleOpenScan}
                style={styles.cameraButton}
              >
                <Icon color={Palette.white} name="camera" size={18} />
              </AnimatedPressable>
            </GlassSurface>
          </View>

          <ScrollView
            contentContainerStyle={styles.resultsContent}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            style={styles.results}
          >
            {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

            {loading ? <SearchingState stage={stage} /> : null}

            {!loading && hasSearched && results.length > 0 ? (
              <View style={styles.list}>
                <Text style={styles.count}>
                  {results.length} {results.length === 1 ? "result" : "results"}
                </Text>
                {results.map((wine) => (
                  <SearchResultCard
                    key={wine.id}
                    onOpen={handleOpenWine}
                    wine={wine}
                  />
                ))}
              </View>
            ) : null}

            {!loading && hasSearched && results.length === 0 && !feedback ? (
              <View style={styles.state}>
                <Icon color={Palette.placeholderDark} name="search" size={24} />
                <Text style={styles.stateTitle}>No wines found</Text>
                <Text style={styles.stateBody}>
                  Try a producer, region, or the wine name without its vintage.
                </Text>
              </View>
            ) : null}

            {loading || hasSearched || feedback ? null : (
              <View style={styles.state}>
                <Icon color={Palette.lilac} name="wineGlass" size={28} />
                <Text style={styles.stateTitle}>Find a bottle</Text>
                <Text style={styles.stateBody}>
                  Type a wine, winery, or region.
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );

  return (
    <ModalShell
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
      visible={visible}
      webOverlayStyle={styles.webOverlay}
    >
      {panel}
      <LabelScanModal
        onClose={closeScan}
        onIdentified={handleScanIdentified}
        visible={scanOpen}
      />
    </ModalShell>
  );
}

function closeHomeSearch() {
  setHomeSearchOpen(false);
}

export function SearchModalHost() {
  const [visible, setVisible] = useState(false);

  useEffect(() => subscribeHomeSearchOpen(setVisible), []);

  return <SearchModal onClose={closeHomeSearch} visible={visible} />;
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
  clear: {
    alignItems: "center",
    backgroundColor: Palette.placeholderDark,
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  closeWrap: { marginTop: 8 },
  count: {
    color: Palette.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  eyebrow: {
    color: Palette.plum,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.2,
    lineHeight: 16,
  },
  feedback: { color: Palette.muted, fontSize: 12, lineHeight: 18 },
  field: {
    alignItems: "center",
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 12,
    height: 56,
    paddingLeft: 18,
    paddingRight: 8,
  },
  heading: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 34,
    fontWeight: "600",
    lineHeight: 40,
  },
  headingBlock: { flex: 1, gap: 6 },
  input: {
    backgroundColor: "transparent",
    color: Palette.ink,
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  list: { gap: 10 },
  results: { flex: 1 },
  resultsContent: { gap: 12, paddingBottom: 40, paddingHorizontal: 24 },
  safe: { flex: 1 },
  screen: { backgroundColor: Palette.white, flex: 1 },
  searchingHeader: {
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  skeletonCard: {
    alignItems: "center",
    backgroundColor: Palette.surface,
    borderRadius: 22,
    flexDirection: "row",
    gap: 13,
    minHeight: 116,
    padding: 12,
    width: "100%",
  },
  skeletonLine: {
    backgroundColor: Palette.placeholder,
    borderRadius: 6,
    height: 12,
  },
  skeletonLines: { flex: 1, gap: 8 },
  skeletonList: { gap: 10 },
  skeletonThumb: {
    backgroundColor: Palette.placeholder,
    borderRadius: 13,
    height: 92,
    width: 74,
  },
  state: {
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  stateBody: {
    color: Palette.muted,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 280,
    textAlign: "center",
  },
  stateHint: {
    color: Palette.muted,
    fontSize: 12,
    lineHeight: paragraphLeading(18),
    marginTop: 10,
    maxWidth: 280,
    textAlign: "center",
  },
  stateTitle: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 22,
    fontWeight: "600",
    marginTop: 8,
  },
  top: { gap: 16, paddingBottom: 16, paddingHorizontal: 24, paddingTop: 12 },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  webOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Palette.white,
    zIndex: 1000,
  },
});
