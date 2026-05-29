---
game_root: src/game/mygame/
runs_root: pipeline/runs/
package_manager: bun
commands:
  game_scoped_test: bun test src/game/mygame
  full_test: bun test
  typecheck: bun run typecheck
  dev: bun run dev
  dev_url: http://localhost:5173
write_allowlist:
  - src/game/
  - pipeline/runs/
  - pipeline/
write_denylist:
  - src/core/
  - src/modules/
  - cortex/
forbidden_files:
  - package.json
  - bun.lock
  - tsconfig.json
  - vite.config.ts
renderer: pixi
physics_engine: matter
known_scaffold_issues:
  - { pattern: "@tweakpane/core",                        severity: scaffold-dep }
  - { pattern: "importOriginal is not a function",       severity: scaffold-test }
  - { pattern: "Cannot find module .*scaffold-release",  severity: scaffold-script }
  - { pattern: "Cannot find module .*scaffold-sync",     severity: scaffold-script }
  - { pattern: "Cannot find module .*scaffold-drift",    severity: scaffold-script }
  - { pattern: "@wolfgames/components/solid",            severity: scaffold-types }
  - { pattern: "Property 'addFolder' does not exist",    severity: scaffold-dev-tooling }
  - { pattern: "test\\.describe\\(\\) to be called here", severity: scaffold-tests }
  - { pattern: "media.dev.wolf.games",                   severity: scaffold-asset }
  - { pattern: "atlas-branding-wolf",                    severity: scaffold-asset }
notes: |
  This is the html-experiment-pipeline scaffold. Pixi is the primary renderer; matter-js is
  the physics engine. Renderer-purity guardrails (no DOM in `src/game/<slug>/`) apply.
---

# Pipeline Project Context

This file declares the contract `pipeline-build-game` reads at startup. Edit when the scaffold's path/command/issue conventions change. The schema lives at `local/skills/pipeline-build-game/references/project-context-schema.md`.

## Game mount mechanism

The scaffold mounts a **singleton** at `src/game/mygame/`. Two bridge files in `src/game/screens/` hardcode imports from that path:

- `src/game/screens/StartScreen.tsx` imports `setupStartScreen` from `~/game/mygame/screens/startView`.
- `src/game/screens/GameScreen.tsx` imports `setupGame` from `~/game/mygame/screens/gameController`.

There is no dynamic game router and no config-driven mount. **A new game becomes the active game by replacing the contents of `src/game/mygame/`.** The pipeline backs up the prior `mygame/` to `pipeline/runs/<run>/mygame.bak/` before overwriting, so the scaffold's default game is recoverable across runs.

The slug declared in the GDD frontmatter is an **identifier** used in run logs, reports, and the game's exported `setupGame`/`setupStartScreen` metadata — it is NOT a directory name on disk.

> **Conventions covered elsewhere (do not duplicate here):** Bun-only tooling, GPU/DOM split, ECS lifecycle, asset bundle prefixes, and renderer-purity rules live in `.cursor/rules/amino-guardrails.mdc` and `.cursor/rules/project-structure.mdc` — both are auto-loaded into every subagent. This file only declares what is *unique to this scaffold* (mount mechanism, dev URL, known broken tests) or *machine-readable* (frontmatter contract).

## Known scaffold quirks (also enumerated in frontmatter `known_scaffold_issues`)

These pre-exist the pipeline and must NOT be treated as game-DoD failures:

- `tests/unit/mygame-contract.test.ts` uses Vitest's `importOriginal` API, which is broken on this scaffold version.
- `node_modules/tweakpane` peer-dep `@tweakpane/core` is missing.
- `scripts/scaffold-release`, `scripts/scaffold-sync`, `scripts/scaffold-drift` are referenced by tests but not present.
- `src/app.tsx` imports `@wolfgames/components/solid` without declaration files.
- `src/core/dev/bindings.ts` uses `Pane.addFolder` which is typed incorrectly upstream.
- `tests/evaluation/tests/scaffold-smoke.spec.ts` calls Playwright's `test.describe()` outside its expected context.

The Engineer's Wave-2 DoD evaluator filters these via `classifyDoDFailure` — they're recorded as `scaffold_health` events but do not block iteration.
