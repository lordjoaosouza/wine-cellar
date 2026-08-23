import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { ChromeCloseButton } from "@/components/chrome-close-button";
import { ModalShell } from "@/components/modal-shell";
import { WineRatingForm } from "@/components/wine-rating-form";
import { Fonts, Palette } from "@/constants/theme";
import type { WineRating } from "@/types/wine";

const tastedDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatTastedDate(savedAt: string) {
  const date = new Date(savedAt);
  return Number.isNaN(date.getTime()) ? "" : tastedDateFormatter.format(date);
}

export function WineRatingModal({
  visible,
  wineId,
  rating,
  wineName,
  wineVintage,
  onClose,
  onSaved,
  onRemoved,
}: {
  visible: boolean;
  wineId: string;
  rating: WineRating | null;
  wineName?: string;
  wineVintage?: string | null;
  onClose: () => void;
  onSaved: (rating: WineRating) => void;
  onRemoved?: () => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const close = useCallback(() => {
    Keyboard.dismiss();
    setKeyboardInset(0);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!visible) {
      Keyboard.dismiss();
      setKeyboardInset(0);
      return;
    }

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [visible]);

  const handleSaved = useCallback(
    (next: WineRating) => {
      Keyboard.dismiss();
      onSaved(next);
      onClose();
    },
    [onSaved, onClose]
  );

  const handleRemoved = useCallback(() => {
    Keyboard.dismiss();
    onRemoved?.();
    onClose();
  }, [onRemoved, onClose]);

  const scrollFieldIntoView = useCallback(() => {
    if (Platform.OS === "web") {
      requestAnimationFrame(() => {
        const field = document.activeElement as HTMLElement | null;
        field?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      });
      return;
    }

    requestAnimationFrame(() => {
      setTimeout(
        () => {
          scrollRef.current?.scrollToEnd({ animated: true });
        },
        Platform.OS === "ios" ? 280 : 80
      );
    });
  }, []);

  const panel = (
    <SafeAreaProvider>
      <View style={styles.screen}>
        <SafeAreaView
          edges={["top", "bottom", "left", "right"]}
          style={styles.safe}
        >
          <View style={styles.top}>
            <View style={styles.headingBlock}>
              <Text style={styles.eyebrow}>YOUR TASTING</Text>
              <Text style={styles.heading}>
                {rating ? "Edit tasting" : "Rate this bottle"}
              </Text>
              {wineName ? (
                <Text style={styles.wineName}>
                  {[wineName, wineVintage].filter(Boolean).join(" · ")}
                </Text>
              ) : null}
              {rating ? (
                <Text style={styles.tastedOn}>
                  Tasted {formatTastedDate(rating.savedAt)}
                </Text>
              ) : null}
            </View>
            <ChromeCloseButton
              accessibilityLabel="Close rating"
              onPress={close}
              style={styles.closeWrap}
            />
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: 48 + keyboardInset },
            ]}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            ref={scrollRef}
            style={styles.scroll}
          >
            {visible ? (
              <WineRatingForm
                embedded
                key={`${wineId}-${rating?.savedAt ?? "new"}`}
                onLowerFieldFocus={scrollFieldIntoView}
                onRemoved={handleRemoved}
                onSaved={handleSaved}
                rating={rating}
                wineId={wineId}
              />
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );

  return (
    <ModalShell
      animationType="slide"
      onRequestClose={close}
      presentationStyle="fullScreen"
      statusBarTranslucent
      visible={visible}
      webOverlayStyle={styles.webOverlay}
    >
      {panel}
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  closeWrap: { marginTop: 8 },
  content: { paddingHorizontal: 24 },
  eyebrow: {
    color: Palette.plum,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.2,
    lineHeight: 16,
  },
  heading: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 34,
    fontWeight: "600",
    lineHeight: 40,
  },
  headingBlock: { flex: 1, gap: 6 },
  safe: { flex: 1 },
  screen: { backgroundColor: Palette.white, flex: 1 },
  scroll: { flex: 1 },
  tastedOn: {
    color: Palette.placeholderDark,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  top: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
    paddingBottom: 8,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  webOverlay: {
    backgroundColor: Palette.white,
    bottom: 0,
    left: 0,
    position: "fixed",
    right: 0,
    top: 0,
    zIndex: 1100,
  },
  wineName: {
    color: Palette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
});
