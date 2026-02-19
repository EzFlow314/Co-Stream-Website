import test from "node:test";
import assert from "node:assert/strict";
import { ErrorCode } from "@ezplay/contracts";
import { fetchWithMismatchRetry, selectNode, type NodeTarget } from "./node-router";
import { mergeActiveIndexes } from "./discover-index";

const nodes: NodeTarget[] = [
  { id: "A", url: "http://localhost:3001" },
  { id: "B", url: "http://localhost:3002" }
];

test("selectNode is stable for same roomCode", () => {
  const first = selectNode("ABCD12", nodes).id;
  for (let i = 0; i < 100; i += 1) assert.equal(selectNode("ABCD12", nodes).id, first);
});

test("selectNode distributes room codes roughly evenly", () => {
  const counts = { A: 0, B: 0 };
  for (let i = 0; i < 10_000; i += 1) counts[selectNode(`ROOM${i.toString(36).toUpperCase()}`, nodes).id] += 1;
  const ratioA = counts.A / 10_000;
  assert.ok(ratioA > 0.45 && ratioA < 0.55, `distribution skewed: ${JSON.stringify(counts)}`);
});

test("fetchWithMismatchRetry retries expected node once", async () => {
  const originalEnv = { ...process.env };
  process.env.WS_NODE_A_URL = "http://node-a";
  process.env.WS_NODE_B_URL = "http://node-b";
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL) => {
    const u = String(url);
    calls.push(u);
    if (u.startsWith("http://node-b")) {
      return new Response(JSON.stringify({ ok: false, code: ErrorCode.ROOM_NODE_MISMATCH, expectedNode: "A", roomCode: "ROOM42" }), { status: 409 });
    }
    return new Response(JSON.stringify({ ok: true, room: { roomCode: "ROOM42" } }), { status: 200 });
  }) as typeof fetch;

  try {
    const { res } = await fetchWithMismatchRetry("/rooms/ROOM42", "ROOM42");
    assert.equal(res.status, 200);
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("mergeActiveIndexes merges deduped rows", () => {
  const rows = mergeActiveIndexes([
    [{ roomCode: "A", crowdTaps: 2, nodeId: "A" }, { roomCode: "B", crowdTaps: 1, nodeId: "A" }],
    [{ roomCode: "A", crowdTaps: 5, nodeId: "B" }]
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.roomCode, "A");
  assert.equal(rows[0]?.crowdTaps, 5);
});
