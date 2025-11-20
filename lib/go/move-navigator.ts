import GoBoard from '@sabaki/go-board';
import type { ParsedGame, Move, BoardState } from '@/types/go';

/**
 * Convert SGF coordinate to vertex [x, y]
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
 * Navigates through a parsed Go game, providing move-by-move position access
 *
 * @example
 * const game = parseSGF(sgfString);
 * const navigator = new MoveNavigator(game);
 *
 * navigator.next(); // Move forward
 * navigator.previous(); // Move backward
 * navigator.goToMove(10); // Jump to move 10
 * const boardState = navigator.getCurrentBoardState(); // Get current position
 */
export class MoveNavigator {
  private game: ParsedGame;
  private board: GoBoard;
  private currentMoveIndex: number;
  private moveHistory: GoBoard[]; // Cache board states for efficient backward navigation

  /**
   * Creates a new move navigator for the given game
   * @param game - The parsed Go game to navigate
   */
  constructor(game: ParsedGame) {
    this.game = game;
    this.board = GoBoard.fromDimensions(game.boardSize);
    this.currentMoveIndex = 0; // 0 = starting position
    this.moveHistory = [this.board]; // Start with empty board
  }

  /**
   * Get the parsed game
   */
  getGame(): ParsedGame {
    return this.game;
  }

  /**
   * Get current move index (0 = starting position)
   */
  getCurrentMoveIndex(): number {
    return this.currentMoveIndex;
  }

  /**
   * Get total number of moves in the game
   */
  getTotalMoves(): number {
    return this.game.moves.length;
  }

  /**
   * Get the board state of the current position
   */
  getCurrentBoardState(): BoardState {
    return {
      boardSize: this.game.boardSize,
      signMap: this.board.signMap,
      captures: {},
      moveIndex: this.currentMoveIndex,
      lastMoveVertex: this.getLastMoveVertex(), // Include last move
    };
  }

  /**
   * Get the current board (for direct access to GoBoard methods)
   */
  getCurrentBoard(): GoBoard {
    return this.board;
  }

  /**
   * Get the move at the current position (null if at starting position)
   */
  getCurrentMove(): Move | null {
    if (this.currentMoveIndex === 0) {
      return null;
    }
    return this.game.moves[this.currentMoveIndex - 1];
  }

  /**
   * Get the last move's vertex (for highlighting)
   */
  getLastMoveVertex(): [number, number] | null {
    const move = this.getCurrentMove();
    if (!move) return null;
    return sgfToVertex(move.sgfCoord);
  }

  /**
   * Move forward one move
   * @returns true if successful, false if already at end
   */
  next(): boolean {
    if (this.currentMoveIndex >= this.game.moves.length) {
      return false;
    }

    const move = this.game.moves[this.currentMoveIndex];

    try {
      const vertex = sgfToVertex(move.sgfCoord);

      // Handle pass moves
      if (!vertex) {
        this.currentMoveIndex++;
        this.moveHistory[this.currentMoveIndex] = this.board; // Same board for pass
        return true;
      }

      const sign = move.color === 'black' ? 1 : -1;
      this.board = this.board.makeMove(sign, vertex);
      this.currentMoveIndex++;

      // Cache this board state
      this.moveHistory[this.currentMoveIndex] = this.board;

      return true;
    } catch {
      // Should not happen with valid parsed game, but handle gracefully
      return false;
    }
  }

  /**
   * Move backward one move
   * @returns true if successful, false if already at start
   */
  previous(): boolean {
    if (this.currentMoveIndex === 0) {
      return false;
    }

    // Use cached board state
    this.currentMoveIndex--;
    this.board = this.moveHistory[this.currentMoveIndex];

    return true;
  }

  /**
   * Jump to a specific move index
   * @param moveIndex - The move to jump to (0 = starting position)
   * @returns true if successful, false if invalid move index
   */
  goToMove(moveIndex: number): boolean {
    if (moveIndex < 0 || moveIndex > this.game.moves.length) {
      return false;
    }

    // If we have this position cached, use it
    if (this.moveHistory[moveIndex]) {
      this.currentMoveIndex = moveIndex;
      this.board = this.moveHistory[moveIndex];
      return true;
    }

    // Otherwise, replay from the nearest cached position
    let startIndex = moveIndex - 1;
    while (startIndex >= 0 && !this.moveHistory[startIndex]) {
      startIndex--;
    }

    // Start from cached position or beginning
    if (startIndex >= 0) {
      this.currentMoveIndex = startIndex;
      this.board = this.moveHistory[startIndex];
    } else {
      this.board = GoBoard.fromDimensions(this.game.boardSize);
      this.currentMoveIndex = 0;
      this.moveHistory[0] = this.board;
    }

    // Replay moves to target
    while (this.currentMoveIndex < moveIndex) {
      if (!this.next()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Jump to the starting position
   */
  goToStart(): void {
    this.goToMove(0);
  }

  /**
   * Jump to the last move
   */
  goToEnd(): void {
    this.goToMove(this.game.moves.length);
  }

  /**
   * Check if at starting position
   */
  isAtStart(): boolean {
    return this.currentMoveIndex === 0;
  }

  /**
   * Check if at the last move
   */
  isAtEnd(): boolean {
    return this.currentMoveIndex === this.game.moves.length;
  }

  /**
   * Check if can move forward
   */
  canGoForward(): boolean {
    return this.currentMoveIndex < this.game.moves.length;
  }

  /**
   * Check if can move backward
   */
  canGoBackward(): boolean {
    return this.currentMoveIndex > 0;
  }
}
