import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryRoomRegistry } from "./room-registry";

test("registry cap enforcement and cleanup", () => {
  const reg = new InMemoryRoomRegistry<{ roomCode: string; lifecycle: string }>(2);
  assert.equal(reg.create("A", (roomCode) => ({ roomCode, lifecycle: "CREATED" })).ok, true);
  assert.equal(reg.create("B", (roomCode) => ({ roomCode, lifecycle: "CREATED" })).ok, true);
  const c = reg.create("C", (roomCode) => ({ roomCode, lifecycle: "CREATED" }));
  assert.equal(c.ok, false);
  reg.destroy("A");
  assert.equal(reg.stats().activeRooms, 1);
  assert.equal(reg.create("C", (roomCode) => ({ roomCode, lifecycle: "CREATED" })).ok, true);
});
