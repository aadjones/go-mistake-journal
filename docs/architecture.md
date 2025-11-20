# Go Mistake Journal - Architecture

## Overview

A Next.js application for tracking and analyzing Go (baduk/weiqi) mistakes. Users import games via SGF, navigate through moves, and record mistakes with reflections and tags.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite + Prisma ORM
- **Go Logic**: @sabaki/sgf (SGF parsing)
- **UI**: React Server Components, Tailwind CSS
- **Testing**: Vitest

## Data Model

```prisma
model Game {
  id           String    @id @default(cuid())
  sgf          String    @unique
  playerColor  String
  opponentRank String?
  timeControl  String?
  datePlayed   DateTime?
  createdAt    DateTime  @default(now())
  mistakes     Mistake[]
}

model Mistake {
  id                 String   @id @default(cuid())
  gameId             String
  moveIndex          Int
  boardState         String
  briefDescription   String
  primaryTag         String
  detailedReflection String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  game               Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
}
```

**Key Design Decisions:**

- **SGF as unique key**: Prevents duplicate game imports
- **boardState serialization**: Stores position as JSON string for display
- **Cascade delete**: Deleting a game removes all associated mistakes

## Architecture Layers

### 1. API Routes (`app/api/*`)

Thin controllers that validate input and call repository functions.

**Endpoints:**

- `POST /api/games` - Import game from SGF
- `GET /api/games/:id` - Get game with parsed SGF data
- `POST /api/mistakes` - Create mistake
- `GET /api/mistakes` - List mistakes with pagination/filtering
- `GET /api/stats` - Aggregate statistics by tag

### 2. Repository Layer (`lib/db/*`)

Database access with clean domain types. Converts between Prisma models and domain types.

- `games-repository.ts` - Game CRUD operations
- `mistakes-repository.ts` - Mistake CRUD + aggregations

### 3. Go Logic (`lib/go/*`)

SGF parsing, move navigation, and board state management.

- `sgf-parser.ts` - Parse SGF → ParsedGame with metadata
- `move-navigator.ts` - Navigate through game positions
- `board-state-extractor.ts` - Serialize/deserialize board positions

### 4. UI Components (`components/`)

- `SimpleGoban.tsx` - Custom SVG-based Go board renderer
- `PlayerGoban.tsx` - Wrapper with player-specific styling
- `Header.tsx` - Navigation header

## Go-Specific Implementation

### SGF Parsing

Uses `@sabaki/sgf` to parse SGF files into game trees. Extracts:

- Headers (PW, PB, WR, BR, DT, RE, KM, etc.)
- Move sequence with coordinates
- Game result and metadata

### Board State Representation

```typescript
interface BoardState {
  boardSize: number;
  signMap: number[][]; // 1=black, -1=white, 0=empty
  captures?: { [key: number]: number };
  moveIndex: number;
  lastMoveVertex?: Vertex | null;
}
```

Serialized as JSON string for database storage.

### Move Navigation

`MoveNavigator` class manages:

- Current position in game
- Forward/backward navigation
- Board state at each position
- Last move highlighting

## Key Workflows

### Import Game

1. User pastes SGF text
2. SGF parsed and validated
3. Check for duplicate (unique SGF constraint)
4. Store game with metadata
5. Redirect to game viewer

### Record Mistake

1. Navigate to mistake position in game viewer
2. Click "Add Mistake" button
3. Board state captured and serialized
4. Fill out mistake form (description, tag, reflection)
5. Save mistake with position reference
6. Return to game viewer

### Browse Mistakes

1. Load mistakes with pagination
2. Display board preview for each mistake
3. Filter by tag
4. Click to view mistake in game context

## Testing Strategy

**What we test:**

- Repository layer (database operations)
- SGF parsing and board state logic
- Move navigation correctness

**What we don't test:**

- UI components
- Third-party libraries
- Implementation details

See `docs/testing-strategy.md` for full philosophy.

## File Structure

```
go-journal/
├── app/
│   ├── api/              # API route handlers
│   ├── games/            # Game viewer pages
│   ├── mistakes/         # Mistake list/form pages
│   └── layout.tsx        # Root layout
├── components/           # React components
├── lib/
│   ├── db/              # Repository layer
│   ├── go/              # Go-specific logic
│   └── utils/           # Helpers
├── types/
│   ├── game.ts          # Game domain types
│   ├── mistake.ts       # Mistake domain types
│   └── go.ts            # Go-specific types
├── prisma/
│   └── schema.prisma    # Database schema
└── __tests__/           # Test files
```

## Design Principles

1. **Server Components by default** - Only use Client Components when needed (interactivity)
2. **Clean separation** - Business logic in `lib/`, UI in `app/` and `components/`
3. **Domain types** - Use custom types, not Prisma models, in APIs
4. **Simple over clever** - Prefer readable code over abstraction
5. **Real data in tests** - Use actual SGF files, not hand-crafted test data
