"use client";

import { useMemo, useState } from "react";

type Suggestion = { id: string; title: string; description: string; tags: string[]; status: "OPEN" | "IN_REVIEW" | "PLANNED" | "SHIPPED" | "REJECTED"; monthKey: string; score: number; upvotes: number; downvotes: number };

const monthKey = new Date().toISOString().slice(0, 7);

export default function RoadmapPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("automation,ui");
  const [items, setItems] = useState<Suggestion[]>([]);

  const winner = useMemo(() => [...items].sort((a, b) => b.score - a.score || b.upvotes - a.upvotes)[0], [items]);

  function submit() {
    if (!title.trim() || !description.trim()) return;
    const next: Suggestion = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      tags: tags.split(",").map((x) => x.trim()).filter(Boolean),
      status: "OPEN",
      monthKey,
      score: 0,
      upvotes: 0,
      downvotes: 0
    };
    setItems((x) => [next, ...x]);
    setTitle("");
    setDescription("");
  }

  function vote(id: string, value: 1 | -1) {
    setItems((list) => list.map((s) => s.id === id ? { ...s, upvotes: s.upvotes + (value === 1 ? 1 : 0), downvotes: s.downvotes + (value === -1 ? 1 : 0), score: s.score + value } : s));
  }

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-black">Roadmap Voting</h1>
      <p className="text-sm text-white/70">Monthly window: {monthKey}. Streamer accounts vote; public can view.</p>
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
