import { Navigator, usePathname } from "expo-router";
import { TabContext } from "expo-router/ui";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

const DURATION = 420;
const SNAP_EASING = Easing.bezier(0.22, 1, 0.36, 1);

function tabRank(name: string) {
  if (name === "home" || name === "index") {
    return 0;
  }
  if (name === "wishlist") {
    return 1;
  }
  if (name === "rated") {
    return 2;
  }
  if (name === "cellar") {
    return 3;
  }
  return 99;
}

function isTabPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "" ||
    pathname === "/wishlist" ||
    pathname.startsWith("/wishlist/") ||
    pathname === "/rated" ||
    pathname.startsWith("/rated/") ||
    pathname === "/cellar" ||
    pathname.startsWith("/cellar/")
  );
}

function routeNamesForPath(pathname: string) {
  if (pathname === "/wishlist" || pathname.startsWith("/wishlist/")) {
    return ["wishlist"];
  }
  if (pathname === "/rated" || pathname.startsWith("/rated/")) {
    return ["rated"];
  }
  if (pathname === "/cellar" || pathname.startsWith("/cellar/")) {
    return ["cellar"];
  }
  return ["home", "index"];
}

function tabIndexForPath(pathname: string, routes: { name: string }[]) {
  const names = routeNamesForPath(pathname);
  const index = routes.findIndex((route) => names.includes(route.name));
  return index >= 0 ? index : 0;
}

export function SlideTabPager() {
  const { state, descriptors } = Navigator.useContext();
  const pathname = usePathname();
  const orderedRoutes = useMemo(
    () => [...state.routes].sort((a, b) => tabRank(a.name) - tabRank(b.name)),
    [state.routes]
  );
  const pathIndex = tabIndexForPath(pathname, orderedRoutes);
  const lastTabIndex = useRef(pathIndex);
  if (isTabPath(pathname)) {
    lastTabIndex.current = pathIndex;
  }
  const activeIndex = lastTabIndex.current;
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(-activeIndex * width)).current;
  const previousWidth = useRef(width);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }
    window.scrollTo(0, 0);
    const scrolling = document.scrollingElement ?? document.documentElement;
    scrolling.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const root = document.getElementById("root");
    if (root) {
      root.scrollTop = 0;
    }
  }, []);

  useEffect(() => {
    const nextValue = -activeIndex * width;
    const widthChanged = previousWidth.current !== width;
    previousWidth.current = width;

    if (widthChanged) {
      translateX.setValue(nextValue);
      return;
    }

    Animated.timing(translateX, {
      duration: DURATION,
      easing: SNAP_EASING,
      toValue: nextValue,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, translateX, width]);

  return (
    <View style={styles.viewport}>
      <Animated.View
        style={[
          styles.track,
          {
            transform: [{ translateX }],
            width: width * Math.max(orderedRoutes.length, 1),
          },
        ]}
      >
        {orderedRoutes.map((route, index) => {
          const descriptor = descriptors[route.key];
          const focused = index === activeIndex;

          return (
            <TabContext.Provider key={route.key} value={descriptor.options}>
              <View
                accessibilityElementsHidden={!focused}
                importantForAccessibility={
                  focused ? "auto" : "no-hide-descendants"
                }
                pointerEvents={focused ? "auto" : "none"}
                style={[styles.page, { width }]}
              >
                {descriptor.render()}
              </View>
            </TabContext.Provider>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 0,
    flexShrink: 0,
    height: "100%",
    overflow: "hidden",
  },
  track: {
    flex: 1,
    flexDirection: "row",
  },
  viewport: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
});
