"use client";

import { useEffect, useState } from "react";

type Setup = { obsAdded: boolean; recordingConfigured: boolean; telemetryConfigured: boolean; vibeChosen: boolean };

export function AutomationWizard({ roomCode }: { roomCode: string }) {
  const [setup, setSetup] = useState<Setup>({ obsAdded: false, recordingConfigured: false, telemetryConfigured: false, vibeChosen: false });
  const [clipProvider, setClipProvider] = useState("NONE");
  const [open, setOpen] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_WS_HTTP_URL || "http://localhost:4001"}/rooms/${roomCode}/automation/setup`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.setup) setSetup(data.setup);
        if (data?.clipProvider) setClipProvider(data.clipProvider);
      })
      .catch(() => undefined);
  }, [roomCode]);

  async function save(next: Partial<Setup>, provider?: string) {
    const merged = { ...setup, ...next };
    setSetup(merged);
    if (provider) setClipProvider(provider);
    await fetch(`${process.env.NEXT_PUBLIC_WS_HTTP_URL || "http://localhost:4001"}/rooms/${roomCode}/automation/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...merged, clipProvider: provider || clipProvider })
    });
  }

  if (!open) {
    return <button className="ez-btn ez-btn-muted" onClick={() => setOpen(true)}>Open First-Time Setup</button>;
  }

  const doneCount = Object.values(setup).filter(Boolean).length;

  return (
    <section className="ez-card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black">First Time Setup (Automation-First)</h2>
        <button className="ez-btn ez-btn-muted !px-2 !py-1" onClick={() => setOpen(false)}>Hide</button>
      </div>
      <p className="text-sm text-white/80">Complete once, then EzPlay runs hands-free during live sessions. ({doneCount}/4 complete)</p>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="rounded border border-white/20 p-2 text-sm"><input className="mr-2" type="checkbox" checked={setup.obsAdded} onChange={(e) => save({ obsAdded: e.target.checked })} />Step 1: Add to OBS</label>
        <label className="rounded border border-white/20 p-2 text-sm"><input className="mr-2" type="checkbox" checked={setup.recordingConfigured} onChange={(e) => save({ recordingConfigured: e.target.checked })} />Step 2: Recording automation</label>
        <label className="rounded border border-white/20 p-2 text-sm"><input className="mr-2" type="checkbox" checked={setup.telemetryConfigured} onChange={(e) => save({ telemetryConfigured: e.target.checked })} />Step 3: Telemetry automation</label>
        <label className="rounded border border-white/20 p-2 text-sm"><input className="mr-2" type="checkbox" checked={setup.vibeChosen} onChange={(e) => save({ vibeChosen: e.target.checked })} />Step 4: Choose vibe (AUTO default)</label>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Clip Provider</p>
        <div className="flex flex-wrap gap-2">
          {[
            ["OBS_REPLAY", "OBS Replay"],
            ["EZPLAY_BUFFER", "EzPlay Buffer"],
            ["EXTERNAL_HOTKEY", "External Hotkey"],
            ["NONE", "None"]
          ].map(([id, label]) => (
            <button key={id} className={`ez-btn ${clipProvider === id ? "ez-btn-primary" : "ez-btn-muted"}`} onClick={() => save({}, id)}>{label}</button>
          ))}
        </div>
      </div>
    </section>
  );
}
