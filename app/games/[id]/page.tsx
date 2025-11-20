'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PlayerGoban } from '@/components/PlayerGoban';
import { MoveNavigator } from '@/lib/go/move-navigator';
import { formatTimeControlFromHeaders } from '@/lib/utils/format-time-control';
import { serializeBoardState } from '@/lib/go/board-state-extractor';
import {
  detectServer,
  translateFoxRank,
  formatFoxKomi,
  formatGameResult,
} from '@/lib/utils/fox-format';
import type { Game, Mistake } from '@prisma/client';
import type { ParsedGame, Vertex } from '@/types/go';

type GameWithMistakes = Game & { mistakes: Mistake[] };

export default function GameViewerPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = params.id as string;
  const targetMoveIndex = searchParams.get('moveIndex');

  const [game, setGame] = useState<GameWithMistakes | null>(null);
  const [navigator, setNavigator] = useState<MoveNavigator | null>(null);
  const [parsedGame, setParsedGame] = useState<ParsedGame | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastMoveVertex, setLastMoveVertex] = useState<Vertex | null>(null);
  const [boardKey, setBoardKey] = useState(0); // Force re-render of board
  const moveRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    async function loadGame() {
      try {
        const response = await fetch(`/api/games/${gameId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load game');
        }

        setGame(data.game);

        // Use pre-parsed game data from API
        const parsed = data.parsedGame;
        setParsedGame(parsed);

        // Create navigator
        const nav = new MoveNavigator(parsed);
        setNavigator(nav);
        setCurrentMoveIndex(0);
        setLastMoveVertex(null);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    }

    loadGame();
  }, [gameId]);

  // Navigate to target move if specified in URL
  useEffect(() => {
    if (navigator && targetMoveIndex) {
      const index = parseInt(targetMoveIndex);
      if (!isNaN(index) && index >= 0) {
        const targetIndex = Math.min(index, navigator.getTotalMoves());
        goToMove(targetIndex);
      }
    }
  }, [targetMoveIndex, navigator]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToMove = (moveIndex: number) => {
    if (!navigator) return;

    navigator.goToMove(moveIndex);
    setCurrentMoveIndex(moveIndex);
    setLastMoveVertex(navigator.getLastMoveVertex());
    setBoardKey(prev => prev + 1); // Force board re-render
  };

  const goToStart = () => goToMove(0);
  const goToPrevious = () => currentMoveIndex > 0 && goToMove(currentMoveIndex - 1);
  const goToNext = () =>
    navigator && currentMoveIndex < navigator.getTotalMoves() && goToMove(currentMoveIndex + 1);
  const goToEnd = () => navigator && goToMove(navigator.getTotalMoves());

  // Auto-scroll timeline to current move
  useEffect(() => {
    const currentButton = moveRefs.current[currentMoveIndex];
    if (currentButton) {
      currentButton.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentMoveIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMoveIndex, navigator]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddMistake = () => {
    if (!navigator) return;

    // Navigate to mistake form with current position context
    const boardState = navigator.getCurrentBoardState();
    const boardStateJson = serializeBoardState(boardState);

    router.push(
      `/mistakes/new?gameId=${gameId}&moveIndex=${currentMoveIndex}&boardState=${encodeURIComponent(boardStateJson)}`
    );
  };

  const getMistakeAtCurrentMove = () => {
    if (!game) return null;
    return game.mistakes.find(m => m.moveIndex === currentMoveIndex);
  };

  // Format move display (e.g., "Move 42 (B)")
  const formatMoveDisplay = (index: number): string => {
    if (index === 0) return 'Start';
    if (!parsedGame) return `Move ${index}`;

    const move = parsedGame.moves[index - 1];
    const color = move.color === 'black' ? 'B' : 'W';
    return `Move ${index} (${color})`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg text-gray-600">Loading game...</div>
      </div>
    );
  }

  if (error || !game || !navigator || !parsedGame) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error</h2>
          <p className="text-red-700">{error || 'Game not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const currentMistake = getMistakeAtCurrentMove();
  const totalMoves = navigator.getTotalMoves();

  // Detect server and format data accordingly
  const server = detectServer(parsedGame.headers, parsedGame.komi);
  const formattedOpponentRank = translateFoxRank(game.opponentRank || undefined);
  const formattedKomi = formatFoxKomi(parsedGame.komi, server);
  const formattedResult = formatGameResult(parsedGame.result, server);
  const formattedTimeControl = formatTimeControlFromHeaders(parsedGame.headers);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar - Game Info */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-lg mb-3">Game Info</h2>
            <div className="text-sm space-y-2">
              <div>
                <span className="text-gray-600">Playing as:</span>
                <p className="font-medium capitalize">{game.playerColor}</p>
              </div>
              {server && (
                <div>
                  <span className="text-gray-600">Server:</span>
                  <p className="font-medium">{server}</p>
                </div>
              )}
              {formattedOpponentRank && (
                <div>
                  <span className="text-gray-600">Opponent Rank:</span>
                  <p className="font-medium">{formattedOpponentRank}</p>
                </div>
              )}
              {formattedTimeControl && (
                <div>
                  <span className="text-gray-600">Time Control:</span>
                  <p className="font-medium">{formattedTimeControl}</p>
                </div>
              )}
              {game.datePlayed && (
                <div>
                  <span className="text-gray-600">Date:</span>
                  <p className="font-medium">{new Date(game.datePlayed).toLocaleDateString()}</p>
                </div>
              )}
              <div>
                <span className="text-gray-600">Komi:</span>
                <p className="font-medium">{formattedKomi}</p>
              </div>
              <div>
                <span className="text-gray-600">Result:</span>
                <p className="font-medium">{formattedResult}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Center - Go Board */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="max-w-lg mx-auto">
              <PlayerGoban
                key={boardKey}
                boardState={navigator.getCurrentBoardState()}
                playerColor={game.playerColor as 'black' | 'white'}
                lastMove={lastMoveVertex}
                showCoordinates={true}
              />
            </div>

            {/* Navigation Controls */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={goToStart}
                disabled={currentMoveIndex === 0}
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⏮ Start
              </button>
              <button
                onClick={goToPrevious}
                disabled={currentMoveIndex === 0}
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <span className="px-4 py-2 text-sm font-medium w-32 text-center inline-block">
                {formatMoveDisplay(currentMoveIndex)}
              </span>
              <button
                onClick={goToNext}
                disabled={currentMoveIndex === totalMoves}
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
              <button
                onClick={goToEnd}
                disabled={currentMoveIndex === totalMoves}
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                End ⏭
              </button>
            </div>

            {/* Add Mistake Button */}
            <div className="mt-4 text-center">
              {currentMistake ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm font-medium text-yellow-900 mb-1">
                    Mistake recorded at this position
                  </p>
                  <p className="text-sm text-yellow-800">{currentMistake.briefDescription}</p>
                  {currentMistake.detailedReflection && (
                    <p className="text-xs text-yellow-700 mt-2 whitespace-pre-wrap text-left">
                      {currentMistake.detailedReflection}
                    </p>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleAddMistake}
                  disabled={currentMoveIndex === 0}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Add Mistake at This Position
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Move Timeline */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-center mb-3">Moves</h3>
            <div className="overflow-x-auto py-4">
              <div className="flex items-center px-2" style={{ minWidth: 'max-content' }}>
                {parsedGame.moves.map((move, index) => {
                  const moveIndex = index + 1;
                  const hasMistake = game.mistakes.find(m => m.moveIndex === moveIndex);
                  const isCurrentMove = currentMoveIndex === moveIndex;
                  const isBlack = move.color === 'black';

                  return (
                    <div key={index} className="flex items-center">
                      {/* Connecting line */}
                      {index > 0 && <div className="h-px bg-gray-300" style={{ width: '8px' }} />}

                      {/* Move circle */}
                      <button
                        ref={el => (moveRefs.current[moveIndex] = el)}
                        onClick={() => goToMove(moveIndex)}
                        className={`
                          relative flex-shrink-0 rounded-full flex items-center justify-center
                          text-[10px] font-medium
                          ${
                            isBlack
                              ? 'bg-black text-white border border-gray-400'
                              : 'bg-white text-gray-900 border border-gray-400'
                          }
                          ${isCurrentMove ? 'ring-2 ring-blue-600' : ''}
                          ${hasMistake && !isCurrentMove ? 'ring-2 ring-red-600' : ''}
                        `}
                        style={{
                          width: '26px',
                          height: '26px',
                        }}
                      >
                        {moveIndex}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
