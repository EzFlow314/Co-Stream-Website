import { NextResponse } from "next/server";
import { ErrorCode } from "@ezplay/contracts";
import { createDeterministicRoomCode, getNodeTargetsFromEnv, selectNode } from "@/lib/node-router";

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {}

  const roomCode = typeof body.roomCode === "string" && body.roomCode.length > 0
    ? body.roomCode.toUpperCase()
    : createDeterministicRoomCode();

  const target = selectNode(roomCode, getNodeTargetsFromEnv());

  try {
    const res = await fetch(`${target.url}/rooms`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "x-room-node": target.id },
      body: JSON.stringify({ roomCode })
    });
    const payload = await res.json();
    return NextResponse.json(payload, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, code: ErrorCode.NODE_UNAVAILABLE, message: `Node ${target.id} unavailable.` }, { status: 503 });
  }
}
