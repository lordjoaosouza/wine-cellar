import {
  TabList,
  Tabs,
  TabTrigger,
  type TabTriggerSlotProps,
} from "expo-router/ui";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { SearchModalHost } from "@/components/search-modal";
import { SlideTabPager } from "@/components/slide-tab-pager";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { Palette, Shadows } from "@/constants/theme";

type TabIcon = "home" | "bookmark" | "star" | "wine_bar";

const tabIcons: Record<TabIcon, IconName> = {
  bookmark: "bookmark",
  home: "home",
  star: "star",
  wine_bar: "wineGlass",
};

export default function AppTabs() {
  return (
    <Tabs style={[styles.tabs, styles.fullViewportHeight]}>
      <SlideTabPager />
      <TabScreenHeader />
      <SearchModalHost />
      <TabList style={styles.tabList}>
        <View pointerEvents="none" style={styles.tabFill} />
        <TabTrigger asChild href="/" name="home">
          <TabButton icon="home" label="Home" />
        </TabTrigger>
        <TabTrigger asChild href="/wishlist" name="wishlist">
          <TabButton icon="bookmark" label="Wish" />
        </TabTrigger>
        <TabTrigger asChild href="/rated" name="rated">
          <TabButton icon="star" label="Rated" />
        </TabTrigger>
        <TabTrigger asChild href="/cellar" name="cellar">
          <TabButton icon="wine_bar" label="Cellar" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  isFocused,
  label,
  icon,
  ...props
}: TabTriggerSlotProps & { label: string; icon: TabIcon }) {
  const color = isFocused ? Palette.wine : Palette.ink;
  const tabButtonStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.tabButton,
      isFocused && styles.tabButtonSelected,
      pressed && styles.pressed,
    ],
    [isFocused]
  );
  return (
    <Pressable
      {...props}
      accessibilityLabel={icon === "bookmark" ? "Wishlist" : label}
      style={tabButtonStyle}
    >
      <Icon color={color} name={tabIcons[icon]} size={22} />
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullViewportHeight: { height: "100vh" as unknown as number },
  pressed: { transform: [{ scale: 0.96 }] },
  tabButton: {
    alignItems: "center",
    borderRadius: 24,
    flex: 1,
    gap: 1,
    justifyContent: "center",
    zIndex: 2,
  },
  tabButtonSelected: {
    backgroundColor: "rgba(26, 18, 22, 0.08)",
  },
  tabFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Palette.white,
    borderColor: Palette.separator,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.card,
    zIndex: 0,
  },
  tabLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.1 },
  tabList: {
    backgroundColor: "transparent",
    borderRadius: 28,
    bottom: 8,
    flexDirection: "row",
    height: 56,
    justifyContent: "center",
    left: "50%",
    marginLeft: -164,
    overflow: "visible",
    padding: 4,
    position: "absolute",
    width: 328,
    zIndex: 30,
  },
  tabs: {
    flex: 1,
    height: "100%",
    overflow: "hidden",
  },
});
