# EzPlay (Co-Stream-Website)

EzPlay is a fun esports co-stream arena built on VDO.Ninja with Crew vs Crew battles, viewer mini-games (no accounts), Discord helper tools, and OBS-safe program output.

## Monorepo
- `apps/web`: Next.js 14 frontend
- `apps/ws`: realtime WS + HTTP room/state/battle endpoints
- `apps/bridge`: telemetry bridge to ws events
- `packages/shared`: shared types/utils + VDO URL builders
- `prisma/`: schema for users/rooms/crews/seasons/matches

## EzPlay V3 highlights
- **OBS hardening**: copy OBS settings button, `?res=720` support on `/program`, on-screen OBS Safe Mode.
- **Tile health**: CONNECTING/LIVE/STALLED badges in studio/program, rebuild tile + reconnect all + regenerate vdoId.
- **Audio focus correctness**: single focus target, host default, selector in studio, optional auto audio focus for intensity>=4 events.
- **Discord capture helper UX**: step overlay, quality warning, test capture preview, Discord VC link surfaced on join page.
- **Battle UX polish**: program battle HUD, poster intro event, end match action with winner update and seasonal leaderboard updates.
- **Leaderboard + season reset**: public `/arena/leaderboard`, and admin reset endpoint `/admin/season/reset?secret=...`.
- **Viewer mini-games V3**: crowd meter bar + callouts, vote top3, emoji bursts near voted tile with throttles.
- **Street Mode vibe pack**: asphalt textures, court lines option, tag-style buttons, stickers/crowd chants (family-safe fallbacks).
- **Safety/perf guards**: capped chat/event memory, viewer/action throttles, emoji cap (12/s), idle viewer cleanup.

## Realtime events used
`DISCORD_INVITE_SET`, `DISCORD_WEBHOOK_POSTED`, `VIEWER_JOIN`, `VIEWER_REACT`, `VIEWER_VOTE`, `CROWD_TAP`, `BATTLE_MODE_SET`, `MATCH_SCORE_UPDATE` and additional V3 helper events (`MATCH_POSTER_INTRO`, `MATCH_ENDED`, `AUDIO_FOCUS_SET`, `PARTICIPANT_VDO_REGENERATED`).

## Quick start
```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm --filter @bigroom/web exec prisma generate --schema ../../prisma/schema.prisma
pnpm dev
```

Services:
- Web: `http://localhost:3000`
- WS API: `http://localhost:4001/health`
- Bridge: `http://localhost:4002/health`

## Core routes
- `/` home (START THE LOBBY / PULL UP / LOAD INTO OBS)
- `/room/new`, `/room/[roomCode]/lobby`, `/studio/[roomCode]`
- `/program/[roomCode]?token=...` (+ optional `&res=720`)
- `/join/[roomCode]`
- `/play/[roomCode]`
- `/arena/leaderboard`
- `/help/obs`, `/help/stream-everywhere`

## OBS notes
Use OBS Safe Mode toggle on program when needed. This disables heavy visuals/stickers/floating effects to protect stream stability.

## Discord webhook posting
In lobby/studio:
1. Add webhook URL (stored in browser localStorage by default).
2. Click **Post Invite**.
3. Server forwards through `/discord/webhook/:roomCode` (rate limited 1/30s).

## Admin season reset
```bash
curl -X POST "http://localhost:4001/admin/season/reset?secret=dev-secret"
```

## Telemetry test commands
### HEADSHOT intensity 5
```bash
curl -X POST http://localhost:4002/api/event/K9P2QX/guest1 \
  -H "Content-Type: application/json" \
  -d '{"type":"HEADSHOT","intensity":5,"ts":1730000000000,"meta":{"weapon":"AR","note":"Clean headshot"}}'
```

### SCORE intensity 3
```bash
curl -X POST http://localhost:4002/api/event/K9P2QX/guest1 \
  -H "Content-Type: application/json" \
  -d '{"type":"SCORE","intensity":3,"ts":1730000001234,"meta":{"points":2,"note":"Fast break"}}'
```

## Quick QA
1. Create room: open `/room/new`
2. Join as guest: open `/join/{roomCode}`
3. Open program with token: `/program/{roomCode}?token=...`
4. Open play page: `/play/{roomCode}`
5. Send curl game event (above)
6. Toggle CREW VS CREW in studio
7. End Match in studio
8. Check `/arena/leaderboard`


## V4 Step 1+2 (Theme Engine + Token Components)
- Added data-driven theme engine under `apps/web/src/theme/`:
  - `themes/types.ts`, `themes/index.ts`, `themes/presets/*`
  - runtime helpers: `runtime/applyTheme.ts`, `runtime/themeStore.ts`
- Added CSS variable layer in `apps/web/src/styles/theme.css` and Tailwind variable mappings.
- Added reusable token-first UI primitives in `apps/web/components/ez/`:
  - `EzButton`, `EzCard`, `EzPanel`, `EzTag`, `EzInput`, `EzToggle`, `EzBadge`
- Migrated core pages/components to use token-driven classes/components first:
  - Home, Program Output, Studio surface, Join flow, Play flow, Settings theme controls.


## Home Look Packs (Streetball Flyer / Neon Arcade / Arena Pro)
- New selectable Home Looks implemented via theme tokens and CSS variables.
- Assets directory: `apps/web/public/skins/home/` with placeholders:
  - `streetball_bg.webp`, `streetball_tape.webp`
  - `neon_bg.webp`, `neon_doodles.svg`
  - `arena_bg.webp`, `arena_edge_glow.webp`
  - `grain.webp`
- Home layout now reads current host theme and renders themed background/header/buttons from tokens.
- Configure at `/settings/themes` (Home Look section).
- Accessibility guards:
  - Reduced Motion disables glow animation
  - High Contrast disables textures/grain
  - OBS Safe defaults disable heavy layers


## V6 Adaptive Theme Defaults
- Added route-aware default theme resolution via `getDefaultThemeByRoute(route)`.
- Defaults (when no manual selection exists):
  - `/`, `/studio/*` => `streetballFlyer`
  - `/program/*` => `arenaProElite`
  - `/play/*` => `neonArcade`
  - `/join/*` => `arenaProElite`
- Manual theme selections are respected and persisted.
- Added home depth layering: vignette, CTA spotlight, subtle parallax (disabled Reduced Motion), and stronger inner glow for primary CTA buttons.

## V11 Automation-First Arcade Broadcast OS (foundation)
- Added **First Time Setup wizard** in Studio (`Add to OBS`, `Recording automation`, `Telemetry automation`, `Choose vibe`) backed by WS setup endpoints.
- Added telemetry/stats automation surface:
  - `POST /rooms/:roomCode/stats`
  - `POST /rooms/:roomCode/hud-mode`
  - `POST /rooms/:roomCode/replay-pip`
  - `POST /rooms/:roomCode/export-highlight-pack`
- Added now-playing + vibe panel in Studio with test telemetry trigger.
- Added program-side overlay foundations:
  - TitleCard overlay
  - replay stamp (`INSTANT REPLAY`)
  - announcer callout banner
  - MVP crown + optional per-tile stat line + connecting skeletons
- Added no-account viewer **Power-Ups** UI with per-viewer/global cooldown UX.
- Added `/recap/[roomCode]` public recap page.
- Added `/legal/assets` page for local asset licensing manifest.
- Added shared modules:
  - `packages/shared/src/gameStats.ts`
  - `packages/shared/src/announcerEngine.ts`
  - exported through `packages/shared/src/index.ts`

## V12 Official Broadcast OS pass (incremental)
- Added WS **Segments Engine** scaffolding with rotating phases (`TIP_OFF`, `MOMENTUM_SWING`, `HALFTIME_RECAP`, `CLOSING_HIGHLIGHTS`) and `SEGMENT_SET` events.
- Added **Broadcast Rating** and **Crew Reputation** calculations at match end, exposed via recap and match end payload.
- Added **Moment Vault** endpoint: `GET /rooms/:roomCode/moment-vault`.
- Added Watch Together V2 controls/endpoints:
  - `POST /rooms/:roomCode/watch-mode` (STAGE/SYNC + rights warning)
  - `POST /rooms/:roomCode/mature-mode` (age-gated behavior)
- Added automation defaults metadata in setup endpoint response for telemetry/automation/layout/segments defaults.
- Added legal asset manifest file (`public/legal/assets-manifest.json`) and updated `/legal/assets` page to render manifest with hash columns.
- Studio UI now surfaces telemetry status, current segment, and broadcast score/rating; Watch Together block now includes Stage/Sync + Mature Mode controls.

## Fix pass: WS-offline resilience + dev stability
- Added shared `safeFetchJson` (`apps/web/lib/safe-fetch.ts`) with timeout (1200ms), 1 retry, and fallback returns.
- Added resilient runtime proxy route: `GET /api/runtime/room/[roomCode]`.
- Studio and Program SSR now render with safe defaults when WS is offline and show:
  - `Realtime service offline. Run pnpm dev at repo root.`
- Room API routes now use safe fetch fallbacks to avoid SSR crashes.
- Added root preflight script (`scripts/preflight.mjs`) and updated root `pnpm dev` to run preflight + all apps.
- Added client reconnect badges/loops in Studio and Play views.
- Added Playwright config with CI-safe Chromium launch flags + retries + WebKit fallback project.

## V12.1/V12.2 add-ons (scaffold)
- Added `Discover` page (`/discover`) and `Viewer Arena` page (`/arena/[roomCode]`) as optional companion experiences.
- Added roadmap voting UI scaffold (`/dashboard/roadmap`) and support tips scaffold (`/support/tips`) with non-pay-to-win messaging.
- Added deterministic Helper Bot widget with JSON knowledge bases:
  - `apps/web/data/help/faq.json`
  - `apps/web/data/help/troubleshooting.json`
  - `apps/web/data/help/flows.json`
- Added maintenance/release-plan admin endpoints in WS:
  - `GET/POST /admin/maintenance?secret=...`
  - `GET/POST /admin/release-plans?secret=...`
- Added maintenance guard for room creation and maintenance state in `/health`.

## Phase 1 Freeze (documented)
After V12.2 scaffolding, scope is feature-frozen pending stability + UX launch criteria:
- WS offline resilience
- reconnect stability
- OBS-safe + accessibility compliance
- discoverability/share-loop verification

## System 1+ hardening pass (telemetry/announcer/segments)
- Added deterministic WS op envelope support for:
  - `telemetry.event` + `telemetry.ack`
  - `helper.query` + `helper.reply`
  - standardized `error` payload shape with `code`, `message`, `retryAfterMs`.
- Added telemetry ingest guardrails:
  - token-bucket rate limiting (8 events/sec/participant)
  - low-confidence discard (`intensity<=0` or empty/all-zero statDelta)
  - 100ms dedupe-window key cache (LRU bounded)
- Added server-side momentum rollup:
  - 20s window, 2s tick decay, bounded display momentum
  - swing detection with threshold + cooldown
- Added periodic `room.state` WS payload broadcast with maintenance/segment/momentum/broadcast snapshots.
- Added deterministic helper bot response mapping in WS for known intents/error codes.

## V12.3 Hardened Contract + Verification

V12.3 locks shared runtime contracts and deterministic safety behavior.

### Canonical contracts
- Package: `@ezplay/contracts`
- Contains shared `ErrorCode`, `WsEnvelope`, `RuntimeRoomState`, segment/theme helpers, and offline runtime defaults.

### Ops states
- `ACTIVE`: normal behavior
- `DRAINING`: no new joins, active sessions may continue
- `MAINTENANCE`: mutation/actions rejected with structured `{ code: MAINTENANCE }`

### Test commands
- `pnpm test:v12.3:contracts` — contract determinism/unit tests
- `pnpm test:v12.3:harness` — runtime maintenance + anti-spam harness (requires WS running)

### Runtime proxy guarantee
`/api/runtime/room/[roomCode]` always returns a stable runtime shape with:
- `runtime.realtime.status` (`ONLINE|OFFLINE`)
- `runtime.realtime.lastSeenAt`
- always-present `maintenance`, `segment`, `momentum`, `broadcast`, `announcer`, `minigames`

### V12.3 C–I verification matrix
- C Telemetry: token bucket (8/sec), monotonic timestamps, low-confidence discard, dedupe prune, and spam bound checks.
- D Momentum: 20s prune + 2s decay + swing cooldown validated via deterministic unit tests.
- E Segments: TIP_OFF/HALFTIME/CLOSING transition guards + anti-flap cooldown validated in simulation-style tests.
- F Announcer: segment gate + anti-repeat + quiet-mode threshold tests.
- G Broadcast score/reputation math: normalization, diminishing-return density, deterministic replay checks.
- H Mini-games: emoji cap compression, slowmo/overtime gates, momentum energy scaling clamp tests.
- I Maintenance: DRAINING vs MAINTENANCE gate semantics + harness mutation rejection checks.

Commands:
- `pnpm test:v12.3:contracts`
- `pnpm test:v12.3:ws`
- `pnpm test:v12.3:harness`

### V12.3 certification gate (locked)
V12.3 is certified only when all of these are green:
- `pnpm test:v12.3:contracts`
- `pnpm test:v12.3:ws`
- `pnpm test:v12.3:harness`
- `pnpm -r typecheck`
- `pnpm --filter @bigroom/web build`

## V12.5 Scale-Ready Foundation + Viral Survival Mode

### Architectural boundaries
- Room lifecycle is explicit in runtime state: `CREATED -> ACTIVE -> ENDED -> ARCHIVED`.
- Room registry is abstracted through an in-memory `RoomRegistry` implementation to enable future pluggable backends.
- Room affinity rule remains strict: one room runtime lives on one WS instance.

### Protection/cap controls
- `MAX_ACTIVE_ROOMS` guards total room creation and returns `ROOM_CAP_REACHED`.
- `MAX_PARTICIPANTS_PER_ROOM` guards join pressure and returns `ROOM_FULL`.
- Backpressure protection mode auto-switches to `DEGRADED` when tick stress rises, reducing broadcast frequency and extending resync interval.

### V12.5 commands
- `pnpm test:v12.5:load:small`
- `pnpm test:v12.5:load:large` (manual/nightly)
- `pnpm test:v12.5:spike`

## V12.6 Capacity Tuning + Scale-Out Playbook

### Capacity profiling outputs
V12.6 profile writes machine-readable capacity reports to `reports/v12.6/*.json` including:
- `maxRooms_normal`
- `maxRooms_degraded`
- safe participant range
- `tick_p95_at_max`
- `broadcast_hz_at_max`
- `telemetry_accept_rate_at_max`
- memory growth slope

### Canonical run matrix
- `pnpm test:v12.5:load:small` (CI-safe)
- `pnpm test:v12.5:load:large` (manual/nightly)
- `pnpm test:v12.5:spike` (burst survival)
- `pnpm test:v12.6:soak:10m` (manual/nightly)
- `pnpm test:v12.6:profile` (profile + recommendations + regression guard)

### Alert thresholds (ops guide)
- WARN: tick p95 > 80ms sustained, overruns > 15/min, protection mode flapping.
- CRIT: tick p95 > 160ms sustained, overruns > 50/min, protection mode stuck DEGRADED.

### 2-node readiness (no Redis required yet)
- Phase A: two WS nodes with sticky routing by `roomCode` affinity/hash.
- Phase B: introduce shared discovery store/pub-sub only when cross-node coordination is required.

### V12.6 release gate
Must pass:
- `pnpm test:v12.3:contracts`
- `pnpm test:v12.3:ws`
- `pnpm test:v12.3:harness`
- `pnpm test:v12.5:load:small`
- `pnpm test:v12.6:profile`
- `pnpm -r typecheck`
- `pnpm --filter @bigroom/web build`


## V12.7 Two-Node Rehearsal + Routing Proof

### Deterministic room affinity (A/B)
- Room routing is deterministic: `selectNode(roomCode)` uses stable hash affinity across configured nodes.
- Runtime/API proxy routes room create/read calls to the selected node and forwards `x-room-node` for mismatch protection.
- WS returns deterministic `ROOM_NODE_MISMATCH` when a request is sent to the wrong node, and proxies return `NODE_UNAVAILABLE` when a selected node is offline.

### Dual-node local rehearsal
- Configure web proxy node targets:
  - `WS_NODE_A_URL=http://127.0.0.1:3011`
  - `WS_NODE_B_URL=http://127.0.0.1:3012`
- Start dual WS:
  - `pnpm dev:ws:dual`
- Validate both nodes and routing:
  - `pnpm test:v12.7:dual:harness`
  - `pnpm test:v12.7:load:split`
  - `pnpm test:v12.7:failover`

### Failure semantics
- `ROOM_NODE_MISMATCH`: request reached the wrong WS node for the room affinity.
- `NODE_UNAVAILABLE`: selected node is unavailable (network/process down).
- `WS_OFFLINE`: both nodes unavailable/offline fallback.

### V12.7 release gate
Must pass:
- `pnpm test:v12.3:contracts`
- `pnpm test:v12.3:ws`
- `pnpm test:v12.3:harness`
- `pnpm test:v12.5:load:small`
- `pnpm test:v12.6:profile`
- `pnpm test:v12.7:dual:harness`
- `pnpm test:v12.7:load:split`
- `pnpm test:v12.7:failover`
- `pnpm -r typecheck`
- `pnpm --filter @bigroom/web build`

Manual/nightly:
- `pnpm test:v12.7:load:split:large`

## V12.8 Abuse & Edge Hardening + Cluster Readiness

### Abuse hardening
- Telemetry now applies progressive per-participant abuse escalation (warn → reduced cap → temporary mute) with deterministic `RATE_LIMIT_ESCALATED` responses.
- Viewer interaction controls now include per-viewer action buckets for `VIEWER_REACT`, `CROWD_TAP`, `VIEWER_VOTE`, and `POWERUP_USE`, preventing a single viewer from exhausting room budgets.

### Routing correctness + stale mapping self-heal
- WS enforces deterministic room-node affinity via `ROOM_NODE_MISMATCH` using roomCode hash and reports `expectedNode`.
- Runtime/read proxies retry once on mismatch and can use alternate node only for read-only fetch if the primary node is down.
- Mutations remain affinity-locked and do not fail over to avoid split-brain writes.

### Discovery readiness (2-node fan-out)
- WS exposes `GET /rooms/active-index` for read-only active-room summaries.
- Web discover API fans out to configured nodes and merges results deterministically.

### Protection mode UX and reconnect storm controls
- Studio and Play surfaces show `NORMAL/DEGRADED` protection mode badge.
- Viewer reconnect backoff now includes roomCode-hash jitter.
- WS applies lightweight `joinRoom` attempt throttling with `retryAfterMs` semantics.

### V12.8 release gate additions
- All V12.7 gates
- `pnpm test:v12.7:router` (includes mismatch retry + discover merge assertions)
- `pnpm test:v12.3:ws` (includes abuse escalation + viewer spam bucket unit coverage)

## V12.9 Alpha Launch Package

### MODE presets and ops-safe defaults
- Runtime config resolver now supports `MODE=dev|alpha|prod` with deterministic defaults for room caps, participant caps, broadcast cadence, and protection thresholds.
- `/metrics` includes `mode`, `safemode`, `safemode_reason`, and threshold/cap fields for incident diagnostics.

### Safe Mode kill switch
- Admin endpoint: `POST /admin/safemode?secret=<ADMIN_SECRET>` with `{ enabled: boolean, reason?: string }`.
- Safe Mode server-side behavior:
  - gates heavy viewer actions (`VIEWER_REACT`, `CROWD_TAP`, `POWERUP_USE`) with `SAFEMODE_ACTIVE`
  - slows room-state broadcast cadence while preserving match correctness
  - emits `ops.banner` event to rooms when toggled.

### Streamer alpha UX
- Alpha banner appears on Studio/Program/Play when MODE is alpha (or `NEXT_PUBLIC_MODE=alpha`).
- Studio includes concise setup/protection microcopy and inline `Report Issue` panel.
- Error copy is deterministic from `ErrorCode` mapping, including `SAFEMODE_ACTIVE` and `RATE_LIMIT_ESCALATED`.

### Feedback capture
- `POST /api/feedback` stores append-only JSONL records at `reports/feedback/feedback.jsonl`.
- Reports include contextual fields: roomCode, mode, protectionMode, safemode, route, and recent error context.
- Optional webhook forwarding via `FEEDBACK_WEBHOOK_URL` is best-effort and non-blocking.

### Alpha rehearsal (30 minutes)
1. Start WS with `MODE=alpha`.
2. Verify `/metrics` shows `mode=alpha`, conservative caps, and `safemode=false`.
3. Run split-load small (`pnpm test:v12.7:load:split`).
4. Trigger pressure/protection mode and observe `protection_mode` in metrics.
5. Enable SafeMode mid-run; verify `SAFEMODE_ACTIVE` gating + `ops.banner`.
6. Simulate `ROOM_NODE_MISMATCH`; ensure read retry self-heals.
7. Submit feedback while WS offline (`/api/feedback` still accepts).
8. Kill WS_B and verify graceful `NODE_UNAVAILABLE` behavior.

### V12.9 release gate
- `pnpm test:v12.3:contracts`
- `pnpm test:v12.3:ws`
- `pnpm test:v12.3:harness`
- `pnpm test:v12.5:load:small`
- `pnpm test:v12.6:profile`
- `pnpm test:v12.7:load:split`
- `pnpm test:v12.7:failover`
- `pnpm test:v12.9:alpha-gate`
- `pnpm -r typecheck`
- `pnpm --filter @bigroom/web build`


## Local setup troubleshooting (zip export + native binaries)
If you download as ZIP and hit native/binary errors (Prisma/esbuild/next), run:

```bash
pnpm install
pnpm approve-builds
pnpm rebuild
pnpm --filter @bigroom/web exec prisma generate --schema ../../prisma/schema.prisma
pnpm dev
```

Notes:
- This repo expects pnpm from `packageManager` in root `package.json`.
- `reports/feedback/` is runtime output and is git-ignored.
