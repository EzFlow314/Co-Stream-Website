export default async function RecapPage({ params }: { params: { roomCode: string } }) {
  const data = await fetch(`${process.env.WS_HTTP_URL || "http://localhost:4001"}/rooms/${params.roomCode}/recap`, { cache: "no-store" }).then((r) => r.json());
  const recap = data.recap;

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-black">Match Recap · {params.roomCode}</h1>
      <div className="card space-y-2">
        <p className="text-xl font-black">Winner: {recap?.winner || "TBD"}</p>
        <p>Score: A {recap?.scoreA?.scoreTotal ?? 0} · B {recap?.scoreB?.scoreTotal ?? 0}</p>
        <p>MVP: {recap?.mvp || "host"}</p>
        <p>Top Hype: {recap?.hottest || "host"}</p>
        <p>Best Moment: {recap?.bestMoment?.label || "n/a"}</p>
        <p>Group Epic: {recap?.groupEpic?.label || "n/a"}</p>
        <p>Broadcast Score: {recap?.broadcastScore ?? 0}</p>
        <p>Broadcast Rating: {recap?.broadcastRating || "BRONZE"}</p>
        <p>Crew Reputation: A {recap?.crewReputation?.crewA ?? 0} · B {recap?.crewReputation?.crewB ?? 0}</p>
      </div>
    </main>
  );
}
