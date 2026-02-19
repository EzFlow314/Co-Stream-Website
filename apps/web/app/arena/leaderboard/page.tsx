export default async function LeaderboardPage() {
  const data = await fetch(`${process.env.WS_HTTP_URL || "http://localhost:4001"}/arena/leaderboard`, { cache: "no-store" }).then((r) => r.json());
  const rows = data.rows || [];
  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-black">{data.season?.name || "Season"} Leaderboard</h1>
      <p className="text-sm text-white/70">Last updated: {new Date(data.season?.updatedAt || Date.now()).toLocaleString()}</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr><th>Crew</th><th>Level</th><th>Wins</th><th>Losses</th><th>Score</th></tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.crew} className="border-t border-white/10"><td className="py-2">🏷️ {r.crew}</td><td>{r.level}</td><td>{r.wins}</td><td>{r.losses}</td><td>{r.scoreTotal}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
