"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinIndexPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-black">Pull Up</h1>
      <p className="text-sm text-white/70">Enter a room code from the host. Rooms must be created first by the host.</p>
      <div className="card space-y-2 max-w-md">
        <input
          className="ez-input"
          placeholder="Room code (e.g. K9P2QX)"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        />
        <button className="ez-btn ez-btn-primary" onClick={() => router.push(`/join/${encodeURIComponent(roomCode.trim().toUpperCase())}`)} disabled={!roomCode.trim()}>
          Join Room
        </button>
      </div>
    </main>
  );
}
