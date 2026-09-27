import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { RefreshControl } from "react-native-gesture-handler";

import { AnimatedPressable } from "@/components/animated-pressable";
import { GlassSurface } from "@/components/glass-surface";
import { Icon } from "@/components/icon";
import { ProgressBar } from "@/components/progress-bar";
import { ScreenShell } from "@/components/screen-shell";
import { Fonts, Palette, paragraphLeading, Radii } from "@/constants/theme";
import { useScrollToTopOnNavigate } from "@/hooks/use-scroll-to-top";
import {
  cancelModelDownload,
  followModelDownload,
  getAiStatus,
  removeModel,
  selectModel,
  setResearchProfile,
} from "@/services/ai-settings";
import { ApiError } from "@/services/api-client";
import { JobCancelledError } from "@/services/jobs";
import {
  type AiModel,
  type AiStatus,
  ModelSpeedLabels,
  type PullJob,
  type ResearchProfile,
  ResearchProfileLabels,
} from "@/types/ai";
import { confirmDelete } from "@/utils/confirm-delete";
import {
  formatBytes,
  formatDownload,
  formatPercent,
} from "@/utils/format-progress";
import { haptics } from "@/utils/haptics";

const PROFILES: ResearchProfile[] = ["fast", "thorough"];

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function StatusCard({ status }: { status: AiStatus | null }) {
  const reachable = status?.ollama.reachable ?? false;
  let body = "Checking your server…";
  if (status) {
    body = reachable
      ? `Ollama ${status.ollama.version ?? ""} at ${status.ollama.url}`.trim()
      : `Ollama did not answer at ${status.ollama.url}. Start it on the server and pull down to retry.`;
  }
  return (
    <GlassSurface style={styles.statusCard}>
      <View style={styles.statusRow}>
        <View style={[styles.statusIcon, reachable && styles.statusIconLive]}>
          <Icon color={Palette.white} name="chip" size={19} />
        </View>
        <View style={styles.statusCopy}>
          <Text style={styles.statusTitle}>
            {reachable ? "Local AI is online" : "Local AI is offline"}
          </Text>
          <Text style={styles.statusBody}>{body}</Text>
        </View>
      </View>
      {status ? (
        <View style={styles.statusActive}>
          <Text style={styles.fieldLabel}>IN USE</Text>
          <Text style={styles.statusModel}>
            {status.models.find((model) => model.active)?.label ??
              status.activeModel}
          </Text>
          {status.activeModelInstalled ? null : (
            <Text style={styles.statusWarning}>
              Not installed yet. Searches will fail until it is downloaded.
            </Text>
          )}
        </View>
      ) : null}
    </GlassSurface>
  );
}

function ProfilePill({
  profile,
  active,
  onSelect,
}: {
  profile: ResearchProfile;
  active: boolean;
  onSelect: (profile: ResearchProfile) => void;
}) {
  const handlePress = useCallback(() => onSelect(profile), [onSelect, profile]);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={handlePress}
      scaleTo={0.95}
      style={styles.profilePillWrap}
    >
      <GlassSurface
        isInteractive
        style={styles.profilePill}
        tintColor={active ? Palette.wine : undefined}
      >
        <Icon
          color={active ? Palette.white : Palette.wine}
          name={profile === "fast" ? "lightning" : "sparkle"}
          size={16}
        />
        <Text
          style={[styles.profileTitle, active && styles.profileTitleActive]}
        >
          {ResearchProfileLabels[profile].title}
        </Text>
      </GlassSurface>
    </AnimatedPressable>
  );
}

function ModelTags({ model }: { model: AiModel }) {
  const tags: string[] = [];
  if (model.installed) {
    tags.push(`Installed · ${formatBytes(model.installedBytes)}`);
  } else if (model.downloadBytes) {
    tags.push(`${formatBytes(model.downloadBytes)} download`);
  }
  if (model.speed) {
    tags.push(ModelSpeedLabels[model.speed]);
  }
  if (model.memoryGb) {
    tags.push(`${model.memoryGb} GB RAM`);
  }
  if (model.vision === false) {
    tags.push("No image support");
  }
  return (
    <View style={styles.tags}>
      {tags.map((tag) => (
        <View key={tag} style={styles.tag}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}

function DownloadProgress({
  pull,
  onCancel,
}: {
  pull: PullJob;
  onCancel: (pull: PullJob) => void;
}) {
  const handleCancel = useCallback(() => onCancel(pull), [onCancel, pull]);
  return (
    <View style={styles.downloadBlock}>
      <View style={styles.downloadRow}>
        <Text style={styles.downloadStage}>{pull.stage}</Text>
        <Text style={styles.downloadPercent}>
          {formatPercent(pull.progress)}
        </Text>
      </View>
      <ProgressBar progress={pull.progress} />
      <View style={styles.downloadRow}>
        <Text style={styles.downloadBytes}>
          {formatDownload(pull.completedBytes, pull.totalBytes)}
        </Text>
        <AnimatedPressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleCancel}
          style={styles.cancelHit}
        >
          <Icon color={Palette.wine} name="stop" size={14} />
          <Text style={styles.cancelText}>Cancel</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function ModelCard({
  model,
  busy,
  onUse,
  onRemove,
  onCancel,
}: {
  model: AiModel;
  busy: boolean;
  onUse: (model: AiModel) => void;
  onRemove: (model: AiModel) => void;
  onCancel: (pull: PullJob) => void;
}) {
  const handleUse = useCallback(() => onUse(model), [onUse, model]);
  const handleRemove = useCallback(() => onRemove(model), [onRemove, model]);
  const downloading =
    model.pull &&
    (model.pull.status === "queued" || model.pull.status === "running");

  return (
    <GlassSurface
      style={[styles.modelCard, model.active && styles.modelCardActive]}
    >
      <View style={styles.modelHeader}>
        <View style={styles.modelCopy}>
          <Text style={styles.modelLabel}>{model.label}</Text>
          <Text style={styles.modelName}>{model.name}</Text>
        </View>
        {model.active ? (
          <View style={styles.activeBadge}>
            <Icon color={Palette.white} name="checkCircle" size={14} />
            <Text style={styles.activeBadgeText}>IN USE</Text>
          </View>
        ) : null}
      </View>
      {model.description ? (
        <Text style={styles.modelDescription}>{model.description}</Text>
      ) : null}
      <ModelTags model={model} />
      {downloading && model.pull ? (
        <DownloadProgress onCancel={onCancel} pull={model.pull} />
      ) : null}
      {model.active || downloading ? null : (
        <View style={styles.modelActions}>
          <AnimatedPressable
            accessibilityRole="button"
            disabled={busy || model.vision === false}
            onPress={handleUse}
            style={styles.modelActionMain}
          >
            <GlassSurface
              isInteractive
              style={styles.useButton}
              tintColor={Palette.wine}
            >
              <Icon
                color={Palette.white}
                name={model.installed ? "check" : "download"}
                size={17}
              />
              <Text style={styles.useButtonText}>
                {model.installed ? "Use this model" : "Download and use"}
              </Text>
            </GlassSurface>
          </AnimatedPressable>
          {model.installed ? (
            <AnimatedPressable
              accessibilityLabel={`Remove ${model.label}`}
              accessibilityRole="button"
              disabled={busy}
              onPress={handleRemove}
              style={styles.removeButton}
            >
              <Icon color={Palette.wine} name="trash" size={17} />
            </AnimatedPressable>
          ) : null}
        </View>
      )}
    </GlassSurface>
  );
}

export default function AiModelScreen() {
  const router = useRouter();
  const scrollRef = useScrollToTopOnNavigate();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [customModel, setCustomModel] = useState("");
  const followed = useRef(new Set<string>());

  const applyPull = useCallback((pull: PullJob) => {
    setStatus((current) =>
      current
        ? {
            ...current,
            models: current.models.map((model) =>
              model.name === pull.model ? { ...model, pull } : model
            ),
          }
        : current
    );
  }, []);

  const load = useCallback(async () => {
    try {
      const next = await getAiStatus();
      setStatus(next);
      setLoadError(null);
      return next;
    } catch (statusError) {
      setLoadError(errorMessage(statusError, "Could not reach your server."));
      return null;
    }
  }, []);

  const follow = useCallback(
    async (pull: PullJob) => {
      if (followed.current.has(pull.id)) {
        return;
      }
      followed.current.add(pull.id);
      applyPull(pull);
      try {
        await followModelDownload(pull, {
          onProgress: ({ progress, stage }) =>
            applyPull({ ...pull, progress, stage, status: "running" }),
        });
        haptics.success();
      } catch (followError) {
        if (!(followError instanceof JobCancelledError)) {
          Alert.alert(
            "Download failed",
            followError instanceof Error
              ? followError.message
              : "Try again in a moment."
          );
        }
      } finally {
        followed.current.delete(pull.id);
        void load();
      }
    },
    [applyPull, load]
  );

  useEffect(() => {
    void load().then((next) => {
      for (const model of next?.models ?? []) {
        if (model.pull) {
          void follow(model.pull);
        }
      }
    });
  }, [load, follow]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleUse = useCallback(
    async (name: string) => {
      setBusy(true);
      haptics.tap();
      try {
        const result = await selectModel(name);
        if (result.activated) {
          haptics.success();
          await load();
        } else if (result.pull) {
          await load();
          void follow(result.pull);
        }
      } catch (selectError) {
        haptics.warning();
        Alert.alert(
          "Couldn't switch model",
          errorMessage(
            selectError,
            "Check that Ollama is running and try again."
          )
        );
      } finally {
        setBusy(false);
      }
    },
    [follow, load]
  );

  const handleUseModel = useCallback(
    (model: AiModel) => {
      void handleUse(model.name);
    },
    [handleUse]
  );

  const handleUseCustom = useCallback(() => {
    const name = customModel.trim();
    if (!name) {
      return;
    }
    setCustomModel("");
    void handleUse(name);
  }, [customModel, handleUse]);

  const handleRemove = useCallback(
    async (model: AiModel) => {
      const confirmed = await confirmDelete({
        confirmLabel: "Remove",
        message: `${formatBytes(model.installedBytes)} will be freed on the server. You can download it again later.`,
        title: `Remove ${model.label}?`,
      });
      if (!confirmed) {
        return;
      }
      setBusy(true);
      try {
        await removeModel(model.name);
        haptics.remove();
        await load();
      } catch (removeError) {
        Alert.alert(
          "Couldn't remove",
          errorMessage(removeError, "Try again in a moment.")
        );
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const handleRemoveModel = useCallback(
    (model: AiModel) => {
      void handleRemove(model);
    },
    [handleRemove]
  );

  const handleCancel = useCallback((pull: PullJob) => {
    haptics.tap();
    void cancelModelDownload(pull.id).catch(() => undefined);
  }, []);

  const handleProfile = useCallback(
    async (next: ResearchProfile) => {
      if (status?.researchProfile === next) {
        return;
      }
      haptics.select();
      setStatus((current) =>
        current ? { ...current, researchProfile: next } : current
      );
      try {
        setStatus(await setResearchProfile(next));
      } catch (profileError) {
        Alert.alert(
          "Couldn't save",
          errorMessage(profileError, "Try again in a moment.")
        );
        void load();
      }
    },
    [load, status?.researchProfile]
  );

  const handleProfileSelect = useCallback(
    (next: ResearchProfile) => {
      void handleProfile(next);
    },
    [handleProfile]
  );

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/preferences");
    }
  }, [router]);

  const profile = status?.researchProfile ?? "thorough";

  return (
    <ScreenShell>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          ref={scrollRef}
          refreshControl={
            <RefreshControl
              onRefresh={handleRefresh}
              refreshing={refreshing}
              tintColor={Palette.wine}
            />
          }
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
            </View>

            <View style={styles.intro}>
              <Text style={styles.eyebrow}>LOCAL AI</Text>
              <Text style={styles.title}>Pick the model.</Text>
              <Text style={styles.subtitle}>
                Research and label reading run on your own server. Smaller
                models answer faster; larger ones read harder labels and write
                better notes.
              </Text>
            </View>

            {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

            <StatusCard status={status} />

            <View style={styles.section}>
              <Text style={styles.fieldLabelStandalone}>RESEARCH DEPTH</Text>
              <View style={styles.profileRow}>
                {PROFILES.map((option) => (
                  <ProfilePill
                    active={option === profile}
                    key={option}
                    onSelect={handleProfileSelect}
                    profile={option}
                  />
                ))}
              </View>
              <Text style={styles.profileHint}>
                {ResearchProfileLabels[profile].hint}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabelStandalone}>MODELS</Text>
              <View style={styles.models}>
                {(status?.models ?? []).map((model) => (
                  <ModelCard
                    busy={busy}
                    key={model.name}
                    model={model}
                    onCancel={handleCancel}
                    onRemove={handleRemoveModel}
                    onUse={handleUseModel}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabelStandalone}>ANY OTHER MODEL</Text>
              <GlassSurface style={styles.field}>
                <Text style={styles.fieldLabel}>OLLAMA MODEL NAME</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect={false}
                  onChangeText={setCustomModel}
                  onSubmitEditing={handleUseCustom}
                  placeholder="e.g. minicpm-v:8b"
                  placeholderTextColor={Palette.muted}
                  returnKeyType="go"
                  selectionColor={Palette.wine}
                  spellCheck={false}
                  style={styles.fieldInput}
                  value={customModel}
                />
              </GlassSurface>
              <Text style={styles.profileHint}>
                Must be a multimodal model from ollama.com/library, so it can
                read labels and check photos.
              </Text>
              <AnimatedPressable
                accessibilityRole="button"
                disabled={busy || customModel.trim().length === 0}
                onPress={handleUseCustom}
              >
                <GlassSurface isInteractive style={styles.outlineButton}>
                  <Icon color={Palette.wine} name="download" size={18} />
                  <Text style={styles.outlineButtonText}>Download and use</Text>
                </GlassSurface>
              </AnimatedPressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  activeBadge: {
    alignItems: "center",
    backgroundColor: Palette.wine,
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeBadgeText: {
    color: Palette.white,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  cancelHit: { alignItems: "center", flexDirection: "row", gap: 5 },
  cancelText: { color: Palette.wine, fontSize: 12, fontWeight: "700" },
  downloadBlock: { gap: 8, marginTop: 14 },
  downloadBytes: { color: Palette.muted, fontSize: 12 },
  downloadPercent: { color: Palette.wine, fontSize: 13, fontWeight: "800" },
  downloadRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  downloadStage: {
    color: Palette.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  error: { color: Palette.wine, fontSize: 13, lineHeight: 19, marginTop: 18 },
  eyebrow: {
    color: Palette.plum,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.1,
    lineHeight: 16,
  },
  field: {
    borderRadius: 22,
    paddingBottom: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  fieldInput: {
    backgroundColor: "transparent",
    color: Palette.ink,
    fontSize: 17,
    lineHeight: 24,
    paddingVertical: 6,
  },
  fieldLabel: {
    color: Palette.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  fieldLabelStandalone: {
    color: Palette.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  flex: { flex: 1 },
  intro: { marginTop: 12 },
  modelActionMain: { flex: 1 },
  modelActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  modelCard: { borderRadius: Radii.card, padding: 18 },
  modelCardActive: { borderColor: Palette.wine, borderWidth: 1.5 },
  modelCopy: { flex: 1 },
  modelDescription: {
    color: Palette.muted,
    fontSize: 13,
    lineHeight: paragraphLeading(19),
    marginTop: 8,
  },
  modelHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  modelLabel: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 20,
    fontWeight: "600",
  },
  modelName: {
    color: Palette.placeholderDark,
    fontFamily: Fonts.mono,
    fontSize: 12,
    marginTop: 3,
  },
  models: { gap: 12 },
  outlineButton: {
    alignItems: "center",
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 52,
    paddingHorizontal: 21,
  },
  outlineButtonText: { color: Palette.wine, fontSize: 14, fontWeight: "700" },
  page: { maxWidth: 640, paddingHorizontal: 24, width: "100%" },
  profileHint: {
    color: Palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 4,
    marginTop: 10,
  },
  profilePill: {
    alignItems: "center",
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 46,
  },
  profilePillWrap: { flex: 1 },
  profileRow: { flexDirection: "row", gap: 8 },
  profileTitle: { color: Palette.ink, fontSize: 13, fontWeight: "700" },
  profileTitleActive: { color: Palette.white },
  removeButton: {
    alignItems: "center",
    backgroundColor: Palette.blush,
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  scrollContent: { alignItems: "center", paddingBottom: 68 },
  scrollView: { backgroundColor: "transparent", flex: 1 },
  section: { marginTop: 28 },
  statusActive: {
    borderTopColor: Palette.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 16,
    paddingTop: 14,
  },
  statusBody: {
    color: Palette.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  statusCard: { borderRadius: Radii.card, marginTop: 28, padding: 18 },
  statusCopy: { flex: 1 },
  statusIcon: {
    alignItems: "center",
    backgroundColor: Palette.placeholderDark,
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  statusIconLive: { backgroundColor: Palette.success },
  statusModel: {
    color: Palette.wineDark,
    fontFamily: Fonts.serif,
    fontSize: 20,
    fontWeight: "600",
    marginTop: 4,
  },
  statusRow: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  statusTitle: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontWeight: "600",
  },
  statusWarning: {
    color: Palette.wine,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  subtitle: {
    color: Palette.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 14,
    maxWidth: 460,
  },
  tag: {
    backgroundColor: Palette.blush,
    borderRadius: Radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  tagText: { color: Palette.wineDark, fontSize: 11, fontWeight: "700" },
  title: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 38,
    fontWeight: "600",
    letterSpacing: -1.1,
    lineHeight: 44,
    marginTop: 10,
  },
  topBar: { alignItems: "center", flexDirection: "row", height: 82 },
  useButton: {
    alignItems: "center",
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  useButtonText: { color: Palette.white, fontSize: 14, fontWeight: "700" },
});
