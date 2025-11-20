import * as sgf from '@sabaki/sgf';
import GameTree from '@sabaki/immutable-gametree';
import { ParsedGame, Move, Color } from '@/types/go';

export class SGFParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SGFParseError';
  }
}

/**
 * Parse an SGF string into a structured game object
 * @param sgfText - SGF string to parse
 * @returns ParsedGame object with headers, moves, and result
 * @throws SGFParseError if SGF is invalid or cannot be parsed
 */
export function parseSGF(sgfText: string): ParsedGame {
  // Validate input
  if (!sgfText || !sgfText.trim()) {
    throw new SGFParseError('SGF cannot be empty');
  }

  try {
    // Parse SGF with ID generator
    const getId = (
      id => () =>
        id++
    )(0);
    const rootNodes = sgf.parse(sgfText, { getId });

    if (!rootNodes || rootNodes.length === 0) {
      throw new SGFParseError('No game trees found in SGF');
    }

    // Create GameTree from first game (ignore variations for now)
    const gameTree = new GameTree({ getId, root: rootNodes[0] });
    const rootNode = gameTree.root;

    // Extract headers from root node
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(rootNode.data)) {
      if (Array.isArray(value) && value.length > 0) {
        headers[key] = value[0];
      }
    }

    // Extract result
    let result: string = '*';
    if (headers.RE) {
      result = headers.RE;
    }

    // Extract moves by traversing the game tree
    const moves: Move[] = [];
    let currentNode = rootNode.children?.[0]; // Start with first move

    while (currentNode) {
      if (currentNode.data.B) {
        moves.push({
          color: 'black',
          sgfCoord: currentNode.data.B[0],
          moveNumber: Math.floor(moves.length / 2) + 1,
        });
      }
      if (currentNode.data.W) {
        moves.push({
          color: 'white',
          sgfCoord: currentNode.data.W[0],
          moveNumber: Math.floor(moves.length / 2) + 1,
        });
      }

      // Follow main line (first child)
      currentNode = currentNode.children?.[0];
    }

    return {
      headers,
      moves,
      result,
      boardSize: parseInt(headers.SZ || '19'),
      komi: parseFloat(headers.KM || '6.5'),
    };
  } catch (error) {
    if (error instanceof SGFParseError) {
      throw error;
    }

    throw new SGFParseError(
      `Invalid SGF format: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract player color from game metadata
 * Determines which color the journaling player was based on names
 * @param parsedGame - Parsed game object
 * @param playerName - Name of the player journaling (optional)
 * @returns 'black' or 'white'
 */
export function getPlayerColor(parsedGame: ParsedGame, playerName?: string): Color {
  if (!playerName) {
    // Default to black if no player name specified
    return 'black';
  }

  const whiteName = parsedGame.headers['PW']?.toLowerCase() || '';
  const blackName = parsedGame.headers['PB']?.toLowerCase() || '';
  const searchName = playerName.toLowerCase();

  if (whiteName.includes(searchName)) {
    return 'white';
  }
  if (blackName.includes(searchName)) {
    return 'black';
  }

  // Default to black if name not found
  return 'black';
}

/**
 * Extract time control from SGF headers
 * @param parsedGame - Parsed game object
 * @returns Time control string or undefined
 */
export function getTimeControl(parsedGame: ParsedGame): string | undefined {
  return parsedGame.headers['TM'] || parsedGame.headers['OT'];
}

/**
 * Parse rank string (e.g., "5k", "2d") to numeric value for comparison
 * @param rank - Rank string from SGF
 * @returns Numeric rank value (negative for kyu, positive for dan)
 */
function parseRank(rank: string | undefined): number | undefined {
  if (!rank) return undefined;

  const match = rank.match(/^(\d+)([kd])/i);
  if (!match) return undefined;

  const [, value, type] = match;
  const numValue = parseInt(value, 10);

  if (isNaN(numValue)) return undefined;

  // Convert to numeric scale: 30k = -30, 1k = -1, 1d = 1, 9d = 9
  return type.toLowerCase() === 'k' ? -numValue : numValue;
}

/**
 * Extract opponent rank from SGF headers based on player color
 * @param parsedGame - Parsed game object
 * @param playerColor - Color the journaling player was playing
 * @returns Opponent rank string or undefined
 */
export function getOpponentRank(parsedGame: ParsedGame, playerColor: Color): string | undefined {
  const opponentRank =
    playerColor === 'white' ? parsedGame.headers['BR'] : parsedGame.headers['WR'];

  return opponentRank;
}

/**
 * Extract date played from SGF headers
 * @param parsedGame - Parsed game object
 * @returns Date object or undefined if date invalid
 */
export function getDatePlayed(parsedGame: ParsedGame): Date | undefined {
  const dateStr = parsedGame.headers['DT'];

  if (!dateStr) return undefined;

  // SGF dates can be in various formats: "YYYY-MM-DD", "YYYY.MM.DD", etc.
  // Try to parse common formats
  const normalized = dateStr.replace(/\./g, '-');
  const parts = normalized.split('-');

  if (parts.length !== 3) return undefined;

  const [year, month, day] = parts.map(p => parseInt(p, 10));

  if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  return new Date(year, month - 1, day);
}
