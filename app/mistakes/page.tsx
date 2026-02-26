'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlayerGoban } from '@/components/PlayerGoban';
import { deserializeBoardState } from '@/lib/go/board-state-extractor';
import { formatTimeControl } from '@/lib/utils/format-time-control';
import type { Mistake, Game } from '@prisma/client';

type MistakeWithGame = Mistake & { game: Game };

interface TagStat {
  tag: string;
  count: number;
}

export default function MistakesListPage() {
  return (
    <Suspense>
      <MistakesListPageContent />
    </Suspense>
  );
}

function MistakesListPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTag = searchParams.get('tag') || '';
  const [mistakes, setMistakes] = useState<MistakeWithGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState<TagStat[]>([]);
  const mistakesPerPage = 10;

  // Load stats and tags on mount
  useEffect(() => {
    async function loadStatsAndTags() {
      try {
        // Fetch stats
        const statsResponse = await fetch('/api/stats');
        const statsData = await statsResponse.json();

        if (statsResponse.ok) {
          setStats(statsData.topTags || []);
        }
      } catch (err) {
        console.error('Failed to load stats:', err);
      }
    }

    loadStatsAndTags();
  }, []);

  // Load mistakes when page or tag changes
  useEffect(() => {
    async function loadMistakes() {
      setLoading(true);
      try {
        const offset = (currentPage - 1) * mistakesPerPage;
        const tagParam = selectedTag ? `&tag=${encodeURIComponent(selectedTag)}` : '';
        const response = await fetch(
          `/api/mistakes?limit=${mistakesPerPage}&offset=${offset}${tagParam}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load mistakes');
        }

        setMistakes(data.mistakes || []);
        setTotalMistakes(data.pagination.total);
        setHasMore(data.pagination.hasMore);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    }

    loadMistakes();
  }, [currentPage, selectedTag, mistakesPerPage]);

  const handleDelete = async (mistakeId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this mistake? This action cannot be undone.')) {
      return;
    }

    setDeletingId(mistakeId);
    try {
      const response = await fetch(`/api/mistakes/${mistakeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete mistake');
      }

      // Remove from local state
      setMistakes(prev => prev.filter(m => m.id !== mistakeId));
      setTotalMistakes(prev => prev - 1);

      // If we deleted the last item on this page and it's not page 1, go back one page
      if (mistakes.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete mistake');
    } finally {
      setDeletingId(null);
    }
  };

  const handleTagSelect = (tag: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tag) {
      params.set('tag', tag);
    } else {
      params.delete('tag');
    }
    router.push(`/mistakes?${params.toString()}`);
    setCurrentPage(1); // Reset to first page when changing filter
  };

  const totalPages = Math.ceil(totalMistakes / mistakesPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg text-gray-600">Loading mistakes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{selectedTag ? selectedTag : 'All Mistakes'}</h1>
        <p className="text-gray-600">
          {totalMistakes} mistake{totalMistakes !== 1 ? 's' : ''} recorded
        </p>
      </div>

      {mistakes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No mistakes recorded yet</h2>
          <p className="text-gray-600 mb-6">
            Track and reflect on your Go mistakes to find patterns and improve. Get started by
            importing a game and recording your first mistake.
          </p>
          <div className="space-y-4 max-w-md mx-auto text-left">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </span>
              <p className="text-sm text-gray-700">Click &quot;Import Game&quot; in the header</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </span>
              <p className="text-sm text-gray-700">Paste your SGF and select your color</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </span>
              <p className="text-sm text-gray-700">Navigate to a move where you made a mistake</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                4
              </span>
              <p className="text-sm text-gray-700">Record what went wrong and tag it</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Tags */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 sticky top-4">
              <h3 className="font-semibold mb-3">Filter by Tag</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleTagSelect('')}
                  className={`w-full text-left px-3 py-2 rounded transition
                    ${
                      selectedTag === ''
                        ? 'border-l-4 border-blue-600 font-semibold bg-blue-50/30'
                        : 'border-l-4 border-transparent hover:bg-gray-100'
                    }`}
                >
                  All Tags
                </button>
                {stats
                  .sort((a, b) => b.count - a.count)
                  .map(stat => {
                    const maxCount = stats[0]?.count || 1;
                    const barWidth = (stat.count / maxCount) * 100;
                    const isSelected = selectedTag === stat.tag;

                    return (
                      <button
                        key={stat.tag}
                        onClick={() => handleTagSelect(stat.tag)}
                        className={`w-full text-left px-3 py-2 rounded transition relative overflow-hidden
                          ${
                            isSelected
                              ? 'border-l-4 border-blue-600 font-semibold bg-blue-50/30'
                              : 'border-l-4 border-transparent hover:bg-gray-100'
                          }`}
                      >
                        {/* Background bar - always visible */}
                        <div
                          className="absolute inset-y-0 left-0 bg-blue-100 transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                        {/* Tag name and count */}
                        <div className="flex items-center justify-between relative z-10">
                          <span className="text-sm">{stat.tag}</span>
                          <span
                            className={`text-xs ml-2 font-normal
                            ${isSelected ? 'text-blue-700 font-semibold' : 'text-gray-500'}
                          `}
                          >
                            {stat.count}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Main Content - Mistake Cards */}
          <div className="lg:col-span-3">
            <div className="space-y-4">
              {mistakes.map(mistake => {
                const boardState = deserializeBoardState(mistake.boardState);
                return (
                  <div key={mistake.id} className="bg-white rounded-lg shadow p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Go Board Preview */}
                      <div className="md:col-span-1">
                        <div className="max-w-xs mx-auto">
                          <PlayerGoban
                            boardState={boardState}
                            playerColor={mistake.game.playerColor as 'black' | 'white'}
                            lastMove={boardState.lastMoveVertex}
                            showCoordinates={true}
                          />
                        </div>
                      </div>

                      {/* Mistake Details */}
                      <div className="md:col-span-2 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{mistake.briefDescription}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                {mistake.primaryTag}
                              </span>
                              <span className="text-sm text-gray-500">
                                Move {mistake.moveIndex}
                              </span>
                            </div>
                          </div>
                        </div>

                        {mistake.detailedReflection && (
                          <p className="text-sm text-gray-700 line-clamp-3">
                            {mistake.detailedReflection}
                          </p>
                        )}

                        <div className="pt-2 border-t text-sm text-gray-600">
                          <p>
                            <strong>Game:</strong> {mistake.game.playerColor} vs{' '}
                            {mistake.game.opponentRank
                              ? `${mistake.game.opponentRank}`
                              : 'opponent'}
                            {mistake.game.timeControl &&
                              ` • ${formatTimeControl(mistake.game.timeControl)}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Played{' '}
                            {mistake.game.datePlayed
                              ? new Date(mistake.game.datePlayed).toLocaleDateString()
                              : 'Unknown date'}
                          </p>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() =>
                              router.push(`/games/${mistake.gameId}?moveIndex=${mistake.moveIndex}`)
                            }
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                          >
                            View in Game
                          </button>
                          <button
                            onClick={e => handleDelete(mistake.id, e)}
                            disabled={deletingId === mistake.id}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                          >
                            {deletingId === mistake.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * mistakesPerPage + 1} to{' '}
                  {Math.min(currentPage * mistakesPerPage, totalMistakes)} of {totalMistakes}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Previous
                  </button>
                  <div className="flex items-center px-3 text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!hasMore}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
