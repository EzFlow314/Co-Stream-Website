export enum ErrorCode {
  WS_OFFLINE = "WS_OFFLINE",
  WS_DISCONNECTED = "WS_DISCONNECTED",
  ROOM_NOT_FOUND = "ROOM_NOT_FOUND",
  DRAINING = "DRAINING",
  MAINTENANCE = "MAINTENANCE",
  RATE_LIMITED = "RATE_LIMITED",
  RATE_LIMIT_ESCALATED = "RATE_LIMIT_ESCALATED",
  EVENT_DISCARDED_LOW_CONFIDENCE = "EVENT_DISCARDED_LOW_CONFIDENCE",
  EVENT_DISCARDED_DEDUPE = "EVENT_DISCARDED_DEDUPE",
  VDOID_EXPIRED = "VDOID_EXPIRED",
  AGE_GATE_REQUIRED = "AGE_GATE_REQUIRED",
  INVALID_REQUEST = "INVALID_REQUEST",
  ROOM_FULL = "ROOM_FULL",
  ROOM_CAP_REACHED = "ROOM_CAP_REACHED",
  NODE_UNAVAILABLE = "NODE_UNAVAILABLE",
  ROOM_NODE_MISMATCH = "ROOM_NODE_MISMATCH",
  SAFEMODE_ACTIVE = "SAFEMODE_ACTIVE",
}

export type MaintenanceState = "ACTIVE" | "DRAINING" | "MAINTENANCE";
export type Segment = "TIP_OFF" | "MOMENTUM_SWING" | "HALFTIME_RECAP" | "CLOSING_HIGHLIGHTS";
export type AnnouncerTier = "LOW" | "MID" | "HIGH" | "LEGENDARY";

export type WsEnvelope<T = unknown> = {
  op: string;
  reqId?: string | null;
  roomCode?: string;
  matchId?: string;
  serverTs: number;
  ok: boolean;
  data: T | null;
  error: null | {
    code: ErrorCode;
    message: string;
    retryAfterMs?: number;
    debug?: Record<string, unknown>;
  };
};

export type RuntimeRoomState = {
  roomCode: string;
  maintenance: {
    state: MaintenanceState;
    banner: string | null;
    etaSeconds: number | null;
  };
  segment: {
    active: Segment;
    startedAt: number;
    theme: {
      overlayMode: "intro" | "comparison" | "tension" | "live";
      introAnimation: boolean;
      crewColorSplash: boolean;
      showMVPPanel: boolean;
      tensionPulse: boolean;
      crowdMeterEmphasis: number;
    };
  };
  momentum: {
    teamA: { raw: number; display: number };
    teamB: { raw: number; display: number };
    delta: number;
    lastSwingAt: number;
  };
  broadcast: {
    score: number;
    tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "LEGENDARY";
  };
  announcer: {
    quietMode: boolean;
    lastTier: AnnouncerTier;
  };
  minigames: {
    emojiBudget: { max: number; active: number };
  };
  realtime: {
    status: "ONLINE" | "OFFLINE";
    lastSeenAt: number | null;
  };
};

export function createOfflineRuntimeRoomState(roomCode: string): RuntimeRoomState {
  return {
    roomCode,
    maintenance: { state: "ACTIVE", banner: null, etaSeconds: null },
    segment: {
      active: "TIP_OFF",
      startedAt: 0,
      theme: {
        overlayMode: "live",
        introAnimation: false,
        crewColorSplash: false,
        showMVPPanel: false,
        tensionPulse: false,
        crowdMeterEmphasis: 1
      }
    },
    momentum: { teamA: { raw: 0, display: 0 }, teamB: { raw: 0, display: 0 }, delta: 0, lastSwingAt: 0 },
    broadcast: { score: 0, tier: "BRONZE" },
    announcer: { quietMode: false, lastTier: "LOW" },
    minigames: { emojiBudget: { max: 120, active: 0 } },
    realtime: { status: "OFFLINE", lastSeenAt: null }
  };
}

export function runtimeSegmentTheme(segment: Segment): RuntimeRoomState["segment"]["theme"] {
  if (segment === "TIP_OFF") return { overlayMode: "intro", introAnimation: true, crewColorSplash: true, showMVPPanel: false, tensionPulse: false, crowdMeterEmphasis: 1 };
  if (segment === "HALFTIME_RECAP") return { overlayMode: "comparison", introAnimation: false, crewColorSplash: false, showMVPPanel: true, tensionPulse: false, crowdMeterEmphasis: 1 };
  if (segment === "CLOSING_HIGHLIGHTS") return { overlayMode: "tension", introAnimation: false, crewColorSplash: false, showMVPPanel: false, tensionPulse: true, crowdMeterEmphasis: 1.3 };
  return { overlayMode: "live", introAnimation: false, crewColorSplash: false, showMVPPanel: false, tensionPulse: false, crowdMeterEmphasis: 1 };
}


export type RoomLifecycle = "CREATED" | "ACTIVE" | "ENDED" | "ARCHIVED";
