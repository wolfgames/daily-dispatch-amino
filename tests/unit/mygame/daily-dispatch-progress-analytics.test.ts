import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DailyDispatchDebugSnapshot } from '~/game/mygame/ecs/daily-dispatch-plugin';
import {
  LEGACY_BLOCK_STATE_KEY,
  LEGACY_HAS_PLAYED_KEY,
  LEGACY_PROGRESS_KEY,
  loadLegacyProgress,
  markHasPlayed,
  progressSnapshotFromLegacy,
  resolveResumeTarget,
  saveBlockStateFromSnapshot,
  saveProgressFromSnapshot,
} from '~/game/mygame/services/legacy-progress-adapter';
import {
  OMITTED_STALE_LEGACY_ANALYTICS_EVENTS,
  createGameStartEvent,
  createLegacyAnalyticsAdapter,
  resetLegacyAnalyticsDebug,
} from '~/game/mygame/services/legacy-analytics-adapter';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number {
    return this.values.size;
  }
  clear(): void {
    this.values.clear();
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function installStorage(): MemoryStorage {
  const storage = new MemoryStorage();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { localStorage: storage });
  return storage;
}

function makeSnapshot(
  overrides: Partial<DailyDispatchDebugSnapshot['resources']> = {},
): DailyDispatchDebugSnapshot {
  return {
    resources: {
      chapterId: '1',
      chapterUid: 'dispatch-chapter-1',
      chapterIndex: 0,
      chapterCount: 10,
      chapterName: 'Dispatch 1',
      countyName: 'warehouse',
      levelUid: 'level-2',
      levelNumber: 2,
      levelIndex: 1,
      levelCount: 7,
      levelSeed: 42002,
      gridSize: 6,
      moveCount: 3,
      totalMoves: 9,
      optimalMoves: 2,
      completedLevels: 1,
      storyPhase: 'playing',
      levelPhase: 'playing',
      currentClueText: 'Source clue.',
      currentDialogueRef: 'dispatch-chapter-1:level-2:clue-1',
      storyIntroText: 'Intro',
      storyChapterStartText: 'Start',
      storyCompletionText: 'Complete',
      headline: 'Headline',
      articleUrl: '',
      remainingBlocks: 1,
      openDocks: 1,
      nextChapterIndex: 0,
      nextLevelIndex: 2,
      hasNextChapter: false,
      hasNextLevel: true,
      ...overrides,
    },
    blocks: [
      {
        uid: 'blue-1',
        color: 'blue',
        shapeKey: 'DOT',
        shapeOffsets: [{ col: 0, row: 0 }],
        position: { col: 2, row: 3 },
        spriteKey: 'ui-palette_blue.png',
        exited: false,
      },
    ],
    docks: [
      {
        uid: 'dock-blue-right',
        color: 'blue',
        side: 'right',
        indices: [3],
        spriteKey: 'prop-truck_side_open_blue.png',
        openSpriteFrame: 'prop-truck_side_open_blue.png',
        closedSpriteFrame: 'prop-truck_side_close_blue.png',
        closed: false,
      },
    ],
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  installStorage();
  resetLegacyAnalyticsDebug();
});

describe('Daily Dispatch legacy progress adapter', () => {
  it('reads active legacy progress and resolves the 1-based chapter level', () => {
    localStorage.setItem(
      LEGACY_PROGRESS_KEY,
      JSON.stringify({
        version: 1,
        current: {
          chapterId: 'dispatch-chapter-3',
          countyName: 'warehouse',
          chapterLength: 7,
          currentLevel: 4,
          startedAt: 100,
          catalogIndex: 2,
          levelSeed: 42004,
        },
        completed: [],
        lastPlayedAt: 100,
      }),
    );

    expect(loadLegacyProgress().current?.chapterId).toBe('dispatch-chapter-3');
    expect(resolveResumeTarget()).toEqual({
      chapterIndex: 2,
      levelIndex: 3,
      currentLevel: 4,
    });
    expect(progressSnapshotFromLegacy()).toMatchObject({
      chapterUid: 'dispatch-chapter-3',
      chapterIndex: 2,
      levelIndex: 3,
      levelSeed: 42004,
    });
  });

  it('saves Amino/ECS snapshots to active legacy keys', () => {
    const snapshot = makeSnapshot();

    saveProgressFromSnapshot(snapshot);
    saveBlockStateFromSnapshot(snapshot);
    markHasPlayed();

    const progress = JSON.parse(localStorage.getItem(LEGACY_PROGRESS_KEY) ?? '');
    const blockState = JSON.parse(
      localStorage.getItem(LEGACY_BLOCK_STATE_KEY) ?? '',
    );

    expect(progress.current).toMatchObject({
      chapterId: 'dispatch-chapter-1',
      countyName: 'warehouse',
      chapterLength: 7,
      currentLevel: 2,
      catalogIndex: 0,
      levelSeed: 42002,
    });
    expect(blockState).toEqual({
      positions: { 'blue-1': { col: 2, row: 3 } },
      exitedIds: [],
      moveCount: 3,
    });
    expect(localStorage.getItem(LEGACY_HAS_PLAYED_KEY)).toBe('true');
  });
});

describe('Daily Dispatch legacy analytics adapter', () => {
  it('maps game_start to the active returning-player source semantics', () => {
    const trackGameStart = vi.fn();
    const adapter = createLegacyAnalyticsAdapter({ trackGameStart });

    adapter.trackGameStart(
      createGameStartEvent({
        startSource: 'continue',
        isReturningPlayer: true,
        chapterId: 'dispatch-chapter-1',
        chapterCount: 1,
        countyTheme: 'warehouse',
      }),
    );

    expect(trackGameStart).toHaveBeenCalledWith({
      start_source: 'continue',
      is_returning_player: true,
      chapter_id: 'dispatch-chapter-1',
      chapter_count: 1,
      county_theme: 'warehouse',
    });
  });

  it('emits source-compatible active events and omits stale definitions', () => {
    const trackLevelStart = vi.fn();
    const trackLevelComplete = vi.fn();
    const trackChapterStart = vi.fn();
    const trackChapterComplete = vi.fn();
    const adapter = createLegacyAnalyticsAdapter({
      trackLevelStart,
      trackLevelComplete,
      trackChapterStart,
      trackChapterComplete,
    });
    const snapshot = makeSnapshot();

    adapter.trackChapterStart(snapshot);
    adapter.trackLevelStart(snapshot);
    adapter.trackLevelComplete(snapshot, 1234);
    adapter.trackChapterComplete(snapshot, 4567);

    const names = adapter.getDebugEvents().map((event) => event.name);
    expect(names).toEqual([
      'chapter_start',
      'level_start',
      'level_complete',
      'chapter_complete',
    ]);
    expect(names).not.toEqual(
      expect.arrayContaining([...OMITTED_STALE_LEGACY_ANALYTICS_EVENTS]),
    );
    expect(trackLevelComplete).toHaveBeenCalledWith({
      moves_used: 3,
      optimal_moves: 2,
      time_spent: 1.23,
      total_rotations: 0,
    });
    expect(trackLevelStart).toHaveBeenCalledWith(
      expect.objectContaining({
        chapter_id: 'dispatch-chapter-1',
        level_id: 'level-2',
        level_seed: 42002,
        grid_size: 6,
      }),
    );
  });
});
