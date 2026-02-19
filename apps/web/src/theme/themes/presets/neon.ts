import type { EzTheme } from "../types";

export const neonTheme: EzTheme = {
  id: "neon",
  name: "Neon Arcade",
  colors: {
    bg0: "15 11 35",
    bg1: "31 24 56",
    panel: "35 26 66",
    border: "244 114 182",
    text: "250 245 255",
    muted: "196 181 253",
    accent: "34 211 238",
    accent2: "244 114 182",
    danger: "251 113 133",
    success: "52 211 153"
  },
  shadows: { glowStrength: "0 0 24px rgb(244 114 182 / 0.35)", shadowStrength: "0 8px 20px rgb(0 0 0 / 0.4)" },
  typography: { fontDisplay: "'Teko', sans-serif", fontBody: "'Inter', sans-serif", letterSpacing: "0.03em", fontWeight: "700" },
  radii: { cardRadius: "16px", buttonRadius: "8px" },
  borders: { borderWidth: "2px", outlineStyle: "solid" },
  textures: { textureBgUrl: "radial-gradient(circle at top, rgb(244 114 182 / 0.12), transparent 45%)" },
  sfx: { clickSfx: "tap", hypeSfx: "crowd-pop" },
  motion: { transitionMs: 220, easing: "ease-out" }
};
