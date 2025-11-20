export type Color = 'white' | 'black';

export interface Move {
  color: Color;
  sgfCoord: string; // SGF coordinate format (e.g., "pd", "dd", "tt" for pass)
  moveNumber: number; // Human-readable move number (1-indexed)
}

export interface ParsedGame {
  headers: Record<string, string>; // SGF properties (PB, PW, BR, WR, DT, RE, etc.)
  moves: Move[];
  result: string; // e.g., "B+Resign", "W+3.5", "0" for draw, "*" for unknown
  boardSize: number; // Typically 19, but can be 13 or 9
  komi: number; // Compensation points for white
}

/**
 * Board state representation for position snapshots
 */
export interface BoardState {
  boardSize: number;
  signMap: number[][]; // 2D array where 1=black, -1=white, 0=empty
  captures?: { [key: number]: number }; // Optional: {1: whiteStonesCaptured, -1: blackStonesCaptured}
  moveIndex: number; // Position in game (0 = starting position)
  lastMoveVertex?: Vertex | null; // The vertex of the stone just placed (null for starting position or pass)
}

/**
 * Vertex representation: [x, y] where both are 0-indexed
 * [0, 0] is top-left corner of the board
 */
export type Vertex = [number, number];
