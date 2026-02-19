import { ErrorCode } from "@ezplay/contracts";

export type Bucket = { tokens: number; lastRefillAt: number };
export const TOKEN_CAPACITY = 8;

export function applyTokenBucket(nowMs: number, bucket: Bucket, capacity = TOKEN_CAPACITY, refillPerSec = TOKEN_CAPACITY) {
  const elapsed = Math.max(0, nowMs - bucket.lastRefillAt);
  const refill = elapsed * (refillPerSec / 1000);
  const tokens = Math.min(capacity, bucket.tokens + refill);
  const allowed = tokens >= 1;
  return {
    allowed,
    bucket: {
      tokens: allowed ? tokens - 1 : tokens,
      lastRefillAt: nowMs
    }
  };
}

export function monotonicServerTs(nowMs: number, lastTs: number) {
  return Math.max(nowMs, lastTs + 1);
}

export function isLowConfidenceEvent(intensity: number, statDelta: Record<string, number>) {
  if (intensity <= 0) return true;
  const vals = Object.values(statDelta || {});
  if (vals.length === 0) return true;
  return vals.every((x) => Number(x || 0) === 0);
}

export function makeDedupeKey(participantId: string, type: string, intensity: number, statDelta: Record<string, number>, ts: number) {
  const payload = JSON.stringify({ participantId, type, intensity, statDelta, bucket: Math.floor(ts / 100) });
  let hash = 0;
  for (let i = 0; i < payload.length; i += 1) hash = (hash * 31 + payload.charCodeAt(i)) >>> 0;
  return `dd_${hash.toString(16)}`;
}

export function pruneDedupe(cache: Map<string, number>, nowMs: number, ttlMs = 5000, cap = 2048) {
  for (const [k, ts] of cache.entries()) if (nowMs - ts > ttlMs) cache.delete(k);
  if (cache.size <= cap) return cache;
  const toDelete = [...cache.entries()].sort((a, b) => a[1] - b[1]).slice(0, Math.max(1, Math.floor(cap / 4)));
  for (const [k] of toDelete) cache.delete(k);
  return cache;
}

export type MomentumPoint = { ts: number; value: number };
export function momentumTick(points: MomentumPoint[], nowMs: number, decayFactor: number, windowMs = 20_000, decayPct = 0.08) {
  const kept = points.filter((x) => nowMs - x.ts <= windowMs);
  const raw = kept.reduce((s, x) => s + x.value, 0);
  const nextDecay = Math.max(0.35, Math.min(1, decayFactor * (1 - decayPct)));
  return { kept, raw, display: Number((raw * nextDecay).toFixed(2)), decayFactor: nextDecay };
}

export function shouldTriggerSwing(delta: number, prevDelta: number, nowMs: number, lastSwingAt: number, threshold = 6, cooldownMs = 4000) {
  return Math.abs(delta - prevDelta) >= threshold && nowMs - lastSwingAt >= cooldownMs;
}

export type Segment = "TIP_OFF" | "MOMENTUM_SWING" | "HALFTIME_RECAP" | "CLOSING_HIGHLIGHTS";
export function nextSegment(args: {
  current: Segment;
  elapsedMs: number;
  totalMs: number;
  swingRecent: boolean;
  scoreGap: number;
  sinceSwitchMs: number;
  halftimeFired: boolean;
  closingFired: boolean;
}) {
  const progress = args.totalMs > 0 ? args.elapsedMs / args.totalMs : 0;
  if (args.current === "TIP_OFF" && args.sinceSwitchMs >= 10_000) return { segment: "MOMENTUM_SWING" as const, halftimeFired: args.halftimeFired, closingFired: args.closingFired };
  if (!args.halftimeFired && args.sinceSwitchMs >= 8_000 && args.elapsedMs >= 60_000 && progress >= 0.5) return { segment: "HALFTIME_RECAP" as const, halftimeFired: true, closingFired: args.closingFired };
  if (!args.closingFired && args.sinceSwitchMs >= 8_000 && (progress >= 0.85 || (progress >= 0.75 && args.scoreGap <= 1))) return { segment: "CLOSING_HIGHLIGHTS" as const, halftimeFired: args.halftimeFired, closingFired: true };
  if (args.sinceSwitchMs >= 8_000 && args.swingRecent && args.current !== "MOMENTUM_SWING") return { segment: "MOMENTUM_SWING" as const, halftimeFired: args.halftimeFired, closingFired: args.closingFired };
  return { segment: args.current, halftimeFired: args.halftimeFired, closingFired: args.closingFired };
}

export function allowedAnnouncerTier(segment: Segment, tier: "LOW" | "MID" | "HIGH" | "LEGENDARY", quietMode: boolean) {
  if (segment === "HALFTIME_RECAP" && tier === "MID") return false;
  if (segment === "CLOSING_HIGHLIGHTS" && (tier === "LOW" || tier === "MID")) return false;
  if (quietMode && tier !== "LOW") return false;
  return true;
}

export function violatesAnnouncerMemory(last3: Array<{ patternTag: string; tier: string }>, next: { patternTag: string; tier: string }) {
  if (last3.some((x) => x.patternTag === next.patternTag)) return true;
  const last = last3[last3.length - 1];
  if (last && last.tier === next.tier && next.tier !== "LEGENDARY") return true;
  return false;
}

export function shouldEnterQuietMode(acceptedEventsLast15s: number, lowDensityForMs: number, threshold = 0.2, triggerMs = 45_000) {
  return acceptedEventsLast15s / 15 < threshold && lowDensityForMs >= triggerMs;
}

export function scoreBroadcast(input: {
  validEvents: number;
  matchDurationSeconds: number;
  uniqueInteractions: number;
  interactionsTotal: number;
  swings: number;
  highlightCountsByType: Record<string, number>;
  finalGap: number;
}) {
  const density = input.validEvents / Math.max(1, input.matchDurationSeconds);
  const eventDensity = Math.max(0, Math.min(100, 100 * (1 - Math.exp(-density / 0.8))));
  const interactionsPerMin = input.interactionsTotal / Math.max(1, input.matchDurationSeconds / 60);
  const crowdInteraction = Math.max(0, Math.min(100, input.uniqueInteractions * 3 * 0.7 + interactionsPerMin * 0.3));
  const swings = input.swings;
  const momentumSwings = Math.max(0, Math.min(100, swings < 2 ? 20 : swings > 12 ? Math.max(20, 100 - (swings - 12) * 8) : swings <= 8 ? 70 + (swings - 4) * 7 : 85 - (swings - 8) * 6));
  const totalHighlights = Object.values(input.highlightCountsByType).reduce((s, x) => s + x, 0);
  const dominant = totalHighlights > 0 ? Math.max(...Object.values(input.highlightCountsByType)) / totalHighlights : 0;
  const diversity = Math.max(0, Math.min(100, (Object.keys(input.highlightCountsByType).length / 8) * 100 - (dominant > 0.6 ? 20 : 0)));
  const matchBalance = input.finalGap === 0 ? 100 : input.finalGap === 1 ? 85 : input.finalGap === 2 ? 65 : 40;
  const score = Math.round(eventDensity * 0.3 + crowdInteraction * 0.25 + momentumSwings * 0.2 + diversity * 0.15 + matchBalance * 0.1);
  return {
    sub: { eventDensity, crowdInteraction, momentumSwings, diversity, matchBalance },
    score: Math.max(0, Math.min(100, score))
  };
}

export function tierForBroadcastScore(score: number) {
  if (score >= 90) return "LEGENDARY";
  if (score >= 75) return "PLATINUM";
  if (score >= 60) return "GOLD";
  if (score >= 40) return "SILVER";
  return "BRONZE";
}

export function energyDropAmount(base: number, momentum: number, factor = 0.05, max = 12) {
  return Math.min(max, Math.max(base, base + momentum * factor));
}

export function canSlowmo(args: { intensity: number; swingRecent: boolean; nowMs: number; globalUntil: number; perViewerUntil: number }) {
  if (args.intensity < 4 || !args.swingRecent) return { ok: false, code: ErrorCode.INVALID_REQUEST };
  if (args.nowMs < args.globalUntil || args.nowMs < args.perViewerUntil) return { ok: false, code: ErrorCode.RATE_LIMITED };
  return { ok: true as const };
}

export function canOvertimeBoost(args: { segment: Segment; closeMatch: boolean; nowMs: number; globalUntil: number; perViewerUntil: number }) {
  if (args.segment !== "CLOSING_HIGHLIGHTS" || !args.closeMatch) return { ok: false, code: ErrorCode.INVALID_REQUEST };
  if (args.nowMs < args.globalUntil || args.nowMs < args.perViewerUntil) return { ok: false, code: ErrorCode.RATE_LIMITED };
  return { ok: true as const };
}

export function compressEmoji(active: number, requestedCost: number, cap = 120) {
  if (active + requestedCost <= cap) return { active: active + requestedCost, compressed: false, burstCount: 1 };
  return { active: Math.min(cap, active + 1), compressed: true, burstCount: requestedCost };
}

export function maintenanceGate(state: "ACTIVE" | "DRAINING" | "MAINTENANCE", op: "JOIN" | "ACTION") {
  if (state === "MAINTENANCE") return { allowed: false, code: ErrorCode.MAINTENANCE };
  if (state === "DRAINING" && op === "JOIN") return { allowed: false, code: ErrorCode.DRAINING };
  return { allowed: true as const };
}

export type AbuseState = {
  score: number;
  reducedUntil: number;
  mutedUntil: number;
  warn: boolean;
};

export function nextAbuseState(
  nowMs: number,
  prev: AbuseState,
  signal: "RATE_HIT" | "LOW_CONFIDENCE" | "DEDUPE" | "ACCEPTED"
): AbuseState {
  const state = { ...prev };
  if (signal === "RATE_HIT") state.score += 2;
  if (signal === "LOW_CONFIDENCE" || signal === "DEDUPE") state.score += 1;
  if (signal === "ACCEPTED") state.score = Math.max(0, state.score - 0.25);
  state.warn = state.score >= 4;
  if (state.score >= 8) state.reducedUntil = Math.max(state.reducedUntil, nowMs + 30_000);
  if (state.score >= 12) {
    state.mutedUntil = nowMs + 10_000;
    state.score = 6;
  }
  return state;
}

export function effectiveTelemetryCap(nowMs: number, state: AbuseState, normalCap = 8, reducedCap = 4) {
  return state.reducedUntil > nowMs ? reducedCap : normalCap;
}

export type ViewerActionBucket = { tokens: number; lastRefillAt: number };
export function applyViewerActionBucket(nowMs: number, bucket: ViewerActionBucket, capacity: number, refillPerSec: number) {
  const elapsed = Math.max(0, nowMs - bucket.lastRefillAt);
  const refill = elapsed * (refillPerSec / 1000);
  const tokens = Math.min(capacity, bucket.tokens + refill);
  const allowed = tokens >= 1;
  return {
    allowed,
    bucket: {
      tokens: allowed ? tokens - 1 : tokens,
      lastRefillAt: nowMs
    }
  };
}
