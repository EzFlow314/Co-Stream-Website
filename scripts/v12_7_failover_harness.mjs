import { spawn } from "node:child_process";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const nodes = {
  A: "http://127.0.0.1:3031",
  B: "http://127.0.0.1:3032"
};

function startNode(nodeId, port) {
  const child = spawn("pnpm", ["--filter", "@bigroom/ws", "exec", "tsx", "src/index.ts"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ID: nodeId, WS_PORT: String(port) }
  });
  
  return child;
}
async function waitForMetrics(url, timeoutMs = 25_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${url}/metrics`);
      if (res.ok) return;
    } catch {}
    await wait(300);
  }
  throw new Error(`timeout ${url}`);
}

const wsA = startNode("A", 3031);
const wsB = startNode("B", 3032);

try {
  await Promise.all([waitForMetrics(nodes.A), waitForMetrics(nodes.B)]);

  await fetch(`${nodes.A}/rooms`, { method: "POST", headers: { "Content-Type": "application/json", "x-room-node": "A" }, body: JSON.stringify({ roomCode: "FAILA1" }) });
  await fetch(`${nodes.B}/rooms`, { method: "POST", headers: { "Content-Type": "application/json", "x-room-node": "B" }, body: JSON.stringify({ roomCode: "FAILB1" }) });

  wsB.kill("SIGTERM");
  await wait(1200);

  const aRoom = await fetch(`${nodes.A}/rooms/FAILA1`, { headers: { "x-room-node": "A" } });
  if (!aRoom.ok) throw new Error("Room on A should still be available");

  let bErrorCode = "";
  try {
    await fetch(`${nodes.B}/rooms/FAILB1`, { headers: { "x-room-node": "B" } });
  } catch {
    bErrorCode = "NODE_UNAVAILABLE";
  }
  if (bErrorCode !== "NODE_UNAVAILABLE") throw new Error("expected NODE_UNAVAILABLE for node B room");

  console.log("[failover-harness] PASS", { aContinues: true, bErrorCode });
} finally {
  wsA.kill("SIGTERM");
  wsB.kill("SIGTERM");
}
