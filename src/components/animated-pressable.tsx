import { type Ref, useCallback } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  type View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

const DISABLED_OPACITY = 0.4;
const PRESS_SPRING = { damping: 16, mass: 0.5, stiffness: 380 } as const;
const RELEASE_SPRING = { damping: 13, mass: 0.5, stiffness: 240 } as const;

export type AnimatedPressableProps = Omit<PressableProps, "style"> & {
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
};

export const AnimatedPressable = function AnimatedPressable({
  scaleTo = 0.96,
  style,
  onPressIn,
  onPressOut,
  children,
  ref,
  ...props
}: AnimatedPressableProps & { ref?: Ref<View> }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback<NonNullable<PressableProps["onPressIn"]>>(
    (event) => {
      scale.value = withSpring(scaleTo, PRESS_SPRING);
      onPressIn?.(event);
    },
    [scale, scaleTo, onPressIn]
  );

  const handlePressOut = useCallback<NonNullable<PressableProps["onPressOut"]>>(
    (event) => {
      scale.value = withSpring(1, RELEASE_SPRING);
      onPressOut?.(event);
    },
    [scale, onPressOut]
  );

  return (
    <ReanimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      ref={ref}
      style={[animatedStyle, style, props.disabled && styles.disabled]}
      {...props}
    >
      {children}
    </ReanimatedPressable>
  );
};

const styles = StyleSheet.create({ disabled: { opacity: DISABLED_OPACITY } });
