import { type StyleProp, StyleSheet, type ViewStyle } from "react-native";

import { AnimatedPressable } from "@/components/animated-pressable";
import { GlassSurface } from "@/components/glass-surface";
import { Icon } from "@/components/icon";
import { Palette } from "@/constants/theme";

export function ChromeCloseButton({
  accessibilityLabel,
  onPress,
  style,
}: {
  accessibilityLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      scaleTo={0.9}
      style={style}
    >
      <GlassSurface isInteractive style={styles.button}>
        <Icon color={Palette.ink} name="close" size={19} />
      </GlassSurface>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
});
