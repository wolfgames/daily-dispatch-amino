# T07 Worker Report — ECS-First Amino Vertical Slice

## Summary

Built the first playable ECS-first Daily Dispatch slice in the Amino Game Layer. The target now loads the copied first source chapter/level item, translates it into an ECS level payload, renders a Pixi board from ECS snapshot data with original atlas frames, and performs a swipe-to-exit loop through the ECS `executeSwipe` action.

## Files Changed

- `src/game/mygame/ecs/daily-dispatch-plugin.ts`
- `src/game/mygame/services/daily-dispatch-level-service.ts`
- `src/game/mygame/screens/gameController.ts`
- `pipeline/runs/run-03-2026-05-29-t07-ecs-slice/worker-report.md`

## ECS Plugin Shape

`dailyDispatchPlugin` now defines:

- Components for block identity, grid position, color, shape key, encoded shape offsets, exited state, sprite/render metadata, dock color, dock side, dock indices, dock open/closed sprites, dock closed state, and grid occupancy.
- Resources for chapter id/uid/index/count/name, level uid/number/index/count/seed, grid width/height, move count, total moves, optimal moves, level phase, Story Phase Resource, current clue uid/text, current dialogue reference, headline, article URL, remaining target blocks, and open docks.
- Transactions:
  - `loadLevel` clears prior ECS entities, writes source-derived chapter/level resources, inserts block/dock/occupancy entities.
  - `applySwipeResult` applies a precomputed slide/exit result atomically and rebuilds occupancy.
  - `setStoryPhase` and `hydrateProgress` preserve the existing foundation surfaces.
- Actions:
  - `loadLevel(input)` is the public level-load boundary.
  - `executeSwipe({ blockUid, direction })` reads ECS state, runs pure slide/collision/dock-exit logic, mutates ECS only on successful movement, and returns animation metadata.
  - `snapshot()` exposes a readonly debug snapshot for renderer sync and smoke validation.

## Level Loading

`daily-dispatch-level-service.ts` reads `/chapters/index.json`, loads `dispatch-1.json`, and translates the first copied source level into a narrow playable ECS load input. The source chapter uid, chapter id, level uid, level number, seed, first clue, headline, county, and story references are preserved in ECS resources. The T07 puzzle is intentionally small: one target package can exit through a matching right-side dock, with one support package present for multi-block rendering.

## Runtime Validation

- `bun run check:manifest`: passed, manifest valid with 9 bundles after removing the invalid `theme-branding` Pixi spritesheet registration from the DOM/theme loader path.
- `bun run check:assets`: failed on existing baseline naming issues (`eigen-*`, old obstacle PNGs, preview HTML/SVG, fonts, and existing VFX paths). The copied Daily Dispatch binaries were not the blocker.
- `bun run typecheck`: still fails on baseline scaffold/dependency issues outside T07 (`@wolfgames/components/solid` declarations, Tweakpane types, Node/buffer types, core JSX/signal typing, existing `GameScreen` tracking type). A focused filter for `src/game/mygame` and the new service returned no T07 file errors after fixes.
- Browser runtime smoke: passed with direct Vite plus Playwright. Because the scaffold resolved assets through `https://media.dev.wolf.games/games//data` in local mode, the smoke routed those requests back to the local Vite assets. The game screen booted with a canvas, ECS debug snapshot reported 2 blocks and 1 dock, and a pointer swipe on the target package updated ECS to `moveCount: 1`, `remainingBlocks: 0`, and `levelPhase: "complete"` with zero console errors.

## Acceptance Criteria Notes

- ECS database is created during game init and registered through the existing `setActiveDb` Inspector bridge.
- `window.__dailyDispatchDebug.getSnapshot()` was added as a minimal readonly debug surface because no game-specific Amino inspector adapter beyond `setActiveDb` was discoverable.
- Blocks and docks render from original `atlas-tiles-daily-dispatch` frames.
- The copied `atlas-branding-wolf` Source Artifact remains on disk but is not registered as `theme-*`; it is a Pixi spritesheet and must not be loaded by the DOM/theme loader.
- The full legacy generator, story modal sequence, audio parity, progress adapter, analytics adapter, and chapter progression remain deferred to T08/T09.
