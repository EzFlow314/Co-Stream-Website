import test from "node:test";
import assert from "node:assert/strict";
import { createOfflineRuntimeRoomState, runtimeSegmentTheme } from "../src/index";

test("offline runtime shape is stable", () => {
  const state = createOfflineRuntimeRoomState("ROOM1");
  assert.equal(state.roomCode, "ROOM1");
  assert.equal(state.realtime.status, "OFFLINE");
  assert.equal(state.minigames.emojiBudget.max, 120);
  assert.ok(state.segment.theme);
});

test("segment theme mapping deterministic", () => {
  const a = runtimeSegmentTheme("CLOSING_HIGHLIGHTS");
  const b = runtimeSegmentTheme("CLOSING_HIGHLIGHTS");
  assert.deepEqual(a, b);
  assert.equal(a.overlayMode, "tension");
});
