import {
  type DailyDispatchChapter,
  type DailyDispatchLevel,
} from '../data/chapters';
import { DAILY_DISPATCH_SHAPES } from '../data/daily-dispatch-shapes';
import type {
  DailyDispatchBlockInput,
  DailyDispatchDockInput,
  DailyDispatchLoadLevelInput,
  DispatchColor,
  DockSide,
  LevelPhase,
  StoryPhase,
} from '../ecs/daily-dispatch-plugin';
import { createDailyDispatchStoryCatalog } from './story-content-service';
import {
  DISPATCH_DIFFICULTY_PRESETS,
  getDifficultyForChapterLevel,
  type DispatchBlockPlacement,
  type DispatchDockPlacement,
  type DispatchLevelConfig,
} from './daily-dispatch-puzzle-types';
import { generateDispatchPuzzle } from './sliding-puzzle-generator';

function paletteFrame(color: DispatchColor): string {
  return `ui-palette_${color}.png`;
}

function truckFrame(wall: DockSide, color: DispatchColor, open: boolean): string {
  const direction = wall === 'left' || wall === 'right' ? 'side' : wall === 'top' ? 'up' : 'down';
  return `prop-truck_${direction}_${open ? 'open' : 'close'}_${color}.png`;
}

export interface GeneratedDailyDispatchLevel {
  sourceLevel: DailyDispatchLevel;
  levelConfig: DispatchLevelConfig;
  seed: number;
  difficultyTier: ReturnType<typeof getDifficultyForChapterLevel>;
}

export interface GeneratedDailyDispatchChapter {
  chapter: DailyDispatchChapter;
  chapterIndex: number;
  chapterCount: number;
  levels: GeneratedDailyDispatchLevel[];
  seeds: number[];
}

function requireSeed(level: DailyDispatchLevel): number {
  if (!Number.isFinite(level.seed)) {
    throw new Error(`Daily Dispatch source level ${level.uid} is missing a numeric seed.`);
  }
  return level.seed;
}

function generateChapterLevel(
  chapter: DailyDispatchChapter,
  levelIndex: number,
): GeneratedDailyDispatchLevel {
  const chapterLength = chapter.levels.length;
  const level = chapter.levels[levelIndex];
  if (!level) {
    throw new Error(`Daily Dispatch chapter ${chapter.uid} has no level at index ${levelIndex}.`);
  }

  const seed = requireSeed(level);
  const difficultyTier = getDifficultyForChapterLevel(levelIndex, chapterLength);
  const levelConfig = generateDispatchPuzzle({
    difficulty: DISPATCH_DIFFICULTY_PRESETS[difficultyTier],
    seed,
    levelId: `level_${level.levelNumber}`,
  });

  if (!levelConfig) {
    throw new Error(
      `Daily Dispatch generator could not produce ${chapter.uid} ${level.uid} from source seed ${seed}.`,
    );
  }

  return {
    sourceLevel: level,
    levelConfig: {
      ...levelConfig,
      clue: level.clues[0]?.text,
    },
    seed,
    difficultyTier,
  };
}

function generateChapterLevels(chapter: DailyDispatchChapter): GeneratedDailyDispatchLevel[] {
  return chapter.levels.map((_, levelIndex) => generateChapterLevel(chapter, levelIndex));
}

function convertBlock(block: DispatchBlockPlacement): DailyDispatchBlockInput {
  return {
    uid: block.id,
    color: block.color,
    shapeKey: block.shape,
    shapeOffsets: DAILY_DISPATCH_SHAPES[block.shape].cells.map((cell) => ({ ...cell })),
    position: { ...block.position },
    spriteKey: paletteFrame(block.color),
    renderLayer: 20,
  };
}

function convertDock(dock: DispatchDockPlacement): DailyDispatchDockInput {
  return {
    uid: dock.id,
    color: dock.color,
    side: dock.wall,
    indices: [...dock.wallIndices],
    spriteKey: truckFrame(dock.wall, dock.color, true),
    openSpriteFrame: truckFrame(dock.wall, dock.color, true),
    closedSpriteFrame: truckFrame(dock.wall, dock.color, false),
    renderLayer: 10,
  };
}

function createGeneratedLevelInput(args: {
  chapter: DailyDispatchChapter;
  chapterCount: number;
  chapterIndex: number;
  generatedLevel: GeneratedDailyDispatchLevel;
  levelIndex: number;
  levelPhase?: LevelPhase;
  storyPhase?: StoryPhase;
}): DailyDispatchLoadLevelInput {
  const {
    chapter,
    chapterCount,
    chapterIndex,
    generatedLevel,
    levelIndex,
    levelPhase = 'playing',
    storyPhase = 'playing',
  } = args;
  const { sourceLevel: level, levelConfig } = generatedLevel;
  const firstClue = level.clues[0];

  return {
    chapterId: String(chapter.id),
    chapterUid: chapter.uid,
    chapterIndex,
    chapterCount,
    chapterName: chapter.name,
    countyName: chapter.county.name,
    headline: chapter.story.headline,
    articleUrl: chapter.story.articleUrl ?? '',
    levelUid: level.uid,
    levelNumber: level.levelNumber,
    levelIndex,
    levelCount: chapter.levels.length,
    levelSeed: generatedLevel.seed,
    gridSize: levelConfig.gridSize,
    storyPhase,
    levelPhase,
    currentClueUid: firstClue?.uid ?? '',
    currentClueText: firstClue?.text ?? chapter.story.chapterStart,
    currentDialogueRef: `${chapter.uid}:${level.uid}:${firstClue?.uid ?? 'chapter-start'}`,
    storyIntroText: chapter.story.intro,
    storyChapterStartText: chapter.story.chapterStart,
    storyCompletionText: chapter.story.completion,
    optimalMoves: levelConfig.optimalMoves ?? 0,
    blocks: levelConfig.blocks.map(convertBlock),
    docks: levelConfig.docks.map(convertDock),
  };
}

export async function generateDailyDispatchChapter(
  chapterIndex = 0,
): Promise<GeneratedDailyDispatchChapter> {
  const catalog = createDailyDispatchStoryCatalog();
  await catalog.init();
  const chapter = await catalog.loadChapterAt(chapterIndex);

  const levels = generateChapterLevels(chapter);
  return {
    chapter,
    chapterCount: catalog.entries().length,
    chapterIndex,
    levels,
    seeds: levels.map((level) => level.seed),
  };
}

export async function loadPlayableLevel(
  chapterIndex = 0,
  levelIndex = 0,
  options: {
    levelPhase?: LevelPhase;
    storyPhase?: StoryPhase;
  } = {},
): Promise<DailyDispatchLoadLevelInput> {
  const catalog = createDailyDispatchStoryCatalog();
  await catalog.init();
  const chapter = await catalog.loadChapterAt(chapterIndex);

  const generatedLevel = generateChapterLevel(chapter, levelIndex);
  return createGeneratedLevelInput({
    chapter,
    chapterCount: catalog.entries().length,
    chapterIndex,
    generatedLevel,
    levelIndex,
    levelPhase: options.levelPhase,
    storyPhase: options.storyPhase,
  });
}

export async function loadFirstPlayableLevel(): Promise<DailyDispatchLoadLevelInput> {
  return loadPlayableLevel(0, 0);
}
