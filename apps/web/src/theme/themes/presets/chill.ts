import type { EzTheme } from "../types";

export const chillTheme: EzTheme = {
  id: "chill",
  name: "Chill",
  colors: {
    bg0: "13 18 30", bg1: "20 28 45", panel: "27 37 57", border: "103 232 249", text: "226 232 240", muted: "148 163 184", accent: "103 232 249", accent2: "147 197 253", danger: "248 113 113", success: "110 231 183"
  },
  shadows: { glowStrength: "0 0 8px rgb(103 232 249 / 0.18)", shadowStrength: "0 6px 14px rgb(0 0 0 / 0.35)" },
  typography: { fontDisplay: "'Teko', sans-serif", fontBody: "'Inter', sans-serif", letterSpacing: "0.02em", fontWeight: "600" },
  radii: { cardRadius: "16px", buttonRadius: "10px" },
  borders: { borderWidth: "1px", outlineStyle: "solid" },
  textures: {},
  sfx: { clickSfx: "tap", hypeSfx: "crowd-pop" },
  motion: { transitionMs: 120, easing: "ease" }
};
