import type { ShapeOffset } from '../ecs/daily-dispatch-plugin';
import type {
  DispatchBlockShape,
  DispatchShapeDefinition,
} from '../services/daily-dispatch-puzzle-types';

export const DAILY_DISPATCH_SHAPES: Record<DispatchBlockShape, DispatchShapeDefinition> = {
  DOT: {
    cells: [{ col: 0, row: 0 }],
    width: 1,
    height: 1,
  },
  I2_H: {
    cells: [{ col: 0, row: 0 }, { col: 1, row: 0 }],
    width: 2,
    height: 1,
  },
  I2_V: {
    cells: [{ col: 0, row: 0 }, { col: 0, row: 1 }],
    width: 1,
    height: 2,
  },
  I3_H: {
    cells: [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }],
    width: 3,
    height: 1,
  },
  I3_V: {
    cells: [{ col: 0, row: 0 }, { col: 0, row: 1 }, { col: 0, row: 2 }],
    width: 1,
    height: 3,
  },
  I4_H: {
    cells: [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 }],
    width: 4,
    height: 1,
  },
  I4_V: {
    cells: [{ col: 0, row: 0 }, { col: 0, row: 1 }, { col: 0, row: 2 }, { col: 0, row: 3 }],
    width: 1,
    height: 4,
  },
  L: {
    cells: [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 0, row: 1 }],
    width: 2,
    height: 2,
  },
  J: {
    cells: [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 1, row: 1 }],
    width: 2,
    height: 2,
  },
  T: {
    cells: [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 1, row: 1 }],
    width: 3,
    height: 2,
  },
  O: {
    cells: [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 0, row: 1 }, { col: 1, row: 1 }],
    width: 2,
    height: 2,
  },
  S: {
    cells: [{ col: 1, row: 0 }, { col: 2, row: 0 }, { col: 0, row: 1 }, { col: 1, row: 1 }],
    width: 3,
    height: 2,
  },
  Z: {
    cells: [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 1, row: 1 }, { col: 2, row: 1 }],
    width: 3,
    height: 2,
  },
  RECT_2x3: {
    cells: [
      { col: 0, row: 0 }, { col: 1, row: 0 },
      { col: 0, row: 1 }, { col: 1, row: 1 },
      { col: 0, row: 2 }, { col: 1, row: 2 },
    ],
    width: 2,
    height: 3,
  },
  RECT_3x2: {
    cells: [
      { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
      { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 },
    ],
    width: 3,
    height: 2,
  },
};

export function getDispatchShapeCells(
  shape: DispatchBlockShape,
  anchor: { col: number; row: number },
): ShapeOffset[] {
  return DAILY_DISPATCH_SHAPES[shape].cells.map((cell) => ({
    col: anchor.col + cell.col,
    row: anchor.row + cell.row,
  }));
}

export function getDispatchShapeRows(
  shape: DispatchBlockShape,
  anchor: { col: number; row: number },
): number[] {
  const rows = new Set<number>();
  for (const cell of DAILY_DISPATCH_SHAPES[shape].cells) {
    rows.add(anchor.row + cell.row);
  }
  return [...rows].sort((a, b) => a - b);
}

export function getDispatchShapeCols(
  shape: DispatchBlockShape,
  anchor: { col: number; row: number },
): number[] {
  const cols = new Set<number>();
  for (const cell of DAILY_DISPATCH_SHAPES[shape].cells) {
    cols.add(anchor.col + cell.col);
  }
  return [...cols].sort((a, b) => a - b);
}
