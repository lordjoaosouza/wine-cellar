import type { StackCardStyleInterpolator } from "expo-router/js-stack";
import { Animated } from "react-native";

export const forFullHorizontalSlide: StackCardStyleInterpolator = ({
  current,
  inverted,
  layouts: { screen },
}) => {
  const incoming = Animated.multiply(
    current.progress.interpolate({
      extrapolate: "clamp",
      inputRange: [0, 1],
      outputRange: [screen.width, 0],
    }),
    inverted
  );

  return {
    cardStyle: {
      transform: [{ translateX: incoming }],
    },
  };
};

export const forVerticalCover: StackCardStyleInterpolator = ({
  current,
  inverted,
  layouts: { screen },
}) => {
  const translateY = Animated.multiply(
    current.progress.interpolate({
      extrapolate: "clamp",
      inputRange: [0, 1],
      outputRange: [screen.height, 0],
    }),
    inverted
  );

  return {
    cardStyle: {
      transform: [{ translateY }],
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        extrapolate: "clamp",
        inputRange: [0, 1],
        outputRange: [0, 0.16],
      }),
    },
  };
};
