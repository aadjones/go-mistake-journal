'use client';

import { useEffect, useState } from 'react';

const LOADING_MESSAGES = [
  'Analyzing your mistake patterns...',
  'Looking for recurring themes...',
  'Examining your reflections...',
  'Identifying emotional patterns...',
  'Synthesizing insights from your words...',
  'Finding connections you might have missed...',
  'Processing your Go journey...',
];

export function InsightLoadingSpinner() {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Rotate messages every 3 seconds
    const messageInterval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);

    // Simulate progress (complete in ~30 seconds)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev; // Stop at 95% until actual completion
        return prev + 1;
      });
    }, 300);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <div className="flex flex-col items-center">
        {/* Spinner */}
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-right text-xs text-gray-500 mt-1">{progress}%</div>
        </div>

        {/* Rotating Messages */}
        <div className="text-center min-h-[3rem] flex items-center">
          <p className="text-lg text-gray-700 animate-pulse">{LOADING_MESSAGES[currentMessage]}</p>
        </div>

        <p className="text-sm text-gray-500 mt-4">This usually takes 10-30 seconds</p>
      </div>
    </div>
  );
}
