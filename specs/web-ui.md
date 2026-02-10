# Web UI

## Overview

Provide a browser-based interface for playing Pandemic using the existing TypeScript game engine, supporting local hot-seat multiplayer with an SVG world map.

## User Stories

- As a player, I want to set up a new game (choose player count and difficulty) so that I can start playing
- As a player, I want to see the world map with cities, connections, disease cubes, and research stations so that I understand the board state
- As a player, I want to see my hand of cards and available actions so that I can decide what to do on my turn
- As a player, I want to click cities on the map to move or target actions so that interaction feels natural
- As a player, I want clear phase indicators and prompts so that I always know what to do next
- As a player, I want to play event cards at any time so that I can use them strategically
- As a player, I want to see epidemic and outbreak events clearly so that I understand what happened

## Requirements

### Project Setup

- [ ] React 19 + Vite 6 + TypeScript project in `web/` subdirectory
- [ ] Path alias `@engine` resolving to `../src/` for importing the game engine
- [ ] Plain CSS (no CSS-in-JS, no CSS modules) with class naming `ComponentName_element`
- [ ] No router, no external state management library
- [ ] Dark theme color palette (navy map background, GitHub-dark-inspired UI)

### State Management

- [ ] `useReducer` hook wrapping the engine's pure functions
- [ ] `AppState` type: `{ gameState, dialog, selectedAction, lastEpidemics, lastInfections }`
- [ ] Discriminated union `GameAction` type for all user interactions
- [ ] Each reducer case calls the corresponding engine function and handles success/error
- [ ] Multi-step flow support for draw phase (epidemics -> hand limit -> advance) and infect phase

### Setup Screen

- [ ] Player count selector (2, 3, or 4 players)
- [ ] Difficulty selector (Introductory: 4, Standard: 5, Heroic: 6 epidemic cards)
- [ ] "Start Game" button that dispatches `START_GAME` with the selected config
- [ ] App toggles between SetupScreen and GameBoard based on whether `gameState` is null

### SVG World Map

- [ ] 1200x700 viewBox with equirectangular projection
- [ ] All 48 cities as colored circles (color = disease region) with text labels
- [ ] Connection lines between adjacent cities (deduplicated ~96 unique edges)
- [ ] Pacific-crossing connections (SF-Tokyo, SF-Manila, LA-Sydney) rendered as dashed lines to map edges
- [ ] Disease cube indicators near cities (small colored squares, up to 3 per color per city)
- [ ] Research station markers (white cross icon) on cities with stations
- [ ] Player pawns (role-colored circles) with offset when co-located
- [ ] City hover: slight grow + tooltip with cube counts
- [ ] City click during movement selection: executes movement to that city
- [ ] Valid movement destinations: pulsing white border highlight
- [ ] Current player location: glowing ring

### Status Bar

- [ ] Outbreak track (0-8, visual indicator of proximity to loss)
- [ ] Infection rate display (current rate value)
- [ ] Cure indicators for all 4 diseases (uncured/cured/eradicated states)
- [ ] Disease cube supply counters (remaining cubes per color out of 24)

### Player Panel

- [ ] Current player's role name and role color
- [ ] Phase indicator (Actions/Draw/Infect) with actions remaining counter
- [ ] Player's hand of cards rendered as visual cards
- [ ] City cards colored by disease region, event cards visually distinct
- [ ] Tabs or mechanism to view other players' hands (read-only)

### Action Bar (Actions Phase)

- [ ] Action buttons grouped by type: Movement, Treat, Build, Share, Cure, Role-specific
- [ ] Movement flow: select movement type -> map highlights valid destinations -> click city
- [ ] Treat disease buttons per treatable color at current location
- [ ] Build research station button (when valid)
- [ ] Share knowledge triggers dialog when multiple options exist
- [ ] Discover cure triggers confirmation dialog showing cards to discard
- [ ] "End Actions" / "Pass" button to skip remaining actions
- [ ] Auto-advance to Draw phase when `actionsRemaining` reaches 0

### Action Bar (Draw Phase)

- [ ] Single "Draw 2 Cards" button
- [ ] Triggers `drawPlayerCards()` from the engine
- [ ] Shows `EpidemicOverlay` if epidemic cards were drawn
- [ ] Shows `DiscardDialog` if any player's hand exceeds 7 cards
- [ ] Auto-advances to Infect phase after all resolutions

### Action Bar (Infect Phase)

- [ ] Single "Infect Cities" button
- [ ] Triggers `executeInfectionPhase()` from the engine
- [ ] Brief highlight of newly infected cities on the map
- [ ] Auto-advances to next player's Actions phase via `endTurn()`

### Event Cards

- [ ] Floating "Events" button visible whenever any player holds event cards
- [ ] Menu showing all available event cards across all players
- [ ] Playable during any phase, any player's turn, without consuming an action
- [ ] Each event type opens its specific dialog

### Dialogs

- [ ] `DiscardDialog`: select cards to discard down to 7
- [ ] `EpidemicOverlay`: "EPIDEMIC!" header, infected city, new infection rate, "Continue" button
- [ ] `ShareKnowledgeDialog`: show available give/take options with target players
- [ ] `DiscoverCureDialog`: confirm which 5 (or 4 for Scientist) cards to discard
- [ ] `ForecastDialog`: view and reorder top 6 infection cards with up/down buttons
- [ ] `AirliftDialog`: pick player, then pick destination city on map
- [ ] `GovernmentGrantDialog`: pick city on map for research station
- [ ] `ResilientPopulationDialog`: pick card from infection discard pile to remove
- [ ] `GameOverDialog`: won/lost message, game statistics, "Play Again" button

### Action Parser Utility

- [ ] `parseAction(raw: string): ParsedAction` to convert engine action strings to structured objects
- [ ] `groupActionsByType(actions): Map<string, ParsedAction[]>` for UI grouping
- [ ] `getMovementDestinations(actions): Set<string>` for map highlighting
- [ ] Handles all action string formats: drive-ferry, direct-flight, charter-flight, shuttle-flight, build-research-station, treat, share-give, share-take, discover-cure, dispatcher-*, ops-expert-*, contingency-planner-*

## Acceptance Criteria

- [ ] `cd web && npm install && npm run dev` starts a working dev server
- [ ] Can create a game with any valid player count and difficulty
- [ ] Can play through a complete turn cycle (move, treat, draw, infect)
- [ ] Epidemic overlay displays correctly when epidemic cards are drawn
- [ ] Hand limit enforcement works (discard dialog appears when hand > 7)
- [ ] Event cards are playable at any time during gameplay
- [ ] All 7 roles have their special abilities reflected in the UI
- [ ] Win and loss conditions trigger the game over dialog
- [ ] SVG map is responsive and visually clear at common screen sizes
- [ ] All engine action string formats are correctly parsed and dispatched

## Out of Scope

- Online/networked multiplayer (this is local hot-seat only)
- Sound effects or music
- Animations beyond basic CSS transitions and map highlights
- Tutorial or rules explanation within the UI
- Mobile-optimized layout (desktop-first)
- Undo/redo (covered by serialization-persistence spec)
- AI players (covered by ai-bot-players spec)
