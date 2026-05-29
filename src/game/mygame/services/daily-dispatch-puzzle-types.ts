import type {
  DispatchColor,
  DockSide,
  GridPosition,
  ShapeOffset,
} from '../ecs/daily-dispatch-plugin';

export type DispatchBlockShape =
  | 'DOT'
  | 'I2_H'
  | 'I2_V'
  | 'I3_H'
  | 'I3_V'
  | 'I4_H'
  | 'I4_V'
  | 'L'
  | 'J'
  | 'T'
  | 'O'
  | 'S'
  | 'Z'
  | 'RECT_2x3'
  | 'RECT_3x2';

export type DispatchDifficultyTier = 'easy' | 'medium' | 'hard';
export type DispatchPuzzleDirection = 'up' | 'down' | 'left' | 'right';

export interface DispatchShapeDefinition {
  cells: ShapeOffset[];
  width: number;
  height: number;
}

export interface DispatchBlockPlacement {
  id: string;
  color: DispatchColor;
  shape: DispatchBlockShape;
  position: GridPosition;
}

export interface DispatchBlockState extends DispatchBlockPlacement {
  exited: boolean;
}

export interface DispatchDockPlacement {
  id: string;
  color: DispatchColor;
  wall: DockSide;
  wallIndices: number[];
}

export interface DispatchDockState extends DispatchDockPlacement {
  closed: boolean;
}

export interface DispatchLevelConfig {
  id: string;
  blocks: DispatchBlockPlacement[];
  docks: DispatchDockPlacement[];
  gridSize: number;
  clue?: string;
  optimalMoves?: number;
}

export interface DispatchDifficultySettings {
  colorCount: number;
  obstacleCount: number;
  scrambleMoves: number;
  allowedShapes: DispatchBlockShape[];
}

export const DAILY_DISPATCH_GRID_SIZE = 6;

export const DISPATCH_BLOCK_COLORS: DispatchColor[] = [
  'blue',
  'cyan',
  'orange',
  'pink',
  'purple',
  'yellow',
];

export const DISPATCH_DIRECTION_VECTORS: Record<DispatchPuzzleDirection, GridPosition> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

export const DISPATCH_DIRECTION_TO_WALL: Record<DispatchPuzzleDirection, DockSide> = {
  up: 'top',
  down: 'bottom',
  left: 'left',
  right: 'right',
};

export const DISPATCH_DIFFICULTY_PRESETS: Record<DispatchDifficultyTier, DispatchDifficultySettings> = {
  easy: {
    colorCount: 2,
    obstacleCount: 0,
    scrambleMoves: 4,
    allowedShapes: ['DOT', 'I2_H', 'I2_V', 'I3_H', 'I3_V'],
  },
  medium: {
    colorCount: 3,
    obstacleCount: 1,
    scrambleMoves: 6,
    allowedShapes: ['DOT', 'I2_H', 'I2_V', 'I3_H', 'I3_V', 'L', 'J', 'T', 'O'],
  },
  hard: {
    colorCount: 4,
    obstacleCount: 2,
    scrambleMoves: 8,
    allowedShapes: ['DOT', 'I2_H', 'I2_V', 'I3_H', 'I3_V', 'I4_H', 'I4_V', 'L', 'J', 'T', 'O', 'S', 'Z'],
  },
};

const CHAPTER_LEVEL_PROGRESSION: Record<number, DispatchDifficultyTier[]> = {
  5: ['easy', 'medium', 'medium', 'medium', 'hard'],
  6: ['easy', 'medium', 'medium', 'medium', 'hard', 'hard'],
  7: ['easy', 'easy', 'medium', 'medium', 'medium', 'hard', 'hard'],
  8: ['easy', 'easy', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard'],
  9: ['easy', 'easy', 'medium', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard'],
  10: ['easy', 'easy', 'easy', 'medium', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard'],
};

export function getDifficultyForChapterLevel(
  levelIndex: number,
  chapterLength: number,
): DispatchDifficultyTier {
  const progression = CHAPTER_LEVEL_PROGRESSION[chapterLength];
  if (progression) return progression[Math.min(levelIndex, progression.length - 1)];

  const ratio = levelIndex / Math.max(1, chapterLength - 1);
  if (ratio < 0.3) return 'easy';
  if (ratio < 0.7) return 'medium';
  return 'hard';
}

export function dispatchPositionKey(position: GridPosition): string {
  return `${position.col},${position.row}`;
}

export function isDispatchPositionInBounds(
  position: GridPosition,
  size: number = DAILY_DISPATCH_GRID_SIZE,
): boolean {
  return position.col >= 0 && position.col < size && position.row >= 0 && position.row < size;
}
