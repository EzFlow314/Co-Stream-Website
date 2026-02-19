export type RegistryStats = {
  activeRooms: number;
  maxRooms: number;
};

export interface RoomRegistry<T extends { roomCode: string; lifecycle: string }> {
  get(roomCode: string): T | undefined;
  create(roomCode: string, factory: (roomCode: string) => T): { ok: true; room: T } | { ok: false; code: "ROOM_CAP_REACHED" };
  destroy(roomCode: string): void;
  listActive(): T[];
  stats(): RegistryStats;
}

export class InMemoryRoomRegistry<T extends { roomCode: string; lifecycle: string }> implements RoomRegistry<T> {
  private rooms = new Map<string, T>();

  constructor(private readonly maxRooms: number) {}

  get(roomCode: string) {
    return this.rooms.get(roomCode);
  }

  create(roomCode: string, factory: (roomCode: string) => T) {
    const existing = this.rooms.get(roomCode);
    if (existing) return { ok: true as const, room: existing };
    if (this.rooms.size >= this.maxRooms) return { ok: false as const, code: "ROOM_CAP_REACHED" as const };
    const room = factory(roomCode);
    this.rooms.set(roomCode, room);
    return { ok: true as const, room };
  }

  destroy(roomCode: string) {
    this.rooms.delete(roomCode);
  }

  listActive() {
    return [...this.rooms.values()];
  }

  stats() {
    return { activeRooms: this.rooms.size, maxRooms: this.maxRooms };
  }
}
