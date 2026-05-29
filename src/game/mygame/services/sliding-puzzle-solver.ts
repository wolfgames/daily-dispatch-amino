import { DailyDispatchGridSimulation } from './grid-simulation';
import {
  type DispatchLevelConfig,
  type DispatchPuzzleDirection,
} from './daily-dispatch-puzzle-types';

const SOLVER_DIRECTIONS: DispatchPuzzleDirection[] = ['up', 'down', 'left', 'right'];

export interface DispatchSolverMove {
  blockId: string;
  direction: DispatchPuzzleDirection;
}

export interface DispatchSolverResult {
  solvable: boolean;
  moves: DispatchSolverMove[];
  optimalMoveCount: number;
}

interface DispatchBfsNode {
  blockPositions: Map<string, { col: number; row: number }>;
  closedDockIds: Set<string>;
  exitedBlockIds: Set<string>;
  path: DispatchSolverMove[];
}

function encodeSolverState(
  blockPositions: Map<string, { col: number; row: number }>,
  exitedBlockIds: Set<string>,
): string {
  const parts: string[] = [];
  for (const [id, position] of [...blockPositions.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    parts.push(`${id}:${position.col},${position.row}`);
  }
  for (const id of [...exitedBlockIds].sort()) {
    parts.push(`${id}:X`);
  }
  return parts.join('|');
}

function buildSolverStateConfig(
  baseConfig: DispatchLevelConfig,
  blockPositions: Map<string, { col: number; row: number }>,
  closedDockIds: Set<string>,
): DispatchLevelConfig {
  return {
    id: baseConfig.id,
    gridSize: baseConfig.gridSize,
    blocks: baseConfig.blocks
      .filter((block) => blockPositions.has(block.id))
      .map((block) => ({ ...block, position: { ...blockPositions.get(block.id)! } })),
    docks: baseConfig.docks.filter((dock) => !closedDockIds.has(dock.id)),
  };
}

function isSolverComplete(
  baseConfig: DispatchLevelConfig,
  exitedBlockIds: Set<string>,
): boolean {
  const dockColors = new Set(baseConfig.docks.map((dock) => dock.color));
  return baseConfig.blocks
    .filter((block) => dockColors.has(block.color))
    .every((block) => exitedBlockIds.has(block.id));
}

// Parity-critical BFS solver translated from the legacy source. It verifies
// generated levels and records the optimal move count used by runtime state.
export function solveDispatchPuzzle(
  config: DispatchLevelConfig,
  maxDepth = 40,
  maxNodes = 50000,
): DispatchSolverResult {
  const initial = new DailyDispatchGridSimulation(config);
  if (initial.isLevelComplete()) {
    return { solvable: true, moves: [], optimalMoveCount: 0 };
  }

  const initialPositions = new Map<string, { col: number; row: number }>();
  const initialExited = new Set<string>();
  for (const [id, block] of initial.blocks) {
    if (block.exited) {
      initialExited.add(id);
    } else {
      initialPositions.set(id, { ...block.position });
    }
  }

  const visited = new Set<string>();
  visited.add(encodeSolverState(initialPositions, initialExited));

  let queue: DispatchBfsNode[] = [
    {
      blockPositions: initialPositions,
      closedDockIds: new Set(),
      exitedBlockIds: initialExited,
      path: [],
    },
  ];

  let nodesExplored = 0;

  while (queue.length > 0 && queue[0].path.length < maxDepth) {
    const nextQueue: DispatchBfsNode[] = [];

    for (const node of queue) {
      for (const blockId of node.blockPositions.keys()) {
        for (const direction of SOLVER_DIRECTIONS) {
          if (nodesExplored >= maxNodes) {
            return { solvable: false, moves: [], optimalMoveCount: -1 };
          }
          nodesExplored++;

          const stateConfig = buildSolverStateConfig(config, node.blockPositions, node.closedDockIds);
          const simulation = new DailyDispatchGridSimulation(stateConfig);
          const result = simulation.slideBlock(blockId, direction);
          if (!result.moved) continue;

          const newPositions = new Map<string, { col: number; row: number }>();
          const newExited = new Set(node.exitedBlockIds);
          const newClosedDocks = new Set(node.closedDockIds);

          for (const [id, block] of simulation.blocks) {
            if (block.exited) {
              newExited.add(id);
            } else {
              newPositions.set(id, { ...block.position });
            }
          }

          if (result.exitedDock) {
            newClosedDocks.add(result.exitedDock.id);
          }

          const stateKey = encodeSolverState(newPositions, newExited);
          if (visited.has(stateKey)) continue;
          visited.add(stateKey);

          const newPath = [...node.path, { blockId, direction }];
          if (isSolverComplete(config, newExited)) {
            return { solvable: true, moves: newPath, optimalMoveCount: newPath.length };
          }

          nextQueue.push({
            blockPositions: newPositions,
            closedDockIds: newClosedDocks,
            exitedBlockIds: newExited,
            path: newPath,
          });
        }
      }
    }

    queue = nextQueue;
  }

  return { solvable: false, moves: [], optimalMoveCount: -1 };
}
