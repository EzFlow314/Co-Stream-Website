import { spawn } from "node:child_process";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function startNode(nodeId, port) {
  const child = spawn("pnpm", ["--filter", "@bigroom/ws", "exec", "tsx", "src/index.ts"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ID: nodeId, WS_PORT: String(port) }
  });
  
  return child;
}

async function waitForMetrics(baseUrl, timeoutMs = 25_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/metrics`, { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch {}
    await wait(350);
  }
  throw new Error(`Timed out waiting for metrics at ${baseUrl}`);
}

const wsA = startNode("A", 3011);
const wsB = startNode("B", 3012);

try {
  const [a, b] = await Promise.all([
    waitForMetrics("http://127.0.0.1:3011"),
    waitForMetrics("http://127.0.0.1:3012")
  ]);

  if (a.node_id !== "A" || b.node_id !== "B") {
    throw new Error(`Unexpected node ids: ${a.node_id}, ${b.node_id}`);
  }

  console.log("[dual-harness] PASS both nodes online", { a: a.node_id, b: b.node_id });
} finally {
  wsA.kill("SIGTERM");
  wsB.kill("SIGTERM");
}
