import GoBoard from '@sabaki/go-board';
import type { ParsedGame, BoardState } from '@/types/go';

/**
 * Error thrown when board state extraction fails
 */
export class BoardStateExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BoardStateExtractionError';
  }
}

/**
 * Convert SGF coordinate to vertex [x, y]
 * @param sgfCoord - SGF coordinate string (e.g., "pd", "dd")
 * @returns Vertex [x, y] or null for pass
 */
function sgfToVertex(sgfCoord: string): [number, number] | null {
  if (!sgfCoord || sgfCoord === '' || sgfCoord === 'tt') {
    return null; // Pass move
  }

  const x = sgfCoord.charCodeAt(0) - 'a'.charCodeAt(0);
  const y = sgfCoord.charCodeAt(1) - 'a'.charCodeAt(0);

  return [x, y];
}

/**
 * Extracts the board state after a specific move in a parsed game
 *
 * @param game - The parsed Go game
 * @param moveIndex - The move index (0 = starting position, 1 = after first move, etc.)
 * @returns The BoardState object representing the position after the specified move
 * @throws {BoardStateExtractionError} If move index is invalid
 *
 * @example
 * const game = parseSGF(sgfString);
 * const startState = extractBoardState(game, 0); // Starting position
 * const afterMove1 = extractBoardState(game, 1); // After first move
 */
export function extractBoardState(game: ParsedGame, moveIndex: number): BoardState {
  // Validate move index
  if (moveIndex < 0) {
    throw new BoardStateExtractionError('Move index must be non-negative');
  }

  if (moveIndex > game.moves.length) {
    throw new BoardStateExtractionError(
      `Move index ${moveIndex} exceeds total moves (${game.moves.length})`
    );
  }

  // Create empty board
  let board = GoBoard.fromDimensions(game.boardSize);

  // Return empty board if moveIndex is 0
  if (moveIndex === 0) {
    return {
      boardSize: game.boardSize,
      signMap: board.signMap,
      captures: {},
      moveIndex: 0,
      lastMoveVertex: null, // No last move at starting position
    };
  }

  // Replay moves up to the specified move index
  for (let i = 0; i < moveIndex; i++) {
    const move = game.moves[i];

    try {
      const vertex = sgfToVertex(move.sgfCoord);

      // Skip pass moves
      if (!vertex) continue;

      const sign = move.color === 'black' ? 1 : -1;
      board = board.makeMove(sign, vertex);
    } catch (error) {
      throw new BoardStateExtractionError(
        `Failed to replay move ${i + 1} (${move.sgfCoord}): ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Calculate last move vertex from the move that was just played
  const lastMove = game.moves[moveIndex - 1];
  const lastMoveVertex = lastMove ? sgfToVertex(lastMove.sgfCoord) : null;

  return {
    boardSize: game.boardSize,
    signMap: board.signMap,
    captures: {}, // Go board library doesn't expose captures in current version
    moveIndex: moveIndex,
    lastMoveVertex, // Include the last move vertex
  };
}

/**
 * Serialize board state to JSON string for database storage
 */
export function serializeBoardState(boardState: BoardState): string {
  return JSON.stringify(boardState);
}

/**
 * Deserialize board state from JSON string
 */
export function deserializeBoardState(json: string): BoardState {
  try {
    const state = JSON.parse(json);

    // Validate structure
    if (!state.boardSize || !state.signMap || state.moveIndex === undefined) {
      throw new Error('Invalid board state structure');
    }

    return state as BoardState;
  } catch (error) {
    throw new BoardStateExtractionError(
      `Failed to deserialize board state: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
