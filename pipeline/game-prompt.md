---
interaction-template: pipeline-build-game
mode: parity-migration
slug: daily-dispatch-amino
title: Daily Dispatch
---

# Daily Dispatch Parity Migration Brief

This is a Pipeline Game Prompt Projection derived from the parent-owned Source-Derived Parity Spec. It is not a creative game prompt. Pipeline Skills must reproduce the existing Daily Dispatch Game through Amino-native boundaries, not invent a new game, not redesign the mechanic, and not generate replacement assets.

Authoritative parent spec: `docs/source-derived-parity-spec.md` in the Parent Orchestration Workspace.

Target Game Slug: `daily-dispatch-amino`

Target Game UID: `8be0d298-ab64-4602-8ece-f141a35a74f9`

Development URL: `https://daily-dispatch-amino.dev.wolf.games/`

## Binding ADRs

- ADR-0001: Daily Dispatch must use the Amino/Nucleo Path. Lifecycle work goes through Nucleo; Game-building work goes through Amino contracts, ECS, loaders, modules, services, and Pipeline Skills.
- ADR-0002: The Parent Orchestration Workspace owns migration orchestration. This target repo owns only the implemented Game and target-repo pipeline artifacts.
- ADR-0003: Visual, audio, chapter, and narrative parity must come from Source Artifacts copied from the Read-Only Legacy Source, not regenerated replacements.
- ADR-0004: Gameplay state must be ECS-first from the first playable slice, and legacy responsibilities must be replaced with Amino counterparts when counterparts exist.

## Pipeline Instruction

Build Daily Dispatch as an Amino-native parity port. Do not ask the Writer, Art Director, Designer, Engineer, or Playtester personas to reinterpret the concept as a new game. Their job is to preserve the validated source behavior and map it cleanly into the target Amino scaffold.

The correct output is a reproduced Daily Dispatch experience:

- A mobile-first warehouse sliding-block puzzle.
- A 6x6 grid of colored package/polyomino blocks.
- Swipe or drag movement where blocks slide until blocked, reach a wall, or exit through a matching open dock.
- Matching docks/trucks close when packages exit.
- Level completion after all required matching packages exit.
- Chapter/story progression driven by copied chapter JSON and Marty dialogue.
- Original visual identity, atlas frame names, audio sprite names, timing meaning, and local news reveal flow.

## Non-Negotiable Constraints

- No redesign. Preserve player-visible behavior, content order, progression, timing meaning, and story semantics.
- No generated replacement assets, audio, story, or style content.
- Copy Source Artifacts verbatim from an approved Read-Only Legacy Source. Preserve source file bytes, chapter JSON, narrative text, atlas frame names, and audio sprite names.
- Legacy code is behavioral reference only. Do not copy legacy folder structure, services, screens, or renderer architecture wholesale.
- ECS gameplay state is required from the first slice.
- Amino Counterpart Replacement is required when an Amino counterpart exists.
- Pixi is the gameplay renderer. Do not move gameplay visuals into DOM and do not add a second renderer.
- Do not edit `src/core/`, `src/modules/`, `cortex/`, package files, generated symlinks, or scaffold internals for game-specific behavior.
- Do not migrate citylines road, landmark, rotation, road-generator, road-audio, road-analytics, or road-tuning leftovers as Daily Dispatch behavior.
- Do not use stale `core/LevelGenerator/LevelGenerator.ts` road-path generation as the Daily Dispatch generator.

## Source References To Reproduce

Parent planning sources:

- Parent `CONTEXT.md`
- Parent `docs/PRD.md`
- Parent `docs/source-inventory.md`
- Parent `docs/amino-capability-map.md`
- Parent `docs/source-derived-parity-spec.md`
- Parent `docs/adr/0001-amino-nucleo-path.md`
- Parent `docs/adr/0002-parent-workspace-owns-orchestration.md`
- Parent `docs/adr/0003-verbatim-source-artifacts.md`
- Parent `docs/adr/0004-ecs-first-amino-counterparts.md`

GDD sources:

- Parent `docs/gdd/Daily Dispatch GDD 2cc4a337719980669b42c0cad679b6db.html`
- Parent `docs/gdd/Daily Dispatch Level Gen Prompting 30c4a337719980c988ced02e2f1819bb.html`
- Parent `docs/gdd/Narrative Guide 2ca4a3377199809d8fd9f4043a674fd7.html`

Active legacy behavior sources recorded by parent inventory:

- Runtime flow: `advance-daily-dispatch/src/game/screens/*`, `startView.ts`, `gameController.ts`
- Gameplay: `DailyDispatchGame.ts`, `GridSimulation.ts`, `SwipeDetector.ts`, `Block.ts`, `Dock.ts`, `shapes.ts`
- Generation: `ChapterGenerationService.ts`, `LevelGenerationService.ts`, `SlidingPuzzleGenerator.ts`, `XoroShiro128Plus.ts`, `Solver.ts`
- Content: `public/chapters/index.json`, `dispatch-1.json` through `dispatch-10.json`, `chapterCatalog.ts`, `chapterLoader.ts`
- Services: `progress.ts`, `analytics/index.ts`, `analytics/trackers.ts`, `audio/sounds.ts`, `audio/manager.ts`, `tuning/types.ts`

## Amino Capability Map Summary

Use these target ownership boundaries:

- Nucleo lifecycle: parent owns Game creation, task dispatch, Build, Release, and Provision. Do not run lifecycle commands from this prompt.
- Amino Pipeline Skills: plan, build, report, and improve inside the target repo. Treat this prompt as a parity constraint, not a creativity seed.
- Amino Game Contract: provide `loading`, `start`, `game`, `results`, `setupStartScreen`, `setupGame`, Pixi `gameMode`, tuning, audio, manifest, and screen integration.
- ECS plugin/resources/actions/computed: own story phase, chapter/level state, block/dock/wall entities, move count, movement legality, completion, progress hydration, and progress snapshots.
- Asset Manifest/loaders: use loader-correct `data-*`, `scene-*`, `core-*`, `fx-*`, `audio-*`, and `theme-*` bundle prefixes while preserving source file names and frame names.
- Amino shared modules/counterparts: replace legacy catalog, content loading, progress, dialogue, avatar popup, level completion flow, character sprite, sprite button, progress indicator, audio manager, analytics, tuning, and scaffold-service responsibilities when counterparts exist.
- Game Layer services: own deterministic Daily Dispatch generation, adapters, renderer wrappers, input handling, timing orchestration, and approved game-specific overlays.
- Game KIT services: own identity, analytics/PostHog, Sentry, feature flags, asset/data support, and production plumbing.
- Target adapters: translate legacy chapter data, progress keys, analytics events, and content semantics into Amino-native APIs without making legacy storage or legacy services the target architecture.

## Behavior To Preserve

### Screen And Story Flow

Reproduce the Daily Dispatch flow:

- Loading screen routes to start or game using source timing branches.
- Start screen uses warehouse background, Daily Dispatch title, Marty, audio unlock/loading, and start/continue behavior.
- Game screen owns chapter/story flow, Pixi gameplay, HUD, completion overlays, audio, tuning, analytics, and progress integration.
- Results screen remains valid for the Amino contract even if Daily Dispatch mostly completes inside game overlays.

ECS must own the story phases:

- `introduction`
- `loading-puzzle`
- `chapter-start`
- `playing`
- `chapter-end`

Presentation-only animation substates may stay renderer/controller local.

### Chapter Data And Narrative

Copy and load the original chapter catalog and ten chapter JSON files. Preserve catalog order, UIDs, URLs, publish dates, story text, clues, headlines, article URLs, seeds, level numbers, county, texture pack fields, and unused fields.

Use source chapter fields:

- `story.intro`
- `story.chapterStart`
- `story.completion`
- `story.headline`
- `story.articleUrl`
- First clue text per level
- Level `seed`, `config`, and `levelNumber`

Marty is the active source host. Preserve his short, dry, observant voice from the current source behavior. Do not use future AI content pipeline notes to create new chapters, stories, or dialogue.

### Generation

Use the active generator path as behavioral source:

- `ChapterGenerationService -> LevelGenerationService -> SlidingPuzzleGenerator`
- `XoroShiro128Plus` deterministic randomness
- BFS solver verification through `Solver.ts`
- Movement simulation through `GridSimulation.ts`
- Shape definitions through `data/shapes.ts`

Re-express this behavior as Amino-native Game Layer services and ECS actions. Do not migrate stale citylines road generator files.

### Movement And Completion

Preserve these rules:

- Default board is 6x6.
- Blocks are colored, fixed-orientation polyominoes.
- Swipe direction is dominant axis after a minimum distance of `4` pixels.
- Adjacent-cell hit testing makes touch selection forgiving.
- A block slides until wall or collision.
- A block exits only through a matching-color open dock reached at the wall.
- Successful moves and exits increment `moveCount`.
- Blocked swipes return early without sound, move increment, or analytics.
- Exiting a block closes the dock.
- Level completion happens when all blocks with matching dock colors have exited.
- `blockMoved`, `blockExited`, and `levelComplete` are internal signals/action metadata, not active analytics events.

ECS action ownership is mandatory for rule execution. Pixi only animates ECS-derived state and action metadata.

### Progress

Active legacy source keys:

- `game_progress`
- `game_block_state`
- `game_has_played`
- Audio preferences: `app_master_volume`, `app_music_enabled`, `app_ambient_enabled`, `app_vo_enabled`

Use Amino `Progress` plus a Legacy Progress Adapter. Hydrate ECS from normalized progress. Do not let localStorage directly own gameplay state.

### Analytics

Emit active Daily Dispatch semantics through Amino/Game KIT analytics plumbing:

- `session_start`
- `session_pause`
- `session_resume`
- `session_end`
- `game_start`
- `level_start`
- `level_complete`
- `chapter_start`
- `chapter_complete`
- `audio_setting_changed`, if scaffold settings UI is active

Do not emit stale citylines, inactive cutscene, inactive failure, or block-movement analytics without approval.

### Audio And Timing

Preserve sprite names and trigger meaning:

- SFX: `button_click`, `block_slide`, `block_exit`, `truck_door_close`, `truck_drive_away`, `level_complete`, `chapter_complete`
- Music: `music_1`

Do not make `block_hit_edge`, `eraser`, or `sfx-citylines` active behavior unless an approved exception requires it.

Preserve active source timing values for loading pauses, start delay, companion modal animation, clue popup display/fade, slide and exit animation, dock close, truck close overlay, level complete overlay, and the `Baloo, system-ui, sans-serif` font stack.

## Source Artifacts

Copy these verbatim from an approved Read-Only Legacy Source when implementation reaches asset/content transfer:

- `chapters/index.json`
- `chapters/dispatch-1.json` through `chapters/dispatch-10.json`
- `atlas-tiles-daily-dispatch.json`
- `atlas-branding-wolf.json`
- `vfx-flash_fx_shape_04.json`
- `vfx-mg_glow_09.json`
- `vfx-mg_noglow_01.json`
- `sfx-daily-dispatch.json`
- `music-warehouse-puzzle.json`
- Required original binary files referenced by those metadata files once located

Preserve active frame families for backgrounds, grid, UI, Marty, blocks, docks/trucks, and truck overlay. Bundle names may change to satisfy Amino loader prefixes; source file names and frame names must not be renamed.

## Resolved Discrepancies

- The active generator is `SlidingPuzzleGenerator` through the chapter and level generation services, not the stale road-path generator under `core/LevelGenerator/LevelGenerator.ts`.
- Citylines road, landmark, tuning, audio, and analytics artifacts are stale leftovers for this parity target.
- The active progress key is `game_progress`; `dispatch:progress` is a compatibility question, not an observed active source key.
- Eraser code and tuning exist, but the observed HUD delete button does not trigger eraser behavior.
- Active chapter-end display is levels and moves, not the GDD score formula.
- Chapter `texturePack.packFileKey` values may contain citylines names. Preserve raw JSON, but use the active Daily Dispatch atlas for runtime unless later approval says otherwise.
- Required binary asset/audio files were missing from the inspected legacy `public/assets/` tree. They must be located from an approved Read-Only Legacy Source; regeneration is forbidden.
- `story.funFact` exists in data but is not an active presentation feature. Preserve it but do not display it without approval.

## Exception Watchlist

Pipeline planning and T05 review must resolve or explicitly carry these:

- Missing binary Source Artifacts for atlas PNGs, VFX PNGs, SFX files, and music files.
- Whether to add `dispatch:progress` read compatibility in addition to active `game_progress`.
- Whether the eraser booster remains inactive source semantics or becomes an approved player-visible feature.
- How to implement the truck close swipe overlay with ECS-owned story state and Amino-native Pixi rendering.
- How to implement story reveal/points/article-link presentation and whether any analytics should fire for the article link.
- Whether `story.funFact` remains data-only.
- Whether any citylines support bundle is needed only as a scaffold dependency, not as gameplay behavior.
- Exact Game KIT APIs for progress, analytics, feature flags, Sentry, and data must be verified before implementation wiring.

## First Slice Target

The first playable slice should demonstrate:

- Valid Amino Game Contract with Pixi `gameMode`.
- Verbatim source chapter data and required slice assets represented in the Asset Manifest.
- Chapter loading through Amino-compatible data loading and adapters.
- ECS-owned story phase, chapter/level selection, blocks, docks, grid occupancy, move count, and completion.
- One playable swipe-to-exit loop where a matching block exits through a matching dock, increments move count, closes the dock, triggers active sound metadata, and can complete a level.
- Thin Pixi rendering that observes ECS and animates with GSAP.
- Lightweight runtime validation before the later Validation Ramp.
