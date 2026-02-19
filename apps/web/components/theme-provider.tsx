"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { applyTheme } from "@/src/theme/runtime/applyTheme";
import { loadThemeStore, saveThemeStore, type ThemeStore } from "@/src/theme/runtime/themeStore";
import { THEME_PRESETS } from "@/src/theme/themes";
import { getDefaultThemeByRoute } from "@/src/theme/runtime/getDefaultThemeByRoute";

type ThemeContextValue = ThemeStore & {
  setHostThemeId: (id: ThemeStore["hostThemeId"]) => void;
  setProgramThemeId: (id: ThemeStore["programThemeId"]) => void;
  setReducedMotion: (v: boolean) => void;
  setHighContrast: (v: boolean) => void;
  setObsSafeDefault: (v: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const baseDefaults: ThemeStore = {
  hostThemeId: "streetballFlyer",
  programThemeId: "arenaProElite",
  reducedMotion: false,
  highContrast: false,
  obsSafeDefault: false,
  manualThemeSelection: false
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [store, setStore] = useState<ThemeStore>(baseDefaults);

  useEffect(() => {
    const saved = loadThemeStore();
    if (saved) {
      setStore(saved);
      return;
    }
    const routeDefaults = getDefaultThemeByRoute(pathname || "/");
    setStore((s) => ({ ...s, ...routeDefaults, manualThemeSelection: false }));
  }, [pathname]);

  useEffect(() => {
    const effective = store.manualThemeSelection
      ? store
      : { ...store, ...getDefaultThemeByRoute(pathname || "/") };

    const activeThemeId = (pathname || "").startsWith("/program/") ? effective.programThemeId : effective.hostThemeId;
    applyTheme(THEME_PRESETS[activeThemeId], {
      reducedMotion: effective.reducedMotion,
      highContrast: effective.highContrast,
      obsSafe: effective.obsSafeDefault
    });

    document.body.dataset.reducedMotion = String(effective.reducedMotion);
    document.body.dataset.highContrast = String(effective.highContrast);
    document.body.dataset.obsSafe = String(effective.obsSafeDefault);

    saveThemeStore(effective);
  }, [pathname, store]);

  const value = useMemo(() => ({
    ...store,
    setHostThemeId: (hostThemeId: ThemeStore["hostThemeId"]) => setStore((s) => ({ ...s, hostThemeId, manualThemeSelection: true })),
    setProgramThemeId: (programThemeId: ThemeStore["programThemeId"]) => setStore((s) => ({ ...s, programThemeId, manualThemeSelection: true })),
    setReducedMotion: (reducedMotion: boolean) => setStore((s) => ({ ...s, reducedMotion })),
    setHighContrast: (highContrast: boolean) => setStore((s) => ({ ...s, highContrast })),
    setObsSafeDefault: (obsSafeDefault: boolean) => setStore((s) => ({ ...s, obsSafeDefault }))
  }), [store]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeSettings() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("Theme context unavailable");
  return ctx;
}
