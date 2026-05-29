import type { DockSide, GridPosition } from '../ecs/daily-dispatch-plugin';
import {
  DAILY_DISPATCH_SHAPES,
  getDispatchShapeCells,
  getDispatchShapeCols,
  getDispatchShapeRows,
} from '../data/daily-dispatch-shapes';
import {
  DAILY_DISPATCH_GRID_SIZE,
  DISPATCH_BLOCK_COLORS,
  dispatchPositionKey,
  type DispatchBlockPlacement,
  type DispatchBlockShape,
  type DispatchDifficultySettings,
  type DispatchLevelConfig,
  type DispatchPuzzleDirection,
} from './daily-dispatch-puzzle-types';
import { DailyDispatchDeterministicRng } from './deterministic-rng';
import { DailyDispatchGridSimulation } from './grid-simulation';
import { solveDispatchPuzzle } from './sliding-puzzle-solver';

const ALL_WALLS: DockSide[] = ['left', 'right', 'top', 'bottom'];
const SCRAMBLE_DIRECTIONS: DispatchPuzzleDirection[] = ['up', 'down', 'left', 'right'];

export interface DispatchGeneratorConfig {
  difficulty: DispatchDifficultySettings;
  gridSize?: number;
  seed: number;
  levelId: string;
  maxRetries?: number;
  solverMaxDepth?: number;
}

// Parity-critical deterministic translation of the active legacy
// SlidingPuzzleGenerator. This intentionally excludes stale citylines road
// generation and preserves source-seed backward generation plus BFS checking.
export function generateDispatchPuzzle(config: DispatchGeneratorConfig): DispatchLevelConfig | null {
  const {
    difficulty,
    seed,
    levelId,
    maxRetries = 20,
    solverMaxDepth = 40,
  } = config;
  const gridSize = config.gridSize ?? DAILY_DISPATCH_GRID_SIZE;
  const rng = DailyDispatchDeterministicRng.fromSeed(seed);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = tryGenerateDispatchPuzzle(rng, difficulty, gridSize, levelId, solverMaxDepth);
    if (result) return result;
    rng.unsafeJump();
  }

  return null;
}

function tryGenerateDispatchPuzzle(
  rng: DailyDispatchDeterministicRng,
  difficulty: DispatchDifficultySettings,
  gridSize: number,
  levelId: string,
  solverMaxDepth: number,
): DispatchLevelConfig | null {
  const { colorCount, obstacleCount, scrambleMoves, allowedShapes } = difficulty;
  const shuffledColors = shuffle([...DISPATCH_BLOCK_COLORS], rng);
  const blockColors = shuffledColors.slice(0, colorCount);
  const obstacleColors = shuffledColors.slice(colorCount, colorCount + obstacleCount);

  const blockShapes: DispatchBlockShape[] = [];
  for (let i = 0; i < colorCount; i++) {
    const shapeIndex = rng.unsafeUniformIntDistributionInternal(allowedShapes.length);
    blockShapes.push(allowedShapes[shapeIndex]);
  }

  const obstacleShapes: DispatchBlockShape[] = [];
  const simpleShapes = allowedShapes.filter((shape) =>
    ['DOT', 'I2_H', 'I2_V', 'I3_H', 'I3_V'].includes(shape)
  );
  const obstaclePool = simpleShapes.length > 0 ? simpleShapes : allowedShapes;
  for (let i = 0; i < obstacleCount; i++) {
    const shapeIndex = rng.unsafeUniformIntDistributionInternal(obstaclePool.length);
    obstacleShapes.push(obstaclePool[shapeIndex]);
  }

  const walls = assignWalls(colorCount, rng);
  const blocks: DispatchBlockPlacement[] = [];
  const docks: DispatchLevelConfig['docks'] = [];
  const occupancy = new Map<string, string>();
  const wallUsedIndices = new Map<DockSide, Set<number>>();
  for (const wall of ALL_WALLS) wallUsedIndices.set(wall, new Set());

  for (let i = 0; i < colorCount; i++) {
    const color = blockColors[i];
    const shape = blockShapes[i];
    const wall = walls[i];
    const shapeDefinition = DAILY_DISPATCH_SHAPES[shape];
    const isHorizontalExit = wall === 'left' || wall === 'right';
    const perpendicularSize = isHorizontalExit ? shapeDefinition.height : shapeDefinition.width;
    const maxPerpendicularStart = gridSize - perpendicularSize;
    const usedSet = wallUsedIndices.get(wall)!;
    const perpendicularStart = findPerpendicularPosition(
      shape,
      maxPerpendicularStart,
      isHorizontalExit,
      usedSet,
      rng,
    );
    if (perpendicularStart === -1) return null;

    const perpendicularIndices = computePerpendicularIndices(shape, perpendicularStart, isHorizontalExit);
    perpendicularIndices.forEach((index) => usedSet.add(index));

    const anchor = computeExitAnchor(
      wall,
      perpendicularStart,
      shapeDefinition,
      gridSize,
    );
    const cells = getDispatchShapeCells(shape, anchor);
    if (cells.some((cell) => occupancy.has(dispatchPositionKey(cell)))) return null;

    const blockId = `block_${color}`;
    blocks.push({ id: blockId, color, shape, position: anchor });
    cells.forEach((cell) => occupancy.set(dispatchPositionKey(cell), blockId));

    docks.push({
      id: `dock_${color}`,
      color,
      wall,
      wallIndices: isHorizontalExit
        ? getDispatchShapeRows(shape, anchor)
        : getDispatchShapeCols(shape, anchor),
    });
  }

  for (let i = 0; i < obstacleCount; i++) {
    const color = obstacleColors[i];
    const shape = obstacleShapes[i];
    const shapeDefinition = DAILY_DISPATCH_SHAPES[shape];

    let placed = false;
    for (let tries = 0; tries < 50; tries++) {
      const col = rng.unsafeUniformIntDistributionInternal(gridSize - shapeDefinition.width + 1);
      const row = rng.unsafeUniformIntDistributionInternal(gridSize - shapeDefinition.height + 1);
      const anchor = { col, row };
      const cells = getDispatchShapeCells(shape, anchor);

      if (!cells.some((cell) => occupancy.has(dispatchPositionKey(cell)))) {
        const blockId = `obstacle_${i}`;
        blocks.push({ id: blockId, color, shape, position: anchor });
        cells.forEach((cell) => occupancy.set(dispatchPositionKey(cell), blockId));
        placed = true;
        break;
      }
    }

    if (!placed) return null;
  }

  const scrambleConfig: DispatchLevelConfig = {
    id: 'scramble',
    blocks: blocks.map((block) => ({ ...block, position: { ...block.position } })),
    docks: [],
    gridSize,
  };
  const scrambleSimulation = new DailyDispatchGridSimulation(scrambleConfig);
  const allBlockIds = blocks.map((block) => block.id);

  let effectiveMoves = 0;
  const maxAttempts = scrambleMoves * 4;
  for (let move = 0; move < maxAttempts && effectiveMoves < scrambleMoves; move++) {
    const blockIndex = rng.unsafeUniformIntDistributionInternal(allBlockIds.length);
    const directionIndex = rng.unsafeUniformIntDistributionInternal(SCRAMBLE_DIRECTIONS.length);
    const result = scrambleSimulation.slideBlock(
      allBlockIds[blockIndex],
      SCRAMBLE_DIRECTIONS[directionIndex],
    );
    if (result.moved) effectiveMoves++;
  }

  const scrambledBlocks = blocks.map((block): DispatchBlockPlacement => {
    const state = scrambleSimulation.getBlock(block.id)!;
    return {
      id: block.id,
      color: block.color,
      shape: block.shape,
      position: { ...state.position },
    };
  });

  const finalConfig: DispatchLevelConfig = {
    id: levelId,
    blocks: scrambledBlocks,
    docks,
    gridSize,
  };
  const solution = solveDispatchPuzzle(finalConfig, solverMaxDepth);
  if (!solution.solvable) return null;
  if (solution.optimalMoveCount < 2) return null;

  finalConfig.optimalMoves = solution.optimalMoveCount;
  return finalConfig;
}

function shuffle<T>(items: T[], rng: DailyDispatchDeterministicRng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rng.unsafeUniformIntDistributionInternal(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function assignWalls(count: number, rng: DailyDispatchDeterministicRng): DockSide[] {
  const shuffled = shuffle([...ALL_WALLS], rng);
  const walls: DockSide[] = [];
  for (let i = 0; i < count; i++) {
    walls.push(shuffled[i % shuffled.length]);
  }
  return walls;
}

function findPerpendicularPosition(
  shape: DispatchBlockShape,
  maxPerpendicularStart: number,
  isHorizontalExit: boolean,
  usedSet: Set<number>,
  rng: DailyDispatchDeterministicRng,
): number {
  const tried = new Set<number>();

  for (let attempt = 0; attempt <= maxPerpendicularStart; attempt++) {
    const candidate = rng.unsafeUniformIntDistributionInternal(maxPerpendicularStart + 1);
    if (tried.has(candidate)) continue;
    tried.add(candidate);

    const perpendicularIndices = computePerpendicularIndices(shape, candidate, isHorizontalExit);
    if (!perpendicularIndices.some((index) => usedSet.has(index))) {
      return candidate;
    }
  }

  for (let position = 0; position <= maxPerpendicularStart; position++) {
    if (tried.has(position)) continue;
    const perpendicularIndices = computePerpendicularIndices(shape, position, isHorizontalExit);
    if (!perpendicularIndices.some((index) => usedSet.has(index))) {
      return position;
    }
  }

  return -1;
}

function computePerpendicularIndices(
  shape: DispatchBlockShape,
  perpendicularStart: number,
  isHorizontalExit: boolean,
): number[] {
  if (isHorizontalExit) {
    return getDispatchShapeRows(shape, { col: 0, row: perpendicularStart });
  }
  return getDispatchShapeCols(shape, { col: perpendicularStart, row: 0 });
}

function computeExitAnchor(
  wall: DockSide,
  perpendicularStart: number,
  shapeDefinition: { width: number; height: number },
  gridSize: number,
): GridPosition {
  switch (wall) {
    case 'left':
      return { col: 0, row: perpendicularStart };
    case 'right':
      return { col: gridSize - shapeDefinition.width, row: perpendicularStart };
    case 'top':
      return { col: perpendicularStart, row: 0 };
    case 'bottom':
      return { col: perpendicularStart, row: gridSize - shapeDefinition.height };
  }
}
