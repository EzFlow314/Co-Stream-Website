#!/usr/bin/env node

const WS = process.env.WS_HTTP_URL || "http://localhost:4001";
const roomCode = `V123${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(path, init) {
  const res = await fetch(`${WS}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) }
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  const created = await req("/rooms", { method: "POST", body: JSON.stringify({ roomCode }) });
  if (!created.body?.ok) throw new Error(`room create failed: ${JSON.stringify(created)}`);

  await req(`/rooms/${roomCode}/battle-mode`, { method: "POST", body: JSON.stringify({ battleMode: true }) });

  const start = Date.now();
  let sent = 0;
  let accepted = 0;
  let dropped = 0;
  while (Date.now() - start < 2000) {
    const batch = [];
    for (let i = 0; i < 20; i += 1) {
      sent += 1;
      batch.push(req(`/event/${roomCode}`, {
        method: "POST",
        body: JSON.stringify({ participantId: "host", type: "KILL", intensity: 4, statDelta: { kills: 1 } })
      }));
    }
    const out = await Promise.all(batch);
    for (const item of out) {
      if (item.body?.accepted === true) accepted += 1;
      if (item.status === 429 || item.body?.code === "RATE_LIMITED") dropped += 1;
    }
    await sleep(100);
  }


  const metrics = await req("/metrics", { method: "GET" });
  const drainingSet = await req("/admin/maintenance?secret=dev-secret", { method: "POST", body: JSON.stringify({ state: "DRAINING", enabled: true }) });
  const joinWhileDraining = await req(`/event/${roomCode}`, { method: "POST", body: JSON.stringify({ participantId: "host", type: "KILL", intensity: 4, statDelta: { kills: 1 } }) });
  const maintenanceSet = await req("/admin/maintenance?secret=dev-secret", { method: "POST", body: JSON.stringify({ state: "MAINTENANCE", enabled: true }) });
  const blockedAction = await req(`/event/${roomCode}`, { method: "POST", body: JSON.stringify({ participantId: "host", type: "KILL", intensity: 4, statDelta: { kills: 1 } }) });
  await req("/admin/maintenance?secret=dev-secret", { method: "POST", body: JSON.stringify({ state: "ACTIVE", enabled: false }) });

  const acceptedPerSec = accepted / 2;
  const passRateBound = acceptedPerSec <= 9.5;
  const passMaintenance = blockedAction.body?.code === "MAINTENANCE";
  const passMetrics = metrics.status === 200 && metrics.body && typeof metrics.body.rooms_active === "number" && metrics.body.telemetry && typeof metrics.body.broadcast_rate_hz === "number";

  console.log(JSON.stringify({
    ok: passRateBound && passMaintenance && passMetrics,
    roomCode,
    sent,
    accepted,
    dropped,
    acceptedPerSec,
    passRateBound,
    transitions: { draining: drainingSet.body?.maintenance?.state, maintenance: maintenanceSet.body?.maintenance?.state },
    duringDrainingStatus: joinWhileDraining.status,
    blockedCode: blockedAction.body?.code || null,
    passMaintenance,
    passMetrics
  }, null, 2));

  if (!(passRateBound && passMaintenance && passMetrics)) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
