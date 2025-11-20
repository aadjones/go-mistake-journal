import type { BoardState, Vertex } from '@/types/go';

interface SimpleGobanProps {
  boardState: BoardState;
  playerColor: 'black' | 'white';
  lastMove?: Vertex | null;
  showCoordinates?: boolean;
}

/**
 * Simple SVG-based Go board component
 * A lightweight alternative to @sabaki/shudan that works with React 18+
 *
 * This custom implementation was necessary because @sabaki/shudan has
 * compatibility issues with modern React and Next.js.
 */
export function SimpleGoban({
  boardState,
  lastMove = null,
  showCoordinates = true,
}: SimpleGobanProps) {
  const { signMap, boardSize } = boardState;

  // Board styling constants
  const cellSize = 30;
  const stoneRadius = 13;
  const margin = showCoordinates ? 30 : 20;
  const boardWidth = (boardSize - 1) * cellSize + margin * 2;
  const boardHeight = (boardSize - 1) * cellSize + margin * 2;

  // Coordinate labels (no 'I' in Go)
  const files = 'ABCDEFGHJKLMNOPQRST'.slice(0, boardSize);

  // Star points (hoshi) for different board sizes
  const getStarPoints = (size: number): [number, number][] => {
    if (size === 19) {
      return [
        [3, 3],
        [3, 9],
        [3, 15],
        [9, 3],
        [9, 9],
        [9, 15],
        [15, 3],
        [15, 9],
        [15, 15],
      ];
    } else if (size === 13) {
      return [
        [3, 3],
        [3, 9],
        [6, 6],
        [9, 3],
        [9, 9],
      ];
    } else if (size === 9) {
      return [
        [2, 2],
        [2, 6],
        [4, 4],
        [6, 2],
        [6, 6],
      ];
    }
    return [];
  };

  const starPoints = getStarPoints(boardSize);

  return (
    <div className="w-full aspect-square">
      <svg
        viewBox={`0 0 ${boardWidth} ${boardHeight}`}
        className="w-full h-full bg-[#DCB35C] rounded shadow-lg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {Array.from({ length: boardSize }).map((_, i) => (
          <g key={`grid-${i}`}>
            {/* Horizontal line */}
            <line
              x1={margin}
              y1={margin + i * cellSize}
              x2={margin + (boardSize - 1) * cellSize}
              y2={margin + i * cellSize}
              stroke="#000"
              strokeWidth="1"
            />
            {/* Vertical line */}
            <line
              x1={margin + i * cellSize}
              y1={margin}
              x2={margin + i * cellSize}
              y2={margin + (boardSize - 1) * cellSize}
              stroke="#000"
              strokeWidth="1"
            />
          </g>
        ))}

        {/* Star points */}
        {starPoints.map(([x, y], idx) => (
          <circle
            key={`star-${idx}`}
            cx={margin + x * cellSize}
            cy={margin + y * cellSize}
            r="3"
            fill="#000"
          />
        ))}

        {/* Coordinate labels */}
        {showCoordinates && (
          <>
            {/* File labels (top and bottom) */}
            {Array.from({ length: boardSize }).map((_, i) => (
              <g key={`file-${i}`}>
                <text
                  x={margin + i * cellSize}
                  y={margin - 10}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#000"
                >
                  {files[i]}
                </text>
                <text
                  x={margin + i * cellSize}
                  y={boardHeight - margin + 20}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#000"
                >
                  {files[i]}
                </text>
              </g>
            ))}

            {/* Rank labels (left and right) */}
            {Array.from({ length: boardSize }).map((_, i) => (
              <g key={`rank-${i}`}>
                <text
                  x={margin - 15}
                  y={margin + i * cellSize + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#000"
                >
                  {boardSize - i}
                </text>
                <text
                  x={boardWidth - margin + 15}
                  y={margin + i * cellSize + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#000"
                >
                  {boardSize - i}
                </text>
              </g>
            ))}
          </>
        )}

        {/* Stones */}
        {signMap.map((row, y) =>
          row.map((cell, x) => {
            if (cell === 0) return null;

            const cx = margin + x * cellSize;
            const cy = margin + y * cellSize;
            const isBlack = cell === 1;
            const isLastMove = lastMove && lastMove[0] === x && lastMove[1] === y;

            return (
              <g key={`stone-${x}-${y}`}>
                {/* Stone shadow */}
                <circle cx={cx + 1} cy={cy + 1} r={stoneRadius} fill="rgba(0,0,0,0.2)" />
                {/* Stone */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={stoneRadius}
                  fill={isBlack ? '#000' : '#fff'}
                  stroke={isBlack ? '#000' : '#888'}
                  strokeWidth="1"
                />
                {/* Last move marker */}
                {isLastMove && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="5"
                    fill="none"
                    stroke={isBlack ? '#fff' : '#000'}
                    strokeWidth="2"
                  />
                )}
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
}
