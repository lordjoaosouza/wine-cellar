import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform, type ScrollView } from "react-native";

export function resetWindowScroll() {
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
}

export function useScrollToTopOnNavigate() {
  const ref = useRef<ScrollView>(null);
  const _pathname = usePathname();

  useEffect(() => {
    const scroll = () => {
      ref.current?.scrollTo({ animated: false, x: 0, y: 0 });
      resetWindowScroll();
    };

    scroll();
    const frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, []);

  return ref;
}
