import type { EzTheme } from "../types";

export const streetTheme: EzTheme = {
  id: "street",
  name: "Street Mode",
  colors: {
    bg0: "10 13 20",
    bg1: "22 28 39",
    panel: "20 27 39",
    border: "110 231 245",
    text: "240 249 255",
    muted: "148 163 184",
    accent: "34 211 238",
    accent2: "251 146 60",
    danger: "248 113 113",
    success: "74 222 128"
  },
  shadows: { glowStrength: "0 0 20px rgb(34 211 238 / 0.28)", shadowStrength: "0 8px 22px rgb(0 0 0 / 0.45)" },
  typography: { fontDisplay: "'Teko', sans-serif", fontBody: "'Inter', sans-serif", letterSpacing: "0.04em", fontWeight: "700" },
  radii: { cardRadius: "16px", buttonRadius: "8px" },
  borders: { borderWidth: "2px", outlineStyle: "solid" },
  textures: {
    textureBgUrl: "repeating-linear-gradient(45deg, rgb(250 204 21 / 0.05) 0 8px, transparent 8px 20px)",
    texturePanelUrl: "radial-gradient(circle at 20% 20%, rgb(236 72 153 / 0.10), transparent 35%)"
  },
  sfx: { clickSfx: "tap", hypeSfx: "crowd-pop" },
  motion: { transitionMs: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
};
