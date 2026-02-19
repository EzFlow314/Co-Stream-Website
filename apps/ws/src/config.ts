export type RuntimeMode = "dev" | "alpha" | "prod";

export type RuntimeConfig = {
  mode: RuntimeMode;
  maxActiveRooms: number;
  maxParticipantsPerRoom: number;
  tickP95WarnMs: number;
  tickOverrunWarn: number;
  roomStateHz: number;
  roomStateResyncMs: number;
  logSampleRate: number;
};

const PRESETS: Record<RuntimeMode, Omit<RuntimeConfig, "mode">> = {
  dev: {
    maxActiveRooms: 500,
    maxParticipantsPerRoom: 20,
    tickP95WarnMs: 80,
    tickOverrunWarn: 10,
    roomStateHz: 8,
    roomStateResyncMs: 5000,
    logSampleRate: 0.2
  },
  alpha: {
    maxActiveRooms: 120,
    maxParticipantsPerRoom: 16,
    tickP95WarnMs: 60,
    tickOverrunWarn: 6,
    roomStateHz: 6,
    roomStateResyncMs: 7000,
    logSampleRate: 0.35
  },
  prod: {
    maxActiveRooms: 800,
    maxParticipantsPerRoom: 24,
    tickP95WarnMs: 90,
    tickOverrunWarn: 12,
    roomStateHz: 8,
    roomStateResyncMs: 5000,
    logSampleRate: 0.1
  }
};

function numOverride(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const modeRaw = String(env.MODE || env.EZPLAY_MODE || "dev").toLowerCase();
  const mode: RuntimeMode = modeRaw === "alpha" || modeRaw === "prod" ? modeRaw : "dev";
  const preset = PRESETS[mode];
  return {
    mode,
    maxActiveRooms: numOverride(env.MAX_ACTIVE_ROOMS, preset.maxActiveRooms),
    maxParticipantsPerRoom: numOverride(env.MAX_PARTICIPANTS_PER_ROOM, preset.maxParticipantsPerRoom),
    tickP95WarnMs: numOverride(env.TICK_P95_WARN_MS, preset.tickP95WarnMs),
    tickOverrunWarn: numOverride(env.TICK_OVERRUN_WARN, preset.tickOverrunWarn),
    roomStateHz: numOverride(env.ROOM_STATE_HZ, preset.roomStateHz),
    roomStateResyncMs: numOverride(env.ROOM_STATE_RESYNC_MS, preset.roomStateResyncMs),
    logSampleRate: numOverride(env.LOG_SAMPLE_RATE, preset.logSampleRate)
  };
}
