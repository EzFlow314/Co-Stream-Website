"use client";

import { makeToken } from "@bigroom/shared";
import { useEffect, useMemo, useState } from "react";
import { errorCopy } from "@/lib/error-copy";

const SAFE = ["🔥", "✨", "👏", "😤"];
const POWERUPS = ["ENERGY_DROP", "OVERTIME_BOOST", "SLOWMO_MOMENT"] as const;

export default function PlayPage({ params }: { params: { roomCode: string } }) {
  const [viewerId, setViewerId] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [crowdMeter, setCrowdMeter] = useState(0);
  const [voteId, setVoteId] = useState("host");
  const [top3, setTop3] = useState<Array<[string, number]>>([]);
  const [familyMode, setFamilyMode] = useState(false);
  const [lastPower, setLastPower] = useState(0);
  const [globalPowerCooldown, setGlobalPowerCooldown] = useState(0);
  const [powerStatus, setPowerStatus] = useState("Ready");
  const [wsStatus, setWsStatus] = useState<"CONNECTING"|"ONLINE"|"OFFLINE">("CONNECTING");
  const [retryTick, setRetryTick] = useState(0);
  const [protectionMode, setProtectionMode] = useState<"NORMAL"|"DEGRADED">("NORMAL");
  const [errorMessage, setErrorMessage] = useState("");
  const wsUrl = useMemo(() => `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4001"}?roomCode=${params.roomCode}&role=viewer`, [params.roomCode]);
  const alphaBanner = (process.env.NEXT_PUBLIC_MODE || "dev") === "alpha" && (process.env.NEXT_PUBLIC_SHOW_ALPHA_BANNER || "true") !== "false";

  useEffect(() => {
    const existing = localStorage.getItem("ezplay-viewer-id") || `viewer_${makeToken(8)}`;
    localStorage.setItem("ezplay-viewer-id", existing);
    setViewerId(existing);
  }, []);

  useEffect(() => {
    if (!viewerId) return;
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => { setWsStatus("ONLINE"); ws.send(JSON.stringify({ type: "VIEWER_JOIN", payload: { viewerId } })); };
    ws.onclose = () => {
      setWsStatus("OFFLINE");
      let roomHash = 0;
      for (const ch of params.roomCode.toUpperCase()) roomHash = (roomHash * 31 + ch.charCodeAt(0)) >>> 0;
      const jitter = roomHash % 350;
      const delay = Math.min(8000, 700 + retryTick * 450 + jitter);
      setTimeout(() => setRetryTick((t) => t + 1), delay);
    };
    ws.onerror = () => setWsStatus("OFFLINE");
    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg?.op === "room.state" || msg?.op === "room.state.delta") {
        const state = msg.data || {};
        if (state.minigames?.emojiBudget?.active) setCrowdMeter((m) => Math.min(100, Math.max(m, Number(state.minigames.emojiBudget.active))));
      }
      if (msg.type === "VIEWER_VOTE_RESULTS") setTop3(msg.payload.top3 || []);
      if (msg?.error?.code) {
        const mapped = errorCopy(msg.error.code);
        setErrorMessage(mapped.title);
      }
      if (msg.type === "POWERUP_USE") {
        setGlobalPowerCooldown(Date.now() + 8000);
        setPowerStatus(`${msg.payload.powerup} activated`);
      }
    };
    setSocket(ws);
    return () => ws.close();
  }, [viewerId, wsUrl, retryTick]);


  useEffect(() => {
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent).detail as { actionType?: string };
      if (!detail?.actionType) return;
      if (detail.actionType === "RECONNECT_WS") setRetryTick((t) => t + 1);
      if (detail.actionType === "REFRESH_ROOM_STATE") window.location.reload();
      if (detail.actionType === "RUN_DIAGNOSTICS" || detail.actionType === "RUN_DIAGNOSTIC_PING") {
        fetch(`${process.env.NEXT_PUBLIC_WS_HTTP_URL || "http://localhost:4001"}/health`).catch(() => null);
      }
    };
    window.addEventListener("ezplay-helper-action", handler as EventListener);
    return () => window.removeEventListener("ezplay-helper-action", handler as EventListener);
  }, []);


  useEffect(() => {
    let alive = true;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const load = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/runtime/room/${params.roomCode}`, { cache: "no-store" });
        const json = await res.json() as { room?: { protectionMode?: "NORMAL" | "DEGRADED" } };
        if (alive) setProtectionMode(json.room?.protectionMode || "NORMAL");
      } catch {}
    };
    load();
    const timer = setInterval(load, 5000);
    return () => { alive = false; clearInterval(timer); };
  }, [params.roomCode]);

  function send(type: string, payload: Record<string, unknown>) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type, payload: { viewerId, ...payload } }));
  }

  function usePowerup(powerup: (typeof POWERUPS)[number]) {
    const now = Date.now();
    if (now < globalPowerCooldown) {
      setPowerStatus(`Global cooldown ${Math.ceil((globalPowerCooldown - now) / 1000)}s`);
      return;
    }
    if (now - lastPower < 30_000) {
      setPowerStatus(`Your cooldown ${Math.ceil((30_000 - (now - lastPower)) / 1000)}s`);
      return;
    }
    setLastPower(now);
    setGlobalPowerCooldown(now + 8000);
    setPowerStatus(`${powerup} sent`);
    send("POWERUP_USE", { powerup, participantId: voteId });
  }

  const callout = crowdMeter > 80 ? "TURN UP!" : crowdMeter > 35 ? "LOUD!" : "BUILD THE CROWD";
  const emojis = familyMode ? SAFE : ["🔥", "😤", "💀", "✨", "👏"];

  return (
    <main className="space-y-4">
      {alphaBanner && <p className="rounded border border-cyan-300/40 bg-cyan-300/10 p-2 text-sm">EzPlay Alpha — testing in progress. Report issues via “Report Issue”.</p>}
      <h1 className="text-3xl font-black">EzPlay Viewer Mini-Games · {params.roomCode}</h1>
      <p className="text-sm text-white/70">No account required. Your anonymous viewer session is stored in this browser.</p>
      {wsStatus !== "ONLINE" && <p className="rounded border border-amber-300/40 bg-amber-300/10 p-2 text-sm">Realtime service offline. Run pnpm dev at repo root.</p>}
      {errorMessage && <p className="rounded border border-rose-300/40 bg-rose-300/10 p-2 text-sm">{errorMessage}</p>}
      <p className={`rounded border p-2 text-sm ${protectionMode === "DEGRADED" ? "border-amber-300/40 bg-amber-300/10" : "border-emerald-300/30 bg-emerald-300/10"}`}>Protection mode: <strong>{protectionMode}</strong> {protectionMode === "DEGRADED" ? "— performance reduced to keep match stable." : ""}</p>

      <div className="ez-card space-y-2">
        <h2 className="font-black">Hype Tap</h2>
        <button className="ez-btn ez-btn-primary" onClick={() => { send("CROWD_TAP", {}); setCrowdMeter((m) => Math.min(100, m + 3)); }}>Tap to Hype</button>
        <div className="h-3 rounded bg-white/10"><div className="h-full rounded bg-cyan-300" style={{ width: `${crowdMeter}%` }} /></div>
        <p>{callout}</p>
      </div>

      <div className="ez-card space-y-2">
        <h2 className="font-black">Vote MVP</h2>
        <select value={voteId} onChange={(e) => setVoteId(e.target.value)} className="ez-input">
          <option value="host">Host</option>
          <option value="guest1">Guest 1</option>
          <option value="guest2">Guest 2</option>
        </select>
        <button className="ez-btn ez-btn-muted" onClick={() => send("VIEWER_VOTE", { participantId: voteId })}>Submit Vote</button>
        <div className="text-sm">Top 3: {top3.map((r) => `${r[0]}(${r[1]})`).join(" · ") || "No votes yet"}</div>
      </div>

      <div className="ez-card space-y-2">
        <h2 className="font-black">Power-Ups (No Account)</h2>
        <div className="flex flex-wrap gap-2">
          {POWERUPS.map((powerup) => (
            <button key={powerup} className="ez-btn ez-btn-muted" onClick={() => usePowerup(powerup)}>{powerup.replaceAll("_", " ")}</button>
          ))}
        </div>
        <p className="text-sm text-white/70">Per viewer: 30s · Global: 8s · OBS Safe Mode can mute heavy visuals.</p>
        <p className="text-sm">{powerStatus}</p>
      </div>

      <div className="ez-card space-y-2">
        <h2 className="font-black">Emoji Reactions</h2>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={familyMode} onChange={(e) => setFamilyMode(e.target.checked)} /> Family Mode</label>
        <div className="flex gap-2">{emojis.map((emoji) => <button key={emoji} className="ez-btn ez-btn-muted text-2xl" onClick={() => send("VIEWER_REACT", { emoji, participantId: voteId })}>{emoji}</button>)}</div>
      </div>
    </main>
  );
}
