# T13 Scaffold/Package Delta Report

## Scope

Delta repair for T13 validation/scaffold blockers in `daily-dispatch-amino` only. No edits were made to the read-only legacy repo or `template-amino`, no Nucleo lifecycle commands were run, no deploy/provision/merge/force/delete operations were run, and no replacement assets were generated or renamed.

## Files Changed

- `package.json`
  - Added direct dev dependencies needed by local typechecking: `@types/node` and `@tweakpane/core`.
- `bun.lock`
  - Updated by `bun add -d @types/node @tweakpane/core`.
- `tsconfig.json`
  - Added `node` ambient types so package declarations that reference `node:fs` and `buffer.File` resolve during scaffold typecheck.
- `src/core/utils/SettingsMenu/types.d.ts`
  - Removed the duplicate `*.svg` declaration; Vite's built-in `vite/client` declaration remains the source of truth.
- `src/core/systems/tuning/state.ts`
  - Typed the Solid store setter helper as `SetStoreFunction<T>` so nested tuning path updates typecheck.
- `scripts/check-asset-naming.ts`
  - Added exact-path naming exceptions from `scripts/asset-naming-exceptions.json`.
  - Normalized collected paths to forward slashes for stable Windows/Unix matching.
  - Fails on invalid, duplicate, absolute, parent-segment, backslash, or stale exception entries.
- `scripts/asset-naming-exceptions.json`
  - Added 29 exact scaffold-carried asset exceptions for restored scaffold/template filenames that should not be renamed during the parity migration.
- `pipeline/runs/run-09-2026-05-29-t13-validation-ramp/scaffold-package-delta-report.md`
  - This report.

## Commands Run

```powershell
bun add -d @types/node @tweakpane/core
```

Result: passed. Installed `@types/node@25.9.1` and `@tweakpane/core@2.0.5`; Bun also ran the existing Cortex postinstall setup.

```powershell
bun run typecheck
```

Result: passed.

```powershell
bun run check:assets
```

Result: passed: `check:assets — All asset filenames conform to the naming convention (29 exact-path exception(s) allowed).`

```powershell
bun run build
```

Result: passed. Vite emitted non-blocking warnings about Tweakpane dynamic/static import chunking and chunks over 500 kB.

```powershell
bun run check:manifest
```

Result: passed: `Manifest is valid (9 bundles). [GC validation ✓]`

```powershell
bun run test:run
```

Result: passed. Vitest: 20 files / 168 tests. Bun scaffold/lint tests: 43 tests.

```powershell
bun run test:vitest:run tests/unit/mygame/daily-dispatch-audio.test.ts tests/unit/mygame/daily-dispatch-plugin.test.ts tests/unit/mygame/daily-dispatch-story-counterparts.test.ts tests/unit/mygame/daily-dispatch-progress-analytics.test.ts tests/unit/mygame/daily-dispatch-generator.test.ts
```

Result: passed. 5 files / 15 tests.

```powershell
bunx vite --host 127.0.0.1 --port 5187 --strictPort
Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5187/?screen=game"
Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5187/src/app.css"
```

Result: passed. Both requests returned HTTP 200. The Vite process was stopped after the smoke check.

## Fixed

- `bun run typecheck` no longer fails on:
  - `@ark/util` `buffer.File` references.
  - `@wolfgames/game-kit` `node:fs` type references.
  - missing `@tweakpane/core` references from `tweakpane`.
  - duplicate Vite/SVG declaration identifiers.
  - local `Pane.addFolder` type fallout from missing Tweakpane core types.
  - Solid store setter typing in `src/core/systems/tuning/state.ts`.
- `bun run check:assets` no longer blocks development on restored scaffold/template filenames.
- Full current test runner remains green after prior Vitest/Bun split repairs.

## Asset Validation Exception Strategy

The checker now allows only exact paths listed in `scripts/asset-naming-exceptions.json`. Each exception carries a reason enum and note. This preserves the naming convention for all future assets while allowing carried scaffold/source/runtime-adapter artifacts when renaming would break runtime or violate ADR-0003.

Current exceptions are all `scaffold-carried` restored template/scaffold files. The Daily Dispatch source artifact filenames currently pass the checker without needing source exceptions; if a future verbatim Source Artifact violates naming rules, it should be added as an exact `source-artifact` exception rather than renamed.

The checker fails if an exception entry is malformed, duplicated, references a missing file, uses backslashes, uses an absolute path, or contains `..`.

## CDN/Game KIT Binding Findings

Local runtime remains bound to local `public/` assets through `ManifestProvider` and `src/game/asset-manifest.ts` with `cdnBase: "."` and `localBase: "."`.

I inspected the installed `@wolfgames/dev` CLI upload implementation in `dist/cli.mjs`. `wolf-dev upload-asset` currently creates the stream with `createReadStream(file, { encoding: "utf-8" })`, so it should not be treated as a verified binary-safe upload path for PNG/MP3/WebM source artifacts.

Safe next step: verify or fix a binary-safe upload path first, then upload verbatim source binaries to the Development CDN/storage path and update the deployment binding/manifest strategy without changing local source artifact bytes or names.

## Guardrail Checks

Search checks were run for remote-CDN rewrites, request routing, React/Preact imports, direct Howler/HTMLAudio usage, direct canvas access, `requestAnimationFrame`, and placeholder/TODO/stub markers in `src/game/mygame`.

Result: no new blocker found. `document.createElement` appears only in `src/game/mygame/screens/startView.ts`, the allowed DOM start-screen shell. `GameManifestProvider` appears only in ambient declarations and historical/docs references, not in `src/app.tsx` runtime wiring.

## Remaining Blockers

No local T13 validation/scaffold blockers remain after this delta.

Deferred outside this worker:

- A full browser E2E smoke covering first interaction, level completion, story continuation, and reload resume remains documented for orchestrator execution in `runtime-smoke-check.md`.
- Development CDN asset upload/binding remains deferred until a binary-safe upload path is verified.

## Readiness

T13 is ready for orchestrator verification. The repaired gates now pass locally: typecheck, full tests, focused Daily Dispatch tests, build, manifest validation, asset validation, and lightweight HTTP smoke.
