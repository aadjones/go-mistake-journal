import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as gamesRepo from '@/lib/db/games-repository';
import type { CreateGameInput } from '@/types/game';
import { createTestDatabase } from '../../helpers/test-db';

let prisma: PrismaClient;
let cleanup: () => Promise<void>;

// Helper to create test game input with unique SGF
const createTestGameInput = (overrides?: Partial<CreateGameInput>): CreateGameInput => {
  const uniqueId = `${Date.now()}-${Math.random()}`;
  return {
    sgf: `(;GM[1]FF[4]CA[UTF-8]SZ[19]KM[6.5]
PW[Test${uniqueId}]PB[Opponent]
;B[pd];W[dp];B[pq])`,
    playerColor: 'white',
    opponentRank: '5k',
    timeControl: '600+0',
    datePlayed: new Date('2024-01-01'),
    ...overrides,
  };
};

describe('games-repository', () => {
  beforeAll(async () => {
    const db = await createTestDatabase();
    prisma = db.prisma;
    cleanup = db.cleanup;
  });

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(async () => {
    // Clean data between tests (keep schema)
    await prisma.mistake.deleteMany();
    await prisma.game.deleteMany();
  });

  describe('createGame', () => {
    it('should create a game with all fields', async () => {
      const input = createTestGameInput();
      const game = await gamesRepo.createGame(prisma, input);

      expect(game.id).toBeDefined();
      expect(game.sgf).toBe(input.sgf);
      expect(game.playerColor).toBe(input.playerColor);
      expect(game.opponentRank).toBe(input.opponentRank);
      expect(game.timeControl).toBe(input.timeControl);
      expect(game.datePlayed).toEqual(input.datePlayed);
      expect(game.createdAt).toBeInstanceOf(Date);
    });

    it('should create a game with only required fields', async () => {
      const input = createTestGameInput({
        opponentRank: undefined,
        timeControl: undefined,
        datePlayed: undefined,
      });
      const game = await gamesRepo.createGame(prisma, input);

      expect(game.id).toBeDefined();
      expect(game.sgf).toBe(input.sgf);
      expect(game.playerColor).toBe(input.playerColor);
      expect(game.opponentRank).toBeUndefined();
      expect(game.timeControl).toBeUndefined();
      expect(game.datePlayed).toBeUndefined();
    });

    it('should handle black player color', async () => {
      const input = createTestGameInput({ playerColor: 'black' });
      const game = await gamesRepo.createGame(prisma, input);

      expect(game.playerColor).toBe('black');
    });
  });

  describe('getGameById', () => {
    it('should retrieve an existing game', async () => {
      const input = createTestGameInput();
      const created = await gamesRepo.createGame(prisma, input);

      const retrieved = await gamesRepo.getGameById(prisma, created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.sgf).toBe(created.sgf);
    });

    it('should return null for non-existent game', async () => {
      const game = await gamesRepo.getGameById(prisma, 'non-existent-id');
      expect(game).toBeNull();
    });
  });

  describe('getGameWithMistakes', () => {
    it('should retrieve game with empty mistakes array', async () => {
      const input = createTestGameInput();
      const created = await gamesRepo.createGame(prisma, input);

      const gameWithMistakes = await gamesRepo.getGameWithMistakes(prisma, created.id);

      expect(gameWithMistakes).toBeDefined();
      expect(gameWithMistakes?.mistakes).toEqual([]);
    });

    it('should return null for non-existent game', async () => {
      const game = await gamesRepo.getGameWithMistakes(prisma, 'non-existent-id');
      expect(game).toBeNull();
    });

    it('should retrieve game with mistakes', async () => {
      const input = createTestGameInput();
      const created = await gamesRepo.createGame(prisma, input);

      // Create a mistake for this game
      await prisma.mistake.create({
        data: {
          gameId: created.id,
          moveIndex: 19,
          boardState: 'pd,dp,pq',
          briefDescription: 'Test mistake',
          primaryTag: 'calculation',
        },
      });

      const gameWithMistakes = await gamesRepo.getGameWithMistakes(prisma, created.id);

      expect(gameWithMistakes).toBeDefined();
      expect(gameWithMistakes?.mistakes).toHaveLength(1);
      expect(gameWithMistakes?.mistakes[0].briefDescription).toBe('Test mistake');
    });
  });

  describe('getAllGames', () => {
    it('should return empty array when no games exist', async () => {
      const games = await gamesRepo.getAllGames(prisma);
      expect(games).toEqual([]);
    });

    it('should return all games', async () => {
      await gamesRepo.createGame(prisma, createTestGameInput());
      await gamesRepo.createGame(prisma, createTestGameInput({ playerColor: 'black' }));

      const games = await gamesRepo.getAllGames(prisma);

      expect(games).toHaveLength(2);
    });

    it('should return games ordered by createdAt descending', async () => {
      const game1 = await gamesRepo.createGame(prisma, createTestGameInput());
      // Small delay to ensure different createdAt
      await new Promise(resolve => setTimeout(resolve, 10));
      const game2 = await gamesRepo.createGame(prisma, createTestGameInput());

      const games = await gamesRepo.getAllGames(prisma);

      expect(games[0].id).toBe(game2.id);
      expect(games[1].id).toBe(game1.id);
    });
  });

  describe('deleteGame', () => {
    it('should delete an existing game', async () => {
      const created = await gamesRepo.createGame(prisma, createTestGameInput());

      await gamesRepo.deleteGame(prisma, created.id);

      const retrieved = await gamesRepo.getGameById(prisma, created.id);
      expect(retrieved).toBeNull();
    });

    it('should cascade delete mistakes', async () => {
      const created = await gamesRepo.createGame(prisma, createTestGameInput());

      const mistake = await prisma.mistake.create({
        data: {
          gameId: created.id,
          moveIndex: 19,
          boardState: 'pd,dp,pq',
          briefDescription: 'Test mistake',
          primaryTag: 'calculation',
        },
      });

      await gamesRepo.deleteGame(prisma, created.id);

      const mistakeExists = await prisma.mistake.findUnique({
        where: { id: mistake.id },
      });
      expect(mistakeExists).toBeNull();
    });

    it('should not throw when deleting non-existent game', async () => {
      await expect(gamesRepo.deleteGame(prisma, 'non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('getGamesCount', () => {
    it('should return 0 when no games exist', async () => {
      const count = await gamesRepo.getGamesCount(prisma);
      expect(count).toBe(0);
    });

    it('should return correct count', async () => {
      await gamesRepo.createGame(prisma, createTestGameInput());
      await gamesRepo.createGame(prisma, createTestGameInput());
      await gamesRepo.createGame(prisma, createTestGameInput());

      const count = await gamesRepo.getGamesCount(prisma);
      expect(count).toBe(3);
    });
  });
});
