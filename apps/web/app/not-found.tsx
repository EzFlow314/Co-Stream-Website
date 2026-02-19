import Link from "next/link";

export default function NotFound() {
  return (
    <main className="card space-y-2">
      <h1 className="text-2xl font-black">EzPlay page not found</h1>
      <Link href="/" className="btn-primary inline-block">Back home</Link>
    </main>
  );
}
