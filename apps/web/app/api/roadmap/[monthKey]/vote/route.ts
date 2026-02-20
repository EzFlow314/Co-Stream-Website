import { NextResponse } from "next/server";
import { getNodeTargetsFromEnv } from "@/lib/node-router";

export async function POST(req: Request, { params }: { params: { monthKey: string } }) {
  const ws = getNodeTargetsFromEnv()[0];
  const body = await req.json().catch(() => ({}));
  try {
    const res = await fetch(`${ws.url}/roadmap/${params.monthKey}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
