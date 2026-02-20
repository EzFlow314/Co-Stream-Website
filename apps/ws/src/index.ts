import cors from "cors";
import express from "express";
import { createServer } from "http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import {
  GAME_EVENT_WEIGHTS,
  announcerEngine,
  applyStatsDelta,
  createEmptyRoomStats,
  DEFAULT_PARTICIPANT_STATS,
  makeRoomCode,
  makeToken,
  sanitizeText,
  vibeDNA,
  type RoomStatsState,
  type StandardGameEvent,
  type WsEnvelope
} from "@bigroom/shared";
import { ErrorCode, computeStageLayout, runtimeSegmentTheme, type RoomLifecycle, type StageLayout, type StageMode } from "@ezplay/contracts";
import { InMemoryRoomRegistry } from "./room-registry";
import { resolveRuntimeConfig } from "./config";

type ClipProvider = "OBS_REPLAY" | "EZPLAY_BUFFER" | "EXTERNAL_HOTKEY" | "NONE";
type StreamProfile = "CALM" | "HYPE" | "TACTICAL" | "CHAOS";
type Platform = "TWITCH" | "YOUTUBE" | "KICK" | "TIKTOK" | "FACEBOOK" | "DISCORD" | "OTHER";
type MatchScore = { scoreHype: number; scoreTelemetry: number; scoreTotal: number };
type Participant = { id: string; name: string; role: "HOST" | "GUEST"; vdoId: string; profile: StreamProfile };
type Moment = { id: string; ts: number; type: string; label: string; participantId?: string; intensity?: number; payload?: unknown };
type TelemetryNormalizedEvent = {
  eventId: string;
  roomCode: string;
  matchId: string;
  participantId: string;
  ts: number;
  type: StandardGameEvent["type"];
  intensity: 0 | 1 | 2 | 3 | 4 | 5;
  statDelta: Record<string, number>;
  dedupeKey: string;
  clientTs?: number;
};

type WsOpEnvelope = {
  op?: string;
  reqId?: string;
  roomCode?: string;
  matchId?: string;
  participantId?: string;
  clientTs?: number;
  data?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  type?: string;
};

type MaintState = "ACTIVE" | "DRAINING" | "MAINTENANCE";
type RoomState = {
  roomCode: string;
  lifecycle: RoomLifecycle;
  shardKey: string;
  joinToken: string;
  programToken: string;
  discordInviteUrl?: string;
  familyMode: boolean;
  battleMode: boolean;
  matchStatus: "PENDING" | "LIVE" | "ENDED";
  matchId?: string;
  matchStartedAt?: number;
  matchDurationMs: number;
  crewA: string;
  crewB: string;
  viewers: Set<string>;
  viewerActionTs: Map<string, number>;
  viewerLastSeen: Map<string, number>;
  viewerPowerUpTs: Map<string, number>;
  lastGlobalPowerUpTs: number;
  participants: Participant[];
  crowdTaps: number;
  scoreA: MatchScore;
  scoreB: MatchScore;
  eventHistory: StandardGameEvent[];
  moments: Moment[];
  heat: Record<string, number>;
  votes: Record<string, number>;
  emojiPerSecond: { sec: number; count: number };
  audioFocusParticipantId: string;
  autoAudioFocus: boolean;
  audioFocusReturnTs?: number;
  audioFocusPrev?: string;
  lastMajorEffectTs: number;
  lastSpotlightChangeTs: number;
  lastLayoutChangeTs: number;
  lastStickerTs: number;
  lastAutoClipTs: number;
  perStreamerClipTs: Record<string, number>;
  recentHighMoments: Array<{ ts: number; participantId: string; intensity: number }>;
  automationLogs: Array<{ ts: number; action: string; reason: string }>;
  nowPlayingGame?: string;
  nowPlayingPlatform?: Platform;
  vibeProfile: "STREET" | "NEON" | "ARENA" | "CREATOR" | "CHILL" | "AUTO";
  clipProvider: ClipProvider;
  stats: RoomStatsState;
  statsCooldownByParticipant: Record<string, number>;
  announcerCooldown: Record<string, number>;
  firstTimeSetup: { obsAdded: boolean; recordingConfigured: boolean; telemetryConfigured: boolean; vibeChosen: boolean };
  telemetryStatus: "CONNECTED" | "WAITING" | "UNSUPPORTED";
  automationEngine: boolean;
  autoLayout: boolean;
  momentsLogging: boolean;
  segmentsEngine: boolean;
  currentSegment: "TIP_OFF" | "MOMENTUM_SWING" | "HALFTIME_RECAP" | "CLOSING_HIGHLIGHTS";
  segmentStartedAt: number;
  matureMode: boolean;
  watchTogetherMode: "STAGE" | "SYNC";
  broadcastScore: number;
  broadcastRating: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "LEGENDARY";
  crewReputation: { crewA: number; crewB: number };
  crewPlaybookPerks: { crewA: string[]; crewB: string[] };
  maintenanceState: MaintState;
  maintenanceChangedAt: number;
  maintenanceDrainUntil?: number;
  telemetryLastTsByParticipant: Record<string, number>;
  telemetryDropSamples: Record<string, { dropCount: number; firstDropTs: number; lastDropTs: number }>;
  telemetryMomentum: {
    windowMs: number;
    teamA: Array<{ ts: number; value: number }>;
    teamB: Array<{ ts: number; value: number }>;
    rawA: number;
    rawB: number;
    displayA: number;
    displayB: number;
    decayFactor: number;
    lastDelta: number;
    lastSwingAt: number;
  };
  helperKnownIssues: Record<string, { count: number; lastSeenAt: number }>;
  announcerQuietMode: boolean;
  announcerQuietSince?: number;
  announcerLowDensitySince?: number;
  announcerRecoveredDensitySince?: number;
  announcerLastCallouts: Array<{ ts: number; tier: "LOW" | "MID" | "HIGH" | "LEGENDARY"; templateId: string; patternTag: string }>;
  telemetryEventsLast15s: number[];
  maintenanceBannerEtaSeconds?: number;
  matchStatsStartedAt?: number;
  swingCount: number;
  highlightCountsByType: Record<string, number>;
  viewerInteractionUnique: Set<string>;
  viewerInteractionTotal: number;
  stageMode: StageMode;
  stageLayout: StageLayout;
  stageContext: {
    screenShareActive: boolean;
    activeSpeakerIntensity: number;
    eventDensity: number;
    closenessOfMatch: number;
    momentumScore: number;
    wsHealthy: boolean;
    tileStallCount: number;
  };
  stageDirector: {
    auto: boolean;
    lockMode: StageMode | null;
    forceFeatureParticipantId: string | null;
    disableAutoTransitions: boolean;
    pinnedParticipants: string[];
  };
};

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  if (maintenanceWindow.state !== "MAINTENANCE") return next();
  const allow = req.method === "GET" || req.path === "/health" || req.path.startsWith("/admin/");
  if (allow) return next();
  return res.status(503).json({ ok: false, code: ErrorCode.MAINTENANCE, message: "EzPlay is in maintenance. Please retry shortly." });
});

const server = createServer(app);
const wss = new WebSocketServer({ server });
const roomSockets = new Map<string, Set<WebSocket>>();
const runtimeConfig = resolveRuntimeConfig(process.env);
const MAX_ACTIVE_ROOMS = runtimeConfig.maxActiveRooms;
const MAX_PARTICIPANTS_PER_ROOM = runtimeConfig.maxParticipantsPerRoom;
const roomRegistry = new InMemoryRoomRegistry<RoomState>(MAX_ACTIVE_ROOMS);
const webhookRate = new Map<string, number>();
const ADMIN_SECRET = process.env.ADMIN_SECRET || "dev-secret";
const NODE_ID = String(process.env.NODE_ID || "A").toUpperCase();
const ROUTER_NODE_IDS = String(process.env.ROUTER_NODE_IDS || "A,B").split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);
const maintenanceWindow: { enabled: boolean; state: MaintState; message: string; startsAt?: number; endsAt?: number } = { enabled: false, state: "ACTIVE", message: "Maintenance mode" };
const safeMode = { enabled: false, reason: "" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const roadmapFile = resolve(__dirname, "../data/roadmap.json");
type RoadmapSuggestion = { id: string; title: string; description: string; tags: string[]; status: "OPEN" | "IN_REVIEW" | "PLANNED" | "SHIPPED" | "REJECTED"; monthKey: string; score: number; upvotes: number; downvotes: number };
const roadmapStore: Record<string, RoadmapSuggestion[]> = (() => {
  try { return JSON.parse(readFileSync(roadmapFile, "utf8")); } catch { return {}; }
})();
const roadmapVoteLimiter = new Map<string, number>();

function saveRoadmap() {
  mkdirSync(dirname(roadmapFile), { recursive: true });
  writeFileSync(roadmapFile, JSON.stringify(roadmapStore, null, 2), "utf8");
}

function assertRoomNodeMatch(req: express.Request, res: express.Response, next: express.NextFunction) {
  const hintedNode = String(req.header("x-room-node") || "").toUpperCase();
  const roomCode = String(req.params.roomCode || (req.body && typeof req.body.roomCode === "string" ? req.body.roomCode : "") || "");
  const expectedNode = roomCode ? nodeForRoomCode(roomCode) : hintedNode;
  if ((hintedNode && hintedNode !== NODE_ID) || (expectedNode && expectedNode !== NODE_ID)) {
    return res.status(409).json({
      ok: false,
      code: ErrorCode.ROOM_NODE_MISMATCH,
      message: `Room ${roomCode || "unknown"} is assigned to node ${expectedNode || hintedNode}.`,
      roomCode,
      node: NODE_ID,
      expectedNode: expectedNode || hintedNode
    });
  }
  next();
}

const releasePlans: Array<{ id: string; title: string; description: string; targetReleaseWindow: string; status: "DRAFT" | "IN_DEV" | "READY" | "SCHEDULED" | "DEPLOYED" }> = [];

let seasonCounter = 1;
const seasons = [{ id: `season_${seasonCounter}`, name: `Season ${seasonCounter}`, updatedAt: Date.now(), isActive: true, leaderboard: [] as any[] }];
const telemetryBuckets = new Map<string, { tokens: number; lastRefillAt: number; droppedWindowCount: number; windowStartAt: number }>();
const telemetryAbuse = new Map<string, { score: number; reducedUntil: number; mutedUntil: number; warn: boolean }>();
const viewerActionBuckets = new Map<string, { tokens: number; lastRefillAt: number }>();
const joinAttemptByIp = new Map<string, { count: number; windowStartAt: number }>();
const telemetryDedupe = new Map<string, Map<string, number>>();
const TELEMETRY_MAX_PER_SEC = 8;
const TELEMETRY_DEDUPE_WINDOW_MS = 100;
const TELEMETRY_DEDUPE_MAX = 2048;
const MAINTENANCE_MAX_DRAIN_MS = 15 * 60_000;
const ANNOUNCER_TEMPLATE_COOLDOWN_MS = 30_000;
const ROOM_STATE_HZ = runtimeConfig.roomStateHz;
const ROOM_STATE_INTERVAL_MS = Math.floor(1000 / ROOM_STATE_HZ);
const ROOM_STATE_RESYNC_MS = runtimeConfig.roomStateResyncMs;
const ROOM_EPHEMERAL_CAP = 4000;

const runtimeMetrics = {
  startedAt: Date.now(),
  telemetryAccepted: 0,
  telemetryDropped: 0,
  telemetryDiscarded: 0,
  broadcasts: 0,
  tickMs: [] as number[],
  tickOverruns: 0
};
const roomStateBroadcastGate = new Map<string, number>();
const roomStateResyncGate = new Map<string, number>();
const lastRoomStateHash = new Map<string, string>();
let tickBusy = false;
let protectionMode: "NORMAL" | "DEGRADED" = "NORMAL";

function scoreTotal(score: MatchScore) { score.scoreTotal = score.scoreHype + score.scoreTelemetry; }
function levelFromXp(xp: number) { return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1; }
function pushAutomation(room: RoomState, action: string, reason: string) { room.automationLogs.push({ ts: Date.now(), action, reason }); room.automationLogs = room.automationLogs.slice(-20); }

function createRoomState(roomCode = makeRoomCode()): RoomState {
  return {
    roomCode,
    lifecycle: "CREATED",
    shardKey: `shard_${Math.abs([...roomCode].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0)) % 128}`,
    joinToken: makeToken(16),
    programToken: makeToken(20),
    familyMode: false,
    battleMode: false,
    matchStatus: "PENDING",
    matchDurationMs: 10 * 60_000,
    crewA: "Crew A",
    crewB: "Crew B",
    viewers: new Set(),
    viewerActionTs: new Map(),
    viewerLastSeen: new Map(),
    viewerPowerUpTs: new Map(),
    lastGlobalPowerUpTs: 0,
    participants: [{ id: "host", name: "Host", role: "HOST", vdoId: "host", profile: "TACTICAL" }],
    crowdTaps: 0,
    scoreA: { scoreHype: 0, scoreTelemetry: 0, scoreTotal: 0 },
    scoreB: { scoreHype: 0, scoreTelemetry: 0, scoreTotal: 0 },
    eventHistory: [],
    moments: [],
    heat: { host: 0 },
    votes: {},
    emojiPerSecond: { sec: 0, count: 0 },
    audioFocusParticipantId: "host",
    autoAudioFocus: false,
    lastMajorEffectTs: 0,
    lastSpotlightChangeTs: 0,
    lastLayoutChangeTs: 0,
    lastStickerTs: 0,
    lastAutoClipTs: 0,
    perStreamerClipTs: {},
    recentHighMoments: [],
    automationLogs: [],
    nowPlayingGame: "",
    nowPlayingPlatform: "TWITCH",
    vibeProfile: "AUTO",
    clipProvider: "NONE",
    stats: createEmptyRoomStats(),
    statsCooldownByParticipant: {},
    announcerCooldown: {},
    firstTimeSetup: { obsAdded: false, recordingConfigured: false, telemetryConfigured: false, vibeChosen: false },
    telemetryStatus: "WAITING",
    automationEngine: true,
    autoLayout: true,
    momentsLogging: true,
    segmentsEngine: true,
    currentSegment: "TIP_OFF",
    segmentStartedAt: Date.now(),
    matureMode: false,
    watchTogetherMode: "SYNC",
    broadcastScore: 0,
    broadcastRating: "BRONZE",
    crewReputation: { crewA: 100, crewB: 100 },
    crewPlaybookPerks: { crewA: ["Crowd Boost", "Hype Magnet", "Heat Shield"], crewB: ["Instant Replay Token", "Overtime Multiplier", "Crowd Boost"] },
    maintenanceState: "ACTIVE",
    maintenanceChangedAt: Date.now(),
    telemetryLastTsByParticipant: {},
    telemetryDropSamples: {},
    telemetryMomentum: { windowMs: 20_000, teamA: [], teamB: [], rawA: 0, rawB: 0, displayA: 0, displayB: 0, decayFactor: 1, lastDelta: 0, lastSwingAt: 0 },
    helperKnownIssues: {},
    announcerQuietMode: false,
    announcerLastCallouts: [],
    telemetryEventsLast15s: [],
    swingCount: 0,
    highlightCountsByType: {},
    viewerInteractionUnique: new Set(),
    viewerInteractionTotal: 0,
    stageMode: "LOBBY",
    stageLayout: computeStageLayout({
      segment: "TIP_OFF",
      momentumScore: 0,
      screenShareActive: false,
      activeSpeakerIntensity: 0,
      eventDensity: 0,
      closenessOfMatch: 0.5,
      safemode: false,
      wsHealthy: true,
      tileStallCount: 0
    }),
    stageContext: {
      screenShareActive: false,
      activeSpeakerIntensity: 0,
      eventDensity: 0,
      closenessOfMatch: 0.5,
      momentumScore: 0,
      wsHealthy: true,
      tileStallCount: 0
    },
    stageDirector: {
      auto: true,
      lockMode: null,
      forceFeatureParticipantId: null,
      disableAutoTransitions: false,
      pinnedParticipants: []
    }
  };
}

function normalizeRoomCode(input: string) {
  return String(input || "").trim().toUpperCase();
}

function getRoom(code: string) {
  return roomRegistry.get(normalizeRoomCode(code));
}

function requireRoom(res: express.Response, code: string) {
  const room = getRoom(code);
  if (!room) {
    res.status(404).json({ ok: false, code: ErrorCode.ROOM_NOT_FOUND, message: "Room not found. Ask host to create it first." });
    return null;
  }
  return room;
}

function createRoom(code?: string) {
  const roomCode = normalizeRoomCode(code || makeRoomCode());
  const created = roomRegistry.create(roomCode, createRoomState);
  if (!created.ok) return { ok: false as const, code: ErrorCode.ROOM_CAP_REACHED };
  return { ok: true as const, room: created.room };
}
function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function computeCloseness(room: RoomState) {
  const diff = Math.abs(room.scoreA.scoreTotal - room.scoreB.scoreTotal);
  return clamp01(1 - diff / 8);
}

function evaluateStage(room: RoomState, wsHealthy: boolean, tileStallCount: number) {
  const eventDensity = clamp01(room.telemetryEventsLast15s.length / 18);
  const momentumScore = clamp01(Math.max(Math.abs(room.telemetryMomentum.lastDelta), Math.abs(room.telemetryMomentum.displayA - room.telemetryMomentum.displayB) / 10));
  const activeSpeakerIntensity = clamp01(room.audioFocusParticipantId && room.audioFocusParticipantId !== "host" ? 0.72 : 0.35);
  const screenShareActive = room.watchTogetherMode === "STAGE" || Boolean(room.stageDirector.forceFeatureParticipantId);
  const closenessOfMatch = computeCloseness(room);

  const stageLayout = computeStageLayout({
    segment: room.currentSegment,
    momentumScore,
    screenShareActive,
    activeSpeakerIntensity,
    eventDensity,
    closenessOfMatch,
    safemode: safeMode.enabled,
    wsHealthy,
    tileStallCount,
    directorLockMode: room.stageDirector.auto ? null : room.stageDirector.lockMode,
    forceFeature: Boolean(room.stageDirector.forceFeatureParticipantId)
  });

  room.stageContext = {
    screenShareActive,
    activeSpeakerIntensity,
    eventDensity,
    closenessOfMatch,
    momentumScore,
    wsHealthy,
    tileStallCount
  };

  if (room.stageMode !== stageLayout.mode) {
    pushAutomation(room, "stage", `${room.stageMode} -> ${stageLayout.mode}`);
  }
  room.stageMode = stageLayout.mode;
  room.stageLayout = stageLayout;
}

function broadcast<T>(roomCode: string, envelope: WsEnvelope<T> | Record<string, unknown>) {
  const sockets = roomSockets.get(roomCode); if (!sockets) return;
  const msg = JSON.stringify(envelope);
  sockets.forEach((s) => {
    if (s.readyState === WebSocket.OPEN) s.send(msg);
  });
}
function activeSeason() {
  const s = seasons.find((x) => x.isActive); if (s) return s;
  seasonCounter += 1;
  const next = { id: `season_${seasonCounter}`, name: `Season ${seasonCounter}`, updatedAt: Date.now(), isActive: true, leaderboard: [] as any[] };
  seasons.push(next); return next;
}
function addMoment(room: RoomState, moment: Moment) {
  room.moments.push(moment);
  room.moments = room.moments.slice(-500);
  broadcast(room.roomCode, { type: "MOMENT_ADDED", roomCode: room.roomCode, payload: moment, ts: Date.now() });
}

function segmentToAnnouncerSegment(segment: RoomState["currentSegment"]) {
  if (segment === "HALFTIME_RECAP") return "HALFTIME_RECAP" as const;
  if (segment === "CLOSING_HIGHLIGHTS") return "CLOSING_HIGHLIGHTS" as const;
  if (segment === "MOMENTUM_SWING") return "MOMENTUM" as const;
  return "TIP_OFF" as const;
}

function calloutTierFromIntensity(intensity: number): "LOW" | "MID" | "HIGH" | "LEGENDARY" {
  if (intensity >= 5) return "LEGENDARY";
  if (intensity >= 4) return "HIGH";
  if (intensity >= 2) return "MID";
  return "LOW";
}

function allowedTiers(segment: ReturnType<typeof segmentToAnnouncerSegment>, quietMode: boolean): Set<"LOW" | "MID" | "HIGH" | "LEGENDARY"> {
  if (segment === "HALFTIME_RECAP") return new Set(["LOW", "HIGH", "LEGENDARY"] as const);
  if (segment === "CLOSING_HIGHLIGHTS") return new Set(["HIGH", "LEGENDARY"] as const);
  if (segment === "TIP_OFF") return new Set(["LOW", "MID", "HIGH"] as const);
  if (quietMode) return new Set(["LOW"] as const);
  return new Set(["MID", "HIGH", "LEGENDARY"] as const);
}

function patternTagForEvent(eventType: string) {
  if (["OBJECTIVE", "GOAL"].includes(eventType)) return "objective_steal";
  if (["KILL", "HEADSHOT"].includes(eventType)) return "clutch_finish";
  if (eventType === "ASSIST") return "combo_chain";
  return "momentum_swing";
}

function emitAnnouncer(room: RoomState, participantId: string, eventType: string, intensity: number) {
  const now = Date.now();
  const tier = calloutTierFromIntensity(intensity);
  const segment = segmentToAnnouncerSegment(room.currentSegment);
  const tierAllowed = allowedTiers(segment, room.announcerQuietMode);
  if (!tierAllowed.has(tier)) return;

  const recent = room.announcerLastCallouts.slice(-3);
  const patternTag = patternTagForEvent(eventType);
  if (recent.some((x) => x.patternTag === patternTag)) return;
  if (recent[recent.length - 1]?.tier === tier && tier !== "LEGENDARY") return;

  const templateId = `${eventType.toLowerCase()}_${tier.toLowerCase()}`;
  const templateBlockedUntil = room.announcerCooldown[templateId] ?? 0;
  if (templateBlockedUntil > now) return;

  const lastGlobal = room.announcerCooldown.global ?? 0;
  const lastParticipant = room.announcerCooldown[participantId] ?? 0;
  const globalCooldown = intensity >= 5 ? 20_000 : intensity >= 4 ? 6_000 : 2_500;
  if (now - lastGlobal < globalCooldown || now - lastParticipant < 6_000) return;

  room.announcerCooldown.global = now;
  room.announcerCooldown[participantId] = now;
  room.announcerCooldown[templateId] = now + ANNOUNCER_TEMPLATE_COOLDOWN_MS;

  const vibe = room.vibeProfile === "AUTO" ? "ARENA" : room.vibeProfile;
  const callout = announcerEngine({
    eventType,
    intensity,
    vibe: (vibe === "CREATOR" ? "CHILL" : vibe) as "STREET" | "ARENA" | "NEON" | "CHILL",
    identity: { participantId, announcerAddressingMode: "NEUTRAL_ONLY" },
    familyMode: room.familyMode
  });

  room.announcerLastCallouts.push({ ts: now, tier, templateId, patternTag });
  room.announcerLastCallouts = room.announcerLastCallouts.slice(-3);

  broadcast(room.roomCode, {
    op: "announcer.callout",
    roomCode: room.roomCode,
    matchId: room.matchId || "default",
    serverTs: now,
    ok: true,
    data: { tier, templateId, patternTag, text: callout.calloutText, ttlMs: 4500 },
    error: null
  });
  broadcast(room.roomCode, { type: "ANNOUNCER_CALLOUT", roomCode: room.roomCode, payload: callout, ts: now });
}

function statPopLabel(delta: Partial<{ kills: number; assists: number; score: number; objectives: number }>) {
  if ((delta.kills ?? 0) > 0) return `+${delta.kills} KILL`;
  if ((delta.objectives ?? 0) > 0) return "OBJECTIVE!";
  if ((delta.score ?? 0) > 0) return `+${delta.score} SCORE`;
  if ((delta.assists ?? 0) > 0) return `+${delta.assists} ASSIST`;
  return "STAT";
}

function ratingFromScore(score: number): RoomState["broadcastRating"] {
  if (score >= 90) return "LEGENDARY";
  if (score >= 75) return "PLATINUM";
  if (score >= 60) return "GOLD";
  if (score >= 40) return "SILVER";
  return "BRONZE";
}

function telemetryKey(roomCode: string, matchId: string, participantId: string) {
  return `${roomCode}:${matchId}:${participantId}`;
}

function nodeForRoomCode(roomCode: string) {
  let hash = 0;
  for (const ch of String(roomCode || "").toUpperCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return ROUTER_NODE_IDS[hash % Math.max(1, ROUTER_NODE_IDS.length)] || NODE_ID;
}

function applyViewerBucket(key: string, capacity: number, refillPerSec: number) {
  const now = Date.now();
  const bucket = viewerActionBuckets.get(key) || { tokens: capacity, lastRefillAt: now };
  const elapsed = Math.max(0, now - bucket.lastRefillAt);
  const refill = elapsed * (refillPerSec / 1000);
  const tokens = Math.min(capacity, bucket.tokens + refill);
  const allowed = tokens >= 1;
  const next = { tokens: allowed ? tokens - 1 : tokens, lastRefillAt: now };
  viewerActionBuckets.set(key, next);
  return allowed;
}

function bumpAbuse(roomCode: string, matchId: string, participantId: string, signal: "RATE_HIT" | "LOW_CONFIDENCE" | "DEDUPE" | "ACCEPTED") {
  const key = telemetryKey(roomCode, matchId, participantId);
  const now = Date.now();
  const prev = telemetryAbuse.get(key) || { score: 0, reducedUntil: 0, mutedUntil: 0, warn: false };
  const next = { ...prev };
  if (signal === "RATE_HIT") next.score += 2;
  if (signal === "LOW_CONFIDENCE" || signal === "DEDUPE") next.score += 1;
  if (signal === "ACCEPTED") next.score = Math.max(0, next.score - 0.25);
  next.warn = next.score >= 4;
  if (next.score >= 8) next.reducedUntil = Math.max(next.reducedUntil, now + 30_000);
  if (next.score >= 12) {
    next.mutedUntil = now + 10_000;
    next.score = 6;
  }
  telemetryAbuse.set(key, next);
  return next;
}

function checkTelemetryRateLimit(roomCode: string, matchId: string, participantId: string) {
  const key = telemetryKey(roomCode, matchId, participantId);
  const now = Date.now();
  const abuse = telemetryAbuse.get(key) || { score: 0, reducedUntil: 0, mutedUntil: 0, warn: false };
  if (abuse.mutedUntil > now) {
    return { allowed: false, retryAfterMs: Math.max(250, abuse.mutedUntil - now), dropCount: 0, escalated: true as const };
  }
  const cap = abuse.reducedUntil > now ? Math.max(2, Math.floor(TELEMETRY_MAX_PER_SEC / 2)) : TELEMETRY_MAX_PER_SEC;
  const bucket = telemetryBuckets.get(key) || { tokens: cap, lastRefillAt: now, droppedWindowCount: 0, windowStartAt: now };
  const elapsed = Math.max(0, now - bucket.lastRefillAt);
  bucket.tokens = Math.min(cap, bucket.tokens + elapsed * (cap / 1000));
  bucket.lastRefillAt = now;
  if (bucket.tokens < 1) {
    if (now - bucket.windowStartAt > 10_000) {
      bucket.windowStartAt = now;
      bucket.droppedWindowCount = 0;
    }
    bucket.droppedWindowCount += 1;
    telemetryBuckets.set(key, bucket);
    return { allowed: false, retryAfterMs: 250, dropCount: bucket.droppedWindowCount, escalated: false as const };
  }
  bucket.tokens -= 1;
  telemetryBuckets.set(key, bucket);
  return { allowed: true, retryAfterMs: 0, dropCount: 0, escalated: false as const };
}

function makeDedupeKey(participantId: string, type: string, intensity: number, statDelta: Record<string, number>, ts: number) {
  const payload = JSON.stringify({ participantId, type, intensity, statDelta, bucket: Math.floor(ts / TELEMETRY_DEDUPE_WINDOW_MS) });
  let hash = 0;
  for (let i = 0; i < payload.length; i += 1) hash = (hash * 31 + payload.charCodeAt(i)) >>> 0;
  return `dd_${hash.toString(16)}`;
}

function isLowConfidence(intensity: number, statDelta: Record<string, number>) {
  if (intensity <= 0) return true;
  const values = Object.values(statDelta || {});
  if (values.length === 0) return true;
  if (values.every((v) => Number(v || 0) === 0)) return true;
  return false;
}

function telemetryTeamForParticipant(participantId: string) {
  if (participantId === "host" || participantId.includes("1") || participantId.includes("3") || participantId.includes("5")) return "A" as const;
  return "B" as const;
}

function telemetryWeight(type: string) {
  if (type === "KILL" || type === "HEADSHOT") return 3;
  if (type === "ASSIST") return 2;
  if (type === "OBJECTIVE" || type === "GOAL") return 4;
  return 1;
}

function applyTelemetryMomentum(room: RoomState, event: TelemetryNormalizedEvent) {
  const team = telemetryTeamForParticipant(event.participantId);
  const weight = telemetryWeight(event.type);
  const multiplier = 0.5 + Math.max(0, Math.min(5, event.intensity)) * 0.1;
  const value = weight * multiplier;
  const list = team === "A" ? room.telemetryMomentum.teamA : room.telemetryMomentum.teamB;
  list.push({ ts: event.ts, value });
}

function recalcTelemetryMomentum(room: RoomState, now: number) {
  const m = room.telemetryMomentum;
  m.teamA = m.teamA.filter((x) => now - x.ts <= m.windowMs);
  m.teamB = m.teamB.filter((x) => now - x.ts <= m.windowMs);
  m.rawA = m.teamA.reduce((sum, x) => sum + x.value, 0);
  m.rawB = m.teamB.reduce((sum, x) => sum + x.value, 0);
  m.decayFactor = Math.max(0.35, Math.min(1, m.decayFactor * (1 - 0.08)));
  m.displayA = Number((m.rawA * m.decayFactor).toFixed(2));
  m.displayB = Number((m.rawB * m.decayFactor).toFixed(2));
  const delta = m.displayA - m.displayB;
  const swing = Math.abs(delta - m.lastDelta);
  if (swing >= 6 && now - m.lastSwingAt >= 4000) {
    m.lastSwingAt = now;
    room.swingCount += 1;
    addMoment(room, { id: makeToken(8), ts: now, type: "MOMENTUM_SHIFT", label: "MOMENTUM SWING!", intensity: 4 });
    broadcast(room.roomCode, { type: "MOMENTUM_SHIFT", roomCode: room.roomCode, payload: { delta, swing, momentumA: m.displayA, momentumB: m.displayB }, ts: now });
  }
  m.lastDelta = delta;
}

function wsReply(socket: WebSocket, roomCode: string, matchId: string, reqId: string | undefined, op: string, ok: boolean, data: unknown, error: { code: ErrorCode; message: string; retryAfterMs?: number; debug?: Record<string, unknown> } | null = null) {
  socket.send(JSON.stringify({ op, reqId: reqId || null, roomCode, matchId, serverTs: Date.now(), ok, data, error }));
}

function helperResponseFromQuery(input: { text: string; currentPage?: string; uiFlags?: Record<string, unknown>; lastErrorCode?: string }) {
  const text = String(input.text || "").toLowerCase();
  const lastErrorCode = String(input.lastErrorCode || "");
  if (lastErrorCode === "VDOID_EXPIRED" || text.includes("tiles stuck") || Boolean(input.uiFlags?.tilesStuck)) {
    return {
      intent: "TILES_STUCK",
      likelyCause: "STALE_ROOM_STATE",
      steps: ["Refresh room state.", "If unchanged after 3s, reconnect WebSocket.", "If watch tile, regenerate video id."],
      actions: [
        { label: "Refresh", actionType: "REFRESH_ROOM_STATE", payload: {} },
        { label: "Reconnect", actionType: "RECONNECT_WS", payload: {} },
        { label: "Regen Watch ID", actionType: "REGEN_VDOID", payload: { mode: "SYNC" } }
      ]
    };
  }
  if (lastErrorCode === "WS_DISCONNECTED" || text.includes("offline") || Boolean(input.uiFlags?.wsDisconnected)) {
    return {
      intent: "WS_DISCONNECTED",
      likelyCause: "WS_RECONNECT_NEEDED",
      steps: ["Reconnect WebSocket.", "Refresh room state.", "If still disconnected, run pnpm dev from repo root."],
      actions: [{ label: "Reconnect", actionType: "RECONNECT_WS", payload: {} }, { label: "Refresh", actionType: "REFRESH_ROOM_STATE", payload: {} }]
    };
  }
  if (lastErrorCode === "MAINTENANCE" || lastErrorCode === "DRAINING" || text.includes("maintenance")) {
    return {
      intent: "MAINTENANCE",
      likelyCause: lastErrorCode === "DRAINING" ? "MAINTENANCE_DRAINING" : "MAINTENANCE_MODE",
      steps: ["Wait for maintenance to complete.", "Check banner ETA.", "Retry after ETA expires."],
      actions: [{ label: "Open Status", actionType: "RUN_DIAGNOSTIC_PING", payload: {} }]
    };
  }
  if (lastErrorCode === "RATE_LIMITED" || lastErrorCode === "RATE_LIMIT_ESCALATED") {
    return {
      intent: "RATE_LIMITED",
      likelyCause: "EVENT_SPAM_GUARD",
      steps: ["Slow down event submissions.", "Wait for cooldown.", "Retry telemetry after 1 second."],
      actions: [{ label: "Run Diagnostics", actionType: "RUN_DIAGNOSTIC_PING", payload: {} }]
    };
  }
  return {
    intent: "UNKNOWN",
    likelyCause: "UNKNOWN_INTENT",
    steps: ["Describe the issue with room code and page.", "Use diagnostics ping.", "Try reconnect if realtime is offline."],
    actions: [{ label: "Run Diagnostics", actionType: "RUN_DIAGNOSTIC_PING", payload: {} }]
  };
}


function setMaintenanceState(nextState: MaintState, message?: string, etaSeconds?: number) {
  const now = Date.now();
  maintenanceWindow.state = nextState;
  maintenanceWindow.enabled = nextState !== "ACTIVE";
  if (message) maintenanceWindow.message = sanitizeText(message);
  maintenanceWindow.startsAt = now;
  if (nextState === "DRAINING") {
    maintenanceWindow.endsAt = now + MAINTENANCE_MAX_DRAIN_MS;
  }
  for (const room of roomRegistry.listActive()) {
    room.maintenanceState = nextState;
    room.maintenanceChangedAt = now;
    if (nextState === "DRAINING") room.maintenanceDrainUntil = now + MAINTENANCE_MAX_DRAIN_MS;
    if (nextState === "ACTIVE") room.maintenanceDrainUntil = undefined;
    room.maintenanceBannerEtaSeconds = etaSeconds;
    const banner = {
      state: nextState,
      message: nextState === "DRAINING"
        ? "Maintenance soon. New joins disabled. Current matches will finish."
        : nextState === "MAINTENANCE"
          ? "EzPlay is in maintenance. Please retry shortly."
          : "Maintenance complete.",
      etaSeconds: etaSeconds ?? (nextState === "DRAINING" ? Math.floor(MAINTENANCE_MAX_DRAIN_MS / 1000) : undefined)
    };
    broadcast(room.roomCode, { op: "maintenance.banner", roomCode: room.roomCode, serverTs: now, ok: true, data: banner, error: null });
    broadcast(room.roomCode, { type: "MAINTENANCE_MODE", roomCode: room.roomCode, payload: { ...maintenanceWindow, banner }, ts: now });
  }
}

app.get("/health", (_req, res) => res.json({ ok: true, maintenance: maintenanceWindow.enabled, state: maintenanceWindow.state }));
app.get("/metrics", (_req, res) => {
  const p95 = runtimeMetrics.tickMs.length ? [...runtimeMetrics.tickMs].sort((a, b) => a - b)[Math.floor(runtimeMetrics.tickMs.length * 0.95)] : 0;
  const uptimeSec = Math.max(1, Math.floor((Date.now() - runtimeMetrics.startedAt) / 1000));
  res.json({
    ok: true,
    rooms_active: roomRegistry.stats().activeRooms,
    telemetry: {
      accepted_per_sec: Number((runtimeMetrics.telemetryAccepted / uptimeSec).toFixed(3)),
      dropped_per_sec: Number((runtimeMetrics.telemetryDropped / uptimeSec).toFixed(3)),
      discarded_per_sec: Number((runtimeMetrics.telemetryDiscarded / uptimeSec).toFixed(3))
    },
    broadcast_rate_hz: Number((runtimeMetrics.broadcasts / uptimeSec).toFixed(3)),
    tick_ms_avg: runtimeMetrics.tickMs.length ? Number((runtimeMetrics.tickMs.reduce((a, b) => a + b, 0) / runtimeMetrics.tickMs.length).toFixed(2)) : 0,
    tick_ms_p95: Number((p95 || 0).toFixed(2)),
    tick_overrun_count: runtimeMetrics.tickOverruns,
    maintenance_state: maintenanceWindow.state,
    ws_uptime: uptimeSec,
    protection_mode: protectionMode,
    mode: runtimeConfig.mode,
    safemode: safeMode.enabled,
    safemode_reason: safeMode.reason || null,
    caps: { max_active_rooms: MAX_ACTIVE_ROOMS, max_participants_per_room: MAX_PARTICIPANTS_PER_ROOM },
    thresholds: { tick_p95_warn_ms: runtimeConfig.tickP95WarnMs, tick_overrun_warn: runtimeConfig.tickOverrunWarn },
    node_id: NODE_ID
  });
});
app.get("/arena/leaderboard", (_req, res) => {
  const season = activeSeason();
  const rows = [...season.leaderboard].sort((a, b) => b.scoreTotal - a.scoreTotal || b.wins - a.wins);
  res.json({ ok: true, season: { name: season.name, updatedAt: season.updatedAt }, rows });
});
app.post("/admin/season/reset", (req, res) => {
  if (String(req.query.secret || "") !== ADMIN_SECRET) return res.status(403).json({ ok: false });
  const curr = activeSeason(); curr.isActive = false;
  for (const room of roomRegistry.listActive()) {
    room.crewReputation.crewA = Number((room.crewReputation.crewA * 0.92).toFixed(2));
    room.crewReputation.crewB = Number((room.crewReputation.crewB * 0.92).toFixed(2));
  }
  seasonCounter += 1;
  const next = { id: `season_${seasonCounter}`, name: `Season ${seasonCounter}`, updatedAt: Date.now(), isActive: true, leaderboard: [] as any[] };
  seasons.push(next);
  res.json({ ok: true, season: next });
});

app.get("/admin/maintenance", (req, res) => {
  if (String(req.query.secret || "") !== ADMIN_SECRET) return res.status(403).json({ ok: false });
  res.json({ ok: true, maintenance: maintenanceWindow });
});

app.post("/admin/maintenance", (req, res) => {
  if (String(req.query.secret || "") !== ADMIN_SECRET) return res.status(403).json({ ok: false });
  const requested = String(req.body.state || (Boolean(req.body.enabled) ? "DRAINING" : "ACTIVE")) as MaintState;
  if (!["ACTIVE", "DRAINING", "MAINTENANCE"].includes(requested)) {
    return res.status(400).json({ ok: false, code: "INVALID_STATE" });
  }
  const curr = maintenanceWindow.state;
  if (curr === "ACTIVE" && requested === "MAINTENANCE") {
    return res.status(400).json({ ok: false, code: "INVALID_TRANSITION", message: "Set DRAINING before MAINTENANCE." });
  }
  setMaintenanceState(requested, String(req.body.message || "Maintenance mode"), Number(req.body.etaSeconds || 0) || undefined);
  res.json({ ok: true, maintenance: maintenanceWindow });
});


app.get("/admin/safemode", (req, res) => {
  const secret = String(req.query.secret || req.header("x-admin-secret") || "");
  if (secret !== ADMIN_SECRET) return res.status(403).json({ ok: false });
  res.json({ ok: true, safemode: safeMode });
});

app.post("/admin/safemode", (req, res) => {
  const secret = String(req.query.secret || req.header("x-admin-secret") || "");
  if (secret !== ADMIN_SECRET) return res.status(403).json({ ok: false });
  const enabled = Boolean(req.body.enabled);
  safeMode.enabled = enabled;
  safeMode.reason = enabled ? sanitizeText(String(req.body.reason || "Ops safety")) : "";
  for (const room of roomRegistry.listActive()) {
    broadcast(room.roomCode, { op: "ops.banner", roomCode: room.roomCode, serverTs: Date.now(), ok: true, data: { message: enabled ? `Safe Mode enabled: ${safeMode.reason}` : "Safe Mode disabled", safemode: safeMode.enabled }, error: null });
  }
  res.json({ ok: true, safemode: safeMode });
});

app.get("/admin/release-plans", (req, res) => {
  if (String(req.query.secret || "") !== ADMIN_SECRET) return res.status(403).json({ ok: false });
  res.json({ ok: true, plans: releasePlans });
});

app.post("/admin/release-plans", (req, res) => {
  if (String(req.query.secret || "") !== ADMIN_SECRET) return res.status(403).json({ ok: false });
  const plan = {
    id: `plan_${makeToken(6)}`,
    title: sanitizeText(String(req.body.title || "Roadmap Winner")),
    description: sanitizeText(String(req.body.description || "")),
    targetReleaseWindow: sanitizeText(String(req.body.targetReleaseWindow || "TBD")),
    status: (String(req.body.status || "DRAFT") as "DRAFT" | "IN_DEV" | "READY" | "SCHEDULED" | "DEPLOYED")
  };
  releasePlans.unshift(plan);
  res.json({ ok: true, plan });
});

app.post("/rooms", assertRoomNodeMatch, (req, res) => {
  if (maintenanceWindow.state !== "ACTIVE") return res.status(503).json({ ok: false, code: maintenanceWindow.state === "DRAINING" ? ErrorCode.DRAINING : ErrorCode.MAINTENANCE, message: "EzPlay is in maintenance. Please retry shortly." });
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const created = createRoom(typeof (body as any).roomCode === "string" ? (body as any).roomCode : undefined);
  if (!created.ok) return res.status(503).json({ ok: false, code: ErrorCode.ROOM_CAP_REACHED, message: "Room capacity reached. Retry shortly." });
  res.json({ ok: true, room: created.room });
});


app.get("/rooms/active-index", (_req, res) => {
  const rooms = roomRegistry.listActive().map((room) => ({
    roomCode: room.roomCode,
    crewA: room.crewA,
    crewB: room.crewB,
    nowPlayingGame: room.nowPlayingGame,
    currentSegment: room.currentSegment,
    crowdTaps: room.crowdTaps,
    lifecycle: room.lifecycle,
    nodeId: NODE_ID
  }));
  res.json({ ok: true, rooms, nodeId: NODE_ID });
});

app.get("/rooms", (_req, res) => {
  const rooms = roomRegistry.listActive().filter((room) => room.lifecycle !== "ARCHIVED").map((room) => ({
    roomCode: room.roomCode,
    crewA: room.crewA,
    crewB: room.crewB,
    nowPlayingGame: room.nowPlayingGame,
    currentSegment: room.currentSegment,
    crowdTaps: room.crowdTaps,
    nodeId: NODE_ID
  }));
  res.json({ ok: true, rooms });
});

app.get("/rooms/:roomCode", assertRoomNodeMatch, (req, res) => {
  const room = requireRoom(res, String(req.params.roomCode || ""));
  if (!room) return;
  res.json({ ok: true, room: { ...room, viewers: room.viewers.size, viewerCount: room.viewers.size, viewerCap: 200, protectionMode, safemode: safeMode.enabled } });
});
app.post("/rooms/:roomCode/stage-override", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  const modeRaw = String(req.body.mode || "").toUpperCase();
  const mode = (["LOBBY", "ACTIVE", "FEATURE", "CLUTCH", "RECOVERY"] as const).includes(modeRaw as StageMode) ? modeRaw as StageMode : null;
  room.stageDirector.auto = false;
  room.stageDirector.lockMode = mode;
  room.stageDirector.forceFeatureParticipantId = typeof req.body.forceFeatureParticipantId === "string" ? sanitizeText(req.body.forceFeatureParticipantId) : null;
  room.stageDirector.disableAutoTransitions = Boolean(req.body.disableAutoTransitions);
  evaluateStage(room, true, 0);
  res.json({ ok: true, stageDirector: room.stageDirector, stageMode: room.stageMode, stageLayout: room.stageLayout });
});

app.post("/rooms/:roomCode/stage-auto", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  room.stageDirector.auto = true;
  room.stageDirector.lockMode = null;
  room.stageDirector.forceFeatureParticipantId = null;
  room.stageDirector.disableAutoTransitions = false;
  room.stageDirector.pinnedParticipants = [];
  evaluateStage(room, true, 0);
  res.json({ ok: true, stageDirector: room.stageDirector, stageMode: room.stageMode, stageLayout: room.stageLayout });
});

app.post("/rooms/:roomCode/stage-pin", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  const list = Array.isArray(req.body.pinnedParticipants) ? req.body.pinnedParticipants.map((x: unknown) => sanitizeText(String(x))).filter(Boolean).slice(0, 6) : [];
  room.stageDirector.pinnedParticipants = list;
  res.json({ ok: true, pinnedParticipants: room.stageDirector.pinnedParticipants });
});

app.get("/rooms/:roomCode/moments", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  res.json({ ok: true, moments: room.moments });
});
app.get("/rooms/:roomCode/recap", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  const mvp = Object.entries(room.votes).sort((a, b) => b[1] - a[1])[0]?.[0] || "host";
  const hottest = Object.entries(room.heat).sort((a, b) => b[1] - a[1])[0]?.[0] || "host";
  const bestMoment = room.moments.filter((m) => m.intensity).sort((a, b) => (b.intensity || 0) - (a.intensity || 0))[0] || null;
  const groupEpic = [...room.moments].reverse().find((m) => m.type === "GROUP_EPIC_EVENT") || null;
  const winner = room.scoreA.scoreTotal >= room.scoreB.scoreTotal ? room.crewA : room.crewB;
  res.json({ ok: true, recap: { winner, scoreA: room.scoreA, scoreB: room.scoreB, mvp, hottest, bestMoment, groupEpic, broadcastScore: room.broadcastScore, broadcastRating: room.broadcastRating, crewReputation: room.crewReputation } });
});

app.get("/rooms/:roomCode/moment-vault", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  const ranked = [...room.moments].sort((a, b) => (b.intensity || 0) - (a.intensity || 0));
  const payload = {
    topSession: ranked.slice(0, 10),
    topWeeklyCrewA: ranked.filter((m) => m.participantId?.startsWith("guest") || m.participantId === "host").slice(0, 10),
    topWeeklyCrewB: ranked.filter((m) => m.participantId?.includes("2") || m.participantId?.includes("3")).slice(0, 10),
    topSeasonal: ranked.slice(0, 10)
  };
  res.json({ ok: true, momentVault: payload });
});

app.post("/rooms/:roomCode/watch-mode", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  const mode = String(req.body.mode || "SYNC") === "STAGE" ? "STAGE" : "SYNC";
  const ageVerified = Boolean(req.body.ageVerified);
  if (room.matureMode && !ageVerified) return res.status(403).json({ ok: false, error: "age verification required" });
  room.watchTogetherMode = mode;
  broadcast(room.roomCode, { type: "WATCH_MODE_SET", roomCode: room.roomCode, payload: { mode, rightsWarning: "Respect platform rights. Sync mode fallback is available." }, ts: Date.now() });
  res.json({ ok: true, mode, rightsWarning: "Respect platform rights." });
});

app.post("/rooms/:roomCode/mature-mode", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  room.matureMode = Boolean(req.body.matureMode);
  res.json({ ok: true, matureMode: room.matureMode });
});

app.post("/rooms/:roomCode/now-playing", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  room.nowPlayingGame = sanitizeText(String(req.body.game || room.nowPlayingGame || ""));
  room.nowPlayingPlatform = (String(req.body.platform || room.nowPlayingPlatform || "TWITCH") as Platform);
  room.vibeProfile = (String(req.body.vibeProfile || room.vibeProfile || "AUTO") as RoomState["vibeProfile"]);
  broadcast(room.roomCode, { type: "NOWPLAYING_SET", roomCode: room.roomCode, payload: { game: room.nowPlayingGame, platform: room.nowPlayingPlatform, vibeProfile: room.vibeProfile }, ts: Date.now() });
  const applied = vibeDNA({ game: room.nowPlayingGame || "", platform: room.nowPlayingPlatform || "TWITCH", mode: room.battleMode ? "GAMEPLAY" : "WATCH", battleMode: room.battleMode, crowdMeter: room.crowdTaps, lastEpicTs: room.lastMajorEffectTs });
  broadcast(room.roomCode, { type: "VIBE_APPLIED", roomCode: room.roomCode, payload: applied, ts: Date.now() });
  res.json({ ok: true, nowPlayingGame: room.nowPlayingGame, nowPlayingPlatform: room.nowPlayingPlatform, vibe: applied });
});

app.get("/rooms/:roomCode/automation/setup", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  res.json({ ok: true, setup: room.firstTimeSetup, clipProvider: room.clipProvider, defaults: { telemetryMode: true, automationEngine: room.automationEngine, autoLayout: room.autoLayout, momentsLogging: room.momentsLogging, hudMode: room.stats.hudMode, announcerStudio: true, announcerProgram: false, segmentsEngine: room.segmentsEngine, randomMicroSkins: true } });
});

app.post("/rooms/:roomCode/automation/setup", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  room.firstTimeSetup = {
    obsAdded: Boolean(req.body.obsAdded ?? room.firstTimeSetup.obsAdded),
    recordingConfigured: Boolean(req.body.recordingConfigured ?? room.firstTimeSetup.recordingConfigured),
    telemetryConfigured: Boolean(req.body.telemetryConfigured ?? room.firstTimeSetup.telemetryConfigured),
    vibeChosen: Boolean(req.body.vibeChosen ?? room.firstTimeSetup.vibeChosen)
  };
  if (typeof req.body.clipProvider === "string") room.clipProvider = req.body.clipProvider as ClipProvider;
  broadcast(room.roomCode, { type: "SETUP_UPDATED", roomCode: room.roomCode, payload: { setup: room.firstTimeSetup, clipProvider: room.clipProvider }, ts: Date.now() });
  res.json({ ok: true, setup: room.firstTimeSetup, clipProvider: room.clipProvider, defaults: { telemetryMode: true, automationEngine: room.automationEngine, autoLayout: room.autoLayout, momentsLogging: room.momentsLogging, hudMode: room.stats.hudMode, announcerStudio: true, announcerProgram: false, segmentsEngine: room.segmentsEngine, randomMicroSkins: true } });
});

app.post("/rooms/:roomCode/stats", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  room.telemetryStatus = "CONNECTED";
  const participantId = sanitizeText(String(req.body.participantId || "host")) || "host";
  const crew = String(req.body.crew || "A") === "B" ? "B" : "A";
  const delta = req.body.delta && typeof req.body.delta === "object" ? req.body.delta : {};

  if (!room.stats.participants[participantId]) room.stats.participants[participantId] = { ...DEFAULT_PARTICIPANT_STATS };
  const before = room.stats.participants[participantId];
  const after = applyStatsDelta(before, delta);
  room.stats.participants[participantId] = after;

  if ((delta.score ?? 0) !== 0) {
    const previousLead = room.stats.crews.A.momentum >= room.stats.crews.B.momentum ? "A" : "B";
    room.stats.crews[crew].crewScore += Number(delta.score ?? 0);
    room.stats.crews[crew].momentum = Math.max(-100, Math.min(100, room.stats.crews[crew].momentum + Number(delta.score ?? 0)));
    room.stats.crews[crew === "A" ? "B" : "A"].momentum = Math.max(-100, Math.min(100, room.stats.crews[crew === "A" ? "B" : "A"].momentum - Number(delta.score ?? 0)));
    const newLead = room.stats.crews.A.momentum >= room.stats.crews.B.momentum ? "A" : "B";
    if (newLead !== previousLead) {
      addMoment(room, { id: makeToken(8), ts: Date.now(), type: "MOMENTUM_SHIFT", label: "MOMENTUM SWING!", intensity: 4 });
      broadcast(room.roomCode, { type: "MOMENTUM_SHIFT", roomCode: room.roomCode, payload: { leadingCrew: newLead, momentumA: room.stats.crews.A.momentum, momentumB: room.stats.crews.B.momentum }, ts: Date.now() });
    }
  }

  const now = Date.now();
  if (now - (room.statsCooldownByParticipant[participantId] ?? 0) > 1500) {
    room.statsCooldownByParticipant[participantId] = now;
    broadcast(room.roomCode, { type: "STAT_POP", roomCode: room.roomCode, payload: { participantId, label: statPopLabel(delta), durationMs: 900 }, ts: now });
  }

  if (after.streakCount >= 7 || after.streakCount >= 5) {
    broadcast(room.roomCode, { type: "STREAK_UPDATE", roomCode: room.roomCode, payload: { participantId, streakCount: after.streakCount, tier: after.streakCount >= 7 ? "LEGENDARY" : "HIGH" }, ts: now });
  }

  const entries = Object.entries(room.stats.participants).sort((a, b) => (b[1].score + b[1].kills * 2 + b[1].assists) - (a[1].score + a[1].kills * 2 + a[1].assists));
  const mvpLeader = entries[0]?.[0] || "host";
  if (room.stats.crews.A.topPlayerId !== mvpLeader) {
    room.stats.crews.A.topPlayerId = mvpLeader;
    addMoment(room, { id: makeToken(8), ts: now, type: "MVP_LEAD_CHANGE", label: `MVP -> ${mvpLeader}`, participantId: mvpLeader, intensity: 3 });
    broadcast(room.roomCode, { type: "MVP_LEAD_CHANGE", roomCode: room.roomCode, payload: { participantId: mvpLeader }, ts: now });
  }

  addMoment(room, { id: makeToken(8), ts: now, type: "STATS_UPDATE", label: statPopLabel(delta), participantId, intensity: 2, payload: { crew, delta } });
  emitAnnouncer(room, participantId, "STATS_UPDATE", Math.min(5, Math.max(1, Number(delta.kills ?? 0) + Number(delta.objectives ?? 0) + 2)));

  broadcast(room.roomCode, { type: "STATS_UPDATE", roomCode: room.roomCode, payload: { participantId, crew, stats: after }, ts: now });
  broadcast(room.roomCode, { type: "CREW_SCORE_UPDATE", roomCode: room.roomCode, payload: { crews: room.stats.crews }, ts: now });
  res.json({ ok: true, participantId, stats: after, crews: room.stats.crews });
});

app.post("/rooms/:roomCode/hud-mode", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  const mode = ["MINIMAL", "FULL", "SPORTSCAST"].includes(String(req.body.mode)) ? String(req.body.mode) : "MINIMAL";
  room.stats.hudMode = mode as RoomStatsState["hudMode"];
  broadcast(room.roomCode, { type: "HUD_MODE_SET", roomCode: room.roomCode, payload: { mode: room.stats.hudMode }, ts: Date.now() });
  res.json({ ok: true, mode: room.stats.hudMode });
});

app.post("/rooms/:roomCode/export-highlight-pack", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  const payload = {
    timeline: room.moments,
    match: { crewA: room.crewA, crewB: room.crewB, scoreA: room.scoreA, scoreB: room.scoreB, matchStatus: room.matchStatus },
    crew: { crewA: room.crewA, crewB: room.crewB },
    recommendedLayouts: ["grid", "spotlight", "duo"]
  };
  res.json({ ok: true, highlightPack: payload });
});

app.post("/rooms/:roomCode/replay-pip", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  broadcast(room.roomCode, { type: "REPLAY_PIP_TRIGGER", roomCode: room.roomCode, payload: { participantId: req.body.participantId || "host", durationMs: Number(req.body.durationMs || 8000), stamp: "INSTANT REPLAY" }, ts: Date.now() });
  res.json({ ok: true });
});

app.post("/rooms/:roomCode/reconnect-all", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  broadcast(room.roomCode, { type: "RECONNECT_ALL", roomCode: room.roomCode, payload: { at: Date.now() }, ts: Date.now() });
  res.json({ ok: true });
});
app.post("/rooms/:roomCode/regenerate-vdo/:participantId", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  const p = room.participants.find((x) => x.id === req.params.participantId); if (!p) return res.status(404).json({ ok: false });
  p.vdoId = `${p.id}_${makeToken(6)}`;
  broadcast(room.roomCode, { type: "PARTICIPANT_VDO_REGENERATED", roomCode: room.roomCode, payload: { participantId: p.id, vdoId: p.vdoId }, ts: Date.now() });
  res.json({ ok: true, participant: p });
});
app.post("/rooms/:roomCode/audio-focus", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  const participantId = String(req.body.participantId || "host");
  if (!room.participants.some((p) => p.id === participantId)) return res.status(400).json({ ok: false });
  room.audioFocusParticipantId = participantId; room.autoAudioFocus = Boolean(req.body.autoAudioFocus);
  broadcast(room.roomCode, { type: "AUDIO_FOCUS_SET", roomCode: room.roomCode, payload: { participantId, autoAudioFocus: room.autoAudioFocus }, ts: Date.now() });
  res.json({ ok: true, participantId, autoAudioFocus: room.autoAudioFocus });
});
app.post("/rooms/:roomCode/profile/:participantId", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  const p = room.participants.find((x) => x.id === req.params.participantId);
  if (!p) return res.status(404).json({ ok: false });
  const profile = String(req.body.profile || "TACTICAL") as StreamProfile;
  p.profile = profile;
  broadcast(room.roomCode, { type: "PROFILE_SET", roomCode: room.roomCode, payload: { participantId: p.id, profile }, ts: Date.now() });
  res.json({ ok: true, participant: p });
});
app.post("/rooms/:roomCode/replay-highlight", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  broadcast(room.roomCode, { type: "REPLAY_HIGHLIGHT", roomCode: room.roomCode, payload: { momentId: req.body.momentId, durationMs: 6000 }, ts: Date.now() });
  res.json({ ok: true });
});
app.post("/rooms/:roomCode/recap-overlay", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  broadcast(room.roomCode, { type: "RECAP_OVERLAY", roomCode: room.roomCode, payload: { durationMs: 15000 }, ts: Date.now() });
  res.json({ ok: true });
});

app.post("/rooms/:roomCode/end-match", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  room.matchStatus = "ENDED";
  room.stageDirector.auto = true;
  room.stageDirector.lockMode = null;
  room.stageDirector.forceFeatureParticipantId = null;
  room.stageDirector.disableAutoTransitions = false;
  room.stageDirector.pinnedParticipants = []; room.battleMode = false; room.lifecycle = "ENDED";
  const season = activeSeason(); const winner = room.scoreA.scoreTotal >= room.scoreB.scoreTotal ? room.crewA : room.crewB; const loser = winner === room.crewA ? room.crewB : room.crewA;
  for (const [crew, won] of [[winner, true], [loser, false]] as const) {
    let row = season.leaderboard.find((r) => r.crew === crew);
    if (!row) { row = { crew, wins: 0, losses: 0, scoreTotal: 0, level: 1, xp: 0 }; season.leaderboard.push(row); }
    if (won) row.wins += 1; else row.losses += 1;
    row.scoreTotal += won ? room.scoreA.scoreTotal : room.scoreB.scoreTotal;
    row.xp += 100 + Math.floor((won ? room.scoreA.scoreTotal : room.scoreB.scoreTotal) / 10);
    row.level = levelFromXp(row.xp);
  }
  const matchDurationSeconds = Math.max(60, Math.floor(((room.matchStartedAt ? Date.now() - room.matchStartedAt : room.matchDurationMs) || room.matchDurationMs) / 1000));
  const density = room.eventHistory.length / matchDurationSeconds;
  const eventDensityScore = 100 * (1 - Math.exp(-density / 0.8));
  const uniqueInteractions = room.viewerInteractionUnique.size;
  const interactionsPerMin = room.viewerInteractionTotal / Math.max(1, matchDurationSeconds / 60);
  const crowdInteractionScore = Math.min(100, uniqueInteractions * 3 * 0.7 + interactionsPerMin * 0.3);
  const swings = room.swingCount;
  const momentumSwingsScore = swings < 2 ? 20 : swings > 12 ? Math.max(20, 100 - (swings - 12) * 8) : swings <= 8 ? 70 + (swings - 4) * 7 : 85 - (swings - 8) * 6;
  const highlightTypesPossible = 8;
  const highlightTotal = Object.values(room.highlightCountsByType).reduce((sum, value) => sum + value, 0);
  const dominantShare = highlightTotal > 0 ? Math.max(...Object.values(room.highlightCountsByType), 0) / highlightTotal : 0;
  const highlightDiversityScore = Math.max(0, Math.min(100, (Object.keys(room.highlightCountsByType).length / highlightTypesPossible) * 100 - (dominantShare > 0.6 ? 20 : 0)));
  const finalGap = Math.abs(room.scoreA.scoreTotal - room.scoreB.scoreTotal);
  const matchBalanceScore = finalGap === 0 ? 100 : finalGap === 1 ? 85 : finalGap === 2 ? 65 : 40;

  room.broadcastScore = Math.round(
    eventDensityScore * 0.3
    + crowdInteractionScore * 0.25
    + Math.max(0, Math.min(100, momentumSwingsScore)) * 0.2
    + highlightDiversityScore * 0.15
    + matchBalanceScore * 0.1
  );
  room.broadcastScore = Math.max(0, Math.min(100, room.broadcastScore));
  room.broadcastRating = ratingFromScore(room.broadcastScore);
  const winBonus = 1.5;
  const baseRepDelta = room.broadcastScore / 10;
  room.crewReputation.crewA = Number((room.crewReputation.crewA + baseRepDelta + (winner === room.crewA ? winBonus : 0)).toFixed(2));
  room.crewReputation.crewB = Number((room.crewReputation.crewB + baseRepDelta + (winner === room.crewB ? winBonus : 0)).toFixed(2));

  season.updatedAt = Date.now();
  addMoment(room, { id: makeToken(8), ts: Date.now(), type: "MATCH_END", label: `Winner ${winner}`, intensity: 3 });
  broadcast(room.roomCode, { type: "MATCH_ENDED", roomCode: room.roomCode, payload: { winner, broadcastScore: room.broadcastScore, broadcastRating: room.broadcastRating, crewReputation: room.crewReputation }, ts: Date.now() });
  setTimeout(() => {
    const r = roomRegistry.get(room.roomCode);
    if (!r) return;
    r.lifecycle = "ARCHIVED";
    r.eventHistory = [];
    r.moments = [];
    r.telemetryEventsLast15s = [];
    r.highlightCountsByType = {};
    r.viewerInteractionUnique.clear();
    r.viewerInteractionTotal = 0;
    const prefix = `${r.roomCode}:`;
    for (const key of telemetryAbuse.keys()) if (key.startsWith(prefix)) telemetryAbuse.delete(key);
  }, 250);
  res.json({ ok: true, winner, broadcastScore: room.broadcastScore, broadcastRating: room.broadcastRating, crewReputation: room.crewReputation });
});

app.get("/program-auth/:roomCode", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  const token = String(req.query.token || "");
  res.json({ ok: token.length > 0 && token === room.programToken });
});
app.post("/rooms/:roomCode/discord-invite", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  room.discordInviteUrl = sanitizeText(String(req.body.discordInviteUrl || "")).slice(0, 200);
  broadcast(req.params.roomCode, { type: "DISCORD_INVITE_SET", roomCode: req.params.roomCode, payload: { discordInviteUrl: room.discordInviteUrl }, ts: Date.now() });
  res.json({ ok: true, discordInviteUrl: room.discordInviteUrl });
});
app.post("/rooms/:roomCode/battle-mode", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  if (typeof req.body.battleMode !== "boolean") return res.status(400).json({ ok: false });
  room.battleMode = req.body.battleMode; room.matchStatus = room.battleMode ? "LIVE" : "PENDING"; room.matchId = room.battleMode ? room.matchId || `match_${makeToken(8)}` : undefined;
  room.lifecycle = room.battleMode ? "ACTIVE" : "CREATED";
  room.matchStartedAt = room.battleMode ? Date.now() : undefined;
  room.telemetryEventsLast15s = [];
  room.swingCount = 0;
  room.highlightCountsByType = {};
  room.viewerInteractionUnique.clear();
  room.viewerInteractionTotal = 0;
  room.crewA = sanitizeText(String(req.body.crewA || room.crewA)) || "Crew A"; room.crewB = sanitizeText(String(req.body.crewB || room.crewB)) || "Crew B";
  addMoment(room, { id: makeToken(8), ts: Date.now(), type: "MATCH_START", label: `${room.crewA} vs ${room.crewB}` });
  broadcast(req.params.roomCode, { type: "BATTLE_MODE_SET", roomCode: req.params.roomCode, payload: { battleMode: room.battleMode, matchId: room.matchId, crewA: room.crewA, crewB: room.crewB, matchStatus: room.matchStatus }, ts: Date.now() });
  if (room.matchStatus === "LIVE") broadcast(req.params.roomCode, { type: "MATCH_POSTER_INTRO", roomCode: req.params.roomCode, payload: { crewA: room.crewA, crewB: room.crewB, season: activeSeason().name }, ts: Date.now() });
  res.json({ ok: true, battleMode: room.battleMode, matchId: room.matchId });
});

app.get("/roadmap/:monthKey", (req, res) => {
  const monthKey = String(req.params.monthKey || "");
  res.json({ ok: true, monthKey, items: roadmapStore[monthKey] || [] });
});

app.post("/roadmap/:monthKey", (req, res) => {
  const monthKey = String(req.params.monthKey || "");
  const title = sanitizeText(String(req.body.title || "")).trim();
  const description = sanitizeText(String(req.body.description || "")).trim();
  const tags = Array.isArray(req.body.tags) ? req.body.tags.map((x: unknown) => sanitizeText(String(x))).filter(Boolean) : [];
  if (!title || !description) return res.status(400).json({ ok: false, code: ErrorCode.INVALID_REQUEST, message: "title and description required" });
  const item: RoadmapSuggestion = { id: `rm_${makeToken(8)}`, title, description, tags, status: "OPEN", monthKey, score: 0, upvotes: 0, downvotes: 0 };
  roadmapStore[monthKey] = [item, ...(roadmapStore[monthKey] || [])].slice(0, 500);
  saveRoadmap();
  res.json({ ok: true, item });
});

app.post("/roadmap/:monthKey/vote", (req, res) => {
  const monthKey = String(req.params.monthKey || "");
  const id = String(req.body.id || "");
  const value = Number(req.body.value) === -1 ? -1 : 1;
  const voterKey = `${String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown")}:${monthKey}:${id}`;
  const lastVoteAt = roadmapVoteLimiter.get(voterKey) || 0;
  if (Date.now() - lastVoteAt < 2000) return res.status(429).json({ ok: false, code: ErrorCode.RATE_LIMITED, retryAfterMs: 1500 });
  roadmapVoteLimiter.set(voterKey, Date.now());
  const list = roadmapStore[monthKey] || [];
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return res.status(404).json({ ok: false, code: ErrorCode.ROOM_NOT_FOUND, message: "Suggestion not found" });
  const current = list[idx]!;
  const item = { ...current, upvotes: current.upvotes + (value === 1 ? 1 : 0), downvotes: current.downvotes + (value === -1 ? 1 : 0), score: current.score + value };
  list[idx] = item;
  roadmapStore[monthKey] = list;
  saveRoadmap();
  res.json({ ok: true, item });
});
app.post("/discord/webhook/:roomCode", async (req, res) => {
  const roomCode = req.params.roomCode; const last = webhookRate.get(roomCode) ?? 0;
  if (Date.now() - last < 30_000) return res.status(429).json({ ok: false, error: "Rate limited" });
  if (typeof req.body.content !== "string") return res.status(400).json({ ok: false, error: "content required" });
  webhookRate.set(roomCode, Date.now());
  const webhookUrl = String(req.body.webhookUrl || ""); const content = sanitizeText(String(req.body.content || "EzPlay is live!")).slice(0, 300);
  if (req.body.mock || !/^https:\/\//.test(webhookUrl)) {
    broadcast(roomCode, { type: "DISCORD_WEBHOOK_POSTED", roomCode, payload: { mock: true, content }, ts: Date.now() });
    return res.json({ ok: true, mock: true });
  }
  const response = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
  broadcast(roomCode, { type: "DISCORD_WEBHOOK_POSTED", roomCode, payload: { status: response.status }, ts: Date.now() });
  res.json({ ok: response.ok, status: response.status });
});

function ingestTelemetryEvent(room: RoomState, input: { participantId: string; type: StandardGameEvent["type"]; intensity: number; statDelta?: Record<string, number>; matchId?: string; clientTs?: number }) {
  const participantId = sanitizeText(input.participantId || "host") || "host";
  const matchId = input.matchId || room.matchId || "default";
  const rate = checkTelemetryRateLimit(room.roomCode, matchId, participantId);
  if (!rate.allowed) {
    bumpAbuse(room.roomCode, matchId, participantId, "RATE_HIT");
    const sampleKey = telemetryKey(room.roomCode, matchId, participantId);
    const now = Date.now();
    const sample = room.telemetryDropSamples[sampleKey] || { dropCount: 0, firstDropTs: now, lastDropTs: now };
    if (now - sample.firstDropTs > 10_000) {
      sample.firstDropTs = now;
      sample.dropCount = 0;
    }
    sample.dropCount += 1;
    sample.lastDropTs = now;
    room.telemetryDropSamples[sampleKey] = sample;
    if (sample.dropCount === 1 || sample.dropCount % 25 === 0) {
      console.warn(`[telemetry] rate-limited key=${sampleKey} drops=${sample.dropCount}`);
    }
    runtimeMetrics.telemetryDropped += 1;
    return { ok: false as const, code: rate.escalated ? "RATE_LIMIT_ESCALATED" : "RATE_LIMITED", retryAfterMs: rate.retryAfterMs };
  }

  const now = Date.now();
  const ts = Math.max(now, (room.telemetryLastTsByParticipant[participantId] || 0) + 1);
  const safeIntensity = Math.max(0, Math.min(5, Math.floor(Number(input.intensity || 0)))) as 0 | 1 | 2 | 3 | 4 | 5;
  const statDelta = input.statDelta || {};
  const dedupeKey = makeDedupeKey(participantId, input.type, safeIntensity, statDelta, ts);
  const dedupeRoom = telemetryDedupe.get(room.roomCode) || new Map<string, number>();
  const dedupeCutoff = ts - 5_000;
  for (const [k, valueTs] of dedupeRoom.entries()) {
    if (valueTs < dedupeCutoff) dedupeRoom.delete(k);
  }
  if (dedupeRoom.has(dedupeKey)) {
    runtimeMetrics.telemetryDiscarded += 1;
    bumpAbuse(room.roomCode, matchId, participantId, "DEDUPE");
    return { ok: true as const, accepted: false, discarded: true, discardReason: "DEDUPE", eventId: `evt_${makeToken(8)}` };
  }
  dedupeRoom.set(dedupeKey, ts);
  if (dedupeRoom.size > TELEMETRY_DEDUPE_MAX) {
    const entries = [...dedupeRoom.entries()].sort((a, b) => a[1] - b[1]).slice(0, Math.floor(TELEMETRY_DEDUPE_MAX / 4));
    for (const [k] of entries) dedupeRoom.delete(k);
  }
  telemetryDedupe.set(room.roomCode, dedupeRoom);

  if (isLowConfidence(safeIntensity, statDelta)) {
    runtimeMetrics.telemetryDiscarded += 1;
    bumpAbuse(room.roomCode, matchId, participantId, "LOW_CONFIDENCE");
    return { ok: true as const, accepted: false, discarded: true, discardReason: "LOW_CONFIDENCE", eventId: `evt_${makeToken(8)}` };
  }

  const evt: TelemetryNormalizedEvent = {
    eventId: `evt_${makeToken(8)}`,
    roomCode: room.roomCode,
    matchId,
    participantId,
    ts,
    type: input.type,
    intensity: safeIntensity,
    statDelta,
    dedupeKey,
    clientTs: input.clientTs
  };

  room.telemetryLastTsByParticipant[participantId] = ts;
  room.telemetryStatus = "CONNECTED";
  room.telemetryEventsLast15s.push(ts);
  room.telemetryEventsLast15s = room.telemetryEventsLast15s.filter((x) => ts - x <= 15_000);

  const payload: StandardGameEvent = {
    type: evt.type,
    intensity: Math.max(1, evt.intensity) as 1 | 2 | 3 | 4 | 5,
    streamerVdoId: participantId,
    ts,
    meta: { note: "normalized" }
  };

  runtimeMetrics.telemetryAccepted += 1;
  bumpAbuse(room.roomCode, matchId, participantId, "ACCEPTED");
  room.eventHistory.push(payload);
  room.eventHistory = room.eventHistory.slice(-500);
  room.heat[participantId] = Math.min(100, (room.heat[participantId] || 0) + Math.max(1, evt.intensity) * 8);
  room.highlightCountsByType[payload.type] = (room.highlightCountsByType[payload.type] || 0) + 1;
  applyTelemetryMomentum(room, evt);

  addMoment(room, { id: evt.eventId, ts, type: "GAME_EVENT", label: payload.type, participantId, intensity: payload.intensity, payload: evt });
  emitAnnouncer(room, participantId, payload.type, payload.intensity);

  if (room.battleMode && room.matchStatus === "LIVE") {
    room.scoreA.scoreTelemetry += payload.intensity * GAME_EVENT_WEIGHTS[payload.type];
    scoreTotal(room.scoreA); scoreTotal(room.scoreB);
  }

  return { ok: true as const, accepted: true, discarded: false, eventId: evt.eventId, payload };
}

app.post("/event/:roomCode", (req, res) => {
  const room = requireRoom(res, req.params.roomCode);
  if (!room) return;
  if (!req.body || typeof req.body !== "object") return res.status(400).json({ ok: false });
  const body = req.body as Partial<StandardGameEvent> & { statDelta?: Record<string, number>; matchId?: string; participantId?: string; clientTs?: number };
  const participantId = String(body.participantId || body.streamerVdoId || "host");
  const type = (body.type || "HIGHLIGHT") as StandardGameEvent["type"];
  const intensity = Number(body.intensity || 0);
  const result = ingestTelemetryEvent(room, { participantId, type, intensity, statDelta: body.statDelta || {}, matchId: body.matchId, clientTs: body.clientTs });
  if (!result.ok) return res.status(429).json({ ok: false, code: result.code, retryAfterMs: result.retryAfterMs });

  broadcast(room.roomCode, { type: "GAME_EVENT", roomCode: room.roomCode, payload: result.accepted ? result.payload : { type, intensity: Math.max(1, intensity), streamerVdoId: participantId, ts: Date.now() }, ts: Date.now() });
  broadcast(room.roomCode, { type: "HEATMAP_UPDATE", roomCode: room.roomCode, payload: { heat: room.heat }, ts: Date.now() });
  if (room.battleMode && room.matchStatus === "LIVE") {
    broadcast(room.roomCode, { type: "MATCH_SCORE_UPDATE", roomCode: room.roomCode, payload: { scoreA: room.scoreA, scoreB: room.scoreB, status: room.matchStatus }, ts: Date.now() });
  }
  res.json({ ...result });
});

setInterval(() => {
  const loopStart = Date.now();
  if (tickBusy) {
    runtimeMetrics.tickOverruns += 1;
    return;
  }
  tickBusy = true;
  const now = Date.now();
  try {
    // memory prune guard rails
    if (telemetryBuckets.size > ROOM_EPHEMERAL_CAP) {
      for (const key of Array.from(telemetryBuckets.keys()).slice(0, telemetryBuckets.size - ROOM_EPHEMERAL_CAP)) telemetryBuckets.delete(key);
    }
    if (telemetryAbuse.size > ROOM_EPHEMERAL_CAP) {
      for (const key of Array.from(telemetryAbuse.keys()).slice(0, telemetryAbuse.size - ROOM_EPHEMERAL_CAP)) telemetryAbuse.delete(key);
    }
    if (viewerActionBuckets.size > ROOM_EPHEMERAL_CAP) {
      for (const key of Array.from(viewerActionBuckets.keys()).slice(0, viewerActionBuckets.size - ROOM_EPHEMERAL_CAP)) viewerActionBuckets.delete(key);
    }
    if (joinAttemptByIp.size > ROOM_EPHEMERAL_CAP) {
      for (const key of Array.from(joinAttemptByIp.keys()).slice(0, joinAttemptByIp.size - ROOM_EPHEMERAL_CAP)) joinAttemptByIp.delete(key);
    }

    for (const room of roomRegistry.listActive()) {
      for (const id of Object.keys(room.heat)) room.heat[id] = Math.max(0, room.heat[id] - 1);

      if (room.maintenanceState === "DRAINING" && room.maintenanceDrainUntil && now >= room.maintenanceDrainUntil) {
        setMaintenanceState("MAINTENANCE", "Drain window elapsed. Entering maintenance.", 0);
      }

      recalcTelemetryMomentum(room, now);

      room.telemetryEventsLast15s = room.telemetryEventsLast15s.filter((x) => now - x <= 15_000);
      const density = room.telemetryEventsLast15s.length / 15;
      if (density < 0.2) {
        room.announcerRecoveredDensitySince = undefined;
        if (!room.announcerLowDensitySince) room.announcerLowDensitySince = now;
        if (!room.announcerQuietMode && now - room.announcerLowDensitySince >= 45_000) {
          room.announcerQuietMode = true;
          room.announcerQuietSince = now;
        }
      } else {
        room.announcerLowDensitySince = undefined;
        if (room.announcerQuietMode) {
          if (!room.announcerRecoveredDensitySince) room.announcerRecoveredDensitySince = now;
          if ((now - (room.announcerQuietSince || now) >= 20_000) && (now - room.announcerRecoveredDensitySince >= 10_000)) {
            room.announcerQuietMode = false;
            room.announcerQuietSince = undefined;
            room.announcerRecoveredDensitySince = undefined;
          }
        }
      }

      const elapsedMs = room.matchStartedAt ? now - room.matchStartedAt : 0;
      if (room.segmentsEngine && room.matchStatus === "LIVE") {
        const matchTotal = Math.max(room.matchDurationMs, 60_000);
        const progress = elapsedMs / matchTotal;
        const canSwitch = now - room.segmentStartedAt >= 8_000;
        let nextSegment: RoomState["currentSegment"] | null = null;
        if (room.currentSegment === "TIP_OFF" && now - room.segmentStartedAt >= 10_000) nextSegment = "MOMENTUM_SWING";
        if (!nextSegment && room.currentSegment !== "HALFTIME_RECAP" && progress >= 0.5 && elapsedMs >= 60_000 && canSwitch) nextSegment = "HALFTIME_RECAP";
        if (!nextSegment && room.telemetryMomentum.lastSwingAt && now - room.telemetryMomentum.lastSwingAt <= 2_000 && canSwitch && room.currentSegment !== "MOMENTUM_SWING") nextSegment = "MOMENTUM_SWING";
        if (!nextSegment && room.currentSegment !== "CLOSING_HIGHLIGHTS" && canSwitch && (progress >= 0.85 || (progress >= 0.75 && Math.abs(room.scoreA.scoreTotal - room.scoreB.scoreTotal) <= 1))) nextSegment = "CLOSING_HIGHLIGHTS";
        if (nextSegment) {
          room.currentSegment = nextSegment;
          room.segmentStartedAt = now;
          addMoment(room, { id: makeToken(8), ts: now, type: "SEGMENT_SET", label: nextSegment, intensity: 2 });
          broadcast(room.roomCode, { type: "SEGMENT_SET", roomCode: room.roomCode, payload: { segment: nextSegment }, ts: now });
        }
      }

      const wsHealthy = roomSockets.get(room.roomCode)?.size ? true : true;
      const tileStallCount = 0;
      evaluateStage(room, wsHealthy, tileStallCount);

      const statePayload = {
        maintenance: { state: room.maintenanceState, banner: maintenanceWindow.enabled ? maintenanceWindow : null },
        segment: { active: room.currentSegment, startedAt: room.segmentStartedAt, theme: runtimeSegmentTheme(room.currentSegment as any) },
        momentum: {
          teamA: { raw: room.telemetryMomentum.rawA, display: room.telemetryMomentum.displayA },
          teamB: { raw: room.telemetryMomentum.rawB, display: room.telemetryMomentum.displayB },
          delta: room.telemetryMomentum.lastDelta,
          lastSwingAt: room.telemetryMomentum.lastSwingAt
        },
        broadcast: { score: room.broadcastScore, tier: room.broadcastRating },
        announcer: { quietMode: room.announcerQuietMode },
        minigames: { emojiBudget: { max: 120, active: room.emojiPerSecond.count } },
        protection: { mode: protectionMode },
        safemode: { enabled: safeMode.enabled, reason: safeMode.reason || null },
        stage: {
          mode: room.stageMode,
          layout: room.stageLayout,
          context: room.stageContext,
          director: room.stageDirector
        }
      };

      const gateAt = roomStateBroadcastGate.get(room.roomCode) || 0;
      const intervalMs = safeMode.enabled ? ROOM_STATE_INTERVAL_MS * 3 : protectionMode === "DEGRADED" ? ROOM_STATE_INTERVAL_MS * 2 : ROOM_STATE_INTERVAL_MS;
      if (now - gateAt >= intervalMs) {
        const payloadHash = JSON.stringify(statePayload);
        const prevHash = lastRoomStateHash.get(room.roomCode) || "";
        const resyncMs = safeMode.enabled ? ROOM_STATE_RESYNC_MS * 3 : protectionMode === "DEGRADED" ? ROOM_STATE_RESYNC_MS * 2 : ROOM_STATE_RESYNC_MS;
        const isResync = now - (roomStateResyncGate.get(room.roomCode) || 0) >= resyncMs;
        if (isResync || !prevHash) {
          broadcast(room.roomCode, { op: "room.state", roomCode: room.roomCode, matchId: room.matchId || "default", serverTs: now, ok: true, data: statePayload, error: null });
          roomStateResyncGate.set(room.roomCode, now);
          runtimeMetrics.broadcasts += 1;
        } else if (payloadHash !== prevHash) {
          broadcast(room.roomCode, { op: "room.state.delta", roomCode: room.roomCode, matchId: room.matchId || "default", serverTs: now, ok: true, data: statePayload, error: null });
          runtimeMetrics.broadcasts += 1;
        }
        lastRoomStateHash.set(room.roomCode, payloadHash);
        roomStateBroadcastGate.set(room.roomCode, now);
      }

      // legacy compatibility
      if (now - gateAt >= ROOM_STATE_INTERVAL_MS) broadcast(room.roomCode, { type: "room.state", roomCode: room.roomCode, payload: statePayload, ts: now });

      if (room.audioFocusReturnTs && now >= room.audioFocusReturnTs) {
        room.audioFocusParticipantId = room.audioFocusPrev || "host"; room.audioFocusReturnTs = undefined;
        broadcast(room.roomCode, { type: "AUDIO_FOCUS_SET", roomCode: room.roomCode, payload: { participantId: room.audioFocusParticipantId, autoAudioFocus: room.autoAudioFocus }, ts: now });
      }
      if (now - room.lastSpotlightChangeTs > 12_000 && now - room.lastMajorEffectTs > 8_000) {
        const target = room.participants.find((p) => p.role === "GUEST") || room.participants[0];
        room.lastSpotlightChangeTs = now; pushAutomation(room, "spotlight", "rotate spotlight");
        broadcast(room.roomCode, { type: "DIRECTOR_SET_SPOTLIGHT", roomCode: room.roomCode, payload: { participantId: target.id, durationMs: 3000 }, ts: now });
      }
      if (now - room.lastLayoutChangeTs > 20_000) {
        room.lastLayoutChangeTs = now; pushAutomation(room, "layout", "layout cooldown elapsed");
        broadcast(room.roomCode, { type: "DIRECTOR_SET_LAYOUT", roomCode: room.roomCode, payload: { mode: "AUTO" }, ts: now });
      }
      for (const [viewerId, lastSeen] of room.viewerLastSeen) {
        if (now - lastSeen > 30_000) { room.viewers.delete(viewerId); room.viewerLastSeen.delete(viewerId); }
      }
      if (room.viewerInteractionUnique.size > ROOM_EPHEMERAL_CAP) {
        for (const key of Array.from(room.viewerInteractionUnique).slice(0, room.viewerInteractionUnique.size - ROOM_EPHEMERAL_CAP)) {
          room.viewerInteractionUnique.delete(key);
        }
      }
    }
  } finally {
    const loopMs = Date.now() - loopStart;
    runtimeMetrics.tickMs.push(loopMs);
    runtimeMetrics.tickMs = runtimeMetrics.tickMs.slice(-300);
    const p95 = runtimeMetrics.tickMs.length ? [...runtimeMetrics.tickMs].sort((a,b)=>a-b)[Math.floor(runtimeMetrics.tickMs.length*0.95)] : 0;
    protectionMode = p95 > runtimeConfig.tickP95WarnMs || runtimeMetrics.tickOverruns > runtimeConfig.tickOverrunWarn ? "DEGRADED" : "NORMAL";
    tickBusy = false;
  }
}, 250);

wss.on("connection", (socket, req) => {
  const url = new URL(req.url || "/", "http://localhost");
  const roomCode = normalizeRoomCode(url.searchParams.get("roomCode") || "");
  const role = (url.searchParams.get("role") || "host").toLowerCase();
  if (!roomCode) return socket.close();
  if (maintenanceWindow.state === "MAINTENANCE") {
    socket.send(JSON.stringify({ op: "error", ok: false, error: { code: ErrorCode.MAINTENANCE, message: "EzPlay is in maintenance. Please retry shortly." }, serverTs: Date.now() }));
    return socket.close();
  }

  const room = getRoom(roomCode);
  if (!room) {
    socket.send(JSON.stringify({ op: "error", ok: false, roomCode, error: { code: ErrorCode.ROOM_NOT_FOUND, message: "Room not found. Ask host to create it first." }, serverTs: Date.now() }));
    return socket.close();
  }
  if (!roomSockets.has(roomCode)) roomSockets.set(roomCode, new Set());
  roomSockets.get(roomCode)!.add(socket as WebSocket);

  if (role === "guest") {
    const guestId = url.searchParams.get("guestId") || `guest_${makeToken(6)}`;
    if (!room.participants.some((p) => p.id === guestId) && room.participants.length >= MAX_PARTICIPANTS_PER_ROOM) {
      socket.send(JSON.stringify({ op: "error", ok: false, error: { code: ErrorCode.ROOM_FULL, message: "Room is full." }, serverTs: Date.now() }));
      return socket.close();
    }
    if (!room.participants.some((p) => p.id === guestId)) room.participants.push({ id: guestId, name: guestId, role: "GUEST", vdoId: guestId, profile: "TACTICAL" });
    broadcast(roomCode, { type: "PRESENCE_JOIN", roomCode, payload: { participantId: guestId, message: room.familyMode ? `${guestId} joined` : `${guestId} pulled up` }, ts: Date.now() });
  }

  socket.send(JSON.stringify({ type: "WELCOME", roomCode, payload: { connected: true, room }, ts: Date.now() }));

  socket.on("message", (data) => {
    try {
      const parsed = JSON.parse(String(data)) as WsOpEnvelope;
      if (parsed.op) {
        const op = String(parsed.op);
        const reqId = parsed.reqId;
        const matchId = String(parsed.matchId || room.matchId || "default");
        const participantId = String(parsed.participantId || "host");
        const dataObj = parsed.data && typeof parsed.data === "object" ? parsed.data : {};

        if (op === "joinRoom") {
          const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown");
          const key = `${ip}:${roomCode}`;
          const now = Date.now();
          const record = joinAttemptByIp.get(key) || { count: 0, windowStartAt: now };
          if (now - record.windowStartAt > 10_000) {
            record.windowStartAt = now;
            record.count = 0;
          }
          record.count += 1;
          joinAttemptByIp.set(key, record);
          if (record.count > 20) {
            wsReply(socket as WebSocket, roomCode, matchId, reqId, "error", false, null, {
              code: ErrorCode.RATE_LIMITED,
              message: "Join attempts are temporarily throttled.",
              retryAfterMs: 800
            });
            return;
          }
        }

        if (maintenanceWindow.state === "MAINTENANCE") {
          wsReply(socket as WebSocket, roomCode, matchId, reqId, "error", false, null, { code: ErrorCode.MAINTENANCE, message: "EzPlay is in maintenance. Please retry shortly." });
          return;
        }
        if (maintenanceWindow.state === "DRAINING" && op === "joinRoom") {
          wsReply(socket as WebSocket, roomCode, matchId, reqId, "error", false, null, { code: ErrorCode.DRAINING, message: "Server entering maintenance. New joins disabled." });
          return;
        }

        if (op === "telemetry.event") {
          const type = String((dataObj as any).type || "HIGHLIGHT") as StandardGameEvent["type"];
          const intensity = Number((dataObj as any).intensity || 0);
          const statDelta = (dataObj as any).statDelta && typeof (dataObj as any).statDelta === "object" ? (dataObj as any).statDelta as Record<string, number> : {};
          const result = ingestTelemetryEvent(room, { participantId, type, intensity, statDelta, matchId, clientTs: parsed.clientTs });
          if (!result.ok) {
            wsReply(socket as WebSocket, roomCode, matchId, reqId, "error", false, null, { code: result.code === "RATE_LIMIT_ESCALATED" ? ErrorCode.RATE_LIMIT_ESCALATED : ErrorCode.RATE_LIMITED, message: result.code === "RATE_LIMIT_ESCALATED" ? "Telemetry temporarily muted due to repeated abuse." : "Too many telemetry events.", retryAfterMs: result.retryAfterMs, debug: { limit: TELEMETRY_MAX_PER_SEC, windowMs: 1000 } });
            return;
          }
          wsReply(socket as WebSocket, roomCode, matchId, reqId, "telemetry.ack", true, { accepted: result.accepted, eventId: result.eventId, discarded: result.discarded, discardReason: (result as any).discardReason || null }, null);
          return;
        }

        if (op === "helper.query") {
          const reply = helperResponseFromQuery({ text: String((dataObj as any).text || ""), currentPage: String((dataObj as any).currentPage || ""), uiFlags: ((dataObj as any).uiFlags || {}) as Record<string, unknown>, lastErrorCode: String((dataObj as any).lastErrorCode || "") });
          wsReply(socket as WebSocket, roomCode, matchId, reqId, "helper.reply", true, reply, null);
          return;
        }
      }

      const type = String((parsed as any).type || "CHAT_MESSAGE");
      const payload = (parsed as any).payload && typeof (parsed as any).payload === "object" ? (parsed as any).payload : {};
      const viewerId = String((payload as any).viewerId || "");

      if (safeMode.enabled && ["VIEWER_REACT", "CROWD_TAP", "POWERUP_USE"].includes(type)) {
        socket.send(JSON.stringify({ op: "error", ok: false, error: { code: ErrorCode.SAFEMODE_ACTIVE, message: `Safe Mode enabled: ${safeMode.reason || "Ops safety"}` }, serverTs: Date.now() }));
        return;
      }

      if (["VIEWER_REACT", "VIEWER_VOTE", "CROWD_TAP", "POWERUP_USE"].includes(type) && viewerId) {
        const bucketKey = `${roomCode}:${viewerId}:${type}`;
        const allowed = type === "VIEWER_REACT"
          ? applyViewerBucket(bucketKey, 6, 6)
          : type === "POWERUP_USE"
            ? applyViewerBucket(bucketKey, 2, 0.2)
            : applyViewerBucket(bucketKey, 3, 2);
        if (!allowed) return;
        room.viewerActionTs.set(viewerId, Date.now()); room.viewerLastSeen.set(viewerId, Date.now());
        room.viewerInteractionUnique.add(viewerId);
        room.viewerInteractionTotal += 1;
        if (room.viewers.size < 200) room.viewers.add(viewerId);
      }

      if (type === "POWERUP_USE") {
        const now = Date.now();
        if (room.vibeProfile === "ARENA" && (payload as any).safeMode) return;
        if (now - room.lastGlobalPowerUpTs < 8_000) return;
        const lastByViewer = room.viewerPowerUpTs.get(viewerId) ?? 0;
        if (now - lastByViewer < 30_000) return;
        room.lastGlobalPowerUpTs = now;
        room.viewerPowerUpTs.set(viewerId, now);
      }
      if (type === "VIEWER_JOIN" && viewerId) { room.viewers.add(viewerId); room.viewerLastSeen.set(viewerId, Date.now()); }

      if (type === "CROWD_TAP") {
        room.crowdTaps += 1;
        if (room.crowdTaps % 8 === 0) {
          broadcast(roomCode, { type: "HYPE_BUMP", roomCode, payload: { delta: 1 }, ts: Date.now() });
          if (room.battleMode && room.matchStatus === "LIVE") { room.scoreA.scoreHype += 1; scoreTotal(room.scoreA); broadcast(roomCode, { type: "MATCH_SCORE_UPDATE", roomCode, payload: { scoreA: room.scoreA, scoreB: room.scoreB, status: room.matchStatus }, ts: Date.now() }); }
        }
      }

      if (type === "VIEWER_VOTE") {
        const participantId = sanitizeText(String((payload as any).participantId || "host"));
        room.votes[participantId] = (room.votes[participantId] || 0) + 1;
        const top3 = Object.entries(room.votes).sort((a, b) => b[1] - a[1]).slice(0, 3);
        broadcast(roomCode, { type: "VIEWER_VOTE_RESULTS", roomCode, payload: { top3 }, ts: Date.now() });
      }

      if (type === "VIEWER_REACT") {
        const sec = Math.floor(Date.now() / 1000);
        if (room.emojiPerSecond.sec !== sec) room.emojiPerSecond = { sec, count: 0 };
        if (room.emojiPerSecond.count >= 12) return;
        room.emojiPerSecond.count += 1;
        const safe = ["🔥", "✨", "👏", "😤"]; const incoming = String((payload as any).emoji || "🔥");
        (payload as any).emoji = room.familyMode && !safe.includes(incoming) ? "✨" : incoming;
      }

      if (type === "CLIP_MARK") {
        const reason = sanitizeText(String((payload as any).reason || "Manual clip"));
        addMoment(room, { id: makeToken(8), ts: Date.now(), type: "CLIP_MARK", label: reason, payload });
        broadcast(roomCode, { type: "CLIP_MARK", roomCode, payload: { reason, clipProvider: room.clipProvider }, ts: Date.now() });
        if (room.clipProvider === "EXTERNAL_HOTKEY") {
          broadcast(roomCode, { type: "CLIP_PROMPT", roomCode, payload: { message: "CLIP NOW: Press your recorder hotkey" }, ts: Date.now() });
        }
      }

      if (type === "CHAT_MESSAGE") {
        (payload as any).text = sanitizeText(String((payload as any).text || ""));
      }

      if (type === "SETTINGS_UPDATE") room.familyMode = Boolean((payload as any).familyMode);
      if (type === "WATCH_PAUSE") broadcast(roomCode, { type: "WATCH_PAUSED_BY", roomCode, payload: { by: (payload as any).by || "host" }, ts: Date.now() });

      broadcast(roomCode, { type, roomCode, payload, ts: Date.now() });
    } catch {
      socket.send(JSON.stringify({ type: "ERROR", roomCode, payload: { message: "Invalid JSON" }, ts: Date.now() }));
    }
  });

  socket.on("close", () => { roomSockets.get(roomCode)?.delete(socket as WebSocket); });
});

const port = Number(process.env.WS_PORT || 4001);
server.listen(port, () => console.log(`ws server on :${port}`));
