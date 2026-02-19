import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const roomCode = body.roomCode as string;
  const res = await fetch(`${process.env.WS_HTTP_URL || "http://localhost:4001"}/discord/webhook/${roomCode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
