export type FeedbackContextInput = Partial<{
  roomCode: string;
  nodeId: string;
  mode: string;
  protectionMode: string;
  safemode: boolean;
  tickP95: number;
  broadcastHz: number;
  lastErrorCodes: string[];
  route: string;
  userAgent: string;
}>;

export function buildFeedbackContext(input: FeedbackContextInput) {
  return {
    roomCode: input.roomCode || "unknown",
    nodeId: input.nodeId || "unknown",
    mode: input.mode || "unknown",
    protectionMode: input.protectionMode || "unknown",
    safemode: Boolean(input.safemode),
    tickP95: Number(input.tickP95 || 0),
    broadcastHz: Number(input.broadcastHz || 0),
    lastErrorCodes: (input.lastErrorCodes || []).slice(-3),
    route: input.route || "unknown",
    userAgent: input.userAgent || ""
  };
}
