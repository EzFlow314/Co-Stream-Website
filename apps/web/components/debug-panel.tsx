"use client";

import { useEffect, useState } from "react";
import { getLogs } from "@/lib/debug";

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(getLogs());

  useEffect(() => {
    const timer = setInterval(() => setItems(getLogs()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button onClick={() => setOpen((v) => !v)} className="btn-muted">Debug</button>
      {open && (
        <div className="card mt-2 h-64 w-96 overflow-auto text-xs">
          {items.map((item, i) => (
            <p key={i} className={item.level === "error" ? "text-red-400" : item.level === "warn" ? "text-yellow-300" : "text-green-300"}>
              [{new Date(item.ts).toLocaleTimeString()}] {item.level.toUpperCase()} - {item.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
