import { chillTheme } from "./presets/chill";
import { cleanCreatorTheme } from "./presets/cleanCreator";
import { highContrastTheme } from "./presets/highContrast";
import { neonArcadeTheme } from "./presets/neonArcade";
import { streetballFlyerTheme } from "./presets/streetballFlyer";
import { arenaProTheme } from "./presets/arenaPro";

export const THEME_PRESETS = {
  streetballFlyer: streetballFlyerTheme,
  neonArcade: neonArcadeTheme,
  arenaProElite: arenaProTheme,
  "clean-creator": cleanCreatorTheme,
  chill: chillTheme,
  "high-contrast": highContrastTheme
};

export const THEME_LIST = Object.values(THEME_PRESETS);
