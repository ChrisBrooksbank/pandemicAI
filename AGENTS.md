# AGENTS.md - Operational Guide

Keep this file under 60 lines. It's loaded every iteration.

## Project

Pandemic board game engine in TypeScript. Implements the complete 2013 Revised Edition rules.

## Build Commands

```bash
npm run build          # Production build (tsc)
npm run dev            # Watch mode (tsc --watch)
```

## Test Commands

```bash
npm test               # Run tests (Vitest watch mode)
npm run test:run       # Run tests once
npm run test:coverage  # Coverage report
```

## Lint & Format

```bash
npm run lint           # ESLint check
npm run lint:fix       # ESLint auto-fix
npm run format         # Prettier check
npm run format:fix     # Prettier auto-fix
npm run typecheck      # TypeScript type checking
```

## Validation (run before committing)

```bash
npm run check          # Run ALL checks (typecheck, lint, format, tests)
```

## Project Structure

```
src/
  index.ts             # Public API exports
  types.ts             # Core type definitions
  board.ts             # City connections and board data
  game.ts              # Game state and setup
  actions.ts           # Player action implementations
  infection.ts         # Infection, epidemics, outbreaks
  roles.ts             # Role ability implementations
  events.ts            # Event card implementations
  *.test.ts            # Co-located test files
```

## Reference Docs

- pandemic-overview.md — Setup, components, difficulty levels
- pandemic-rules.md — Turn structure, actions, win/loss conditions
- pandemic-roles.md — All 7 role special abilities
- pandemic-cards.md — City cards, event cards, epidemic cards, infection cards
- pandemic-board.md — City connections and board layout

## Notes

- All 48 cities with connections defined in pandemic-board.md
- 4 disease colors: blue, yellow, black, red (12 cities each)
- 7 roles, 5 event cards, 4-6 epidemic cards per game
- Game is cooperative — all players win or lose together
