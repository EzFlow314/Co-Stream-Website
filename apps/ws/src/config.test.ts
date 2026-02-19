import test from "node:test";
import assert from "node:assert/strict";
import { resolveRuntimeConfig } from "./config";

test("resolveRuntimeConfig returns alpha defaults", () => {
  const cfg = resolveRuntimeConfig({ MODE: "alpha" });
  assert.equal(cfg.mode, "alpha");
  assert.equal(cfg.maxActiveRooms, 120);
  assert.equal(cfg.tickP95WarnMs, 60);
});

test("resolveRuntimeConfig respects env overrides", () => {
  const cfg = resolveRuntimeConfig({ MODE: "alpha", MAX_ACTIVE_ROOMS: "222", TICK_P95_WARN_MS: "77" });
  assert.equal(cfg.maxActiveRooms, 222);
  assert.equal(cfg.tickP95WarnMs, 77);
});
