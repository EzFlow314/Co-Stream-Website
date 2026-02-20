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
  stage: {
    mode: StageMode;
    transitionMs: number;
    freezeTransitions: boolean;
    crowdMeterVisible: boolean;
    momentumBorder: boolean;
    trimUi: boolean;
    featureTile: boolean;
    activeSpeakerWeight: number;
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
    stage: {
      mode: "LOBBY",
      transitionMs: 600,
      freezeTransitions: false,
      crowdMeterVisible: false,
      momentumBorder: false,
      trimUi: false,
      featureTile: false,
      activeSpeakerWeight: 1
    },
    realtime: { status: "OFFLINE", lastSeenAt: null }
  };
}

export function runtimeSegmentTheme(segment: Segment): RuntimeRoomState["segment"]["theme"] {
  if (segment === "TIP_OFF") return { overlayMode: "intro", introAnimation: true, crewColorSplash: true, showMVPPanel: false, tensionPulse: false, crowdMeterEmphasis: 1 };
  if (segment === "HALFTIME_RECAP") return { overlayMode: "comparison", introAnimation: false, crewColorSplash: false, showMVPPanel: true, tensionPulse: false, crowdMeterEmphasis: 1 };
  if (segment === "CLOSING_HIGHLIGHTS") return { overlayMode: "tension", introAnimation: false, crewColorSplash: false, showMVPPanel: false, tensionPulse: true, crowdMeterEmphasis: 1.3 };
  return { overlayMode: "live", introAnimation: false, crewColorSplash: false, showMVPPanel: false, tensionPulse: false, crowdMeterEmphasis: 1 };
}


export type StageMode = "LOBBY" | "ACTIVE" | "FEATURE" | "CLUTCH" | "RECOVERY";

export type StageInput = {
  segment: Segment;
  momentumScore: number;
  screenShareActive: boolean;
  activeSpeakerIntensity: number;
  eventDensity: number;
  closenessOfMatch: number;
  safemode: boolean;
  wsHealthy: boolean;
  tileStallCount: number;
  directorLockMode?: StageMode | null;
  forceFeature?: boolean;
};

export type StageLayout = {
  mode: StageMode;
  reasons: string[];
  transitionMs: number;
  freezeTransitions: boolean;
  crowdMeterVisible: boolean;
  momentumBorder: boolean;
  trimUi: boolean;
  featureTile: boolean;
  activeSpeakerWeight: number;
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}

export function computeStageLayout(input: StageInput): StageLayout {
  if (input.directorLockMode) {
    return {
      mode: input.directorLockMode,
      reasons: ["director_lock"],
      transitionMs: input.directorLockMode === "CLUTCH" ? 380 : 520,
      freezeTransitions: input.directorLockMode === "RECOVERY",
      crowdMeterVisible: input.directorLockMode !== "LOBBY",
      momentumBorder: input.directorLockMode === "ACTIVE" || input.directorLockMode === "CLUTCH",
      trimUi: input.directorLockMode === "CLUTCH" || input.directorLockMode === "RECOVERY",
      featureTile: input.directorLockMode === "FEATURE" || Boolean(input.forceFeature),
      activeSpeakerWeight: input.directorLockMode === "ACTIVE" ? 1.15 : input.directorLockMode === "CLUTCH" ? 1.22 : 1
    };
  }

  const reasons: string[] = [];
  const eventDensity = clamp01(input.eventDensity);
  const activeSpeaker = clamp01(input.activeSpeakerIntensity);
  const closeness = clamp01(input.closenessOfMatch);
  const momentum = clamp01(input.momentumScore);

  if (input.safemode || !input.wsHealthy || input.tileStallCount > 0) {
    if (input.safemode) reasons.push("safemode");
    if (!input.wsHealthy) reasons.push("ws_unhealthy");
    if (input.tileStallCount > 0) reasons.push("tile_stall");
    return {
      mode: "RECOVERY",
      reasons,
      transitionMs: 0,
      freezeTransitions: true,
      crowdMeterVisible: false,
      momentumBorder: false,
      trimUi: true,
      featureTile: false,
      activeSpeakerWeight: 1
    };
  }

  if (input.forceFeature || input.screenShareActive) {
    reasons.push(input.forceFeature ? "director_feature" : "screen_share_active");
    return {
      mode: "FEATURE",
      reasons,
      transitionMs: 450,
      freezeTransitions: false,
      crowdMeterVisible: true,
      momentumBorder: true,
      trimUi: false,
      featureTile: true,
      activeSpeakerWeight: 1.12
    };
  }

  const clutch = (input.segment === "CLOSING_HIGHLIGHTS" && closeness >= 0.8) || momentum >= 0.86;
  if (clutch) {
    reasons.push(input.segment === "CLOSING_HIGHLIGHTS" ? "closing_segment" : "momentum_spike");
    return {
      mode: "CLUTCH",
      reasons,
      transitionMs: 350,
      freezeTransitions: false,
      crowdMeterVisible: true,
      momentumBorder: true,
      trimUi: true,
      featureTile: false,
      activeSpeakerWeight: 1.2
    };
  }

  if (eventDensity >= 0.45 || activeSpeaker >= 0.55 || momentum >= 0.55) {
    reasons.push("activity_rising");
    return {
      mode: "ACTIVE",
      reasons,
      transitionMs: 520,
      freezeTransitions: false,
      crowdMeterVisible: true,
      momentumBorder: true,
      trimUi: false,
      featureTile: false,
      activeSpeakerWeight: 1.1
    };
  }

  reasons.push("low_density_tip_off");
  return {
    mode: "LOBBY",
    reasons,
    transitionMs: 600,
    freezeTransitions: false,
    crowdMeterVisible: false,
    momentumBorder: false,
    trimUi: false,
    featureTile: false,
    activeSpeakerWeight: 1
  };
}

export type RoomLifecycle = "CREATED" | "ACTIVE" | "ENDED" | "ARCHIVED";
