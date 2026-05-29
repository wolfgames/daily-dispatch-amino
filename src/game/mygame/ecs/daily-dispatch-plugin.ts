import { Database } from '@adobe/data/ecs';
import { I32, U32 } from '@adobe/data/math';
import { Observe } from '@adobe/data/observe';

export type DispatchColor =
  | 'blue'
  | 'cyan'
  | 'orange'
  | 'pink'
  | 'purple'
  | 'yellow';
export type DispatchDirection = 'up' | 'down' | 'left' | 'right';
export type DockSide = 'top' | 'right' | 'bottom' | 'left';

export type StoryPhase =
  | 'introduction'
  | 'loading-puzzle'
  | 'chapter-start'
  | 'playing'
  | 'chapter-end'
  | 'all-done';

export type LevelPhase = 'ready' | 'playing' | 'complete';

export interface GridPosition {
  col: number;
  row: number;
}

export interface ShapeOffset {
  col: number;
  row: number;
}

export interface DailyDispatchBlockInput {
  uid: string;
  color: DispatchColor;
  shapeKey: string;
  shapeOffsets: ShapeOffset[];
  position: GridPosition;
  spriteKey: string;
  renderLayer?: number;
}

export interface DailyDispatchDockInput {
  uid: string;
  color: DispatchColor;
  side: DockSide;
  indices: number[];
  spriteKey: string;
  openSpriteFrame: string;
  closedSpriteFrame: string;
  renderLayer?: number;
}

export interface DailyDispatchLoadLevelInput {
  chapterId: string;
  chapterUid: string;
  chapterIndex: number;
  chapterCount: number;
  chapterName: string;
  countyName: string;
  headline: string;
  articleUrl: string;
  levelUid: string;
  levelNumber: number;
  levelIndex: number;
  levelCount: number;
  levelSeed: number;
  gridSize: number;
  storyPhase: StoryPhase;
  levelPhase: LevelPhase;
  currentClueUid: string;
  currentClueText: string;
  currentDialogueRef: string;
  storyIntroText?: string;
  storyChapterStartText?: string;
  storyCompletionText?: string;
  optimalMoves?: number;
  blocks: DailyDispatchBlockInput[];
  docks: DailyDispatchDockInput[];
}

export interface DailyDispatchProgressSnapshot {
  chapterId: string;
  chapterUid: string;
  countyName: string;
  levelUid: string;
  chapterIndex: number;
  levelIndex: number;
  levelNumber: number;
  levelCount: number;
  levelSeed: number;
  moveCount: number;
  completedLevels: number;
  storyPhase: StoryPhase;
}

export interface DailyDispatchHydrateBlockStateInput {
  positions: Record<string, GridPosition>;
  exitedIds: string[];
  moveCount: number;
}

export interface DailyDispatchBlockSnapshot extends DailyDispatchBlockInput {
  exited: boolean;
}

export interface DailyDispatchDockSnapshot extends DailyDispatchDockInput {
  closed: boolean;
}

export interface DailyDispatchDebugSnapshot {
  resources: {
    chapterId: string;
    chapterUid: string;
    chapterIndex: number;
    chapterCount: number;
    chapterName: string;
    countyName: string;
    levelUid: string;
    levelNumber: number;
    levelIndex: number;
    levelCount: number;
    levelSeed: number;
    gridSize: number;
    moveCount: number;
    totalMoves: number;
    optimalMoves: number;
    completedLevels: number;
    storyPhase: StoryPhase;
    levelPhase: LevelPhase;
    currentClueText: string;
    currentDialogueRef: string;
    storyIntroText: string;
    storyChapterStartText: string;
    storyCompletionText: string;
    headline: string;
    articleUrl: string;
    remainingBlocks: number;
    openDocks: number;
    nextChapterIndex: number;
    nextLevelIndex: number;
    hasNextChapter: boolean;
    hasNextLevel: boolean;
  };
  blocks: DailyDispatchBlockSnapshot[];
  docks: DailyDispatchDockSnapshot[];
}

export interface DailyDispatchSwipeInput {
  blockUid: string;
  direction: DispatchDirection;
}

export interface DailyDispatchSwipeResult {
  blockUid: string;
  moved: boolean;
  exited: boolean;
  distance: number;
  from: GridPosition;
  to: GridPosition;
  direction: DispatchDirection;
  dockUid?: string;
  moveCount: number;
  levelPhase: LevelPhase;
}

export interface DailyDispatchEraseInput {
  blockUid: string;
}

export interface DailyDispatchEraseResult {
  blockUid: string;
  erased: boolean;
  from: GridPosition;
  moveCount: number;
  remainingBlocks: number;
  levelPhase: LevelPhase;
}

export type DailyDispatchCompletionAdvanceKind =
  | 'not-complete'
  | 'next-level'
  | 'next-chapter'
  | 'all-done';

export interface DailyDispatchCompletionAdvanceResult {
  kind: DailyDispatchCompletionAdvanceKind;
  chapterIndex: number;
  levelIndex: number;
  completedLevels: number;
  storyPhase: StoryPhase;
  levelPhase: LevelPhase;
}

interface EcsBlockState {
  entity: number;
  uid: string;
  color: DispatchColor;
  shapeKey: string;
  shapeOffsets: ShapeOffset[];
  position: GridPosition;
  exited: boolean;
  selectable: boolean;
  spriteKey: string;
  renderLayer: number;
}

type EcsRow = Record<string, unknown>;

interface EcsReadable {
  select: unknown;
  read: unknown;
}

interface EcsDockState {
  entity: number;
  uid: string;
  color: DispatchColor;
  side: DockSide;
  indices: number[];
  closed: boolean;
  spriteKey: string;
  openSpriteFrame: string;
  closedSpriteFrame: string;
  renderLayer: number;
}

const DIRECTION_VECTORS: Record<DispatchDirection, GridPosition> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

const DIRECTION_TO_DOCK_SIDE: Record<DispatchDirection, DockSide> = {
  up: 'top',
  down: 'bottom',
  left: 'left',
  right: 'right',
};

function encodeOffsets(offsets: ShapeOffset[]): string {
  return JSON.stringify(offsets);
}

function decodeOffsets(value: string): ShapeOffset[] {
  try {
    const parsed = JSON.parse(value) as ShapeOffset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function encodeIndices(indices: number[]): string {
  return JSON.stringify(indices);
}

function decodeIndices(value: string): number[] {
  try {
    const parsed = JSON.parse(value) as number[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cellKey(position: GridPosition): string {
  return `${position.col},${position.row}`;
}

function getCells(
  block: Pick<EcsBlockState, 'shapeOffsets' | 'position'>,
  position = block.position,
): GridPosition[] {
  return block.shapeOffsets.map((offset) => ({
    col: position.col + offset.col,
    row: position.row + offset.row,
  }));
}

function isInBounds(position: GridPosition, gridSize: number): boolean {
  return (
    position.col >= 0 &&
    position.col < gridSize &&
    position.row >= 0 &&
    position.row < gridSize
  );
}

function getPerpendicularIndices(
  block: Pick<EcsBlockState, 'shapeOffsets'>,
  position: GridPosition,
  direction: DispatchDirection,
): number[] {
  const cells = getCells({ ...block, position });
  const values =
    direction === 'left' || direction === 'right'
      ? cells.map((cell) => cell.row)
      : cells.map((cell) => cell.col);
  return [...new Set(values)].sort((a, b) => a - b);
}

function dockFitsBlock(
  dock: EcsDockState,
  block: EcsBlockState,
  position: GridPosition,
  direction: DispatchDirection,
): boolean {
  if (dock.side !== DIRECTION_TO_DOCK_SIDE[direction]) return false;
  if (dock.color !== block.color) return false;
  if (dock.closed) return false;

  const indices = new Set(dock.indices);
  return getPerpendicularIndices(block, position, direction).every((index) =>
    indices.has(index),
  );
}

function readBlocks(store: EcsReadable): EcsBlockState[] {
  const select = store.select as (
    include: readonly string[],
  ) => readonly number[];
  const read = store.read as (entity: number) => EcsRow | null;
  return select([
    'uid',
    'shapeOffsets',
    'gridX',
    'gridY',
    'exited',
    'spriteKey',
  ])
    .map((entity) => {
      const row = read(entity);
      if (
        !row?.uid ||
        row.shapeOffsets == null ||
        row.gridX == null ||
        row.gridY == null
      )
        return null;
      return {
        entity,
        uid: String(row.uid),
        color: (row.color ?? 'blue') as DispatchColor,
        shapeKey: String(row.shapeKey ?? ''),
        shapeOffsets: decodeOffsets(String(row.shapeOffsets)),
        position: { col: Number(row.gridX), row: Number(row.gridY) },
        exited: Boolean(row.exited ?? false),
        selectable: Boolean(row.selectable ?? true),
        spriteKey: String(row.spriteKey ?? ''),
        renderLayer: Number(row.renderLayer ?? 0),
      } satisfies EcsBlockState;
    })
    .filter((block): block is EcsBlockState => block != null);
}

function readDocks(store: EcsReadable): EcsDockState[] {
  const select = store.select as (
    include: readonly string[],
  ) => readonly number[];
  const read = store.read as (entity: number) => EcsRow | null;
  return select([
    'uid',
    'dockIndices',
    'wallSide',
    'closed',
    'openSpriteFrame',
    'closedSpriteFrame',
  ])
    .map((entity) => {
      const row = read(entity);
      if (!row?.uid || row.wallSide == null) return null;
      return {
        entity,
        uid: String(row.uid),
        color: (row.color ?? 'blue') as DispatchColor,
        side: row.wallSide as DockSide,
        indices: decodeIndices(String(row.dockIndices ?? '[]')),
        closed: Boolean(row.closed ?? false),
        spriteKey: String(row.spriteKey ?? row.openSpriteFrame ?? ''),
        openSpriteFrame: String(row.openSpriteFrame ?? ''),
        closedSpriteFrame: String(row.closedSpriteFrame ?? ''),
        renderLayer: Number(row.renderLayer ?? 0),
      } satisfies EcsDockState;
    })
    .filter((dock): dock is EcsDockState => dock != null);
}

function hasMatchingDock(block: EcsBlockState, docks: EcsDockState[]): boolean {
  return docks.some((dock) => dock.color === block.color);
}

function countRemainingTargetBlocks(
  blocks: EcsBlockState[],
  docks: EcsDockState[],
): number {
  return blocks.filter(
    (block) => !block.exited && hasMatchingDock(block, docks),
  ).length;
}

function createOccupancy(
  blocks: EcsBlockState[],
  excludingBlockUid?: string,
): Map<string, string> {
  const occupancy = new Map<string, string>();
  for (const block of blocks) {
    if (block.exited || block.uid === excludingBlockUid) continue;
    for (const cell of getCells(block)) {
      occupancy.set(cellKey(cell), block.uid);
    }
  }
  return occupancy;
}

function simulateSwipe(
  blocks: EcsBlockState[],
  docks: EcsDockState[],
  gridSize: number,
  input: DailyDispatchSwipeInput,
): DailyDispatchSwipeResult {
  const block = blocks.find((candidate) => candidate.uid === input.blockUid);
  if (!block || block.exited || !block.selectable) {
    return {
      blockUid: input.blockUid,
      moved: false,
      exited: false,
      distance: 0,
      from: block?.position ?? { col: 0, row: 0 },
      to: block?.position ?? { col: 0, row: 0 },
      direction: input.direction,
      moveCount: 0,
      levelPhase: 'playing',
    };
  }

  const occupancy = createOccupancy(blocks, block.uid);
  const vector = DIRECTION_VECTORS[input.direction];
  let current = { ...block.position };
  let distance = 0;

  while (true) {
    const next = {
      col: current.col + vector.col,
      row: current.row + vector.row,
    };
    const nextCells = getCells(block, next);

    if (!nextCells.every((cell) => isInBounds(cell, gridSize))) {
      const dock = docks.find((candidate) =>
        dockFitsBlock(candidate, block, current, input.direction),
      );
      if (dock) {
        return {
          blockUid: block.uid,
          moved: true,
          exited: true,
          distance,
          from: block.position,
          to: current,
          direction: input.direction,
          dockUid: dock.uid,
          moveCount: 0,
          levelPhase: 'playing',
        };
      }
      break;
    }

    if (nextCells.some((cell) => occupancy.has(cellKey(cell)))) {
      break;
    }

    current = next;
    distance++;
  }

  return {
    blockUid: block.uid,
    moved: distance > 0,
    exited: false,
    distance,
    from: block.position,
    to: current,
    direction: input.direction,
    moveCount: 0,
    levelPhase: 'playing',
  };
}

function blockedSwipeResult(
  input: DailyDispatchSwipeInput,
  moveCount: number,
  levelPhase: LevelPhase,
): DailyDispatchSwipeResult {
  return {
    blockUid: input.blockUid,
    moved: false,
    exited: false,
    distance: 0,
    from: { col: 0, row: 0 },
    to: { col: 0, row: 0 },
    direction: input.direction,
    moveCount,
    levelPhase,
  };
}

function simulateErase(
  blocks: EcsBlockState[],
  docks: EcsDockState[],
  input: DailyDispatchEraseInput,
  moveCount: number,
  levelPhase: LevelPhase,
): DailyDispatchEraseResult {
  const block = blocks.find((candidate) => candidate.uid === input.blockUid);
  if (
    !block ||
    block.exited ||
    !block.selectable ||
    levelPhase === 'complete'
  ) {
    return {
      blockUid: input.blockUid,
      erased: false,
      from: block?.position ?? { col: 0, row: 0 },
      moveCount,
      remainingBlocks: countRemainingTargetBlocks(blocks, docks),
      levelPhase,
    };
  }

  const nextBlocks = blocks.map((candidate) =>
    candidate.uid === input.blockUid
      ? { ...candidate, exited: true, selectable: false }
      : candidate,
  );
  const remainingBlocks = countRemainingTargetBlocks(nextBlocks, docks);

  return {
    blockUid: input.blockUid,
    erased: true,
    from: block.position,
    moveCount,
    remainingBlocks,
    levelPhase: remainingBlocks === 0 ? 'complete' : 'playing',
  };
}

function computeNextIndices(args: {
  chapterIndex: number;
  chapterCount: number;
  levelIndex: number;
  levelCount: number;
}): {
  nextChapterIndex: number;
  nextLevelIndex: number;
  hasNextChapter: boolean;
  hasNextLevel: boolean;
} {
  const hasNextLevel = args.levelIndex + 1 < args.levelCount;
  const hasNextChapter =
    !hasNextLevel && args.chapterIndex + 1 < args.chapterCount;
  return {
    nextChapterIndex: hasNextLevel
      ? args.chapterIndex
      : Math.min(args.chapterIndex + 1, Math.max(0, args.chapterCount - 1)),
    nextLevelIndex: hasNextLevel ? args.levelIndex + 1 : 0,
    hasNextChapter,
    hasNextLevel,
  };
}

export const dailyDispatchPlugin = Database.Plugin.create({
  components: {
    uid: { type: 'string', default: '' } as const,
    color: { type: 'string', default: '' } as const,
    shapeKey: { type: 'string', default: '' } as const,
    shapeOffsets: { type: 'string', default: '[]' } as const,
    gridX: I32.schema,
    gridY: I32.schema,
    wallSide: { type: 'string', default: '' } as const,
    wallIndex: U32.schema,
    dockIndices: { type: 'string', default: '[]' } as const,
    exited: { type: 'boolean', default: false } as const,
    closed: { type: 'boolean', default: false } as const,
    selectable: { type: 'boolean', default: true } as const,
    spriteKey: { type: 'string', default: '' } as const,
    spriteFrame: { type: 'string', default: '' } as const,
    openSpriteFrame: { type: 'string', default: '' } as const,
    closedSpriteFrame: { type: 'string', default: '' } as const,
    renderLayer: I32.schema,
    cellKey: { type: 'string', default: '' } as const,
    occupiedByBlockUid: { type: 'string', default: '' } as const,
  },
  resources: {
    storyPhase: { default: 'introduction' as StoryPhase },
    levelPhase: { default: 'ready' as LevelPhase },
    chapterId: { default: '' as string },
    chapterUid: { default: '' as string },
    chapterIndex: { default: 0 as number },
    chapterCount: { default: 0 as number },
    chapterName: { default: '' as string },
    countyName: { default: '' as string },
    levelUid: { default: '' as string },
    levelNumber: { default: 0 as number },
    levelIndex: { default: 0 as number },
    levelCount: { default: 0 as number },
    levelSeed: { default: 0 as number },
    currentClueUid: { default: '' as string },
    currentClueText: { default: '' as string },
    currentDialogueRef: { default: '' as string },
    storyIntroText: { default: '' as string },
    storyChapterStartText: { default: '' as string },
    storyCompletionText: { default: '' as string },
    headline: { default: '' as string },
    articleUrl: { default: '' as string },
    gridWidth: { default: 6 as number },
    gridHeight: { default: 6 as number },
    moveCount: { default: 0 as number },
    totalMoves: { default: 0 as number },
    optimalMoves: { default: 0 as number },
    completedLevels: { default: 0 as number },
    remainingBlocks: { default: 0 as number },
    openDocks: { default: 0 as number },
    nextChapterIndex: { default: 0 as number },
    nextLevelIndex: { default: 0 as number },
    hasNextChapter: { default: false as boolean },
    hasNextLevel: { default: false as boolean },
    completionAdvanceConsumed: { default: false as boolean },
  },
  archetypes: {
    Block: [
      'uid',
      'color',
      'shapeKey',
      'shapeOffsets',
      'gridX',
      'gridY',
      'exited',
      'selectable',
      'spriteKey',
      'spriteFrame',
      'renderLayer',
    ],
    Dock: [
      'uid',
      'color',
      'wallSide',
      'wallIndex',
      'dockIndices',
      'closed',
      'spriteKey',
      'openSpriteFrame',
      'closedSpriteFrame',
      'renderLayer',
    ],
    GridOccupancy: ['uid', 'cellKey', 'gridX', 'gridY', 'occupiedByBlockUid'],
  },
  computed: {
    chapterProgress: (db) =>
      Observe.withFilter(db.observe.resources.completedLevels, () => {
        const levelCount = db.resources.levelCount;
        return levelCount === 0 ? 0 : db.resources.completedLevels / levelCount;
      }),
    moveDelta: (db) =>
      Observe.withFilter(
        db.observe.resources.moveCount,
        () => db.resources.moveCount - db.resources.optimalMoves,
      ),
    isLevelComplete: (db) =>
      Observe.withFilter(
        db.observe.resources.levelPhase,
        () => db.resources.levelPhase === 'complete',
      ),
  },
  transactions: {
    loadLevel(t, input: DailyDispatchLoadLevelInput) {
      for (const entity of t.select(['uid'])) {
        t.delete(entity);
      }

      t.resources.chapterId = input.chapterId;
      t.resources.chapterUid = input.chapterUid;
      t.resources.chapterIndex = input.chapterIndex;
      t.resources.chapterCount = input.chapterCount;
      t.resources.chapterName = input.chapterName;
      t.resources.countyName = input.countyName;
      t.resources.headline = input.headline;
      t.resources.articleUrl = input.articleUrl;
      t.resources.levelUid = input.levelUid;
      t.resources.levelNumber = input.levelNumber;
      t.resources.levelIndex = input.levelIndex;
      t.resources.levelCount = input.levelCount;
      t.resources.levelSeed = input.levelSeed;
      t.resources.currentClueUid = input.currentClueUid;
      t.resources.currentClueText = input.currentClueText;
      t.resources.currentDialogueRef = input.currentDialogueRef;
      t.resources.storyIntroText =
        input.storyIntroText ?? input.currentClueText;
      t.resources.storyChapterStartText =
        input.storyChapterStartText ?? input.currentClueText;
      t.resources.storyCompletionText =
        input.storyCompletionText ?? input.currentClueText;
      t.resources.gridWidth = input.gridSize;
      t.resources.gridHeight = input.gridSize;
      t.resources.moveCount = 0;
      t.resources.optimalMoves = input.optimalMoves ?? 0;
      t.resources.storyPhase = input.storyPhase;
      t.resources.levelPhase = input.levelPhase;
      t.resources.completionAdvanceConsumed = false;

      const next = computeNextIndices({
        chapterIndex: input.chapterIndex,
        chapterCount: input.chapterCount,
        levelIndex: input.levelIndex,
        levelCount: input.levelCount,
      });
      t.resources.nextChapterIndex = next.nextChapterIndex;
      t.resources.nextLevelIndex = next.nextLevelIndex;
      t.resources.hasNextChapter = next.hasNextChapter;
      t.resources.hasNextLevel = next.hasNextLevel;

      for (const dock of input.docks) {
        t.archetypes.Dock.insert({
          uid: dock.uid,
          color: dock.color,
          wallSide: dock.side,
          wallIndex: dock.indices[0] ?? 0,
          dockIndices: encodeIndices(dock.indices),
          closed: false,
          spriteKey: dock.spriteKey,
          openSpriteFrame: dock.openSpriteFrame,
          closedSpriteFrame: dock.closedSpriteFrame,
          renderLayer: dock.renderLayer ?? 10,
        });
      }

      for (const block of input.blocks) {
        t.archetypes.Block.insert({
          uid: block.uid,
          color: block.color,
          shapeKey: block.shapeKey,
          shapeOffsets: encodeOffsets(block.shapeOffsets),
          gridX: block.position.col,
          gridY: block.position.row,
          exited: false,
          selectable: true,
          spriteKey: block.spriteKey,
          spriteFrame: block.spriteKey,
          renderLayer: block.renderLayer ?? 20,
        });

        for (const cell of getCells({
          shapeOffsets: block.shapeOffsets,
          position: block.position,
        })) {
          t.archetypes.GridOccupancy.insert({
            uid: `${block.uid}:${cellKey(cell)}`,
            cellKey: cellKey(cell),
            gridX: cell.col,
            gridY: cell.row,
            occupiedByBlockUid: block.uid,
          });
        }
      }

      const docks = input.docks.map(
        (dock): EcsDockState => ({
          entity: 0,
          uid: dock.uid,
          color: dock.color,
          side: dock.side,
          indices: dock.indices,
          closed: false,
          spriteKey: dock.spriteKey,
          openSpriteFrame: dock.openSpriteFrame,
          closedSpriteFrame: dock.closedSpriteFrame,
          renderLayer: dock.renderLayer ?? 10,
        }),
      );
      const blocks = input.blocks.map(
        (block): EcsBlockState => ({
          entity: 0,
          uid: block.uid,
          color: block.color,
          shapeKey: block.shapeKey,
          shapeOffsets: block.shapeOffsets,
          position: block.position,
          exited: false,
          selectable: true,
          spriteKey: block.spriteKey,
          renderLayer: block.renderLayer ?? 20,
        }),
      );

      t.resources.remainingBlocks = countRemainingTargetBlocks(blocks, docks);
      t.resources.openDocks = input.docks.length;
    },
    applySwipeResult(t, result: DailyDispatchSwipeResult) {
      if (!result.moved) return;

      for (const entity of t.select(['cellKey'])) {
        t.delete(entity);
      }

      const blockEntity = t
        .select(['uid', 'shapeOffsets', 'gridX', 'gridY'])
        .find((entity) => t.read(entity)?.uid === result.blockUid);
      if (blockEntity != null) {
        t.update(blockEntity, {
          gridX: result.to.col,
          gridY: result.to.row,
          exited: result.exited,
        });
      }

      if (result.dockUid) {
        const dockEntity = t
          .select(['uid', 'dockIndices', 'closed'])
          .find((entity) => t.read(entity)?.uid === result.dockUid);
        if (dockEntity != null) {
          t.update(dockEntity, { closed: true });
        }
      }

      t.resources.moveCount += 1;
      t.resources.totalMoves += 1;

      const blocks = readBlocks(t);
      const docks = readDocks(t);
      for (const block of blocks) {
        if (block.exited) continue;
        for (const cell of getCells(block)) {
          t.archetypes.GridOccupancy.insert({
            uid: `${block.uid}:${cellKey(cell)}`,
            cellKey: cellKey(cell),
            gridX: cell.col,
            gridY: cell.row,
            occupiedByBlockUid: block.uid,
          });
        }
      }

      t.resources.remainingBlocks = countRemainingTargetBlocks(blocks, docks);
      t.resources.openDocks = docks.filter((dock) => !dock.closed).length;
      t.resources.levelPhase =
        t.resources.remainingBlocks === 0 ? 'complete' : 'playing';
    },
    applyEraseResult(t, result: DailyDispatchEraseResult) {
      if (!result.erased) return;

      for (const entity of t.select(['cellKey'])) {
        t.delete(entity);
      }

      const blockEntity = t
        .select(['uid', 'shapeOffsets', 'gridX', 'gridY'])
        .find((entity) => t.read(entity)?.uid === result.blockUid);
      if (blockEntity != null) {
        t.update(blockEntity, {
          exited: true,
          selectable: false,
        });
      }

      const blocks = readBlocks(t);
      const docks = readDocks(t);
      for (const block of blocks) {
        if (block.exited) continue;
        for (const cell of getCells(block)) {
          t.archetypes.GridOccupancy.insert({
            uid: `${block.uid}:${cellKey(cell)}`,
            cellKey: cellKey(cell),
            gridX: cell.col,
            gridY: cell.row,
            occupiedByBlockUid: block.uid,
          });
        }
      }

      t.resources.remainingBlocks = countRemainingTargetBlocks(blocks, docks);
      t.resources.openDocks = docks.filter((dock) => !dock.closed).length;
      t.resources.levelPhase =
        t.resources.remainingBlocks === 0 ? 'complete' : 'playing';
    },
    consumeCompletionAdvance(t) {
      if (t.resources.levelPhase !== 'complete') return;

      if (!t.resources.completionAdvanceConsumed) {
        t.resources.completedLevels += 1;
        t.resources.completionAdvanceConsumed = true;
      }

      t.resources.storyPhase = t.resources.hasNextLevel
        ? 'playing'
        : t.resources.hasNextChapter
          ? 'chapter-end'
          : 'all-done';
    },
    setStoryPhase(t, phase: StoryPhase) {
      t.resources.storyPhase = phase;
    },
    hydrateProgress(t, progress: Partial<DailyDispatchProgressSnapshot>) {
      if (progress.chapterId != null)
        t.resources.chapterId = progress.chapterId;
      if (progress.chapterUid != null)
        t.resources.chapterUid = progress.chapterUid;
      if (progress.countyName != null)
        t.resources.countyName = progress.countyName;
      if (progress.levelUid != null) t.resources.levelUid = progress.levelUid;
      if (progress.chapterIndex != null)
        t.resources.chapterIndex = progress.chapterIndex;
      if (progress.levelIndex != null)
        t.resources.levelIndex = progress.levelIndex;
      if (progress.levelNumber != null)
        t.resources.levelNumber = progress.levelNumber;
      if (progress.levelCount != null)
        t.resources.levelCount = progress.levelCount;
      if (progress.levelSeed != null)
        t.resources.levelSeed = progress.levelSeed;
      if (progress.moveCount != null)
        t.resources.moveCount = progress.moveCount;
      if (progress.completedLevels != null)
        t.resources.completedLevels = progress.completedLevels;
      if (progress.storyPhase != null)
        t.resources.storyPhase = progress.storyPhase;
    },
    hydrateBlockState(t, input: DailyDispatchHydrateBlockStateInput) {
      for (const entity of t.select(['cellKey'])) {
        t.delete(entity);
      }

      const exitedIds = new Set(input.exitedIds);
      for (const entity of t.select(['uid', 'shapeOffsets', 'gridX', 'gridY'])) {
        const row = t.read(entity);
        const uid = String(row?.uid ?? '');
        if (!uid || row?.shapeOffsets == null) continue;
        const position = input.positions[uid];
        t.update(entity, {
          ...(position
            ? {
                gridX: position.col,
                gridY: position.row,
              }
            : {}),
          exited: exitedIds.has(uid),
          selectable: !exitedIds.has(uid),
        });
      }

      const blocks = readBlocks(t);
      const docks = readDocks(t);
      for (const block of blocks) {
        if (block.exited) continue;
        for (const cell of getCells(block)) {
          t.archetypes.GridOccupancy.insert({
            uid: `${block.uid}:${cellKey(cell)}`,
            cellKey: cellKey(cell),
            gridX: cell.col,
            gridY: cell.row,
            occupiedByBlockUid: block.uid,
          });
        }
      }

      t.resources.moveCount = Math.max(0, input.moveCount);
      t.resources.remainingBlocks = countRemainingTargetBlocks(blocks, docks);
      t.resources.openDocks = docks.filter((dock) => !dock.closed).length;
      t.resources.levelPhase =
        t.resources.remainingBlocks === 0 ? 'complete' : 'playing';
    },
  },
  actions: {
    loadLevel(db, input: DailyDispatchLoadLevelInput) {
      db.transactions.loadLevel(input);
    },
    executeSwipe(db, input: DailyDispatchSwipeInput): DailyDispatchSwipeResult {
      if (db.resources.levelPhase !== 'playing') {
        return blockedSwipeResult(
          input,
          db.resources.moveCount,
          db.resources.levelPhase,
        );
      }

      const blocks = readBlocks(db);
      const docks = readDocks(db);
      const result = simulateSwipe(
        blocks,
        docks,
        db.resources.gridWidth,
        input,
      );
      if (!result.moved) {
        return {
          ...result,
          moveCount: db.resources.moveCount,
          levelPhase: db.resources.levelPhase,
        };
      }

      db.transactions.applySwipeResult(result);
      return {
        ...result,
        moveCount: db.resources.moveCount,
        levelPhase: db.resources.levelPhase,
      };
    },
    eraseBlock(db, input: DailyDispatchEraseInput): DailyDispatchEraseResult {
      const blocks = readBlocks(db);
      const docks = readDocks(db);
      const result = simulateErase(
        blocks,
        docks,
        input,
        db.resources.moveCount,
        db.resources.levelPhase,
      );
      if (!result.erased) {
        return result;
      }

      db.transactions.applyEraseResult(result);
      return {
        ...result,
        remainingBlocks: db.resources.remainingBlocks,
        levelPhase: db.resources.levelPhase,
      };
    },
    advanceAfterCompletion(db): DailyDispatchCompletionAdvanceResult {
      if (db.resources.levelPhase !== 'complete') {
        return {
          kind: 'not-complete',
          chapterIndex: db.resources.chapterIndex,
          levelIndex: db.resources.levelIndex,
          completedLevels: db.resources.completedLevels,
          storyPhase: db.resources.storyPhase,
          levelPhase: db.resources.levelPhase,
        };
      }

      db.transactions.consumeCompletionAdvance();
      return {
        kind: db.resources.hasNextLevel
          ? 'next-level'
          : db.resources.hasNextChapter
            ? 'next-chapter'
            : 'all-done',
        chapterIndex: db.resources.nextChapterIndex,
        levelIndex: db.resources.nextLevelIndex,
        completedLevels: db.resources.completedLevels,
        storyPhase: db.resources.storyPhase,
        levelPhase: db.resources.levelPhase,
      };
    },
    advanceStoryPhase(db, phase: StoryPhase) {
      db.transactions.setStoryPhase(phase);
    },
    hydrateProgress(db, progress: Partial<DailyDispatchProgressSnapshot>) {
      db.transactions.hydrateProgress(progress);
    },
    hydrateBlockState(db, input: DailyDispatchHydrateBlockStateInput) {
      db.transactions.hydrateBlockState(input);
    },
    snapshot(db): DailyDispatchDebugSnapshot {
      const blocks = readBlocks(db).map((block) => ({
        uid: block.uid,
        color: block.color,
        shapeKey: block.shapeKey,
        shapeOffsets: block.shapeOffsets,
        position: block.position,
        spriteKey: block.spriteKey,
        renderLayer: block.renderLayer,
        exited: block.exited,
      }));
      const docks = readDocks(db).map((dock) => ({
        uid: dock.uid,
        color: dock.color,
        side: dock.side,
        indices: dock.indices,
        spriteKey: dock.spriteKey,
        openSpriteFrame: dock.openSpriteFrame,
        closedSpriteFrame: dock.closedSpriteFrame,
        renderLayer: dock.renderLayer,
        closed: dock.closed,
      }));

      return {
        resources: {
          chapterId: db.resources.chapterId,
          chapterUid: db.resources.chapterUid,
          chapterIndex: db.resources.chapterIndex,
          chapterCount: db.resources.chapterCount,
          chapterName: db.resources.chapterName,
          countyName: db.resources.countyName,
          levelUid: db.resources.levelUid,
          levelNumber: db.resources.levelNumber,
          levelIndex: db.resources.levelIndex,
          levelCount: db.resources.levelCount,
          levelSeed: db.resources.levelSeed,
          gridSize: db.resources.gridWidth,
          moveCount: db.resources.moveCount,
          totalMoves: db.resources.totalMoves,
          optimalMoves: db.resources.optimalMoves,
          completedLevels: db.resources.completedLevels,
          storyPhase: db.resources.storyPhase,
          levelPhase: db.resources.levelPhase,
          currentClueText: db.resources.currentClueText,
          currentDialogueRef: db.resources.currentDialogueRef,
          storyIntroText: db.resources.storyIntroText,
          storyChapterStartText: db.resources.storyChapterStartText,
          storyCompletionText: db.resources.storyCompletionText,
          headline: db.resources.headline,
          articleUrl: db.resources.articleUrl,
          remainingBlocks: db.resources.remainingBlocks,
          openDocks: db.resources.openDocks,
          nextChapterIndex: db.resources.nextChapterIndex,
          nextLevelIndex: db.resources.nextLevelIndex,
          hasNextChapter: db.resources.hasNextChapter,
          hasNextLevel: db.resources.hasNextLevel,
        },
        blocks,
        docks,
      };
    },
    snapshotProgress(db): DailyDispatchProgressSnapshot {
      return {
        chapterId: db.resources.chapterId,
        chapterUid: db.resources.chapterUid,
        countyName: db.resources.countyName,
        levelUid: db.resources.levelUid,
        chapterIndex: db.resources.chapterIndex,
        levelIndex: db.resources.levelIndex,
        levelNumber: db.resources.levelNumber,
        levelCount: db.resources.levelCount,
        levelSeed: db.resources.levelSeed,
        moveCount: db.resources.moveCount,
        completedLevels: db.resources.completedLevels,
        storyPhase: db.resources.storyPhase,
      };
    },
  },
});

export type DailyDispatchDatabase = Database.FromPlugin<
  typeof dailyDispatchPlugin
>;
export type DailyDispatchRuntimeDatabase = DailyDispatchDatabase & {
  actions: DailyDispatchDatabase['actions'] & {
    loadLevel(input: DailyDispatchLoadLevelInput): void;
    executeSwipe(input: DailyDispatchSwipeInput): DailyDispatchSwipeResult;
    eraseBlock(input: DailyDispatchEraseInput): DailyDispatchEraseResult;
    advanceAfterCompletion(): DailyDispatchCompletionAdvanceResult;
    advanceStoryPhase(phase: StoryPhase): void;
    hydrateProgress(progress: Partial<DailyDispatchProgressSnapshot>): void;
    hydrateBlockState(input: DailyDispatchHydrateBlockStateInput): void;
    snapshot(): DailyDispatchDebugSnapshot;
    snapshotProgress(): DailyDispatchProgressSnapshot;
  };
};

export function createDailyDispatchWorld(): DailyDispatchRuntimeDatabase {
  return Database.create(dailyDispatchPlugin) as DailyDispatchRuntimeDatabase;
}
