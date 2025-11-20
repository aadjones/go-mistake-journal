import { PrismaClient } from '@prisma/client';
import type { Mistake, CreateMistakeInput, UpdateMistakeInput } from '@/types/mistake';

/**
 * Convert Prisma Mistake model to domain Mistake type
 */
function toDomainMistake(prismaMistake: {
  id: string;
  gameId: string;
  moveIndex: number;
  boardState: string;
  briefDescription: string;
  primaryTag: string;
  detailedReflection: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Mistake {
  return {
    id: prismaMistake.id,
    gameId: prismaMistake.gameId,
    moveIndex: prismaMistake.moveIndex,
    boardState: prismaMistake.boardState,
    briefDescription: prismaMistake.briefDescription,
    primaryTag: prismaMistake.primaryTag,
    detailedReflection: prismaMistake.detailedReflection ?? undefined,
    createdAt: prismaMistake.createdAt,
    updatedAt: prismaMistake.updatedAt,
  };
}

/**
 * Create a new mistake
 */
export async function createMistake(
  prisma: PrismaClient,
  input: CreateMistakeInput
): Promise<Mistake> {
  const mistake = await prisma.mistake.create({
    data: {
      gameId: input.gameId,
      moveIndex: input.moveIndex,
      boardState: input.boardState,
      briefDescription: input.briefDescription,
      primaryTag: input.primaryTag,
      detailedReflection: input.detailedReflection,
    },
  });

  return toDomainMistake(mistake);
}

/**
 * Get a mistake by ID
 */
export async function getMistakeById(prisma: PrismaClient, id: string): Promise<Mistake | null> {
  const mistake = await prisma.mistake.findUnique({
    where: { id },
  });

  return mistake ? toDomainMistake(mistake) : null;
}

/**
 * Get all mistakes for a specific game (ordered by move index)
 */
export async function getMistakesByGameId(
  prisma: PrismaClient,
  gameId: string
): Promise<Mistake[]> {
  const mistakes = await prisma.mistake.findMany({
    where: { gameId },
    orderBy: { moveIndex: 'asc' },
  });

  return mistakes.map(toDomainMistake);
}

/**
 * Get all mistakes across all games (ordered by most recent first)
 */
export async function getAllMistakes(prisma: PrismaClient): Promise<Mistake[]> {
  const mistakes = await prisma.mistake.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return mistakes.map(toDomainMistake);
}

/**
 * Update a mistake
 */
export async function updateMistake(
  prisma: PrismaClient,
  id: string,
  update: UpdateMistakeInput
): Promise<Mistake | null> {
  try {
    const mistake = await prisma.mistake.update({
      where: { id },
      data: {
        briefDescription: update.briefDescription,
        primaryTag: update.primaryTag,
        detailedReflection: update.detailedReflection,
      },
    });

    return toDomainMistake(mistake);
  } catch {
    // Return null if mistake doesn't exist
    return null;
  }
}

/**
 * Delete a mistake
 */
export async function deleteMistake(prisma: PrismaClient, id: string): Promise<void> {
  await prisma.mistake
    .delete({
      where: { id },
    })
    .catch(() => {
      // Ignore error if mistake doesn't exist
    });
}

/**
 * Get total count of mistakes
 */
export async function getMistakesCount(prisma: PrismaClient): Promise<number> {
  return prisma.mistake.count();
}

/**
 * Get all unique tags (sorted alphabetically)
 */
export async function getUniqueTags(prisma: PrismaClient): Promise<string[]> {
  const result = await prisma.mistake.findMany({
    select: { primaryTag: true },
    distinct: ['primaryTag'],
    orderBy: { primaryTag: 'asc' },
  });

  return result.map(r => r.primaryTag);
}
