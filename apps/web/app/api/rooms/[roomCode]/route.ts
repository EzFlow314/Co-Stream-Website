import { NextResponse } from "next/server";
import { ErrorCode } from "@ezplay/contracts";
import { fetchWithMismatchRetry } from "@/lib/node-router";

export async function GET(_: Request, { params }: { params: { roomCode: string } }) {
  try {
    const { res } = await fetchWithMismatchRetry(`/rooms/${params.roomCode}`, params.roomCode);
    if (!res.ok) throw new Error(`http ${res.status}`);
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({
      ok: false,
      code: ErrorCode.NODE_UNAVAILABLE,
      room: { roomCode: params.roomCode, discordInviteUrl: "", telemetryStatus: "WAITING" }
    }, { status: 503 });
  }
}
