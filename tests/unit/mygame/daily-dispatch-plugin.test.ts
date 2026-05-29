import { describe, expect, it, vi } from 'vitest';
import {
  createDailyDispatchWorld,
  type DailyDispatchLoadLevelInput,
} from '~/game/mygame/ecs/daily-dispatch-plugin';

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

function makeLevel(
  overrides: Partial<DailyDispatchLoadLevelInput> = {},
): DailyDispatchLoadLevelInput {
  return {
    chapterId: '1',
    chapterUid: 'dispatch-chapter-1',
    chapterIndex: 0,
    chapterCount: 2,
    chapterName: 'Chapter 1',
    countyName: 'Warehouse',
    headline: 'Dispatch Headline',
    articleUrl: '',
    levelUid: 'level-1',
    levelNumber: 1,
    levelIndex: 0,
    levelCount: 2,
    levelSeed: 42001,
    gridSize: 6,
    storyPhase: 'playing',
    levelPhase: 'playing',
    currentClueUid: 'clue-1',
    currentClueText: 'Follow the clue.',
    currentDialogueRef: 'dispatch-chapter-1:level-1:clue-1',
    storyIntroText: "Hey there I'm Marty.",
    storyChapterStartText: "Let's keep on shipping.",
    storyCompletionText: 'Another dispatch cleared.',
    optimalMoves: 1,
    blocks: [
      {
        uid: 'blue-1',
        color: 'blue',
        shapeKey: 'DOT',
        shapeOffsets: [{ col: 0, row: 0 }],
        position: { col: 1, row: 2 },
        spriteKey: 'ui-palette_blue.png',
      },
    ],
    docks: [
      {
        uid: 'dock-blue-right',
        color: 'blue',
        side: 'right',
        indices: [2],
        spriteKey: 'prop-truck_side_open_blue.png',
        openSpriteFrame: 'prop-truck_side_open_blue.png',
        closedSpriteFrame: 'prop-truck_side_close_blue.png',
      },
    ],
    ...overrides,
  };
}

describe('daily dispatch ECS movement rules', () => {
  it('slides until collision and does not count a fully blocked swipe', () => {
    const db = createDailyDispatchWorld();
    db.actions.loadLevel(
      makeLevel({
        blocks: [
          {
            uid: 'blue-1',
            color: 'blue',
            shapeKey: 'DOT',
            shapeOffsets: [{ col: 0, row: 0 }],
            position: { col: 0, row: 0 },
            spriteKey: 'ui-palette_blue.png',
          },
          {
            uid: 'cyan-1',
            color: 'cyan',
            shapeKey: 'DOT',
            shapeOffsets: [{ col: 0, row: 0 }],
            position: { col: 1, row: 0 },
            spriteKey: 'ui-palette_cyan.png',
          },
        ],
        docks: [],
      }),
    );

    const result = db.actions.executeSwipe({
      blockUid: 'blue-1',
      direction: 'right',
    });

    expect(result.moved).toBe(false);
    expect(result.distance).toBe(0);
    expect(db.actions.snapshot().resources.moveCount).toBe(0);
  });

  it('exits only through a matching open dock and closes that dock', () => {
    const db = createDailyDispatchWorld();
    db.actions.loadLevel(makeLevel());

    const result = db.actions.executeSwipe({
      blockUid: 'blue-1',
      direction: 'right',
    });
    const snapshot = db.actions.snapshot();

    expect(result.moved).toBe(true);
    expect(result.exited).toBe(true);
    expect(result.dockUid).toBe('dock-blue-right');
    expect(snapshot.resources.moveCount).toBe(1);
    expect(snapshot.resources.remainingBlocks).toBe(0);
    expect(snapshot.resources.levelPhase).toBe('complete');
    expect(snapshot.docks[0]?.closed).toBe(true);
  });

  it('stops at the wall without exiting through a nonmatching dock', () => {
    const db = createDailyDispatchWorld();
    db.actions.loadLevel(
      makeLevel({
        blocks: [
          {
            uid: 'blue-1',
            color: 'blue',
            shapeKey: 'DOT',
            shapeOffsets: [{ col: 0, row: 0 }],
            position: { col: 4, row: 2 },
            spriteKey: 'ui-palette_blue.png',
          },
        ],
        docks: [
          {
            uid: 'dock-cyan-right',
            color: 'cyan',
            side: 'right',
            indices: [2],
            spriteKey: 'prop-truck_side_open_cyan.png',
            openSpriteFrame: 'prop-truck_side_open_cyan.png',
            closedSpriteFrame: 'prop-truck_side_close_cyan.png',
          },
          {
            uid: 'dock-blue-left',
            color: 'blue',
            side: 'left',
            indices: [2],
            spriteKey: 'prop-truck_side_open_blue.png',
            openSpriteFrame: 'prop-truck_side_open_blue.png',
            closedSpriteFrame: 'prop-truck_side_close_blue.png',
          },
        ],
      }),
    );

    const result = db.actions.executeSwipe({
      blockUid: 'blue-1',
      direction: 'right',
    });
    const snapshot = db.actions.snapshot();

    expect(result.moved).toBe(true);
    expect(result.exited).toBe(false);
    expect(result.to).toEqual({ col: 5, row: 2 });
    expect(snapshot.resources.moveCount).toBe(1);
    expect(snapshot.resources.levelPhase).toBe('playing');
    expect(snapshot.docks[0]?.closed).toBe(false);
  });

  it('erases a non-exited block without incrementing moves and can complete', () => {
    const db = createDailyDispatchWorld();
    db.actions.loadLevel(makeLevel());

    const result = db.actions.eraseBlock({ blockUid: 'blue-1' });
    const snapshot = db.actions.snapshot();

    expect(result.erased).toBe(true);
    expect(snapshot.blocks[0]?.exited).toBe(true);
    expect(snapshot.resources.moveCount).toBe(0);
    expect(snapshot.resources.remainingBlocks).toBe(0);
    expect(snapshot.resources.levelPhase).toBe('complete');
  });

  it('exposes next generated level and chapter targets after completion', () => {
    const db = createDailyDispatchWorld();
    db.actions.loadLevel(makeLevel());
    db.actions.eraseBlock({ blockUid: 'blue-1' });

    const nextLevel = db.actions.advanceAfterCompletion();
    const secondCall = db.actions.advanceAfterCompletion();

    expect(nextLevel.kind).toBe('next-level');
    expect(nextLevel.levelIndex).toBe(1);
    expect(nextLevel.chapterIndex).toBe(0);
    expect(nextLevel.completedLevels).toBe(1);
    expect(secondCall.completedLevels).toBe(1);

    db.actions.loadLevel(
      makeLevel({
        levelUid: 'level-2',
        levelNumber: 2,
        levelIndex: 1,
        levelCount: 2,
      }),
    );
    db.actions.eraseBlock({ blockUid: 'blue-1' });

    const nextChapter = db.actions.advanceAfterCompletion();
    expect(nextChapter.kind).toBe('next-chapter');
    expect(nextChapter.chapterIndex).toBe(1);
    expect(nextChapter.levelIndex).toBe(0);
  });

  it('keeps major story flow phases and source story text in ECS resources', () => {
    const db = createDailyDispatchWorld();
    db.actions.loadLevel(
      makeLevel({
        storyPhase: 'introduction',
        levelPhase: 'playing',
      }),
    );

    expect(db.actions.snapshot().resources.storyPhase).toBe('introduction');
    expect(db.actions.snapshot().resources.storyIntroText).toBe(
      "Hey there I'm Marty.",
    );

    db.actions.advanceStoryPhase('loading-puzzle');
    db.actions.advanceStoryPhase('chapter-start');
    expect(db.actions.snapshot().resources.storyPhase).toBe('chapter-start');
    expect(db.actions.snapshot().resources.storyChapterStartText).toBe(
      "Let's keep on shipping.",
    );

    db.actions.advanceStoryPhase('playing');
    expect(db.actions.snapshot().resources.storyPhase).toBe('playing');
  });

  it('hydrates legacy block state through the ECS boundary', () => {
    const db = createDailyDispatchWorld();
    db.actions.loadLevel(
      makeLevel({
        blocks: [
          {
            uid: 'blue-1',
            color: 'blue',
            shapeKey: 'DOT',
            shapeOffsets: [{ col: 0, row: 0 }],
            position: { col: 1, row: 2 },
            spriteKey: 'ui-palette_blue.png',
          },
          {
            uid: 'cyan-1',
            color: 'cyan',
            shapeKey: 'DOT',
            shapeOffsets: [{ col: 0, row: 0 }],
            position: { col: 3, row: 2 },
            spriteKey: 'ui-palette_cyan.png',
          },
        ],
      }),
    );

    db.actions.hydrateBlockState({
      positions: {
        'blue-1': { col: 4, row: 2 },
        'cyan-1': { col: 3, row: 2 },
      },
      exitedIds: ['cyan-1'],
      moveCount: 5,
    });
    const snapshot = db.actions.snapshot();

    expect(snapshot.resources.moveCount).toBe(5);
    expect(snapshot.blocks.find((block) => block.uid === 'blue-1')?.position).toEqual({
      col: 4,
      row: 2,
    });
    expect(snapshot.blocks.find((block) => block.uid === 'cyan-1')?.exited).toBe(
      true,
    );
    expect(snapshot.resources.remainingBlocks).toBe(1);
  });
});
