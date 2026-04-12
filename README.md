# PandemicAI

A TypeScript engine and reference documentation for the Pandemic board game, with an AI that can reason about game state, optimal moves, and strategy.

## Contents

- **Game engine** — TypeScript implementation of Pandemic game rules
- **Reference docs** — Comprehensive markdown documentation of rules, cards, roles, and board
- **Web UI** — Browser interface for interacting with the engine

## Reference Documentation

- [Game Overview](pandemic-overview.md) — Core rules and objectives
- [Board](pandemic-board.md) — City network and regions
- [Cards](pandemic-cards.md) — Player and epidemic cards
- [Roles](pandemic-roles.md) — Character abilities

## Tech Stack

- TypeScript
- Vitest (testing)
- ESLint + Prettier

## Development

```bash
npm install
npm run build      # Compile TypeScript
npm run test       # Run Vitest tests
npm run dev        # Development mode
npm run check      # Lint, typecheck, test, format
```
