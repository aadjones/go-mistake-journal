'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewGamePage() {
  const router = useRouter();
  const [sgf, setSgf] = useState('');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('black');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.sgf')) {
      setError('Please select an SGF file');
      return;
    }

    try {
      const text = await file.text();
      setSgf(text);
      setFileName(file.name);
      setError(null);
    } catch (err) {
      setError('Failed to read file');
      setFileName(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sgf, playerColor }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import game');
      }

      // Redirect to the game viewer
      router.push(`/games/${data.game.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Import New Game</h1>
        <p className="text-gray-600">
          Paste SGF from OGS, KGS, Fox Go, or any standard SGF format.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <label htmlFor="playerColor" className="block text-sm font-medium text-gray-700 mb-2">
            You played as
          </label>
          <select
            id="playerColor"
            value={playerColor}
            onChange={e => setPlayerColor(e.target.value as 'white' | 'black')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="black">Black</option>
            <option value="white">White</option>
          </select>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">SGF File</label>
            <button
              type="button"
              onClick={() => {
                setInputMode(inputMode === 'file' ? 'paste' : 'file');
                setSgf('');
                setFileName(null);
                setError(null);
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {inputMode === 'file' ? 'Paste SGF instead' : 'Upload file instead'}
            </button>
          </div>

          {inputMode === 'file' ? (
            <div>
              <input
                type="file"
                accept=".sgf"
                onChange={handleFileChange}
                className="hidden"
                id="sgf-file-input"
              />
              <label
                htmlFor="sgf-file-input"
                className="w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 transition cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                {fileName ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">{fileName}</p>
                    <p className="text-xs text-gray-500 mt-1">Click to choose a different file</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">Click to upload SGF file</p>
                    <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
                  </div>
                )}
              </label>
            </div>
          ) : (
            <textarea
              id="sgf"
              value={sgf}
              onChange={e => setSgf(e.target.value)}
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="(;GM[1]FF[4]CA[UTF-8]AP[OGS:1]
PB[Black Player]PW[White Player]
BR[5k]WR[3k]KM[6.5]
DT[2025-01-15]RE[B+Resign]
;B[pd];W[dp];B[pq];W[dd]...)"
              required
            />
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !sgf.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Importing...' : 'Import Game'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/mistakes')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How to get SGF:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            <strong>OGS (Online Go Server):</strong> Open your game → Click the menu (⋮) → Select
            &quot;SGF Download&quot;
          </li>
          <li>
            <strong>KGS:</strong> Open your game → File → Save Game As → Copy the SGF content
          </li>
          <li>
            <strong>Fox Go:</strong> Export the game as SGF from the game records section
          </li>
        </ul>
      </div>
    </div>
  );
}
