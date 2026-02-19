import type { EzTheme } from "../types";

export const streetballFlyerTheme: EzTheme = {
  id: "streetballFlyer",
  name: "Streetball Flyer",
  colors: {
    bg0: "33 26 21",
    bg1: "46 37 31",
    panel: "55 45 38",
    border: "119 98 80",
    text: "245 236 221",
    muted: "184 164 142",
    accent: "53 190 177",
    accent2: "236 108 49",
    danger: "212 69 69",
    success: "80 171 104"
  },
  shadows: { glowStrength: "0 0 18px rgb(53 190 177 / 0.25)", shadowStrength: "0 10px 24px rgb(0 0 0 / 0.55)" },
  typography: { fontDisplay: "'Teko', sans-serif", fontBody: "'Inter', sans-serif", letterSpacing: "0.05em", fontWeight: "700" },
  radii: { cardRadius: "8px", buttonRadius: "4px" },
  borders: { borderWidth: "2px", outlineStyle: "solid" },
  textures: { textureBgUrl: "url('/skins/home/streetball_bg.svg')", texturePanelUrl: "url('/skins/home/streetball_tape.svg')" },
  sfx: { clickSfx: "tap", hypeSfx: "crowd-pop" },
  motion: { transitionMs: 160, easing: "cubic-bezier(0.2,0.8,0.2,1)" },
  home: {
    bgImage: "/skins/home/streetball_bg.svg",
    bgOverlay: "linear-gradient(180deg, rgb(20 14 10 / .55), rgb(12 10 8 / .72))",
    grainOpacity: 0.18,
    headerStyle: "poster",
    buttonStyle: "tape",
    accentA: "rgb(53 190 177)",
    accentB: "rgb(236 108 49)",
    cardBorder: "rgb(119 98 80)",
    cardShadow: "0 10px 24px rgb(0 0 0 / .45)",
    glowStrength: 0.25,
    buttonTextStyle: "bold",
    labelCase: "title",
    doodle: "/skins/home/grain.svg"
  }
};
