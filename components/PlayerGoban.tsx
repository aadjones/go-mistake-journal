import { SimpleGoban } from './SimpleGoban';
import type { BoardState, Vertex } from '@/types/go';

interface PlayerGobanProps {
  boardState: BoardState;
  playerColor: 'black' | 'white';
  lastMove?: Vertex | null;
  customMarkers?: Record<string, { type: string; label?: string }>;
  showCoordinates?: boolean;
}

/**
 * Go board component for displaying game positions.
 *
 * NOTE: We use a custom SVG-based Go board renderer (SimpleGoban) instead of
 * @sabaki/shudan because shudan is a Preact component that has compatibility
 * issues with Next.js App Router and React Server Components.
 */
export function PlayerGoban({
  boardState,
  playerColor,
  lastMove = null,
  customMarkers = {},
  showCoordinates = true,
}: PlayerGobanProps) {
  return (
    <SimpleGoban
      boardState={boardState}
      playerColor={playerColor}
      lastMove={lastMove}
      showCoordinates={showCoordinates}
    />
  );
}
