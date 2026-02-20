import { NextResponse } from "next/server";
import { ErrorCode, createOfflineRuntimeRoomState, runtimeSegmentTheme, type RuntimeRoomState } from "@ezplay/contracts";
import { fetchWithMismatchRetry } from "@/lib/node-router";

type RuntimeRoomResponse = {
  connected: boolean;
  room: any;
  authOk: boolean;
  runtime: RuntimeRoomState;
  errorCode: string | null;
};

export async function GET(_req: Request, { params }: { params: { roomCode: string } }) {
  const fallbackRuntime = createOfflineRuntimeRoomState(params.roomCode);

  const roomRes = await fetchWithMismatchRetry(`/rooms/${params.roomCode}`, params.roomCode).then((x) => x.res).catch(() => null);
  const authRes = await fetchWithMismatchRetry(`/program-auth/${params.roomCode}?token=`, params.roomCode).then((x) => x.res).catch(() => null);

  const roomData = roomRes && roomRes.ok ? await roomRes.json() as { ok?: boolean; room?: any } : { ok: false, room: null };
  const authData = authRes && authRes.ok ? await authRes.json() as { ok?: boolean } : { ok: false };

  const roomNotFound = roomRes?.status === 404;
  const connected = Boolean(roomData.ok && roomData.room);
  const room = roomData.room || { roomCode: params.roomCode };
  const activeSegment = (room.currentSegment || "TIP_OFF") as RuntimeRoomState["segment"]["active"];

  const runtime: RuntimeRoomState = connected
    ? {
      roomCode: room.roomCode || params.roomCode,
      maintenance: { state: room.maintenanceState || "ACTIVE", banner: room.maintenanceBannerEtaSeconds ? "Maintenance mode" : null, etaSeconds: room.maintenanceBannerEtaSeconds ?? null },
      segment: { active: activeSegment, startedAt: Number(room.segmentStartedAt || Date.now()), theme: runtimeSegmentTheme(activeSegment) },
      momentum: {
        teamA: { raw: Number(room.telemetryMomentum?.rawA || 0), display: Number(room.telemetryMomentum?.displayA || 0) },
        teamB: { raw: Number(room.telemetryMomentum?.rawB || 0), display: Number(room.telemetryMomentum?.displayB || 0) },
        delta: Number(room.telemetryMomentum?.lastDelta || 0),
        lastSwingAt: Number(room.telemetryMomentum?.lastSwingAt || 0)
      },
      broadcast: { score: Number(room.broadcastScore || 0), tier: room.broadcastRating || "BRONZE" },
      announcer: { quietMode: Boolean(room.announcerQuietMode), lastTier: room.announcerLastCallouts?.[room.announcerLastCallouts.length - 1]?.tier || "LOW" },
      minigames: { emojiBudget: { max: 120, active: Number(room.emojiPerSecond?.count || 0) } },
      stage: {
        mode: room.stageMode || "LOBBY",
        transitionMs: Number(room.stageLayout?.transitionMs || 600),
        freezeTransitions: Boolean(room.stageLayout?.freezeTransitions),
        crowdMeterVisible: Boolean(room.stageLayout?.crowdMeterVisible),
        momentumBorder: Boolean(room.stageLayout?.momentumBorder),
        trimUi: Boolean(room.stageLayout?.trimUi),
        featureTile: Boolean(room.stageLayout?.featureTile),
        activeSpeakerWeight: Number(room.stageLayout?.activeSpeakerWeight || 1)
      },
      realtime: { status: "ONLINE", lastSeenAt: Date.now() }
    }
    : fallbackRuntime;

  const response: RuntimeRoomResponse = {
    connected,
    room,
    authOk: Boolean(authData.ok),
    runtime,
    errorCode: connected ? null : roomNotFound ? ErrorCode.ROOM_NOT_FOUND : ErrorCode.NODE_UNAVAILABLE
  };

  return NextResponse.json(response, { status: connected ? 200 : roomNotFound ? 404 : 503 });
}
