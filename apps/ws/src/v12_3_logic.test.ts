import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  TOKEN_CAPACITY,
  allowedAnnouncerTier,
  applyTokenBucket,
  applyViewerActionBucket,
  canOvertimeBoost,
  canSlowmo,
  compressEmoji,
  energyDropAmount,
  isLowConfidenceEvent,
  maintenanceGate,
  makeDedupeKey,
  monotonicServerTs,
  momentumTick,
  nextAbuseState,
  nextSegment,
  pruneDedupe,
  scoreBroadcast,
  shouldEnterQuietMode,
  shouldTriggerSwing,
  tierForBroadcastScore,
  violatesAnnouncerMemory
} from "./v12_3_logic";

test("token bucket rate behavior", () => {
  let b = { tokens: TOKEN_CAPACITY, lastRefillAt: 0 };
  let now = 0;
  let allowed = 0;
  for (let i = 0; i < 20; i += 1) {
    const r = applyTokenBucket(now, b);
    b = r.bucket;
    if (r.allowed) allowed += 1;
  }
  assert.equal(allowed, 8);
});

test("monotonic timestamp max(now,last+1)", () => {
  assert.equal(monotonicServerTs(1000, 1000), 1001);
  assert.equal(monotonicServerTs(2000, 1000), 2000);
});

test("low confidence discard rules", () => {
  assert.equal(isLowConfidenceEvent(0, { kills: 1 }), true);
  assert.equal(isLowConfidenceEvent(3, {}), true);
  assert.equal(isLowConfidenceEvent(3, { kills: 0, assists: 0 }), true);
  assert.equal(isLowConfidenceEvent(3, { kills: 1 }), false);
});

test("dedupe pruning bounded", () => {
  const m = new Map<string, number>();
  for (let i = 0; i < 3000; i += 1) m.set(String(i), i);
  pruneDedupe(m, 10_000, 5000, 2048);
  assert.ok(m.size <= 2048);
});

test("rolling window prune + decay clamp", () => {
  const points = [{ ts: 0, value: 4 }, { ts: 10_000, value: 6 }, { ts: 30_001, value: 9 }];
  const tick = momentumTick(points, 30_001, 1);
  assert.equal(tick.kept.length, 1);
  assert.ok(tick.decayFactor <= 1 && tick.decayFactor >= 0.35);
});

test("swing cooldown prevents rapid repeats", () => {
  assert.equal(shouldTriggerSwing(10, 0, 10_000, 0), true);
  assert.equal(shouldTriggerSwing(20, 10, 12_000, 10_000), false);
});

test("segments halftime and closing constraints", () => {
  const halftime = nextSegment({ current: "MOMENTUM_SWING", elapsedMs: 310_000, totalMs: 600_000, swingRecent: false, scoreGap: 3, sinceSwitchMs: 9000, halftimeFired: false, closingFired: false });
  assert.equal(halftime.segment, "HALFTIME_RECAP");
  const closingEarly = nextSegment({ current: "MOMENTUM_SWING", elapsedMs: 100_000, totalMs: 600_000, swingRecent: false, scoreGap: 0, sinceSwitchMs: 9000, halftimeFired: true, closingFired: false });
  assert.equal(closingEarly.segment, "MOMENTUM_SWING");
  const closingLate = nextSegment({ current: "MOMENTUM_SWING", elapsedMs: 540_000, totalMs: 600_000, swingRecent: false, scoreGap: 3, sinceSwitchMs: 9000, halftimeFired: true, closingFired: false });
  assert.equal(closingLate.segment, "CLOSING_HIGHLIGHTS");
});

test("announcer anti-repeat and gating", () => {
  assert.equal(allowedAnnouncerTier("HALFTIME_RECAP", "MID", false), false);
  assert.equal(allowedAnnouncerTier("CLOSING_HIGHLIGHTS", "HIGH", false), true);
  assert.equal(violatesAnnouncerMemory([{ patternTag: "combo", tier: "MID" }], { patternTag: "combo", tier: "HIGH" }), true);
});

test("quiet mode accepted density", () => {
  assert.equal(shouldEnterQuietMode(2, 45_000), true);
  assert.equal(shouldEnterQuietMode(10, 45_000), false);
});

test("broadcast scoring normalized and deterministic", () => {
  const a = scoreBroadcast({ validEvents: 1000, matchDurationSeconds: 600, uniqueInteractions: 50, interactionsTotal: 400, swings: 20, highlightCountsByType: { A: 40, B: 2 }, finalGap: 4 });
  const b = scoreBroadcast({ validEvents: 1000, matchDurationSeconds: 600, uniqueInteractions: 50, interactionsTotal: 400, swings: 20, highlightCountsByType: { A: 40, B: 2 }, finalGap: 4 });
  assert.deepEqual(a, b);
  assert.ok(a.score <= 100 && a.score >= 0);
  assert.equal(tierForBroadcastScore(90), "LEGENDARY");
});

test("minigame gates + compression", () => {
  assert.equal(canSlowmo({ intensity: 3, swingRecent: true, nowMs: 1, globalUntil: 0, perViewerUntil: 0 }).ok, false);
  assert.equal(canOvertimeBoost({ segment: "TIP_OFF", closeMatch: true, nowMs: 1, globalUntil: 0, perViewerUntil: 0 }).ok, false);
  assert.ok(energyDropAmount(5, 200) <= 12);
  const compressed = compressEmoji(119, 6);
  assert.equal(compressed.compressed, true);
  assert.ok(compressed.active <= 120);
});

test("maintenance semantics", () => {
  assert.equal(maintenanceGate("DRAINING", "JOIN").allowed, false);
  assert.equal(maintenanceGate("DRAINING", "ACTION").allowed, true);
  assert.equal(maintenanceGate("MAINTENANCE", "ACTION").allowed, false);
});

test("dedupe key determinism", () => {
  const k1 = makeDedupeKey("p", "KILL", 4, { kills: 1 }, 1000);
  const k2 = makeDedupeKey("p", "KILL", 4, { kills: 1 }, 1000);
  assert.equal(k1, k2);
});


test("golden replay fixture produces stable snapshot hash", () => {
  const fixture = JSON.parse(readFileSync("../../fixtures/v12.4/golden_match.json", "utf8")) as { events: Array<{ ts: number; participantId: string; type: string; intensity: number; statDelta: Record<string, number> }> };
  const replay = () => {
    let bucket = { tokens: TOKEN_CAPACITY, lastRefillAt: 0 };
    let lastTs = 0;
    const dedupe = new Map<string, number>();
    const accepted: Array<{ ts: number; value: number; type: string }> = [];
    for (const e of fixture.events) {
      const rate = applyTokenBucket(e.ts, bucket);
      bucket = rate.bucket;
      if (!rate.allowed) continue;
      const ts = monotonicServerTs(e.ts, lastTs);
      lastTs = ts;
      if (isLowConfidenceEvent(e.intensity, e.statDelta)) continue;
      const key = makeDedupeKey(e.participantId, e.type, e.intensity, e.statDelta, ts);
      pruneDedupe(dedupe, ts);
      if (dedupe.has(key)) continue;
      dedupe.set(key, ts);
      accepted.push({ ts, value: e.intensity, type: e.type });
    }
    const scored = scoreBroadcast({
      validEvents: accepted.length,
      matchDurationSeconds: 60,
      uniqueInteractions: 4,
      interactionsTotal: 10,
      swings: 2,
      highlightCountsByType: accepted.reduce((acc, x) => ({ ...acc, [x.type]: (acc[x.type] || 0) + 1 }), {} as Record<string, number>),
      finalGap: 1
    });
    const hash = createHash("sha256").update(JSON.stringify({ accepted, scored })).digest("hex");
    return hash;
  };

  const first = replay();
  const second = replay();
  assert.equal(first, second);
});

test("abuse escalation mutes spammer and normal user stays clean", () => {
  let spam = { score: 0, reducedUntil: 0, mutedUntil: 0, warn: false };
  let now = 0;
  for (let i = 0; i < 12; i += 1) {
    now += 100;
    spam = nextAbuseState(now, spam, "RATE_HIT");
  }
  assert.ok(spam.warn);
  assert.ok(spam.reducedUntil > now);
  assert.ok(spam.mutedUntil > now);

  let normal = { score: 0, reducedUntil: 0, mutedUntil: 0, warn: false };
  for (let i = 0; i < 20; i += 1) normal = nextAbuseState(i * 500, normal, "ACCEPTED");
  assert.equal(normal.warn, false);
  assert.equal(normal.mutedUntil, 0);
});

test("viewer action bucket prevents single-user hogging", () => {
  let b = { tokens: 3, lastRefillAt: 0 };
  const first = applyViewerActionBucket(0, b, 3, 3);
  b = first.bucket;
  const second = applyViewerActionBucket(0, b, 3, 3);
  b = second.bucket;
  const third = applyViewerActionBucket(0, b, 3, 3);
  b = third.bucket;
  const blocked = applyViewerActionBucket(0, b, 3, 3);
  assert.equal(blocked.allowed, false);
});
