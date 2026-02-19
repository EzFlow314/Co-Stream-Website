export type VibePlatform = "TWITCH" | "YOUTUBE" | "KICK" | "TIKTOK" | "FACEBOOK" | "DISCORD" | "OTHER";
export type VibeMode = "GAMEPLAY" | "WATCH" | "PODCAST";
export type VibeThemeId = "streetballFlyer" | "neonArcade" | "arenaProElite" | "cleanCreator" | "chill";

export type VibeDNAInput = {
  game: string;
  platform: VibePlatform;
  mode: VibeMode;
  battleMode: boolean;
  crowdMeter: number;
  lastEpicTs?: number;
  obsSafeMode?: boolean;
  reducedMotion?: boolean;
  highContrast?: boolean;
};

export type VibeDNAOutput = {
  hostThemeId: VibeThemeId;
  programThemeId: VibeThemeId | "highContrast";
  accentA?: string;
  accentB?: string;
  intensity: number;
  titleCardStyle: "poster" | "neon" | "pro";
};

const FPS_HINTS = ["cod", "warzone", "valorant", "cs", "apex", "fortnite", "pubg", "rainbow", "overwatch"];
const SPORTS_HINTS = ["2k", "nba", "fifa", "madden", "rocket league", "nhl", "mlb", "ufc"];
const CREATIVE_HINTS = ["minecraft", "roblox", "creative", "lego", "sim", "builder"];
const STORY_HINTS = ["horror", "story", "rpg", "adventure", "walking dead", "last of us", "alan wake"];

function normalized(text: string): string {
  return text.toLowerCase();
}

function hasAny(text: string, hints: string[]): boolean {
  return hints.some((hint) => text.includes(hint));
}

function baseByGame(game: string): VibeThemeId {
  const g = normalized(game);
  if (hasAny(g, FPS_HINTS)) return "arenaProElite";
  if (hasAny(g, SPORTS_HINTS)) return "streetballFlyer";
  if (hasAny(g, CREATIVE_HINTS)) return "neonArcade";
  if (hasAny(g, STORY_HINTS)) return "cleanCreator";
  return "arenaProElite";
}

function nudgeByPlatform(platform: VibePlatform, fallback: VibeThemeId): VibeThemeId {
  if (platform === "TWITCH") return "arenaProElite";
  if (platform === "YOUTUBE") return "cleanCreator";
  if (platform === "KICK") return "streetballFlyer";
  if (platform === "DISCORD") return "cleanCreator";
  return fallback;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function accentForTheme(theme: VibeThemeId): Pick<VibeDNAOutput, "accentA" | "accentB" | "titleCardStyle"> {
  switch (theme) {
    case "streetballFlyer":
      return { accentA: "hsl(185 90% 56%)", accentB: "hsl(35 95% 56%)", titleCardStyle: "poster" };
    case "neonArcade":
      return { accentA: "hsl(285 95% 62%)", accentB: "hsl(190 95% 55%)", titleCardStyle: "neon" };
    case "cleanCreator":
    case "chill":
      return { accentA: "hsl(205 96% 54%)", accentB: "hsl(35 95% 56%)", titleCardStyle: "pro" };
    case "arenaProElite":
    default:
      return { accentA: "hsl(205 100% 55%)", accentB: "hsl(45 100% 55%)", titleCardStyle: "pro" };
  }
}

export function vibeDNA(input: VibeDNAInput): VibeDNAOutput {
  if (input.highContrast) {
    return {
      hostThemeId: "cleanCreator",
      programThemeId: "highContrast",
      intensity: 0,
      titleCardStyle: "pro"
    };
  }

  let baseTheme = baseByGame(input.game);

  if (input.mode === "WATCH" || input.mode === "PODCAST") {
    baseTheme = input.platform === "YOUTUBE" ? "cleanCreator" : "neonArcade";
  }

  baseTheme = nudgeByPlatform(input.platform, baseTheme);

  let hostThemeId: VibeThemeId = baseTheme;
  let programThemeId: VibeThemeId = input.battleMode ? "arenaProElite" : baseTheme;

  const recencyBoost = input.lastEpicTs && Date.now() - input.lastEpicTs < 30_000 ? 0.2 : 0;
  const crowdBoost = clamp01(input.crowdMeter / 120) * 0.6;
  let intensity = clamp01(0.2 + crowdBoost + recencyBoost);

  if (input.obsSafeMode) {
    programThemeId = "arenaProElite";
    intensity = Math.min(intensity, 0.35);
  }

  if (input.reducedMotion) {
    intensity = Math.min(intensity, 0.5);
  }

  const accents = accentForTheme(programThemeId);

  return {
    hostThemeId,
    programThemeId,
    ...accents,
    intensity
  };
}
