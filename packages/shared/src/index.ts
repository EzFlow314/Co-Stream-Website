export * from "./vdoUrl";
export * from "./vibeDNA";
export * from "./gameStats";
export * from "./announcerEngine";

export type StandardGameEventType =
  | "HEADSHOT"
  | "KILL"
  | "SCORE"
  | "GOAL"
  | "ASSIST"
  | "OBJECTIVE"
  | "CLUTCH"
  | "STREAK"
  | "WIN"
  | "LOSS"
  | "HIGHLIGHT";

export type StandardGameEvent = {
  type: StandardGameEventType;
  intensity: 1 | 2 | 3 | 4 | 5;
  streamerVdoId: string;
  ts: number;
  meta?: {
    weapon?: string;
    points?: number;
    map?: string;
    note?: string;
  };
};

export type WsEnvelope<T = unknown> = {
  type: string;
  roomCode: string;
  payload: T;
  ts: number;
};

export const FAMILY_SAFE_CALLOUTS = ["NICE!", "WOW!", "CLUTCH!", "AMAZING!"];
export const REGULAR_CALLOUTS = ["TOO CLEAN", "COOKIN'", "NO WAY", "CLUTCH!", "DIFFERENT"];

export const GAME_EVENT_WEIGHTS: Record<StandardGameEventType, number> = {
  HEADSHOT: 5,
  KILL: 3,
  SCORE: 4,
  GOAL: 4,
  ASSIST: 2,
  OBJECTIVE: 3,
  CLUTCH: 5,
  STREAK: 4,
  WIN: 8,
  LOSS: 0,
  HIGHLIGHT: 3
};

export function sanitizeText(input: string): string {
  return input.replace(/[<>]/g, "").trim().slice(0, 300);
}

export function isYoutubeUrl(url: string): boolean {
  return /(youtube\.com|youtu\.be)/i.test(url);
}

export function makeRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export function makeToken(length = 24): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}
