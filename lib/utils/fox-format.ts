/**
 * Utilities for formatting Fox Go Server specific data
 */

/**
 * Detects which server a game was played on based on SGF headers and komi
 * Fox games often have komi values like 375 (meaning 3.75) which is a telltale sign
 */
export function detectServer(headers: Record<string, string>, komi?: number): string | null {
  const ap = headers.AP?.toLowerCase() || '';

  if (ap.includes('foxwq') || ap.includes('fox')) {
    return 'Fox';
  }

  // Check for Fox's characteristic komi format (e.g., 375, 650, 750)
  // Fox uses integers >= 100 to represent komi in hundredths
  if (komi && komi >= 100 && Number.isInteger(komi)) {
    return 'Fox';
  }

  // Check for Chinese characters in ranks (段 for dan, 级 for kyu) - strong indicator of Fox
  const blackRank = headers.BR || '';
  const whiteRank = headers.WR || '';
  if (
    blackRank.includes('段') ||
    blackRank.includes('级') ||
    whiteRank.includes('段') ||
    whiteRank.includes('级')
  ) {
    return 'Fox';
  }

  if (ap.includes('ogs')) {
    return 'OGS';
  }
  if (ap.includes('kgs')) {
    return 'KGS';
  }
  if (ap.includes('igs') || ap.includes('pandanet')) {
    return 'IGS';
  }

  return null;
}

/**
 * Translates Fox Chinese rank notation to English and spells out dan/kyu
 * Examples: "1段" -> "1 dan", "5级" -> "5 kyu"
 */
export function translateFoxRank(rank: string | undefined): string | undefined {
  if (!rank) return undefined;

  // Check for Chinese characters
  if (rank.includes('段')) {
    // Dan rank (段)
    const match = rank.match(/(\d+)段/);
    if (match) {
      return `${match[1]} dan`;
    }
  }

  if (rank.includes('级')) {
    // Kyu rank (级)
    const match = rank.match(/(\d+)级/);
    if (match) {
      return `${match[1]} kyu`;
    }
  }

  // If already in abbreviated format like "5k" or "2d", expand it
  const kyuMatch = rank.match(/^(\d+)k$/i);
  if (kyuMatch) {
    return `${kyuMatch[1]} kyu`;
  }

  const danMatch = rank.match(/^(\d+)d$/i);
  if (danMatch) {
    return `${danMatch[1]} dan`;
  }

  // Unknown format, return as-is
  return rank;
}

/**
 * Formats Fox komi value (e.g., 375 -> "3.75 stones", 650 -> "6.5 stones")
 */
export function formatFoxKomi(komi: number, server: string | null): string {
  if (server === 'Fox' && komi >= 100) {
    // Fox reports komi in hundredths of a stone
    return `${(komi / 100).toFixed(2)} stones`;
  }

  return komi.toString();
}

/**
 * Formats game result with Fox-specific formatting
 * On Fox, scoring results are in stones (half points), so we add " stones" suffix
 * Examples:
 * - "W+R" -> "W+Resign"
 * - "W+3.75" -> "W+3.75 stones" (scoring on Fox)
 * - "B+5.5" -> "B+5.5" (OGS uses points, no change)
 * - "?" -> "Unknown"
 * - "*" -> "In progress"
 */
export function formatGameResult(result: string, server: string | null): string {
  if (!result || result === '?') return 'Unknown';
  if (result === '*') return 'In progress';

  // Expand resignation results
  if (result.includes('+R')) {
    return result.replace('+R', '+Resign');
  }

  // Expand time results
  if (result.includes('+T')) {
    return result.replace('+T', '+Time');
  }

  // Check if it's a scoring result (contains a decimal number)
  const scoringMatch = result.match(/^([BW])\+(\d+\.?\d*)$/);

  if (scoringMatch && server === 'Fox') {
    // Add "stones" suffix for Fox scoring results
    return `${result} stones`;
  }

  return result;
}
