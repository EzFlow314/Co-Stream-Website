"use client";

import { useMemo, useState } from "react";

type Target = { platform: string; rtmpUrl: string; streamKey: string };
type Quality = "Smooth" | "Balanced" | "Sharp";
type PcTier = "Low" | "Mid" | "High";

const PRESETS: Record<string, string> = {
  Twitch: "rtmp://live.twitch.tv/app",
  YouTube: "rtmp://a.rtmp.youtube.com/live2",
  Kick: "rtmp://fa723fc1b171.global-contribute.live-video.net/app",
  Facebook: "rtmps://live-api-s.facebook.com:443/rtmp/"
};

const ENCODER_MATRIX: Record<Quality, Record<PcTier, string>> = {
  Smooth: {
    Low: "720p30 · 3000kbps · veryfast",
    Mid: "720p60 · 4500kbps · faster",
    High: "1080p60 · 6000kbps · faster"
  },
  Balanced: {
    Low: "720p30 · 3500kbps · veryfast",
    Mid: "720p60 · 5500kbps · faster",
    High: "1080p60 · 7000kbps · fast"
  },
  Sharp: {
    Low: "720p30 · 4500kbps · faster",
    Mid: "1080p60 · 7500kbps · fast",
    High: "1080p60 · 9000kbps · medium"
  }
};

export default function StreamEverywherePage() {
  const [targets, setTargets] = useState<Target[]>([{ platform: "Twitch", rtmpUrl: PRESETS.Twitch, streamKey: "" }]);
  const [quality, setQuality] = useState<Quality>("Balanced");
  const [pcTier, setPcTier] = useState<PcTier>("Mid");

  const output = useMemo(() => `OBS Multi-RTMP Targets\n${targets.map((t) => `- ${t.platform}: ${t.rtmpUrl} | key=${t.streamKey || "<empty>"}`).join("\n")}`, [targets]);

  function addTarget(platform: string) {
    setTargets((t) => [...t, { platform, rtmpUrl: PRESETS[platform] || "rtmp://", streamKey: "" }]);
  }

  function save() {
    localStorage.setItem("ezplay-multirtmp", JSON.stringify(targets));
  }

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-black">Stream Everywhere Wizard</h1>
      <p className="rounded border border-cyan-300/40 bg-cyan-300/10 p-2 text-sm">Stream keys stay in your browser and are never sent to EzPlay servers.</p>

      <div className="card space-y-3">
        <h2 className="text-lg font-black">Any Platform Workflow</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-white/80">
          <li>Add Program URL in OBS Browser Source.</li>
          <li>Pick quality preset + PC tier.</li>
          <li>Output to one platform directly, or multi-cast via Restream / Multi-RTMP plugin.</li>
        </ol>

        <div className="grid gap-2 md:grid-cols-2">
          <label className="text-sm">Quality Preset
            <select className="ez-input" value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
              <option>Smooth</option>
              <option>Balanced</option>
              <option>Sharp</option>
            </select>
          </label>
          <label className="text-sm">PC Strength
            <select className="ez-input" value={pcTier} onChange={(e) => setPcTier(e.target.value as PcTier)}>
              <option>Low</option>
              <option>Mid</option>
              <option>High</option>
            </select>
          </label>
        </div>
        <p className="rounded border border-white/20 bg-white/5 p-2 text-sm">Recommended: {ENCODER_MATRIX[quality][pcTier]}</p>

        <div className="flex flex-wrap gap-2">
          {["Twitch", "YouTube", "Kick", "Facebook", "Custom"].map((p) => (
            <button key={p} onClick={() => addTarget(p)} className="btn-muted">Add {p}</button>
          ))}
        </div>
        {targets.map((t, i) => (
          <div key={i} className="grid gap-2 md:grid-cols-3">
            <input value={t.platform} onChange={(e) => setTargets((arr) => arr.map((x, idx) => idx === i ? { ...x, platform: e.target.value } : x))} className="rounded bg-white/10 p-2" placeholder="Platform" />
            <input value={t.rtmpUrl} onChange={(e) => setTargets((arr) => arr.map((x, idx) => idx === i ? { ...x, rtmpUrl: e.target.value } : x))} className="rounded bg-white/10 p-2" placeholder="RTMP URL" />
            <input value={t.streamKey} onChange={(e) => setTargets((arr) => arr.map((x, idx) => idx === i ? { ...x, streamKey: e.target.value } : x))} className="rounded bg-white/10 p-2" placeholder="Stream Key" />
          </div>
        ))}
        <textarea readOnly value={output} className="h-40 w-full rounded bg-black/40 p-3 text-sm" />
        <div className="flex gap-2">
          <button onClick={() => navigator.clipboard.writeText(output)} className="btn-primary">Copy All</button>
          <button onClick={save} className="btn-muted">Save in Browser</button>
        </div>

        <div className="rounded border border-white/20 p-3 text-sm">
          <p className="font-semibold">Restream / Multi-RTMP quick notes</p>
          <p className="text-white/70">Restream: one RTMP target from OBS, fan out in Restream dashboard. Multi-RTMP plugin: add multiple targets directly in OBS. EzPlay never stores stream keys.</p>
        </div>
      </div>
    </main>
  );
}
