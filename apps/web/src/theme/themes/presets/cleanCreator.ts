import type { EzTheme } from "../types";

export const cleanCreatorTheme: EzTheme = {
  id: "clean-creator",
  name: "Clean Creator",
  colors: {
    bg0: "248 250 252", bg1: "226 232 240", panel: "255 255 255", border: "100 116 139", text: "15 23 42", muted: "71 85 105", accent: "14 165 233", accent2: "99 102 241", danger: "220 38 38", success: "22 163 74"
  },
  shadows: { glowStrength: "none", shadowStrength: "0 2px 8px rgb(15 23 42 / 0.08)" },
  typography: { fontDisplay: "'Teko', sans-serif", fontBody: "'Inter', sans-serif", letterSpacing: "0.01em", fontWeight: "600" },
  radii: { cardRadius: "12px", buttonRadius: "8px" },
  borders: { borderWidth: "1px", outlineStyle: "solid" },
  textures: {},
  sfx: { clickSfx: "tap", hypeSfx: "crowd-pop" },
  motion: { transitionMs: 140, easing: "ease" }
};
