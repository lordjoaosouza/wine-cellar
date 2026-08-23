import "@/global.css";

import { Platform } from "react-native";

export const Palette = {
  blush: "#F7EEF3",
  canvas: "#FFFFFF",
  gold: "#C4A574",
  ink: "#1A1216",
  lilac: "#E8D4DE",
  line: "rgba(92, 23, 54, 0.08)",
  muted: "#6B5C63",
  placeholder: "#D4CED1",
  placeholderDark: "#A39AA0",
  plum: "#7A2B54",
  separator: "#E5E5EA",
  success: "#3FA34D",
  surface: "#F2F2F7",
  white: "#FFFFFF",
  wine: "#5C1736",
  wineDark: "#2A101C",
  wineInset: "#3D1828",
} as const;

export const Radii = {
  card: 28,
  control: 22,
  icon: 16,
  pill: 999,
  sheet: 34,
} as const;

export const Fonts = Platform.select({
  default: {
    mono: "monospace",
    rounded: "normal",
    sans: "normal",
    serif: "serif",
  },
  ios: {
    mono: "ui-monospace",
    rounded: "ui-rounded",
    sans: "system-ui",
    serif: "ui-serif",
  },
  web: {
    mono: "var(--font-mono)",
    rounded: "var(--font-rounded)",
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
  },
});

export const Spacing = {
  five: 32,
  four: 24,
  half: 2,
  one: 4,
  six: 64,
  three: 16,
  two: 8,
} as const;

export const BottomTabInset =
  Platform.select({ android: 80, ios: 72, web: 80 }) ?? 0;

export function paragraphLeading(px: number): number {
  return px + 0.01;
}

export const Shadows = {
  button: {
    boxShadow:
      "0 1px 3px rgba(92, 23, 54, 0.08), 0 6px 14px rgba(92, 23, 54, 0.1)",
    elevation: 3,
    shadowColor: "#5C1736",
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  card: {
    boxShadow:
      "0 1px 2px rgba(26, 18, 22, 0.03), 0 6px 16px rgba(26, 18, 22, 0.04)",
    elevation: 2,
    shadowColor: "#1A1216",
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  raised: {
    boxShadow:
      "0 2px 6px rgba(42, 16, 28, 0.06), 0 10px 22px rgba(42, 16, 28, 0.08)",
    elevation: 4,
    shadowColor: "#2A101C",
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
} as const;
