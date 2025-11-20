import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  parseSGF,
  getPlayerColor,
  getOpponentRank,
  getDatePlayed,
  getTimeControl,
} from '@/lib/go/sgf-parser';
import * as gamesRepo from '@/lib/db/games-repository';
import type { CreateGameInput } from '@/types/game';

const prisma = new PrismaClient();

/**
 * POST /api/games
 * Create a new game from SGF
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sgf, playerColor: userProvidedColor } = body;

    if (!sgf || typeof sgf !== 'string') {
      return NextResponse.json({ error: 'SGF is required and must be a string' }, { status: 400 });
    }

    // Parse SGF to validate and extract metadata
    const parsed = parseSGF(sgf);

    // Use player-provided color if available, otherwise try to detect from SGF
    const playerColor = userProvidedColor || getPlayerColor(parsed);
    const opponentRank = getOpponentRank(parsed, playerColor);
    const datePlayed = getDatePlayed(parsed);
    const timeControl = getTimeControl(parsed);

    // Create game input
    const input: CreateGameInput = {
      sgf,
      playerColor,
      opponentRank,
      timeControl,
      datePlayed,
    };

    // Save to database
    const game = await gamesRepo.createGame(prisma, input);

    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    console.error('Failed to create game:', error);

    if (error instanceof Error && error.name === 'SGFParseError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Handle duplicate SGF (unique constraint violation)
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return NextResponse.json({ error: 'This game has already been imported' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/games
 * List all games
 */
export async function GET() {
  try {
    const games = await gamesRepo.getAllGames(prisma);
    return NextResponse.json({ games });
  } catch (error) {
    console.error('Failed to fetch games:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
