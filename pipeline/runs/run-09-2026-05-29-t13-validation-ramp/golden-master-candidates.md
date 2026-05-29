# T13 Golden Master Candidates

These candidates are intended for the final Migration Harness. They focus on source-visible behavior and Amino-native contracts, not implementation internals.

## Source Data And Seeds

- Catalog: `public/chapters/index.json`, ordered `dispatch-chapter-1` through `dispatch-chapter-10`.
- First source chapter: `public/chapters/dispatch-1.json`.
- First chapter seeds: `42001` through `42007`.
- Seed `42001` expected generated summary:
  - `optimalMoves: 6`
  - blocks: `block_cyan` DOT at `{ col: 0, row: 5 }`, `block_pink` I2_V at `{ col: 5, row: 0 }`
  - docks: `dock_cyan` left `[3]`, `dock_pink` top `[0]`
- Seed `42002` expected generated summary:
  - `optimalMoves: 5`
  - blocks: `block_orange` I2_H at `{ col: 0, row: 5 }`, `block_pink` DOT at `{ col: 0, row: 0 }`
  - docks: `dock_orange` top `[3, 4]`, `dock_pink` left `[5]`

## First-Level Completion Path

For seed `42001`, the solver path is:

1. `block_cyan` `up`
2. `block_pink` `down`
3. `block_pink` `left`
4. `block_cyan` `down`
5. `block_cyan` `left`
6. `block_pink` `up`

Expected outcome: `moveCount: 6`, `remainingBlocks: 0`, `levelPhase: complete`, both matching docks closed, and level-complete audio emitted once.

## Story Phase Sequence

Candidate sequence:

```text
introduction -> chapter-start -> playing -> chapter-end -> playing
```

The first two visible source text anchors are:

- Intro: `Hey there I'm Marty. Managing this floor for the last 32 years.`
- Chapter start / first clue: `See! Easy as that! Let's keep on shipping.`

## Reload Progress Shape

After completing seed `42001` and continuing:

- `game_progress.current.chapterId` remains `dispatch-chapter-1`.
- `game_progress.current.catalogIndex` remains `0`.
- `game_progress.current.currentLevel` becomes `2`.
- `game_progress.current.levelSeed` becomes `42002`.
- `game_block_state` stores block `positions`, `exitedIds`, and `moveCount`.
- `game_has_played` is `true`.

## Active Analytics Events

Harness should assert active Daily Dispatch events only:

- `game_start`
- `chapter_start`
- `level_start`
- `level_complete`
- `chapter_complete`
- scaffold/session events if the harness includes scaffold telemetry
- `audio_setting_changed` only if settings UI is exercised

Stale events remain omitted: `level_restart`, `level_fail`, `chapter_fail`, cutscene events, `story_link_click`, `landmark_connected`, and block movement analytics.

## Local Asset Request Behavior

Pass condition:

- `src/app.tsx` uses `ManifestProvider`, not `GameManifestProvider`.
- `src/game/asset-manifest.ts` keeps `cdnBase` and `localBase` at `.` until source assets are uploaded.
- Browser runtime makes same-origin requests for `assets/...` and `chapters/...`.
- Browser runtime makes zero requests to `media.*.wolf.games`.
- No Playwright route interception is allowed for CDN failures.

## Screenshot Candidates

Use deterministic viewport and seed `42001`:

- Booted game screen with Daily Dispatch board and Marty/story copy.
- Completed seed `42001` level before continuation.
- Reloaded seed `42002` resume state.
