import { safeFetchJson } from "@/lib/safe-fetch";

type Room = { roomCode: string; nowPlayingGame?: string; crewA?: string; crewB?: string; currentSegment?: string; crowdTaps?: number; nodeId?: string };

export default async function DiscoverPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const live = await safeFetchJson<{ ok?: boolean; rooms?: Room[]; nodeCount?: number }>(`${baseUrl}/api/discover`, {
    timeoutMs: 1200,
    retry: 1,
    fallback: { ok: false, rooms: [], nodeCount: 0 },
    tag: "discover-rooms"
  });

  const rooms = live.rooms || [];

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-black">Discover</h1>
      {!live.ok && <p className="rounded border border-amber-300/40 bg-amber-300/10 p-2 text-sm">Realtime service offline. Run pnpm dev at repo root.</p>}
      <section className="card">
        <h2 className="mb-2 text-xl font-black">Live Now</h2>
        <p className="text-xs text-white/60">Nodes queried: {live.nodeCount || 0}</p>
        {rooms.length === 0 && <p className="text-sm text-white/70">No public discoverable rooms right now.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {rooms.map((room) => (
            <div key={room.roomCode} className="rounded border border-white/20 p-3">
              <p className="font-black">{room.crewA || "Crew A"} vs {room.crewB || "Crew B"}</p>
              <p className="text-sm text-white/70">Game: {room.nowPlayingGame || "Unknown"}</p>
              <p className="text-sm text-white/70">Segment: {room.currentSegment || "TIP_OFF"}</p>
              <p className="text-sm text-white/70">Hype taps: {room.crowdTaps || 0}</p>
              <p className="text-xs text-white/50">Node: {room.nodeId || "A"}</p>
              <div className="mt-2 flex gap-2">
                <a className="ez-btn ez-btn-muted" href={`/arena/${room.roomCode}`}>Enter EzPlay Arena</a>
                <a className="ez-btn ez-btn-muted" href={`/play/${room.roomCode}`}>Mini-Games</a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
