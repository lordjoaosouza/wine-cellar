import {
  DefaultTheme,
  ThemeProvider,
  useRouter,
  useSegments,
} from "expo-router";
import { Stack, type StackCardStyleInterpolator } from "expo-router/js-stack";
import { useEffect } from "react";
import { Easing, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { Palette } from "@/constants/theme";
import { AuthProvider, useSession } from "@/contexts/auth-context";
import {
  forFullHorizontalSlide,
  forVerticalCover,
} from "@/utils/screen-transitions";

const slideSpec = {
  animation: "timing" as const,
  config: {
    duration: 420,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  },
};

const isWeb = Platform.OS === "web";
const noCardStyle: StackCardStyleInterpolator = () => ({});

function useAuthGuard() {
  const { isLoading, isAuthenticated } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    const onLoginScreen = segments[0] === "login";
    if (!(isAuthenticated || onLoginScreen)) {
      router.replace("/login");
    } else if (isAuthenticated && onLoginScreen) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, segments, router]);
}

function RootNavigator() {
  useAuthGuard();

  return (
    <Stack
      screenOptions={{
        cardOverlayEnabled: false,
        cardShadowEnabled: false,
        cardStyle: { backgroundColor: Palette.white },
        cardStyleInterpolator: isWeb ? noCardStyle : forFullHorizontalSlide,
        gestureDirection: "horizontal",
        gestureEnabled: !isWeb,
        gestureResponseDistance: 80,
        headerShown: false,
        transitionSpec: {
          close: {
            ...slideSpec,
            config: {
              ...slideSpec.config,
              duration: 380,
            },
          },
          open: slideSpec,
        },
      }}
    >
      <Stack.Screen name="login" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="wine/[id]" />
      <Stack.Screen
        name="preferences"
        options={{
          cardOverlayEnabled: true,
          cardShadowEnabled: false,
          cardStyle: { backgroundColor: Palette.white },
          cardStyleInterpolator: isWeb ? noCardStyle : forVerticalCover,
          detachPreviousScreen: false,
          gestureDirection: "vertical",
          gestureEnabled: !isWeb,
          gestureResponseDistance: 160,
          presentation: "transparentModal",
          transitionSpec: {
            close: slideSpec,
            open: slideSpec,
          },
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DefaultTheme}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
