// Serialization and persistence functionality for Pandemic game state

import type { GameState } from "./types";

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
