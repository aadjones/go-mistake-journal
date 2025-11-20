# Testing Strategy

## Database Repository Testing

### The Problem We Solved

Initial tests used manual SQL to create schemas, which caused:

1. **Schema divergence** - Test schemas didn't match production (e.g., `@updatedAt` behavior)
2. **Test interference** - Shared in-memory databases caused flaky tests
3. **Maintenance burden** - Schema changes required updating multiple files

### The Solution

Use **actual Prisma migrations** for test schemas via `createTestDatabase()` helper.

### Test Pattern

```typescript
import { createTestDatabase } from '../../helpers/test-db';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;
let cleanup: () => Promise<void>;

describe('my-repository', () => {
  beforeAll(async () => {
    const db = await createTestDatabase();
    prisma = db.prisma;
    cleanup = db.cleanup;
  });

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(async () => {
    // Clean data between tests, not schema
    await prisma.mistake.deleteMany();
    await prisma.game.deleteMany();
  });

  // ... tests
});
```

### How It Works

1. **`beforeAll`** - Creates isolated SQLite file with Prisma migrations
2. **`beforeEach`** - Cleans data (fast), keeps schema (no recreation)
3. **`afterAll`** - Disconnects and deletes test database file

### Key Benefits

✅ **Schema consistency** - Tests use exact production schema  
✅ **Test isolation** - Each test file gets unique database  
✅ **Single source of truth** - Prisma schema is the only schema definition  
✅ **No manual SQL** - Migrations handle all schema changes  
✅ **Fast enough** - File-based is slightly slower than in-memory, but reliable

### When to Clean Up

Test databases are automatically deleted in `afterAll()`. The `__tests__/test-dbs/` directory is git-ignored.

For manual cleanup during development:

```bash
rm -rf __tests__/test-dbs
```

## Testing Philosophy

From `development-rules.md`:

- Test core logic (SGF parsing, board state extraction, move navigation, repositories)
- Don't test UI components or libraries we don't own
- Use real, validated data in test fixtures
- Test behaviors, not implementation details

## Repository Pattern

Repositories use dependency injection:

```typescript
export async function createGame(prisma: PrismaClient, input: CreateGameInput): Promise<Game>;
```

This allows:

- Easy mocking in tests
- Testability without complex setup
- Clear separation of data access from business logic

Domain types (not Prisma types) are used in public APIs to maintain clean boundaries.
