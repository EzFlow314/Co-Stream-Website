import type { EzTheme } from "../themes/types";

export function applyTheme(theme: EzTheme, opts: { reducedMotion: boolean; highContrast: boolean; obsSafe: boolean }) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--ez-bg0", theme.colors.bg0);
  root.style.setProperty("--ez-bg1", theme.colors.bg1);
  root.style.setProperty("--ez-panel", theme.colors.panel);
  root.style.setProperty("--ez-border", theme.colors.border);
  root.style.setProperty("--ez-text", theme.colors.text);
  root.style.setProperty("--ez-muted", theme.colors.muted);
  root.style.setProperty("--ez-accent", theme.colors.accent);
  root.style.setProperty("--ez-accent2", theme.colors.accent2);
  root.style.setProperty("--ez-danger", theme.colors.danger);
  root.style.setProperty("--ez-success", theme.colors.success);
  root.style.setProperty("--ez-glow", opts.highContrast || opts.obsSafe ? "none" : theme.shadows.glowStrength);
  root.style.setProperty("--ez-shadow", theme.shadows.shadowStrength);
  root.style.setProperty("--ez-font-display", theme.typography.fontDisplay);
  root.style.setProperty("--ez-font-body", theme.typography.fontBody);
  root.style.setProperty("--ez-letter-spacing", theme.typography.letterSpacing);
  root.style.setProperty("--ez-font-weight", theme.typography.fontWeight);
  root.style.setProperty("--ez-card-radius", theme.radii.cardRadius);
  root.style.setProperty("--ez-button-radius", theme.radii.buttonRadius);
  root.style.setProperty("--ez-border-width", theme.borders.borderWidth);
  root.style.setProperty("--ez-outline-style", theme.borders.outlineStyle);
  root.style.setProperty("--ez-transition-ms", String(opts.reducedMotion ? 0 : theme.motion.transitionMs));
  root.style.setProperty("--ez-easing", theme.motion.easing);
  root.style.setProperty("--ez-texture-bg", opts.highContrast || opts.obsSafe ? "none" : theme.textures.textureBgUrl ?? "none");
  root.style.setProperty("--ez-texture-panel", opts.highContrast || opts.obsSafe ? "none" : theme.textures.texturePanelUrl ?? "none");
}
