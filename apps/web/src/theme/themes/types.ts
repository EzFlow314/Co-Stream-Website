export type HomeLook = {
  bgImage?: string;
  bgOverlay?: string;
  grainOpacity?: number;
  headerStyle: "poster" | "neon" | "pro";
  buttonStyle: "tape" | "neonFrame" | "proFrame";
  accentA: string;
  accentB: string;
  cardBorder: string;
  cardShadow: string;
  glowStrength: number;
  buttonTextStyle: "bold" | "wide" | "compact";
  labelCase: "upper" | "title";
  doodle?: string;
};

export type EzTheme = {
  id: string;
  name: string;
  colors: {
    bg0: string;
    bg1: string;
    panel: string;
    border: string;
    text: string;
    muted: string;
    accent: string;
    accent2: string;
    danger: string;
    success: string;
  };
  shadows: { glowStrength: string; shadowStrength: string };
  typography: { fontDisplay: string; fontBody: string; letterSpacing: string; fontWeight: string };
  radii: { cardRadius: string; buttonRadius: string };
  borders: { borderWidth: string; outlineStyle: string };
  textures: { textureBgUrl?: string; texturePanelUrl?: string };
  sfx: { clickSfx: string; hypeSfx: string };
  motion: { transitionMs: number; easing: string };
  home?: HomeLook;
};
