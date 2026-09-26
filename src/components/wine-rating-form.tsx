import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";

import { AnimatedPressable } from "@/components/animated-pressable";
import { GlassSurface } from "@/components/glass-surface";
import { Icon } from "@/components/icon";
import { Fonts, Palette, paragraphLeading, Radii } from "@/constants/theme";
import { useFocusScale } from "@/hooks/use-focus-scale";
import {
  emptyRatingDraft,
  removeRating,
  saveRating,
  uploadRatingPhoto,
} from "@/services/wine-ratings";
import type { IntensityScore, WineRating } from "@/types/wine";
import { confirmDelete } from "@/utils/confirm-delete";
import { haptics } from "@/utils/haptics";
import { promptPickPhoto } from "@/utils/pick-photo";
import {
  type RatingFormErrors,
  validateRatingForm,
} from "@/utils/rating-validation";

const intensities: IntensityScore[] = [1, 2, 3, 4, 5];

const scaleFields = [
  { key: "balance", label: "Balance" },
  { key: "complexity", label: "Complexity" },
  { key: "intensity", label: "Intensity" },
  { key: "persistence", label: "Persistence" },
  { key: "emotion", label: "Emotion" },
] as const;

type Draft = typeof emptyRatingDraft;

function ratingToDraft(rating: WineRating): Draft {
  return {
    balance: rating.balance,
    complexity: rating.complexity,
    conclusion: rating.conclusion,
    emotion: rating.emotion,
    intensity: rating.intensity,
    nose: rating.nose,
    palate: rating.palate,
    persistence: rating.persistence,
    photoUri: rating.photoUrl,
    score: String(rating.score),
    visual: rating.visual,
  };
}

function isLocalFileUri(uri: string): boolean {
  return !(uri.startsWith("http://") || uri.startsWith("https://"));
}

function TastingPhotoField({
  photoUri,
  onChange,
}: {
  photoUri: string | null;
  onChange: (uri: string | null) => void;
}) {
  const handlePress = useCallback(async () => {
    haptics.tap();
    const result = await promptPickPhoto({
      allowsEditing: false,
      hasExisting: !!photoUri,
      title: "Tasting photo",
    });
    if (!result) {
      return;
    }
    onChange("removed" in result ? null : result.uri);
  }, [photoUri, onChange]);

  const handlePressTrigger = useCallback(() => {
    void handlePress();
  }, [handlePress]);

  if (photoUri) {
    return (
      <AnimatedPressable
        accessibilityLabel="Change tasting photo"
        accessibilityRole="button"
        onPress={handlePressTrigger}
        style={styles.photoCard}
      >
        <Image
          accessibilityLabel="Tasting photo"
          contentFit="cover"
          source={{ uri: photoUri }}
          style={styles.photoImage}
        />
        <View style={styles.photoEditBadge}>
          <Icon color={Palette.white} name="camera" size={14} />
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      accessibilityLabel="Add a tasting photo"
      accessibilityRole="button"
      onPress={handlePressTrigger}
    >
      <GlassSurface style={styles.photoEmptyCard}>
        <View style={styles.photoEmptyIcon}>
          <Icon color={Palette.wine} name="camera" size={20} />
        </View>
        <Text style={styles.photoEmptyTitle}>Add a photo</Text>
        <Text style={styles.photoEmptyHint}>
          Capture this bottle or the moment you tasted it.
        </Text>
      </GlassSurface>
    </AnimatedPressable>
  );
}

function ScaleDot({
  label,
  level,
  selected,
  onSelect,
}: {
  label: string;
  level: IntensityScore;
  selected: boolean;
  onSelect: (level: IntensityScore) => void;
}) {
  const handlePress = useCallback(() => {
    haptics.select();
    onSelect(level);
  }, [onSelect, level]);

  return (
    <AnimatedPressable
      accessibilityLabel={`${label} ${level} of 5`}
      accessibilityRole="button"
      onPress={handlePress}
      scaleTo={0.88}
      style={[styles.dot, selected && styles.dotSelected]}
    >
      <Text style={[styles.dotText, selected && styles.dotTextSelected]}>
        {level}
      </Text>
    </AnimatedPressable>
  );
}

function ScaleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: IntensityScore;
  onChange: (value: IntensityScore) => void;
}) {
  return (
    <View style={styles.scaleRow}>
      <Text style={styles.scaleLabel}>{label}</Text>
      <View style={styles.scaleDots}>
        {intensities.map((level) => (
          <ScaleDot
            key={level}
            label={label}
            level={level}
            onSelect={onChange}
            selected={level <= value}
          />
        ))}
      </View>
    </View>
  );
}

function ScaleFieldRow({
  field,
  value,
  onUpdate,
}: {
  field: (typeof scaleFields)[number];
  value: IntensityScore;
  onUpdate: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  const handleChange = useCallback(
    (next: IntensityScore) => onUpdate(field.key, next),
    [onUpdate, field.key]
  );
  return <ScaleRow label={field.label} onChange={handleChange} value={value} />;
}

/** Called with the field's container so the parent can scroll it into view. */
type FieldFocusHandler = (field: View | null) => void;

function NoteField({
  label,
  placeholder,
  value,
  error,
  onChangeText,
  onFieldFocus,
}: {
  label: string;
  placeholder: string;
  value: string;
  error: string | undefined;
  onChangeText: (value: string) => void;
  onFieldFocus?: FieldFocusHandler;
}) {
  const containerRef = useRef<View>(null);
  const focus = useFocusScale();
  const handleFocus = useCallback(() => {
    focus.onFocus();
    onFieldFocus?.(containerRef.current);
  }, [focus, onFieldFocus]);

  return (
    <View collapsable={false} ref={containerRef}>
      <Animated.View style={focus.animatedStyle}>
        <GlassSurface style={[styles.noteCard, error && styles.cardInvalid]}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <TextInput
            multiline
            onBlur={focus.onBlur}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            placeholder={placeholder}
            placeholderTextColor={Palette.placeholderDark}
            selectionColor={Palette.wine}
            style={styles.noteInput}
            value={value}
          />
          {error ? <Text style={styles.fieldError}>{error}</Text> : null}
        </GlassSurface>
      </Animated.View>
    </View>
  );
}

export function WineRatingForm({
  wineId,
  rating,
  onSaved,
  onRemoved,
  onFieldFocus,
  embedded = false,
}: {
  wineId: string;
  rating: WineRating | null;
  onSaved: (rating: WineRating) => void;
  onRemoved?: () => void;
  /** Lets the screen scroll the focused field above the keyboard. */
  onFieldFocus?: FieldFocusHandler;
  embedded?: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(
    rating ? ratingToDraft(rating) : emptyRatingDraft
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RatingFormErrors>({});
  const [saving, setSaving] = useState(false);

  const scoreFocus = useFocusScale();
  const scoreFieldRef = useRef<View>(null);

  useEffect(() => {
    setDraft(rating ? ratingToDraft(rating) : emptyRatingDraft);
    setError(null);
    setFieldErrors({});
  }, [rating]);

  const update = useCallback(
    <K extends keyof Draft>(key: K, value: Draft[K]) => {
      setDraft((current) => ({ ...current, [key]: value }));
      // Typing into a flagged field clears its message right away.
      setFieldErrors((current) => {
        if (!(key in current)) {
          return current;
        }
        const { [key as keyof RatingFormErrors]: _cleared, ...rest } = current;
        if (Object.keys(rest).length === 0) {
          setError(null);
        }
        return rest;
      });
    },
    []
  );

  const updatePhotoUri = useCallback(
    (uri: string | null) => update("photoUri", uri),
    [update]
  );
  const updateScore = useCallback(
    (value: string) => update("score", value),
    [update]
  );
  const updateVisual = useCallback(
    (value: string) => update("visual", value),
    [update]
  );
  const updateNose = useCallback(
    (value: string) => update("nose", value),
    [update]
  );
  const updatePalate = useCallback(
    (value: string) => update("palate", value),
    [update]
  );
  const updateConclusion = useCallback(
    (value: string) => update("conclusion", value),
    [update]
  );

  const handleScoreFocus = useCallback(() => {
    scoreFocus.onFocus();
    onFieldFocus?.(scoreFieldRef.current);
  }, [scoreFocus, onFieldFocus]);

  const handleSave = useCallback(async () => {
    if (saving) {
      return;
    }
    const { photoUri, ...fields } = draft;
    const validation = validateRatingForm(fields);
    if (!validation.success) {
      setFieldErrors(validation.errors);
      const missing = Object.keys(validation.errors).length;
      setError(
        missing === 1
          ? "One field still needs your attention."
          : `${missing} fields still need your attention.`
      );
      haptics.warning();
      return;
    }

    setSaving(true);
    try {
      let saved = await saveRating(wineId, validation.values);
      if (photoUri && isLocalFileUri(photoUri)) {
        saved = await uploadRatingPhoto(wineId, photoUri);
      }
      setError(null);
      setFieldErrors({});
      haptics.success();
      onSaved(saved);
    } catch (saveError) {
      console.error("saving tasting failed", saveError);
      setError(
        "Couldn't save your tasting. Check your connection and try again."
      );
      haptics.warning();
    } finally {
      setSaving(false);
    }
  }, [draft, saving, wineId, onSaved]);

  const handleRemove = useCallback(async () => {
    const confirmed = await confirmDelete({
      message: "Your score, notes and photo won't be recoverable.",
      title: "Remove this tasting?",
    });
    if (!confirmed) {
      return;
    }
    await removeRating(wineId);
    setDraft(emptyRatingDraft);
    setError(null);
    haptics.remove();
    onRemoved?.();
  }, [wineId, onRemoved]);

  const handleSavePress = useCallback(() => {
    void handleSave();
  }, [handleSave]);

  const handleRemovePress = useCallback(() => {
    void handleRemove();
  }, [handleRemove]);

  let saveLabel = rating ? "Update tasting" : "Save tasting";
  if (saving) {
    saveLabel = "Saving…";
  }

  return (
    <View style={embedded ? styles.embedded : styles.section}>
      {embedded ? null : (
        <>
          <Text style={styles.sectionEyebrow}>YOUR TASTING</Text>
          <Text style={styles.sectionTitle}>
            {rating ? "Your notes" : "Rate this bottle"}
          </Text>
          <Text style={styles.sectionBody}>
            Score the wine, mark intensity, and keep the tasting in your own
            words.
          </Text>
        </>
      )}

      <TastingPhotoField onChange={updatePhotoUri} photoUri={draft.photoUri} />

      <View collapsable={false} ref={scoreFieldRef}>
        <Animated.View style={scoreFocus.animatedStyle}>
          <GlassSurface
            style={[styles.scoreCard, fieldErrors.score && styles.cardInvalid]}
          >
            <Text style={styles.fieldLabel}>FINAL SCORE</Text>
            <TextInput
              accessibilityLabel="Final score from 0 to 10"
              keyboardType="decimal-pad"
              onBlur={scoreFocus.onBlur}
              onChangeText={updateScore}
              onFocus={handleScoreFocus}
              placeholder="8.5"
              placeholderTextColor={Palette.placeholderDark}
              selectionColor={Palette.wine}
              style={styles.scoreInput}
              value={draft.score}
            />
            <Text
              style={fieldErrors.score ? styles.fieldError : styles.fieldHint}
            >
              {fieldErrors.score ?? "From 0 to 10"}
            </Text>
          </GlassSurface>
        </Animated.View>
      </View>

      <View style={styles.scales}>
        {scaleFields.map((field) => (
          <ScaleFieldRow
            field={field}
            key={field.key}
            onUpdate={update}
            value={draft[field.key]}
          />
        ))}
      </View>

      <Text style={styles.groupLabel}>SENSORY NOTES</Text>
      <NoteField
        error={fieldErrors.visual}
        label="VISUAL"
        onChangeText={updateVisual}
        onFieldFocus={onFieldFocus}
        placeholder="Color, clarity, viscosity…"
        value={draft.visual}
      />
      <NoteField
        error={fieldErrors.nose}
        label="NOSE"
        onChangeText={updateNose}
        onFieldFocus={onFieldFocus}
        placeholder="Aromas, intensity, evolution…"
        value={draft.nose}
      />
      <NoteField
        error={fieldErrors.palate}
        label="PALATE"
        onChangeText={updatePalate}
        onFieldFocus={onFieldFocus}
        placeholder="Body, acidity, tannin, flavor…"
        value={draft.palate}
      />
      <NoteField
        error={fieldErrors.conclusion}
        label="CONCLUSION"
        onChangeText={updateConclusion}
        onFieldFocus={onFieldFocus}
        placeholder="Your overall impression of this bottle…"
        value={draft.conclusion}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AnimatedPressable
        accessibilityRole="button"
        accessibilityState={{ busy: saving, disabled: saving }}
        disabled={saving}
        onPress={handleSavePress}
      >
        <GlassSurface
          isInteractive
          style={styles.saveButton}
          tintColor={Palette.wine}
        >
          <Icon color={Palette.white} name="check" size={18} />
          <Text style={styles.saveButtonText}>{saveLabel}</Text>
        </GlassSurface>
      </AnimatedPressable>

      {rating ? (
        <AnimatedPressable
          accessibilityRole="button"
          onPress={handleRemovePress}
          style={styles.removeButton}
        >
          <Icon color={Palette.wine} name="trash" size={16} />
          <Text style={styles.removeText}>Remove tasting</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardInvalid: { borderColor: Palette.wine, borderWidth: 1.5 },
  dot: {
    alignItems: "center",
    backgroundColor: Palette.surface,
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  dotSelected: { backgroundColor: Palette.wine },
  dotText: { color: Palette.muted, fontSize: 13, fontWeight: "800" },
  dotTextSelected: { color: Palette.white },
  embedded: { paddingBottom: 12 },
  error: { color: Palette.wine, fontSize: 13, marginTop: 4 },
  fieldError: {
    color: Palette.wine,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: paragraphLeading(17),
  },
  fieldHint: { color: Palette.placeholderDark, fontSize: 12 },
  fieldLabel: {
    color: Palette.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  groupLabel: {
    color: Palette.plum,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: 10,
    marginTop: 28,
  },
  noteCard: {
    borderRadius: 22,
    marginBottom: 10,
    paddingBottom: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  noteInput: {
    backgroundColor: "transparent",
    color: Palette.ink,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 72,
    paddingVertical: 8,
  },
  photoCard: {
    aspectRatio: 3 / 4,
    backgroundColor: Palette.surface,
    borderRadius: 22,
    marginTop: 18,
    overflow: "hidden",
    width: "100%",
  },
  photoEditBadge: {
    alignItems: "center",
    backgroundColor: Palette.wine,
    borderRadius: 17,
    bottom: 12,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    width: 34,
  },
  photoEmptyCard: {
    alignItems: "center",
    borderRadius: 22,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 130,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  photoEmptyHint: {
    color: Palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
    maxWidth: 260,
    textAlign: "center",
  },
  photoEmptyIcon: {
    alignItems: "center",
    backgroundColor: Palette.lilac,
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  photoEmptyTitle: {
    color: Palette.ink,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
  },
  photoImage: { height: "100%", width: "100%" },
  removeButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 44,
  },
  removeText: { color: Palette.wine, fontSize: 14, fontWeight: "700" },
  saveButton: {
    alignItems: "center",
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 52,
    paddingHorizontal: 21,
  },
  saveButtonText: { color: Palette.white, fontSize: 14, fontWeight: "700" },
  scaleDots: { flexDirection: "row", gap: 8 },
  scaleLabel: { color: Palette.ink, fontSize: 13, fontWeight: "700" },
  scaleRow: { gap: 8 },
  scales: { gap: 12, marginTop: 18 },
  scoreCard: {
    borderRadius: 22,
    marginTop: 18,
    paddingBottom: 12,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  scoreInput: {
    backgroundColor: "transparent",
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 32,
    fontWeight: "600",
    lineHeight: 38,
    paddingVertical: 6,
  },
  section: { marginTop: 48 },
  sectionBody: {
    color: Palette.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 520,
  },
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
    marginTop: 3,
  },
});
