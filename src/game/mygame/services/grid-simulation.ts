import type { GridPosition } from '../ecs/daily-dispatch-plugin';
import {
  getDispatchShapeCells,
  getDispatchShapeCols,
  getDispatchShapeRows,
} from '../data/daily-dispatch-shapes';
import {
  DAILY_DISPATCH_GRID_SIZE,
  DISPATCH_DIRECTION_TO_WALL,
  DISPATCH_DIRECTION_VECTORS,
  dispatchPositionKey,
  isDispatchPositionInBounds,
  type DispatchBlockState,
  type DispatchDockState,
  type DispatchLevelConfig,
  type DispatchPuzzleDirection,
} from './daily-dispatch-puzzle-types';

export interface DispatchSlideResult {
  moved: boolean;
  newPosition?: GridPosition;
  distance: number;
  exitedDock: DispatchDockState | null;
}

// Parity-critical pure simulation translated from the legacy source. Generator,
// solver, and ECS swipe behavior all depend on these movement rules matching.
export class DailyDispatchGridSimulation {
  readonly gridSize: number;
  readonly blocks: Map<string, DispatchBlockState>;
  readonly docks: Map<string, DispatchDockState>;

  private occupancy: Map<string, string>;

  constructor(config: DispatchLevelConfig) {
    this.gridSize = config.gridSize || DAILY_DISPATCH_GRID_SIZE;
    this.blocks = new Map();
    this.docks = new Map();
    this.occupancy = new Map();

    for (const placement of config.blocks) {
      const state: DispatchBlockState = { ...placement, exited: false };
      this.blocks.set(placement.id, state);
      this.placeOnGrid(state);
    }

    for (const placement of config.docks) {
      this.docks.set(placement.id, { ...placement, closed: false });
    }
  }

  slideBlock(blockId: string, direction: DispatchPuzzleDirection): DispatchSlideResult {
    const block = this.blocks.get(blockId);
    if (!block || block.exited) {
      return { moved: false, distance: 0, exitedDock: null };
    }

    const vector = DISPATCH_DIRECTION_VECTORS[direction];
    this.removeFromGrid(block);

    let currentPosition = { ...block.position };
    let distance = 0;

    while (true) {
      const nextPosition = {
        col: currentPosition.col + vector.col,
        row: currentPosition.row + vector.row,
      };
      const nextCells = getDispatchShapeCells(block.shape, nextPosition);

      if (!nextCells.every((cell) => isDispatchPositionInBounds(cell, this.gridSize))) {
        const exitDock = this.checkExit(block, currentPosition, direction);
        if (exitDock) {
          block.exited = true;
          block.position = currentPosition;
          exitDock.closed = true;
          return { moved: true, newPosition: currentPosition, distance, exitedDock: exitDock };
        }
        break;
      }

      if (nextCells.some((cell) => this.occupancy.has(dispatchPositionKey(cell)))) {
        break;
      }

      currentPosition = nextPosition;
      distance++;
    }

    block.position = currentPosition;
    this.placeOnGrid(block);

    return {
      moved: distance > 0,
      newPosition: currentPosition,
      distance,
      exitedDock: null,
    };
  }

  isLevelComplete(): boolean {
    const dockColors = new Set<string>();
    for (const dock of this.docks.values()) {
      dockColors.add(dock.color);
    }

    for (const block of this.blocks.values()) {
      if (dockColors.has(block.color) && !block.exited) {
        return false;
      }
    }
    return true;
  }

  getBlock(blockId: string): DispatchBlockState | undefined {
    return this.blocks.get(blockId);
  }

  private checkExit(
    block: DispatchBlockState,
    position: GridPosition,
    direction: DispatchPuzzleDirection,
  ): DispatchDockState | null {
    const wall = DISPATCH_DIRECTION_TO_WALL[direction];
    const perpendicularIndices = this.getPerpendicularIndices(block, position, direction);

    for (const dock of this.docks.values()) {
      if (dock.wall !== wall) continue;
      if (dock.color !== block.color) continue;
      if (dock.closed) continue;

      const dockIndices = new Set(dock.wallIndices);
      if (perpendicularIndices.every((index) => dockIndices.has(index))) {
        return dock;
      }
    }

    return null;
  }

  private getPerpendicularIndices(
    block: DispatchBlockState,
    position: GridPosition,
    direction: DispatchPuzzleDirection,
  ): number[] {
    if (direction === 'left' || direction === 'right') {
      return getDispatchShapeRows(block.shape, position);
    }
    return getDispatchShapeCols(block.shape, position);
  }

  private placeOnGrid(block: DispatchBlockState): void {
    for (const cell of getDispatchShapeCells(block.shape, block.position)) {
      this.occupancy.set(dispatchPositionKey(cell), block.id);
    }
  }

  private removeFromGrid(block: DispatchBlockState): void {
    for (const cell of getDispatchShapeCells(block.shape, block.position)) {
      this.occupancy.delete(dispatchPositionKey(cell));
    }
  }
}
