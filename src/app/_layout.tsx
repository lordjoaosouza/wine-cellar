import {
  DefaultTheme,
  ThemeProvider,
  useRouter,
  useSegments,
} from "expo-router";
import { Stack } from "expo-router/js-stack";
import { useEffect } from "react";
import { Easing } from "react-native";
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
        cardStyleInterpolator: forFullHorizontalSlide,
        gestureDirection: "horizontal",
        gestureEnabled: true,
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
          cardStyleInterpolator: forVerticalCover,
          detachPreviousScreen: false,
          gestureDirection: "vertical",
          gestureEnabled: true,
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
