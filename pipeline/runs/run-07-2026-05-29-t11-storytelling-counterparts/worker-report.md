# T11 - Storytelling Counterpart Replacement Worker Report

## Summary

T11 replaces Daily Dispatch story catalog loading, chapter navigation, story phase orchestration, dialogue/companion presentation, and level completion handoff with Amino-native services, ECS resources, and small game-layer Pixi adapters.

The target repo only was modified. The read-only legacy source (`advance-daily-dispatch/`) and Amino reference copy (`template-amino/`) were not edited. No commits, Nucleo lifecycle commands, deploys, provisions, merges, trigger-builds, force commands, or destructive commands were run.

## Files Changed

- `src/game/mygame/services/story-content-service.ts`
- `src/game/mygame/services/daily-dispatch-level-service.ts`
- `src/game/mygame/ecs/daily-dispatch-plugin.ts`
- `src/game/mygame/screens/gameController.ts`
- `src/game/mygame/ui/storytelling-counterparts.ts`
- `tests/unit/mygame/daily-dispatch-plugin.test.ts`
- `tests/unit/mygame/daily-dispatch-story-counterparts.test.ts`
- `pipeline/runs/run-07-2026-05-29-t11-storytelling-counterparts/runtime-gate.mjs`
- `pipeline/runs/run-07-2026-05-29-t11-storytelling-counterparts/runtime-gate-story-continuation.png`
- `pipeline/runs/run-07-2026-05-29-t11-storytelling-counterparts/worker-report.md`

## Amino Counterparts Used

- Chapter catalog navigation uses Amino `createCatalogService` through `createDailyDispatchStoryCatalog()`.
- Chapter JSON loading uses Amino `createContentLoader` through the Daily Dispatch story catalog adapter.
- Level completion sequencing uses Amino `createLevelCompletionController`, with Daily Dispatch-specific durations, audio hooks, clue handoff, and debug continuation.
- Story phase ownership is in ECS through `storyPhase`, `levelPhase`, source story text resources, and `advanceStoryPhase()`.
- The Pixi game controller consumes ECS snapshots and actions for story presentation, completion progression, and level advancement; movement/completion rules remain in ECS.

## Documented Exceptions

- Upstream Amino visual primitives for `DialogueBox`, `AvatarPopup`, `CharacterSprite`, and `SpriteButton` were inspected but could not be imported directly from `@wolfgames/components/src/modules` without pulling package source type errors and unrelated renderer assumptions into the target type surface.
- Approved local implementations are contained in `src/game/mygame/ui/storytelling-counterparts.ts`. They are game-layer Pixi adapters that preserve Daily Dispatch source art frame names, Marty treatment, dialogue layout, and source text without vendoring the legacy UI folder.
- No replacement character art, story text, atlas frames, chapter JSON, or source assets were created or renamed.

## Acceptance Criteria

- [x] Chapter catalog navigation uses Amino counterpart or documented adapter.
- [x] Dialogue/companion UI uses Amino counterpart modules where available.
- [x] Level completion flow uses Amino counterpart module where available.
- [x] Story Phase Resource drives major flow phases.
- [x] Chapter start, playing, level complete, and chapter-end flows preserve source behavior.
- [x] Lightweight Runtime Gate: play through one level completion into the next story beat.

## Validation Results

### Focused Unit Tests

Command:

```text
bun run test:run tests/unit/mygame/daily-dispatch-plugin.test.ts tests/unit/mygame/daily-dispatch-story-counterparts.test.ts
```

Result:

```text
Test Files  2 passed (2)
Tests       7 passed (7)
```

### Manifest Check

Command:

```text
bun run check:manifest
```

Result:

```text
check:manifest - Manifest is valid (9 bundles). [GC validation ✓]
```

### Asset Naming Check

Command:

```text
bun run check:assets
```

Result: failed on known baseline non-conforming source/scaffold filenames. No source artifacts were renamed for T11.

```text
check:assets - Non-conforming filenames:
block-obstacle-egg-128.png
block-obstacle-egg-cracked-128.png
block-obstacle-egg-cracked.png
block-obstacle-egg-nest-128.png
block-obstacle-egg.png
block-obstacle-ice-128.png
block-obstacle-ice.png
block-obstacle-jelly-128.png
block-obstacle-jelly.png
block-obstacle-safe-128.png
block-obstacle-safe.png
block-obstacle-stone-128.png
block-obstacle-stone.png
block-rock-stone-128.png
block-rock-stone.png
bomb-icon-preview.html
bomb-outline-alt1.svg
bomb-outline-alt2.svg
bomb-outline-alt3.svg
bomb-outline.svg
eigen-btn-continue.png
eigen-btn-tap-to-play.png
eigen-gems.json
eigen-gems.png
eigen-pop-title.png
fonts\Baloo-Regular.ttf
fonts\Baloo-Regular.woff2
host-portrait.png
powerup-spawn-preview.html
rocket-outline.svg
rubiks-outline.svg
vfx\effects\default.json
vfx\white-circle.png
```

### Typecheck

Command:

```text
bun run typecheck
```

Result: failed on existing scaffold/package type issues, including `@ark/util`/`buffer`, `@wolfgames/game-kit` missing `node:fs` types, `tweakpane` missing `@tweakpane/core` types, `@wolfgames/components/solid` declarations, JSX/core Solid typing, and existing core screen/tracking mismatches.

Follow-up filter:

```text
bun run typecheck 2>&1 | Select-String -Pattern "src/game/mygame|src/game/asset-manifest|tests/unit/mygame|pipeline/runs/run-07-2026-05-29-t11-storytelling-counterparts"
```

Result: no T11-touched file errors were reported by the filtered output.

### Guardrail Searches

- `requestAnimationFrame` in `src/game/mygame`: no matches.
- React/Preact imports in `src/game/mygame`: no matches.
- Howler/direct audio construction in `src/game/mygame`: no matches.
- Direct DOM creation in `src/game/mygame`: only the existing start screen shell (`startView.ts`) creates menu DOM, and `gameController.ts` appends the single Pixi canvas. Gameplay rendering remains Pixi.

## Runtime Gate

Runtime gate was completed with a local Vite strict-port server and MCP browser automation after direct Playwright/CDP launch attempts proved unreliable in this Windows environment. The run:

- Loaded Daily Dispatch and waited for a populated ECS debug snapshot.
- Advanced the source story introduction and chapter-start story phases.
- Completed level seed `42001` with the known swipe sequence.
- Continued the Amino level-completion controller into the next story beat.
- Verified a single gameplay canvas.
- Verified the source story text was inspectable through the ECS/debug story resources and visible in the continuation state.
- Observed zero console errors and zero request failures during the passing MCP gate.
- Stopped the T11 Vite servers that were started for validation.

Screenshot:

```text
pipeline/runs/run-07-2026-05-29-t11-storytelling-counterparts/runtime-gate-story-continuation.png
```

The screenshot artifact is present at 162,557 bytes and shows the post-completion continuation state on level 2 with the Daily Dispatch Pixi canvas active.

## Known Story Parity Gaps For T12-T14

- Full multi-chapter traversal should be exercised beyond the lightweight one-level continuation gate.
- End-of-chapter/results polish and final chapter completion semantics should be verified against the remaining migration tasks.
- Additional visual parity passes can tune animation substates and presentation timing without moving major story state out of ECS.
- Analytics and long-form smoke coverage should be extended once the later parity tasks settle the final screen and publish flow.

## Final Confirmation

T11 implementation is complete in the target repo. The legacy repo and template repo were not modified.
