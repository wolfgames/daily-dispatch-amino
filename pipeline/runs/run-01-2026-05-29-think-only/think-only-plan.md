# T05 Think-Only Plan: Daily Dispatch Amino-Native Parity Migration

Run: `run-01-2026-05-29-think-only`

Mode: think-only. This artifact is a plan gate, not implementation. It does not authorize a normal creative `pipeline-build-game` run, generated replacement assets, wholesale legacy folder transplant, or lifecycle work from the target repository.

## Source Of Truth

Authoritative parent sources:

- `../CONTEXT.md`
- `../docs/PRD.md`
- `../docs/source-inventory.md`
- `../docs/amino-capability-map.md`
- `../docs/source-derived-parity-spec.md`
- `../docs/adr/0001-amino-nucleo-path.md`
- `../docs/adr/0002-parent-workspace-owns-orchestration.md`
- `../docs/adr/0003-verbatim-source-artifacts.md`
- `../docs/adr/0004-ecs-first-amino-counterparts.md`

Target Amino sources:

- `AGENTS.md`
- `vision.md`
- `docs/INDEX.md`
- `docs/cortex-inventory.md`
- `docs/guides/new-game.md`
- `docs/guides/state-architecture.md`
- `docs/guides/shared-components.md`
- `docs/recipes/manifest-contract.md`
- `docs/standards/best-practices.md`
- `docs/standards/guardrails.md`
- `pipeline/project.md`
- `pipeline/game-prompt.md`

## ADR Compliance Summary

### ADR-0001: Amino/Nucleo Path

Compliant route:

- Parent orchestration owns Nucleo lifecycle, task dispatch, Build, Release, Provision, and final judging.
- Target repository work proceeds only as target-local Amino Pipeline Tasks that follow Amino docs, Game Contract, ECS, Asset Manifest loaders, shared modules, Game Layer services, and Game KIT plumbing.
- T06 through T14 must not run Nucleo lifecycle commands from the target repo.
- T06 through T14 must not run a normal creative `pipeline-build-game` pass. Any target worker must receive a narrow parity task brief derived from this T05 plan and `pipeline/game-prompt.md`.

### ADR-0002: Parent Workspace Owns Orchestration

Compliant route:

- Parent artifacts remain authoritative for PRD, ADRs, source inventory, capability map, parity spec, task decomposition, and orchestration.
- Target repo owns only implementation and target-local pipeline run artifacts.
- Target workers may read parent artifacts for context but must not move orchestration state into the target repo.
- Target workers must report blockers back to parent rather than resolving lifecycle or source-authority decisions locally.

### ADR-0003: Reuse Source Artifacts Verbatim

Compliant route:

- Chapter JSON, atlas metadata, VFX metadata, audio sprite metadata, and any located binary files are copied from an approved Read-Only Legacy Source without byte edits.
- Source file names, atlas frame names, narrative text, seeds, UIDs, URLs, audio sprite names, and timing meaning are preserved.
- Target Asset Manifest bundle names may change only to satisfy Amino loader prefixes.
- Missing binary PNG/audio files block complete asset parity; they must be located from Git LFS, CDN export, or another approved Read-Only Legacy Source. Replacement generation is forbidden.

### ADR-0004: ECS-First Amino Counterparts

Compliant route:

- ECS exists in the first implementation slice and owns gameplay state before player interaction is wired.
- Legacy algorithms are re-expressed as Amino-native Game Layer services and ECS actions, not transplanted as the target architecture.
- Amino counterparts replace legacy Catalog, Content Loader, Progress, DialogueBox, AvatarPopup, LevelCompletionController, SpriteButton, CharacterSprite, audio manager base, analytics plumbing, tuning, and scaffold service responsibilities when available.
- Exceptions require explicit approval and must be carried in the run artifact that touches them.

## Sequential Route

Run T06 through T14 sequentially. Do not parallelize implementation batches that touch the same Game Contract, ECS plugin, manifest, or source artifact boundary. Each batch should write a target-local run log under `pipeline/runs/`, name the source references it used, and record whether it modified implementation files.

Validation should ramp from lightweight to comprehensive:

1. T06-T08 prove Amino-native shape and deterministic core rules.
2. T09-T11 connect visible/runtime services while preserving ECS ownership.
3. T12 resolves complete Source Artifact transfer and manifest validation.
4. T13-T14 harden with tests, side-by-side parity, and release readiness.

## Batch Plans

### T06: ECS-First Vertical Slice Foundation

Goal: establish the narrowest Amino-native, ECS-first target structure that can support a later playable slice without invoking creative generation.

Allowed target surfaces:

- `src/game/` only, including `src/game/mygame/`, screens, game config, tuning, audio shell, manifest shell, and state bridge.
- `public/assets/` only for verbatim Source Artifact copies approved for this batch.
- `pipeline/runs/<t06-run>/` for worker log and blocker report.

Forbidden actions:

- Do not edit `src/core/`, `src/modules/`, `cortex/`, `.cursor/`, `.claude/`, package files, Vite/TS config, parent artifacts, `pipeline/game-prompt.md`, `advance-daily-dispatch/`, or `template-amino/`.
- Do not run Nucleo lifecycle commands.
- Do not run `pipeline-build-game`.
- Do not generate replacement art, audio, story, style, or placeholder gameplay content.
- Do not expose eraser as active behavior, add `dispatch:progress` compatibility, or implement article-link analytics without approval.

Source references:

- Parent: `docs/source-derived-parity-spec.md`, `docs/amino-capability-map.md`, `docs/source-inventory.md`, ADR-0001 through ADR-0004.
- Legacy behavior references: `gameController.ts`, `DailyDispatchGame.ts`, `GridSimulation.ts`, `SwipeDetector.ts`, `Block.ts`, `Dock.ts`, `chapterCatalog.ts`, `chapterLoader.ts`, `progress.ts`, active audio/tuning references.
- Source Artifacts: chapter catalog/files and active atlas/audio/VFX metadata listed in the parity spec.

Amino docs/skills to read:

- `docs/guides/new-game.md`
- `docs/guides/state-architecture.md`
- `docs/guides/shared-components.md`
- `docs/recipes/manifest-contract.md`
- `docs/standards/best-practices.md`
- `docs/standards/guardrails.md`
- `.cursor/skills/daily-dispatch-think-only-plan/SKILL.md` as the T05 source
- Relevant Amino game-contract, asset-manifest, and renderer guardrail skills if opened by the target worker.

Acceptance gates:

- Amino Game Contract remains valid with `loading`, `start`, `game`, and `results` screens.
- `setupStartScreen` and `setupGame` enter through the target mount path described by `pipeline/project.md`.
- Gameplay declares Pixi mode.
- A Daily Dispatch ECS plugin boundary exists before interaction logic, with resources/entities/actions planned in code for story phase, chapter/level identity, blocks, docks, grid occupancy, move count, completion, and progress hydration.
- Any copied Source Artifacts are byte-preserving copies with original file names and frame/sprite names untouched.
- Missing binary Source Artifacts are reported as blockers, not replaced.

Validation commands:

- `bun run typecheck`
- `bun test src/game/mygame`
- `bun run check:manifest` if the manifest is edited
- `bun run check:assets` if assets are copied

Approval dependencies:

- Required before complete visual parity: approved Read-Only Legacy Source location for missing binaries.
- Required before expanding behavior: explicit approval for eraser, `dispatch:progress`, article-link analytics, and any citylines support bundle.

### T07: Deterministic Generation And Pure Simulation

Goal: translate the active Daily Dispatch generation and movement reference into Amino-native Game Layer services that can feed ECS deterministically.

Allowed target surfaces:

- `src/game/mygame/` Game Layer services, data adapters, pure utilities, and tests.
- `pipeline/runs/<t07-run>/`.

Forbidden actions:

- Do not copy the legacy folder structure wholesale.
- Do not import stale citylines road-path generation.
- Do not hard-code generated levels in place of deterministic generation.
- Do not mutate Source Artifact JSON to fit target types.

Source references:

- `ChapterGenerationService.ts`
- `LevelGenerationService.ts`
- `SlidingPuzzleGenerator.ts`
- `XoroShiro128Plus.ts`
- `Solver.ts`
- `GridSimulation.ts`
- `data/shapes.ts`
- `types/level.ts`, `types/block.ts`, `types/dock.ts`, `types/grid.ts`

Amino docs/skills to read:

- `docs/guides/state-architecture.md`
- `docs/standards/guardrails.md`
- `docs/standards/best-practices.md`
- AIDD ECS guidance if modifying ECS plugin/action code.

Acceptance gates:

- Chapter adapter reads copied chapter JSON without altering source fields.
- Generator uses per-level seeds and produces stable output for the same seed.
- Pure simulation preserves 6x6 grid, fixed-orientation polyominoes, matching dock exits, wall/collision stops, dock closing, and solver-derived `optimalMoves`.
- Stale citylines generator files are not referenced as active behavior.

Validation commands:

- `bun test src/game/mygame`
- Targeted unit tests for seeded generation, movement simulation, solver verification, and shape footprints.
- `bun run typecheck`

Approval dependencies:

- None for active generator translation.
- Approval required if a worker proposes changing generation rules, difficulty progression, or level count semantics.

### T08: ECS Actions, Resources, And Progress Boundaries

Goal: make ECS the authoritative owner for gameplay state and turn execution.

Allowed target surfaces:

- `src/game/mygame/` ECS plugin, actions, transactions, computed values, adapter boundaries, tests.
- `src/game/state.ts` only as an ECS-to-Solid screen bridge.
- `pipeline/runs/<t08-run>/`.

Forbidden actions:

- Do not let SolidJS signals or localStorage own gameplay rules.
- Do not let Pixi renderers decide movement legality, completion, or dock state.
- Do not add unapproved eraser or `dispatch:progress` behavior.

Source references:

- `GridSimulation.ts`, `DailyDispatchGame.ts`, `SwipeDetector.ts`, `progress.ts`, `gameController.ts`.
- Parent ECS ownership in `docs/amino-capability-map.md`.

Amino docs/skills to read:

- `docs/guides/state-architecture.md`
- `docs/guides/shared-components.md`
- `docs/standards/guardrails.md`
- ECS state rule from `docs/cortex-inventory.md`.

Acceptance gates:

- `swipeBlock(blockId, direction)` owns movement, collision, exit, dock closing, move increment, blocked-swipe no-op, completion check, and returned animation/audio metadata.
- `initChapter`, `initLevel`, `advanceStoryPhase`, `completeLevel`, `completeChapter`, `hydrateProgress`, and `snapshotProgress` boundaries exist.
- Computed values expose level completion, chapter progress, move delta, remaining blocks, and open docks.
- Progress hydration enters ECS from normalized adapter data; snapshotting leaves ECS through the adapter boundary.

Validation commands:

- `bun test src/game/mygame`
- `bun run typecheck`
- Unit tests for successful slide, blocked swipe, matching exit, mismatched dock stop, dock close, level complete, progress hydrate/snapshot.

Approval dependencies:

- Approval required before implementing eraser action as player-visible.
- Approval required before reading `dispatch:progress` in addition to `game_progress`.

### T09: Pixi Gameplay Renderer And Input Loop

Goal: render and animate ECS-derived state with Pixi while keeping rules in ECS.

Allowed target surfaces:

- `src/game/mygame/` renderers, input handlers, animation helpers, thin controller orchestration, HUD wrappers.
- `src/game/audio/` active sound methods if action metadata needs playback methods.
- `src/game/tuning/` active timing defaults.
- `pipeline/runs/<t09-run>/`.

Forbidden actions:

- No DOM gameplay inside `src/game/mygame/`.
- No second renderer, raw canvas, Phaser, or direct canvas APIs.
- No object allocation in hot ticks.
- No orphaned GSAP tweens or event listeners.
- No placeholder rectangles as shipped visuals.

Source references:

- `DailyDispatchGame.ts`, `Block.ts`, `Dock.ts`, `SwipeDetector.ts`, active tuning timing values, active atlas frame families.

Amino docs/skills to read:

- `docs/standards/best-practices.md`
- `docs/standards/guardrails.md`
- `docs/guides/shared-components.md`
- `docs/recipes/manifest-contract.md`
- Renderer guardrail skill if opened by the worker.

Acceptance gates:

- Pixi renderer observes ECS entities/resources and applies GSAP animation from ECS action metadata.
- Swipe input uses minimum `4px` dominant-axis logic and adjacent-cell forgiving hit tests.
- Successful move/exits trigger active sound metadata; blocked swipes do not trigger sound, move increment, or analytics.
- Dock close animation preserves active timing meaning.
- Destroy order kills tweens, removes listeners, removes from scene graph, and destroys children.

Validation commands:

- `bun run typecheck`
- `bun test src/game/mygame`
- `bun run dev` plus manual browser smoke at `http://localhost:5173`
- Optional renderer guardrail audit if available.

Approval dependencies:

- Requires enough original binary assets to avoid placeholders for visible parity. If binaries remain missing, T09 may stop after non-visual logic/render wiring and record blocker.

### T10: Story, Chapter Flow, And Completion Counterparts

Goal: reproduce Daily Dispatch chapter/story flow with ECS phase ownership and Amino counterparts for presentation pieces.

Allowed target surfaces:

- `src/game/mygame/` story adapters, phase orchestration, completion controller integration, Pixi overlay renderers, wrappers for shared modules.
- `src/game/screens/` only for valid Amino screen shells.
- `src/game/tuning/` story and overlay timing defaults.
- `pipeline/runs/<t10-run>/`.

Forbidden actions:

- Do not rewrite narrative text.
- Do not display `story.funFact` without approval.
- Do not emit `story_link_click` analytics without approval.
- Do not use legacy DialogueBox/AvatarPopup implementations when Amino counterparts can be wrapped.

Source references:

- `gameController.ts`
- `startView.ts`
- `CluePopup.ts`
- legacy `AvatarPopup.ts`
- `LevelCompleteOverlay.ts`
- `TruckCloseOverlay.ts`
- `LevelPointsOverlay.ts`
- companion config/dialogue files
- chapter JSON story fields.

Amino docs/skills to read:

- `docs/guides/shared-components.md`
- `docs/guides/state-architecture.md`
- `docs/standards/best-practices.md`
- `docs/standards/guardrails.md`

Acceptance gates:

- ECS `storyPhase` owns `introduction`, `loading-puzzle`, `chapter-start`, `playing`, and `chapter-end`.
- Shared `DialogueBox`, `AvatarPopup`, `CharacterSprite`, `SpriteButton`, and `LevelCompletionController` are used or wrapped where counterpart behavior fits.
- Game-specific Pixi overlays are used only for approved no-counterpart behaviors such as truck close and story reveal.
- Marty voice and copied story text are preserved without generated content.

Validation commands:

- `bun run typecheck`
- `bun test src/game/mygame`
- Runtime smoke through introduction, first level start, clue popup, chapter-end path where feasible.

Approval dependencies:

- Approval required for truck-close overlay implementation details if not already approved by the orchestrator.
- Approval required for story reveal/article-link analytics semantics.
- Approval required before displaying `story.funFact`.

### T11: Progress, Audio, Analytics, Tuning, And Game KIT Wiring

Goal: replace legacy services with Amino/Game KIT counterparts while preserving active Daily Dispatch semantics.

Allowed target surfaces:

- `src/game/mygame/` adapters and service wrappers.
- `src/game/audio/`
- `src/game/tuning/`
- `src/game/state.ts` bridge only.
- `pipeline/runs/<t11-run>/`.

Forbidden actions:

- Do not reimplement scaffold services already provided by Amino.
- Do not guess exact Game KIT APIs; verify them in target docs or `repos/game-kit/` first.
- Do not emit stale citylines, cutscene, failure, restart, or block movement analytics.

Source references:

- `progress.ts`
- `startScreenHelper.ts`
- scaffold audio preference keys
- `analytics/index.ts`
- `analytics/trackers.ts`
- `sounds.ts`
- `manager.ts`
- active tuning defaults.

Amino docs/skills to read:

- `docs/guides/shared-components.md`
- `docs/guides/new-game.md`
- `docs/INDEX.md` Game KIT routing
- Game KIT API reference in `repos/game-kit/` before wiring exact calls.

Acceptance gates:

- Amino `Progress` module plus Legacy Progress Adapter reads `game_progress`, `game_block_state`, and `game_has_played`, then hydrates ECS.
- Optional `dispatch:progress` read compatibility is absent unless approved.
- `GameAudioManager` extends Amino `BaseAudioManager` and maps only active sprite names: `button_click`, `block_slide`, `block_exit`, `truck_door_close`, `truck_drive_away`, `level_complete`, `chapter_complete`, `music_1`.
- Legacy Analytics Adapter emits only active event semantics through Amino/Game KIT analytics plumbing.
- Tuning contains active Daily Dispatch timing/visual values and avoids stale citylines tuning as active behavior.

Validation commands:

- `bun run typecheck`
- `bun test src/game/mygame`
- Targeted adapter tests for progress migration and analytics event filtering.

Approval dependencies:

- Approval required for `dispatch:progress`, eraser sound activation, article-link analytics, and any inactive analytics event.
- Exact Game KIT APIs must be verified before implementation commits to names/signatures.

### T12: Complete Verbatim Asset And Content Transfer

Goal: finish Source Artifact transfer and manifest registration without renaming source files, frame names, or sprite names.

Allowed target surfaces:

- `public/assets/` for copied source files.
- `src/game/asset-manifest.ts` or equivalent target manifest file.
- `pipeline/runs/<t12-run>/`.

Forbidden actions:

- Do not regenerate missing binary assets.
- Do not rename atlas frame names or audio sprite names.
- Do not edit copied chapter JSON to normalize it in place.
- Do not migrate stale citylines gameplay assets except approved support-only dependencies.

Source references:

- `advance-daily-dispatch/public/chapters/index.json`
- `dispatch-1.json` through `dispatch-10.json`
- `atlas-tiles-daily-dispatch.json` and PNG
- `atlas-branding-wolf.json` and PNG
- active VFX JSON/PNGs
- `sfx-daily-dispatch.json`, MP3/WebM
- `music-warehouse-puzzle.json`, MP3
- source inventory active frame and sprite names.

Amino docs/skills to read:

- `docs/recipes/manifest-contract.md`
- `docs/standards/best-practices.md`
- `docs/standards/guardrails.md`
- Amino asset-manifest skill if opened by the worker.
- Game asset validation utilities if needed for dimension/frame inspection.

Acceptance gates:

- Data bundle uses `data-*` for chapter catalog and chapter files or an approved Game KIT data path.
- Gameplay atlas uses `scene-*`; in-game UI uses `core-*` or the same GPU-visible scene bundle.
- Active VFX uses `fx-*`.
- SFX/music use `audio-*`.
- Branding uses `theme-*` only when DOM/loading; Pixi usage must be GPU-visible.
- All copied artifacts are byte-preserving source copies with file names and frame/sprite names unchanged.
- Missing binaries are either resolved from an approved source or carried as explicit blockers.

Validation commands:

- `bun run check:manifest`
- `bun run check:assets`
- `bun run typecheck`
- Runtime asset load smoke when binaries are available.

Approval dependencies:

- Approved Read-Only Legacy Source for missing binaries.
- Approval for any stale/support citylines bundle, `vfx-rotate`, `vfx-blast`, or source naming exception beyond manifest bundle names.

### T13: Validation Ramp And Side-By-Side Parity

Goal: harden the operational build with tests and runtime checks after the Amino-native implementation is in place.

Allowed target surfaces:

- `tests/` or target-approved test surfaces.
- `src/game/mygame/` only for bug fixes found by validation.
- `pipeline/runs/<t13-run>/`.

Forbidden actions:

- Do not broaden scope into redesign or polish unrelated to parity failures.
- Do not accept test baselines that encode placeholders or generated replacement assets.
- Do not treat known scaffold quirks from `pipeline/project.md` as game DoD failures.

Source references:

- Parent parity spec behavior requirements.
- Legacy active behavior sources for golden comparisons.
- Prior T06-T12 run logs.

Amino docs/skills to read:

- `docs/standards/guardrails.md`
- `docs/standards/best-practices.md`
- `docs/guides/state-architecture.md`
- Playwright/testing skill if E2E or visual checks are added.

Acceptance gates:

- Unit coverage exists for deterministic generator, movement/action rules, ECS completion, progress adapter, analytics filter, and chapter adapter.
- Runtime smoke proves loading/start/game/results contract, one matching block exit, move increment, dock close, completion path, and progress snapshot.
- Side-by-side checklist compares story order, active timing meaning, frame/sprite names, audio trigger meaning, and active analytics event meaning.
- Known scaffold issues are classified separately from migration failures.

Validation commands:

- `bun test src/game/mygame`
- `bun test`
- `bun run typecheck`
- `bun run check:manifest`
- `bun run check:assets`
- `bun run dev` plus browser smoke
- E2E/visual commands if present in target package.

Approval dependencies:

- Approval required for any parity waiver.
- Approval required before treating a missing binary as non-blocking for release-quality visual parity.

### T14: Final Migration Report And Release Readiness Handoff

Goal: produce a final target-local report that proves Amino-native compliance, parity status, and remaining operational decisions before parent orchestration queues Build/Release.

Allowed target surfaces:

- `pipeline/runs/<t14-run>/`
- Target-local docs/report only if parent approves a stable target-report path.
- Implementation files only for final bug fixes discovered during T14 validation.

Forbidden actions:

- Do not run Nucleo Build, Release, Provision, or Publish from the target repo.
- Do not commit or push unless the parent/user explicitly requests it.
- Do not hide exceptions or missing Source Artifacts.

Source references:

- All prior run logs T05-T13.
- Parent parity spec and ADRs.
- Target validation outputs.

Amino docs/skills to read:

- `docs/INDEX.md`
- `docs/standards/guardrails.md`
- `docs/recipes/manifest-contract.md`
- Pipeline report/improve skills only as reporting tools, not creative rebuild tools.

Acceptance gates:

- Final report lists implementation surface, Source Artifact status, ECS ownership proof, Amino counterpart usage, exception decisions, validation command results, known scaffold issues, and release blockers.
- T14 states whether the parent can safely queue Nucleo Build/Release next.
- Any remaining blocker is classified as asset-source, API-specific, parity-waiver, scaffold-health, or implementation-bug.

Validation commands:

- Repeat T13 validation set.
- Any additional target release-readiness command defined by parent orchestration.

Approval dependencies:

- Parent approval required before Nucleo Build/Release/Provision.
- User/orchestrator approval required for any open exception waiver.

## ECS Ownership

ECS must be present before the first playable interaction and must own the following:

- Blocks: ECS `Block` entities/archetypes own UID, color, shape offsets, grid origin, exited flag, selectable/interactable status, and sprite/frame key. Pixi sprites are views of these entities.
- Docks: ECS `Dock` entities/archetypes own UID, color, wall side/index, open/closed state, and truck frame keys. Dock close is a state change returned with animation metadata.
- Grid occupancy: ECS transactions/actions own occupancy reconstruction and replacement from block/dock/wall entities. Pure helpers may calculate candidate movement, but ECS action boundaries commit the result.
- Move count: ECS resources own `moveCount`, `totalMoves`, `optimalMoves`, and `moveDelta`. Successful moved/exited slides increment move count; blocked swipes do not.
- Completion: ECS computed/action state owns `isLevelComplete`, `levelCompletionState`, `chapterProgress`, `remainingBlocks`, and `openDocks`. Shared `LevelCompletionController` may orchestrate timing, but not source-of-truth completion.
- Chapter/level state: ECS resources own chapter UID/index/count, level UID/index/count, current clue/headline/article references, level seed, chapter totals, and all-done terminal state if approved.
- Progress hydration: `hydrateProgress(progress)` writes normalized adapter state into ECS. `snapshotProgress()` reads ECS into an Amino Progress payload. localStorage and legacy keys never own live gameplay state directly.
- Story Phase Resource: ECS resource `storyPhase` owns `introduction`, `loading-puzzle`, `chapter-start`, `playing`, `chapter-end`, and any approved terminal state. Presentation-only animation substates may stay renderer/controller local.

## Asset Transfer Plan

Principles:

- Copy Source Artifacts only from an approved Read-Only Legacy Source.
- Preserve bytes, source file names, chapter JSON, narrative text, UIDs, seeds, atlas frame names, VFX animation keys, and audio sprite names.
- Do not edit copied JSON to adapt it. Create derived runtime adapters in `src/game/` when needed.
- Rebucket only target Asset Manifest bundle names to match Amino loader prefixes.
- Do not generate replacement assets/audio/content/style.

Transfer order:

1. Copy chapter catalog and ten chapter JSON files into a target asset/data location, preserving file bytes.
2. Copy active atlas/audio/VFX JSON metadata exactly.
3. Locate and copy original binary assets referenced by metadata from Git LFS, CDN export, or another approved Read-Only Legacy Source.
4. Register loader-correct bundles:
   - `data-*`: chapter catalog and chapter files, unless an approved Game KIT data path replaces local data loading.
   - `scene-*`: `atlas-tiles-daily-dispatch.json` and PNG for gameplay backgrounds, blocks, docks, Marty, UI frames used in Pixi, and truck frames.
   - `core-*`: in-game UI atlas separation only if the target splits UI from scene while preserving source files/frames.
   - `fx-*`: active VFX metadata and PNGs.
   - `audio-*`: `sfx-daily-dispatch.json`, SFX audio binaries, `music-warehouse-puzzle.json`, and music binary.
   - `theme-*`: `atlas-branding-wolf` only for DOM/loading branding; any Pixi use requires GPU-visible bucket.
5. Run manifest and asset validation after every manifest or asset transfer batch.

Missing binary blockers:

- `atlas-tiles-daily-dispatch.png`
- `atlas-branding-wolf.png`
- `vfx-rotate.png` if approved/needed
- `vfx-blast.png` if approved/needed
- `vfx-flash_fx_shape_04.png`
- `vfx-mg_glow_09.png`
- `vfx-mg_noglow_01.png`
- `sfx-daily-dispatch.webm`
- `sfx-daily-dispatch.mp3`
- `music-warehouse-puzzle.mp3`
- `sfx-citylines.webm` and `sfx-citylines.mp3` only if an approved support-only dependency needs them.

## Amino Counterpart Replacement Plan

- Catalog: replace legacy `chapterCatalog.ts` with Amino `Catalog` logic module using a Daily Dispatch chapter entry type. Preserve order, UID, URL, publish date, and current/next semantics.
- Content Loader: replace legacy `chapterLoader.ts` with Amino `Content Loader` plus a Daily Dispatch adapter. Adapter normalizes source data for gameplay without mutating copied JSON.
- Progress: replace legacy `progress.ts` and direct key reads with Amino `Progress` plus Legacy Progress Adapter. Read `game_progress`, `game_block_state`, and `game_has_played`; add `dispatch:progress` only with approval.
- DialogueBox: replace legacy dialogue rendering with shared `DialogueBox` primitive wrapped with Daily Dispatch atlas, `ui-dialogue.png`, font, and positioning.
- AvatarPopup: replace legacy `AvatarPopup`/`CluePopup` with shared `AvatarPopup` prefab wrapped with Marty popup frame, dialogue sprite, and timing config.
- LevelCompletionController: use shared logic controller for `playing -> completing -> complete`, clue timing, continue events, and completion callbacks; ECS remains source of completion truth.
- SpriteButton: use shared `SpriteButton` for start/HUD/continue/delete/restart/audio buttons when rendered in Pixi. Delete button action remains inactive unless eraser is approved.
- CharacterSprite: use shared `CharacterSprite` with Marty frame map wrapper for `talking`, `surprised`, `thumbsup`, `idle`, and `popup` frames.
- Audio: implement target `GameAudioManager` extending Amino `BaseAudioManager`; active methods map to preserved sprite names and mobile audio unlock remains scaffold-owned.
- Analytics: implement Legacy Analytics Adapter over Amino/Game KIT/PostHog plumbing. Emit only active Daily Dispatch events and parameters unless approved.
- Tuning: move active Daily Dispatch timing/visual constants into Amino game tuning defaults and optional tuning registry paths. Exclude stale citylines tuning from active behavior.
- Scaffold services: use Amino providers for assets, audio, pause, viewport, feature flags, Sentry, identity, and tuning. Do not reimplement these services in Game Layer.

## Exception Watchlist

- Missing binaries: complete visual/audio parity is blocked until original PNG/audio binaries are located from an approved Read-Only Legacy Source. Do not regenerate.
- `game_progress` versus `dispatch:progress`: active source uses `game_progress`; `dispatch:progress` remains optional compatibility and requires approval.
- Inactive eraser behavior: eraser code/tuning/audio metadata exists, but the active HUD delete button does not trigger it. Preserve inactive semantics until approved.
- Truck-close overlay: no exact shared counterpart. Implement as game-specific Amino Pixi renderer only after approval; ECS owns phase transition.
- Story reveal/article link: no exact shared counterpart. Implement presentation through approved game-specific UI/renderer; article-link analytics require approval because active `story_link_click` is stale.
- `story.funFact`: preserve in copied JSON but do not display without approval.
- Stale citylines bundles: exclude citylines road/landmark behavior. Include only dependency-minimal support assets if implementation proves a target dependency and approval is granted.
- Stale texture-pack keys: chapter `texturePack.packFileKey` values may mention citylines. Preserve raw JSON; adapter selects active Daily Dispatch atlas unless approved otherwise.
- Exact Game KIT APIs: verify target API references before wiring progress, analytics, feature flags, Sentry, identity, or data services.

## T06 Unblocked Decision

Decision: T06 is unblocked for a narrow, sequential Amino Pipeline Task route.

T06 is not unblocked for a normal `pipeline-build-game` creative run, a broad rewrite, a source folder transplant, or an asset-generation workaround. It is unblocked only because the first worker can preserve the Amino/Nucleo Path by executing a constrained target-local parity implementation task that creates the ECS-first foundation and stops on unresolved Source Artifact blockers.

Exact constraints for the T06 worker:

- Run in the target repo `daily-dispatch-amino`.
- Read this T05 plan, `pipeline/game-prompt.md`, target `AGENTS.md`, `vision.md`, `docs/INDEX.md`, `docs/guides/new-game.md`, `docs/guides/state-architecture.md`, `docs/guides/shared-components.md`, `docs/recipes/manifest-contract.md`, `docs/standards/best-practices.md`, `docs/standards/guardrails.md`, and parent ADR/spec artifacts before edits.
- Use only a narrow target-local Amino Pipeline Task brief. Do not invoke `pipeline-build-game` and do not ask creative personas to reinterpret Daily Dispatch.
- Preserve the existing Nucleo-created target repository. Do not run Nucleo lifecycle commands.
- Write only implementation surfaces needed for the first ECS-first foundation: `src/game/`, approved verbatim Source Artifact copies under `public/assets/`, and the T06 run log/artifact under `pipeline/runs/`.
- ECS plugin/resources/actions must exist before any gameplay interaction is considered acceptable.
- Any asset/content transfer must be verbatim from an approved Read-Only Legacy Source. Missing binaries must be logged as blockers. No placeholders, regenerated art, regenerated audio, or rewritten chapter/story data.
- Use Amino counterparts where available from the first slice. If a counterpart does not fit parity, record the exception and stop for approval before inventing a custom replacement.
- Keep eraser inactive, do not read `dispatch:progress`, do not emit article-link analytics, and do not include citylines support bundles unless the parent/orchestrator approves the exception.
- Run only local target validation commands appropriate to the touched surfaces and summarize known scaffold issues separately.

Rationale: This gives the migration a safe first implementation slice that validates the target Amino Game Contract and ECS ownership without bypassing Nucleo/Amino boundaries or inviting a creative rebuild.
