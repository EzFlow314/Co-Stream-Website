import test from "node:test";
import assert from "node:assert/strict";
import { buildFeedbackContext } from "./feedback-context";

test("buildFeedbackContext fills required defaults", () => {
  const ctx = buildFeedbackContext({ roomCode: "R1" });
  assert.equal(ctx.roomCode, "R1");
  assert.equal(ctx.mode, "unknown");
  assert.deepEqual(ctx.lastErrorCodes, []);
});
