# Pandemic Web UI

Browser-based interface for the Pandemic board game engine. Built with React 19, Vite 7, and TypeScript.

## Setup

```bash
npm install
npm run dev
```

The dev server will start at http://localhost:5173

## Build

```bash
npm run build
```

## Project Structure

- `src/` - React components and app code
- `@engine` - Path alias to `../src/` (the game engine)

## Path Alias

This project uses `@engine` to import from the game engine:

```typescript
import { createGame } from '@engine/index.ts'
```

The alias is configured in:
- `vite.config.ts` - Vite bundler resolution
- `tsconfig.app.json` - TypeScript type checking

## Tech Stack

- React 19.2.0
- Vite 7.3.1
- TypeScript 5.9.3
- ESLint 9
