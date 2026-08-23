import { usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { ProfileButton } from "@/components/profile-avatar";
import { BottomTabInset, Palette, Shadows } from "@/constants/theme";
import { subscribeHomeSearchOpen } from "@/utils/search-intent";

const tabs = [
  {
    caption: "PERSONAL COLLECTION",
    icon: "wineGlass",
    match: (pathname: string) => pathname === "/" || pathname === "",
    title: "WINE CELLAR",
  },
  {
    caption: "BOTTLES TO SEEK",
    icon: "bookmark",
    match: (pathname: string) =>
      pathname === "/wishlist" || pathname.startsWith("/wishlist/"),
    title: "WISH",
  },
  {
    caption: "TASTING NOTES",
    icon: "star",
    match: (pathname: string) =>
      pathname === "/rated" || pathname.startsWith("/rated/"),
    title: "RATED",
  },
  {
    caption: "PERSONAL COLLECTION",
    icon: "wineGlass",
    match: (pathname: string) =>
      pathname === "/cellar" || pathname.startsWith("/cellar/"),
    title: "CELLAR",
  },
] as const;

export const TabHeaderRowHeight = 42;
export const TabHeaderMenuHeight = 56;
export const TabHeaderTopGap = 8;

function menuBottomOffset(insetsBottom: number) {
  return Platform.OS === "web" ? 8 : Math.max(6, insetsBottom);
}

export function useChromeContentGap() {
  const insets = useSafeAreaInsets();
  return (
    BottomTabInset + 96 - TabHeaderMenuHeight - menuBottomOffset(insets.bottom)
  );
}

export function useTabHeaderSlotHeight() {
  return TabHeaderTopGap + TabHeaderMenuHeight + useChromeContentGap();
}

export function TabScreenHeader() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const barWidth = Math.min(1160, width - 24);
  const [searchOpen, setSearchOpen] = useState(false);
  const matched = tabs.find((item) => item.match(pathname));
  const tabRef = useRef<(typeof tabs)[number]>(tabs[0]);
  if (matched) {
    tabRef.current = matched;
  }
  const tab = tabRef.current;

  useEffect(() => subscribeHomeSearchOpen(setSearchOpen), []);

  if (searchOpen) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View
        pointerEvents="box-none"
        style={[styles.menu, { paddingTop: insets.top + TabHeaderTopGap }]}
      >
        <View style={[styles.pill, { width: barWidth }]}>
          <View style={styles.lockup}>
            <View style={styles.mark}>
              <Icon color={Palette.white} name={tab.icon} size={20} />
            </View>
            <View>
              <Text style={styles.title}>{tab.title}</Text>
              <Text style={styles.caption}>{tab.caption}</Text>
            </View>
          </View>
          <ProfileButton />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: Palette.muted,
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1.65,
    lineHeight: 12,
  },
  lockup: { alignItems: "center", flexDirection: "row", gap: 12 },
  mark: {
    alignItems: "center",
    backgroundColor: Palette.wine,
    borderRadius: TabHeaderRowHeight / 2,
    height: TabHeaderRowHeight,
    justifyContent: "center",
    width: TabHeaderRowHeight,
  },
  menu: {
    alignItems: "center",
    paddingHorizontal: 12,
  },
  overlay: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20,
  },
  pill: {
    alignItems: "center",
    backgroundColor: Palette.white,
    borderColor: Palette.separator,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: TabHeaderMenuHeight,
    justifyContent: "space-between",
    paddingHorizontal: 7,
    ...Shadows.card,
  },
  title: {
    color: Palette.wineDark,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.4,
    lineHeight: 18,
  },
});
