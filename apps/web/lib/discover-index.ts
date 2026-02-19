export type ActiveRoomIndexRow = {
  roomCode: string;
  crewA?: string;
  crewB?: string;
  nowPlayingGame?: string;
  currentSegment?: string;
  crowdTaps?: number;
  nodeId?: string;
};

export function mergeActiveIndexes(list: ActiveRoomIndexRow[][]): ActiveRoomIndexRow[] {
  const merged = new Map<string, ActiveRoomIndexRow>();
  for (const rows of list) {
    for (const row of rows) {
      const existing = merged.get(row.roomCode);
      if (!existing || (row.crowdTaps || 0) > (existing.crowdTaps || 0)) merged.set(row.roomCode, row);
    }
  }
  return [...merged.values()].sort((a, b) => (b.crowdTaps || 0) - (a.crowdTaps || 0));
}
