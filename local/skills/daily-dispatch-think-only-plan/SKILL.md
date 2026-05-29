---
name: daily-dispatch-think-only-plan
description: Produces a plan-only Daily Dispatch parity migration review from pipeline/game-prompt.md. Use for T05 think-only planning before implementation writes; writes only pipeline run artifacts and does not edit game code.
disable-model-invocation: true
---

# Daily Dispatch Think-Only Plan

Use this skill to satisfy the T05 plan-only gate for the Daily Dispatch Amino-Native Parity Migration.

## Inputs

Read these files before writing a plan:

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

Also use the parent orchestration artifacts when available:

- `../CONTEXT.md`
- `../docs/PRD.md`
- `../docs/source-inventory.md`
- `../docs/amino-capability-map.md`
- `../docs/source-derived-parity-spec.md`
- `../docs/adr/0001-amino-nucleo-path.md`
- `../docs/adr/0002-parent-workspace-owns-orchestration.md`
- `../docs/adr/0003-verbatim-source-artifacts.md`
- `../docs/adr/0004-ecs-first-amino-counterparts.md`

## Output

Create one run directory under `pipeline/runs/` named:

```text
run-<NN>-<YYYY-MM-DD>-think-only/
```

Write:

- `think-only-plan.md`
- `run-log.yml`

## Rules

- Do not edit `src/`, `public/`, `tests/`, `package.json`, `bun.lock`, `tsconfig.json`, `vite.config.ts`, `src/core/`, `src/modules/`, `cortex/`, `.cursor/`, or `.claude/`.
- Do not copy Source Artifacts during this skill.
- Do not generate replacement art, audio, chapter content, story text, or style assets.
- Do not run Nucleo lifecycle commands.
- Do not run `pipeline-build-game`.
- Do not start implementation.
- Do not create code snapshots.
- Do not change `pipeline/game-prompt.md`.
- Legacy code is behavioral reference only; do not propose a wholesale folder transplant.
- ECS must be the gameplay state model from the first implementation slice.
- Amino counterparts must replace legacy responsibilities when counterparts exist.

## Plan Requirements

`think-only-plan.md` must include:

1. ADR compliance summary for ADR-0001 through ADR-0004.
2. A batch-by-batch implementation plan for T06 through T14.
3. For each batch: allowed target surfaces, forbidden actions, source references, Amino docs/skills to read, acceptance gates, validation commands, and approval dependencies.
4. Explicit ECS ownership for blocks, docks, grid occupancy, move count, completion, chapter/level state, progress hydration, and Story Phase Resource.
5. Asset transfer plan that preserves source bytes and frame names, with missing binary asset blockers called out.
6. Amino counterpart replacement plan for Catalog, Content Loader, Progress, DialogueBox, AvatarPopup, LevelCompletionController, SpriteButton, CharacterSprite, audio, analytics, tuning, and scaffold services.
7. Exception watchlist for missing binaries, `game_progress` versus `dispatch:progress`, inactive eraser behavior, truck-close overlay, story reveal/article link, `story.funFact`, stale citylines bundles, stale texture-pack keys, and exact Game KIT APIs.
8. A decision for whether T06 is unblocked.

`run-log.yml` must record:

```yaml
task: T05
skill: daily-dispatch-think-only-plan
mode: think-only
status: completed | blocked
created_at: <ISO timestamp>
inputs:
  - pipeline/game-prompt.md
outputs:
  - pipeline/runs/<run>/think-only-plan.md
  - pipeline/runs/<run>/run-log.yml
writes_started: false
implementation_files_changed: false
t06_unblocked: true | false
```
