/**
 * Formats time control from seconds to minutes for human readability.
 *
 * Examples:
 * - "180+2" -> "3 min + 2s"
 * - "300+0" -> "5 min"
 * - "600" -> "10 min"
 * - "180" -> "3 min"
 *
 * @param timeControl - Time control string in seconds (e.g., "180+2")
 * @returns Formatted time control in minutes
 */
export function formatTimeControl(timeControl: string | null | undefined): string {
  if (!timeControl) return '';

  const parts = timeControl.split('+');

  if (parts.length === 2) {
    // Format with increment (e.g., "180+2" -> "3 min + 2s")
    const minutes = Math.floor(parseInt(parts[0]) / 60);
    const increment = parts[1];
    return increment === '0' ? `${minutes} min` : `${minutes} min + ${increment}s`;
  }

  // Format without increment (e.g., "180" -> "3 min")
  if (!timeControl.includes('+')) {
    const minutes = Math.floor(parseInt(timeControl) / 60);
    return `${minutes} min`;
  }

  // Return as-is if format is unexpected
  return timeControl;
}

/**
 * Formats time control from SGF headers with byo-yomi support
 *
 * Examples:
 * - TM=300, TC=3, TT=30 -> "5 min + 3x30s byo-yomi"
 * - TM=600, OT=5x30 byo-yomi -> "10 min + 5x30s byo-yomi"
 * - TM=600 -> "10 min"
 *
 * @param headers - SGF headers containing TM, TC, TT, or OT fields
 * @returns Formatted time control string
 */
export function formatTimeControlFromHeaders(headers: Record<string, string>): string {
  const mainTime = headers.TM ? parseInt(headers.TM) : null;

  if (!mainTime) return '';

  const mainMinutes = Math.floor(mainTime / 60);
  let result = `${mainMinutes} min`;

  // Check for Fox-style byo-yomi (TC and TT fields)
  const periods = headers.TC ? parseInt(headers.TC) : null;
  const periodTime = headers.TT ? parseInt(headers.TT) : null;

  if (periods && periodTime && periods > 0) {
    result += ` + ${periods}x${periodTime}s byo-yomi`;
    return result;
  }

  // Check for OGS-style byo-yomi (OT field like "5x30 byo-yomi")
  const overtime = headers.OT;
  if (overtime) {
    const byoyomiMatch = overtime.match(/(\d+)x(\d+)\s*byo-yomi/i);
    if (byoyomiMatch) {
      const [, periods, seconds] = byoyomiMatch;
      result += ` + ${periods}x${seconds}s byo-yomi`;
    }
  }

  return result;
}
