/**
 * Centralized move number calculations to avoid inconsistencies.
 *
 * In standard game notation:
 * - Move numbers increment after each second player's move
 * - First player's moves don't have "..." suffix
 * - Second player's moves have "..." suffix (e.g., "1..." for second player's first move)
 *
 * In our array representation:
 * - currentMoveIndex = 0 is the starting position (no moves applied)
 * - currentMoveIndex = 1 is after first player's first move
 * - currentMoveIndex = 2 is after second player's first move
 * - etc.
 */

/**
 * Converts a move index to a move number.
 * @param moveIndex - The index in the moves array (0 = start position)
 * @returns The move number (1, 2, 3, etc.)
 */
export function getMoveNumber(moveIndex: number): number {
  return Math.floor((moveIndex + 1) / 2);
}

/**
 * Determines if a move index represents a first player move.
 * @param moveIndex - The index in the moves array
 * @returns true if it's first player's move, false if second player's
 */
export function isWhiteMove(moveIndex: number): boolean {
  return moveIndex % 2 === 1;
}

/**
 * Formats a move for display (e.g., "Move 5" or "Move 5...")
 * @param moveIndex - The index in the moves array
 * @returns Formatted string like "Move 5" or "Move 5..."
 */
export function formatMoveDisplay(moveIndex: number): string {
  if (moveIndex === 0) return 'Start';
  const moveNum = getMoveNumber(moveIndex);
  const isWhite = isWhiteMove(moveIndex);
  return `Move ${moveNum}${isWhite ? '' : '...'}`;
}
