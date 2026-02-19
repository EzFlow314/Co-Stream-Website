import { DebugPanel } from "@/components/debug-panel";
import { RoomLive } from "@/components/room-live";
import { RoomAdminPanel } from "@/components/room-admin-panel";
import { FeedbackPanel } from "@/components/feedback-panel";
import { safeFetchJson } from "@/lib/safe-fetch";

export default async function StudioPage({ params }: { params: { roomCode: string } }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const runtime = await safeFetchJson<{ connected: boolean; room: any }>(`${baseUrl}/api/runtime/room/${params.roomCode}`, {
    timeoutMs: 1200,
    retry: 1,
    tag: "studio-runtime",
    fallback: {
      connected: false,
      room: {
        joinToken: "",
        programToken: "",
        discordInviteUrl: "",
        roomCode: params.roomCode
      }
    }
  });

  const room = runtime.room;
  const alphaBanner = (process.env.NEXT_PUBLIC_MODE || process.env.MODE || "dev") === "alpha" && (process.env.SHOW_ALPHA_BANNER || "true") !== "false";
  const joinLink = `http://localhost:3000/join/${params.roomCode}${room.joinToken ? `?token=${room.joinToken}` : ""}`;
  const programLink = `http://localhost:3000/program/${params.roomCode}${room.programToken ? `?token=${room.programToken}` : ""}`;
  const programLink720 = `${programLink}${programLink.includes("?") ? "&" : "?"}res=720`;

  return (
    <main className="space-y-4">
      {alphaBanner && <p className="rounded border border-cyan-300/40 bg-cyan-300/10 p-2 text-sm">EzPlay Alpha — testing in progress. Report issues via “Report Issue”.</p>}
      {!runtime.connected && <p className="rounded border border-amber-300/40 bg-amber-300/10 p-2 text-sm">Realtime service offline. Run pnpm dev at repo root.</p>}
      <p className={`rounded border p-2 text-sm ${room.protectionMode === "DEGRADED" ? "border-amber-300/40 bg-amber-300/10" : "border-emerald-300/30 bg-emerald-300/10"}`}>
        Protection mode: <strong>{room.protectionMode || "NORMAL"}</strong> {room.protectionMode === "DEGRADED" ? "— performance reduced to keep match stable." : ""}
      </p>
      <h1 className="text-3xl font-black">Director Studio · {params.roomCode}</h1>
      <p className="text-xs text-white/60">If WS is offline, run <code>pnpm dev</code> at repo root. Protection mode may reduce visual pacing to keep match integrity.</p>
      <RoomLive roomCode={params.roomCode} />
      <div className="card"><p>Program 1080p: {programLink}</p><p>Program 720p: {programLink720}</p></div>
      <RoomAdminPanel roomCode={params.roomCode} joinLink={joinLink} programLink={programLink} programToken={room.programToken || ""} discordInviteUrl={room.discordInviteUrl || ""} />
      <FeedbackPanel roomCode={params.roomCode} mode={process.env.MODE || "dev"} protectionMode={room.protectionMode || "NORMAL"} />
      <DebugPanel />
    </main>
  );
}
