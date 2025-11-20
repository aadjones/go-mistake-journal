import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as mistakesRepo from '@/lib/db/mistakes-repository';
import type { CreateMistakeInput } from '@/types/mistake';

const prisma = new PrismaClient();

/**
 * POST /api/mistakes
 * Create a new mistake
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, moveIndex, boardState, briefDescription, primaryTag, detailedReflection } =
      body;

    // Validate required fields
    if (!gameId || moveIndex === undefined || !boardState || !briefDescription || !primaryTag) {
      return NextResponse.json(
        { error: 'gameId, moveIndex, boardState, briefDescription, and primaryTag are required' },
        { status: 400 }
      );
    }

    const input: CreateMistakeInput = {
      gameId,
      moveIndex: parseInt(moveIndex, 10),
      boardState,
      briefDescription,
      primaryTag,
      detailedReflection,
    };

    const mistake = await mistakesRepo.createMistake(prisma, input);

    return NextResponse.json({ mistake }, { status: 201 });
  } catch (error) {
    console.error('Failed to create mistake:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/mistakes
 * List all mistakes with game data (optionally filtered by gameId)
 * Supports pagination via limit and offset query params
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const tag = searchParams.get('tag');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where clause
    const where: { gameId?: string; primaryTag?: string } = {};
    if (gameId) where.gameId = gameId;
    if (tag) where.primaryTag = tag;

    // Get total count for pagination
    const total = await prisma.mistake.count({ where });

    // Get paginated results
    const mistakes = await prisma.mistake.findMany({
      where,
      include: { game: true },
      orderBy: { game: { datePlayed: 'desc' } },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({
      mistakes,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Failed to fetch mistakes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
