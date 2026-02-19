import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const web = spawn("pnpm", ["--filter", "@bigroom/web", "exec", "next", "dev", "-p", "3050"], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env } });

async function waitFor(url) {
  for (let i = 0; i < 100; i += 1) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch {}
    await wait(500);
  }
  throw new Error("web not ready");
}

try {
  await waitFor("http://127.0.0.1:3050/api/feedback");
  const res = await fetch("http://127.0.0.1:3050/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "alpha feedback", category: "Bug", roomCode: "ROOM1", mode: "alpha", protectionMode: "NORMAL", route: "/studio/ROOM1" })
  });
  const json = await res.json();
  if (!json.ok || !json.id) throw new Error("feedback failed");
  console.log("[v12.9:feedback] PASS", { id: json.id });
} finally {
  web.kill("SIGTERM");
  await rm("reports/feedback", { recursive: true, force: true });
}
