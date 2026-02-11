// Serialization and persistence functionality for Pandemic game state

import { Role, TurnPhase, type GameState } from "./types";

// Type declarations for browser APIs
declare global {
  interface Window {
    localStorage: Storage;
  }
  interface Storage {
    readonly length: number;
    clear(): void;
    getItem(key: string): string | null;
    key(index: number): string | null;
    removeItem(key: string): void;
    setItem(key: string, value: string): void;
  }
  const window: Window | undefined;
}

/**
 * Current schema version for serialized game state
 * Increment this when making breaking changes to the serialization format
 */
const SCHEMA_VERSION = 1;

/**
 * Serialized game state with schema versioning
 */
export interface SerializedGameState {
  /** Schema version for forward compatibility */
  version: number;
  /** The game state data */
  state: GameState;
  /** Timestamp when serialized */
  timestamp: number;
}

/**
 * Serializes a game state to a JSON string
 * @param state - The game state to serialize
 * @returns JSON string representation of the game state
 */
export function serializeGame(state: GameState): string {
  const serialized: SerializedGameState = {
    version: SCHEMA_VERSION,
    state,
    timestamp: Date.now(),
  };

  return JSON.stringify(serialized);
}

/**
 * Error thrown when deserialization fails
 */
export class DeserializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeserializationError";
  }
}

/**
 * Summary information for a saved game, displayed in save/load UI
 */
export interface SavePreview {
  /** Number of diseases that have been cured (0-4) */
  diseasesCured: number;
  /** Number of outbreaks that have occurred (0-8) */
  outbreakCount: number;
  /** Role of the current player */
  currentPlayerRole: string;
}

/**
 * Represents a saved game slot with metadata and preview information
 */
export interface SaveSlot {
  /** Unique identifier for this save slot */
  id: string;
  /** User-provided name for the saved game */
  name: string;
  /** Timestamp when the game was saved (milliseconds since epoch) */
  timestamp: number;
  /** Current turn number in the game */
  turnNumber: number;
  /** Number of players in this game (2-4) */
  playerCount: number;
  /** Difficulty level (number of epidemic cards: 4-6) */
  difficulty: number;
  /** Preview information for display in save/load UI */
  preview: SavePreview;
}

/**
 * Storage backend interface for saving and loading game data
 * Implementations can use localStorage, filesystem, or in-memory storage
 */
export interface StorageBackend {
  /**
   * Saves data to storage under the given key
   * @param key - Unique identifier for the saved data
   * @param data - The data to save (will be a JSON string)
   * @returns Promise that resolves when save is complete
   */
  save(key: string, data: string): Promise<void>;

  /**
   * Loads data from storage by key
   * @param key - Unique identifier for the data to load
   * @returns Promise that resolves to the saved data, or null if not found
   */
  load(key: string): Promise<string | null>;

  /**
   * Lists all saved game keys in storage
   * @returns Promise that resolves to an array of saved game keys
   */
  list(): Promise<string[]>;

  /**
   * Deletes saved data by key
   * @param key - Unique identifier for the data to delete
   * @returns Promise that resolves when deletion is complete
   */
  delete(key: string): Promise<void>;
}

/**
 * Deserializes a JSON string back to a game state
 * @param json - The JSON string to deserialize
 * @returns The reconstructed game state
 * @throws {DeserializationError} If the JSON is malformed or incompatible
 */
export function deserializeGame(json: string): GameState {
  let parsed: unknown;

  // Step 1: Parse JSON
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new DeserializationError(
      `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Step 2: Validate basic structure
  if (typeof parsed !== "object" || parsed === null) {
    throw new DeserializationError("Deserialized data is not an object");
  }

  const data = parsed as Record<string, unknown>;

  // Step 3: Check schema version
  if (typeof data.version !== "number") {
    throw new DeserializationError("Missing or invalid schema version");
  }

  if (data.version > SCHEMA_VERSION) {
    throw new DeserializationError(
      `Incompatible schema version: got ${data.version}, expected ${SCHEMA_VERSION} or lower`,
    );
  }

  // Step 4: Extract and validate state
  if (typeof data.state !== "object" || data.state === null) {
    throw new DeserializationError("Missing or invalid game state");
  }

  // Step 5: Validate state has required fields
  const state = data.state as Record<string, unknown>;
  const requiredFields = [
    "config",
    "players",
    "currentPlayerIndex",
    "phase",
    "actionsRemaining",
    "board",
    "cures",
    "cubeSupply",
    "infectionRatePosition",
    "outbreakCount",
    "playerDeck",
    "playerDiscard",
    "infectionDeck",
    "infectionDiscard",
    "status",
    "turnNumber",
  ];

  for (const field of requiredFields) {
    if (!(field in state)) {
      throw new DeserializationError(`Missing required field: ${field}`);
    }
  }

  // If validation passes, return the state
  // TypeScript will trust our validation here
  return data.state as GameState;
}

/**
 * LocalStorage-based storage backend for browser environments
 * Uses window.localStorage to persist game saves
 */
export class LocalStorageBackend implements StorageBackend {
  private readonly prefix: string;
  private readonly storage: Storage;

  /**
   * Creates a new LocalStorageBackend
   * @param prefix - Optional prefix for localStorage keys (default: "pandemic-save-")
   * @throws {Error} If localStorage is not available (not in a browser environment)
   */
  constructor(prefix = "pandemic-save-") {
    this.prefix = prefix;

    // Check if localStorage is available
    if (typeof window === "undefined" || !window.localStorage) {
      throw new Error(
        "localStorage is not available. LocalStorageBackend requires a browser environment.",
      );
    }

    this.storage = window.localStorage;
  }

  /**
   * Saves data to localStorage
   * @param key - Unique identifier for the saved data
   * @param data - The data to save (JSON string)
   */
  async save(key: string, data: string): Promise<void> {
    try {
      this.storage.setItem(this.prefix + key, data);
    } catch (error) {
      throw new Error(
        `Failed to save to localStorage: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Loads data from localStorage
   * @param key - Unique identifier for the data to load
   * @returns The saved data, or null if not found
   */
  async load(key: string): Promise<string | null> {
    try {
      return this.storage.getItem(this.prefix + key);
    } catch (error) {
      throw new Error(
        `Failed to load from localStorage: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Lists all saved game keys in localStorage
   * @returns Array of save keys (without prefix)
   */
  async list(): Promise<string[]> {
    try {
      const keys: string[] = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key?.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
      return keys;
    } catch (error) {
      throw new Error(
        `Failed to list localStorage keys: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Deletes a saved game from localStorage
   * @param key - Unique identifier for the data to delete
   */
  async delete(key: string): Promise<void> {
    try {
      this.storage.removeItem(this.prefix + key);
    } catch (error) {
      throw new Error(
        `Failed to delete from localStorage: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

/**
 * In-memory storage backend for testing and non-persistent scenarios
 * Stores game saves in memory, data is lost when the process exits
 */
export class InMemoryBackend implements StorageBackend {
  private readonly storage: Map<string, string> = new Map();

  /**
   * Saves data to memory
   * @param key - Unique identifier for the saved data
   * @param data - The data to save (JSON string)
   */
  async save(key: string, data: string): Promise<void> {
    this.storage.set(key, data);
  }

  /**
   * Loads data from memory
   * @param key - Unique identifier for the data to load
   * @returns The saved data, or null if not found
   */
  async load(key: string): Promise<string | null> {
    return this.storage.get(key) ?? null;
  }

  /**
   * Lists all saved game keys in memory
   * @returns Array of save keys
   */
  async list(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  /**
   * Deletes saved data from memory
   * @param key - Unique identifier for the data to delete
   */
  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  /**
   * Clears all saved data from memory
   * Useful for resetting state between tests
   */
  clear(): void {
    this.storage.clear();
  }
}

/**
 * Generates a SavePreview from a game state
 * @param state - The game state to create a preview for
 * @returns SavePreview with summary information
 */
function createSavePreview(state: GameState): SavePreview {
  // Count how many diseases have been cured
  const diseasesCured = Object.values(state.cures).filter(
    (status) => status === "cured" || status === "eradicated",
  ).length;

  // Get current player's role
  const currentPlayer = state.players[state.currentPlayerIndex];
  const currentPlayerRole = currentPlayer !== undefined ? currentPlayer.role : Role.Medic;

  return {
    diseasesCured,
    outbreakCount: state.outbreakCount,
    currentPlayerRole,
  };
}

/**
 * Saves a game state to a storage backend
 * @param state - The game state to save
 * @param name - User-provided name for the saved game
 * @param backend - Storage backend to use for saving
 * @returns SaveSlot with metadata about the saved game
 */
export async function saveGame(
  state: GameState,
  name: string,
  backend: StorageBackend,
): Promise<SaveSlot> {
  // Generate a unique ID for this save slot
  const id = `save-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Serialize the game state
  const serialized = serializeGame(state);

  // Save to backend
  await backend.save(id, serialized);

  // Create and return the save slot metadata
  const saveSlot: SaveSlot = {
    id,
    name,
    timestamp: Date.now(),
    turnNumber: state.turnNumber,
    playerCount: state.config.playerCount,
    difficulty: state.config.difficulty,
    preview: createSavePreview(state),
  };

  // Also save the metadata separately for quick listing
  await backend.save(`${id}-metadata`, JSON.stringify(saveSlot));

  return saveSlot;
}

/**
 * Loads a game state from a storage backend
 * @param slotId - Unique identifier of the save slot to load
 * @param backend - Storage backend to use for loading
 * @returns The reconstructed game state
 * @throws {Error} If the save slot is not found or cannot be loaded
 */
export async function loadGame(slotId: string, backend: StorageBackend): Promise<GameState> {
  // Load the serialized game state from backend
  const serialized = await backend.load(slotId);

  if (serialized === null) {
    throw new Error(`Save slot not found: ${slotId}`);
  }

  // Deserialize and return the game state
  return deserializeGame(serialized);
}

/**
 * Lists all saved games from a storage backend
 * @param backend - Storage backend to list saves from
 * @returns Array of SaveSlot objects with metadata for each saved game
 */
export async function listSaves(backend: StorageBackend): Promise<SaveSlot[]> {
  // Get all keys from the backend
  const allKeys = await backend.list();

  // Filter for metadata keys and load them
  const metadataKeys = allKeys.filter((key) => key.endsWith("-metadata"));
  const saveSlots: SaveSlot[] = [];

  for (const metadataKey of metadataKeys) {
    const metadataJson = await backend.load(metadataKey);
    if (metadataJson !== null) {
      try {
        const saveSlot = JSON.parse(metadataJson) as SaveSlot;
        saveSlots.push(saveSlot);
      } catch {
        // Skip invalid metadata entries
        continue;
      }
    }
  }

  // Sort by timestamp (most recent first)
  saveSlots.sort((a, b) => b.timestamp - a.timestamp);

  return saveSlots;
}

/**
 * Deletes a saved game from a storage backend
 * @param slotId - Unique identifier of the save slot to delete
 * @param backend - Storage backend to delete from
 */
export async function deleteSave(slotId: string, backend: StorageBackend): Promise<void> {
  // Delete both the game state and metadata
  await backend.delete(slotId);
  await backend.delete(`${slotId}-metadata`);
}

/**
 * Represents a snapshot in game history for undo/redo functionality
 */
export interface GameHistoryEntry {
  /** The game state at this point in history */
  state: GameState;
  /** Description of the action that led to this state */
  action: string;
}

/**
 * Manages game history for undo/redo functionality
 */
export interface GameHistory {
  /** Stack of past states (oldest to newest) */
  past: GameHistoryEntry[];
  /** Current position in the history (-1 if at the end) */
  currentIndex: number;
  /** Maximum number of states to keep in history (default: 50) */
  maxDepth: number;
}

/**
 * Creates a new empty game history
 * @param maxDepth - Maximum number of states to keep (default: 50)
 * @returns A new GameHistory object
 */
export function createGameHistory(maxDepth = 50): GameHistory {
  return {
    past: [],
    currentIndex: -1,
    maxDepth,
  };
}

/**
 * Adds a new state to the game history
 * - Clears any redo stack (states after currentIndex)
 * - Enforces maximum depth by removing oldest states
 * - Updates currentIndex to point to the new state
 *
 * @param history - The current game history
 * @param state - The new game state to record
 * @param action - Description of the action that led to this state
 * @returns Updated game history
 */
export function pushState(history: GameHistory, state: GameState, action: string): GameHistory {
  // Create new entry
  const entry: GameHistoryEntry = { state, action };

  // If we're not at the end of history (user has undone), clear the redo stack
  let newPast: GameHistoryEntry[];
  if (history.currentIndex === -1 || history.currentIndex === history.past.length - 1) {
    // At the end - just append
    newPast = [...history.past, entry];
  } else {
    // In the middle - discard everything after currentIndex
    newPast = [...history.past.slice(0, history.currentIndex + 1), entry];
  }

  // Enforce max depth by removing oldest entries
  if (newPast.length > history.maxDepth) {
    newPast = newPast.slice(newPast.length - history.maxDepth);
  }

  return {
    ...history,
    past: newPast,
    currentIndex: newPast.length - 1,
  };
}

/**
 * Undoes the last action, returning to the previous state
 * @param history - The current game history
 * @returns Updated history and the previous game state, or null if nothing to undo
 */
export function undo(history: GameHistory): { history: GameHistory; state: GameState } | null {
  // Can't undo if we're at the beginning or history is empty
  if (history.currentIndex <= 0 || history.past.length === 0) {
    return null;
  }

  // Move back one step
  const newIndex = history.currentIndex - 1;
  const previousEntry = history.past[newIndex];

  if (previousEntry === undefined) {
    return null;
  }

  return {
    history: {
      ...history,
      currentIndex: newIndex,
    },
    state: previousEntry.state,
  };
}

/**
 * Redoes a previously undone action, moving forward in history
 * @param history - The current game history
 * @returns Updated history and the next game state, or null if nothing to redo
 */
export function redo(history: GameHistory): { history: GameHistory; state: GameState } | null {
  // Can't redo if we're at the end or history is empty
  if (
    history.currentIndex === -1 ||
    history.currentIndex >= history.past.length - 1 ||
    history.past.length === 0
  ) {
    return null;
  }

  // Move forward one step
  const newIndex = history.currentIndex + 1;
  const nextEntry = history.past[newIndex];

  if (nextEntry === undefined) {
    return null;
  }

  return {
    history: {
      ...history,
      currentIndex: newIndex,
    },
    state: nextEntry.state,
  };
}

/**
 * Checks if undo is allowed for the given game state
 * Undo is only allowed during the Actions phase
 * @param state - The current game state
 * @param history - The current game history
 * @returns true if undo is allowed, false otherwise
 */
export function canUndo(state: GameState, history: GameHistory): boolean {
  // Must be in Actions phase
  if (state.phase !== TurnPhase.Actions) {
    return false;
  }

  // Must have history to undo
  if (history.currentIndex <= 0 || history.past.length === 0) {
    return false;
  }

  return true;
}

/**
 * Checks if redo is allowed for the given game state
 * Redo is only allowed during the Actions phase
 * @param state - The current game state
 * @param history - The current game history
 * @returns true if redo is allowed, false otherwise
 */
export function canRedo(state: GameState, history: GameHistory): boolean {
  // Must be in Actions phase
  if (state.phase !== TurnPhase.Actions) {
    return false;
  }

  // Must have future states to redo
  if (
    history.currentIndex === -1 ||
    history.currentIndex >= history.past.length - 1 ||
    history.past.length === 0
  ) {
    return false;
  }

  return true;
}

/**
 * Represents a single action in a game replay
 */
export interface ReplayAction {
  /** Description of the action taken */
  action: string;
  /** The resulting game state after the action */
  result: GameState;
}

/**
 * Metadata about a completed game replay
 */
export interface ReplayMetadata {
  /** Names of players in the game */
  playerNames?: string[];
  /** Roles assigned to each player */
  playerRoles: string[];
  /** Difficulty level (number of epidemic cards) */
  difficulty: number;
  /** Final game outcome (won/lost/ongoing) */
  finalOutcome: string;
  /** Total number of turns played */
  totalTurns: number;
  /** Timestamp when the replay was created */
  timestamp: number;
}

/**
 * Represents a complete game replay with initial state and action sequence
 * Can be used to step through a game move-by-move or export/import for sharing
 */
export interface GameReplay {
  /** The initial game state before any actions were taken */
  initialState: GameState;
  /** Ordered list of actions and their resulting states */
  actions: ReplayAction[];
  /** Metadata about the game (player info, difficulty, outcome) */
  metadata: ReplayMetadata;
}

/**
 * Creates a game replay from an initial state and sequence of actions
 * @param initialState - The starting game state
 * @param actions - Array of actions and their results
 * @param metadata - Optional metadata (if not provided, extracted from states)
 * @returns A GameReplay object
 */
export function createReplay(
  initialState: GameState,
  actions: Array<{ action: string; result: GameState }>,
  metadata?: ReplayMetadata,
): GameReplay {
  // If metadata not provided, extract it from the states
  const finalState =
    actions.length > 0 ? (actions[actions.length - 1]?.result ?? initialState) : initialState;

  const defaultMetadata: ReplayMetadata = {
    playerRoles: initialState.players.map((p) => p.role),
    difficulty: initialState.config.difficulty,
    finalOutcome: finalState?.status ?? initialState.status,
    totalTurns: finalState?.turnNumber ?? initialState.turnNumber,
    timestamp: Date.now(),
  };

  return {
    initialState,
    actions,
    metadata: metadata ?? defaultMetadata,
  };
}

/**
 * Gets the game state at a specific step in the replay
 * @param replay - The game replay
 * @param stepIndex - The step number (0 = initial state, 1 = after first action, etc.)
 * @returns The game state at the specified step
 * @throws {Error} If stepIndex is out of bounds
 */
export function replayStep(replay: GameReplay, stepIndex: number): GameState {
  // Step 0 is the initial state
  if (stepIndex === 0) {
    return replay.initialState;
  }

  // Validate step index
  if (stepIndex < 0 || stepIndex > replay.actions.length) {
    throw new Error(
      `Step index ${stepIndex} is out of bounds (valid range: 0-${replay.actions.length})`,
    );
  }

  // Return the result state from the corresponding action
  const action = replay.actions[stepIndex - 1];
  if (action === undefined) {
    throw new Error(`No action found at step ${stepIndex}`);
  }

  return action.result;
}

/**
 * Advances the replay forward by one step
 * @param replay - The game replay
 * @param currentStep - Current step number (0-based)
 * @returns Object with the new state and step number, or null if already at the end
 */
export function replayForward(
  replay: GameReplay,
  currentStep: number,
): { state: GameState; step: number } | null {
  // Check if we can move forward
  if (currentStep >= replay.actions.length) {
    return null; // Already at the end
  }

  const newStep = currentStep + 1;
  const state = replayStep(replay, newStep);

  return { state, step: newStep };
}

/**
 * Moves the replay backward by one step
 * @param replay - The game replay
 * @param currentStep - Current step number (0-based)
 * @returns Object with the new state and step number, or null if already at the beginning
 */
export function replayBackward(
  replay: GameReplay,
  currentStep: number,
): { state: GameState; step: number } | null {
  // Check if we can move backward
  if (currentStep <= 0) {
    return null; // Already at the beginning
  }

  const newStep = currentStep - 1;
  const state = replayStep(replay, newStep);

  return { state, step: newStep };
}

/**
 * Represents a replay recording in progress during a live game
 * Stores minimal action descriptors to recreate the game flow
 */
export interface ReplayRecording {
  /** The initial game state before any actions were taken */
  initialState: GameState;
  /** Ordered list of action descriptors */
  actions: string[];
  /** Whether recording is currently enabled */
  enabled: boolean;
}

/**
 * Creates a new replay recording from an initial game state
 * @param initialState - The starting game state to record from
 * @param enabled - Whether recording is enabled (default: true)
 * @returns A new ReplayRecording object
 */
export function createReplayRecording(initialState: GameState, enabled = true): ReplayRecording {
  return {
    initialState,
    actions: [],
    enabled,
  };
}

/**
 * Records an action in a replay recording
 * Only records if the recording is enabled
 * @param recording - The replay recording to add to
 * @param action - Description of the action taken
 * @returns Updated replay recording with the new action
 */
export function recordAction(recording: ReplayRecording, action: string): ReplayRecording {
  if (!recording.enabled) {
    return recording; // No-op if recording disabled
  }

  return {
    ...recording,
    actions: [...recording.actions, action],
  };
}

/**
 * Enables or disables recording for a replay recording
 * @param recording - The replay recording to modify
 * @param enabled - Whether recording should be enabled
 * @returns Updated replay recording with new enabled status
 */
export function setRecordingEnabled(recording: ReplayRecording, enabled: boolean): ReplayRecording {
  return {
    ...recording,
    enabled,
  };
}

/**
 * Finalizes a replay recording into a shareable GameReplay
 * Note: This version stores only action descriptors, not full state snapshots
 * To reconstruct states, the actions must be replayed from the initial state
 * @param recording - The replay recording to finalize
 * @param currentState - The final game state after all actions
 * @param metadata - Optional metadata (if not provided, extracted from states)
 * @returns A GameReplay object ready for export or step-through
 */
export function finishReplay(
  recording: ReplayRecording,
  currentState: GameState,
  metadata?: Partial<ReplayMetadata>,
): GameReplay {
  // Create replay actions with state snapshots
  // Note: In a full implementation with action replay capability,
  // we would replay each action to get intermediate states.
  // For now, we only have initial and final states.
  const replayActions: ReplayAction[] = recording.actions.map((action, index) => {
    // For this implementation, we store the action descriptor
    // but don't have intermediate states (would need replay capability)
    return {
      action,
      // Placeholder: would need to replay actions to get intermediate states
      result: index === recording.actions.length - 1 ? currentState : recording.initialState,
    };
  });

  // Generate default metadata
  const defaultMetadata: ReplayMetadata = {
    playerRoles: recording.initialState.players.map((p) => p.role),
    difficulty: recording.initialState.config.difficulty,
    finalOutcome: currentState.status,
    totalTurns: currentState.turnNumber,
    timestamp: Date.now(),
  };

  return {
    initialState: recording.initialState,
    actions: replayActions,
    metadata: { ...defaultMetadata, ...metadata },
  };
}

/**
 * Filesystem-based storage backend for Node.js environments
 * Uses Node.js fs module to persist game saves to disk
 */
export class FileSystemBackend implements StorageBackend {
  private readonly directory: string;
  private readonly extension: string;

  /**
   * Creates a new FileSystemBackend
   * @param directory - Directory path where save files will be stored (default: "./saves")
   * @param extension - File extension for save files (default: ".json")
   */
  constructor(directory = "./saves", extension = ".json") {
    this.directory = directory;
    this.extension = extension;
  }

  /**
   * Ensures the save directory exists
   * @private
   */
  private async ensureDirectory(): Promise<void> {
    const fs = await import("fs/promises");
    try {
      await fs.mkdir(this.directory, { recursive: true });
    } catch (error) {
      throw new Error(
        `Failed to create save directory: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Gets the full file path for a given save key
   * @private
   */
  private getFilePath(key: string): string {
    return `${this.directory}/${key}${this.extension}`;
  }

  /**
   * Saves data to a file
   * @param key - Unique identifier for the saved data (used as filename)
   * @param data - The data to save (JSON string)
   */
  async save(key: string, data: string): Promise<void> {
    await this.ensureDirectory();

    const fs = await import("fs/promises");
    const filePath = this.getFilePath(key);

    try {
      await fs.writeFile(filePath, data, "utf-8");
    } catch (error) {
      throw new Error(
        `Failed to save to file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Loads data from a file
   * @param key - Unique identifier for the data to load (used as filename)
   * @returns The saved data, or null if not found
   */
  async load(key: string): Promise<string | null> {
    const fs = await import("fs/promises");
    const filePath = this.getFilePath(key);

    try {
      const data = await fs.readFile(filePath, "utf-8");
      return data;
    } catch (error) {
      // Return null if file doesn't exist
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return null;
      }

      throw new Error(
        `Failed to load from file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Lists all saved game files in the directory
   * @returns Array of save keys (filenames without extension)
   */
  async list(): Promise<string[]> {
    const fs = await import("fs/promises");

    try {
      // Ensure directory exists first
      await this.ensureDirectory();

      const files = await fs.readdir(this.directory);

      // Filter files by extension and remove extension from keys
      return files
        .filter((file: string) => file.endsWith(this.extension))
        .map((file: string) => file.slice(0, -this.extension.length));
    } catch (error) {
      throw new Error(
        `Failed to list files in ${this.directory}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Deletes a saved game file
   * @param key - Unique identifier for the data to delete (used as filename)
   */
  async delete(key: string): Promise<void> {
    const fs = await import("fs/promises");
    const filePath = this.getFilePath(key);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Silently succeed if file doesn't exist
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return;
      }

      throw new Error(
        `Failed to delete file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
