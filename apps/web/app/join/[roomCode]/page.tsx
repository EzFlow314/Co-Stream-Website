"use client";

import { useEffect, useMemo, useState } from "react";
import { buildVdoSenderUrl, makeToken } from "@bigroom/shared";

export default function JoinPage({ params }: { params: { roomCode: string } }) {
  const [captureMessage, setCaptureMessage] = useState("");
  const [discordGuideOpen, setDiscordGuideOpen] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [discordInvite, setDiscordInvite] = useState("");
  const [offline, setOffline] = useState(false);
  const [guestId] = useState(() => {
    const existing = typeof window !== "undefined" ? localStorage.getItem("ezplay-guest-id") : null;
    if (existing) return existing;
    const id = `guest_${makeToken(6)}`;
    if (typeof window !== "undefined") localStorage.setItem("ezplay-guest-id", id);
    return id;
  });

  const senderUrl = useMemo(() => buildVdoSenderUrl({ vdoId: guestId, preset: "Balanced" }), [guestId]);

  useEffect(() => {
    fetch(`/api/runtime/room/${params.roomCode}`).then((r) => r.json()).then((d) => { setDiscordInvite(d.room?.discordInviteUrl || ""); setOffline(!d.connected); }).catch(() => setOffline(true));
  }, [params.roomCode]);

  async function startDisplayCapture(hint: string) {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      setPreviewStream(stream);
      setCaptureMessage(`Capture started. ${hint}`);
    } catch {
      setCaptureMessage("Capture not granted yet. Please retry.");
    }
  }

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-black">Pull Up to Room {params.roomCode}</h1>
      {offline && <p className="rounded border border-amber-300/40 bg-amber-300/10 p-2 text-sm">Realtime service offline. Run pnpm dev at repo root.</p>}
      {discordInvite && (
        <div className="ez-card">
          <p className="font-black">Discord VC Link</p>
          <a href={discordInvite} target="_blank" className="underline" rel="noreferrer">{discordInvite}</a>
        </div>
      )}

      <div className="ez-card space-y-3">
        <p>Guests do not need accounts.</p>
        <div className="flex flex-wrap gap-2">
          <button className="ez-btn ez-btn-primary" onClick={() => startDisplayCapture("Choose Entire Screen or Window for gameplay.")}>Share Screen (Recommended)</button>
          <button className="ez-btn ez-btn-muted" onClick={() => setDiscordGuideOpen(true)}>Capture Discord Window</button>
        </div>

        {discordGuideOpen && (
          <div className="ez-card text-sm space-y-2">
            <p className="font-black">Capture Discord Window — Steps</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Open Discord call window first.</li>
              <li>Click “Test capture” below.</li>
              <li>In picker choose the Discord window tab.</li>
              <li>Confirm preview before going live.</li>
            </ol>
            <p>Limitations: Discord window capture may add delay and quality loss vs native camera capture.</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="ez-card !p-2">Screenshot Placeholder 1</div>
              <div className="ez-card !p-2">Screenshot Placeholder 2</div>
              <div className="ez-card !p-2">Screenshot Placeholder 3</div>
            </div>
            <button className="ez-btn ez-btn-muted" onClick={() => startDisplayCapture("Choose the Discord window in the picker.")}>Test capture</button>
          </div>
        )}

        <p className="text-sm muted">{captureMessage || "Choose capture mode to continue."}</p>
        <video className="h-40 w-full rounded bg-black" autoPlay muted playsInline ref={(node) => { if (node && previewStream) node.srcObject = previewStream; }} />
        <iframe src={senderUrl} className="h-[320px] w-full rounded-xl bg-black" />
      </div>
    </main>
  );
}
