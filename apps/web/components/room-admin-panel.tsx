"use client";

import { useEffect, useMemo, useState } from "react";

export function RoomAdminPanel({ roomCode, joinLink, programLink, programToken, discordInviteUrl }: {
  roomCode: string;
  joinLink: string;
  programLink: string;
  programToken: string;
  discordInviteUrl?: string;
}) {
  const [discordInvite, setDiscordInvite] = useState(discordInviteUrl || "");
  const [webhook, setWebhook] = useState("");
  const [status, setStatus] = useState("");
  const message = useMemo(() => `EzPlay is live! Join room ${roomCode}: ${joinLink} | OBS: ${programLink}`, [joinLink, programLink, roomCode]);

  useEffect(() => {
    if (typeof window !== "undefined") setWebhook(localStorage.getItem("ezplay-webhook") || "");
  }, []);

  async function saveDiscordInvite() {
    await fetch(`${process.env.NEXT_PUBLIC_WS_HTTP_URL || "http://localhost:4001"}/rooms/${roomCode}/discord-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordInviteUrl: discordInvite })
    });
    setStatus("Discord VC Link saved.");
  }

  async function postWebhook() {
    localStorage.setItem("ezplay-webhook", webhook);
    const res = await fetch("/api/discord/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode, webhookUrl: webhook, content: message, mock: !webhook })
    });
    const payload = await res.json();
    setStatus(payload.ok ? "Discord post sent." : payload.error || "Discord post failed.");
  }

  return (
    <div className="card space-y-3">
      <h2 className="text-xl font-black">Discord Support</h2>
      <p className="text-sm text-white/70">Link Discord Account (Coming Soon)</p>
      <label className="block text-sm">Discord VC Link</label>
      <div className="flex gap-2">
        <input value={discordInvite} onChange={(e) => setDiscordInvite(e.target.value)} className="w-full rounded bg-white/10 p-2" placeholder="https://discord.gg/..." />
        <button onClick={saveDiscordInvite} className="btn-muted">Save</button>
        <button onClick={() => navigator.clipboard.writeText(discordInvite)} className="btn-muted">Copy</button>
      </div>

      <h3 className="font-bold">Post room invite to Discord</h3>
      <input value={webhook} onChange={(e) => setWebhook(e.target.value)} className="w-full rounded bg-white/10 p-2" placeholder="Webhook URL (stored locally)" />
      <textarea readOnly value={message} className="h-24 w-full rounded bg-white/10 p-2 text-sm" />
      <button onClick={postWebhook} className="btn-primary">Post Invite</button>
      <p className="text-sm text-cyan-300">{status}</p>

      <div className="rounded bg-black/30 p-3 text-sm">
        <p>Program token (server validated):</p>
        <p className="font-mono break-all">{programToken}</p>
        <button onClick={() => navigator.clipboard.writeText(programLink)} className="btn-muted mt-2">Copy Program URL</button>
      </div>
    </div>
  );
}
