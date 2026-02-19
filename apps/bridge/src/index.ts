import express from "express";
import cors from "cors";
import type { StandardGameEvent } from "@bigroom/shared";

const app = express();
app.use(cors());
app.use(express.json({ limit: "512kb" }));

const WS_URL = process.env.WS_HTTP_URL || "http://localhost:4001";

async function forward(roomCode: string, event: StandardGameEvent) {
  await fetch(`${WS_URL}/event/${roomCode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event)
  });
}

async function forwardStats(roomCode: string, streamerVdoId: string, body: Record<string, unknown>) {
  await fetch(`${WS_URL}/rooms/${roomCode}/stats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      participantId: streamerVdoId,
      crew: body.crew || "A",
      delta: {
        kills: Number(body.killsDelta || 0),
        deaths: Number(body.deathsDelta || 0),
        assists: Number(body.assistsDelta || 0),
        score: Number(body.scoreDelta || 0),
        objectives: Number(body.objectivesDelta || 0),
        streakCount: Number(body.streakCount || 0),
        lastEvent: String(body.lastEvent || "TELEMETRY")
      }
    })
  });
}

function normalize(streamerVdoId: string, payload: Partial<StandardGameEvent>): StandardGameEvent {
  return {
    type: (payload.type ?? "HIGHLIGHT") as StandardGameEvent["type"],
    intensity: (payload.intensity ?? 3) as StandardGameEvent["intensity"],
    streamerVdoId,
    ts: payload.ts ?? Date.now(),
    meta: payload.meta
  };
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/telemetry/:roomCode/:streamerVdoId", async (req, res) => {
  const event = normalize(req.params.streamerVdoId, {
    type: req.body.kill ? "KILL" : req.body.objective ? "OBJECTIVE" : "HIGHLIGHT",
    intensity: req.body.kill ? 4 : req.body.objective ? 3 : 2,
    meta: { note: "Telemetry normalized", map: req.body.map }
  });
  await forward(req.params.roomCode, event);
  await forwardStats(req.params.roomCode, req.params.streamerVdoId, req.body);

  if (typeof req.body.gameName === "string" && req.body.gameName.trim()) {
    await fetch(`${WS_URL}/rooms/${req.params.roomCode}/now-playing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: req.body.gameName, platform: req.body.platform || "TWITCH", vibeProfile: "AUTO" })
    });
  }

  res.json({ ok: true, event, telemetryStatus: "CONNECTED" });
});

app.post("/api/event/:roomCode/:streamerVdoId", async (req, res) => {
  const event = normalize(req.params.streamerVdoId, req.body);
  await forward(req.params.roomCode, event);
  res.json({ ok: true, event });
});

app.post("/api/hotkey/:roomCode/:streamerVdoId", async (req, res) => {
  const event = normalize(req.params.streamerVdoId, {
    type: req.body.type,
    intensity: req.body.intensity,
    meta: { note: "Hotkey trigger" }
  });
  await forward(req.params.roomCode, event);
  res.json({ ok: true, event });
});

const port = Number(process.env.BRIDGE_PORT || 4002);
app.listen(port, () => console.log(`bridge on :${port}`));
