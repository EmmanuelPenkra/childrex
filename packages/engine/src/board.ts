import type { CardFace, Cell } from './types.js';

export type BoardSpace = CardFace | 'F';

export const BOARD: readonly (readonly BoardSpace[])[] = [
  ['F','2S','3S','4S','5S','6S','7S','8S','9S','F'],
  ['6C','5C','4C','3C','2C','AH','KH','QH','TH','TS'],
  ['7C','AS','2D','3D','4D','5D','6D','7D','9H','QS'],
  ['8C','KS','6C','5C','4C','3C','2C','8D','8H','KS'],
  ['9C','QS','7C','6H','5H','4H','AH','9D','7H','AS'],
  ['TC','TS','8C','7H','2H','3H','KH','TD','6H','2D'],
  ['QC','9S','9C','8H','9H','TH','QH','QD','5H','3D'],
  ['KC','8S','TC','QC','KC','AC','AD','KD','4H','4D'],
  ['AC','7S','6S','5S','4S','3S','2S','2H','3H','5D'],
  ['F','AD','KD','QD','TD','9D','8D','7D','6D','F'],
] as const;

export const FREE_CORNERS = new Set(['0,0','0,9','9,0','9,9']);
export const cellKey = ({ row, col }: Cell) => `${row},${col}`;
export const sameCell = (a: Cell, b: Cell) => a.row === b.row && a.col === b.col;
export const isInside = ({ row, col }: Cell) => Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < 10 && col >= 0 && col < 10;
export const isCorner = (cell: Cell) => FREE_CORNERS.has(cellKey(cell));
export const faceAt = (cell: Cell): BoardSpace => BOARD[cell.row]?.[cell.col] ?? (() => { throw new Error('Cell outside board'); })();
export const matchingCells = (face: CardFace): Cell[] => {
  const cells: Cell[] = [];
  BOARD.forEach((row, r) => row.forEach((space, c) => { if (space === face) cells.push({ row: r, col: c }); }));
  return cells;
};

export const FIVE_WINDOWS: readonly (readonly Cell[])[] = (() => {
  const result: Cell[][] = [];
  for (let row = 0; row < 10; row++) for (let col = 0; col < 10; col++) {
    for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]] as const) {
      const end = { row: row + dr * 4, col: col + dc * 4 };
      if (!isInside(end)) continue;
      result.push(Array.from({ length: 5 }, (_, i) => ({ row: row + dr * i, col: col + dc * i })));
    }
  }
  return result;
})();

export const toDisplay = ({ row, col }: Cell): Cell => ({ row: col, col: 9 - row });
export const toLogical = ({ row, col }: Cell): Cell => ({ row: 9 - col, col: row });
