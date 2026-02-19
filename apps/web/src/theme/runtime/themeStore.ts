import { THEME_PRESETS } from "../themes";

export type ThemeStore = {
  hostThemeId: keyof typeof THEME_PRESETS;
  programThemeId: keyof typeof THEME_PRESETS;
  reducedMotion: boolean;
  highContrast: boolean;
  obsSafeDefault: boolean;
  manualThemeSelection: boolean;
};

const KEY = "ezplay-theme-store-v6";

export function loadThemeStore(): ThemeStore | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ThemeStore>;
    return {
      hostThemeId: (parsed.hostThemeId as keyof typeof THEME_PRESETS) || "streetballFlyer",
      programThemeId: (parsed.programThemeId as keyof typeof THEME_PRESETS) || "arenaProElite",
      reducedMotion: Boolean(parsed.reducedMotion),
      highContrast: Boolean(parsed.highContrast),
      obsSafeDefault: Boolean(parsed.obsSafeDefault),
      manualThemeSelection: Boolean(parsed.manualThemeSelection)
    };
  } catch {
    return null;
  }
}

export function saveThemeStore(store: ThemeStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(store));
}
