# Go Mistake Journal

A systematic tool for tracking and analyzing Go (baduk/weiqi) mistakes to accelerate improvement.

## Quick Start

```bash
# Install dependencies
npm install

# Set up database
npx prisma migrate dev

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **React 19**
- **Tailwind CSS 3.4** (utility-first styling)
- **Prisma 6** + SQLite (database ORM)
- **@sabaki/sgf** (SGF parsing)
- **@sabaki/go-board** (Go game logic & move validation)
- **Custom SVG Go board renderer** (lightweight, no external dependencies)
- **Vitest 4** (testing)

## Commands

```bash
# Development
npm run dev              # Start dev server
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run lint             # Lint code
npm run lint:fix         # Auto-fix lint issues
npm run format           # Format with Prettier
npm run build            # Build for production

# Database
npx prisma migrate dev   # Run migrations
npx prisma studio        # Open database GUI

# Utilities
npm run verify           # Verify setup is correct
npm run reset            # Clear build cache
```

## Documentation

- [Architecture](./docs/architecture.md) - System architecture and design decisions
- [Development Rules](./docs/development-rules.md) - Critical development guidelines
- [Changelog](./docs/changelog.md) - Feature history

## Project Structure

```
├── app/              # Next.js App Router pages & API routes
├── lib/              # Core business logic (Go utilities, repositories)
├── types/            # TypeScript type definitions
├── prisma/           # Database schema & migrations
├── __tests__/        # Test files
└── docs/             # Documentation
```

## License

MIT License - see [LICENSE](LICENSE) file for details.
