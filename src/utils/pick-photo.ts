import {
  type ImagePickerAsset,
  type ImagePickerOptions,
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import { ActionSheetIOS, Alert, Platform } from "react-native";

export type PickPhotoResult = { uri: string } | { removed: true } | null;

function toDataUri(asset: ImagePickerAsset) {
  if (asset.base64) {
    const mime = asset.mimeType || "image/jpeg";
    return `data:${mime};base64,${asset.base64}`;
  }
  return asset.uri;
}

async function takePhoto(options: ImagePickerOptions): Promise<string | null> {
  const permission = await requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Camera access needed", "Allow the camera to take a photo.");
    return null;
  }
  const result = await launchCameraAsync(options);
  if (result.canceled || !result.assets[0]) {
    return null;
  }
  return toDataUri(result.assets[0]);
}

async function choosePhoto(
  options: ImagePickerOptions
): Promise<string | null> {
  const permission = await requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Photo access needed",
      "Allow photo access to choose a picture."
    );
    return null;
  }
  const result = await launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) {
    return null;
  }
  return toDataUri(result.assets[0]);
}

export function promptPickPhoto({
  title,
  hasExisting,
  allowsEditing = true,
}: {
  title?: string;
  hasExisting: boolean;
  allowsEditing?: boolean;
}): Promise<PickPhotoResult> {
  const options: ImagePickerOptions = {
    allowsEditing,
    base64: true,
    mediaTypes: ["images"],
    quality: 0.7,
  };

  return new Promise((resolve) => {
    const openCamera = () =>
      void takePhoto(options).then((uri) => resolve(uri ? { uri } : null));
    const openLibrary = () =>
      void choosePhoto(options).then((uri) => resolve(uri ? { uri } : null));
    const remove = () => resolve({ removed: true });

    if (Platform.OS === "ios") {
      const actionSheetOptions = hasExisting
        ? ["Take photo", "Choose from library", "Remove photo", "Cancel"]
        : ["Take photo", "Choose from library", "Cancel"];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          cancelButtonIndex: actionSheetOptions.length - 1,
          destructiveButtonIndex: hasExisting ? 2 : undefined,
          options: actionSheetOptions,
          title,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            openCamera();
          } else if (buttonIndex === 1) {
            openLibrary();
          } else if (hasExisting && buttonIndex === 2) {
            remove();
          } else {
            resolve(null);
          }
        }
      );
      return;
    }

    Alert.alert(title ?? "Photo", undefined, [
      { onPress: openCamera, text: "Take photo" },
      { onPress: openLibrary, text: "Choose from library" },
      ...(hasExisting
        ? [
            {
              onPress: remove,
              style: "destructive" as const,
              text: "Remove photo",
            },
          ]
        : []),
      {
        onPress: () => resolve(null),
        style: "cancel" as const,
        text: "Cancel",
      },
    ]);
  });
}
