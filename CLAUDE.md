# CLAUDE.md

## Project Overview

PandemicAI — a TypeScript implementation of the Pandemic board game engine with reference documentation and a web UI. The engine models game state, rules enforcement, and can support AI decision-making.

## Tech Stack

- TypeScript
- Vitest (unit tests)
- ESLint + Prettier

## Development Commands

```bash
npm run build        # Compile TypeScript
npm run dev          # Development mode with watch
npm run test         # Vitest watch mode
npm run test:run     # Run tests once
npm run check        # Lint + typecheck + test + format
```

## Architecture

- `src/` — Core game engine (state, rules, actions)
- `web/` — Browser UI for the engine
- `specs/` — Game specifications and test cases
- `pandemic-*.md` — Reference documentation (rules, cards, board, roles)

## Documentation Files

The `.md` files at root are reference documentation, not code — they document the real Pandemic board game for use by the engine and AI.
