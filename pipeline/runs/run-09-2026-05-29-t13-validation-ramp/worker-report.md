# T13 — Validation Ramp Worker Report

## Scope

T13 added validation for the Amino-native Daily Dispatch parity migration without changing legacy source, template source, deployment state, or source asset names. The T12 local asset-resolution fix is preserved: `src/app.tsx` continues to use `ManifestProvider`, and `src/game/asset-manifest.ts` continues to resolve local `public/` files through `cdnBase: "."` and `localBase: "."`.

## Files Changed

- `tests/unit/mygame/daily-dispatch-generator.test.ts`
  - Adds focused generator seed-output coverage for source seeds `42001` and `42002`.
  - Adds a level-service adapter test that loads source chapter JSON through the catalog/content-loader path and asserts ECS-ready output preserves story text, seed, clue text, sprite frame mapping, and dock frame mapping.
- `pipeline/runs/run-09-2026-05-29-t13-validation-ramp/runtime-smoke-check.md`
  - Documents a repeatable runtime smoke/E2E check for orchestrator execution.
  - Explicitly forbids Playwright routing or request interception that hides CDN failures.
  - Covers boot, one-canvas Pixi runtime, first interaction, level completion, story continuation, reload resume, debug state, progress keys, and zero `media.*.wolf.games` requests.
- `pipeline/runs/run-09-2026-05-29-t13-validation-ramp/golden-master-candidates.md`
  - Records Golden Master candidates for source chapter JSON/seeds, first-level completion path, story phase sequence, reload progress shape, active analytics events, local asset request behavior, and screenshot targets.
- `pipeline/runs/run-09-2026-05-29-t13-validation-ramp/worker-report.md`
  - This report.

## Validation Added

Existing focused Daily Dispatch tests already covered movement/action rules, ECS boundaries, progress adapter, analytics adapter, audio mapping, and story catalog/content loader counterpart usage. T13 added the missing generator seed-output coverage and strengthened the catalog/content loader adapter validation at the generated-level boundary.

Focused coverage now includes:

- generator seed outputs for `42001` and `42002`
- source chapter JSON to generated `DailyDispatchLoadLevelInput`
- movement/action rules and completion boundaries
- eraser action boundary
- progress adapter read/save/resume shape
- analytics adapter active-event mapping and stale-event omissions
- chapter catalog/content loader counterpart behavior
- audio cue mapping

## Commands And Results

```powershell
bun run test:run tests/unit/mygame/daily-dispatch-generator.test.ts
```

Result: passed, 2 tests.

```powershell
bun run test:run tests/unit/mygame/daily-dispatch-audio.test.ts tests/unit/mygame/daily-dispatch-plugin.test.ts tests/unit/mygame/daily-dispatch-story-counterparts.test.ts tests/unit/mygame/daily-dispatch-progress-analytics.test.ts tests/unit/mygame/daily-dispatch-generator.test.ts
```

Result: passed, 5 files / 15 tests.

```powershell
bun run test:run
```

Result: failed in known scaffold/package baseline areas, while all Daily Dispatch `tests/unit/mygame/*` tests passed.

Failure classification:

- Known scaffold/package baseline: `tests/unit/scripts/*` import `bun:test`, which Vitest cannot resolve.
- Known scaffold/package baseline: `tests/unit/assets/facade*.test.ts` mocks `@wolfgames/components/core` without the current `createDomLoader` export expected by `src/core/systems/assets/facade.ts`.
- Known scaffold/package baseline: unmanaged `@adobe/data` persistent cache assumes `globalThis.caches.open` in a full-suite path.
- No migration-owned T13 failure found in the Daily Dispatch focused suite.

```powershell
bun run typecheck
```

Result: failed on known scaffold/package baseline errors.

Failure classification:

- Package/type baseline: `@ark/util` references `buffer.File`; `@wolfgames/game-kit` references `node:fs`; `tweakpane` types reference missing `@tweakpane/core`; duplicate global `content` identifiers.
- Scaffold baseline: Tweakpane `Pane.addFolder`, scaffold analytics tracker param types, Solid `JSX` namespace / `Show` call signatures, tuning store setter types, and core button handler typing.
- No `src/game/mygame`, `src/game/asset-manifest`, or T13 test regression was identified in the output.

```powershell
bun run build
```

Result: passed. Vite emitted only non-blocking chunk-size and dynamic/static Tweakpane import warnings.

```powershell
bun run check:manifest
```

Result: passed. Manifest is valid with 9 bundles and GC validation.

```powershell
bun run check:assets
```

Result: failed on known scaffold baseline naming violations. The failing list is default/template asset names such as `block-obstacle-*`, `eigen-*`, `fonts\Baloo-*`, `vfx\effects\default.json`, and outline SVG/preview HTML files. Daily Dispatch copied source artifacts were not renamed because ADR-0003 requires preserving source artifact bytes and names.

## Guardrail Checks

Search checks run:

- `GameManifestProvider|media\..*wolf\.games|route\(`
- `requestAnimationFrame|from ['"]react['"]|from ['"]preact['"]|new Howl|HTMLAudioElement|document\.createElement`
- `canvas\.getContext|getContext\(|createElement\('canvas'\)|<canvas`
- `TODO|placeholder|stub` in `src/game/mygame`

Result:

- No runtime `GameManifestProvider` usage found in `src/app.tsx`.
- `media.*.wolf.games` and old routed-CDN references appear only in historical pipeline reports and the new T13 docs that explicitly forbid masking CDN failures.
- `document.createElement` appears only in `src/game/mygame/screens/startView.ts`, which is the allowed DOM start-screen shell.
- No React/Preact imports, direct Howler/HTMLAudio use, direct canvas access, or placeholder/TODO/stub markers found in `src/game/mygame`.

## Runtime Smoke/E2E

Runtime smoke was documented for orchestrator execution at:

```text
pipeline/runs/run-09-2026-05-29-t13-validation-ramp/runtime-smoke-check.md
```

The documented check covers boot, first interaction, seed `42001` level completion, story continuation to seed `42002`, reload resume, local progress keys, analytics/audio debug state, and zero `media.*.wolf.games` requests. It intentionally does not use Playwright request routing.

## Golden Master Candidates

Golden Master candidates were recorded at:

```text
pipeline/runs/run-09-2026-05-29-t13-validation-ramp/golden-master-candidates.md
```

The candidates include source chapter JSON/seeds, deterministic first-level output, first-level solver path, story phase sequence, reload progress shape, active analytics event list, local asset request behavior, and screenshot targets.

## Remaining Known Blockers

- Full `bun run test:run` remains blocked by scaffold/package test harness issues outside the Daily Dispatch migration layer.
- Full `bun run typecheck` remains blocked by scaffold/package type baseline issues outside the Daily Dispatch migration layer.
- `bun run check:assets` remains blocked by known scaffold baseline file naming violations. Source artifacts should not be renamed for this migration.
- Runtime smoke is documented for orchestrator execution but was not re-run by this worker.

## Readiness

T13 is ready for orchestrator verification. The migration-owned validation ramp is in place, focused Daily Dispatch tests pass, build and manifest validation pass, known scaffold/package failures are classified, and the final Migration Harness has concrete Golden Master candidates.
