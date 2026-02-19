export const THEME_TOKENS = {
  palette: {
    bg: "#0a0d14",
    surface: "#141a25",
    text: "#f7fafc",
    neon: "#22d3ee",
    neonPink: "#f472b6",
    graffiti: "rgba(236, 72, 153, 0.09)"
  },
  texture: "radial-gradient(circle at 20% 20%, rgba(236,72,153,0.08), transparent 35%)"
} as const;

export type ThemeMode = "arena" | "creator" | "street" | "chill";
