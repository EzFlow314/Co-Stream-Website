"use client";

import { ThemeControls } from "@/components/theme-controls";
import { THEME_LIST } from "@/src/theme/themes";
import { useThemeSettings } from "@/components/theme-provider";

export default function ThemeSettingsPage() {
  const { hostThemeId, programThemeId } = useThemeSettings();
  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-black">Theme Settings</h1>
      <ThemeControls />
      <div className="grid gap-3 md:grid-cols-3">
        {THEME_LIST.filter((t) => ["streetballFlyer", "neonArcade", "arenaProElite"].includes(t.id)).map((t) => (
          <div key={t.id} className="ez-card">
            <p className="font-black">{t.name}</p>
            <p className="text-sm muted">Home Look Preview</p>
            <p className="text-xs">Host: {hostThemeId === t.id ? "Selected" : "-"}</p>
            <p className="text-xs">Program: {programThemeId === t.id ? "Selected" : "-"}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
