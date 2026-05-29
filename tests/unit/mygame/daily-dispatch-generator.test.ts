import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DISPATCH_DIFFICULTY_PRESETS } from '~/game/mygame/services/daily-dispatch-puzzle-types';
import { createDailyDispatchWorld } from '~/game/mygame/ecs/daily-dispatch-plugin';
import {
  generateDailyDispatchChapter,
  loadPlayableLevel,
} from '~/game/mygame/services/daily-dispatch-level-service';
import { generateDispatchPuzzle } from '~/game/mygame/services/sliding-puzzle-generator';
import { createDailyDispatchStoryCatalog } from '~/game/mygame/services/story-content-service';

const originalFetch = globalThis.fetch;

vi.hoisted(() => {
  if (!('caches' in globalThis)) {
    Object.defineProperty(globalThis, 'caches', {
      value: {
        open: async () => ({
          match: async () => undefined,
          put: async () => undefined,
          delete: async () => false,
        }),
      },
      configurable: true,
    });
  }
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function summarizeSeed(seed: number) {
  const level = generateDispatchPuzzle({
    difficulty: DISPATCH_DIFFICULTY_PRESETS.easy,
    seed,
    levelId: `level_${seed - 42000}`,
  });

  expect(level).not.toBeNull();
  return {
    seed,
    optimalMoves: level?.optimalMoves,
    blocks: level?.blocks,
    docks: level?.docks,
  };
}

function installCopiedChapterFetch() {
  const fetchMock = vi.fn(async (url: string | URL | Request) => {
    const path = String(url);
    if (!path.startsWith('/chapters/')) {
      return new Response('', { status: 404 });
    }

    const chapterPath = path.replace('/chapters/', '');
    const json = await readFile(
      resolve(process.cwd(), 'public', 'chapters', chapterPath),
      'utf8',
    );
    return new Response(json, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  globalThis.fetch = fetchMock as typeof fetch;
  return fetchMock;
}

describe('daily dispatch generator parity seeds', () => {
  it('keeps first source chapter seeds deterministic at the service boundary', () => {
    expect([summarizeSeed(42001), summarizeSeed(42002)]).toEqual([
      {
        seed: 42001,
        optimalMoves: 6,
        blocks: [
          {
            id: 'block_cyan',
            color: 'cyan',
            shape: 'DOT',
            position: { col: 0, row: 5 },
          },
          {
            id: 'block_pink',
            color: 'pink',
            shape: 'I2_V',
            position: { col: 5, row: 0 },
          },
        ],
        docks: [
          {
            id: 'dock_cyan',
            color: 'cyan',
            wall: 'left',
            wallIndices: [3],
          },
          {
            id: 'dock_pink',
            color: 'pink',
            wall: 'top',
            wallIndices: [0],
          },
        ],
      },
      {
        seed: 42002,
        optimalMoves: 5,
        blocks: [
          {
            id: 'block_orange',
            color: 'orange',
            shape: 'I2_H',
            position: { col: 0, row: 5 },
          },
          {
            id: 'block_pink',
            color: 'pink',
            shape: 'DOT',
            position: { col: 0, row: 0 },
          },
        ],
        docks: [
          {
            id: 'dock_orange',
            color: 'orange',
            wall: 'top',
            wallIndices: [3, 4],
          },
          {
            id: 'dock_pink',
            color: 'pink',
            wall: 'left',
            wallIndices: [5],
          },
        ],
      },
    ]);
  });

  it('loads source chapter JSON into an ECS-ready level without rewriting story data', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const path = String(url);
      if (path === '/chapters/index.json') {
        return new Response(
          JSON.stringify({
            games: [
              {
                uid: 'dispatch-chapter-1',
                url: 'dispatch-1.json',
                publishDate: '2026-02-10T00:00:00.000Z',
              },
            ],
          }),
          { status: 200 },
        );
      }

      if (path === '/chapters/dispatch-1.json') {
        return new Response(
          JSON.stringify({
            uid: 'local-fallback-dispatch',
            name: 'Daily Dispatch - Chapter 1',
            chapters: [
              {
                id: 1,
                uid: 'dispatch-chapter-1',
                name: 'Dispatch 1',
                county: { uid: 'county-default', name: 'default' },
                story: {
                  uid: 'story-dispatch-1',
                  intro: "Hey there I'm Marty. Managing this floor for the last 32 years.",
                  chapterStart: "See! Easy as that! Let's keep on shipping.",
                  completion: "Farm wagons. Wagons? For a computer brand? This doesn't add up.",
                  headline: 'Dispatch 1',
                  articleUrl: '',
                },
                levels: [
                  {
                    uid: 'd1-level-1',
                    levelNumber: 1,
                    config: {},
                    seed: 42001,
                    clues: [
                      {
                        uid: 'd1-clue-1',
                        text: "See! Easy as that! Let's keep on shipping.",
                      },
                    ],
                  },
                ],
              },
            ],
          }),
          { status: 200 },
        );
      }

      return new Response('', { status: 404 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const level = await loadPlayableLevel(0, 0, {
      storyPhase: 'introduction',
      levelPhase: 'playing',
    });

    expect(level).toMatchObject({
      chapterUid: 'dispatch-chapter-1',
      levelUid: 'd1-level-1',
      levelSeed: 42001,
      currentClueText: "See! Easy as that! Let's keep on shipping.",
      storyIntroText:
        "Hey there I'm Marty. Managing this floor for the last 32 years.",
      storyChapterStartText: "See! Easy as that! Let's keep on shipping.",
      storyCompletionText:
        "Farm wagons. Wagons? For a computer brand? This doesn't add up.",
      storyPhase: 'introduction',
    });
    expect(level.blocks.map((block) => block.spriteKey)).toEqual([
      'ui-palette_cyan.png',
      'ui-palette_pink.png',
    ]);
    expect(level.docks.map((dock) => dock.openSpriteFrame)).toEqual([
      'prop-truck_side_open_cyan.png',
      'prop-truck_up_open_pink.png',
    ]);
    expect(fetchMock).toHaveBeenCalledWith('/chapters/index.json');
    expect(fetchMock).toHaveBeenCalledWith('/chapters/dispatch-1.json');
  });

  it('loads and generates every copied source chapter through the catalog path', async () => {
    const fetchMock = installCopiedChapterFetch();
    const catalog = createDailyDispatchStoryCatalog();
    await catalog.init();

    const entries = catalog.entries();
    expect(entries.map((entry) => entry.uid)).toEqual(
      Array.from({ length: 10 }, (_, index) => `dispatch-chapter-${index + 1}`),
    );
    expect(entries.map((entry) => entry.url)).toEqual(
      Array.from({ length: 10 }, (_, index) => `dispatch-${index + 1}.json`),
    );

    for (const [chapterIndex, entry] of entries.entries()) {
      const generated = await generateDailyDispatchChapter(chapterIndex);
      expect(generated.chapter.uid).toBe(entry.uid);
      expect(generated.chapterCount).toBe(entries.length);
      expect(generated.levels.length).toBe(generated.chapter.levels.length);
      expect(generated.seeds).toEqual(
        generated.chapter.levels.map((level) => level.seed),
      );
      expect(generated.levels.every((level) => level.seed > 0)).toBe(true);
      expect(
        generated.levels.every(
          (level) => (level.levelConfig.optimalMoves ?? 0) >= 2,
        ),
      ).toBe(true);
      expect(generated.chapter.story.intro.length).toBeGreaterThan(0);
      expect(generated.chapter.story.chapterStart.length).toBeGreaterThan(0);
      expect(generated.chapter.story.completion.length).toBeGreaterThan(0);
      expect(generated.chapter.story.headline.length).toBeGreaterThan(0);
    }

    expect(fetchMock).toHaveBeenCalledWith('/chapters/index.json');
    expect(fetchMock).toHaveBeenCalledWith('/chapters/dispatch-10.json');
  }, 60000);

  it('derives chapter-end and all-done progression from copied chapter lengths', async () => {
    installCopiedChapterFetch();
    const catalog = createDailyDispatchStoryCatalog();
    await catalog.init();
    const entries = catalog.entries();
    const db = createDailyDispatchWorld();

    for (const [chapterIndex] of entries.entries()) {
      const generated = await generateDailyDispatchChapter(chapterIndex);
      const lastLevelIndex = generated.chapter.levels.length - 1;
      const level = await loadPlayableLevel(chapterIndex, lastLevelIndex, {
        storyPhase: 'playing',
        levelPhase: 'playing',
      });

      expect(level.levelCount).toBe(generated.chapter.levels.length);
      expect(level.levelSeed).toBe(
        generated.chapter.levels[lastLevelIndex]?.seed,
      );
      db.actions.loadLevel(level);

      const targetColors = new Set(
        db.actions.snapshot().docks.map((dock) => dock.color),
      );
      for (const block of db
        .actions.snapshot()
        .blocks.filter((candidate) => targetColors.has(candidate.color))) {
        db.actions.eraseBlock({ blockUid: block.uid });
      }

      expect(db.actions.snapshot().resources.levelPhase).toBe('complete');
      const advance = db.actions.advanceAfterCompletion();
      if (chapterIndex === entries.length - 1) {
        expect(advance.kind).toBe('all-done');
        expect(advance.storyPhase).toBe('all-done');
      } else {
        expect(advance.kind).toBe('next-chapter');
        expect(advance.chapterIndex).toBe(chapterIndex + 1);
        expect(advance.levelIndex).toBe(0);
        expect(advance.storyPhase).toBe('chapter-end');
      }
    }
  }, 60000);
});
