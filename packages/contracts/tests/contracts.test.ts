import test from "node:test";
import assert from "node:assert/strict";
import { computeStageLayout, createOfflineRuntimeRoomState, runtimeSegmentTheme } from "../src/index";

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


test("stage layout is deterministic and enters clutch/recovery", () => {
  const clutch = computeStageLayout({
    segment: "CLOSING_HIGHLIGHTS",
    momentumScore: 0.9,
    screenShareActive: false,
    activeSpeakerIntensity: 0.7,
    eventDensity: 0.8,
    closenessOfMatch: 0.95,
    safemode: false,
    wsHealthy: true,
    tileStallCount: 0
  });
  const clutchB = computeStageLayout({
    segment: "CLOSING_HIGHLIGHTS",
    momentumScore: 0.9,
    screenShareActive: false,
    activeSpeakerIntensity: 0.7,
    eventDensity: 0.8,
    closenessOfMatch: 0.95,
    safemode: false,
    wsHealthy: true,
    tileStallCount: 0
  });
  assert.deepEqual(clutch, clutchB);
  assert.equal(clutch.mode, "CLUTCH");

  const recovery = computeStageLayout({
    segment: "TIP_OFF",
    momentumScore: 0.2,
    screenShareActive: false,
    activeSpeakerIntensity: 0.1,
    eventDensity: 0.1,
    closenessOfMatch: 0.2,
    safemode: true,
    wsHealthy: false,
    tileStallCount: 2
  });
  assert.equal(recovery.mode, "RECOVERY");
  assert.equal(recovery.freezeTransitions, true);
});
