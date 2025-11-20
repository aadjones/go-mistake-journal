# Development Rules

## Dependencies

### Next.js 16 - Breaking Changes

**Next.js 16 removed the `next lint` command.**

Use ESLint directly with the flat config format (`eslint.config.mjs`):

```bash
# Run linting
npm run lint

# Auto-fix issues
npm run lint:fix
```

The project uses ESLint 9 with flat config format:

- Native support for TypeScript via `typescript-eslint`
- React and React Hooks plugins configured
- Separate configuration for Node.js files (CommonJS)
- Ignores `.next/`, `node_modules/`, etc.

**Next.js 16 - `params` is now a Promise in API routes**

In dynamic API routes (e.g., `app/api/games/[id]/route.ts`), the `params` object is now a Promise and must be awaited:

```typescript
// ❌ WRONG - Next.js 15 and earlier
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = params; // This will error in Next.js 16!
  // ...
}

// ✅ CORRECT - Next.js 16
type RouteContext = {
  params: Promise<{ id: string }>; // Note: Promise type
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params; // Must await!
  // ...
}
```

This applies to ALL route handlers (GET, POST, PATCH, DELETE) in dynamic routes like:

- `app/api/games/[id]/route.ts`
- `app/api/mistakes/[id]/route.ts`
- Any other `[param]` routes

### Tailwind CSS v3.x (Not v4)

**Use Tailwind CSS v3.4.x**, not v4.

Tailwind v4 changed the PostCSS plugin architecture and requires `@tailwindcss/postcss` as a separate package. For stability and compatibility with the Next.js ecosystem, we use v3.

```bash
# Correct version
npm install -D tailwindcss@^3.4.0 postcss autoprefixer
```

The standard PostCSS config works with v3:

```js
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

## Code Quality

### Don't Reinvent the Wheel

**Always check if existing libraries already solve the problem before implementing from scratch.**

Examples:

- ✅ Use `@sabaki/sgf` for SGF parsing instead of writing a custom parser
- ✅ Search npm/GitHub for established solutions to common problems
- ✅ Use well-tested libraries for game logic when available

Before implementing any non-trivial algorithm:

1. Check if established Go libraries already have it
2. Search for specialized libraries (e.g., SGF parsers, joseki databases)
3. Only implement custom code if no suitable library exists

### SGF Data Integrity

**Use real SGF data from actual games** rather than hand-crafting test data.

When creating test fixtures:

1. **Use real SGF data** from games played on OGS, KGS, Fox Go, or other servers
2. **Download SGF files** from Go servers or game databases
3. **Keep test SGFs simple** - shorter games are easier to validate and debug
4. **Validate SGF structure** - ensure proper SGF format with required tags

### SGF Format Requirements

SGF files for Go must follow the Smart Game Format specification:

```sgf
(;GM[1]FF[4]CA[UTF-8]SZ[19]KM[6.5]
PW[White Player]PB[Black Player]
;B[pd];W[dp];B[pq]...)
```

Key requirements:

- `GM[1]` - Game type (1 = Go)
- `FF[4]` - File format version
- `SZ[19]` - Board size (19x19, 13x13, or 9x9)
- Moves in format `B[coordinate]` or `W[coordinate]`

### Examples

#### Good: Real game from OGS

```typescript
// Downloaded from actual game
export const REAL_GAME = `(;GM[1]FF[4]CA[UTF-8]SZ[19]KM[6.5]
PW[Player1]PB[Player2]WR[5k]BR[6k]
DT[2025-01-19]
;B[pd];W[dp];B[pq];W[dd]...)`;
```

#### Bad: Incomplete or invalid SGF

```typescript
// DON'T DO THIS - missing required tags
export const INCOMPLETE_SGF = `(;B[pd];W[dp])`;
```

## Testing Philosophy

- Write tests for core logic (SGF parsing, board state extraction, move navigation)
- Don't test UI components or libraries we don't own
- Use real, validated SGF data in test fixtures
- Test behaviors, not implementation details

## Architecture

- Keep business logic in `lib/` separate from Next.js/React
- Use domain types, not Prisma types, in public APIs
- Server Components by default, Client Components only when needed
- API routes are thin controllers - validation + data layer calls

## Database Constraints

### Unique SGF Constraint

The `Game` model has a unique constraint on the `sgf` field to prevent duplicate game imports. This means:

- Two identical SGF strings cannot be imported
- The API returns a 409 Conflict status with message "This game has already been imported"
- SGF content is stored as-is for exact duplicate detection

If you need to reimport a game, delete it first via the API or database.
