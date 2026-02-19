import { spawn } from "node:child_process";

const mode = process.argv[2] || "small";
const configByMode = {
  small: { rooms: 50 },
  large: { rooms: 200 }
};
const cfg = configByMode[mode];
if (!cfg) throw new Error(`Unknown mode ${mode}`);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const nodes = {
  A: "http://127.0.0.1:3021",
  B: "http://127.0.0.1:3022"
};

function hashCode(value) {
  let hash = 0;
  for (const ch of value.toUpperCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash;
}
function selectNode(roomCode) {
  return hashCode(roomCode) % 2 === 0 ? "A" : "B";
}
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
    await wait(350);
  }
  throw new Error(`timed out for ${url}`);
}

const wsA = startNode("A", 3021);
const wsB = startNode("B", 3022);

try {
  await Promise.all([waitForMetrics(nodes.A), waitForMetrics(nodes.B)]);

  const counts = { A: 0, B: 0 };
  for (let i = 0; i < cfg.rooms; i += 1) {
    const roomCode = `R${String(i).padStart(4, "0")}`;
    const node = selectNode(roomCode);
    counts[node] += 1;
    const create = await fetch(`${nodes[node]}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-room-node": node },
      body: JSON.stringify({ roomCode })
    });
    const created = await create.json();
    if (!create.ok || !created.ok) throw new Error(`create failed for ${roomCode}: ${JSON.stringify(created)}`);

    const wrongNode = node === "A" ? "B" : "A";
    const wrong = await fetch(`${nodes[wrongNode]}/rooms/${roomCode}`, {
      headers: { "x-room-node": node }
    });
    const wrongPayload = await wrong.json();
    if (wrong.status !== 409 || wrongPayload.code !== "ROOM_NODE_MISMATCH") {
      throw new Error(`expected ROOM_NODE_MISMATCH for ${roomCode}, got ${wrong.status} ${JSON.stringify(wrongPayload)}`);
    }
  }

  const [mA, mB] = await Promise.all([
    fetch(`${nodes.A}/metrics`).then((r) => r.json()),
    fetch(`${nodes.B}/metrics`).then((r) => r.json())
  ]);

  const ratioA = counts.A / cfg.rooms;
  if (ratioA < 0.4 || ratioA > 0.6) throw new Error(`split skewed ${JSON.stringify(counts)}`);
  if (mA.rooms_active !== counts.A || mB.rooms_active !== counts.B) throw new Error(`rooms_active mismatch ${mA.rooms_active}/${mB.rooms_active}`);

  console.log(`[split-harness:${mode}] PASS`, { counts, p95: { A: mA.tick_ms_p95, B: mB.tick_ms_p95 } });
} finally {
  wsA.kill("SIGTERM");
  wsB.kill("SIGTERM");
}
