export type HudMode = "MINIMAL" | "FULL" | "SPORTSCAST";

export type ParticipantStats = {
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  streakCount: number;
  objectives: number;
  lastEvent?: string;
};

export type CrewStats = {
  crewScore: number;
  momentum: number;
  topPlayerId?: string;
};

export type RoomStatsState = {
  participants: Record<string, ParticipantStats>;
  crews: {
    A: CrewStats;
    B: CrewStats;
  };
  hudMode: HudMode;
};

export type StatsUpdatePayload = {
  participantId: string;
  crew?: "A" | "B";
  delta?: Partial<ParticipantStats>;
};

export const DEFAULT_PARTICIPANT_STATS: ParticipantStats = {
  kills: 0,
  deaths: 0,
  assists: 0,
  score: 0,
  streakCount: 0,
  objectives: 0
};

export function createEmptyRoomStats(): RoomStatsState {
  return {
    participants: {},
    crews: {
      A: { crewScore: 0, momentum: 0 },
      B: { crewScore: 0, momentum: 0 }
    },
    hudMode: "MINIMAL"
  };
}

export function applyStatsDelta(current: ParticipantStats, delta: Partial<ParticipantStats>): ParticipantStats {
  return {
    kills: current.kills + (delta.kills ?? 0),
    deaths: current.deaths + (delta.deaths ?? 0),
    assists: current.assists + (delta.assists ?? 0),
    score: current.score + (delta.score ?? 0),
    streakCount: Math.max(0, delta.streakCount ?? current.streakCount),
    objectives: current.objectives + (delta.objectives ?? 0),
    lastEvent: delta.lastEvent ?? current.lastEvent
  };
}
