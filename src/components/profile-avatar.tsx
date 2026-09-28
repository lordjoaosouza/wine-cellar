import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import {
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { Palette } from "@/constants/theme";
import { useUserProfile } from "@/hooks/use-user-profile";
import { profileInitials } from "@/services/user-profile";
import type { UserProfile } from "@/types/profile";

export function ProfileAvatar({
  profile,
  size = 42,
  style,
}: {
  profile: UserProfile;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const initials = profileInitials(profile);

  return (
    <View
      style={[
        styles.base,
        { borderRadius: size / 2, height: size, width: size },
        style,
      ]}
    >
      {profile.avatarUri ? (
        <Image
          accessibilityLabel="Profile photo"
          contentFit="cover"
          source={{ uri: profile.avatarUri }}
          style={{ borderRadius: size / 2, height: size, width: size }}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.round(size * 0.28) }]}>
          {initials}
        </Text>
      )}
    </View>
  );
}

function pressedScaleStyle({ pressed }: { pressed: boolean }) {
  return pressed ? styles.pressedScale : undefined;
}

export function ProfileButton() {
  const router = useRouter();
  const { profile } = useUserProfile();

  const handlePress = useCallback(() => {
    router.push("/preferences");
  }, [router]);

  return (
    <Pressable
      accessibilityLabel="Open preferences"
      accessibilityRole="button"
      onPress={handlePress}
      style={pressedScaleStyle}
    >
      <ProfileAvatar profile={profile} size={42} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    backgroundColor: Palette.white,
    justifyContent: "center",
    overflow: "hidden",
  },
  initials: {
    color: Palette.wine,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  pressedScale: { transform: [{ scale: 0.97 }] },
});
