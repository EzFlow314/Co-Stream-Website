import { ProgramOutput } from "@/components/program-output";
import { safeFetchJson } from "@/lib/safe-fetch";

export default async function ProgramPage({ params, searchParams }: { params: { roomCode: string }; searchParams: { token?: string; res?: string } }) {
  const token = searchParams.token || "";
  const res = searchParams.res === "720" ? "720" : "1080";
  const baseWs = process.env.WS_HTTP_URL || "http://localhost:4001";
  const alphaBanner = (process.env.NEXT_PUBLIC_MODE || process.env.MODE || "dev") === "alpha" && (process.env.SHOW_ALPHA_BANNER || "true") !== "false";

  const auth = await safeFetchJson<{ ok?: boolean }>(`${baseWs}/program-auth/${params.roomCode}?token=${encodeURIComponent(token)}`, {
    timeoutMs: 1200,
    retry: 1,
    tag: "program-auth",
    fallback: { ok: false }
  });

  const roomData = await safeFetchJson<{ ok?: boolean; room?: any }>(`${baseWs}/rooms/${params.roomCode}`, {
    timeoutMs: 1200,
    retry: 1,
    tag: "program-room",
    fallback: {
      ok: false,
      room: {
        participants: [{ id: "host", vdoId: "host" }],
        familyMode: false,
        scoreA: { scoreTelemetry: 0, scoreHype: 0, scoreTotal: 0 },
        scoreB: { scoreTelemetry: 0, scoreHype: 0, scoreTotal: 0 },
        votes: {},
        nowPlayingGame: "",
        nowPlayingPlatform: "TWITCH",
        crewA: "Crew A",
        crewB: "Crew B"
      }
    }
  });

  const room = roomData.room;
  const participants = room.participants as Array<{ id: string; vdoId: string }>;

  const invalidToken = token.length > 0 && !auth.ok;

  return (
    <main className="space-y-4">
      {alphaBanner && <p className="rounded border border-cyan-300/40 bg-cyan-300/10 p-2 text-sm">EzPlay Alpha — testing in progress. Report issues via “Report Issue”.</p>}
      {!roomData.ok && <p className="rounded border border-amber-300/40 bg-amber-300/10 p-2 text-sm">Realtime service offline. Run pnpm dev at repo root.</p>}
      {invalidToken && <p className="rounded border border-red-400/40 bg-red-400/10 p-2 text-sm">Program token invalid while realtime is online.</p>}
      <h1 className="text-3xl font-black">Program Output · {params.roomCode}</h1>
      <p className="text-white/70">Use `?res=720` for 1280x720 layout scaling. Program token remains recommended.</p>
      <ProgramOutput
        participants={participants}
        roomCode={params.roomCode}
        res={res}
        familyMode={Boolean(room.familyMode)}
        scoreA={room.scoreA}
        scoreB={room.scoreB}
        topVote={room.votes ? Object.entries(room.votes).sort((a: any,b: any)=>b[1]-a[1])[0] as any : null}
        nowPlayingGame={room.nowPlayingGame}
        nowPlayingPlatform={room.nowPlayingPlatform}
        crewA={room.crewA}
        crewB={room.crewB}
      />
    </main>
  );
}
