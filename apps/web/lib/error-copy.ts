import { ErrorCode } from "@ezplay/contracts";

const COPY: Record<ErrorCode, { title: string; action: "RECONNECT_WS" | "REFRESH_ROOM_STATE" | "REGEN_VDOID" | "RUN_DIAGNOSTICS" | null }> = {
  [ErrorCode.WS_OFFLINE]: { title: "Realtime service is offline.", action: "RECONNECT_WS" },
  [ErrorCode.WS_DISCONNECTED]: { title: "Realtime connection dropped.", action: "RECONNECT_WS" },
  [ErrorCode.ROOM_NOT_FOUND]: { title: "Room was not found.", action: "REFRESH_ROOM_STATE" },
  [ErrorCode.DRAINING]: { title: "Server is draining for maintenance.", action: "RUN_DIAGNOSTICS" },
  [ErrorCode.MAINTENANCE]: { title: "EzPlay is in maintenance.", action: "RUN_DIAGNOSTICS" },
  [ErrorCode.RATE_LIMITED]: { title: "Actions are temporarily rate-limited.", action: "RUN_DIAGNOSTICS" },
  [ErrorCode.RATE_LIMIT_ESCALATED]: { title: "Telemetry muted briefly due to spam protection.", action: "RUN_DIAGNOSTICS" },
  [ErrorCode.EVENT_DISCARDED_LOW_CONFIDENCE]: { title: "Event ignored due to low confidence.", action: null },
  [ErrorCode.EVENT_DISCARDED_DEDUPE]: { title: "Duplicate event ignored.", action: null },
  [ErrorCode.VDOID_EXPIRED]: { title: "Video token expired.", action: "REGEN_VDOID" },
  [ErrorCode.AGE_GATE_REQUIRED]: { title: "Age verification is required.", action: "RUN_DIAGNOSTICS" },
  [ErrorCode.INVALID_REQUEST]: { title: "Invalid request.", action: "RUN_DIAGNOSTICS" },
  [ErrorCode.ROOM_FULL]: { title: "Room is currently full.", action: "REFRESH_ROOM_STATE" },
  [ErrorCode.ROOM_CAP_REACHED]: { title: "Room capacity reached. Retry shortly.", action: "REFRESH_ROOM_STATE" },
  [ErrorCode.NODE_UNAVAILABLE]: { title: "Assigned realtime node is unavailable.", action: "RECONNECT_WS" },
  [ErrorCode.ROOM_NODE_MISMATCH]: { title: "Request routed to the wrong node.", action: "REFRESH_ROOM_STATE" },
  [ErrorCode.SAFEMODE_ACTIVE]: { title: "Safe Mode is active. Some effects are paused.", action: "RUN_DIAGNOSTICS" }
};

export function errorCopy(code: string | null | undefined) {
  if (!code) return { title: "Unknown error.", action: "RUN_DIAGNOSTICS" as const };
  return COPY[code as ErrorCode] || { title: "Unknown error.", action: "RUN_DIAGNOSTICS" as const };
}
