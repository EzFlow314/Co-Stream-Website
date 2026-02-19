"use client";

import { useState } from "react";
import { buildFeedbackContext } from "@/lib/feedback-context";

export function FeedbackPanel({ roomCode, mode, protectionMode }: { roomCode: string; mode: string; protectionMode: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("Bug");
  const [status, setStatus] = useState("");

  async function submit() {
    if (!text.trim()) return;
    setStatus("Submitting...");
    const payload = {
      text,
      category,
      ...buildFeedbackContext({
        roomCode,
        mode,
        protectionMode,
        route: window.location.pathname,
        userAgent: navigator.userAgent,
        lastErrorCodes: []
      })
    };
    const res = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = await res.json().catch(() => ({}));
    setStatus(json.ok ? `Reported: ${json.id}` : "Failed to submit");
    if (json.ok) setText("");
  }

  return (
    <div className="card">
      <button className="ez-btn ez-btn-muted" onClick={() => setOpen((v) => !v)}>Report Issue</button>
      {open && (
        <div className="mt-2 space-y-2">
          <select className="ez-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {['Bug', 'Lag', 'Sync', 'Tiles', 'Audio', 'Other'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea className="ez-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="What happened?" />
          <button className="ez-btn ez-btn-primary" onClick={submit}>Submit</button>
          <p className="text-sm text-white/70">{status}</p>
        </div>
      )}
    </div>
  );
}
