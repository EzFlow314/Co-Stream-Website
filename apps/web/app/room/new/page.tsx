"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RoomResponse = { room: { roomCode: string; joinToken: string; programToken: string } };

export default function NewRoomPage() {
  const [room, setRoom] = useState<RoomResponse["room"] | null>(null);

  useEffect(() => {
    fetch("/api/rooms/create", { method: "POST" }).then((r) => r.json()).then((d) => setRoom(d.room));
  }, []);

  if (!room) return <main className="card">Creating EzPlay room...</main>;

  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-black">Create Room</h1>
      <div className="card space-y-3">
        <p className="text-5xl font-black text-cyan-300">{room.roomCode}</p>
        <p>Program token is generated and secured server-side.</p>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-primary" href={`/room/${room.roomCode}/lobby`}>Go to Lobby</Link>
          <Link className="btn-muted" href={`/studio/${room.roomCode}`}>Open Studio</Link>
        </div>
      </div>
    </main>
  );
}
