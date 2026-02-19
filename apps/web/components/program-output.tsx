"use client";

import { useEffect, useMemo, useState } from "react";
import { buildVdoReceiverUrl } from "@bigroom/shared";
import { EzBadge, EzButton, EzCard } from "@/components/ez";
import { TitleCard } from "@/components/title-card";

type TileStatus = "CONNECTING" | "LIVE" | "STALLED";
type HudMode = "MINIMAL" | "FULL" | "SPORTSCAST";

export function ProgramOutput({ participants, roomCode, res, familyMode, scoreA, scoreB, topVote, winner, nowPlayingGame, nowPlayingPlatform, crewA = "Crew A", crewB = "Crew B" }: {
  participants: Array<{ id: string; vdoId: string }>;
  roomCode: string;
  res: "1080" | "720";
  familyMode: boolean;
  scoreA?: { scoreTelemetry: number; scoreHype: number; scoreTotal: number };
  scoreB?: { scoreTelemetry: number; scoreHype: number; scoreTotal: number };
  topVote?: [string, number] | null;
  winner?: string;
  nowPlayingGame?: string;
  nowPlayingPlatform?: string;
  crewA?: string;
  crewB?: string;
}) {
  const [safeMode, setSafeMode] = useState(false);
  const [heartbeats, setHeartbeats] = useState<Record<string, number>>({});
  const [audioFocus, setAudioFocus] = useState("host");
  const [hudMode, setHudMode] = useState<HudMode>("MINIMAL");
  const [stats, setStats] = useState<Record<string, { kills: number; score: number; assists: number }>>({});
  const [replayStamp, setReplayStamp] = useState("");
  const [announcer, setAnnouncer] = useState("");
  const [mvpId, setMvpId] = useState<string>(topVote?.[0] || "host");

  const scaleClass = res === "720" ? "max-w-[1280px]" : "max-w-[1920px]";
  const wsUrl = useMemo(() => `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4001"}?roomCode=${roomCode}&role=program`, [roomCode]);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.type === "HUD_MODE_SET") setHudMode(msg.payload.mode);
      if (msg.type === "STATS_UPDATE") {
        setStats((prev) => ({
          ...prev,
          [msg.payload.participantId]: {
            kills: msg.payload.stats.kills,
            assists: msg.payload.stats.assists,
            score: msg.payload.stats.score
          }
        }));
      }
      if (msg.type === "MVP_LEAD_CHANGE") setMvpId(msg.payload.participantId);
      if (msg.type === "REPLAY_PIP_TRIGGER") {
        setReplayStamp(msg.payload.stamp || "INSTANT REPLAY");
        setTimeout(() => setReplayStamp(""), msg.payload.durationMs || 6000);
      }
      if (msg.type === "ANNOUNCER_CALLOUT") {
        setAnnouncer(msg.payload.calloutText);
        setTimeout(() => setAnnouncer(""), msg.payload.durationMs || 1200);
      }
    };
    return () => ws.close();
  }, [wsUrl]);

  function status(id: string): TileStatus {
    const t = heartbeats[id];
    if (!t) return "CONNECTING";
    if (Date.now() - t > 6000) return "STALLED";
    return "LIVE";
  }

  const chants = familyMode ? ["WOW!", "NICE!", "AMAZING!", "CLUTCH!"] : ["OOOOH!", "HE DID WHAT?!", "RUN IT BACK!", "TOO CLEAN!"];
  const chant = useMemo(() => chants[Math.floor(Math.random() * chants.length)], [familyMode]);

  return (
    <div className={`${scaleClass} relative mx-auto transition-opacity duration-150`} data-obs-safe={safeMode}>
      <TitleCard game={nowPlayingGame} platform={nowPlayingPlatform} mode={hudMode} crewA={crewA} crewB={crewB} />

      {replayStamp && <div className="absolute inset-x-0 top-2 z-20 mx-auto w-fit rounded-md border border-white/40 bg-black/75 px-4 py-1 text-xs font-black">{replayStamp}</div>}
      {announcer && <div className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-md border border-[rgb(var(--ez-accent))]/50 bg-black/70 px-3 py-1 text-xs font-bold">{announcer}</div>}

      <EzCard className="mb-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="font-black">Broadcast HUD · {crewA} vs {crewB}</p>
          <div className="flex gap-2">
            <EzButton variant="muted" className="!px-2 !py-1" onClick={() => setSafeMode((v) => !v)}>OBS Safe Mode: {safeMode ? "ON" : "OFF"}</EzButton>
            <EzButton variant="muted" className="!px-2 !py-1" onClick={() => setAudioFocus("host")}>Reset Audio Focus</EzButton>
          </div>
        </div>
        <p className="text-xs">Total — A: {scoreA?.scoreTotal ?? 0} | B: {scoreB?.scoreTotal ?? 0}</p>
        <p className="text-xs muted">Pro — A(T{scoreA?.scoreTelemetry ?? 0}+H{scoreA?.scoreHype ?? 0}) B(T{scoreB?.scoreTelemetry ?? 0}+H{scoreB?.scoreHype ?? 0})</p>
        {topVote && <p className="text-xs">Votes: {topVote[0]} ({topVote[1]})</p>}
        {winner && <p className="text-sm font-black">Winner: {winner}</p>}
      </EzCard>

      {!safeMode && <EzCard className="mb-2 text-center text-sm">{chant}</EzCard>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {participants.slice(0, 6).map((p) => {
          const muted = audioFocus !== p.id;
          const st = status(p.id);
          const pStats = stats[p.id];
          return (
            <EzCard key={p.id} className="relative text-center">
              <div className="mb-1 flex items-center justify-between text-[10px]">
                <span>{p.id}</span>
                <div className="flex items-center gap-1">
                  {mvpId === p.id && <span className="rounded bg-yellow-300/30 px-1">👑</span>}
                  <EzBadge tone={st === "LIVE" ? "success" : st === "STALLED" ? "danger" : "warn"}>{st}</EzBadge>
                </div>
              </div>
              {st === "CONNECTING" ? (
                <div className="h-24 w-full animate-pulse rounded bg-white/10" />
              ) : (
                <iframe
                  src={`${buildVdoReceiverUrl({ vdoId: p.vdoId, preset: res === "720" ? "Balanced" : "Sharp" })}&room=${roomCode}&muted=${muted ? 1 : 0}`}
                  className="h-24 w-full rounded bg-black"
                  onLoad={() => setHeartbeats((s) => ({ ...s, [p.id]: Date.now() }))}
                  allow="autoplay"
                />
              )}
              <div className="mt-1 flex justify-center gap-1">
                <EzButton variant="muted" className="!px-2 !py-1 text-[10px]" onClick={() => setAudioFocus(p.id)}>{muted ? "Make Audio Focus" : "Audio Focus"}</EzButton>
              </div>
              {hudMode !== "MINIMAL" && (
                <p className="mt-1 text-[10px] text-white/80">K {pStats?.kills ?? 0} · A {pStats?.assists ?? 0} · S {pStats?.score ?? 0}</p>
              )}
            </EzCard>
          );
        })}
      </div>
    </div>
  );
}
