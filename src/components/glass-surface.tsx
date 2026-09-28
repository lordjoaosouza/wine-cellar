import type { ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { Palette, Shadows } from "@/constants/theme";

export type GlassVariant = "regular" | "clear";

export type GlassSurfaceProps = ViewProps & {
  variant?: GlassVariant;
  isInteractive?: boolean;
  tintColor?: string;
  luminous?: boolean;
  children?: ReactNode;
};

export type GlassClusterProps = ViewProps & {
  spacing?: number;
  children?: ReactNode;
};

export function GlassSurface({
  variant: _variant = "regular",
  isInteractive: _isInteractive,
  tintColor,
  luminous: _luminous,
  style,
  children,
  ...props
}: GlassSurfaceProps) {
  return (
    <View
      style={[
        styles.base,
        tintColor ? styles.tinted : styles.regular,
        tintColor ? styles.buttonShadow : styles.cardShadow,
        tintColor ? { backgroundColor: tintColor } : null,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export function GlassCluster({
  spacing = 10,
  style,
  children,
  ...props
}: GlassClusterProps) {
  return (
    <View
      style={[
        { alignItems: "center", flexDirection: "row", gap: spacing },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonShadow: { ...Shadows.button },
  cardShadow: { ...Shadows.card },
  regular: {
    backgroundColor: Palette.white,
    borderColor: Palette.separator,
  },
  tinted: {
    borderColor: "transparent",
  },
});
