/**
 * Asset manifest — single source for bundle list and paths.
 *
 * This file is intentionally free of runtime imports (no Solid.js, no ~/core)
 * so it can be imported by CLI scripts (scripts/check-manifest.ts) running
 * under plain Bun without the Vite/app dependency graph.
 *
 * cdnBase and localBase intentionally resolve to local public/ assets for the
 * parity migration. Switch to a remote CDN base only after source assets are
 * uploaded to that storage path.
 *
 * Types are imported directly from @wolfgames/components/core — this is the
 * single source of truth for the manifest schema.
 *
 * Bundle naming determines which loader handles the assets:
 *
 *   boot-*   → DOM only   — splash screen assets
 *   theme-*  → DOM only   — branding/logo (loading screen, pre-GPU)
 *   scene-*  → GPU (Pixi) — game spritesheets, backgrounds, tiles, characters
 *   core-*   → GPU (Pixi) — in-game UI atlases
 *   fx-*     → GPU (Pixi) — particles, effects, VFX spritesheets
 *   audio-*  → Howler     — sound effects, music
 *
 * Game atlases MUST use scene-* or core-* to be accessible via Pixi
 * (createSprite, getTexture, hasSheet). Using theme-* for game atlases
 * will silently fail — Pixi never sees them.
 *
 * Bundle names must match [a-z][a-z0-9-]* — only lowercase, digits, hyphens.
 * NO underscores. Asset file paths can have underscores; bundle names cannot.
 *
 * For single-asset GPU bundles, set alias = bundle name so Pixi lookups work:
 *   { name: 'scene-tiles', assets: [{ alias: 'scene-tiles', src: 'atlas-tiles.json' }] }
 *   → gpuLoader.createSprite('scene-tiles', 'frame-name.png')
 */

import type { Manifest } from '@wolfgames/components/core';

export const LOCAL_ASSET_PATH = '.';

const CHAPTER_ASSETS: Manifest['bundles'][number]['assets'] = [
  { alias: 'chapter-index', src: 'chapters/index.json', type: 'json' },
  { alias: 'chapter-dispatch-1', src: 'chapters/dispatch-1.json', type: 'json' },
  { alias: 'chapter-dispatch-2', src: 'chapters/dispatch-2.json', type: 'json' },
  { alias: 'chapter-dispatch-3', src: 'chapters/dispatch-3.json', type: 'json' },
  { alias: 'chapter-dispatch-4', src: 'chapters/dispatch-4.json', type: 'json' },
  { alias: 'chapter-dispatch-5', src: 'chapters/dispatch-5.json', type: 'json' },
  { alias: 'chapter-dispatch-6', src: 'chapters/dispatch-6.json', type: 'json' },
  { alias: 'chapter-dispatch-7', src: 'chapters/dispatch-7.json', type: 'json' },
  { alias: 'chapter-dispatch-8', src: 'chapters/dispatch-8.json', type: 'json' },
  { alias: 'chapter-dispatch-9', src: 'chapters/dispatch-9.json', type: 'json' },
  { alias: 'chapter-dispatch-10', src: 'chapters/dispatch-10.json', type: 'json' },
];

export const manifest: Manifest = {
  cdnBase: LOCAL_ASSET_PATH,
  localBase: LOCAL_ASSET_PATH,
  bundles: [
    // No theme-* bundle: the copied branding atlas is a Pixi spritesheet and
    // must not be routed through the DOM/theme loader during initial load.
    {
      name: 'scene-daily-dispatch',
      kind: 'scene',
      assets: [
        { alias: 'scene-daily-dispatch', src: 'assets/atlas-tiles-daily-dispatch.json', type: 'spritesheet' },
      ],
    },
    {
      name: 'fx-daily-dispatch-flash',
      kind: 'fx',
      assets: [
        { alias: 'fx-daily-dispatch-flash', src: 'assets/vfx-flash_fx_shape_04.json', type: 'spritesheet' },
      ],
    },
    {
      name: 'fx-daily-dispatch-glow',
      kind: 'fx',
      assets: [
        { alias: 'fx-daily-dispatch-glow', src: 'assets/vfx-mg_glow_09.json', type: 'spritesheet' },
      ],
    },
    {
      name: 'fx-daily-dispatch-noglow',
      kind: 'fx',
      assets: [
        { alias: 'fx-daily-dispatch-noglow', src: 'assets/vfx-mg_noglow_01.json', type: 'spritesheet' },
      ],
    },
    {
      name: 'fx-daily-dispatch-blast',
      kind: 'fx',
      assets: [
        { alias: 'fx-daily-dispatch-blast', src: 'assets/vfx-blast.json', type: 'spritesheet' },
      ],
    },
    {
      name: 'fx-daily-dispatch-rotate',
      kind: 'fx',
      assets: [
        { alias: 'fx-daily-dispatch-rotate', src: 'assets/vfx-rotate.json', type: 'spritesheet' },
      ],
    },
    {
      name: 'audio-sfx-daily-dispatch',
      kind: 'audio',
      assets: [
        // Source JSON is preserved verbatim with "src"; this runtime adapter
        // supplies loader-required "urls" without mutating source bytes.
        { alias: 'audio-sfx-daily-dispatch', src: 'assets/sfx-daily-dispatch-runtime.json', type: 'audioSprite' },
      ],
    },
    {
      name: 'audio-music-warehouse-puzzle',
      kind: 'audio',
      assets: [
        { alias: 'audio-music-warehouse-puzzle', src: 'assets/music-warehouse-puzzle-runtime.json', type: 'audioSprite' },
      ],
    },

    // Loader-safe Daily Dispatch source data copied verbatim from the legacy repo.
    {
      name: 'data-chapters',
      kind: 'data',
      assets: CHAPTER_ASSETS,
    },
  ],
};
