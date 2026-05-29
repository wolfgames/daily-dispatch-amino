# T08 Worker Report - Generator And Chapter Core Loop

## Summary

T08 replaced the T07 handcrafted playable level adapter with Amino Game Layer services that generate Daily Dispatch levels from copied source chapter JSON seeds and load the generated output into ECS through `db.actions.loadLevel(...)`.

The active source path preserved here is `ChapterGenerationService -> LevelGenerationService -> SlidingPuzzleGenerator`. The stale citylines road/landmark generator path was not migrated.

## Files Changed

- `src/game/mygame/services/daily-dispatch-level-service.ts`
- `src/game/mygame/services/daily-dispatch-puzzle-types.ts`
- `src/game/mygame/services/deterministic-rng.ts`
- `src/game/mygame/services/grid-simulation.ts`
- `src/game/mygame/services/sliding-puzzle-solver.ts`
- `src/game/mygame/services/sliding-puzzle-generator.ts`
- `src/game/mygame/data/daily-dispatch-shapes.ts`
- `src/game/mygame/ecs/daily-dispatch-plugin.ts`
- `src/game/mygame/screens/gameController.ts`
- `pipeline/runs/run-04-2026-05-29-t08-generator-core-loop/worker-report.md`

## Generator And Chapter Services

- Added deterministic puzzle types, shape data, RNG, grid simulation, BFS solver, and backward sliding-puzzle generator under `src/game/mygame`.
- Updated `daily-dispatch-level-service.ts` to load `public/chapters/index.json`, resolve `dispatch-1.json`, read source `levels[].seed`, select difficulty by source chapter length, generate the requested level, and convert the generated `DispatchLevelConfig` into `DailyDispatchLoadLevelInput`.
- Kept chapter length source-derived through `chapter.levels.length`; no hardcoded seven-level assumption is used.
- Runtime loading is intentionally lazy per level so the first playable screen does not block on generating every chapter level. `generateDailyDispatchChapter()` remains available for full-chapter generation.

## Determinism Notes

- `deterministic-rng.ts` is a close deterministic translation of legacy `XoroShiro128Plus` and is documented as parity-critical.
- `grid-simulation.ts`, `sliding-puzzle-solver.ts`, and `sliding-puzzle-generator.ts` preserve the active legacy mechanics: backward generation, seeded color/shape/dock placement, obstacle placement, seeded scramble moves, and BFS solver verification.
- No `Math.random()` fallback is used for missing seeds. Missing/non-numeric seeds or failed generation throw explicit errors.

## ECS And Runtime Wiring

- Generated blocks and docks are converted into existing ECS load input and loaded through `db.actions.loadLevel(...)`.
- Debug snapshots now expose `levelSeed`, `levelIndex`, `levelCount`, and `optimalMoves`.
- `window.__dailyDispatchDebug.loadGeneratedLevel(chapterIndex, levelIndex)` was added for the Lightweight Runtime Gate and loads another generated source-seeded level through the same ECS action boundary.

## Validation

- `bun run check:manifest`: passed. Manifest is valid with 9 bundles.
- `bun run check:assets`: failed on known baseline naming issues such as `block-obstacle-*`, `eigen-*`, `fonts/Baloo-*`, `vfx/*`, and preview HTML/SVG files. No T08 asset renames were made.
- `bun run typecheck`: failed on known scaffold/package baseline issues in `node_modules`, `src/app.tsx`, `src/core`, `src/game/screens`, and `src/game/setup`.
- Focused typecheck filter for `src/game/mygame`: no matching errors after T08 changes.

## Runtime Evidence

Direct Vite was started without `bun run dev` (`bunx vite --host 127.0.0.1 --port 5174`); Vite selected `http://127.0.0.1:5178/` because lower ports were occupied. Browser routing fulfilled `https://media.dev.wolf.games/games//data/**` requests from the local Vite server.

Runtime gate result:

- Canvas count: `1`
- Console errors during successful gate: `0`
- Level 1: `chapterUid=dispatch-chapter-1`, `levelUid=d1-level-1`, `levelNumber=1`, `levelSeed=42001`, `blocks=2`, `docks=2`, `optimalMoves=6`, `remainingBlocks=2`, `levelPhase=playing`
- Level 2: `chapterUid=dispatch-chapter-1`, `levelUid=d1-level-2`, `levelNumber=2`, `levelSeed=42002`, `blocks=2`, `docks=2`, `optimalMoves=5`, `remainingBlocks=2`, `levelPhase=playing`

The successful browser run also recorded one request failure for local `assets/sfx-daily-dispatch.json` with `ERR_ABORTED`; no console error was emitted and the runtime gate completed.

## Deferred Risks

- T09 still needs deeper movement/completion parity over the generated multi-dock layouts beyond the T07 swipe slice.
- T13 should add Golden Master tests for generated layouts and solver outputs from source seeds.
- Full-chapter upfront generation can be expensive in the browser for later/harder levels; runtime loading now generates only the requested level, while full-chapter generation should be covered by T13 performance/determinism tests before being used on hot paths.
