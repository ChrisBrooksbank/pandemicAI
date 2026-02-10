# Pandemic Web UI - Detailed Design

## 1. Project Setup

### Vite Configuration

```ts
// web/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@engine": path.resolve(__dirname, "../src"),
    },
  },
});
```

### TypeScript Configuration

```json
// web/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@engine/*": ["../src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

### Package Dependencies

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.4.0",
    "typescript": "^5.9.3",
    "vite": "^6.0.0"
  }
}
```

No CSS-in-JS, no state management library, no router. Zero unnecessary dependencies.

---

## 2. Component Architecture

### Application Flow

```
App
 |
 +-- [gameState === null] --> SetupScreen
 |
 +-- [gameState !== null] --> GameBoard
      |
      +-- WorldMap (SVG)
      |    +-- ConnectionLine (x ~96 unique edges)
      |    +-- CityNode (x 48)
      |    +-- DiseaseCubes (x 48, conditional)
      |    +-- ResearchStation (x up to 6)
      |    +-- PlayerPawn (x 2-4)
      |
      +-- StatusBar
      |    +-- OutbreakTrack
      |    +-- InfectionRateTrack
      |    +-- CureIndicators (x 4)
      |    +-- CubeSupplyCounters (x 4)
      |
      +-- PlayerPanel (for current player)
      |    +-- PhaseIndicator
      |    +-- PlayerHand
      |         +-- CardComponent (x N)
      |
      +-- ActionBar (conditional on phase)
      |    +-- MovementActions / TreatActions / SpecialActions / EventCardActions
      |
      +-- [Dialogs, conditional]
           +-- DiscardDialog / ShareKnowledgeDialog / DiscoverCureDialog / ...
           +-- EpidemicOverlay
           +-- GameOverDialog
```

### Layout (CSS Grid)

```
+-------------------------------------------------------------------+
|  StatusBar (outbreak track, infection rate, cures, cube supply)   |
+-------------------------------------------------------------------+
|                                                                   |
|                        WorldMap (SVG)                             |
|                   (takes ~60-65% height)                          |
|                                                                   |
+-------------------------------------------------------------------+
|  PlayerPanel                          |  ActionBar                |
|  (current player role, hand)          |  (available actions)      |
|  + tabs to view other players         |                           |
+-------------------------------------------------------------------+
```

```css
.GameBoard {
  display: grid;
  grid-template-rows: 60px 1fr 220px;
  height: 100vh;
}

.GameBoard_bottom {
  display: grid;
  grid-template-columns: 55% 45%;
}
```

---

## 3. State Management

### useGame Hook (useReducer)

```ts
interface AppState {
  gameState: GameState | null;
  dialog: DialogState | null;
  selectedAction: string | null;
  lastEpidemics: Array<{ infectedCity: string; infectedColor: Disease; infectionRatePosition: number }>;
  lastInfections: Array<{ city: string; color: DiseaseColor }>;
}

type DialogState =
  | { type: "epidemic" }
  | { type: "discard"; playerIndex: number }
  | { type: "forecast"; cards: InfectionCard[] }
  | { type: "airlift" }
  | { type: "government-grant" }
  | { type: "resilient-population" }
  | { type: "share-knowledge"; options: ParsedAction[] }
  | { type: "discover-cure"; color: DiseaseColor }
  | { type: "game-over"; won: boolean }
  | null;

type GameAction =
  | { type: "START_GAME"; config: GameConfig }
  | { type: "DRIVE_FERRY"; city: string }
  | { type: "DIRECT_FLIGHT"; city: string }
  | { type: "CHARTER_FLIGHT"; city: string }
  | { type: "SHUTTLE_FLIGHT"; city: string }
  | { type: "BUILD_STATION"; removeFrom?: string }
  | { type: "TREAT"; color: DiseaseColor }
  | { type: "SHARE_KNOWLEDGE"; targetPlayer: number; give: boolean; card?: string }
  | { type: "DISCOVER_CURE"; color: DiseaseColor }
  | { type: "DRAW_CARDS" }
  | { type: "INFECT" }
  | { type: "DISCARD_CARDS"; playerIndex: number; cardIndices: number[] }
  | { type: "PLAY_EVENT"; eventType: EventType; params: Record<string, unknown> }
  | { type: "DISPATCHER_MOVE_TO_PAWN"; playerToMove: number; targetPlayer: number }
  | { type: "DISPATCHER_MOVE_OTHER"; playerToMove: number; moveType: string; city: string; cardSource?: string }
  | { type: "OPS_EXPERT_MOVE"; destination: string; cardCity: string }
  | { type: "CONTINGENCY_TAKE"; eventType: EventType }
  | { type: "SELECT_ACTION"; action: string | null }
  | { type: "CLOSE_DIALOG" }
  | { type: "RESET" };
```

### Reducer Pattern

Each case calls the corresponding engine function and handles the result:

```ts
case "DRIVE_FERRY": {
  const result = driveFerry(state.gameState, action.city);
  if (!result.success) return state; // validation handled by engine
  return { ...state, gameState: result.state, selectedAction: null };
}

case "DRAW_CARDS": {
  const result = drawPlayerCards(state.gameState);
  const needsDiscard = result.state.players.findIndex(p => p.hand.length > 7);
  return {
    ...state,
    gameState: result.state,
    lastEpidemics: result.epidemics,
    dialog: result.epidemics.length > 0
      ? { type: "epidemic" }
      : needsDiscard >= 0
      ? { type: "discard", playerIndex: needsDiscard }
      : null,
  };
}
```

### Multi-Step Flows

**Draw phase flow:**
1. User clicks "Draw 2 Cards" -> dispatches `DRAW_CARDS`
2. If epidemics: show `EpidemicOverlay` -> user clicks Continue -> `CLOSE_DIALOG`
3. If hand > 7: show `DiscardDialog` -> user selects cards -> dispatches `DISCARD_CARDS`
4. Auto-advance: `advancePhase()` to move to Infect

**Infect phase flow:**
1. User clicks "Infect Cities" -> dispatches `INFECT`
2. Brief highlight of infected cities
3. Auto-advance: `endTurn()` to move to next player's Actions

---

## 4. SVG Map Design

### Coordinate System

SVG viewBox: `0 0 1200 700`. Approximate equirectangular projection with manual adjustments.

### City Positions

```ts
export const CITY_POSITIONS: Record<string, { x: number; y: number }> = {
  // Blue (North America & Europe)
  "San Francisco": { x: 100, y: 240 },
  "Chicago":       { x: 175, y: 200 },
  "Montreal":      { x: 260, y: 195 },
  "New York":      { x: 290, y: 230 },
  "Washington":    { x: 265, y: 260 },
  "Atlanta":       { x: 210, y: 260 },
  "London":        { x: 505, y: 170 },
  "Madrid":        { x: 480, y: 235 },
  "Paris":         { x: 540, y: 200 },
  "Essen":         { x: 560, y: 160 },
  "Milan":         { x: 570, y: 200 },
  "St. Petersburg":{ x: 630, y: 140 },

  // Yellow (Latin America & Africa)
  "Los Angeles":   { x: 115, y: 290 },
  "Mexico City":   { x: 165, y: 320 },
  "Miami":         { x: 225, y: 310 },
  "Bogota":        { x: 225, y: 380 },
  "Lima":          { x: 195, y: 430 },
  "Santiago":      { x: 210, y: 510 },
  "Buenos Aires":  { x: 290, y: 500 },
  "Sao Paulo":     { x: 330, y: 450 },
  "Lagos":         { x: 520, y: 350 },
  "Kinshasa":      { x: 555, y: 400 },
  "Khartoum":      { x: 610, y: 340 },
  "Johannesburg":  { x: 590, y: 470 },

  // Black (Middle East & South Asia)
  "Algiers":       { x: 530, y: 260 },
  "Cairo":         { x: 600, y: 280 },
  "Istanbul":      { x: 610, y: 215 },
  "Moscow":        { x: 660, y: 165 },
  "Baghdad":       { x: 660, y: 270 },
  "Riyadh":        { x: 660, y: 310 },
  "Tehran":        { x: 710, y: 240 },
  "Karachi":       { x: 730, y: 290 },
  "Mumbai":        { x: 740, y: 330 },
  "Delhi":         { x: 770, y: 265 },
  "Chennai":       { x: 775, y: 350 },
  "Kolkata":       { x: 800, y: 295 },

  // Red (East Asia & Oceania)
  "Bangkok":       { x: 830, y: 340 },
  "Jakarta":       { x: 855, y: 420 },
  "Ho Chi Minh City": { x: 860, y: 360 },
  "Hong Kong":     { x: 880, y: 305 },
  "Shanghai":      { x: 895, y: 245 },
  "Taipei":        { x: 920, y: 290 },
  "Manila":        { x: 935, y: 350 },
  "Beijing":       { x: 880, y: 200 },
  "Seoul":         { x: 930, y: 210 },
  "Tokyo":         { x: 975, y: 220 },
  "Osaka":         { x: 960, y: 260 },
  "Sydney":        { x: 985, y: 490 },
};
```

### Pacific-Crossing Connections

Three connections cross the Pacific: San Francisco-Tokyo, San Francisco-Manila, Los Angeles-Sydney. These are rendered as two line segments:
- One from the city to the map edge (right side for Asian cities, left side for American cities)
- Dashed stroke to distinguish from normal connections

### Visual Elements per City

```
         [station icon]     <- if hasResearchStation
     [pawn] [pawn]          <- player pawns (offset if multiple)
        ( City )            <- colored circle, r=8
    [cube][cube][cube]      <- disease cubes below
      City Name             <- text label
```

### Interactive Behavior

- **Hover**: city circle grows slightly, shows tooltip with cube counts
- **Click during movement selection**: executes movement action to that city
- **Highlighted cities**: pulsing white border on valid movement destinations
- **Current player location**: glowing ring around the city

---

## 5. Styling

### Color Palette

```css
:root {
  /* Backgrounds */
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-surface: #21262d;
  --bg-map: #1a1a3e;

  /* Disease colors */
  --disease-blue: #4a9eff;
  --disease-yellow: #ffd93d;
  --disease-black: #6b6b6b;
  --disease-red: #ff4444;

  /* Role colors */
  --role-contingency-planner: #00bcd4;
  --role-dispatcher: #e91e90;
  --role-medic: #ff9800;
  --role-operations-expert: #8bc34a;
  --role-quarantine-specialist: #2e7d32;
  --role-researcher: #8d6e63;
  --role-scientist: #eceff1;

  /* Text */
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;

  /* UI */
  --border-default: #30363d;
  --button-primary: #238636;
  --button-danger: #da3633;
}
```

### CSS Approach

Plain CSS files co-located with components. Class naming: `ComponentName_element` (e.g., `StatusBar_outbreakTrack`, `CityNode_label`). No CSS modules, no CSS-in-JS.

---

## 6. Phase-Driven UI Behavior

### Actions Phase

- ActionBar shows action buttons grouped into: Movement, Treat, Build, Share, Cure, Role-specific
- Clicking a movement category (e.g., "Drive/Ferry") enters selection mode: valid destinations highlighted on map
- Clicking a highlighted city executes the move
- Actions remaining counter decrements with each action
- "End Actions" / "Pass" button available to skip remaining actions

### Draw Phase

- ActionBar shows single "Draw 2 Cards" button
- Clicking triggers `drawPlayerCards(state)`
- Epidemic overlay shown if epidemic cards drawn (informational, with Continue button)
- Hand limit dialog shown if any player exceeds 7 cards
- Auto-advances to Infect phase after resolution

### Infect Phase

- ActionBar shows "Infect Cities" button
- Clicking triggers `executeInfectionPhase(state)`
- Infected cities briefly highlighted on map
- Auto-advances to next player's Actions phase via `endTurn(state)`

### Event Cards (Any Time)

- Floating "Events" button visible whenever any player holds event cards
- Opens a menu showing all available event cards across all players
- Playing an event opens the appropriate dialog (Airlift, Forecast, etc.)
- Does NOT consume an action
- Can be played during any phase, any player's turn

---

## 7. Dialog Specifications

### DiscardDialog
- **Trigger**: player hand > 7 cards after drawing
- **Content**: shows all cards in hand, player selects which to discard
- **Resolution**: calls `enforceHandLimit(state, playerIndex, selectedCards)`

### EpidemicOverlay
- **Trigger**: epidemic card drawn during `drawPlayerCards()`
- **Content**: "EPIDEMIC!" header, infected city name + color, new infection rate
- **Resolution**: "Continue" button closes overlay

### ShareKnowledgeDialog
- **Trigger**: player clicks share-knowledge action
- **Content**: shows available give/take options with target players and cards
- **Resolution**: calls `shareKnowledge(state, ...)`

### DiscoverCureDialog
- **Trigger**: player clicks discover-cure action
- **Content**: shows which cards will be discarded, disease color being cured
- **Resolution**: calls `discoverCure(state, color)`

### ForecastDialog
- **Trigger**: Forecast event played
- **Content**: shows top 6 infection cards, up/down buttons to reorder
- **Resolution**: calls `forecast(state, reorderedCards)`

### AirliftDialog
- **Trigger**: Airlift event played
- **Content**: pick a player, then pick destination city on map
- **Resolution**: calls `airlift(state, playerIndex, city)`

### GovernmentGrantDialog
- **Trigger**: Government Grant event played
- **Content**: click a city on map to place research station
- **Resolution**: calls `governmentGrant(state, city)`

### ResilientPopulationDialog
- **Trigger**: Resilient Population event played
- **Content**: shows infection discard pile, pick a card to remove
- **Resolution**: calls `resilientPopulation(state, card)`

### GameOverDialog
- **Trigger**: `state.status` is `Won` or `Lost`
- **Content**: victory/defeat message, game statistics
- **Resolution**: "Play Again" button resets to SetupScreen

---

## 8. Action Parser Utility

Parses `getAvailableActions()` strings into structured objects:

```ts
export type ParsedAction =
  | { type: "drive-ferry"; city: string }
  | { type: "direct-flight"; city: string }
  | { type: "charter-flight"; city: string }
  | { type: "shuttle-flight"; city: string }
  | { type: "build-research-station"; removeFrom?: string }
  | { type: "treat"; color: DiseaseColor }
  | { type: "share-give"; targetPlayer: number; city: string }
  | { type: "share-take"; targetPlayer: number; city: string }
  | { type: "discover-cure"; color: DiseaseColor }
  | { type: "dispatcher-move-to-pawn"; player: number; target: number }
  | { type: "dispatcher-move-other"; player: number; moveType: string; city: string; cardSource?: string }
  | { type: "ops-expert-move"; destination: string; cardToDiscard: string }
  | { type: "contingency-planner-take"; eventType: string };

export function parseAction(raw: string): ParsedAction { /* split on : and map */ }
export function groupActionsByType(actions: ParsedAction[]): Map<string, ParsedAction[]> { /* group */ }
export function getMovementDestinations(actions: ParsedAction[]): Set<string> { /* extract cities */ }
```

---

## 9. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | React + Vite | Standard, fast dev server, native TS support |
| State management | `useReducer` | Maps naturally to engine's pure functions, no external deps |
| Map rendering | SVG | DOM events, CSS animations, scales cleanly, easy debugging |
| Engine integration | Path alias import | No build step needed, Vite transpiles TS directly |
| Styling | Plain CSS | Zero dependencies, sufficient for this scope |
| Multiplayer | Local hot-seat | Simplest approach, all state in one browser |
| No CSS-in-JS | - | Over-engineering for this scope |
| No router | - | Single-page app with only 2 views (setup / game) |
