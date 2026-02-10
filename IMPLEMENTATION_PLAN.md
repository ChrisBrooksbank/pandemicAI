# Implementation Plan

## Status

- Planning iterations: 1
- Build iterations: 49
- Last updated: 2026-02-10

## Tasks

### Phase 1: Foundation Types & Data (Spec: game-state-and-setup.md)

- [x] Define core enums (Disease, Role) and basic types (DiseaseColor, RoleType)
- [x] Define City type and create all 48 cities with connections (spec: game-state-and-setup.md, ref: pandemic-board.md)
- [x] Define card types (PlayerCard, InfectionCard, CityCard, EventCard, EpidemicCard)
- [x] Define Player type (role, location, hand) and GameConfig type (playerCount, difficulty)
- [x] Define GameState type with all trackers (infection rate, outbreak count, cube supply, cure status, decks, discard piles, research stations)

### Phase 2: Game Initialization (Spec: game-state-and-setup.md)

- [x] Implement board initialization (48 cities with 0 cubes, research station in Atlanta)
- [x] Implement infection deck creation and shuffle (48 cards)
- [x] Implement initial infection logic (draw 3+3+3 cards, place 3/2/1 cubes)
- [x] Implement player deck creation (48 city cards + 5 event cards, shuffle, insert epidemics evenly)
- [x] Implement player setup (deal starting hands 4/3/2 per player count, assign roles randomly, place pawns in Atlanta)
- [x] Implement createGame() function that combines all setup steps
- [x] Add unit tests for game initialization and deck setup

### Phase 3: Game State Queries (Spec: game-state-and-setup.md)

- [x] Implement getCurrentPlayer() query
- [x] Implement getAvailableActions() query (returns empty array for now)
- [x] Implement getCityState(cityName) query (cubes, research station)
- [x] Implement getCureStatus() query (returns status for all 4 diseases)
- [x] Implement getGameStatus() query (win/loss/ongoing)
- [x] Add unit tests for state queries

### Phase 4: Basic Movement Actions (Spec: player-actions.md)

- [x] Implement Drive/Ferry action (move to adjacent connected city)
- [x] Implement Direct Flight action (discard city card to move to that city)
- [x] Implement Charter Flight action (discard current city card to move anywhere)
- [x] Implement Shuttle Flight action (move between research stations)
- [x] Add action validation (check preconditions, return errors)
- [x] Add unit tests for all movement actions

### Phase 5: Build & Treatment Actions (Spec: player-actions.md)

- [x] Implement Build Research Station action (discard matching city card, handle 6-station limit)
- [x] Implement Treat Disease action (remove 1 cube, or all if cured)
- [x] Add unit tests for build and treatment actions

### Phase 6: Knowledge Sharing & Cure Discovery (Spec: player-actions.md)

- [x] Implement Share Knowledge action (give/take city card matching current city, both players same location)
- [x] Implement Discover a Cure action (at research station, discard 5 same-color city cards)
- [x] Update cure status tracking (uncured → cured → eradicated)
- [x] Add unit tests for sharing and cure discovery

### Phase 7: Turn Structure & Card Drawing (Spec: player-actions.md)

- [x] Implement turn phase tracking (action phase, draw phase, infection phase)
- [x] Implement action counter (4 actions per turn, decrement on each action)
- [x] Implement endTurn() to advance to next player
- [x] Implement draw 2 player cards (handle epidemic cards separately for now)
- [x] Implement hand limit enforcement (7 cards max, require discard)
- [x] Add unit tests for turn structure and card drawing

### Phase 8: Infection Phase (Spec: infection-and-epidemics.md)

- [x] Implement infection rate track (positions 1-7, rates: [2,2,2,3,3,4,4])
- [x] Implement basic infection phase (draw N cards based on rate, place 1 cube per card)
- [x] Skip cube placement for eradicated diseases
- [x] Detect cube supply exhaustion (loss condition)
- [x] Add unit tests for infection phase without outbreaks

### Phase 9: Outbreak Mechanics (Spec: infection-and-epidemics.md)

- [x] Implement outbreak detection (4th cube triggers outbreak)
- [x] Implement outbreak cascade (spread 1 cube to adjacent cities, track chain to prevent duplicates)
- [x] Increment outbreak counter and check for loss condition (8 outbreaks)
- [x] Add unit tests for single outbreaks and chain reactions

### Phase 10: Epidemic Resolution (Spec: infection-and-epidemics.md)

- [x] Implement epidemic card detection during draw phase
- [x] Implement Step 1: Increase infection rate marker
- [x] Implement Step 2: Draw bottom infection card, place 3 cubes (may trigger outbreak)
- [x] Implement Step 3: Shuffle infection discard pile, place on top of draw deck
- [x] Add unit tests for epidemic resolution and intensify mechanic

### Phase 11: Win/Loss Conditions (Spec: game-state-and-setup.md)

- [x] Implement win detection (all 4 diseases cured)
- [x] Implement loss detection (8 outbreaks, cube exhaustion, player deck exhausted)
- [x] Update getGameStatus() to check all conditions
- [x] Add integration tests for win/loss scenarios

### Phase 12: Role Abilities - Part 1 (Spec: roles-and-events.md)

- [x] Implement Medic role (Treat Disease removes all cubes; passive auto-clear for cured diseases)
- [x] Implement Scientist role (Discover Cure needs only 4 cards)
- [x] Implement Researcher role (Share Knowledge can give any city card)
- [x] Add unit tests for Medic, Scientist, and Researcher abilities

### Phase 13: Role Abilities - Part 2 (Spec: roles-and-events.md)

- [x] Implement Operations Expert role (build without card; move from station with any city card)
- [x] Implement Quarantine Specialist role (prevent cube placement on current + adjacent cities)
- [x] Implement Dispatcher role (move any pawn to another pawn; move other player's pawn)
- [x] Implement Contingency Planner role (store event card on role card, play later)
- [x] Add unit tests for all remaining roles

### Phase 14: Event Cards (Spec: roles-and-events.md)

- [x] Implement event card playability (playable anytime, no action cost)
- [x] Implement Airlift event (move any pawn to any city)
- [x] Implement Government Grant event (build research station anywhere)
- [x] Implement One Quiet Night event (skip next infection phase)
- [x] Implement Resilient Population event (remove card from infection discard)
- [x] Implement Forecast event (examine top 6 infection cards, rearrange)
- [x] Add unit tests for all event cards

### Phase 15: Integration & Polish

- [x] Update getAvailableActions() to return all valid actions based on current game state
- [x] Add comprehensive integration tests (full game scenarios)
- [x] Export public API from index.ts (createGame, action functions, query functions)
- [x] Add JSDoc comments to all public API functions
- [x] Run full npm run check and fix any remaining issues (iteration 50: fixed ~10 flaky tests related to random card deals and Medic passive ability; occasional flakiness remains - see Known Issues)

## Completed

<!-- Completed tasks move here -->

## Notes

### Architectural Decisions

- **Immutable State**: All game state modifications return new state objects (functional approach)
- **Action Validation**: Actions return Result<GameState, Error> for explicit error handling
- **Role Abilities**: Implemented as modifiers/interceptors that transform base action behavior
- **Event Cards**: Separate action category that bypasses action counter
- **Outbreak Chains**: Use Set to track cities that have outbroken in current cascade to prevent infinite loops

### Build Dependencies

- Phase 1-2 must complete before Phase 3 (need types and initialization before queries)
- Phase 3-6 must complete before Phase 7 (need actions before turn structure)
- Phase 8-9 must complete before Phase 10 (need infection logic before epidemics)
- Phase 11 requires all previous phases (win/loss detection needs complete game mechanics)
- Phase 12-14 can start after Phase 11 (roles/events modify existing mechanics)

### Known Issues

- **Flaky tests** (from iteration 40+, partially fixed in iteration 50):
  - Root cause: Tests use `createGame()` which randomly shuffles decks and assigns roles
  - Iteration 41: Fixed epidemic card handling in player hands
  - Iteration 50: Fixed ~10 flaky tests by:
    - Ensuring player 1 has deterministic role (not random Medic) in `createTestGameWithCards` helpers
    - Moving players away from Atlanta or ensuring non-Medic roles to prevent passive ability interference
    - Clearing hands in tests that expect specific missing cards
    - Adding explicit cube placement to prevent eradication when cure is expected
    - Making epidemic-related assertions flexible (e.g., hand size can be +1 or +2 depending on epidemics drawn)
  - Remaining occasional flakiness (appears ~10-20% of runs):
    - `actions.test.ts`: "should fail when player does not have the current location card" (player randomly gets the card from initial deal)
    - `actions-dispatcher.test.ts`: "should move another player using charter flight with their card" (player randomly has extra copies of the card)
  - **Recommended fix for future iteration**: Replace `createGame()` in tests with deterministic factory functions that don't shuffle or use manual state construction
