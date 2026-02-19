export type DebugLog = { level: "info" | "warn" | "error"; message: string; ts: number };

const logs: DebugLog[] = [];

export function pushLog(level: DebugLog["level"], message: string) {
  logs.push({ level, message, ts: Date.now() });
  if (logs.length > 200) logs.shift();
}

export function getLogs() {
  return [...logs].reverse();
}
