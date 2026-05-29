# T12 Worker Report — Progress, Services, And Analytics Adapters

## Files Changed

- `src/game/mygame/services/legacy-progress-adapter.ts`
- `src/game/mygame/services/legacy-analytics-adapter.ts`
- `src/game/mygame/ecs/daily-dispatch-plugin.ts`
- `src/game/mygame/screens/gameController.ts`
- `src/game/mygame/screens/startView.ts`
- `src/game/screens/LoadingScreen.tsx`
- `src/game/screens/GameScreen.tsx`
- `src/game/mygame-contract.ts`
- `src/game/setup/events.ts`
- `src/game/setup/tracking.ts`
- `src/game/tuning/types.ts`
- `src/game/tuning/index.ts`
- `src/app.tsx`
- `tests/unit/mygame/daily-dispatch-plugin.test.ts`
- `tests/unit/mygame/daily-dispatch-progress-analytics.test.ts`
- `pipeline/runs/run-08-2026-05-29-t12-progress-services-analytics/runtime-gate-playwright.mjs`
- `pipeline/runs/run-08-2026-05-29-t12-progress-services-analytics/runtime-gate-result.json`
- `pipeline/runs/run-08-2026-05-29-t12-progress-services-analytics/runtime-gate-progress-reload.png`

## Adapters Built

- Legacy Progress Adapter reads/writes the active source keys `game_progress`, `game_block_state`, and `game_has_played`.
- Progress persistence uses Amino `createProgressService` from `@wolfgames/components/src/modules/logic/progress`. The target repo already imports Amino logic counterparts from package `src` subpaths for Catalog/Loader; this keeps the same pattern because typed public package subpath exports are not available in this scaffold.
- Progress load maps legacy 1-based `currentLevel` to Amino/ECS zero-based chapter and level indices. Progress save snapshots ECS resources back to the legacy `ProgressData` shape.
- Mid-level block state maps ECS block positions, exited IDs, and move count to/from `game_block_state` through a new ECS `hydrateBlockState` boundary.
- Legacy Analytics Adapter emits only active Daily Dispatch event names through existing Amino/Game KIT analytics trackers and keeps runtime debug counters for validation.

## Active Keys And Events

Active progress keys:

- `game_progress`
- `game_block_state`
- `game_has_played`

Active analytics events:

- `session_start`
- `session_pause`
- `session_resume`
- `session_end`
- `game_start`
- `level_start`
- `level_complete`
- `chapter_start`
- `chapter_complete`
- `audio_setting_changed`

`level_complete` preserves `moves_used`, `optimal_moves`, `time_spent`, and `total_rotations: 0`.

## Omitted Stale Events

The adapter does not emit `level_restart`, `level_fail`, `chapter_fail`, cutscene events, `story_link_click`, `landmark_connected`, `blockMoved`, or `block_moved`.

## Game KIT, Services, And Tuning Notes

- Existing Amino provider stack remains in `src/app.tsx`: `GameConfigProvider`, `AnalyticsProvider`, Sentry initialization, session/loading trackers, `FeatureFlagProvider`, `TuningProvider`, settings audio tracking, manifest/assets, pause, viewport, and screen providers.
- `GameScreen` now passes the existing Amino/Game KIT tracking hook into the Pixi controller instead of a nonexistent `core` property.
- `LoadingScreen` resumes through the progress adapter, not direct legacy storage reads.
- Start screen uses the adapter for start/continue state and `game_start` semantics.
- Tuning now exposes adapter-facing flags under `game.adapters` (`progressSaveOnMove`, `resumeLegacyProgress`, `analyticsDebugLogging`) without moving gameplay rules out of ECS.

## Acceptance Checklist

- [x] Progress persistence uses Amino counterpart module.
- [x] Legacy progress resumes to correct chapter/level.
- [x] Game KIT identity and services are wired through Amino-native surfaces.
- [x] Analytics emits source-compatible event names and meanings for active events.
- [x] Stale/inactive event definitions are documented and not blindly copied.
- [x] Tuning panel exposes relevant game parameters without owning gameplay logic.
- [x] Lightweight Runtime Gate: progress persists across reload for a started chapter/level.

## Validation Results

- `bun run test:run tests/unit/mygame/daily-dispatch-audio.test.ts tests/unit/mygame/daily-dispatch-plugin.test.ts tests/unit/mygame/daily-dispatch-story-counterparts.test.ts tests/unit/mygame/daily-dispatch-progress-analytics.test.ts`: passed, 13 tests.
- `bun run check:manifest`: passed, 9 bundles, GC validation passed.
- `bun run check:assets`: failed on known scaffold baseline naming violations (`block-obstacle-*`, `bomb-*`, `eigen-*`, `fonts/Baloo-*`, `host-portrait.png`, `vfx/*`, etc.). No Daily Dispatch source artifact was renamed.
- `bun run typecheck`: failed on known scaffold/package baseline issues including missing `@wolfgames/components/solid` declarations, `@tweakpane/core` declarations, Ark/buffer `File`, existing core analytics tracker generic errors, and existing Solid JSX/core typing issues. No T12-specific `src/game/mygame` service/controller errors were reported in the full output.
- Guardrail searches: no `requestAnimationFrame`, no React/Preact imports, and no direct Howler/HTMLAudio usage in `src/game/mygame`. Direct DOM creation remains limited to the existing start screen shell, not gameplay.

## T12 Verification Delta

- Added a target-local declaration for the installed `@wolfgames/components/solid` subpath and typed `useGameTracking().service` to the Solid analytics provider return. No legacy source, template source, or `src/core/` file was modified.
- Post-delta filtered typecheck command for the T12-touched paths reports no matching errors (command emitted no output).
- Post-delta focused T12 tests passed: 4 files, 13 tests.
- Post-delta `bun run check:manifest` passed: 9 bundles, GC validation passed.

## Local Asset Resolution Delta

- Investigated the CDN request issue after repo auth was restored. `wolf-dev upload-asset` is available, but the repo had been scoped to `mygame`/QA and Development `nucleo game list` returned unauthorized after local re-init, so uploading Daily Dispatch source assets to a CDN was not accepted as the safe immediate fix.
- Switched the app from `GameManifestProvider` to `ManifestProvider` for the parity migration so Game KIT services remain active but the manifest is not rewritten to `https://media.dev.wolf.games/games//data`.
- Set the local manifest base to `.` so Pixi, DOM, and Howler loaders resolve `assets/...` and `chapters/...` against the current Vite/public origin without creating `//assets/...` URLs.
- Orchestrator local asset probe passed with seed `42001`, one canvas, zero `media.*.wolf.games` requests, zero request failures, and zero console errors. Screenshot: `pipeline/runs/run-08-2026-05-29-t12-progress-services-analytics/orchestrator-local-assets-probe-fixed.png`.

## Runtime Reload Gate

Gate script:

```text
pipeline/runs/run-08-2026-05-29-t12-progress-services-analytics/runtime-gate-playwright.mjs
```

Screenshot:

```text
pipeline/runs/run-08-2026-05-29-t12-progress-services-analytics/runtime-gate-progress-reload.png
```

Result summary:

- Used a strict-port local Vite server at `http://127.0.0.1:59280`.
- Launched Chromium with `--autoplay-policy=no-user-gesture-required`.
- Routed `https://media.dev.wolf.games/**` requests after `/data/` to local Vite files.
- Loaded level seed `42001`, then loaded level seed `42002`.
- Verified `game_progress`, `game_has_played`, and `game_block_state` are present.
- Reloaded and resumed `dispatch-chapter-1`, level 2, seed `42002`.
- Analytics debug output included active `level_start` and `chapter_start`; stale event list was empty.
- Verified one canvas, zero console errors, and zero request failures.
- Stopped the Vite server started for T12 after the gate.

## Known Gaps For T13-T14

- `game_block_state` hydrates positions, exited block IDs, and move count. The active legacy key does not store closed dock IDs, so a mid-level resume after an exited block can restore gameplay completion state but not every dock-close visual detail one-to-one. The adapter/ECS shape is ready for a richer state if a later task approves it.
- Optional `dispatch:progress` compatibility was not implemented because T01/T12 binding facts identify `game_progress` as the active source key and no active `dispatch:progress` reference.
- Runtime gate used direct game route to focus reload validation, so `game_start` is covered by adapter unit tests and start screen wiring rather than the browser reload trace.

## Source/Template Boundary

- `advance-daily-dispatch/` status was clean after T12 checks.
- `template-amino/` still shows pre-existing generated/template-local changes (`bun.lock`, `.claude/`, `.cursor/`, `pipeline/`) from earlier work; T12 did not edit it.
- No Nucleo lifecycle, Production, deploy, provision, merge, trigger-build, force, or destructive command was run.
