"use client";

import { useEffect, useState } from "react";
import { ThemeControls } from "@/components/theme-controls";

export default function SettingsPage() {
  const [menuSfx, setMenuSfx] = useState(true);
  const [crowdFx, setCrowdFx] = useState(false);
  const [familyMode, setFamilyMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ezplay-sfx");
    if (saved) {
      const p = JSON.parse(saved);
      setMenuSfx(Boolean(p.menuSfx));
      setCrowdFx(Boolean(p.crowdFx));
      setFamilyMode(Boolean(p.familyMode));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("ezplay-sfx", JSON.stringify({ menuSfx, crowdFx, familyMode }));
  }, [menuSfx, crowdFx, familyMode]);

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-black">Settings</h1>
      <div className="flex flex-wrap gap-2">
        <a href="/settings/themes" className="ez-btn ez-btn-muted inline-block">Open Home Looks</a>
        <a href="/legal/assets" className="ez-btn ez-btn-muted inline-block">Asset Licenses</a>
      </div>
      <ThemeControls />
      <div className="card space-y-2">
        <h2 className="text-xl font-black">Audio & Safety</h2>
        <label className="flex items-center gap-2"><input type="checkbox" checked={menuSfx} onChange={(e) => setMenuSfx(e.target.checked)} /> Menu SFX</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={crowdFx} onChange={(e) => setCrowdFx(e.target.checked)} /> Crowd FX (Program Output)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={familyMode} onChange={(e) => setFamilyMode(e.target.checked)} /> Family Mode</label>
      </div>
    </main>
  );
}
