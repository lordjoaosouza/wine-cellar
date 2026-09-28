import { Modal } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

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
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <SafeAreaProvider>
        <LabelScanView
          onClose={onClose}
          onIdentified={onIdentified}
          visible={visible}
        />
      </SafeAreaProvider>
    </Modal>
  );
}
