import type { EzTheme } from "../types";

export const arenaProTheme: EzTheme = {
  id: "arenaProElite",
  name: "Arena Pro",
  colors: {
    bg0: "13 18 27",
    bg1: "18 26 39",
    panel: "23 33 48",
    border: "69 90 121",
    text: "247 250 255",
    muted: "151 168 191",
    accent: "58 168 255",
    accent2: "255 196 67",
    danger: "236 95 95",
    success: "86 207 122"
  },
  shadows: { glowStrength: "0 0 16px rgb(58 168 255 / 0.35)", shadowStrength: "0 10px 22px rgb(0 0 0 / 0.4)" },
  typography: { fontDisplay: "'Teko', sans-serif", fontBody: "'Inter', sans-serif", letterSpacing: "0.03em", fontWeight: "700" },
  radii: { cardRadius: "10px", buttonRadius: "8px" },
  borders: { borderWidth: "1px", outlineStyle: "solid" },
  textures: { textureBgUrl: "url('/skins/home/arena_bg.svg')", texturePanelUrl: "url('/skins/home/arena_edge_glow.svg')" },
  sfx: { clickSfx: "tap", hypeSfx: "crowd-pop" },
  motion: { transitionMs: 140, easing: "ease-out" },
  home: {
    bgImage: "/skins/home/arena_bg.svg",
    bgOverlay: "linear-gradient(180deg, rgb(7 10 14 / .45), rgb(7 10 14 / .72))",
    grainOpacity: 0.04,
    headerStyle: "pro",
    buttonStyle: "proFrame",
    accentA: "rgb(58 168 255)",
    accentB: "rgb(255 196 67)",
    cardBorder: "rgb(69 90 121)",
    cardShadow: "0 10px 24px rgb(0 0 0 / .35)",
    glowStrength: 0.35,
    buttonTextStyle: "compact",
    labelCase: "title",
    doodle: "/skins/home/arena_edge_glow.svg"
  }
};
