import { useEffect } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Palette } from "@/constants/theme";
import { clampProgress } from "@/utils/format-progress";

export function ProgressBar({
  progress,
  color = Palette.wine,
  trackColor = Palette.lilac,
  height = 6,
  style,
}: {
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const width = useSharedValue(clampProgress(progress));

  useEffect(() => {
    width.value = withTiming(clampProgress(progress), { duration: 380 });
  }, [progress, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{
        max: 100,
        min: 0,
        now: Math.round(clampProgress(progress) * 100),
      }}
      style={[
        styles.track,
        { backgroundColor: trackColor, borderRadius: height / 2, height },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: color, borderRadius: height / 2 },
          fillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { height: "100%" },
  track: { overflow: "hidden", width: "100%" },
});
