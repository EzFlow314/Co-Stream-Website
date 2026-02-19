import type { ThemeStore } from "./themeStore";

export function getDefaultThemeByRoute(route: string): Pick<ThemeStore, "hostThemeId" | "programThemeId"> {
  if (route === "/" || route.startsWith("/studio/")) {
    return { hostThemeId: "streetballFlyer", programThemeId: "arenaProElite" };
  }
  if (route.startsWith("/program/")) {
    return { hostThemeId: "streetballFlyer", programThemeId: "arenaProElite" };
  }
  if (route.startsWith("/play/")) {
    return { hostThemeId: "neonArcade", programThemeId: "arenaProElite" };
  }
  if (route.startsWith("/join/")) {
    return { hostThemeId: "arenaProElite", programThemeId: "arenaProElite" };
  }
  return { hostThemeId: "streetballFlyer", programThemeId: "arenaProElite" };
}
