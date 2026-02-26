'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlayerGoban } from '@/components/PlayerGoban';
import { deserializeBoardState } from '@/lib/go/board-state-extractor';
import type { BoardState } from '@/types/go';

export default function NewMistakePage() {
  return (
    <Suspense>
      <NewMistakePageContent />
    </Suspense>
  );
}

function NewMistakePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const gameId = searchParams.get('gameId');
  const moveIndex = searchParams.get('moveIndex');
  const boardStateParam = searchParams.get('boardState');

  const [briefDescription, setBriefDescription] = useState('');
  const [primaryTag, setPrimaryTag] = useState('');
  const [detailedReflection, setDetailedReflection] = useState('');
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('black');
  const [boardState, setBoardState] = useState<BoardState | null>(null);

  useEffect(() => {
    // Fetch existing tags for autocomplete
    async function loadTags() {
      try {
        const response = await fetch('/api/tags');
        const data = await response.json();
        if (response.ok) {
          setExistingTags(data.tags || []);
        }
      } catch (err) {
        console.error('Failed to load tags:', err);
      }
    }
    loadTags();
  }, []);

  useEffect(() => {
    // Fetch game to get player color and parse board state
    async function loadGame() {
      if (!gameId) return;
      try {
        const response = await fetch(`/api/games/${gameId}`);
        const data = await response.json();
        if (response.ok && data.game) {
          setPlayerColor(data.game.playerColor);
        }
      } catch (err) {
        console.error('Failed to load game:', err);
      }
    }
    loadGame();

    // Parse board state from URL parameter
    if (boardStateParam) {
      try {
        const parsed = deserializeBoardState(decodeURIComponent(boardStateParam));
        setBoardState(parsed);
      } catch (err) {
        console.error('Failed to parse board state:', err);
      }
    }
  }, [gameId, boardStateParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mistakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          moveIndex: parseInt(moveIndex || '0', 10),
          boardState: boardStateParam,
          briefDescription,
          primaryTag,
          detailedReflection: detailedReflection || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create mistake');
      }

      // Redirect back to the game viewer at the mistake position
      router.push(`/games/${gameId}?moveIndex=${moveIndex}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const filteredTags = existingTags.filter(tag =>
    tag.toLowerCase().includes(primaryTag.toLowerCase())
  );

  const handleTagSelect = (tag: string) => {
    setPrimaryTag(tag);
    setShowTagSuggestions(false);
  };

  if (!gameId || !moveIndex || !boardStateParam || !boardState) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Invalid Request</h2>
          <p className="text-red-700">
            Missing required parameters. Please add a mistake from the game viewer.
          </p>
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

  const formatMoveDisplay = (index: number): string => {
    if (index === 0) return 'Start';
    return `Move ${index}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.push(`/games/${gameId}`)}
          className="text-blue-600 hover:text-blue-800 mb-2"
        >
          ← Back to Game
        </button>
        <h1 className="text-2xl font-bold mb-2">Record Mistake</h1>
        <p className="text-gray-600">{formatMoveDisplay(parseInt(moveIndex))}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Position Preview */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Position</h3>
          <div className="max-w-md mx-auto">
            <PlayerGoban boardState={boardState} playerColor={playerColor} showCoordinates={true} />
          </div>
        </div>

        {/* Mistake Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="briefDescription"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                What went wrong? <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="briefDescription"
                value={briefDescription}
                onChange={e => setBriefDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Played too slow, wrong direction, missed cutting point"
                required
              />
            </div>

            <div className="relative">
              <label htmlFor="primaryTag" className="block text-sm font-medium text-gray-700 mb-1">
                Tag <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="primaryTag"
                value={primaryTag}
                onChange={e => {
                  setPrimaryTag(e.target.value);
                  setShowTagSuggestions(true);
                }}
                onFocus={() => setShowTagSuggestions(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Life and Death, Shape, Direction, Reading, Endgame"
                required
              />
              {showTagSuggestions && filteredTags.length > 0 && primaryTag && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredTags.slice(0, 10).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagSelect(tag)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 transition"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Start typing to see existing tags or create a new one
              </p>
            </div>

            <div>
              <label
                htmlFor="detailedReflection"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Detailed Reflection (optional)
              </label>
              <textarea
                id="detailedReflection"
                value={detailedReflection}
                onChange={e => setDetailedReflection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                placeholder="What was the correct direction of play?
What shape or tesuji did I miss?
What will I look for differently next time?"
              />
              <p className="text-xs text-gray-500 mt-1">Supports markdown formatting</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Saving...' : 'Save Mistake'}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/games/${gameId}`)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Reflection Prompts */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Reflection Prompts:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• What candidate moves did you consider?</li>
          <li>• What was your opponent&apos;s plan or threat that you missed?</li>
          <li>• Did you read out the sequence far enough?</li>
          <li>• What shape, joseki, or tesuji would have helped you?</li>
          <li>• What will you look for differently next time?</li>
        </ul>
      </div>
    </div>
  );
}
