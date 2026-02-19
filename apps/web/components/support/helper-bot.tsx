"use client";

import { useMemo, useState } from "react";
import { errorCopy } from "@/lib/error-copy";
import { ErrorCode } from "@ezplay/contracts";
import faq from "@/data/help/faq.json";
import troubleshooting from "@/data/help/troubleshooting.json";

type Trouble = { id: string; keywords: string[]; answer: string };
type BotAction = { label: string; actionType: "RECONNECT_WS" | "REFRESH_ROOM_STATE" | "REGEN_VDOID" | "RUN_DIAGNOSTIC_PING" | "OPEN_HELP"; payload?: Record<string, unknown> };

function replyFor(input: string): { text: string; actions: BotAction[]; code?: ErrorCode } {
  const q = input.toLowerCase();
  const hit = (troubleshooting as Trouble[]).find((item) => item.keywords.some((k) => q.includes(k)));

  if (q.includes("offline") || q.includes("econnrefused")) {
    return {
      code: ErrorCode.WS_OFFLINE,
      text: "Realtime appears offline. Start services with `pnpm dev` at repo root, then reconnect.",
      actions: [{ label: "Reconnect", actionType: "RECONNECT_WS" }, { label: "Refresh", actionType: "REFRESH_ROOM_STATE" }]
    };
  }
  if (q.includes("tile") || q.includes("stalled")) {
    return {
      code: ErrorCode.VDOID_EXPIRED,
      text: "Likely stale room state or expired watch id. Refresh first, then regenerate watch id if needed.",
      actions: [{ label: "Refresh", actionType: "REFRESH_ROOM_STATE" }, { label: "Regen Watch ID", actionType: "REGEN_VDOID", payload: { mode: "SYNC" } }]
    };
  }
  if (q.includes("maintenance")) {
    return {
      code: ErrorCode.MAINTENANCE,
      text: "EzPlay is in maintenance. New joins/actions may be blocked until maintenance ends.",
      actions: [{ label: "Run Diagnostics", actionType: "RUN_DIAGNOSTIC_PING" }]
    };
  }
  if (hit) {
    return {
      text: hit.answer,
      actions: [{ label: "Open Help", actionType: "OPEN_HELP", payload: { href: "/help/obs" } }]
    };
  }
  if (q.includes("obs")) return { text: (faq as any[]).find((x) => x.id === "obs-setup")?.a || "Open /help/obs.", actions: [{ label: "Open OBS Help", actionType: "OPEN_HELP", payload: { href: "/help/obs" } }] };
  if (q.includes("token")) return { text: (faq as any[]).find((x) => x.id === "program-token")?.a || "Check Studio program link.", actions: [{ label: "Run Diagnostics", actionType: "RUN_DIAGNOSTIC_PING" }] };
  if (q.includes("watch") || q.includes("sync") || q.includes("stage")) return { text: (faq as any[]).find((x) => x.id === "watch-modes")?.a || "Use Sync mode fallback.", actions: [{ label: "Refresh", actionType: "REFRESH_ROOM_STATE" }] };
  return {
    text: "Unknown intent. Use diagnostics and share room code + page context.",
    actions: [{ label: "Run Diagnostics", actionType: "RUN_DIAGNOSTIC_PING" }]
  };
}

function runAction(action: BotAction) {
  if (action.actionType === "OPEN_HELP" && action.payload?.href && typeof action.payload.href === "string") {
    window.location.href = action.payload.href;
    return;
  }
  if (action.actionType === "REFRESH_ROOM_STATE") {
    window.location.reload();
    return;
  }
  window.dispatchEvent(new CustomEvent("ezplay-helper-action", { detail: action }));
}

export function HelperBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Array<{ role: "user" | "bot"; text: string; actions?: BotAction[] }>>([
    { role: "bot", text: "I’m EzPlay Helper. Ask about OBS setup, tokens, tiles, telemetry, or WS errors." }
  ]);

  const quick = useMemo(() => ["WS offline", "Tiles stalled", "Program token invalid", "Telemetry not connected"], []);

  function ask(question: string) {
    const reply = replyFor(question);
    setHistory((h) => [...h, { role: "user" as const, text: question }, { role: "bot" as const, text: reply.text, actions: reply.actions }].slice(-16));
    setInput("");
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="w-80 rounded-xl border border-white/20 bg-black/85 p-3 shadow-2xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-black">EzPlay Helper</p>
            <button className="ez-btn ez-btn-muted !px-2 !py-1" onClick={() => setOpen(false)}>Close</button>
          </div>
          <div className="mb-2 max-h-64 space-y-2 overflow-auto text-sm">
            {history.map((m, i) => (
              <div key={i}>
                <p><span className="font-semibold">{m.role === "bot" ? "Helper" : "You"}:</span> {m.text}</p>
                {m.actions && m.actions.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.actions.map((a) => (
                      <button key={`${i}-${a.label}`} className="ez-btn ez-btn-muted !px-2 !py-1 text-xs" onClick={() => runAction(a)}>{a.label}</button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mb-2 flex flex-wrap gap-1">
            {quick.map((q) => <button key={q} className="ez-btn ez-btn-muted !px-2 !py-1 text-xs" onClick={() => ask(q)}>{q}</button>)}
          </div>
          <div className="flex gap-2">
            <input className="ez-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a support question" />
            <button className="ez-btn ez-btn-primary" onClick={() => ask(input || "help")}>Send</button>
          </div>
        </div>
      ) : (
        <button className="ez-btn ez-btn-primary" onClick={() => setOpen(true)}>EzPlay Helper</button>
      )}
    </div>
  );
}
