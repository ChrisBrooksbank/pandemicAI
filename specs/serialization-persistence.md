# Serialization & Persistence

## Overview

Provide save/load, undo/redo, and replay capabilities for Pandemic game state, enabling players to pause and resume games, step backward through mistakes, and replay completed games move-by-move.

## User Stories

- As a player, I want to save my game and continue later so that I don't have to finish in one session
- As a player, I want to undo my last action so that I can correct mistakes
- As a player, I want to replay a completed game move-by-move so that I can review what happened
- As a developer, I want to serialize game state to JSON so that I can store it anywhere (localStorage, file, database)
- As a test author, I want to load a specific game state from a fixture so that I can test from any point in a game

## Requirements

### Serialization

- [ ] `serializeGame(state: GameState): string` converts game state to a JSON string
- [ ] `deserializeGame(json: string): GameState` reconstructs game state from JSON
- [ ] Round-trip fidelity: `deserializeGame(serializeGame(state))` produces identical state
- [ ] Schema version field in serialized output for forward compatibility
- [ ] Validation on deserialization: reject malformed or incompatible data with clear errors
- [ ] Compact format: avoid redundant data (e.g., don't serialize static city connection data)

### Save/Load

- [ ] `SaveSlot` type: `{ id: string; name: string; timestamp: number; turnNumber: number; playerCount: number; difficulty: number; preview: SavePreview }`
- [ ] `SavePreview`: summary info shown in load screen (diseases cured, outbreak count, current player role)
- [ ] `saveGame(state: GameState, name: string): SaveSlot` saves to a storage backend
- [ ] `loadGame(slotId: string): GameState` restores from a storage backend
- [ ] `listSaves(): SaveSlot[]` lists all saved games with preview info
- [ ] `deleteSave(slotId: string): void` removes a saved game
- [ ] Auto-save after every turn (configurable: on/off)

### Storage Backends

- [ ] `StorageBackend` interface: `{ save(key, data), load(key), list(), delete(key) }`
- [ ] `LocalStorageBackend`: uses `window.localStorage` (web UI default)
- [ ] `FileSystemBackend`: uses Node.js `fs` for CLI/testing scenarios
- [ ] `InMemoryBackend`: for testing (no persistence)
- [ ] Storage backend is injectable (dependency injection, not hardcoded)

### Undo/Redo

- [ ] `GameHistory` type: ordered list of `(state, action)` pairs
- [ ] `pushState(history: GameHistory, state: GameState, action: string): GameHistory` records a new state
- [ ] `undo(history: GameHistory): { history: GameHistory; state: GameState }` reverts to previous state
- [ ] `redo(history: GameHistory): { history: GameHistory; state: GameState }` re-applies undone state
- [ ] Maximum history depth (configurable, default 50 states) to bound memory usage
- [ ] Undo is disabled during draw and infect phases (only allowed during Actions phase)
- [ ] Performing a new action after undo clears the redo stack

### Replay

- [ ] `GameReplay` type: initial state + ordered list of actions taken
- [ ] `createReplay(initialState: GameState, actions: Array<{ action: string; result: GameState }>): GameReplay`
- [ ] `replayStep(replay: GameReplay, stepIndex: number): GameState` returns the state at any step
- [ ] `replayForward(replay: GameReplay, currentStep: number): { state: GameState; step: number }` advances one step
- [ ] `replayBackward(replay: GameReplay, currentStep: number): { state: GameState; step: number }` goes back one step
- [ ] Replay includes metadata: player names/roles, difficulty, final outcome, total turns
- [ ] Export replay as JSON file for sharing
- [ ] Import replay from JSON file

### Replay Recording

- [ ] Automatic recording during live games (opt-in, configurable)
- [ ] Records every state-changing action (player actions, card draws, infections, events)
- [ ] Minimal storage: only record action descriptors, not full state snapshots (derive states by replaying actions)
- [ ] `finishReplay(recording: ReplayRecording): GameReplay` finalizes a recording into a shareable replay

## Acceptance Criteria

- [ ] Serialize and deserialize a game state with perfect round-trip fidelity
- [ ] Save a game to localStorage, close the browser, reopen, and load it successfully
- [ ] Undo 3 consecutive actions and verify the state matches what it was 3 actions ago
- [ ] Redo after undo restores the correct state
- [ ] Replay a completed game from start to finish, step by step
- [ ] Export a replay as JSON and re-import it on a different browser/machine
- [ ] Auto-save triggers after each turn and appears in the save list
- [ ] Deserialization rejects corrupted JSON with a meaningful error message
- [ ] History depth limit prevents unbounded memory growth
- [ ] Storage backend is swappable (can switch between localStorage, filesystem, in-memory)

## Out of Scope

- Cloud storage or server-side persistence (this is local/client-side only)
- Multiplayer save synchronization
- Replay sharing via URL or social media
- Branching history (only linear undo/redo)
- Compression of serialized data (JSON is sufficient for this scope)
- Database backends (SQLite, PostgreSQL, etc.)
