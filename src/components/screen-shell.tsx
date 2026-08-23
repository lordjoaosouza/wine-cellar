import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { type Edge, SafeAreaView } from "react-native-safe-area-context";

import { LiquidCanvas } from "@/components/liquid-canvas";
import { Palette } from "@/constants/theme";

export function ScreenShell({
  children,
  edges = ["top", "left", "right"],
}: {
  children: ReactNode;
  edges?: Edge[];
}) {
  return (
    <View style={styles.root}>
      <LiquidCanvas />
      <SafeAreaView edges={edges} style={styles.safe}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Palette.white,
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  safe: {
    backgroundColor: "transparent",
    flex: 1,
  },
});
