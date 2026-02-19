"use client";

import { useEffect, useMemo, useState } from "react";

type Suggestion = { id: string; title: string; description: string; tags: string[]; status: "OPEN" | "IN_REVIEW" | "PLANNED" | "SHIPPED" | "REJECTED"; monthKey: string; score: number; upvotes: number; downvotes: number };

const monthKey = new Date().toISOString().slice(0, 7);

export default function RoadmapPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("automation,ui");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch(`/api/roadmap/${monthKey}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.items) ? d.items : []))
      .catch(() => setStatus("Roadmap service offline"));
  }, []);

  const winner = useMemo(() => [...items].sort((a, b) => b.score - a.score || b.upvotes - a.upvotes)[0], [items]);

  async function submit() {
    if (!title.trim() || !description.trim()) return;
    const optimistic: Suggestion = {
      id: `pending_${Math.random().toString(16).slice(2)}`,
      title: title.trim(),
      description: description.trim(),
      tags: tags.split(",").map((x) => x.trim()).filter(Boolean),
      status: "OPEN",
      monthKey,
      score: 0,
      upvotes: 0,
      downvotes: 0
    };
    setItems((x) => [optimistic, ...x]);
    setTitle("");
    setDescription("");

    const res = await fetch(`/api/roadmap/${monthKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: optimistic.title, description: optimistic.description, tags: optimistic.tags })
    });
    const data = await res.json().catch(() => ({}));
    if (data?.item) setItems((x) => x.map((s) => s.id === optimistic.id ? data.item : s));
    else setStatus("Failed to submit suggestion");
  }

  async function vote(id: string, value: 1 | -1) {
    setItems((list) => list.map((s) => s.id === id ? { ...s, upvotes: s.upvotes + (value === 1 ? 1 : 0), downvotes: s.downvotes + (value === -1 ? 1 : 0), score: s.score + value } : s));
    const res = await fetch(`/api/roadmap/${monthKey}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, value })
    });
    const data = await res.json().catch(() => ({}));
    if (data?.item) setItems((list) => list.map((s) => s.id === id ? data.item : s));
  }

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-black">Roadmap Voting</h1>
      <p className="text-sm text-white/70">Monthly window: {monthKey}. Streamer accounts vote; public can view.</p>
      {status && <p className="rounded border border-amber-300/40 bg-amber-300/10 p-2 text-sm">{status}</p>}
      {winner && <p className="rounded border border-cyan-300/40 bg-cyan-300/10 p-2 text-sm">Winner of the Month (preview): {winner.title}</p>}

      <section className="card space-y-2">
        <h2 className="font-black">Submit suggestion</h2>
        <input className="ez-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <textarea className="ez-input min-h-28" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
        <input className="ez-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags comma-separated" />
        <button className="ez-btn ez-btn-primary" onClick={submit}>Submit</button>
      </section>

      <section className="space-y-2">
        <h2 className="font-black">Suggestions</h2>
        {items.length === 0 && <p className="text-white/70">No suggestions yet.</p>}
        {items.map((s) => (
          <div key={s.id} className="rounded border border-white/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{s.title}</p>
              <span className="rounded border border-white/20 px-2 py-1 text-xs">{s.status}</span>
            </div>
            <p className="text-sm text-white/70">{s.description}</p>
            <p className="mt-1 text-xs text-white/60">{s.tags.join(" · ")} · score {s.score}</p>
            <div className="mt-2 flex gap-2">
              <button className="ez-btn ez-btn-muted !px-2 !py-1" onClick={() => vote(s.id, 1)}>Upvote</button>
              <button className="ez-btn ez-btn-muted !px-2 !py-1" onClick={() => vote(s.id, -1)}>Downvote</button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
