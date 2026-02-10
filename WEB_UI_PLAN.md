# Pandemic Web UI - Implementation Plan

## Context

The pandemic-engine is a feature-complete TypeScript game library (48 cities, 7 roles, 5 events, full rules). It has no UI - it's a pure functional engine with immutable state. We're building a React web app with an SVG world map for local hot-seat play.

## Architecture

- **Framework**: React 19 + Vite 6 + TypeScript
- **State**: `useReducer` wrapping the engine's pure functions
- **Map**: SVG with 48 city nodes, connections, disease cubes, pawns
- **Layout**: StatusBar (top) | WorldMap (center) | PlayerPanel + ActionBar (bottom)
- **Engine integration**: Vite path alias `@engine` -> `../src/`

## Directory Structure

```
web/
  index.html
  package.json
  vite.config.ts
  tsconfig.json
  src/
    main.tsx
    App.tsx
    App.css
    hooks/useGame.ts
    components/
      SetupScreen.tsx / .css
      GameBoard.tsx / .css
      map/
        WorldMap.tsx / .css
        CityNode.tsx
        ConnectionLine.tsx
        DiseaseCubes.tsx
        ResearchStation.tsx
        PlayerPawn.tsx
        cityPositions.ts
      panels/
        StatusBar.tsx / .css
        PlayerPanel.tsx / .css
        PlayerHand.tsx
        CardComponent.tsx
        PhaseIndicator.tsx
      actions/
        ActionBar.tsx / .css
        MovementActions.tsx
        TreatActions.tsx
        SpecialActions.tsx
        EventCardActions.tsx
      dialogs/
        DiscardDialog.tsx
        ShareKnowledgeDialog.tsx
        DiscoverCureDialog.tsx
        ForecastDialog.tsx
        AirliftDialog.tsx
        GovernmentGrantDialog.tsx
        ResilientPopulationDialog.tsx
        EpidemicOverlay.tsx
        GameOverDialog.tsx
    utils/
      actionParser.ts
      colorMap.ts
      roleDisplay.ts
```

## Key Engine API

- **`../src/index.ts`** - All public exports
- **`../src/types.ts`** - GameState, Player, CityState, enums
- **`../src/game.ts`** - `createGame()`, `getAvailableActions()`, `drawPlayerCards()`, `advancePhase()`, `endTurn()`, `enforceHandLimit()`
- **`../src/actions.ts`** - `driveFerry()`, `directFlight()`, `charterFlight()`, `shuttleFlight()`, `buildResearchStation()`, `treatDisease()`, `shareKnowledge()`, `discoverCure()`, plus Dispatcher/OpsExpert/ContingencyPlanner actions
- **`../src/infection.ts`** - `executeInfectionPhase()`, `resolveEpidemic()`
- **`../src/events.ts`** - `airlift()`, `forecast()`, `governmentGrant()`, `oneQuietNight()`, `resilientPopulation()`, `playEventCard()`
- **`../src/board.ts`** - `CITIES` array with all 48 cities and connections

### Action String Formats

`getAvailableActions()` returns strings in these formats:

| Action | Format | Example |
|--------|--------|---------|
| Drive/Ferry | `drive-ferry:{city}` | `drive-ferry:Chicago` |
| Direct Flight | `direct-flight:{city}` | `direct-flight:London` |
| Charter Flight | `charter-flight:{city}` | `charter-flight:Tokyo` |
| Shuttle Flight | `shuttle-flight:{city}` | `shuttle-flight:Atlanta` |
| Build Station | `build-research-station` or `build-research-station:{city}` | `build-research-station:Atlanta` |
| Treat Disease | `treat:{color}` | `treat:blue` |
| Share (give) | `share-give:{playerIdx}:{city}` | `share-give:1:Paris` |
| Share (take) | `share-take:{playerIdx}:{city}` | `share-take:0:Paris` |
| Discover Cure | `discover-cure:{color}` | `discover-cure:red` |
| Dispatcher move to pawn | `dispatcher-move-to-pawn:{player}:{target}` | `dispatcher-move-to-pawn:1:0` |
| Dispatcher move other | `dispatcher-move-other:{player}:{type}:{city}[:{source}]` | `dispatcher-move-other:1:drive:Paris` |
| Ops Expert move | `ops-expert-move:{dest}:{cardCity}` | `ops-expert-move:Tokyo:London` |
| Contingency take | `contingency-planner-take:{event}` | `contingency-planner-take:airlift` |

### Return Types

- `ActionResult<T>` = `{ success: true; state: T } | { success: false; error: string }`
- `DrawCardsResult` = `{ state: GameState; epidemics: Array<{ infectedCity, infectedColor, infectionRatePosition }> }`
- `InfectionPhaseResult` = `{ state: GameState; cardsDrawn: Array<{ city, color }> }`
- `EventResult<T>` = same shape as `ActionResult<T>`

## Implementation Milestones

### M1: Project Scaffolding

- Create `web/` with Vite + React + TS
- Configure `@engine` alias in `vite.config.ts` and `tsconfig.json`
- Minimal `App.tsx` that calls `createGame()` and logs state
- Update root `.gitignore`

### M2: Setup Screen + useGame Hook

- `SetupScreen.tsx`: player count (2-4) and difficulty (4/5/6) selectors
- `useGame.ts`: `useReducer` with `START_GAME` action, stores `{ gameState, dialog, selectedAction }`
- `App.tsx` toggles between SetupScreen and GameBoard stub

### M3: Static SVG Map

- `cityPositions.ts`: x,y coords for all 48 cities on a 1200x700 viewBox
- `WorldMap.tsx`: SVG container with dark navy background
- `ConnectionLine.tsx`: lines between connected cities (deduplicated, dashed for Pacific-crossing)
- `CityNode.tsx`: colored circles + labels for each city

### M4: Map Overlays

- `DiseaseCubes.tsx`: small colored squares near cities
- `ResearchStation.tsx`: white cross marker
- `PlayerPawn.tsx`: role-colored circles, offset when co-located
- `colorMap.ts` + `roleDisplay.ts`: color/name mappings

### M5: Status Bar + Player Panel

- `StatusBar.tsx`: outbreak track (0/8), infection rate, 4 cure indicators, cube supply
- `PlayerPanel.tsx`: current player role/name, hand of cards, phase indicator
- `CardComponent.tsx`: visual card (city cards colored by disease, event cards distinct)
- `PhaseIndicator.tsx`: current phase + actions remaining counter

### M6: Action Phase - Movement & Basic Actions

- `actionParser.ts`: parse action strings into structured objects, group by type
- `ActionBar.tsx`: renders grouped action buttons
- **Movement flow**: select movement type -> map highlights valid destinations -> click city to execute
- `TreatActions.tsx`: buttons per treatable color
- `SpecialActions.tsx`: build station, share knowledge, discover cure triggers
- Extend `useGame` reducer with all action types
- Auto-advance to Draw phase after 4 actions or "Pass" button

### M7: Draw & Infect Phases + Core Dialogs

- Draw phase: "Draw 2 Cards" button -> `drawPlayerCards()` -> show epidemics -> hand limit check
- `EpidemicOverlay.tsx`: shows infected city, new infection rate, "Continue" button
- `DiscardDialog.tsx`: select cards to discard to 7
- Infect phase: "Infect Cities" button -> `executeInfectionPhase()` -> highlight infected cities -> `endTurn()`
- `GameOverDialog.tsx`: won/lost message + "Play Again" button
- `ShareKnowledgeDialog.tsx`, `DiscoverCureDialog.tsx`

### M8: Event Cards + Special Role Actions

- `EventCardActions.tsx`: always-available button when any player has events
- `ForecastDialog.tsx`: reorder 6 infection cards with up/down buttons
- `AirliftDialog.tsx`: pick player + destination
- `GovernmentGrantDialog.tsx`: pick city for station
- `ResilientPopulationDialog.tsx`: pick card from infection discard
- Dispatcher, Operations Expert, Contingency Planner special action UIs

## Verification

1. `cd web && npm install && npm run dev` - starts dev server
2. Create a game with 2 players, introductory difficulty
3. Play through a complete turn cycle (move, treat, draw, infect)
4. Trigger an epidemic and verify overlay + hand limit
5. Play an event card mid-turn
6. Play until win or loss condition
