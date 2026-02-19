"use client";

import { useThemeSettings } from "@/components/theme-provider";
import { THEME_LIST } from "@/src/theme/themes";
import { EzCard, EzToggle } from "@/components/ez";

export function ThemeControls() {
  const {
    hostThemeId,
    programThemeId,
    reducedMotion,
    highContrast,
    obsSafeDefault,
    setHostThemeId,
    setProgramThemeId,
    setReducedMotion,
    setHighContrast,
    setObsSafeDefault
  } = useThemeSettings();

  return (
    <EzCard className="space-y-3">
      <h2 className="text-xl font-black">Home Look Packs</h2>
      <label className="block text-sm">Home Look (Host)</label>
      <select value={hostThemeId} onChange={(e) => setHostThemeId(e.target.value as any)} className="ez-input">
        {THEME_LIST.filter((t) => ["streetballFlyer", "neonArcade", "arenaProElite"].includes(t.id)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <label className="block text-sm">Program Look</label>
      <select value={programThemeId} onChange={(e) => setProgramThemeId(e.target.value as any)} className="ez-input">
        {THEME_LIST.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <EzToggle checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} label="Reduced Motion" />
      <EzToggle checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} label="High Contrast" />
      <EzToggle checked={obsSafeDefault} onChange={(e) => setObsSafeDefault(e.target.checked)} label="OBS Safe Mode default" />
    </EzCard>
  );
}
