import { StyleSheet, View } from "react-native";

import { Palette } from "@/constants/theme";

export function LiquidCanvas() {
  return <View pointerEvents="none" style={styles.canvas} />;
}

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Palette.white,
  },
});
