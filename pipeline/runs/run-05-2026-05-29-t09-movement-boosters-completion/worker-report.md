# T09 Worker Report - Movement Rules, Boosters, And Completion

## Summary

T09 completed the ECS-owned Daily Dispatch movement and completion rule surface. Swipe decisions, eraser decisions, remaining block counts, dock closure, level completion, and next generated level/chapter targets now live in the Game Layer ECS plugin; the Pixi controller remains an input, animation, render sync, and runtime debug bridge.

## Files Changed

- `src/game/mygame/ecs/daily-dispatch-plugin.ts`
- `src/game/mygame/screens/gameController.ts`
- `tests/unit/mygame/daily-dispatch-plugin.test.ts`
- `pipeline/runs/run-05-2026-05-29-t09-movement-boosters-completion/worker-report.md`

## Gameplay Rule Surfaces

- `executeSwipe(...)` now refuses input after completion and preserves source semantics: blocked swipes do not increment moves, successful slides increment moves once, matching open docks close on exit, and completion is recomputed from remaining blocks with matching dock colors.
- ECS resources/snapshots now expose `remainingBlocks`, `openDocks`, `completedLevels`, `totalMoves`, `levelPhase`, `storyPhase`, and next target indices (`nextChapterIndex`, `nextLevelIndex`, `hasNextChapter`, `hasNextLevel`).
- The Pixi controller keeps the source swipe detector rules at the bridge: 4 px minimum swipe distance, dominant-axis direction, exact cell hit first, then adjacent-cell forgiving hit test.

## Eraser Behavior

- Added `eraseBlock({ blockUid })` ECS action. It only erases a non-exited/selectable block, marks it exited, rebuilds occupancy through ECS state, recomputes remaining/completion, and does not increment `moveCount` or `totalMoves`.
- The controller's runtime/debug eraser bridge calls the ECS action, plays the source-equivalent 0.3s shrink/fade animation (`back.in(2)` scale and `power2.in` alpha), then resyncs render state from ECS.
- Active-flow caveat: source inventory notes the legacy HUD delete button was not fully wired in the observed active flow. T09 implements the source core eraser rule and runtime/debug animation path, but does not add a new shipped HUD booster flow.

## Completion And Next-Level Hook

- Added `advanceAfterCompletion()` ECS action. After `levelPhase === "complete"`, it consumes completion once, increments `completedLevels` once, updates `storyPhase`, and returns one of `next-level`, `next-chapter`, `all-done`, or `not-complete` with target indices.
- The controller exposes `window.__dailyDispatchDebug.advanceAfterCompletion()` and loads the returned next generated level through the existing T08 `loadPlayableLevel(chapterIndex, levelIndex)` service boundary.
- Shared `LevelCompletionController` was found in docs/source under `@wolfgames/components`, but the installed package exports do not expose `@wolfgames/components/modules/logic/level-completion`; T09 documents that counterpart exception and leaves full module replacement for T11/T13.

## Validation

- `bun run test:run tests/unit/mygame/daily-dispatch-plugin.test.ts`: passed, 5 tests.
- `bun run check:manifest`: passed, manifest valid with 9 bundles.
- `bun run check:assets`: failed on known baseline naming violations (`block-obstacle-*`, `eigen-*`, `fonts/Baloo-*`, `vfx/*`, preview HTML/SVG files). No T09 asset renames were made.
- `bun run typecheck`: failed on known scaffold/package baseline issues in `node_modules`, `src/app.tsx`, `src/core`, `src/game/screens`, and `src/game/setup`.
- `bun run typecheck 2>&1 | Select-String -Pattern "src/game/mygame"`: no output, confirming no new `src/game/mygame` T09 type errors.

## Runtime Completion Evidence

Direct Vite was started without `bun run dev`:

```text
bunx vite --host 127.0.0.1 --port 5191 --strictPort
```

Browser runtime gate used `http://127.0.0.1:5191/?screen=game` and completed generated chapter 1 level 1 through player-equivalent ECS swipes from the browser-loaded solver:

```text
block_cyan up
block_pink down
block_pink left
block_cyan down
block_cyan left
block_pink up
```

Snapshot evidence:

- Before completion: `levelUid=d1-level-1`, `levelSeed=42001`, `moveCount=0`, `optimalMoves=6`, `remainingBlocks=2`, `openDocks=2`, `closedDocks=0`, `levelPhase=playing`, `nextLevelIndex=1`.
- After completion: `moveCount=6`, `remainingBlocks=0`, `openDocks=0`, `closedDocks=2`, `exitedBlocks=2`, `levelPhase=complete`, `nextLevelIndex=1`.
- Completion advance: `kind=next-level`, `chapterIndex=0`, `levelIndex=1`; next runtime snapshot loaded `levelUid=d1-level-2`, `levelSeed=42002`, `moveCount=0`, `remainingBlocks=2`, `levelPhase=playing`.
- Eraser runtime check: reloaded `d1-level-1`, erased `block_cyan` and `block_pink`; `moveCount` stayed `0`, `remainingBlocks` became `0`, `exitedBlocks=2`, and `levelPhase=complete`.

Current browser console errors after the gate: `0`. Network requests for local chapters and media-routed assets returned `200`.

## Remaining Side-By-Side Work

- T09 tests cover focused ECS rule cases and runtime completion; full Golden Master side-by-side comparison against legacy generated layouts should remain in the later validation ramp.
- Full story/chapter completion presentation remains out of scope for T09 and should be handled with the T11/T13 story/completion module work.
