"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function JoinPage({ params }: { params: { roomCode: string } }) {
  const [discordInvite, setDiscordInvite] = useState("");
  const [status, setStatus] = useState<"checking" | "ready" | "offline" | "not_found">("checking");

  useEffect(() => {
    let alive = true;
    fetch(`/api/runtime/room/${params.roomCode}`)
      .then(async (r) => {
        const d = await r.json();
        if (!alive) return;
        setDiscordInvite(d.room?.discordInviteUrl || "");
        if (d.errorCode === "ROOM_NOT_FOUND" || r.status === 404) setStatus("not_found");
        else if (!d.connected) setStatus("offline");
        else setStatus("ready");
      })
      .catch(() => { if (alive) setStatus("offline"); });
    return () => { alive = false; };
  }, [params.roomCode]);

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-black">Join Room {params.roomCode}</h1>
      {status === "checking" && <p className="text-sm text-white/70">Checking room status…</p>}
      {status === "offline" && <p className="rounded border border-amber-300/40 bg-amber-300/10 p-2 text-sm">Realtime service offline. Ask host to verify WS is running.</p>}
      {status === "not_found" && (
        <div className="rounded border border-rose-300/40 bg-rose-300/10 p-3 text-sm space-y-2">
          <p>Room not found. The host may not have created it yet.</p>
          <div className="flex gap-2">
            <Link className="ez-btn ez-btn-muted" href="/join">Back to Join</Link>
            <Link className="ez-btn ez-btn-primary" href="/room/new">Create Room (Host)</Link>
          </div>
        </div>
      )}
      {status === "ready" && (
        <>
          <p className="text-sm text-white/70">Room is live. Continue into the viewer experience.</p>
          <div className="flex gap-2">
            <Link href={`/play/${params.roomCode}`} className="ez-btn ez-btn-primary">Open Viewer Mini-Games</Link>
            {discordInvite && <a className="ez-btn ez-btn-muted" href={discordInvite} target="_blank" rel="noreferrer">Join Discord</a>}
          </div>
        </>
      )}
    </main>
  );
}
