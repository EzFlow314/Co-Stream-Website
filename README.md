# Co-Stream-Website
ROLE
You are a principal full-stack engineer + product designer. Build a complete, production-quality MVP called “BIGROOM” (final name for now) — an EA Sports BIG-era inspired co-stream “Arcade Studio” for streamers. Must run locally end-to-end with a clean README.

CORE PRODUCT PHILOSOPHY
- VDO.Ninja is the underlying WebRTC engine (“heavy work”). We integrate it as the video transport using iframe embeds and the VDO IFRAME API patterns via postMessage.
- BIGROOM is a modern arcade lobby + director studio that makes co-streaming effortless and hype.
- Viewers do NOT need BIGROOM accounts; they watch on Twitch/YouTube/Kick as normal.
- Streamers/hosts DO have BIGROOM accounts. Guests do NOT need accounts; they join by link.
- Host uses OBS and adds ONE Browser Source URL (the BIGROOM Program Output page). Everything else is automatic: layouts, transitions, highlights, chat overlay, hype meter.

PRIMARY USER FLOW (MUST BE 3 BUTTONS)
Home page shows ONLY:
1) START A ROOM
2) JOIN A ROOM
3) ADD TO OBS
All other options are behind small “Settings” and “Pro Mode” toggles.

TARGET PLATFORMS
- Host: Desktop-first (Windows/macOS), must work in Chrome and Edge.
- Guests: Mobile-friendly (iPhone/Android) + desktop.
- No native app required in MVP.

MVP LIMITS (FINAL)
- Max participants per room: 6 total (1 host + up to 5 guests).
- Max visible tiles in Program Output at once: 6.
- Only 1 audio source unmuted at a time in Program Output (Audio Focus). Default Audio Focus = Host.
- Watch Together supports YouTube links only in MVP (explicitly). For other links, show “Not supported yet” message.

VIBE / UI STYLE (EA SPORTS BIG INSPIRED)
- Bold, arcade, street-sports energy. “NBA Street / NFL Street” vibe without copying any EA assets.
- Thick typography, chunky cards, neon edge glows, chrome accents, subtle grain textures.
- Menus have optional SFX: vinyl scratch, crowd cheer, rimshot, airhorn (tasteful, short).
- Accessibility: Sound toggle visible at all times, Reduced Motion theme, High Contrast theme.

THEME PACKS (FINAL LIST)
Themes are selectable by host and saved to account; host can optionally apply theme to Program Output.
1) Street Neon (default): neon glow, bold, vibrant.
2) Arcade Chrome: chrome trims, darker background, bright highlights.
3) Graffiti Sunset: warm gradient, spray textures, playful.
4) Clean Minimal: simple, low animation.
5) High Contrast: accessibility.
6) Reduced Motion: disables animations/transitions, keeps layout logic.

SFX RULES
- Default: ON for host UI, OFF for Program Output (so stream doesn’t auto-blast SFX).
- Toggles:
  - Menu SFX (host UI)
  - Crowd FX (Program Output)
  - Family Mode (filters phrases, disables “edgy” callouts, reduces intensity)

TECH STACK (FINAL)
Frontend:
- Next.js 14+ App Router, TypeScript, TailwindCSS, Framer Motion.
Backend:
- Node.js + ws WebSocket server (separate process) for realtime room events.
DB:
- Postgres + Prisma.
Auth:
- NextAuth Email Magic Link (no OAuth in MVP).
State:
- Redis NOT required in MVP. Use in-memory presence in ws server + DB for persistence.
Monorepo:
- pnpm workspaces
- apps/web (Next.js)
- apps/ws (WebSocket server)
- apps/bridge (local telemetry bridge skeleton)
- packages/shared (types + utils)

NONFUNCTIONAL REQUIREMENTS
- Must run locally with Docker Compose for Postgres.
- Provide .env.example for all services.
- Security: rate-limit join attempts per IP in web server (basic), sanitize chat, prevent XSS in overlays.
- Privacy: do not store raw audio/video. Only store room metadata, chat (optional retention), and events.
- Reliability: Program Output must keep running even if host director tab closes (Program Output is independent page).

PAGES / ROUTES (FINAL)
Public:
- / (Home: Start Room, Join Room, Add to OBS)
- /join/[roomCode] (Guest join, no auth)
- /program/[roomCode] (OBS Browser Source output, no auth but requires secret token parameter)
- /help/obs (how to add browser source; includes “Copy settings”)
Auth:
- /login (magic link)
Streamer:
- /dashboard (rooms, friends, settings quick)
- /room/new
- /room/[roomCode]/lobby (host lobby)
- /studio/[roomCode] (host director view)
- /settings (themes, accessibility, pro mode)
- /help/stream-everywhere (multi-platform guide)

ROOM IDENTIFIERS (FINAL)
- roomCode: 6 characters base32 uppercase (e.g., “K9P2QX”)
- joinLink: https://yourdomain/join/K9P2QX?token=GUESTTOKEN
- programLink: https://yourdomain/program/K9P2QX?token=PROGRAMTOKEN (token required; show copy button)
Tokens:
- Guest token is per-invite.
- Program token is per-room (host only) stored server-side and returned to host UI.

DATA MODEL (Prisma) FINAL
User:
- id, email, name, avatarUrl, theme, reducedMotion, highContrast, menuSfx, crowdFx, familyMode, createdAt
FriendRequest:
- id, fromUserId, toUserId, status(pending/accepted/declined), createdAt
Friendship:
- id, userId, friendId, createdAt (store both directions)
Room:
- id, roomCode, hostUserId, mode(enum GAMEPLAY|PODCAST|WATCH), hostPriority(boolean default true),
  spotlightMode(enum HOST|EQUAL|ROTATE|EVENT), automationEnabled(boolean default true),
  randomStyleEnabled(boolean default true), createdAt, endedAt
Invite:
- id, roomId, token, role(enum GUEST), expiresAt
RoomParticipant:
- id, roomId, role(enum HOST|GUEST), displayName, avatarUrl(optional), joinedAt, leftAt, status(enum JOINED|LEFT|KICKED),
  vdoId (string), isAudioFocus(boolean)
RoomEvent:
- id, roomId, type, payload(json), createdAt
ChatMessage:
- id, roomId, senderName, senderRole, text, createdAt

REALTIME WEBSOCKET EVENTS (FINAL)
Event envelope:
{ type: string, roomCode: string, payload: any, ts: number }
Types:
- PRESENCE_JOIN { participant }
- PRESENCE_LEAVE { participantId }
- CHAT_MESSAGE { message }
- DIRECTOR_SET_MODE { mode }
- DIRECTOR_SET_SPOTLIGHT { participantId }
- DIRECTOR_SET_LAYOUT { layoutId }
- DIRECTOR_SET_AUDIO_FOCUS { participantId }
- AUTOMATION_TOGGLE { enabled }
- RANDOMSTYLE_TOGGLE { enabled }
- WATCH_LOAD { youtubeUrl }
- WATCH_PLAY { atSeconds }
- WATCH_PAUSE { atSeconds }
- WATCH_SEEK { toSeconds }
- GAME_EVENT { standardizedEvent }
- SYSTEM_NOTICE { level, text }

VDO.NINJA INTEGRATION (FINAL STRATEGY)
We DO NOT fork VDO.Ninja in MVP. We wrap it.
- Each guest is assigned a vdoId (random short id).
- Guests join with a sender page that loads VDO sender link in an iframe or redirects to VDO in a new tab OR uses a BIGROOM “guest capture” page that embeds VDO sender.
MVP CHOICE: BIGROOM guest capture page embeds VDO sender in an iframe so we can keep users inside our vibe.

Implementation details:
- Build a centralized vdoUrl.ts:
  - buildVdoSenderUrl({ vdoId, qualityPreset }): string
  - buildVdoReceiverUrl({ vdoId, qualityPreset }): string
  - buildVdoDirectorEmbedUrl({ roomCode }): string (optional; for host director utilities)
- Use postMessage for:
  - detecting connectivity status (basic: loaded + heartbeat)
  - optional generic data messages (if available) for P2P
If any VDO IFRAME API integration is unreliable, fallback to ws server for coordination (ws is source of truth).

QUALITY PRESETS (FINAL UX + BEHAVIOR)
Expose only 3 presets:
- Smooth (for weak internet)
- Balanced (default)
- Sharp (best)
We apply preset to:
A) Our UI complexity:
- Smooth: reduced animations, fewer effects, less blur/shadow
- Balanced: normal effects
- Sharp: full effects
B) Recommended capture constraints:
- Smooth: target 720p30
- Balanced: target 720p60
- Sharp: target 1080p60
We do NOT show bitrate numbers unless Pro Mode enabled.
Pro Mode shows: resolution, fps, suggested bitrate text only (no required input).

OBS SETUP (FINAL CONTENT)
On /help/obs show:
- “Add a Browser Source”
- URL: (copy program link)
- Width: 1920
- Height: 1080
- FPS: 60
- “Shutdown source when not visible”: OFF
- “Refresh browser when scene becomes active”: ON
- “Control Audio via OBS”: ON
Also provide a 1280x720 mode toggle that regenerates a program link with ?res=720.

AUTO LAYOUT ENGINE (FINAL)
Layouts are templates with IDs. Engine picks template based on participant count + mode + spotlight.
Default mode = GAMEPLAY.

Layout templates (IDs):
GAMEPLAY:
- GP1_SOLO: host fullscreen
- GP2_HOST_BIG: host large left, guest right (65/35)
- GP2_EQUAL: split 50/50
- GP3_HOST_BIG: host big + two smaller stacked
- GP4_GRID_HOST_EMPH: 2x2 grid with host emphasized border and slightly larger
- GP5_GRID: 3x2 grid, host tile has glow and top-left priority
- GP6_GRID: 3x2 grid, host tile glow and priority
PODCAST:
- PD2_EQUAL, PD3_GRID, PD4_GRID, PD5_GRID, PD6_GRID (more equal sizing, less aggressive emphasis)
WATCH TOGETHER:
- WT_STAGE_BIG: YouTube stage large + cams small bar
- RT_REACT_BIG: cams bigger, stage still large but secondary

Rules:
- HostPriority default true:
  - host tile gets priority position and emphasis
- SpotlightMode default HOST:
  - host is largest tile unless toggled
- Rotate spotlight:
  - rotates among guests every 12 seconds, BUT never rotates if a GAME_EVENT with intensity >=4 occurred in last 8 seconds
- Event spotlight:
  - when GAME_EVENT arrives, spotlight that streamer tile for 2.5 seconds (soft zoom + glow), then returns to previous.

AUTOMATIC TRANSITIONS (FINAL)
We implement transitions between layout changes and spotlight changes using Framer Motion.
Transition styles:
- SlamWipe (default)
- ChromeSwipe
- GraffitiPop
- BounceZoom
Reduced Motion theme disables transitions (instant switch).

ARCADE DIRECTOR AUTOMATION (FINAL RULE ENGINE)
Goal: never boring, but never annoying.
Automation enabled by default; RandomStyle enabled by default.
Signals:
- join/leave
- game events
- chat volume (messages per 20s)
- timeSinceLastMoment
Definitions:
- “Moment”: any GAME_EVENT intensity>=3 OR manual hotkey moment OR chat-triggered “Hype Burst”
Cooldowns:
- any major visual effect: 8 seconds cooldown
- spotlight change: 6 seconds cooldown
- layout change: 20 seconds cooldown
RandomStyle:
- every 90–150 seconds (random range), if no major moment in last 25 seconds, swap a subtle skin variation (border style, glow intensity, background texture), NOT full theme change.
Hype Meter:
- increases by:
  - GAME_EVENT intensity (1–5)
  - chat activity (1 point per 5 messages)
  - manual “Hype” hotkey (2 points)
- decays slowly: -1 every 10 seconds
Gamebreaker:
- triggers when hype meter reaches 20
- effect: “GAMEBREAKER” banner + 1.5s crowd cheer (if Crowd FX enabled) + spotlight winner (highest recent intensity) for 3 seconds
- resets to 5 after trigger.

CHAT (FINAL)
Universal Room Chat is required:
- host + guests can chat
- chat overlay for Program Output:
  - bottom-left scrolling with platform-neutral badges (HOST/GUEST)
Moderation:
- host can kick guest
- host can enable slow mode (3s / 5s / 10s)
- basic profanity filter in Family Mode
Viewer chat ingestion from Twitch/YouTube is NOT in MVP; add as “Phase 2”.

WATCH TOGETHER (FINAL)
- Only YouTube URLs accepted in MVP.
- Use YouTube IFrame Player API in Program Output and Studio pages.
- Host controls:
  - Load URL
  - Play/Pause
  - Seek
- Sync:
  - ws events WATCH_* keep everyone aligned
- Program Output shows stage + cams per WT templates.
Copyright:
- show banner: “Make sure you have rights to show this content.”
- Family Mode: disables edgy callouts and reduces flashing.

MULTI-PLATFORM STREAMING (FINAL MVP)
We do NOT implement restream relay.
We provide a “Stream Everywhere” setup wizard:
- Option A: Use Restream (show instructions + link field)
- Option B: OBS Multi-RTMP preset helper
For Option B:
- user selects platforms (Twitch, YouTube, Kick, Facebook)
- app displays fields they paste in (stream key/URL), stores locally in browser only (NOT DB) for privacy
- generate a text block “OBS Multi-RTMP Targets” for copy/paste.

TRUE GAME EVENTS (LANE A + FALLBACK) FINAL
We implement Lane A with an “Arcade Bridge” local service skeleton and a generic ingestion API.

apps/bridge:
- Node server with:
  - POST /api/telemetry/:roomCode/:streamerVdoId  (accepts raw telemetry payload)
  - POST /api/event/:roomCode/:streamerVdoId      (accepts standardized payload)
  - POST /api/hotkey/:roomCode/:streamerVdoId     (accepts { type, intensity })
- Bridge normalizes to StandardGameEvent and forwards to ws server.

packages/shared types:
StandardGameEvent:
{
  type: "HEADSHOT"|"KILL"|"SCORE"|"GOAL"|"ASSIST"|"OBJECTIVE"|"CLUTCH"|"STREAK"|"WIN"|"LOSS"|"HIGHLIGHT",
  intensity: 1|2|3|4|5,
  streamerVdoId: string,
  ts: number,
  meta?: { weapon?: string, points?: number, map?: string, note?: string }
}

MVP “Official telemetry” games:
We implement stubs/connectors, not full integrations, but structure code for them:
- “CS2/CS:GO style GSI” connector (HTTP push)
- “Rocket League style scoreboard events” (stub)
- “Fortnite style match events” (stub)
In MVP, provide a “Test Telemetry” button that sends sample events through bridge so the UI overlay is demonstrably working even without game integrations.

Fallback for unsupported games:
- Manual Hotkeys in Studio:
  - 1: CLUTCH (intensity 4)
  - 2: HEADSHOT (intensity 5)
  - 3: SCORE (intensity 3)
  - 4: HYPE (intensity 2)
  - 5: HIGHLIGHT (intensity 3)
- Also provide on-screen big buttons for accessibility.

EVENT VISUALS (FINAL)
When StandardGameEvent arrives:
- if intensity 5: tile glow + 2.5s spotlight zoom + “HE’S ON FIRE” banner (Family mode replaces with “ON FIRE”)
- intensity 4: tile glow + 2.0s spotlight + “BIG PLAY”
- intensity 3: quick glow pulse + “NICE!”
- intensity 1–2: small pulse only
Additionally:
- if type SCORE/GOAL: show small scoreboard ticker animation (simple)
- if STREAK: show “STREAK xN” (N derived from recent streak count per streamer)

ARCADE “PLAYER CARD” INTRO (FINAL)
When a guest joins:
- show animated card (1.2s):
  - displayName
  - “Joined the Crew”
  - optional “Title” randomly assigned from a safe list
Random titles list (family-friendly):
- “Clutch Specialist”
- “Highlight Machine”
- “Speed Demon”
- “Sniper Mode”
- “Playmaker”
- “Hustle King/Queen”
- “Arcade Legend”
Use pronoun-neutral alternatives: “Hustle Hero”, “Arcade Legend”.

RANDOMNESS CONTENT (FINAL)
Random announcer-style callouts displayed as overlay text (no voice in MVP):
- “TOO CLEAN”
- “COOKIN’”
- “NO WAY”
- “CLUTCH!”
- “DIFFERENT”
Family mode restricts to:
- “NICE!”
- “WOW!”
- “CLUTCH!”
- “AMAZING!”

REQUIREMENTS TO AVOID QUESTIONS
- Use these defaults everywhere. Do not ask user for preferences.
- Provide “Pro Mode” toggles but default OFF.
- Provide sane placeholders and allow changes later.

DELIVERABLES (MUST)
1) Working monorepo with pnpm.
2) Docker Compose for Postgres.
3) Web app fully functional:
   - auth
   - friends
   - room creation
   - guest join
   - program output page
   - studio director view
   - chat
   - auto layouts
   - automation + hype meter + gamebreaker
   - watch together (YouTube only)
4) ws server functional for realtime events.
5) bridge server functional; README includes:
   - how to run
   - how to create room
   - how to join as guest
   - how to add program URL to OBS
   - how to trigger a test telemetry event with curl
6) Provide sample curl commands:
   - send HEADSHOT intensity 5
   - send SCORE intensity 3

SAMPLE CURL COMMANDS (MUST INCLUDE IN README)
- Example:
curl -X POST http://localhost:4002/api/event/K9P2QX/guest1 \
  -H "Content-Type: application/json" \
  -d '{"type":"HEADSHOT","intensity":5,"ts":1730000000000,"meta":{"weapon":"AR","note":"Clean headshot"}}'

ACCEPTANCE CRITERIA
- Host can create room, invite guests, see them join, copy program output link.
- Program Output automatically changes layout when guests join/leave.
- Host tile is emphasized by default.
- Chat messages appear and can be toggled as overlay on Program Output.
- Automation produces occasional tasteful variation (no spam).
- “Test Telemetry” or curl event triggers tile highlight + spotlight + hype meter bump.
- Watch Together works for YouTube link and is synced across host/guests.
- Themes switch and Reduced Motion works.

START IMPLEMENTATION ORDER
1) Scaffold monorepo + Next.js + Tailwind + Framer + Prisma + Docker Postgres.
2) Implement ws server and shared event types.
3) Implement auth and dashboard.
4) Implement rooms + invites + guest join flow.
5) Implement Program Output with dummy tiles then integrate VDO iframes.
6) Implement auto layout engine.
7) Implement chat and overlay.
8) Implement Arcade Director automation + hype meter + gamebreaker.
9) Implement Watch Together YouTube stage + sync.
10) Implement bridge server + standardized events + visuals.
11) Polish UI to EA BIG vibe and accessibility toggles.


