"use client";

import { useEffect } from "react";
import { pushLog } from "@/lib/debug";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    pushLog("error", `${error.name}: ${error.message}`);
  }, [error]);

  return (
    <main className="card space-y-3">
      <h2 className="text-2xl font-black">Something went wrong</h2>
      <p className="text-white/80">The debug panel has captured details.</p>
      <button onClick={reset} className="btn-primary">Try again</button>
    </main>
  );
}
