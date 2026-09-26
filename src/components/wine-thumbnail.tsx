import { Image } from "expo-image";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { WineIllustration } from "@/components/wine-illustration";
import { Palette, Shadows } from "@/constants/theme";
import type { Wine } from "@/types/wine";
import { FRAMED_IMAGE_SIZE, photoFillsFrame } from "@/utils/wine-format";

/**
 * The small bottle frame used in lists: a store's photo or the wine's
 * illustration at 96% of the frame, or the scanned label filling it whole.
 * Falls back to the illustration when the photo fails to load.
 */
export function WineThumbnail({
  wine,
}: {
  wine: Pick<Wine, "imageSource" | "imageUrl" | "name" | "type">;
}) {
  const [failed, setFailed] = useState(false);
  const handleError = useCallback(() => setFailed(true), []);
  const photoUrl = failed ? null : wine.imageUrl;
  const fillsFrame = photoFillsFrame(wine.imageSource);

  return (
    <View accessible={Boolean(photoUrl)} style={styles.stage}>
      {photoUrl ? (
        <Image
          accessibilityLabel={`Label for ${wine.name}`}
          contentFit={fillsFrame ? "cover" : "contain"}
          onError={handleError}
          source={{ uri: photoUrl }}
          style={fillsFrame ? styles.filledPhoto : styles.framedPhoto}
        />
      ) : (
        <WineIllustration type={wine.type} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Rounded on the image itself so the stage keeps its shadow on iOS.
  filledPhoto: { borderRadius: 13, height: "100%", width: "100%" },
  framedPhoto: { height: FRAMED_IMAGE_SIZE, width: FRAMED_IMAGE_SIZE },
  stage: {
    alignItems: "center",
    backgroundColor: Palette.white,
    borderRadius: 13,
    height: 102,
    justifyContent: "center",
    minWidth: 74,
    width: 74,
    ...Shadows.card,
  },
});
