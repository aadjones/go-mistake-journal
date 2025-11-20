import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as mistakesRepo from '@/lib/db/mistakes-repository';
import * as gamesRepo from '@/lib/db/games-repository';
import type { CreateMistakeInput, UpdateMistakeInput } from '@/types/mistake';
import { createTestDatabase } from '../../helpers/test-db';

let prisma: PrismaClient;
let cleanup: () => Promise<void>;

const createTestGame = async () => {
  // Minimal valid SGF for testing - unique per game
  const uniqueId = `${Date.now()}-${Math.random()}`;
  const sgf = `(;GM[1]FF[4]CA[UTF-8]SZ[19]KM[6.5]
PW[Test${uniqueId}]PB[Opponent]
;B[pd];W[dp];B[pq])`;

  return gamesRepo.createGame(prisma, {
    sgf,
    playerColor: 'white',
  });
};

const createTestMistakeInput = (
  gameId: string,
  overrides?: Partial<CreateMistakeInput>
): CreateMistakeInput => ({
  gameId,
  moveIndex: 19,
  boardState: 'pd,dp,pq', // Simple board state representation
  briefDescription: 'Missed a tactic',
  primaryTag: 'calculation',
  ...overrides,
});

describe('mistakes-repository', () => {
  beforeAll(async () => {
    const db = await createTestDatabase();
    prisma = db.prisma;
    cleanup = db.cleanup;
  });

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(async () => {
    await prisma.mistake.deleteMany();
    await prisma.game.deleteMany();
  });

  describe('createMistake', () => {
    it('should create a mistake with all fields', async () => {
      const game = await createTestGame();
      const input = createTestMistakeInput(game.id, {
        detailedReflection: 'I should have calculated deeper',
      });

      const mistake = await mistakesRepo.createMistake(prisma, input);

      expect(mistake.id).toBeDefined();
      expect(mistake.gameId).toBe(game.id);
      expect(mistake.moveIndex).toBe(input.moveIndex);
      expect(mistake.boardState).toBe(input.boardState);
      expect(mistake.briefDescription).toBe(input.briefDescription);
      expect(mistake.primaryTag).toBe(input.primaryTag);
      expect(mistake.detailedReflection).toBe(input.detailedReflection);
      expect(mistake.createdAt).toBeInstanceOf(Date);
      expect(mistake.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a mistake with only required fields', async () => {
      const game = await createTestGame();
      const input = createTestMistakeInput(game.id);

      const mistake = await mistakesRepo.createMistake(prisma, input);

      expect(mistake.id).toBeDefined();
      expect(mistake.detailedReflection).toBeUndefined();
    });

    it('should handle different tags', async () => {
      const game = await createTestGame();
      const tags = ['tactics', 'strategy', 'time-pressure', 'missed-threat'];

      for (const tag of tags) {
        const input = createTestMistakeInput(game.id, { primaryTag: tag });
        const mistake = await mistakesRepo.createMistake(prisma, input);
        expect(mistake.primaryTag).toBe(tag);
      }
    });
  });

  describe('getMistakeById', () => {
    it('should retrieve an existing mistake', async () => {
      const game = await createTestGame();
      const input = createTestMistakeInput(game.id);
      const created = await mistakesRepo.createMistake(prisma, input);

      const retrieved = await mistakesRepo.getMistakeById(prisma, created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.briefDescription).toBe(created.briefDescription);
    });

    it('should return null for non-existent mistake', async () => {
      const mistake = await mistakesRepo.getMistakeById(prisma, 'non-existent-id');
      expect(mistake).toBeNull();
    });
  });

  describe('getMistakesByGameId', () => {
    it('should return empty array when game has no mistakes', async () => {
      const game = await createTestGame();
      const mistakes = await mistakesRepo.getMistakesByGameId(prisma, game.id);
      expect(mistakes).toEqual([]);
    });

    it('should return all mistakes for a game', async () => {
      const game = await createTestGame();
      await mistakesRepo.createMistake(prisma, createTestMistakeInput(game.id, { moveIndex: 19 }));
      await mistakesRepo.createMistake(prisma, createTestMistakeInput(game.id, { moveIndex: 29 }));
      await mistakesRepo.createMistake(prisma, createTestMistakeInput(game.id, { moveIndex: 39 }));

      const mistakes = await mistakesRepo.getMistakesByGameId(prisma, game.id);

      expect(mistakes).toHaveLength(3);
    });

    it('should return mistakes ordered by move index', async () => {
      const game = await createTestGame();
      await mistakesRepo.createMistake(prisma, createTestMistakeInput(game.id, { moveIndex: 39 }));
      await mistakesRepo.createMistake(prisma, createTestMistakeInput(game.id, { moveIndex: 19 }));
      await mistakesRepo.createMistake(prisma, createTestMistakeInput(game.id, { moveIndex: 29 }));

      const mistakes = await mistakesRepo.getMistakesByGameId(prisma, game.id);

      expect(mistakes[0].moveIndex).toBe(19);
      expect(mistakes[1].moveIndex).toBe(29);
      expect(mistakes[2].moveIndex).toBe(39);
    });

    it('should not return mistakes from other games', async () => {
      const game1 = await createTestGame();
      const game2 = await createTestGame();

      await mistakesRepo.createMistake(prisma, createTestMistakeInput(game1.id));
      await mistakesRepo.createMistake(prisma, createTestMistakeInput(game2.id));

      const mistakes = await mistakesRepo.getMistakesByGameId(prisma, game1.id);

      expect(mistakes).toHaveLength(1);
      expect(mistakes[0].gameId).toBe(game1.id);
    });
  });

  describe('getAllMistakes', () => {
    it('should return empty array when no mistakes exist', async () => {
      const mistakes = await mistakesRepo.getAllMistakes(prisma);
      expect(mistakes).toEqual([]);
    });

    it('should return all mistakes across all games', async () => {
      const game1 = await createTestGame();
      const game2 = await createTestGame();

      await mistakesRepo.createMistake(prisma, createTestMistakeInput(game1.id));
      await mistakesRepo.createMistake(prisma, createTestMistakeInput(game1.id));
      await mistakesRepo.createMistake(prisma, createTestMistakeInput(game2.id));

      const mistakes = await mistakesRepo.getAllMistakes(prisma);

      expect(mistakes).toHaveLength(3);
    });

    it('should return mistakes ordered by createdAt descending', async () => {
      const game = await createTestGame();
      const mistake1 = await mistakesRepo.createMistake(
        prisma,
        createTestMistakeInput(game.id, { briefDescription: 'First' })
      );
      await new Promise(resolve => setTimeout(resolve, 10));
      const mistake2 = await mistakesRepo.createMistake(
        prisma,
        createTestMistakeInput(game.id, { briefDescription: 'Second' })
      );

      const mistakes = await mistakesRepo.getAllMistakes(prisma);

      expect(mistakes[0].id).toBe(mistake2.id);
      expect(mistakes[1].id).toBe(mistake1.id);
    });
  });

  describe('updateMistake', () => {
    it('should update brief description', async () => {
      const game = await createTestGame();
      const created = await mistakesRepo.createMistake(prisma, createTestMistakeInput(game.id));

      const update: UpdateMistakeInput = {
        briefDescription: 'Updated description',
      };
      const updated = await mistakesRepo.updateMistake(prisma, created.id, update);

      expect(updated?.briefDescription).toBe('Updated description');
      expect(updated?.primaryTag).toBe(created.primaryTag);
    });

    it('should update primary tag', async () => {
      const game = await createTestGame();
      const created = await mistakesRepo.createMistake(prisma, createTestMistakeInput(game.id));

      const update: UpdateMistakeInput = {
        primaryTag: 'time-pressure',
      };
      const updated = await mistakesRepo.updateMistake(prisma, created.id, update);

      expect(updated?.primaryTag).toBe('time-pressure');
      expect(updated?.briefDescription).toBe(created.briefDescription);
    });

    it('should update detailed reflection', async () => {
      const game = await createTestGame();
      const created = await mistakesRepo.createMistake(prisma, createTestMistakeInput(game.id));

      const update: UpdateMistakeInput = {
        detailedReflection: 'New detailed reflection',
      };
      const updated = await mistakesRepo.updateMistake(prisma, created.id, update);

      expect(updated?.detailedReflection).toBe('New detailed reflection');
    });

    it('should update multiple fields at once', async () => {
      const game = await createTestGame();
      const created = await mistakesRepo.createMistake(prisma, createTestMistakeInput(game.id));

      const update: UpdateMistakeInput = {
        briefDescription: 'New description',
        primaryTag: 'strategy',
        detailedReflection: 'New reflection',
      };
      const updated = await mistakesRepo.updateMistake(prisma, created.id, update);

      expect(updated?.briefDescription).toBe('New description');
      expect(updated?.primaryTag).toBe('strategy');
      expect(updated?.detailedReflection).toBe('New reflection');
    });

    it('should update updatedAt timestamp', async () => {
      const game = await createTestGame();
      const created = await mistakesRepo.createMistake(prisma, createTestMistakeInput(game.id));
      const originalUpdatedAt = created.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      const update: UpdateMistakeInput = {
        briefDescription: 'Updated',
      };
      const updated = await mistakesRepo.updateMistake(prisma, created.id, update);

      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should return null for non-existent mistake', async () => {
      const update: UpdateMistakeInput = {
        briefDescription: 'Updated',
      };
      const updated = await mistakesRepo.updateMistake(prisma, 'non-existent-id', update);
      expect(updated).toBeNull();
    });
  });

  describe('deleteMistake', () => {
    it('should delete an existing mistake', async () => {
      const game = await createTestGame();
      const created = await mistakesRepo.createMistake(prisma, createTestMistakeInput(game.id));

      await mistakesRepo.deleteMistake(prisma, created.id);

      const retrieved = await mistakesRepo.getMistakeById(prisma, created.id);
      expect(retrieved).toBeNull();
    });

    it('should not throw when deleting non-existent mistake', async () => {
      await expect(mistakesRepo.deleteMistake(prisma, 'non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('getMistakesCount', () => {
    it('should return 0 when no mistakes exist', async () => {
      const count = await mistakesRepo.getMistakesCount(prisma);
      expect(count).toBe(0);
    });

    it('should return correct count', async () => {
      const game = await createTestGame();
      await mistakesRepo.createMistake(prisma, createTestMistakeInput(game.id));
      await mistakesRepo.createMistake(prisma, createTestMistakeInput(game.id));
      await mistakesRepo.createMistake(prisma, createTestMistakeInput(game.id));

      const count = await mistakesRepo.getMistakesCount(prisma);
      expect(count).toBe(3);
    });
  });

  describe('getUniqueTags', () => {
    it('should return empty array when no mistakes exist', async () => {
      const tags = await mistakesRepo.getUniqueTags(prisma);
      expect(tags).toEqual([]);
    });

    it('should return unique tags', async () => {
      const game = await createTestGame();
      await mistakesRepo.createMistake(
        prisma,
        createTestMistakeInput(game.id, { primaryTag: 'calculation' })
      );
      await mistakesRepo.createMistake(
        prisma,
        createTestMistakeInput(game.id, { primaryTag: 'tactics' })
      );
      await mistakesRepo.createMistake(
        prisma,
        createTestMistakeInput(game.id, { primaryTag: 'calculation' })
      );

      const tags = await mistakesRepo.getUniqueTags(prisma);

      expect(tags).toHaveLength(2);
      expect(tags).toContain('calculation');
      expect(tags).toContain('tactics');
    });

    it('should return tags sorted alphabetically', async () => {
      const game = await createTestGame();
      await mistakesRepo.createMistake(
        prisma,
        createTestMistakeInput(game.id, { primaryTag: 'zeitnot' })
      );
      await mistakesRepo.createMistake(
        prisma,
        createTestMistakeInput(game.id, { primaryTag: 'calculation' })
      );
      await mistakesRepo.createMistake(
        prisma,
        createTestMistakeInput(game.id, { primaryTag: 'tactics' })
      );

      const tags = await mistakesRepo.getUniqueTags(prisma);

      expect(tags).toEqual(['calculation', 'tactics', 'zeitnot']);
    });
  });
});
