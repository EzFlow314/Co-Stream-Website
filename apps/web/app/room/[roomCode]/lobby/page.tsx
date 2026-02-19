import Link from "next/link";
import { RoomAdminPanel } from "@/components/room-admin-panel";

export default async function LobbyPage({ params }: { params: { roomCode: string } }) {
  const data = await fetch(`${process.env.WS_HTTP_URL || "http://localhost:4001"}/rooms/${params.roomCode}`, { cache: "no-store" }).then((r) => r.json());
  const room = data.room;
  const joinLink = `http://localhost:3000/join/${params.roomCode}?token=${room.joinToken}`;
  const programLink = `http://localhost:3000/program/${params.roomCode}?token=${room.programToken}`;

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-black">Lobby {params.roomCode}</h1>
      <div className="card space-y-3">
        <p>Invite link: {joinLink}</p>
        <p>Program link: {programLink}</p>
        <p>720p Program link: {`${programLink}&res=720`}</p>
        <div className="flex gap-2">
          <Link href={`/studio/${params.roomCode}`} className="btn-primary">Open Director Studio</Link>
          <Link href={`/program/${params.roomCode}?token=${room.programToken}`} className="btn-muted">Preview Program Output</Link>
        </div>
      </div>
      <RoomAdminPanel roomCode={params.roomCode} joinLink={joinLink} programLink={programLink} programToken={room.programToken} discordInviteUrl={room.discordInviteUrl} />
    </main>
  );
}
