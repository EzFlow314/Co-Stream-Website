import test from "node:test";
import assert from "node:assert/strict";
import { ErrorCode } from "@ezplay/contracts";
import { errorCopy } from "./error-copy";

test("error copy covers required alpha codes", () => {
  const required: ErrorCode[] = [
    ErrorCode.ROOM_FULL,
    ErrorCode.ROOM_CAP_REACHED,
    ErrorCode.NODE_UNAVAILABLE,
    ErrorCode.ROOM_NODE_MISMATCH,
    ErrorCode.WS_OFFLINE,
    ErrorCode.MAINTENANCE,
    ErrorCode.DRAINING,
    ErrorCode.SAFEMODE_ACTIVE,
    ErrorCode.RATE_LIMIT_ESCALATED
  ];

  for (const code of required) {
    const c = errorCopy(code);
    assert.ok(c.title.length > 0);
  }
});
