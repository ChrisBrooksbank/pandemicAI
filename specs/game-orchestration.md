# Game Orchestration

## Overview

Provide a high-level game loop coordinator that manages the full lifecycle of a Pandemic game, handling phase transitions, turn sequencing, and multi-step resolution flows on top of the existing engine functions.

## User Stories

- As a UI developer, I want a single orchestrator API so that I don't need to manually chain engine functions for multi-step flows
- As a UI developer, I want phase transitions handled automatically so that invalid sequences are impossible
- As a UI developer, I want clear notifications of what happened each step (cards drawn, outbreaks triggered, epidemics resolved) so that I can animate or display them
- As a bot developer, I want to query the complete set of legal moves and submit one, letting the orchestrator handle the rest
- As a test author, I want to script complete game playthroughs at a high level without managing low-level state transitions

## Requirements

### Game Lifecycle

- [ ] `startGame(config: GameConfig): OrchestratedGame` - create and wrap a new game
- [ ] `OrchestratedGame` wraps `GameState` and exposes high-level methods
- [ ] Game status tracked: `setup | playing | won | lost`
- [ ] Once a game reaches `won` or `lost`, all action methods reject with an error

### Turn Sequencing

- [ ] Enforce strict phase order: Actions -> Draw -> Infect -> next player's Actions
- [ ] Track current player and actions remaining within the orchestrator
- [ ] `getCurrentPhase(): TurnPhase` returns the current phase
- [ ] `getCurrentPlayer(): Player` returns the active player
- [ ] `getActionsRemaining(): number` returns actions left in the current Actions phase

### Actions Phase

- [ ] `getAvailableActions(): string[]` delegates to engine's `getAvailableActions()`
- [ ] `performAction(actionString: string): ActionOutcome` validates and executes any action
- [ ] `ActionOutcome` includes: updated state, action performed, side effects (Medic passive cures, eradications, Quarantine Specialist blocks)
- [ ] `passRemainingActions(): PhaseOutcome` skips remaining actions and advances to Draw phase
- [ ] Auto-advance to Draw phase when `actionsRemaining` reaches 0

### Draw Phase

- [ ] `drawCards(): DrawOutcome` draws 2 player cards and resolves all consequences
- [ ] `DrawOutcome` includes: cards drawn (names and types), epidemics resolved (with details), whether hand limit is exceeded
- [ ] Epidemic resolution bundled into the draw step (increase rate, infect bottom card, intensify)
- [ ] If hand limit exceeded, `DrawOutcome.needsDiscard` lists which player(s) must discard
- [ ] `discardCards(playerIndex: number, cardIndices: number[]): DiscardOutcome` handles hand limit enforcement
- [ ] Auto-advance to Infect phase after all discards resolved

### Infect Phase

- [ ] `infectCities(): InfectOutcome` executes the infection phase
- [ ] `InfectOutcome` includes: cities infected (name + color), outbreaks triggered (city + cascade chain), cubes placed
- [ ] Handles One Quiet Night (skip infection, clear flag)
- [ ] Auto-advance to next player's Actions phase after infection resolves
- [ ] Check for loss conditions (8 outbreaks, cube exhaustion) after infection

### Event Card Integration

- [ ] `playEvent(playerIndex: number, eventType: EventType, params: EventParams): EventOutcome` playable during any phase
- [ ] Events do not consume actions and do not advance the phase
- [ ] `getPlayableEvents(): Array<{ playerIndex, eventType }>` lists all events any player can currently play
- [ ] Contingency Planner's stored event included in playable events
- [ ] Forecast event returns the cards for reordering; `submitForecastOrder(cards)` completes it

### Outcome Types

- [ ] All outcomes include `gameStatus: GameStatus` to detect win/loss after every step
- [ ] All outcomes include `stateSnapshot: GameState` for the UI to render
- [ ] Outcomes use discriminated unions for type safety (not error strings)
- [ ] Side effects (passive abilities, eradications) are explicitly listed in outcomes

### Game Event Log

- [ ] Maintain an ordered log of game events: `GameEvent[]`
- [ ] Event types: `action-performed`, `cards-drawn`, `epidemic`, `infection`, `outbreak`, `cure-discovered`, `disease-eradicated`, `event-card-played`, `game-won`, `game-lost`
- [ ] Each event includes: timestamp (turn number + phase), player who caused it, details
- [ ] `getEventLog(): GameEvent[]` returns the full log
- [ ] `getEventsSince(turnNumber: number): GameEvent[]` for incremental UI updates

### Validation & Error Handling

- [ ] All methods validate the current phase before executing (e.g., can't draw during Actions phase)
- [ ] Clear error types: `InvalidPhaseError`, `InvalidActionError`, `GameOverError`
- [ ] Engine errors (from ActionResult failures) are wrapped in orchestrator error types
- [ ] No silent failures - every invalid call produces an explicit error

## Acceptance Criteria

- [ ] Can play a complete game from start to finish using only orchestrator methods
- [ ] Phase transitions happen automatically at the right times
- [ ] Event cards can be played during any phase without disrupting the flow
- [ ] Epidemic resolution is fully handled within `drawCards()` (no manual steps)
- [ ] Game event log accurately records every significant game event
- [ ] Invalid phase calls (e.g., `drawCards()` during Actions) produce clear errors
- [ ] Win/loss detection is checked after every state-changing operation
- [ ] All 7 role abilities work correctly through the orchestrator
- [ ] All 5 event cards work correctly through the orchestrator

## Out of Scope

- Networking or remote player management (this is single-process orchestration)
- UI rendering or display logic
- AI decision-making (the orchestrator accepts moves, it doesn't choose them)
- Undo/redo (covered by serialization-persistence spec)
- Timer or real-time constraints
