import type { ReactNode } from "react";
import {
  Modal,
  type ModalProps,
  Platform,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";

export function ModalShell({
  visible,
  onRequestClose,
  webOverlayStyle,
  animationType,
  transparent,
  presentationStyle,
  statusBarTranslucent,
  children,
}: {
  visible: boolean;
  onRequestClose: () => void;
  webOverlayStyle: StyleProp<ViewStyle>;
  animationType: ModalProps["animationType"];
  transparent?: boolean;
  presentationStyle?: ModalProps["presentationStyle"];
  statusBarTranslucent?: boolean;
  children: ReactNode;
}) {
  if (Platform.OS === "web") {
    if (!visible) {
      return null;
    }
    return <View style={webOverlayStyle}>{children}</View>;
  }

  return (
    <Modal
      animationType={animationType}
      onRequestClose={onRequestClose}
      presentationStyle={presentationStyle}
      statusBarTranslucent={statusBarTranslucent}
      transparent={transparent}
      visible={visible}
    >
      {children}
    </Modal>
  );
}
