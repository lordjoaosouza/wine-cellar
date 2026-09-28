import type { WineSearchResult } from "@/types/wine";

let homeSearchOpen = false;
const homeSearchOpenListeners = new Set<(open: boolean) => void>();

export function requestHomeSearch() {
  setHomeSearchOpen(true);
}

export function setHomeSearchOpen(open: boolean) {
  if (homeSearchOpen === open) {
    return;
  }
  homeSearchOpen = open;
  for (const listener of homeSearchOpenListeners) {
    listener(homeSearchOpen);
  }
}

export function subscribeHomeSearchOpen(listener: (open: boolean) => void) {
  homeSearchOpenListeners.add(listener);
  listener(homeSearchOpen);
  return () => {
    homeSearchOpenListeners.delete(listener);
  };
}

export interface HomeSearchPreset {
  label: string;
  results: WineSearchResult[];
}

let pendingPreset: HomeSearchPreset | null = null;

export function openHomeSearchWithResults(preset: HomeSearchPreset) {
  pendingPreset = preset;
  setHomeSearchOpen(true);
}

export function takePendingHomeSearchPreset(): HomeSearchPreset | null {
  const preset = pendingPreset;
  pendingPreset = null;
  return preset;
}
