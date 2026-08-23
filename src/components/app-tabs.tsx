import {
  TabList,
  Tabs,
  TabTrigger,
  type TabTriggerSlotProps,
} from "expo-router/ui";
import { useCallback } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/animated-pressable";
import { Icon, type IconName } from "@/components/icon";
import { SearchModalHost } from "@/components/search-modal";
import { SlideTabPager } from "@/components/slide-tab-pager";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { Palette, Shadows } from "@/constants/theme";
import { haptics } from "@/utils/haptics";

type TabIcon = "home" | "bookmark" | "star" | "wine_bar";

const tabIcons: Record<TabIcon, IconName> = {
  bookmark: "bookmark",
  home: "home",
  star: "star",
  wine_bar: "wineGlass",
};

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const barWidth = Math.min(328, width - 24);

  return (
    <Tabs style={styles.tabs}>
      <SlideTabPager />
      <TabScreenHeader />
      <SearchModalHost />
      <TabList
        style={[
          styles.tabList,
          {
            bottom: Math.max(6, insets.bottom),
            marginLeft: -barWidth / 2,
            width: barWidth,
          },
        ]}
      >
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
  onPress,
  ...props
}: TabTriggerSlotProps & { label: string; icon: TabIcon }) {
  const color = isFocused ? Palette.wine : Palette.ink;
  const handlePress: typeof onPress = useCallback(
    (event) => {
      if (!isFocused) {
        haptics.select();
      }
      onPress?.(event);
    },
    [isFocused, onPress]
  );
  return (
    <AnimatedPressable
      {...props}
      accessibilityLabel={icon === "bookmark" ? "Wishlist" : label}
      onPress={handlePress}
      scaleTo={0.9}
      style={[styles.tabButton, isFocused && styles.tabButtonSelected]}
    >
      <Icon color={color} name={tabIcons[icon]} size={22} />
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
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
    flexDirection: "row",
    height: 56,
    justifyContent: "center",
    left: "50%",
    overflow: "visible",
    padding: 4,
    position: "absolute",
    zIndex: 30,
  },
  tabs: { flex: 1, overflow: "hidden" },
});
