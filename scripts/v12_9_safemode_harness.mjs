import { spawn } from "node:child_process";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const adminSecret = "dev-secret";

function pickRoomForNode(nodeId) {
  for (let i = 0; i < 5000; i += 1) {
    const roomCode = `SAFE${i}`;
    let hash = 0;
    for (const ch of roomCode.toUpperCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    const expected = hash % 2 === 0 ? "A" : "B";
    if (expected === nodeId) return roomCode;
  }
  return "SAFE0";
}

function startWs() {
  return spawn("pnpm", ["--filter", "@bigroom/ws", "exec", "tsx", "src/index.ts"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, MODE: "alpha", WS_PORT: "4041", ADMIN_SECRET: adminSecret }
  });
}

async function waitFor(url) {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await wait(250);
  }
  throw new Error(`timeout ${url}`);
}

const ws = startWs();
try {
  await waitFor("http://127.0.0.1:4041/metrics");
  const roomCode = pickRoomForNode("A");
  await fetch("http://127.0.0.1:4041/rooms", { method: "POST", headers: { "Content-Type": "application/json", "x-room-node": "A" }, body: JSON.stringify({ roomCode }) });

  await fetch(`http://127.0.0.1:4041/admin/safemode?secret=${adminSecret}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: true, reason: "alpha test" }) });
  const metrics = await fetch("http://127.0.0.1:4041/metrics").then((r) => r.json());
  if (metrics.mode !== "alpha" || !metrics.safemode) throw new Error("metrics mode/safemode missing");

  await fetch(`http://127.0.0.1:4041/admin/safemode?secret=${adminSecret}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: false }) });
  const metricsOff = await fetch("http://127.0.0.1:4041/metrics").then((r) => r.json());
  if (metricsOff.safemode) throw new Error("safemode did not disable");

  console.log("[v12.9:safemode] PASS", { mode: metrics.mode, safemodeOn: metrics.safemode, safemodeOff: metricsOff.safemode });
} finally {
  ws.kill("SIGTERM");
}
