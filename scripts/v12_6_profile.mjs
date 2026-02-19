#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { runMode } from "./v12_5_load_harness.mjs";

const baselinePath = "fixtures/v12.6/profile_baseline.json";
const reportPath = "reports/v12.6/profile.json";

function loadBaseline() {
  return JSON.parse(readFileSync(baselinePath, "utf8"));
}

function assertRegressionGuard(small, baseline) {
  const tickP95 = Number(small.metrics?.tick_ms_p95 || 0);
  const broadcast = Number(small.metrics?.broadcast_rate_hz || 0);
  const memSlope = Number(small.memory?.slopeMb || 0);
  const maxTick = Number(baseline.small.tick_p95_max || 20);
  const maxBroadcast = Number(baseline.small.broadcast_hz_max || 60);
  const maxMemSlope = Number(baseline.small.memory_slope_mb_max || 80);

  const failReasons = [];
  if (tickP95 > maxTick * 1.2) failReasons.push(`tick_p95 regression: ${tickP95} > ${maxTick * 1.2}`);
  if (broadcast > maxBroadcast) failReasons.push(`broadcast_hz cap: ${broadcast} > ${maxBroadcast}`);
  if (memSlope > maxMemSlope) failReasons.push(`memory_slope cap: ${memSlope} > ${maxMemSlope}`);
  return failReasons;
}

function buildCapacityProfile(small, large) {
  const smallMetrics = small.metrics || {};
  const largeMetrics = (large && large.metrics) || {};
  return {
    maxRooms_normal: Number(small.profile?.rooms || 0),
    maxRooms_degraded: Number(large?.profile?.rooms || 0),
    maxParticipantsPerRoom_observed_safe: Number(small.profile?.participantsPerRoom || 0),
    tick_p95_at_max: Number(largeMetrics.tick_ms_p95 || smallMetrics.tick_ms_p95 || 0),
    broadcast_hz_at_max: Number(largeMetrics.broadcast_rate_hz || smallMetrics.broadcast_rate_hz || 0),
    telemetry_accept_rate_at_max: Number(largeMetrics.telemetry?.accepted_per_sec || smallMetrics.telemetry?.accepted_per_sec || 0),
    memory_growth_slope_mb: Number((large?.memory?.slopeMb ?? small.memory?.slopeMb ?? 0))
  };
}

async function main() {
  const baseline = loadBaseline();
  const small = await runMode("small");
  const large = await runMode("large");

  const failReasons = assertRegressionGuard(small, baseline);
  const capacityProfile = buildCapacityProfile(small, large);
  const recommendedDefaults = {
    MAX_ACTIVE_ROOMS: Math.max(10, Math.floor(capacityProfile.maxRooms_normal * 0.75)),
    MAX_PARTICIPANTS_PER_ROOM: Math.max(6, Math.floor(capacityProfile.maxParticipantsPerRoom_observed_safe * 0.8)),
    tick_p95_warn_ms: 80,
    tick_p95_crit_ms: 160,
    tick_overrun_warn_per_min: 15,
    tick_overrun_crit_per_min: 50
  };

  const output = {
    ok: failReasons.length === 0,
    failReasons,
    capacityProfile,
    recommendedDefaults,
    runs: { small, large },
    alerts: {
      warn: [
        "tick_p95 > 80ms sustained",
        "tick_overruns > 15/min",
        "protection_mode flapping",
        "telemetry drop rate spike beyond expected"
      ],
      crit: [
        "tick_p95 > 160ms sustained",
        "tick_overruns > 50/min",
        "protection_mode stays DEGRADED",
        "memory slope accelerates"
      ]
    },
    scaleOutPlaybook: {
      phaseA: "2 WS nodes with sticky affinity by roomCode hash (no Redis)",
      phaseB: "Introduce shared discovery store + pub/sub only when cross-node coordination is required"
    }
  };

  mkdirSync("reports/v12.6", { recursive: true });
  writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), ...output }, null, 2));
  console.log(JSON.stringify({ reportPath, ...output }, null, 2));
  if (!output.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
