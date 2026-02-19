#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const WS = process.env.WS_HTTP_URL || "http://localhost:4001";
const mode = process.argv[2] || "small";
const reportPathArg = process.argv.find((a) => a.startsWith("--report="));
const reportPath = reportPathArg ? reportPathArg.replace("--report=", "") : `reports/v12.6/load_${mode}.json`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function req(path, init) {
  const res = await fetch(`${WS}${path}`, { ...init, headers: { "content-type": "application/json", ...(init?.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function fireRoomLoad(roomCode, participantsPerRoom, eventsPerParticipant, durationMs) {
  await req("/rooms", { method: "POST", body: JSON.stringify({ roomCode }) });
  await req(`/rooms/${roomCode}/battle-mode`, { method: "POST", body: JSON.stringify({ battleMode: true }) });
  const started = Date.now();
  let sent = 0;
  while (Date.now() - started < durationMs) {
    const batch = [];
    for (let p = 0; p < participantsPerRoom; p += 1) {
      for (let e = 0; e < eventsPerParticipant; e += 1) {
        sent += 1;
        batch.push(req(`/event/${roomCode}`, {
          method: "POST",
          body: JSON.stringify({ participantId: `p${p}`, type: "KILL", intensity: 4, statDelta: { kills: 1 } })
        }));
      }
    }
    await Promise.all(batch);
    await sleep(200);
  }
  return sent;
}

function scenarioForMode(name) {
  if (name === "small") return { rooms: 10, participantsPerRoom: 5, eventsPerParticipant: 2, durationMs: 3000 };
  if (name === "large") return { rooms: 50, participantsPerRoom: 10, eventsPerParticipant: 3, durationMs: 5000 };
  if (name === "soak10m") return { rooms: 20, participantsPerRoom: 6, eventsPerParticipant: 2, durationMs: 10 * 60_000 };
  throw new Error(`unknown scenario ${name}`);
}

async function runProfile(profile) {
  const rooms = [];
  let totalSent = 0;
  const memStartMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  for (let i = 0; i < profile.rooms; i += 1) rooms.push(`L${Date.now().toString(36)}${i}`);
  const runners = rooms.map((roomCode) => fireRoomLoad(roomCode, profile.participantsPerRoom, profile.eventsPerParticipant, profile.durationMs).then((n) => { totalSent += n; }));
  await Promise.all(runners);
  const metrics = await req("/metrics", { method: "GET" });
  const memEndMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const broadcastCap = profile.rooms >= 50 ? 150 : 50;
  const pass = metrics.status === 200 && Number(metrics.body.broadcast_rate_hz || 0) <= broadcastCap && Number(metrics.body.tick_ms_p95 || 0) < 250;
  return {
    pass,
    profile,
    totalSent,
    metrics: metrics.body,
    memory: { startMb: memStartMb, endMb: memEndMb, slopeMb: memEndMb - memStartMb }
  };
}

function writeReport(modeName, payload) {
  mkdirSync("reports/v12.6", { recursive: true });
  writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), mode: modeName, ...payload }, null, 2));
}

export async function runMode(modeName) {
  if (modeName === "spike") {
    const fixture = JSON.parse(readFileSync("fixtures/v12.5/spike_scenario.json", "utf8"));
    let allPass = true;
    const outputs = [];
    for (const step of fixture.steps) {
      const out = await runProfile(step);
      outputs.push(out);
      allPass = allPass && out.pass;
    }
    return { pass: allPass, mode: modeName, outputs };
  }

  const profile = scenarioForMode(modeName);
  return runProfile(profile);
}

async function main() {
  const result = await runMode(mode);
  writeReport(mode, { ok: result.pass, result });
  console.log(JSON.stringify({ ok: result.pass, mode, result, reportPath }, null, 2));
  if (!result.pass) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
