import { Palette } from "@/constants/theme";

export function LiquidCanvas() {
  return (
    <div
      aria-hidden
      style={{
        background: Palette.white,
        inset: 0,
        pointerEvents: "none",
        position: "absolute",
      }}
    />
  );
}
