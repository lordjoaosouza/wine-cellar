import { Alert } from "react-native";

export function confirmDelete({
  title,
  message,
  confirmLabel = "Delete",
}: {
  title: string;
  message?: string;
  confirmLabel?: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { onPress: () => resolve(false), style: "cancel", text: "Cancel" },
        {
          onPress: () => resolve(true),
          style: "destructive",
          text: confirmLabel,
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
