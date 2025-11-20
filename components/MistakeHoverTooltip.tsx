'use client';

import { useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { PlayerGoban } from './PlayerGoban';
import type { BoardState } from '@/types/go';

interface MistakeData {
  id: string;
  boardState: BoardState;
  briefDescription: string;
  playerColor: 'black' | 'white';
}

interface MistakeHoverTooltipProps {
  mistakeId: string;
  children: React.ReactNode;
}

export function MistakeHoverTooltip({ mistakeId, children }: MistakeHoverTooltipProps) {
  const [mistakeData, setMistakeData] = useState<MistakeData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMistake = async () => {
    if (mistakeData || loading) return; // Already loaded or loading

    setLoading(true);
    try {
      const response = await fetch(`/api/mistakes/${mistakeId}`);
      if (response.ok) {
        const { mistake } = await response.json();
        setMistakeData({
          id: mistake.id,
          boardState: mistake.boardState,
          briefDescription: mistake.briefDescription,
          playerColor: mistake.game.playerColor as 'black' | 'white',
        });
      }
    } catch (err) {
      console.error('Failed to load mistake:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root onOpenChange={open => open && fetchMistake()}>
        <Tooltip.Trigger asChild>
          <span className="text-blue-600 hover:underline decoration-dotted cursor-help">
            {children}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-3 animate-in fade-in-0 zoom-in-95"
            sideOffset={5}
          >
            {loading && (
              <div className="text-sm text-gray-500 text-center py-4">Loading position...</div>
            )}

            {mistakeData && (
              <div className="space-y-2">
                <div className="w-full">
                  <PlayerGoban
                    boardState={mistakeData.boardState}
                    playerColor={mistakeData.playerColor}
                    lastMove={mistakeData.boardState.lastMoveVertex}
                  />
                </div>
                <div className="text-xs text-gray-700 font-medium">
                  {mistakeData.briefDescription}
                </div>
              </div>
            )}
            <Tooltip.Arrow className="fill-white" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
