import { createPortal } from "react-dom";
import { StyleSheet, View } from "react-native";

import { LabelScanView } from "@/components/label-scan-view";
import type { HomeSearchPreset } from "@/utils/search-intent";

interface LabelScanModalProps {
  onClose: () => void;
  onIdentified: (preset: HomeSearchPreset) => void;
  visible: boolean;
}

export function LabelScanModal({
  visible,
  onClose,
  onIdentified,
}: LabelScanModalProps) {
  if (!visible || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <View accessibilityViewIsModal style={styles.host}>
      <LabelScanView
        onClose={onClose}
        onIdentified={onIdentified}
        visible={visible}
      />
    </View>,
    document.body
  );
}

const styles = StyleSheet.create({
  host: {
    bottom: 0,
    height: "100%",
    left: 0,
    position: "fixed",
    right: 0,
    top: 0,
    width: "100%",
    zIndex: 9999,
  },
});
