import { Image, type ImageSource } from "expo-image";

import { FRAMED_IMAGE_SIZE } from "@/utils/wine-format";
import { wineTypeSlug } from "@/utils/wine-illustration";

const ILLUSTRATIONS: Record<string, ImageSource> = {
  champagne: require("../assets/wine-illustrations/champagne.png"),
  "dessert-wine": require("../assets/wine-illustrations/dessert-wine.png"),
  "dry-red": require("../assets/wine-illustrations/dry-red.png"),
  "dry-white": require("../assets/wine-illustrations/dry-white.png"),
  "fortified-wine": require("../assets/wine-illustrations/fortified-wine.png"),
  "medium-bodied-red": require("../assets/wine-illustrations/medium-bodied-red.png"),
  "off-dry-white": require("../assets/wine-illustrations/off-dry-white.png"),
  "orange-wine": require("../assets/wine-illustrations/orange-wine.png"),
  rose: require("../assets/wine-illustrations/rose.png"),
  "sparkling-rose": require("../assets/wine-illustrations/sparkling-rose.png"),
  "sparkling-wine": require("../assets/wine-illustrations/sparkling-wine.png"),
  "sweet-red": require("../assets/wine-illustrations/sweet-red.png"),
  "sweet-white": require("../assets/wine-illustrations/sweet-white.png"),
};

/** The illustration for the wine's style, at 96% of its frame. */
export function WineIllustration({ type }: { type: string | null }) {
  const source = ILLUSTRATIONS[wineTypeSlug(type)] ?? ILLUSTRATIONS["dry-red"];

  return (
    <Image
      accessibilityLabel={type ? `${type} illustration` : "Wine illustration"}
      contentFit="contain"
      source={source}
      style={{ height: FRAMED_IMAGE_SIZE, width: FRAMED_IMAGE_SIZE }}
    />
  );
}
