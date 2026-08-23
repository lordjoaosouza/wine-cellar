import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export function useFocusScale(scaleTo = 1.012) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onFocus = () => {
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are mutated by design.
    scale.value = withSpring(scaleTo, { damping: 16, stiffness: 260 });
  };
  const onBlur = () => {
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are mutated by design.
    scale.value = withSpring(1, { damping: 16, stiffness: 260 });
  };

  return { animatedStyle, onBlur, onFocus };
}
