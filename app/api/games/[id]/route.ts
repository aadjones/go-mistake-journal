import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as gamesRepo from '@/lib/db/games-repository';
import { parseSGF } from '@/lib/go/sgf-parser';

const prisma = new PrismaClient();

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/games/[id]
 * Get a single game with its mistakes
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const game = await gamesRepo.getGameWithMistakes(prisma, id);

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Parse the SGF server-side so the client doesn't need to import @sabaki/sgf
    const parsedGame = parseSGF(game.sgf);

    return NextResponse.json({ game, parsedGame });
  } catch (error) {
    console.error('Failed to fetch game:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/games/[id]
 * Delete a game (and its mistakes via cascade)
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    await gamesRepo.deleteGame(prisma, id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete game:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
