import { safeFetchJson } from "@/lib/safe-fetch";

export default async function ArenaPage({ params }: { params: { roomCode: string } }) {
  const wsHttp = process.env.WS_HTTP_URL || "http://localhost:4001";
  const roomData = await safeFetchJson<{ ok?: boolean; room?: any }>(`${wsHttp}/rooms/${params.roomCode}`, {
    timeoutMs: 1200,
    retry: 1,
    fallback: { ok: false, room: { participants: [{ id: "host", vdoId: "host" }], crewA: "Crew A", crewB: "Crew B", currentSegment: "TIP_OFF", stats: { crews: { A: { momentum: 0 }, B: { momentum: 0 } } } } },
    tag: "arena-room"
  });

  const room = roomData.room;
  const participants = (room.participants || []).slice(0, 6);

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-black">Viewer Arena · {params.roomCode}</h1>
      {!roomData.ok && <p className="rounded border border-amber-300/40 bg-amber-300/10 p-2 text-sm">Realtime service offline. Run pnpm dev at repo root.</p>}
      <section className="card">
        <p className="font-black">{room.crewA || "Crew A"} vs {room.crewB || "Crew B"}</p>
        <p className="text-sm text-white/70">Segment: {room.currentSegment || "TIP_OFF"} · Momentum A {room.stats?.crews?.A?.momentum ?? 0} / B {room.stats?.crews?.B?.momentum ?? 0}</p>
      </section>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {participants.map((p: any) => (
          <div key={p.id} className="rounded border border-white/20 bg-black/30 p-3">
            <p className="mb-2 text-sm font-semibold">{p.id}</p>
            <div className="h-24 rounded bg-white/10" />
            <div className="mt-2 flex gap-1">
              <a className="ez-btn ez-btn-muted !px-2 !py-1 text-xs" href={`/play/${params.roomCode}`}>Tap to Hype</a>
              <a className="ez-btn ez-btn-muted !px-2 !py-1 text-xs" href="#" onClick={(e)=>e.preventDefault()}>Open Stream</a>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
