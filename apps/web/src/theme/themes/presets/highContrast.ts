import type { EzTheme } from "../types";

export const highContrastTheme: EzTheme = {
  id: "high-contrast",
  name: "High Contrast",
  colors: {
    bg0: "0 0 0", bg1: "8 8 8", panel: "0 0 0", border: "255 255 255", text: "255 255 255", muted: "209 213 219", accent: "255 255 0", accent2: "0 255 255", danger: "255 80 80", success: "128 255 128"
  },
  shadows: { glowStrength: "none", shadowStrength: "none" },
  typography: { fontDisplay: "'Inter', sans-serif", fontBody: "'Inter', sans-serif", letterSpacing: "0.03em", fontWeight: "800" },
  radii: { cardRadius: "6px", buttonRadius: "4px" },
  borders: { borderWidth: "2px", outlineStyle: "solid" },
  textures: {},
  sfx: { clickSfx: "tap", hypeSfx: "crowd-pop" },
  motion: { transitionMs: 0, easing: "linear" }
};
