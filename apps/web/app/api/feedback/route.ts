import { appendFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const text = String(body.text || "").trim();
  if (!text) return NextResponse.json({ ok: false, error: "text required" }, { status: 400 });

  const id = `fb_${randomUUID().slice(0, 12)}`;
  const record = {
    id,
    ts: Date.now(),
    text,
    category: String(body.category || "Other"),
    context: {
      roomCode: String(body.roomCode || "unknown"),
      nodeId: String(body.nodeId || "unknown"),
      mode: String(body.mode || process.env.MODE || "dev"),
      protectionMode: String(body.protectionMode || "unknown"),
      safemode: Boolean(body.safemode),
      tickP95: Number(body.tickP95 || 0),
      broadcastHz: Number(body.broadcastHz || 0),
      lastErrorCodes: Array.isArray(body.lastErrorCodes) ? body.lastErrorCodes.slice(-3) : [],
      route: String(body.route || "unknown"),
      userAgent: String(body.userAgent || "")
    }
  };

  const feedbackDir = resolve(process.cwd(), "../../reports/feedback");
  await mkdir(feedbackDir, { recursive: true });
  await appendFile(resolve(feedbackDir, "feedback.jsonl"), `${JSON.stringify(record)}\n`, "utf8");

  const webhook = process.env.FEEDBACK_WEBHOOK_URL;
  if (webhook) {
    fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(record) }).catch(() => null);
  }

  return NextResponse.json({ ok: true, id });
}
