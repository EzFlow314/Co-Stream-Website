"use client";

import { useEffect, useMemo, useState } from "react";
import { buildVdoReceiverUrl, isYoutubeUrl, sanitizeText } from "@bigroom/shared";
import { pushLog } from "@/lib/debug";
import { AutomationWizard } from "@/components/automation-wizard";

type Message = { sender: string; text: string };
type Score = { scoreHype: number; scoreTelemetry: number; scoreTotal: number };
type TileStatus = "CONNECTING" | "LIVE" | "STALLED";

const SAFE_CHANTS = ["WOW!", "NICE!", "AMAZING!", "CLUTCH!"];
const STREET_CHANTS = ["OOOOH!", "HE DID WHAT?!", "RUN IT BACK!", "TOO CLEAN!"];

export function RoomLive({ roomCode }: { roomCode: string }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [hype, setHype] = useState(0);
  const [youtube, setYoutube] = useState("");
  const [battleMode, setBattleMode] = useState(false);
  const [scoreA, setScoreA] = useState<Score>({ scoreHype: 0, scoreTelemetry: 0, scoreTotal: 0 });
  const [scoreB, setScoreB] = useState<Score>({ scoreHype: 0, scoreTelemetry: 0, scoreTotal: 0 });
  const [spotlightId, setSpotlightId] = useState("host");
  const [emojiBursts, setEmojiBursts] = useState<Array<{ emoji: string; participantId?: string }>>([]);
  const [topVotes, setTopVotes] = useState<Array<[string, number]>>([]);
  const [winnerBanner, setWinnerBanner] = useState("");
  const [posterIntro, setPosterIntro] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [viewerCap, setViewerCap] = useState(200);
  const [familyMode, setFamilyMode] = useState(false);
  const [audioFocus, setAudioFocus] = useState("host");
  const [autoAudioFocus, setAutoAudioFocus] = useState(false);
  const [tileUrls, setTileUrls] = useState<Record<string, string>>({});
  const [tileLastHeartbeat, setTileLastHeartbeat] = useState<Record<string, number>>({});
  const [showProLogs, setShowProLogs] = useState(false);
  const [automationLogs, setAutomationLogs] = useState<Array<{ ts: number; action: string; reason: string }>>([]);
  const [chant, setChant] = useState("");
  const [crews, setCrews] = useState({ crewA: "Crew A", crewB: "Crew B" });
  const [moments, setMoments] = useState<Array<{ id: string; label: string; ts: number }>>([]);
  const [nowPlayingGame, setNowPlayingGame] = useState("");
  const [nowPlayingPlatform, setNowPlayingPlatform] = useState("TWITCH");
  const [vibeProfile, setVibeProfile] = useState("AUTO");
  const [telemetryMode, setTelemetryMode] = useState(true);
  const [hudMode, setHudMode] = useState("MINIMAL");
  const [segment, setSegment] = useState("TIP_OFF");
  const [telemetryStatus, setTelemetryStatus] = useState("WAITING");
  const [broadcastRating, setBroadcastRating] = useState("BRONZE");
  const [broadcastScore, setBroadcastScore] = useState(0);
  const [watchMode, setWatchMode] = useState("SYNC");
  const [matureMode, setMatureMode] = useState(false);
  const [wsStatus, setWsStatus] = useState<"CONNECTING"|"ONLINE"|"OFFLINE">("CONNECTING");
  const [reconnectTick, setReconnectTick] = useState(0);

  const wsUrl = useMemo(() => `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4001"}?roomCode=${roomCode}&role=host`, [roomCode]);
  const participants = ["host", "guest1", "guest2", "guest3", "guest4", "guest5"];

  useEffect(() => {
    participants.forEach((id) => {
      setTileUrls((prev) => ({ ...prev, [id]: buildVdoReceiverUrl({ vdoId: id, preset: "Balanced" }) }));
      setTileLastHeartbeat((prev) => ({ ...prev, [id]: Date.now() }));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => { setWsStatus("ONLINE"); pushLog("info", `Connected room ${roomCode}`); };
    ws.onerror = () => { setWsStatus("OFFLINE"); pushLog("error", familyMode ? "Reconnecting…" : "Signal dipped — reconnecting…"); };
    ws.onclose = () => {
      setWsStatus("OFFLINE");
      const delay = Math.min(5000, 600 + reconnectTick * 500);
      setTimeout(() => setReconnectTick((t) => t + 1), delay);
    };
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const envelopeData = msg?.op === "room.state" || msg?.op === "room.state.delta" ? msg.data : null;
      if (envelopeData) {
        setSegment(envelopeData.segment?.active || "TIP_OFF");
        setBroadcastScore(envelopeData.broadcast?.score || 0);
        setBroadcastRating(envelopeData.broadcast?.tier || "BRONZE");
        if (envelopeData.maintenance?.state && envelopeData.maintenance.state !== "ACTIVE") setWsStatus("OFFLINE");
      }
      if (msg.type === "WELCOME" && msg.payload?.room) {
        setAudioFocus(msg.payload.room.audioFocusParticipantId || "host");
        setViewerCount(msg.payload.room.viewerCount || 0);
        setViewerCap(msg.payload.room.viewerCap || 200);
        setAutomationLogs(msg.payload.room.automationLogs || []);
        setCrews({ crewA: msg.payload.room.crewA || "Crew A", crewB: msg.payload.room.crewB || "Crew B" });
        setNowPlayingGame(msg.payload.room.nowPlayingGame || "");
        setNowPlayingPlatform(msg.payload.room.nowPlayingPlatform || "TWITCH");
        setHudMode(msg.payload.room.stats?.hudMode || "MINIMAL");
        setSegment(msg.payload.room.currentSegment || "TIP_OFF");
        setTelemetryStatus(msg.payload.room.telemetryStatus || "WAITING");
        setWatchMode(msg.payload.room.watchTogetherMode || "SYNC");
        setMatureMode(Boolean(msg.payload.room.matureMode));
      }
      if (msg.type === "CHAT_MESSAGE") {
        setMessages((m) => [...m, msg.payload].slice(-200));
      }
      if (msg.type === "GAME_EVENT") setHype((h) => Math.min(100, h + msg.payload.intensity));
      if (msg.type === "HYPE_BUMP") setHype((h) => Math.min(100, h + msg.payload.delta));
      if (msg.type === "MATCH_SCORE_UPDATE") {
        setScoreA(msg.payload.scoreA);
        setScoreB(msg.payload.scoreB);
      }
      if (msg.type === "BATTLE_MODE_SET") {
        setBattleMode(Boolean(msg.payload.battleMode));
        setCrews({ crewA: msg.payload.crewA || "Crew A", crewB: msg.payload.crewB || "Crew B" });
      }
      if (msg.type === "MATCH_POSTER_INTRO") {
        setPosterIntro(`${msg.payload.crewA} vs ${msg.payload.crewB} · ${msg.payload.season}`);
        setTimeout(() => setPosterIntro(""), 1200);
      }
      if (msg.type === "MATCH_ENDED") {
        setWinnerBanner(`Winner: ${msg.payload.winner}`);
        setTimeout(() => setWinnerBanner(""), 2000);
      }
      if (msg.type === "DIRECTOR_SET_SPOTLIGHT") {
        setSpotlightId(msg.payload.participantId);
        setTimeout(() => setSpotlightId("host"), msg.payload.durationMs || 2500);
      }
      if (msg.type === "VIEWER_REACT") {
        setEmojiBursts((prev) => [...prev.slice(-30), { emoji: msg.payload.emoji, participantId: msg.payload.participantId }]);
      }
      if (msg.type === "VIEWER_VOTE_RESULTS") setTopVotes(msg.payload.top3 || []);
      if (msg.type === "AUDIO_FOCUS_SET") {
        setAudioFocus(msg.payload.participantId);
        setAutoAudioFocus(Boolean(msg.payload.autoAudioFocus));
      }
      if (msg.type === "PARTICIPANT_VDO_REGENERATED") {
        setTileUrls((prev) => ({ ...prev, [msg.payload.participantId]: buildVdoReceiverUrl({ vdoId: msg.payload.vdoId, preset: "Balanced" }) + `&cb=${Date.now()}` }));
      }
      if (msg.type === "MOMENT_ADDED") {
        setMoments((m) => [...m, { id: msg.payload.id, label: msg.payload.label, ts: msg.payload.ts }].slice(-25));
      }
      if (msg.type === "HUD_MODE_SET") setHudMode(msg.payload.mode || "MINIMAL");
      if (msg.type === "SEGMENT_SET") setSegment(msg.payload.segment || "TIP_OFF");
      if (msg.type === "WATCH_MODE_SET") setWatchMode(msg.payload.mode || "SYNC");
      if (msg.type === "MATCH_ENDED") {
        setBroadcastScore(msg.payload.broadcastScore || 0);
        setBroadcastRating(msg.payload.broadcastRating || "BRONZE");
      }
      if (["DIRECTOR_SET_LAYOUT", "DIRECTOR_SET_SPOTLIGHT", "DIRECTOR_VARIATION"].includes(msg.type)) {
        setAutomationLogs((logs) => [...logs, { ts: Date.now(), action: msg.type, reason: msg.type }].slice(-20));
      }
      pushLog("info", `${msg.type}`);
    };
    setSocket(ws);
    return () => ws.close();
  }, [familyMode, roomCode, wsUrl, reconnectTick]);

  useEffect(() => {
    const timer = setInterval(() => {
      const pick = familyMode ? SAFE_CHANTS : STREET_CHANTS;
      setChant(pick[Math.floor(Math.random() * pick.length)]);
    }, 7000);
    return () => clearInterval(timer);
  }, [familyMode]);

  function tileStatus(id: string): TileStatus {
    const beat = tileLastHeartbeat[id];
    if (!beat) return "CONNECTING";
    if (Date.now() - beat > 6000) return "STALLED";
    return "LIVE";
  }

  async function toggleBattleMode() {
    const next = !battleMode;
    setBattleMode(next);
    await fetch(`${process.env.NEXT_PUBLIC_WS_HTTP_URL || "http://localhost:4001"}/rooms/${roomCode}/battle-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ battleMode: next, crewA: crews.crewA, crewB: crews.crewB })
    });
  }

  async function endMatch() {
    await fetch(`${process.env.NEXT_PUBLIC_WS_HTTP_URL || "http://localhost:4001"}/rooms/${roomCode}/end-match`, { method: "POST" });
  }

  async function makeAudioFocus(id: string) {
    await fetch(`${process.env.NEXT_PUBLIC_WS_HTTP_URL || "http://localhost:4001"}/rooms/${roomCode}/audio-focus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: id, autoAudioFocus })
    });
  }

  async function toggleAutoAudioFocus(next: boolean) {
    setAutoAudioFocus(next);
    await fetch(`${process.env.NEXT_PUBLIC_WS_HTTP_URL || "http://localhost:4001"}/rooms/${roomCode}/audio-focus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: audioFocus, autoAudioFocus: next })
    });
  }

  async function reconnectAll() {
    await fetch(`${process.env.NEXT_PUBLIC_WS_HTTP_URL || "http://localhost:4001"}/rooms/${roomCode}/reconnect-all`, { method: "POST" });
    setTileUrls((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, `${v}&cb=${Date.now()}`])));
  }

  async function regenerateParticipantVdo(id: string) {
    await fetch(`${process.env.NEXT_PUBLIC_WS_HTTP_URL || "http://localhost:4001"}/rooms/${roomCode}/regenerate-vdo/${id}`, { method: "POST" });
  }

  function rebuildTile(id: string) {
    setTileUrls((prev) => ({ ...prev, [id]: `${buildVdoReceiverUrl({ vdoId: id, preset: "Balanced" })}&cb=${Date.now()}` }));
  }


  async function saveNowPlaying() {
    await fetch(`${process.env.NEXT_PUBLIC_WS_HTTP_URL || "http://localhost:4001"}/rooms/${roomCode}/now-playing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: nowPlayingGame, platform: nowPlayingPlatform, vibeProfile })
    });
  }

  async function sendTestTelemetry() {
    if (!telemetryMode) return;
    await fetch(`${process.env.NEXT_PUBLIC_WS_HTTP_URL || "http://localhost:4001"}/rooms/${roomCode}/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: "host", crew: "A", delta: { kills: 1, score: 2, streakCount: 3, lastEvent: "TEST" } })
    });
  }

  async function setHud(next: string) {
    setHudMode(next);
    await fetch(`${process.env.NEXT_PUBLIC_WS_HTTP_URL || "http://localhost:4001"}/rooms/${roomCode}/hud-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next })
    });
  }

  async function triggerReplay(momentId?: string) {
    await fetch(`${process.env.NEXT_PUBLIC_WS_HTTP_URL || "http://localhost:4001"}/rooms/${roomCode}/replay-pip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: "host", durationMs: 7000, momentId })
    });
  }

  async function setWatchTogetherMode(mode: "STAGE" | "SYNC") {
    setWatchMode(mode);
    await fetch(`${process.env.NEXT_PUBLIC_WS_HTTP_URL || "http://localhost:4001"}/rooms/${roomCode}/watch-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, ageVerified: !matureMode || window.confirm("Mature room is enabled. Confirm age verification.") })
    });
  }

  async function toggleMature(next: boolean) {
    setMatureMode(next);
    await fetch(`${process.env.NEXT_PUBLIC_WS_HTTP_URL || "http://localhost:4001"}/rooms/${roomCode}/mature-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matureMode: next })
    });
  }

  function sendChat() {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const text = sanitizeText(input);
    if (!text) return;
    socket.send(JSON.stringify({ type: "CHAT_MESSAGE", payload: { sender: "Host", text } }));
    setInput("");
  }

  function sendSettings() {
    socket?.send(JSON.stringify({ type: "SETTINGS_UPDATE", payload: { familyMode } }));
  }

  return (
    <div className="space-y-4">
      <AutomationWizard roomCode={roomCode} />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="ez-card min-h-64">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-black">Program Stage ({roomCode})</h2>
          <span className="rounded border border-white/20 px-2 py-1 text-xs">WS: {wsStatus}</span>
          <div className="flex gap-2">
            <button className="ez-btn ez-btn-muted" onClick={toggleBattleMode}>{battleMode ? "Disable" : "Enable"} CREW VS CREW</button>
            <button className="ez-btn ez-btn-muted" onClick={reconnectAll}>Reconnect All</button>
            <button className="ez-btn ez-btn-muted" onClick={endMatch}>End Match</button>
          </div>
        </div>

        {posterIntro && <div className="mt-2 rounded-xl border border-yellow-300/40 bg-yellow-200/10 p-3 text-center font-black">{posterIntro}</div>}
        {winnerBanner && <div className="mt-2 rounded-xl border border-cyan-300/40 bg-[rgb(var(--ez-accent))]/10 p-3 text-center font-black">{winnerBanner}</div>}

        {battleMode && (
          <div className="mt-3 rounded-xl border border-cyan-400/40 bg-black/30 p-2 text-sm">
            <p className="font-black">Battle HUD · {crews.crewA} vs {crews.crewB}</p>
            <p>A: T{scoreA.scoreTelemetry} + H{scoreA.scoreHype} = {scoreA.scoreTotal} | B: T{scoreB.scoreTelemetry} + H{scoreB.scoreHype} = {scoreB.scoreTotal}</p>
            <p>MVP Spotlight: {spotlightId}</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
          {participants.map((id) => (
            <div key={id} className={`rounded-xl border border-white/20 bg-black/40 p-3 text-center ${spotlightId === id ? "ring-2 ring-cyan-300" : ""}`}>
              <div className="mb-1 flex items-center justify-between text-[10px]">
                <span>{id}</span>
                <span className={`rounded px-1 ${tileStatus(id) === "LIVE" ? "bg-emerald-500/30" : tileStatus(id) === "STALLED" ? "bg-red-500/30" : "bg-yellow-500/30"}`}>{tileStatus(id)}</span>
              </div>
              <iframe
                src={tileUrls[id] || buildVdoReceiverUrl({ vdoId: id, preset: "Balanced" })}
                className="h-24 w-full rounded bg-black"
                onLoad={() => setTileLastHeartbeat((prev) => ({ ...prev, [id]: Date.now() }))}
                allow="autoplay"
              />
              <div className="mt-1 flex flex-wrap justify-center gap-1 text-[10px]">
                <button className="btn-muted !px-2 !py-1" onClick={() => makeAudioFocus(id)}>{audioFocus === id ? "Audio Focus" : "Make Audio Focus"}</button>
                <button className="btn-muted !px-2 !py-1" onClick={() => rebuildTile(id)}>Rebuild Tile</button>
                {id !== "host" && <button className="btn-muted !px-2 !py-1" onClick={() => regenerateParticipantVdo(id)}>Regen vdoId</button>}
              </div>
              {topVotes[0]?.[0] === id && <p className="mt-1 text-[10px] ">MVP VOTE #{topVotes[0][1]}</p>}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3 text-sm">
          <p>Hype Meter: {hype}%</p>
          <p>Viewer Cap: {viewerCount}/{viewerCap}</p>
          <label className="flex items-center gap-1"><input type="checkbox" checked={autoAudioFocus} onChange={(e) => toggleAutoAudioFocus(e.target.checked)} /> Auto Audio Focus</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={familyMode} onChange={(e) => { setFamilyMode(e.target.checked); setTimeout(sendSettings, 0); }} /> Family Mode</label>
        </div>
        <div className="mt-2 h-3 rounded-full bg-white/10"><div className="h-full rounded-full bg-[rgb(var(--ez-accent))]" style={{ width: `${hype}%` }} /></div>
        <p className="mt-2 text-sm ">{chant}</p>

        <div className="mt-6 space-y-2">
          <h3 className="font-bold">Watch Together V2</h3>
          <input value={youtube} onChange={(e) => setYoutube(e.target.value)} className="ez-input" placeholder="https://youtube.com/..." />
          <p className="text-sm text-white/70">{youtube.length === 0 || isYoutubeUrl(youtube) ? "Ready" : "Not supported yet (YouTube only)."}</p>
          <div className="flex flex-wrap gap-2">
            <button className={`ez-btn ${watchMode === "STAGE" ? "ez-btn-primary" : "ez-btn-muted"}`} onClick={() => setWatchTogetherMode("STAGE")}>Stage Mode</button>
            <button className={`ez-btn ${watchMode === "SYNC" ? "ez-btn-primary" : "ez-btn-muted"}`} onClick={() => setWatchTogetherMode("SYNC")}>Sync Mode</button>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={matureMode} onChange={(e) => toggleMature(e.target.checked)} /> Mature Mode</label>
          </div>
          <p className="text-xs text-white/60">Rights warning: only stream content you have rights to broadcast.</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-2xl">{emojiBursts.slice(-8).map((e, i) => <span key={i} className={e.participantId === spotlightId ? "scale-110" : ""}>{e.emoji}</span>)}</div>
      </section>

      <aside className="space-y-3">
        <section className="ez-card space-y-2">
          <h3 className="font-black">Now Playing + Telemetry</h3>
          <p className="text-xs text-white/70">Status: {telemetryStatus}</p>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={telemetryMode} onChange={(e) => setTelemetryMode(e.target.checked)} /> Telemetry Mode</label>
          <input className="ez-input" value={nowPlayingGame} onChange={(e) => setNowPlayingGame(e.target.value)} placeholder="Game title" />
          <select className="ez-input" value={nowPlayingPlatform} onChange={(e) => setNowPlayingPlatform(e.target.value)}>
            {['TWITCH','YOUTUBE','KICK','TIKTOK','FACEBOOK','DISCORD','OTHER'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="ez-input" value={vibeProfile} onChange={(e) => setVibeProfile(e.target.value)}>
            {['AUTO','STREET','NEON','ARENA','CREATOR','CHILL'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="flex flex-wrap gap-2">
            <button className="ez-btn ez-btn-primary" onClick={saveNowPlaying}>Apply Vibe</button>
            <button className="ez-btn ez-btn-muted" onClick={sendTestTelemetry}>Test Telemetry</button>
          </div>
        </section>

        <section className="ez-card space-y-2">
          <h3 className="font-black">HUD Mode</h3>
          <div className="flex flex-wrap gap-2">
            {['MINIMAL','FULL','SPORTSCAST'].map((mode) => (
              <button key={mode} className={`ez-btn ${hudMode === mode ? 'ez-btn-primary' : 'ez-btn-muted'}`} onClick={() => setHud(mode)}>{mode}</button>
            ))}
          </div>
        </section>

        <section className="ez-card space-y-2">
          <h3 className="font-black">Moments Timeline</h3>
          <div className="max-h-52 space-y-1 overflow-auto text-sm">
            {moments.length === 0 && <p className="text-white/70">No moments yet.</p>}
            {moments.slice().reverse().map((m) => (
              <button key={m.id} className="block w-full rounded border border-white/20 p-2 text-left hover:bg-white/5" onClick={() => triggerReplay(m.id)}>
                <p className="font-semibold">{m.label}</p>
                <p className="text-[10px] text-white/60">{new Date(m.ts).toLocaleTimeString()}</p>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <aside className="space-y-3">

        <section className="ez-card space-y-2">
          <h3 className="font-black">Broadcast Segments + Rating</h3>
          <p className="text-sm">Current Segment: <span className="font-semibold">{segment.replaceAll("_", " ")}</span></p>
          <p className="text-sm">Broadcast Score: <span className="font-semibold">{broadcastScore}</span></p>
          <p className="text-sm">Broadcast Rating: <span className="font-semibold">{broadcastRating}</span></p>
        </section>
      </aside>

      <aside className="ez-card">
        <h2 className="text-xl font-black">EzPlay Chat</h2>
        <div className="mt-3 h-64 space-y-2 overflow-auto">
          {messages.map((m, i) => (<p key={`${m.text}-${i}`}><span className="font-bold ">{m.sender}: </span>{m.text}</p>))}
        </div>
        <div className="mt-4 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} className="ez-input" />
          <button className="ez-btn ez-btn-primary" onClick={sendChat}>Send</button>
        </div>

        <div className="mt-4 border-t border-white/10 pt-3">
          <button className="ez-btn ez-btn-muted" onClick={() => setShowProLogs((v) => !v)}>Pro Mode Automation Logs</button>
          {showProLogs && (
            <div className="mt-2 max-h-48 overflow-auto text-xs">
              {automationLogs.slice(-20).map((log, i) => (
                <p key={i}>[{new Date(log.ts).toLocaleTimeString()}] {log.action} — {log.reason}</p>
              ))}
            </div>
          )}
        </div>
      </aside>
      </div>
    </div>
  );
}
