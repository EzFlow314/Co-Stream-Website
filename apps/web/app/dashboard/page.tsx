import Link from "next/link";

export default function Dashboard() {
  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-black">Creator Dashboard</h1>
      <div className="card">
        <p>Quick access to rooms, crews, and battles.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/room/new" className="btn-primary">New Room</Link>
          <Link href="/arena/leaderboard" className="btn-muted">Season Leaderboard</Link>
          <Link href="/settings" className="btn-muted">Settings</Link>
                  <Link href="/discover" className="btn-muted">Discover</Link>
          <Link href="/dashboard/roadmap" className="btn-muted">Roadmap Votes</Link>
          <Link href="/support/tips" className="btn-muted">Support EzPlay</Link>
        </div>
      </div>
    </main>
  );
}
