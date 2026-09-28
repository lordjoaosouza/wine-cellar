import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Platform,
  Pressable,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/animated-pressable";
import { ChromeCloseButton } from "@/components/chrome-close-button";
import { Icon } from "@/components/icon";
import { ProgressBar } from "@/components/progress-bar";
import { Palette, paragraphLeading, Radii } from "@/constants/theme";
import { JobCancelledError } from "@/services/jobs";
import {
  identifyWineFromLabel,
  ResearchUnavailableError,
} from "@/services/wine-search";
import { formatPercent } from "@/utils/format-progress";
import type { HomeSearchPreset } from "@/utils/search-intent";

interface LabelScanViewProps {
  onClose: () => void;
  onIdentified: (preset: HomeSearchPreset) => void;
  visible: boolean;
}

interface ScanProgress {
  progress: number;
  stage: string | null;
}

function IdentifyingOverlay({
  scan,
  onCancel,
}: {
  scan: ScanProgress;
  onCancel: () => void;
}) {
  const { progress, stage } = scan;
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0, { duration: 700 })
      ),
      -1,
      true
    );
  }, [pulse]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + pulse.value * 0.5,
    transform: [{ scale: 0.95 + pulse.value * 0.08 }],
  }));

  return (
    <View style={styles.identifyingOverlay}>
      <Animated.View style={iconStyle}>
        <Icon color={Palette.white} name="wineGlass" size={34} />
      </Animated.View>
      <Text style={styles.identifyingTitle}>Identifying label…</Text>
      <Text style={styles.identifyingBody}>
        {stage ? `${stage}…` : "Reading the label and researching the wine."}
      </Text>
      <View style={styles.identifyingProgress}>
        <ProgressBar
          color={Palette.white}
          progress={progress}
          trackColor="rgba(255,255,255,0.22)"
        />
        <Text style={styles.identifyingPercent}>{formatPercent(progress)}</Text>
      </View>
      <Text style={styles.identifyingBody}>
        This runs on your server's AI and can take a minute or two.
      </Text>
      <AnimatedPressable
        accessibilityRole="button"
        onPress={onCancel}
        style={styles.identifyingCancel}
      >
        <Icon color={Palette.white} name="stop" size={15} />
        <Text style={styles.identifyingCancelText}>Stop</Text>
      </AnimatedPressable>
    </View>
  );
}

function CameraBackdrop({
  cameraRef,
  capturedUri,
  granted,
}: {
  cameraRef: RefObject<CameraView | null>;
  capturedUri: string | null;
  granted: boolean;
}) {
  if (capturedUri) {
    return (
      <Image
        contentFit="cover"
        source={{ uri: capturedUri }}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  if (granted) {
    return (
      <CameraView
        facing="back"
        mode="picture"
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return <View style={styles.fallback} />;
}

export function LabelScanView({
  visible,
  onClose,
  onIdentified,
}: LabelScanViewProps) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [identifying, setIdentifying] = useState(false);
  const [scan, setScan] = useState<ScanProgress>({ progress: 0, stage: null });
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const frameWidth = Math.min(width * 0.78, 340);
  const frameHeight = Math.min(frameWidth * 1.38, height * 0.52);
  const topInset = Math.max(insets.top, Platform.OS === "ios" ? 54 : 12);

  useEffect(() => {
    if (visible && permission && !permission.granted) {
      void requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const capture = useCallback(async () => {
    if (identifying) {
      return;
    }
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        base64: true,
        quality: 0.6,
      });
      if (!photo?.base64) {
        return;
      }

      setCapturedUri(photo.uri ?? `data:image/jpeg;base64,${photo.base64}`);
      setIdentifying(true);
      setScan({ progress: 0, stage: null });
      const controller = new AbortController();
      abortRef.current = controller;
      const response = await identifyWineFromLabel(
        `data:image/jpeg;base64,${photo.base64}`,
        {
          onProgress: ({ progress, stage }) => setScan({ progress, stage }),
          signal: controller.signal,
        }
      );
      onIdentified({ label: "Scanned label", results: response.results });
      onClose();
    } catch (error) {
      if (error instanceof JobCancelledError) {
        return;
      }
      console.error("label scan failed", error);
      Alert.alert(
        "Couldn't scan that label",
        error instanceof ResearchUnavailableError
          ? "The AI model on your server isn't ready. Check Preferences → AI model."
          : "Something went wrong reading the photo. Try again with better lighting."
      );
    } finally {
      abortRef.current = null;
      setIdentifying(false);
      setScan({ progress: 0, stage: null });
      setCapturedUri(null);
    }
  }, [identifying, onIdentified, onClose]);

  const cancelScan = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!visible) {
      abortRef.current?.abort();
    }
  }, [visible]);

  const capturePress = useCallback(() => {
    void capture();
  }, [capture]);

  const requestPermissionPress = useCallback(() => {
    void requestPermission();
  }, [requestPermission]);

  const shutterStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.shutter,
      pressed && styles.shutterPressed,
      (!permission?.granted || identifying) && styles.shutterDisabled,
    ],
    [permission, identifying]
  );

  return (
    <View style={styles.root}>
      <CameraBackdrop
        cameraRef={cameraRef}
        capturedUri={capturedUri}
        granted={!!permission?.granted}
      />

      <View pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.dim} />
        <View style={[styles.midRow, { height: frameHeight }]}>
          <View style={styles.dim} />
          <View
            style={[styles.frame, { height: frameHeight, width: frameWidth }]}
          >
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <View style={styles.dim} />
        </View>
        <View style={styles.bottomDim}>
          {permission?.granted && !identifying ? (
            <Text style={styles.hint}>Align the label inside the frame</Text>
          ) : null}
        </View>
      </View>

      {identifying ? (
        <IdentifyingOverlay onCancel={cancelScan} scan={scan} />
      ) : null}

      <View
        pointerEvents="box-none"
        style={[
          styles.chrome,
          {
            paddingBottom: Math.max(insets.bottom, 20) + 12,
            paddingTop: topInset + 16,
          },
        ]}
      >
        <View style={styles.topBar}>
          <ChromeCloseButton
            accessibilityLabel="Close scanner"
            onPress={onClose}
          />
          <Text style={styles.title}>Scan label</Text>
          <View style={styles.topSpacer} />
        </View>

        {permission?.granted ? null : (
          <View style={styles.permission}>
            <Text style={styles.permissionTitle}>Camera access needed</Text>
            <Text style={styles.permissionBody}>
              Allow the camera to frame a wine label and capture it.
            </Text>
            <AnimatedPressable
              accessibilityRole="button"
              onPress={requestPermissionPress}
              style={styles.permissionButton}
            >
              <Icon color={Palette.wine} name="camera" size={18} />
              <Text style={styles.permissionButtonText}>Enable camera</Text>
            </AnimatedPressable>
          </View>
        )}

        <Pressable
          accessibilityLabel="Capture label"
          accessibilityRole="button"
          disabled={!permission?.granted || identifying}
          onPress={capturePress}
          style={shutterStyle}
        >
          <View style={styles.shutterInner} />
        </Pressable>
      </View>
    </View>
  );
}

const dim = "rgba(10, 4, 8, 0.58)";

const styles = StyleSheet.create({
  bottomDim: {
    backgroundColor: dim,
    flex: 1,
  },
  chrome: {
    ...StyleSheet.absoluteFill,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  corner: {
    borderColor: Palette.white,
    height: 28,
    position: "absolute",
    width: 28,
  },
  cornerBottomLeft: {
    borderBottomLeftRadius: 8,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    bottom: -1,
    left: -1,
  },
  cornerBottomRight: {
    borderBottomRightRadius: 8,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    bottom: -1,
    right: -1,
  },
  cornerTopLeft: {
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
    borderTopWidth: 3,
    left: -1,
    top: -1,
  },
  cornerTopRight: {
    borderRightWidth: 3,
    borderTopRightRadius: 8,
    borderTopWidth: 3,
    right: -1,
    top: -1,
  },
  dim: {
    backgroundColor: dim,
    flex: 1,
  },
  fallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#1A1216",
  },
  frame: {
    position: "relative",
  },
  hint: {
    color: Palette.white,
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 24,
    paddingTop: 12,
    textAlign: "center",
  },
  identifyingBody: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: paragraphLeading(20),
    paddingHorizontal: 32,
    textAlign: "center",
  },
  identifyingCancel: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    minHeight: 40,
    paddingHorizontal: 14,
  },
  identifyingCancelText: {
    color: Palette.white,
    fontSize: 13,
    fontWeight: "700",
  },
  identifyingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    backgroundColor: "rgba(10, 4, 8, 0.82)",
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  identifyingPercent: {
    color: Palette.white,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8,
    textAlign: "center",
  },
  identifyingProgress: {
    alignSelf: "stretch",
    marginTop: 6,
    maxWidth: 320,
    paddingHorizontal: 8,
    width: "100%",
  },
  identifyingTitle: {
    color: Palette.white,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  midRow: {
    flexDirection: "row",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  permission: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  permissionBody: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 320,
    textAlign: "center",
  },
  permissionButton: {
    alignItems: "center",
    backgroundColor: Palette.white,
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 46,
    paddingHorizontal: 20,
  },
  permissionButtonText: {
    color: Palette.wine,
    fontSize: 14,
    fontWeight: "800",
  },
  permissionTitle: {
    color: Palette.white,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  root: {
    backgroundColor: "#0A0408",
    flex: 1,
  },
  shutter: {
    alignItems: "center",
    alignSelf: "center",
    borderColor: Palette.white,
    borderRadius: 37,
    borderWidth: 4,
    height: 74,
    justifyContent: "center",
    width: 74,
  },
  shutterDisabled: {
    opacity: 0.35,
  },
  shutterInner: {
    backgroundColor: Palette.white,
    borderRadius: 29,
    height: 58,
    width: 58,
  },
  shutterPressed: {
    transform: [{ scale: 0.96 }],
  },
  title: {
    color: Palette.white,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  topSpacer: {
    width: 42,
  },
});
