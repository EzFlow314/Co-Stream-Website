import type { EzTheme } from "../types";

export const neonArcadeTheme: EzTheme = {
  id: "neonArcade",
  name: "Neon Arcade",
  colors: {
    bg0: "17 16 36",
    bg1: "31 24 56",
    panel: "38 28 68",
    border: "150 99 242",
    text: "251 249 255",
    muted: "185 171 236",
    accent: "230 76 239",
    accent2: "35 223 243",
    danger: "255 115 142",
    success: "63 216 158"
  },
  shadows: { glowStrength: "0 0 28px rgb(230 76 239 / 0.4)", shadowStrength: "0 8px 20px rgb(0 0 0 / 0.45)" },
  typography: { fontDisplay: "'Teko', sans-serif", fontBody: "'Inter', sans-serif", letterSpacing: "0.04em", fontWeight: "700" },
  radii: { cardRadius: "12px", buttonRadius: "12px" },
  borders: { borderWidth: "2px", outlineStyle: "solid" },
  textures: { textureBgUrl: "url('/skins/home/neon_bg.svg')", texturePanelUrl: "url('/skins/home/neon_doodles.svg')" },
  sfx: { clickSfx: "tap", hypeSfx: "crowd-pop" },
  motion: { transitionMs: 200, easing: "ease-out" },
  home: {
    bgImage: "/skins/home/neon_bg.svg",
    bgOverlay: "linear-gradient(180deg, rgb(11 10 22 / .35), rgb(7 8 18 / .72))",
    grainOpacity: 0.05,
    headerStyle: "neon",
    buttonStyle: "neonFrame",
    accentA: "rgb(230 76 239)",
    accentB: "rgb(35 223 243)",
    cardBorder: "rgb(150 99 242)",
    cardShadow: "0 10px 24px rgb(12 5 28 / .45)",
    glowStrength: 0.8,
    buttonTextStyle: "wide",
    labelCase: "title",
    doodle: "/skins/home/neon_doodles.svg"
  }
};
