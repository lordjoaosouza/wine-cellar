import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { AnimatedPressable } from "@/components/animated-pressable";
import { CellarQuantityModal } from "@/components/cellar-quantity-modal";
import { GlassSurface } from "@/components/glass-surface";
import { Icon, type IconName } from "@/components/icon";
import { ScreenShell } from "@/components/screen-shell";
import { WineIllustration } from "@/components/wine-illustration";
import { WineRatingModal } from "@/components/wine-rating-modal";
import {
  Fonts,
  Palette,
  paragraphLeading,
  Radii,
  Shadows,
} from "@/constants/theme";
import { useScrollToTopOnNavigate } from "@/hooks/use-scroll-to-top";
import {
  addToCellar,
  getCellarItem,
  removeFromCellar,
} from "@/services/wine-cellar";
import { getRating } from "@/services/wine-ratings";
import {
  getWineDetails,
  ResearchUnavailableError,
  refreshWine,
  saveRecentView,
} from "@/services/wine-search";
import { isOnWishlist, toggleWishlist } from "@/services/wine-wishlist";
import type { WineDetail, WineOffer, WineRating } from "@/types/wine";
import { haptics } from "@/utils/haptics";
import { formatOfferAmount, storeDomain } from "@/utils/wine-format";

function GrapeChip({ grape }: { grape: string }) {
  return (
    <View style={styles.chip}>
      <Icon color={Palette.plum} name="grape" size={16} />
      <Text style={styles.chipText}>{grape}</Text>
    </View>
  );
}

function RefreshIcon({
  spinning,
  color,
}: {
  spinning: boolean;
  color: string;
}) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (spinning) {
      rotation.value = withRepeat(
        withSequence(
          withTiming(360, { duration: 900 }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
  }, [rotation, spinning]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Icon color={color} name="refresh" size={19} />
    </Animated.View>
  );
}

function SectionHeader({
  eyebrow,
  title,
  icon,
}: {
  eyebrow: string;
  title: string;
  icon?: IconName;
}) {
  return (
    <>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <View style={styles.sectionTitleRow}>
        {icon ? <Icon color={Palette.wine} name={icon} size={20} /> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
    </>
  );
}

function WineLabelStage({
  detail,
  compact,
  heroImageUrl,
  onImageError,
}: {
  detail: WineDetail;
  compact: boolean;
  heroImageUrl: string | null;
  onImageError: () => void;
}) {
  return (
    <View
      style={[
        styles.labelStage,
        compact && styles.labelStageCompact,
        !heroImageUrl && styles.labelStagePlaceholder,
      ]}
    >
      {heroImageUrl ? (
        <View style={styles.labelImageFrame}>
          <Image
            accessibilityLabel={`Label for ${detail.name}`}
            contentFit="contain"
            onError={onImageError}
            source={{ uri: heroImageUrl }}
            style={styles.labelImage}
            transition={250}
          />
        </View>
      ) : (
        <WineIllustration fill type={detail.type} />
      )}
    </View>
  );
}

function WineHeroInfo({
  detail,
  compact,
}: {
  detail: WineDetail;
  compact: boolean;
}) {
  return (
    <>
      <Text style={styles.eyebrow}>
        {(detail.type ?? "Wine").toUpperCase()}
      </Text>
      <Text style={[styles.title, compact && styles.titleCompact]}>
        {detail.name}
      </Text>
      <Text style={styles.vintage}>
        {detail.vintage ?? "Vintage not listed"}
      </Text>

      {detail.price ? (
        <View style={styles.priceBlock}>
          <Text style={styles.producerLabel}>PRICE</Text>
          <Text style={styles.producerName}>{detail.price}</Text>
          {detail.priceMarket === "INTERNATIONAL" ? (
            <Text style={styles.priceHint}>
              From stores abroad, converted to reais
            </Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.producerBlock,
          detail.price && styles.producerBlockSpaced,
        ]}
      >
        <Text style={styles.producerLabel}>PRODUCER</Text>
        <Text numberOfLines={1} style={styles.producerName}>
          {detail.winery ?? "Not listed"}
        </Text>
      </View>

      {detail.region || detail.country ? (
        <View style={styles.locationRow}>
          <Icon color={Palette.plum} name="mapPin" size={16} />
          <Text style={styles.locationText}>
            {[detail.region, detail.country].filter(Boolean).join(", ")}
          </Text>
        </View>
      ) : null}

      {detail.grapes.length > 0 ? (
        <View style={styles.heroGrapes}>
          {detail.grapes.map((grape) => (
            <GrapeChip grape={grape} key={grape} />
          ))}
        </View>
      ) : null}
    </>
  );
}

function WineHeroActions({
  cellarQuantity,
  savedToWishlist,
  rating,
  onOpenCellar,
  onToggleWishlist,
  onOpenRating,
}: {
  cellarQuantity: number;
  savedToWishlist: boolean;
  rating: WineRating | null;
  onOpenCellar: () => void;
  onToggleWishlist: () => void;
  onOpenRating: () => void;
}) {
  return (
    <View style={styles.actions}>
      <AnimatedPressable accessibilityRole="button" onPress={onOpenCellar}>
        <GlassSurface
          isInteractive
          style={styles.cellarButton}
          tintColor={Palette.wine}
        >
          <Icon
            color={Palette.white}
            name={cellarQuantity > 0 ? "check" : "plus"}
            size={20}
          />
          <Text style={styles.cellarButtonText}>
            {cellarQuantity > 0
              ? `${cellarQuantity} in my cellar`
              : "Add to my cellar"}
          </Text>
        </GlassSurface>
      </AnimatedPressable>

      <View style={styles.secondaryRow}>
        <AnimatedPressable
          accessibilityLabel={
            savedToWishlist ? "Remove from wishlist" : "Save to wishlist"
          }
          accessibilityRole="button"
          onPress={onToggleWishlist}
          style={styles.halfAction}
        >
          <GlassSurface isInteractive style={styles.halfButton}>
            <Icon
              color={Palette.wine}
              name={savedToWishlist ? "bookmarkFilled" : "bookmark"}
              size={18}
            />
            <Text numberOfLines={1} style={styles.halfButtonText}>
              {savedToWishlist ? "Saved" : "Wishlist"}
            </Text>
          </GlassSurface>
        </AnimatedPressable>

        <AnimatedPressable
          accessibilityLabel={
            rating
              ? `Edit tasting, currently ${rating.score.toFixed(1)}`
              : "Rate this wine"
          }
          accessibilityRole="button"
          onPress={onOpenRating}
          style={styles.halfAction}
        >
          <GlassSurface isInteractive style={styles.halfButton}>
            <Icon
              color={Palette.wine}
              name={rating ? "starFilled" : "star"}
              size={18}
            />
            <Text numberOfLines={1} style={styles.halfButtonText}>
              {rating ? rating.score.toFixed(1) : "Rate wine"}
            </Text>
          </GlassSurface>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function WineHero({
  detail,
  compact,
  heroImageUrl,
  cellarQuantity,
  savedToWishlist,
  rating,
  onImageError,
  onOpenCellar,
  onToggleWishlist,
  onOpenRating,
}: {
  detail: WineDetail;
  compact: boolean;
  heroImageUrl: string | null;
  cellarQuantity: number;
  savedToWishlist: boolean;
  rating: WineRating | null;
  onImageError: () => void;
  onOpenCellar: () => void;
  onToggleWishlist: () => void;
  onOpenRating: () => void;
}) {
  return (
    <GlassSurface style={[styles.hero, compact && styles.heroCompact]}>
      <WineLabelStage
        compact={compact}
        detail={detail}
        heroImageUrl={heroImageUrl}
        onImageError={onImageError}
      />
      <View style={styles.heroContent}>
        <WineHeroInfo compact={compact} detail={detail} />
        <WineHeroActions
          cellarQuantity={cellarQuantity}
          onOpenCellar={onOpenCellar}
          onOpenRating={onOpenRating}
          onToggleWishlist={onToggleWishlist}
          rating={rating}
          savedToWishlist={savedToWishlist}
        />
      </View>
    </GlassSurface>
  );
}

function TastingNotesSection({ notes }: { notes: string | null }) {
  if (!notes) {
    return null;
  }
  return (
    <View style={styles.section}>
      <SectionHeader eyebrow="TASTING NOTES" title="The profile" />
      <Text style={styles.description}>{notes}</Text>
    </View>
  );
}

function ProducerSection({ profile }: { profile: string | null }) {
  if (!profile) {
    return null;
  }
  return (
    <View style={styles.section}>
      <SectionHeader
        eyebrow="THE PRODUCER"
        icon="building"
        title="Behind the label"
      />
      <Text style={styles.description}>{profile}</Text>
    </View>
  );
}

function RegionSection({ profile }: { profile: string | null }) {
  if (!profile) {
    return null;
  }
  return (
    <View style={styles.section}>
      <SectionHeader eyebrow="THE REGION" icon="map" title="Where it's from" />
      <Text style={styles.description}>{profile}</Text>
    </View>
  );
}

function ServingAgingSection({
  servingNotes,
  agingNotes,
}: {
  servingNotes: string | null;
  agingNotes: string | null;
}) {
  if (!(servingNotes || agingNotes)) {
    return null;
  }
  return (
    <View style={styles.section}>
      <SectionHeader eyebrow="IN THE GLASS" title="Serving & aging" />
      <GlassSurface style={styles.serveCard}>
        {servingNotes ? (
          <View style={[styles.serveRow, agingNotes && styles.serveRowBorder]}>
            <View style={styles.serveIcon}>
              <Icon color={Palette.plum} name="thermometer" size={18} />
            </View>
            <Text style={styles.serveText}>{servingNotes}</Text>
          </View>
        ) : null}
        {agingNotes ? (
          <View style={styles.serveRow}>
            <View style={styles.serveIcon}>
              <Icon color={Palette.plum} name="hourglass" size={18} />
            </View>
            <Text style={styles.serveText}>{agingNotes}</Text>
          </View>
        ) : null}
      </GlassSurface>
    </View>
  );
}

function PairingSection({ pairings }: { pairings: string[] }) {
  if (pairings.length === 0) {
    return null;
  }
  return (
    <View style={styles.section}>
      <SectionHeader eyebrow="FOOD PAIRING" icon="fork" title="Pair it with" />
      <View style={styles.pairingList}>
        {pairings.map((food) => (
          <GlassSurface key={food} style={styles.pairingItem}>
            <View style={styles.pairingBullet} />
            <Text style={styles.pairingFood}>{food}</Text>
          </GlassSurface>
        ))}
      </View>
    </View>
  );
}

function OfferRow({ offer, last }: { offer: WineOffer; last: boolean }) {
  const isForeign = offer.currency !== "BRL";
  const amount = formatOfferAmount(offer.amount, offer.currency);
  const openStore = useCallback(() => {
    haptics.tap();
    void openBrowserAsync(offer.url);
  }, [offer.url]);

  return (
    <AnimatedPressable
      accessibilityHint="Opens the store's page for this wine"
      accessibilityLabel={`${offer.store}, ${amount}`}
      accessibilityRole="link"
      onPress={openStore}
    >
      <View style={[styles.serveRow, !last && styles.serveRowBorder]}>
        <View style={styles.serveIcon}>
          <Icon color={Palette.plum} name="store" size={18} />
        </View>
        <View style={styles.offerStore}>
          <Text numberOfLines={1} style={styles.offerStoreName}>
            {offer.store}
          </Text>
          <Text numberOfLines={1} style={styles.offerCountry}>
            {[offer.country, storeDomain(offer.url)]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        <View style={styles.offerPrice}>
          <Text style={styles.offerAmount}>{amount}</Text>
          {isForeign ? (
            <Text style={styles.offerConverted}>
              {`~${formatOfferAmount(offer.amountBrl, "BRL")}`}
            </Text>
          ) : null}
        </View>
        <Icon color={Palette.muted} name="externalLink" size={16} />
      </View>
    </AnimatedPressable>
  );
}

function WhereToBuySection({ offers }: { offers: WineOffer[] }) {
  if (offers.length === 0) {
    return null;
  }
  return (
    <View style={styles.section}>
      <SectionHeader eyebrow="WHERE TO BUY" icon="store" title="In stores" />
      <GlassSurface style={styles.serveCard}>
        {offers.map((offer, index) => (
          <OfferRow
            key={offer.url}
            last={index === offers.length - 1}
            offer={offer}
          />
        ))}
      </GlassSurface>
    </View>
  );
}

function WineDetailContent({
  detail,
  compact,
  imageFailed,
  cellarQuantity,
  savedToWishlist,
  rating,
  onImageError,
  onOpenCellar,
  onToggleWishlist,
  onOpenRating,
}: {
  detail: WineDetail;
  compact: boolean;
  imageFailed: boolean;
  cellarQuantity: number;
  savedToWishlist: boolean;
  rating: WineRating | null;
  onImageError: () => void;
  onOpenCellar: () => void;
  onToggleWishlist: () => void;
  onOpenRating: () => void;
}) {
  const heroImageUrl = imageFailed ? null : detail.imageUrl;

  return (
    <>
      <WineHero
        cellarQuantity={cellarQuantity}
        compact={compact}
        detail={detail}
        heroImageUrl={heroImageUrl}
        onImageError={onImageError}
        onOpenCellar={onOpenCellar}
        onOpenRating={onOpenRating}
        onToggleWishlist={onToggleWishlist}
        rating={rating}
        savedToWishlist={savedToWishlist}
      />
      <TastingNotesSection notes={detail.tastingNotes} />
      <ProducerSection profile={detail.producerProfile} />
      <RegionSection profile={detail.regionProfile} />
      <ServingAgingSection
        agingNotes={detail.agingNotes}
        servingNotes={detail.servingNotes}
      />
      <PairingSection pairings={detail.pairings} />
      <WhereToBuySection offers={detail.offers} />
    </>
  );
}

export default function WineDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const scrollRef = useScrollToTopOnNavigate();
  const [detail, setDetail] = useState<WineDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedToWishlist, setSavedToWishlist] = useState(false);
  const [cellarQuantity, setCellarQuantity] = useState(0);
  const [rating, setRating] = useState<WineRating | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [cellarOpen, setCellarOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStage, setRefreshStage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    let active = true;

    void getWineDetails(id).then(async (wine) => {
      if (!active) {
        return;
      }
      if (!wine) {
        setDetail(null);
        setError(
          "This wine isn't in your search history anymore — try searching for it again."
        );
        return;
      }

      setError(null);
      setDetail(wine);
      setImageFailed(false);
      void saveRecentView(wine);

      const [wish, cellar, tasting] = await Promise.all([
        isOnWishlist(id),
        getCellarItem(id),
        getRating(id),
      ]);
      if (!active) {
        return;
      }
      setSavedToWishlist(wish);
      setCellarQuantity(cellar?.quantity ?? 0);
      setRating(tasting);
    });

    return () => {
      active = false;
    };
  }, [id]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const handleRefresh = useCallback(async () => {
    if (!detail || refreshing) {
      return;
    }
    haptics.tap();
    setRefreshing(true);
    try {
      const updated = await refreshWine(detail, setRefreshStage);
      if (!updated) {
        Alert.alert(
          "Couldn't refresh",
          "Couldn't find this wine on the web again — try again in a moment."
        );
        return;
      }
      setDetail(updated);
      setImageFailed(false);
      haptics.success();
    } catch (refreshError) {
      Alert.alert(
        "Couldn't refresh",
        refreshError instanceof ResearchUnavailableError
          ? "The AI model on your server isn't running. Start Ollama and try again."
          : "Check your connection and try again."
      );
    } finally {
      setRefreshing(false);
      setRefreshStage(null);
    }
  }, [detail, refreshing]);

  const handleToggleWishlist = useCallback(async () => {
    if (!detail) {
      return;
    }
    haptics.tap();
    const result = await toggleWishlist(detail);
    setSavedToWishlist(result.saved);
  }, [detail]);

  const handleSaveToCellar = useCallback(
    async (quantity: number) => {
      if (!detail) {
        return;
      }
      haptics.success();
      const items = await addToCellar(detail, quantity);
      setCellarQuantity(
        items.find((item) => item.id === detail.id)?.quantity ?? quantity
      );
      setCellarOpen(false);
    },
    [detail]
  );

  const handleRemoveFromCellar = useCallback(async () => {
    if (!detail) {
      return;
    }
    await removeFromCellar(detail.id);
    setCellarQuantity(0);
    setCellarOpen(false);
  }, [detail]);

  const handleImageError = useCallback(() => setImageFailed(true), []);
  const handleRefreshPress = useCallback(() => {
    void handleRefresh();
  }, [handleRefresh]);
  const handleToggleWishlistPress = useCallback(() => {
    void handleToggleWishlist();
  }, [handleToggleWishlist]);
  const handleRemoveFromCellarPress = useCallback(() => {
    void handleRemoveFromCellar();
  }, [handleRemoveFromCellar]);
  const handleSaveToCellarConfirm = useCallback(
    (quantity: number) => {
      void handleSaveToCellar(quantity);
    },
    [handleSaveToCellar]
  );
  const openCellarModal = useCallback(() => setCellarOpen(true), []);
  const closeCellarModal = useCallback(() => setCellarOpen(false), []);
  const openRatingModal = useCallback(() => setRatingOpen(true), []);
  const closeRatingModal = useCallback(() => setRatingOpen(false), []);
  const clearRating = useCallback(() => setRating(null), []);

  return (
    <ScreenShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.page}>
          <View style={styles.topBar}>
            <AnimatedPressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={goBack}
            >
              <GlassSurface isInteractive style={styles.backButton}>
                <Icon color={Palette.ink} name="arrowLeft" size={21} />
              </GlassSurface>
            </AnimatedPressable>

            {refreshing && refreshStage ? (
              <Text numberOfLines={1} style={styles.refreshStage}>
                {refreshStage}…
              </Text>
            ) : null}

            {detail ? (
              <AnimatedPressable
                accessibilityLabel="Refresh this wine's details"
                accessibilityRole="button"
                disabled={refreshing}
                onPress={handleRefreshPress}
              >
                <GlassSurface isInteractive style={styles.backButton}>
                  <RefreshIcon
                    color={refreshing ? Palette.placeholderDark : Palette.ink}
                    spinning={refreshing}
                  />
                </GlassSurface>
              </AnimatedPressable>
            ) : null}
          </View>

          {error ? (
            <GlassSurface style={styles.errorState}>
              <View style={styles.errorIcon}>
                <Icon color={Palette.wine} name="warning" size={27} />
              </View>
              <Text style={styles.errorTitle}>
                This label could not be opened
              </Text>
              <Text style={styles.errorBody}>{error}</Text>
            </GlassSurface>
          ) : null}

          {detail ? (
            <WineDetailContent
              cellarQuantity={cellarQuantity}
              compact={compact}
              detail={detail}
              imageFailed={imageFailed}
              onImageError={handleImageError}
              onOpenCellar={openCellarModal}
              onOpenRating={openRatingModal}
              onToggleWishlist={handleToggleWishlistPress}
              rating={rating}
              savedToWishlist={savedToWishlist}
            />
          ) : null}
        </View>
      </ScrollView>

      {id ? (
        <WineRatingModal
          onClose={closeRatingModal}
          onRemoved={clearRating}
          onSaved={setRating}
          rating={rating}
          visible={ratingOpen}
          wineId={id}
          wineName={detail?.name}
          wineVintage={detail?.vintage}
        />
      ) : null}

      {detail ? (
        <CellarQuantityModal
          inCellar={cellarQuantity > 0}
          initialQuantity={cellarQuantity || 1}
          onClose={closeCellarModal}
          onConfirm={handleSaveToCellarConfirm}
          onRemove={handleRemoveFromCellarPress}
          visible={cellarOpen}
          wineName={detail.name}
          wineVintage={detail.vintage}
        />
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10, marginTop: 26, width: "100%" },
  backButton: {
    alignItems: "center",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  cellarButton: {
    alignItems: "center",
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 21,
    width: "100%",
  },
  cellarButtonText: { color: Palette.white, fontSize: 14, fontWeight: "700" },
  chip: {
    alignItems: "center",
    backgroundColor: Palette.blush,
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { color: Palette.wineDark, fontSize: 12, fontWeight: "700" },
  description: {
    color: Palette.muted,
    fontSize: 15,
    lineHeight: paragraphLeading(25),
    marginTop: 13,
    maxWidth: 760,
  },
  errorBody: {
    color: Palette.muted,
    fontSize: 13,
    lineHeight: paragraphLeading(20),
    marginTop: 7,
    maxWidth: 380,
    textAlign: "center",
  },
  errorIcon: {
    alignItems: "center",
    backgroundColor: Palette.lilac,
    borderRadius: 29,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  errorState: {
    alignItems: "center",
    borderRadius: Radii.card,
    justifyContent: "center",
    minHeight: 460,
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 24,
    fontWeight: "600",
    marginTop: 18,
    textAlign: "center",
  },
  eyebrow: {
    color: Palette.plum,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
  halfAction: { flex: 1 },
  halfButton: {
    alignItems: "center",
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 10,
    width: "100%",
  },
  halfButtonText: { color: Palette.wine, fontSize: 14, fontWeight: "700" },
  hero: {
    borderRadius: Radii.sheet,
    flexDirection: "row",
    gap: 50,
    minHeight: 550,
    overflow: "hidden",
    padding: 34,
    ...Shadows.card,
  },
  heroCompact: { flexDirection: "column", gap: 30, minHeight: 0, padding: 20 },
  heroContent: { alignItems: "stretch", flex: 1, justifyContent: "center" },
  heroGrapes: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  labelImage: { height: "100%", width: "100%" },
  labelImageFrame: {
    alignItems: "center",
    backgroundColor: Palette.white,
    borderRadius: 24,
    height: "100%",
    justifyContent: "center",
    width: "100%",
    ...Shadows.raised,
  },
  labelStage: {
    alignItems: "center",
    borderRadius: 24,
    justifyContent: "center",
    minHeight: 482,
    minWidth: 310,
    position: "relative",
    width: "43%",
  },
  labelStageCompact: {
    height: 390,
    minHeight: 390,
    minWidth: 0,
    width: "100%",
  },
  labelStagePlaceholder: { backgroundColor: Palette.white, ...Shadows.raised },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  locationText: {
    color: Palette.muted,
    flex: 1,
    flexShrink: 1,
    flexWrap: "wrap",
    fontSize: 13,
  },
  offerAmount: { color: Palette.ink, fontSize: 14, fontWeight: "700" },
  offerConverted: { color: Palette.muted, fontSize: 11, marginTop: 2 },
  offerCountry: { color: Palette.muted, fontSize: 12, marginTop: 2 },
  offerPrice: { alignItems: "flex-end" },
  offerStore: { flex: 1 },
  offerStoreName: { color: Palette.ink, fontSize: 14, fontWeight: "600" },
  page: { maxWidth: 1100, paddingHorizontal: 24, width: "100%" },
  pairingBullet: {
    backgroundColor: Palette.plum,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  pairingFood: {
    color: Palette.ink,
    flex: 1,
    flexShrink: 1,
    flexWrap: "wrap",
    fontSize: 14,
    fontWeight: "700",
  },
  pairingItem: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  pairingList: { gap: 10, marginTop: 15 },
  priceBlock: { marginTop: 28 },
  priceHint: { color: Palette.muted, fontSize: 11, marginTop: 2 },
  producerBlock: { marginTop: 28 },
  producerBlockSpaced: { marginTop: 14 },
  producerLabel: {
    color: Palette.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  producerName: {
    color: Palette.ink,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  refreshStage: {
    color: Palette.muted,
    flex: 1,
    fontSize: 12,
    marginHorizontal: 12,
    textAlign: "right",
  },
  scrollContent: { alignItems: "center", paddingBottom: 68 },
  scrollView: { backgroundColor: "transparent", flex: 1 },
  secondaryRow: { flexDirection: "row", gap: 10 },
  section: { marginTop: 48 },
  sectionEyebrow: {
    color: Palette.plum,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.7,
  },
  sectionTitle: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: -0.4,
    lineHeight: 35,
  },
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 3,
  },
  serveCard: { borderRadius: 22, marginTop: 16, paddingHorizontal: 18 },
  serveIcon: { alignItems: "center", justifyContent: "center", width: 18 },
  serveRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingVertical: 15,
  },
  serveRowBorder: {
    borderBottomColor: Palette.separator,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  serveText: {
    color: Palette.ink,
    flex: 1,
    fontSize: 14,
    lineHeight: paragraphLeading(21),
  },
  title: {
    color: Palette.wineDark,
    fontFamily: Fonts.serif,
    fontSize: 46,
    fontWeight: "600",
    letterSpacing: -1.2,
    lineHeight: 51,
    marginTop: 11,
  },
  titleCompact: { fontSize: 34, lineHeight: 40 },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    height: 82,
    justifyContent: "space-between",
  },
  vintage: {
    color: Palette.plum,
    fontFamily: Fonts.serif,
    fontSize: 22,
    marginTop: 5,
  },
});
