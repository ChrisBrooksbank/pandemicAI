// Tests for serialization and deserialization functionality

import { describe, it, expect, beforeEach } from "vitest";
import {
  serializeGame,
  deserializeGame,
  saveGame,
  loadGame,
  listSaves,
  deleteSave,
  DeserializationError,
  InMemoryBackend,
  SavePreview,
  SaveSlot,
  createGameHistory,
  pushState,
  undo,
  redo,
  canUndo,
  canRedo,
  createReplay,
  exportReplay,
  importReplay,
  ReplayImportError,
} from "./serialization";
import { createGame } from "./game";
import { GameState, Disease, Role, CureStatus, TurnPhase } from "./types";

describe("serializeGame", () => {
  it("should serialize a game state to JSON string", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const json = serializeGame(state);

    expect(typeof json).toBe("string");
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("should include schema version in serialized output", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const json = serializeGame(state);
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe(1);
  });

  it("should include timestamp in serialized output", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const beforeTime = Date.now();
    const json = serializeGame(state);
    const afterTime = Date.now();
    const parsed = JSON.parse(json);

    expect(parsed.timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(parsed.timestamp).toBeLessThanOrEqual(afterTime);
  });

  it("should include full game state in serialized output", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const json = serializeGame(state);
    const parsed = JSON.parse(json);

    expect(parsed.state).toBeDefined();
    expect(parsed.state.config).toEqual(state.config);
    expect(parsed.state.players).toEqual(state.players);
    expect(parsed.state.currentPlayerIndex).toBe(state.currentPlayerIndex);
  });
});

describe("deserializeGame", () => {
  it("should deserialize a serialized game state with perfect fidelity", () => {
    const original = createGame({ playerCount: 2, difficulty: 4 });
    const json = serializeGame(original);
    const deserialized = deserializeGame(json);

    expect(deserialized).toEqual(original);
  });

  it("should handle round-trip serialization multiple times", () => {
    const state1 = createGame({ playerCount: 3, difficulty: 5 });
    const json1 = serializeGame(state1);
    const state2 = deserializeGame(json1);
    const json2 = serializeGame(state2);
    const state3 = deserializeGame(json2);

    expect(state3).toEqual(state1);
  });

  it("should throw DeserializationError for invalid JSON", () => {
    const invalidJson = "{ this is not valid json }";

    expect(() => deserializeGame(invalidJson)).toThrow(DeserializationError);
    expect(() => deserializeGame(invalidJson)).toThrow("Invalid JSON");
  });

  it("should throw DeserializationError for non-object data", () => {
    const jsonString = JSON.stringify("just a string");

    expect(() => deserializeGame(jsonString)).toThrow(DeserializationError);
    expect(() => deserializeGame(jsonString)).toThrow("not an object");
  });

  it("should throw DeserializationError for null data", () => {
    const jsonNull = JSON.stringify(null);

    expect(() => deserializeGame(jsonNull)).toThrow(DeserializationError);
    expect(() => deserializeGame(jsonNull)).toThrow("not an object");
  });

  it("should throw DeserializationError for missing schema version", () => {
    const json = JSON.stringify({ state: {}, timestamp: Date.now() });

    expect(() => deserializeGame(json)).toThrow(DeserializationError);
    expect(() => deserializeGame(json)).toThrow("schema version");
  });

  it("should throw DeserializationError for incompatible schema version", () => {
    const json = JSON.stringify({
      version: 999,
      state: {},
      timestamp: Date.now(),
    });

    expect(() => deserializeGame(json)).toThrow(DeserializationError);
    expect(() => deserializeGame(json)).toThrow("Incompatible schema version");
    expect(() => deserializeGame(json)).toThrow("got 999");
  });

  it("should throw DeserializationError for missing state field", () => {
    const json = JSON.stringify({ version: 1, timestamp: Date.now() });

    expect(() => deserializeGame(json)).toThrow(DeserializationError);
    expect(() => deserializeGame(json)).toThrow("Missing or invalid game state");
  });

  it("should throw DeserializationError for missing required state fields", () => {
    const incompleteState = {
      config: { playerCount: 2, difficulty: 4 },
      players: [],
      // missing other required fields
    };
    const json = JSON.stringify({
      version: 1,
      state: incompleteState,
      timestamp: Date.now(),
    });

    expect(() => deserializeGame(json)).toThrow(DeserializationError);
    expect(() => deserializeGame(json)).toThrow("Missing required field");
  });

  it("should accept older schema versions (forward compatibility)", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const json = JSON.stringify({
      version: 0, // older version
      state,
      timestamp: Date.now(),
    });

    // Should not throw - older versions are acceptable
    expect(() => deserializeGame(json)).not.toThrow();
  });
});

describe("round-trip fidelity", () => {
  it("should preserve all game config fields", () => {
    const original = createGame({ playerCount: 4, difficulty: 6 });
    const roundTrip = deserializeGame(serializeGame(original));

    expect(roundTrip.config.playerCount).toBe(4);
    expect(roundTrip.config.difficulty).toBe(6);
  });

  it("should preserve player data including hands and roles", () => {
    const original = createGame({ playerCount: 3, difficulty: 5 });
    const roundTrip = deserializeGame(serializeGame(original));

    expect(roundTrip.players).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      expect(roundTrip.players[i]?.role).toBe(original.players[i]?.role);
      expect(roundTrip.players[i]?.location).toBe(original.players[i]?.location);
      expect(roundTrip.players[i]?.hand).toEqual(original.players[i]?.hand);
    }
  });

  it("should preserve board state with disease cubes and research stations", () => {
    const original = createGame({ playerCount: 2, difficulty: 4 });
    const roundTrip = deserializeGame(serializeGame(original));

    // Check that board is preserved
    const cityNames = Object.keys(original.board);
    expect(Object.keys(roundTrip.board)).toHaveLength(cityNames.length);

    for (const cityName of cityNames) {
      const originalCity = original.board[cityName];
      const roundTripCity = roundTrip.board[cityName];
      expect(roundTripCity).toEqual(originalCity);
    }
  });

  it("should preserve cure status for all diseases", () => {
    const original = createGame({ playerCount: 2, difficulty: 4 });
    const roundTrip = deserializeGame(serializeGame(original));

    expect(roundTrip.cures[Disease.Blue]).toBe(original.cures[Disease.Blue]);
    expect(roundTrip.cures[Disease.Yellow]).toBe(original.cures[Disease.Yellow]);
    expect(roundTrip.cures[Disease.Black]).toBe(original.cures[Disease.Black]);
    expect(roundTrip.cures[Disease.Red]).toBe(original.cures[Disease.Red]);
  });

  it("should preserve cube supply for all diseases", () => {
    const original = createGame({ playerCount: 2, difficulty: 4 });
    const roundTrip = deserializeGame(serializeGame(original));

    expect(roundTrip.cubeSupply[Disease.Blue]).toBe(original.cubeSupply[Disease.Blue]);
    expect(roundTrip.cubeSupply[Disease.Yellow]).toBe(original.cubeSupply[Disease.Yellow]);
    expect(roundTrip.cubeSupply[Disease.Black]).toBe(original.cubeSupply[Disease.Black]);
    expect(roundTrip.cubeSupply[Disease.Red]).toBe(original.cubeSupply[Disease.Red]);
  });

  it("should preserve infection rate and outbreak count", () => {
    const original = createGame({ playerCount: 2, difficulty: 4 });
    const roundTrip = deserializeGame(serializeGame(original));

    expect(roundTrip.infectionRatePosition).toBe(original.infectionRatePosition);
    expect(roundTrip.outbreakCount).toBe(original.outbreakCount);
  });

  it("should preserve all decks and discard piles", () => {
    const original = createGame({ playerCount: 2, difficulty: 4 });
    const roundTrip = deserializeGame(serializeGame(original));

    expect(roundTrip.playerDeck).toEqual(original.playerDeck);
    expect(roundTrip.playerDiscard).toEqual(original.playerDiscard);
    expect(roundTrip.infectionDeck).toEqual(original.infectionDeck);
    expect(roundTrip.infectionDiscard).toEqual(original.infectionDiscard);
  });

  it("should preserve turn phase and actions remaining", () => {
    const original = createGame({ playerCount: 2, difficulty: 4 });
    const roundTrip = deserializeGame(serializeGame(original));

    expect(roundTrip.phase).toBe(original.phase);
    expect(roundTrip.actionsRemaining).toBe(original.actionsRemaining);
    expect(roundTrip.currentPlayerIndex).toBe(original.currentPlayerIndex);
  });

  it("should preserve game status", () => {
    const original = createGame({ playerCount: 2, difficulty: 4 });
    const roundTrip = deserializeGame(serializeGame(original));

    expect(roundTrip.status).toBe(original.status);
  });

  it("should preserve special state flags", () => {
    const original = createGame({ playerCount: 2, difficulty: 4 });
    const roundTrip = deserializeGame(serializeGame(original));

    expect(roundTrip.operationsExpertSpecialMoveUsed).toBe(
      original.operationsExpertSpecialMoveUsed,
    );
    expect(roundTrip.skipNextInfectionPhase).toBe(original.skipNextInfectionPhase);
  });

  it("should handle game with Contingency Planner stored event card", () => {
    const original = createGame({ playerCount: 2, difficulty: 4 });
    // Set a contingency planner with stored event
    const updatedState: GameState = {
      ...original,
      players: original.players.map((p, i) =>
        i === 0
          ? {
              ...p,
              role: Role.ContingencyPlanner,
              storedEventCard: { type: "event", event: "airlift" },
            }
          : p,
      ),
    };

    const roundTrip = deserializeGame(serializeGame(updatedState));

    expect(roundTrip.players[0]?.storedEventCard).toEqual({
      type: "event",
      event: "airlift",
    });
  });
});

describe("SavePreview", () => {
  it("should have correct structure for save preview", () => {
    const preview: SavePreview = {
      diseasesCured: 2,
      outbreakCount: 3,
      currentPlayerRole: "medic",
    };

    expect(preview.diseasesCured).toBe(2);
    expect(preview.outbreakCount).toBe(3);
    expect(preview.currentPlayerRole).toBe("medic");
  });

  it("should allow all valid disease cure counts (0-4)", () => {
    const preview0: SavePreview = {
      diseasesCured: 0,
      outbreakCount: 0,
      currentPlayerRole: "scientist",
    };
    const preview4: SavePreview = {
      diseasesCured: 4,
      outbreakCount: 0,
      currentPlayerRole: "scientist",
    };

    expect(preview0.diseasesCured).toBe(0);
    expect(preview4.diseasesCured).toBe(4);
  });

  it("should allow all valid outbreak counts (0-8)", () => {
    const preview0: SavePreview = {
      diseasesCured: 0,
      outbreakCount: 0,
      currentPlayerRole: "researcher",
    };
    const preview8: SavePreview = {
      diseasesCured: 0,
      outbreakCount: 8,
      currentPlayerRole: "researcher",
    };

    expect(preview0.outbreakCount).toBe(0);
    expect(preview8.outbreakCount).toBe(8);
  });
});

describe("SaveSlot", () => {
  it("should have correct structure for save slot", () => {
    const slot: SaveSlot = {
      id: "save-123",
      name: "My Game",
      timestamp: Date.now(),
      turnNumber: 5,
      playerCount: 3,
      difficulty: 5,
      preview: {
        diseasesCured: 1,
        outbreakCount: 2,
        currentPlayerRole: "operations_expert",
      },
    };

    expect(slot.id).toBe("save-123");
    expect(slot.name).toBe("My Game");
    expect(typeof slot.timestamp).toBe("number");
    expect(slot.turnNumber).toBe(5);
    expect(slot.playerCount).toBe(3);
    expect(slot.difficulty).toBe(5);
    expect(slot.preview.diseasesCured).toBe(1);
    expect(slot.preview.outbreakCount).toBe(2);
    expect(slot.preview.currentPlayerRole).toBe("operations_expert");
  });

  it("should support all valid player counts (2-4)", () => {
    const slot2: SaveSlot = {
      id: "save-1",
      name: "2 Players",
      timestamp: Date.now(),
      turnNumber: 1,
      playerCount: 2,
      difficulty: 4,
      preview: { diseasesCured: 0, outbreakCount: 0, currentPlayerRole: "medic" },
    };

    const slot3: SaveSlot = {
      id: "save-2",
      name: "3 Players",
      timestamp: Date.now(),
      turnNumber: 1,
      playerCount: 3,
      difficulty: 4,
      preview: { diseasesCured: 0, outbreakCount: 0, currentPlayerRole: "medic" },
    };

    const slot4: SaveSlot = {
      id: "save-3",
      name: "4 Players",
      timestamp: Date.now(),
      turnNumber: 1,
      playerCount: 4,
      difficulty: 4,
      preview: { diseasesCured: 0, outbreakCount: 0, currentPlayerRole: "medic" },
    };

    expect(slot2.playerCount).toBe(2);
    expect(slot3.playerCount).toBe(3);
    expect(slot4.playerCount).toBe(4);
  });

  it("should support all valid difficulty levels (4-6)", () => {
    const easy: SaveSlot = {
      id: "save-easy",
      name: "Easy Game",
      timestamp: Date.now(),
      turnNumber: 1,
      playerCount: 2,
      difficulty: 4,
      preview: { diseasesCured: 0, outbreakCount: 0, currentPlayerRole: "scientist" },
    };

    const medium: SaveSlot = {
      id: "save-medium",
      name: "Medium Game",
      timestamp: Date.now(),
      turnNumber: 1,
      playerCount: 2,
      difficulty: 5,
      preview: { diseasesCured: 0, outbreakCount: 0, currentPlayerRole: "scientist" },
    };

    const hard: SaveSlot = {
      id: "save-hard",
      name: "Hard Game",
      timestamp: Date.now(),
      turnNumber: 1,
      playerCount: 2,
      difficulty: 6,
      preview: { diseasesCured: 0, outbreakCount: 0, currentPlayerRole: "scientist" },
    };

    expect(easy.difficulty).toBe(4);
    expect(medium.difficulty).toBe(5);
    expect(hard.difficulty).toBe(6);
  });

  it("should support unique IDs for different save slots", () => {
    const slot1: SaveSlot = {
      id: "unique-id-1",
      name: "Game 1",
      timestamp: Date.now(),
      turnNumber: 1,
      playerCount: 2,
      difficulty: 4,
      preview: { diseasesCured: 0, outbreakCount: 0, currentPlayerRole: "dispatcher" },
    };

    const slot2: SaveSlot = {
      id: "unique-id-2",
      name: "Game 2",
      timestamp: Date.now(),
      turnNumber: 1,
      playerCount: 2,
      difficulty: 4,
      preview: { diseasesCured: 0, outbreakCount: 0, currentPlayerRole: "dispatcher" },
    };

    expect(slot1.id).not.toBe(slot2.id);
  });
});

describe("saveGame", () => {
  let backend: InMemoryBackend;

  beforeEach(() => {
    backend = new InMemoryBackend();
  });

  it("should save a game and return a SaveSlot", async () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const saveSlot = await saveGame(state, "Test Save", backend);

    expect(saveSlot.id).toBeDefined();
    expect(saveSlot.name).toBe("Test Save");
    expect(saveSlot.playerCount).toBe(2);
    expect(saveSlot.difficulty).toBe(4);
    expect(saveSlot.turnNumber).toBe(1);
    expect(typeof saveSlot.timestamp).toBe("number");
  });

  it("should create a valid preview with diseases cured count", async () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    // Modify state to have 2 cured diseases
    const modifiedState: GameState = {
      ...state,
      cures: {
        [Disease.Blue]: CureStatus.Cured,
        [Disease.Yellow]: CureStatus.Eradicated,
        [Disease.Black]: CureStatus.Uncured,
        [Disease.Red]: CureStatus.Uncured,
      },
    };

    const saveSlot = await saveGame(modifiedState, "Test Save", backend);

    expect(saveSlot.preview.diseasesCured).toBe(2);
  });

  it("should include outbreak count in preview", async () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const modifiedState: GameState = {
      ...state,
      outbreakCount: 5,
    };

    const saveSlot = await saveGame(modifiedState, "Test Save", backend);

    expect(saveSlot.preview.outbreakCount).toBe(5);
  });

  it("should include current player role in preview", async () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const modifiedState: GameState = {
      ...state,
      players: state.players.map((p, i) => (i === 0 ? { ...p, role: Role.Scientist } : p)),
    };

    const saveSlot = await saveGame(modifiedState, "Test Save", backend);

    expect(saveSlot.preview.currentPlayerRole).toBe(Role.Scientist);
  });

  it("should generate unique IDs for different saves", async () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });

    const slot1 = await saveGame(state, "Save 1", backend);
    const slot2 = await saveGame(state, "Save 2", backend);

    expect(slot1.id).not.toBe(slot2.id);
  });

  it("should save both game data and metadata to backend", async () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const saveSlot = await saveGame(state, "Test Save", backend);

    // Verify game data was saved
    const gameData = await backend.load(saveSlot.id);
    expect(gameData).not.toBeNull();

    // Verify metadata was saved
    const metadata = await backend.load(`${saveSlot.id}-metadata`);
    expect(metadata).not.toBeNull();
  });
});

describe("loadGame", () => {
  let backend: InMemoryBackend;

  beforeEach(() => {
    backend = new InMemoryBackend();
  });

  it("should load a saved game state", async () => {
    const original = createGame({ playerCount: 3, difficulty: 5 });
    const saveSlot = await saveGame(original, "Test Load", backend);

    const loaded = await loadGame(saveSlot.id, backend);

    expect(loaded).toEqual(original);
  });

  it("should throw an error for non-existent save slot", async () => {
    await expect(loadGame("non-existent-id", backend)).rejects.toThrow("Save slot not found");
  });

  it("should handle round-trip save/load with perfect fidelity", async () => {
    const original = createGame({ playerCount: 4, difficulty: 6 });
    const modifiedState: GameState = {
      ...original,
      currentPlayerIndex: 2,
      turnNumber: 7,
      outbreakCount: 3,
      cures: {
        [Disease.Blue]: CureStatus.Cured,
        [Disease.Yellow]: CureStatus.Uncured,
        [Disease.Black]: CureStatus.Uncured,
        [Disease.Red]: CureStatus.Uncured,
      },
    };

    const saveSlot = await saveGame(modifiedState, "Test Round Trip", backend);
    const loaded = await loadGame(saveSlot.id, backend);

    expect(loaded).toEqual(modifiedState);
    expect(loaded.turnNumber).toBe(7);
    expect(loaded.currentPlayerIndex).toBe(2);
    expect(loaded.outbreakCount).toBe(3);
    expect(loaded.cures[Disease.Blue]).toBe(CureStatus.Cured);
  });
});

describe("listSaves", () => {
  let backend: InMemoryBackend;

  beforeEach(() => {
    backend = new InMemoryBackend();
  });

  it("should return an empty array when no saves exist", async () => {
    const saves = await listSaves(backend);
    expect(saves).toEqual([]);
  });

  it("should list all saved games", async () => {
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = createGame({ playerCount: 3, difficulty: 5 });

    await saveGame(state1, "Save 1", backend);
    await saveGame(state2, "Save 2", backend);

    const saves = await listSaves(backend);

    expect(saves).toHaveLength(2);
    expect(saves.map((s) => s.name)).toContain("Save 1");
    expect(saves.map((s) => s.name)).toContain("Save 2");
  });

  it("should return saves sorted by timestamp (most recent first)", async () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });

    // Save multiple games with slight delay to ensure different timestamps
    await saveGame(state, "First", backend);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await saveGame(state, "Second", backend);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await saveGame(state, "Third", backend);

    const saves = await listSaves(backend);

    expect(saves).toHaveLength(3);
    expect(saves[0]?.name).toBe("Third");
    expect(saves[1]?.name).toBe("Second");
    expect(saves[2]?.name).toBe("First");
  });

  it("should include all save slot metadata", async () => {
    const state = createGame({ playerCount: 3, difficulty: 5 });
    const modifiedState: GameState = {
      ...state,
      turnNumber: 10,
      outbreakCount: 4,
      cures: {
        [Disease.Blue]: CureStatus.Cured,
        [Disease.Yellow]: CureStatus.Cured,
        [Disease.Black]: CureStatus.Uncured,
        [Disease.Red]: CureStatus.Uncured,
      },
    };

    await saveGame(modifiedState, "Complete Save", backend);

    const saves = await listSaves(backend);

    expect(saves).toHaveLength(1);
    const save = saves[0];
    expect(save).toBeDefined();
    if (save) {
      expect(save.name).toBe("Complete Save");
      expect(save.playerCount).toBe(3);
      expect(save.difficulty).toBe(5);
      expect(save.turnNumber).toBe(10);
      expect(save.preview.diseasesCured).toBe(2);
      expect(save.preview.outbreakCount).toBe(4);
    }
  });

  it("should skip corrupted metadata entries gracefully", async () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    await saveGame(state, "Valid Save", backend);

    // Manually add corrupted metadata
    await backend.save("corrupted-metadata", "{ invalid json");

    const saves = await listSaves(backend);

    // Should only return the valid save
    expect(saves).toHaveLength(1);
    expect(saves[0]?.name).toBe("Valid Save");
  });
});

describe("deleteSave", () => {
  let backend: InMemoryBackend;

  beforeEach(() => {
    backend = new InMemoryBackend();
  });

  it("should delete a saved game", async () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const saveSlot = await saveGame(state, "To Delete", backend);

    await deleteSave(saveSlot.id, backend);

    // Verify game data is deleted
    const gameData = await backend.load(saveSlot.id);
    expect(gameData).toBeNull();

    // Verify metadata is deleted
    const metadata = await backend.load(`${saveSlot.id}-metadata`);
    expect(metadata).toBeNull();
  });

  it("should remove save from list after deletion", async () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const slot1 = await saveGame(state, "Keep", backend);
    const slot2 = await saveGame(state, "Delete", backend);

    await deleteSave(slot2.id, backend);

    const saves = await listSaves(backend);
    expect(saves).toHaveLength(1);
    expect(saves[0]?.id).toBe(slot1.id);
  });

  it("should not throw when deleting non-existent save", async () => {
    // Should complete without error
    await expect(deleteSave("non-existent-id", backend)).resolves.toBeUndefined();
  });
});

describe("save/load integration", () => {
  let backend: InMemoryBackend;

  beforeEach(() => {
    backend = new InMemoryBackend();
  });

  it("should support saving multiple games and loading them independently", async () => {
    const game1 = createGame({ playerCount: 2, difficulty: 4 });
    const game2 = createGame({ playerCount: 3, difficulty: 5 });
    const game3 = createGame({ playerCount: 4, difficulty: 6 });

    const slot1 = await saveGame(game1, "Game 1", backend);
    const slot2 = await saveGame(game2, "Game 2", backend);
    const slot3 = await saveGame(game3, "Game 3", backend);

    const loaded1 = await loadGame(slot1.id, backend);
    const loaded2 = await loadGame(slot2.id, backend);
    const loaded3 = await loadGame(slot3.id, backend);

    expect(loaded1.config.playerCount).toBe(2);
    expect(loaded2.config.playerCount).toBe(3);
    expect(loaded3.config.playerCount).toBe(4);
  });

  it("should handle overwriting a save with the same name", async () => {
    const game1 = createGame({ playerCount: 2, difficulty: 4 });
    const game2 = createGame({ playerCount: 3, difficulty: 5 });

    const slot1 = await saveGame(game1, "My Game", backend);
    const slot2 = await saveGame(game2, "My Game", backend);

    // Both saves should exist with different IDs
    const saves = await listSaves(backend);
    expect(saves).toHaveLength(2);
    expect(saves.filter((s) => s.name === "My Game")).toHaveLength(2);

    // Each should be loadable independently
    const loaded1 = await loadGame(slot1.id, backend);
    const loaded2 = await loadGame(slot2.id, backend);

    expect(loaded1.config.playerCount).toBe(2);
    expect(loaded2.config.playerCount).toBe(3);
  });
});

describe("createGameHistory", () => {
  it("should create an empty history with default max depth", () => {
    const history = createGameHistory();

    expect(history.past).toEqual([]);
    expect(history.currentIndex).toBe(-1);
    expect(history.maxDepth).toBe(50);
  });

  it("should create an empty history with custom max depth", () => {
    const history = createGameHistory(100);

    expect(history.past).toEqual([]);
    expect(history.currentIndex).toBe(-1);
    expect(history.maxDepth).toBe(100);
  });
});

describe("pushState", () => {
  it("should add a state to empty history", () => {
    const history = createGameHistory();
    const state = createGame({ playerCount: 2, difficulty: 4 });

    const newHistory = pushState(history, state, "Initial state");

    expect(newHistory.past).toHaveLength(1);
    expect(newHistory.past[0]?.state).toEqual(state);
    expect(newHistory.past[0]?.action).toBe("Initial state");
    expect(newHistory.currentIndex).toBe(0);
  });

  it("should append states sequentially", () => {
    let history = createGameHistory();
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...state1, turnNumber: 2 };
    const state3 = { ...state1, turnNumber: 3 };

    history = pushState(history, state1, "State 1");
    history = pushState(history, state2, "State 2");
    history = pushState(history, state3, "State 3");

    expect(history.past).toHaveLength(3);
    expect(history.currentIndex).toBe(2);
    expect(history.past[0]?.action).toBe("State 1");
    expect(history.past[1]?.action).toBe("State 2");
    expect(history.past[2]?.action).toBe("State 3");
  });

  it("should enforce max depth by removing oldest entries", () => {
    let history = createGameHistory(3); // Small max depth for testing
    const baseState = createGame({ playerCount: 2, difficulty: 4 });

    // Add 5 states (exceeds max depth of 3)
    for (let i = 1; i <= 5; i++) {
      const state = { ...baseState, turnNumber: i };
      history = pushState(history, state, `State ${i}`);
    }

    // Should only keep the last 3
    expect(history.past).toHaveLength(3);
    expect(history.past[0]?.action).toBe("State 3");
    expect(history.past[1]?.action).toBe("State 4");
    expect(history.past[2]?.action).toBe("State 5");
    expect(history.currentIndex).toBe(2);
  });

  it("should clear redo stack when pushing after undo", () => {
    let history = createGameHistory();
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...state1, turnNumber: 2 };
    const state3 = { ...state1, turnNumber: 3 };
    const state4 = { ...state1, turnNumber: 4 };

    // Build history
    history = pushState(history, state1, "State 1");
    history = pushState(history, state2, "State 2");
    history = pushState(history, state3, "State 3");

    // Undo twice
    const undoResult1 = undo(history);
    expect(undoResult1).not.toBeNull();
    if (undoResult1) {
      history = undoResult1.history;
    }

    const undoResult2 = undo(history);
    expect(undoResult2).not.toBeNull();
    if (undoResult2) {
      history = undoResult2.history;
    }

    expect(history.currentIndex).toBe(0);
    expect(history.past).toHaveLength(3);

    // Push new state - should clear states 2 and 3
    history = pushState(history, state4, "State 4");

    expect(history.past).toHaveLength(2);
    expect(history.past[0]?.action).toBe("State 1");
    expect(history.past[1]?.action).toBe("State 4");
    expect(history.currentIndex).toBe(1);
  });
});

describe("undo", () => {
  it("should return null for empty history", () => {
    const history = createGameHistory();
    const result = undo(history);

    expect(result).toBeNull();
  });

  it("should return null when at the first state", () => {
    let history = createGameHistory();
    const state = createGame({ playerCount: 2, difficulty: 4 });
    history = pushState(history, state, "First state");

    const result = undo(history);

    expect(result).toBeNull();
  });

  it("should move back one state", () => {
    let history = createGameHistory();
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...state1, turnNumber: 2 };
    const state3 = { ...state1, turnNumber: 3 };

    history = pushState(history, state1, "State 1");
    history = pushState(history, state2, "State 2");
    history = pushState(history, state3, "State 3");

    const result = undo(history);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.state).toEqual(state2);
      expect(result.history.currentIndex).toBe(1);
    }
  });

  it("should allow multiple consecutive undos", () => {
    let history = createGameHistory();
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...state1, turnNumber: 2 };
    const state3 = { ...state1, turnNumber: 3 };

    history = pushState(history, state1, "State 1");
    history = pushState(history, state2, "State 2");
    history = pushState(history, state3, "State 3");

    // Undo twice
    const result1 = undo(history);
    expect(result1).not.toBeNull();
    if (result1) {
      history = result1.history;
      expect(result1.state).toEqual(state2);
    }

    const result2 = undo(history);
    expect(result2).not.toBeNull();
    if (result2) {
      history = result2.history;
      expect(result2.state).toEqual(state1);
      expect(history.currentIndex).toBe(0);
    }
  });

  it("should preserve all history entries for potential redo", () => {
    let history = createGameHistory();
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...state1, turnNumber: 2 };

    history = pushState(history, state1, "State 1");
    history = pushState(history, state2, "State 2");

    const result = undo(history);
    expect(result).not.toBeNull();
    if (result) {
      history = result.history;
      // Past should still contain both states
      expect(history.past).toHaveLength(2);
      expect(history.currentIndex).toBe(0);
    }
  });
});

describe("redo", () => {
  it("should return null for empty history", () => {
    const history = createGameHistory();
    const result = redo(history);

    expect(result).toBeNull();
  });

  it("should return null when at the latest state", () => {
    let history = createGameHistory();
    const state = createGame({ playerCount: 2, difficulty: 4 });
    history = pushState(history, state, "State 1");

    const result = redo(history);

    expect(result).toBeNull();
  });

  it("should return null when no undo has been performed", () => {
    let history = createGameHistory();
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...state1, turnNumber: 2 };

    history = pushState(history, state1, "State 1");
    history = pushState(history, state2, "State 2");

    const result = redo(history);

    expect(result).toBeNull();
  });

  it("should move forward one state after undo", () => {
    let history = createGameHistory();
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...state1, turnNumber: 2 };
    const state3 = { ...state1, turnNumber: 3 };

    history = pushState(history, state1, "State 1");
    history = pushState(history, state2, "State 2");
    history = pushState(history, state3, "State 3");

    // Undo
    const undoResult = undo(history);
    expect(undoResult).not.toBeNull();
    if (undoResult) {
      history = undoResult.history;
    }

    // Redo
    const redoResult = redo(history);
    expect(redoResult).not.toBeNull();
    if (redoResult) {
      expect(redoResult.state).toEqual(state3);
      expect(redoResult.history.currentIndex).toBe(2);
    }
  });

  it("should allow multiple consecutive redos", () => {
    let history = createGameHistory();
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...state1, turnNumber: 2 };
    const state3 = { ...state1, turnNumber: 3 };

    history = pushState(history, state1, "State 1");
    history = pushState(history, state2, "State 2");
    history = pushState(history, state3, "State 3");

    // Undo twice
    let undoResult = undo(history);
    if (undoResult) history = undoResult.history;
    undoResult = undo(history);
    if (undoResult) history = undoResult.history;

    expect(history.currentIndex).toBe(0);

    // Redo twice
    const redoResult1 = redo(history);
    expect(redoResult1).not.toBeNull();
    if (redoResult1) {
      history = redoResult1.history;
      expect(redoResult1.state).toEqual(state2);
    }

    const redoResult2 = redo(history);
    expect(redoResult2).not.toBeNull();
    if (redoResult2) {
      expect(redoResult2.state).toEqual(state3);
      expect(redoResult2.history.currentIndex).toBe(2);
    }
  });
});

describe("canUndo", () => {
  it("should return false for empty history", () => {
    const history = createGameHistory();
    const state = createGame({ playerCount: 2, difficulty: 4 });

    expect(canUndo(state, history)).toBe(false);
  });

  it("should return false when at the first state", () => {
    let history = createGameHistory();
    const state = createGame({ playerCount: 2, difficulty: 4 });
    history = pushState(history, state, "First state");

    expect(canUndo(state, history)).toBe(false);
  });

  it("should return false when not in Actions phase", () => {
    let history = createGameHistory();
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...state1, phase: TurnPhase.Draw, turnNumber: 2 };

    history = pushState(history, state1, "State 1");
    history = pushState(history, state2, "State 2");

    expect(canUndo(state2, history)).toBe(false);
  });

  it("should return true when in Actions phase with history", () => {
    let history = createGameHistory();
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...state1, phase: TurnPhase.Actions, turnNumber: 2 };

    history = pushState(history, state1, "State 1");
    history = pushState(history, state2, "State 2");

    expect(canUndo(state2, history)).toBe(true);
  });

  it("should return false during Infect phase", () => {
    let history = createGameHistory();
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...state1, phase: TurnPhase.Infect, turnNumber: 2 };

    history = pushState(history, state1, "State 1");
    history = pushState(history, state2, "State 2");

    expect(canUndo(state2, history)).toBe(false);
  });
});

describe("canRedo", () => {
  it("should return false for empty history", () => {
    const history = createGameHistory();
    const state = createGame({ playerCount: 2, difficulty: 4 });

    expect(canRedo(state, history)).toBe(false);
  });

  it("should return false when at the latest state", () => {
    let history = createGameHistory();
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...state1, turnNumber: 2 };

    history = pushState(history, state1, "State 1");
    history = pushState(history, state2, "State 2");

    expect(canRedo(state2, history)).toBe(false);
  });

  it("should return false when not in Actions phase", () => {
    let history = createGameHistory();
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...state1, turnNumber: 2 };

    history = pushState(history, state1, "State 1");
    history = pushState(history, state2, "State 2");

    // Undo
    const undoResult = undo(history);
    if (undoResult) history = undoResult.history;

    // Change phase to Draw
    const state1Draw = { ...state1, phase: TurnPhase.Draw };

    expect(canRedo(state1Draw, history)).toBe(false);
  });

  it("should return true when in Actions phase after undo", () => {
    let history = createGameHistory();
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...state1, phase: TurnPhase.Actions, turnNumber: 2 };

    history = pushState(history, state1, "State 1");
    history = pushState(history, state2, "State 2");

    // Undo
    const undoResult = undo(history);
    expect(undoResult).not.toBeNull();
    if (undoResult) {
      history = undoResult.history;
      expect(canRedo(undoResult.state, history)).toBe(true);
    }
  });

  it("should return false during Infect phase even after undo", () => {
    let history = createGameHistory();
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...state1, turnNumber: 2 };

    history = pushState(history, state1, "State 1");
    history = pushState(history, state2, "State 2");

    // Undo
    const undoResult = undo(history);
    if (undoResult) history = undoResult.history;

    // Change phase to Infect
    const state1Infect = { ...state1, phase: TurnPhase.Infect };

    expect(canRedo(state1Infect, history)).toBe(false);
  });
});

describe("undo/redo integration", () => {
  it("should support full undo/redo cycle", () => {
    let history = createGameHistory();
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...state1, turnNumber: 2 };
    const state3 = { ...state1, turnNumber: 3 };

    // Build history
    history = pushState(history, state1, "State 1");
    history = pushState(history, state2, "State 2");
    history = pushState(history, state3, "State 3");

    // Undo twice
    let result = undo(history);
    expect(result?.state).toEqual(state2);
    if (result) history = result.history;

    result = undo(history);
    expect(result?.state).toEqual(state1);
    if (result) history = result.history;

    // Redo twice
    result = redo(history);
    expect(result?.state).toEqual(state2);
    if (result) history = result.history;

    result = redo(history);
    expect(result?.state).toEqual(state3);
    if (result) history = result.history;

    expect(history.currentIndex).toBe(2);
  });

  it("should handle branching history (undo then new action)", () => {
    let history = createGameHistory();
    const state1 = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...state1, turnNumber: 2 };
    const state3 = { ...state1, turnNumber: 3 };
    const state4 = { ...state1, turnNumber: 4 };

    // Build initial history
    history = pushState(history, state1, "State 1");
    history = pushState(history, state2, "State 2");
    history = pushState(history, state3, "State 3");

    // Undo once
    const undoResult = undo(history);
    if (undoResult) history = undoResult.history;

    // Push new state - creates new branch
    history = pushState(history, state4, "State 4");

    // Should not be able to redo to state 3 anymore
    const redoResult = redo(history);
    expect(redoResult).toBeNull();

    // History should contain state 1, state 2, and state 4
    expect(history.past).toHaveLength(3);
    expect(history.past[0]?.action).toBe("State 1");
    expect(history.past[1]?.action).toBe("State 2");
    expect(history.past[2]?.action).toBe("State 4");
  });

  it("should maintain correct state after complex undo/redo sequence", () => {
    let history = createGameHistory();
    const states = Array.from({ length: 10 }, (_, i) => ({
      ...createGame({ playerCount: 2, difficulty: 4 }),
      turnNumber: i + 1,
    }));

    // Build history
    for (const state of states) {
      history = pushState(history, state, `Turn ${state.turnNumber}`);
    }

    expect(history.past).toHaveLength(10);
    expect(history.currentIndex).toBe(9);

    // Undo 5 times
    for (let i = 0; i < 5; i++) {
      const result = undo(history);
      if (result) history = result.history;
    }

    expect(history.currentIndex).toBe(4);

    // Redo 3 times
    for (let i = 0; i < 3; i++) {
      const result = redo(history);
      if (result) history = result.history;
    }

    expect(history.currentIndex).toBe(7);

    // Undo 2 times
    for (let i = 0; i < 2; i++) {
      const result = undo(history);
      if (result) history = result.history;
    }

    expect(history.currentIndex).toBe(5);
    expect(history.past).toHaveLength(10);
  });
});

describe("exportReplay", () => {
  it("should export a replay to a JSON string", () => {
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...initialState, turnNumber: 2 };
    const state3 = { ...initialState, turnNumber: 3 };

    const replay = createReplay(initialState, [
      { action: "Drive to Paris", result: state2 },
      { action: "Treat disease", result: state3 },
    ]);

    const json = exportReplay(replay);

    expect(typeof json).toBe("string");
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("should export a replay with proper formatting (pretty-printed)", () => {
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    const replay = createReplay(initialState, []);

    const json = exportReplay(replay);

    // Check that the JSON is pretty-printed (contains newlines and indentation)
    expect(json).toContain("\n");
    expect(json).toContain("  ");
  });

  it("should include all replay data in the exported JSON", () => {
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...initialState, turnNumber: 2 };

    const replay = createReplay(initialState, [{ action: "Test action", result: state2 }]);

    const json = exportReplay(replay);
    const parsed = JSON.parse(json);

    expect(parsed.initialState).toBeDefined();
    expect(parsed.actions).toBeDefined();
    expect(parsed.metadata).toBeDefined();
    expect(parsed.actions).toHaveLength(1);
    expect(parsed.actions[0].action).toBe("Test action");
  });

  it("should export replay metadata correctly", () => {
    const initialState = createGame({ playerCount: 3, difficulty: 5 });
    const replay = createReplay(initialState, []);

    const json = exportReplay(replay);
    const parsed = JSON.parse(json);

    expect(parsed.metadata.playerRoles).toHaveLength(3);
    expect(parsed.metadata.difficulty).toBe(5);
    expect(parsed.metadata.finalOutcome).toBeDefined();
    expect(parsed.metadata.totalTurns).toBeDefined();
    expect(parsed.metadata.timestamp).toBeDefined();
  });
});

describe("importReplay", () => {
  it("should import an exported replay with perfect fidelity", () => {
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    const state2 = { ...initialState, turnNumber: 2 };

    const original = createReplay(initialState, [{ action: "Test action", result: state2 }]);

    const json = exportReplay(original);
    const imported = importReplay(json);

    expect(imported).toEqual(original);
  });

  it("should handle round-trip export/import multiple times", () => {
    const initialState = createGame({ playerCount: 3, difficulty: 5 });
    const state2 = { ...initialState, turnNumber: 2 };
    const state3 = { ...initialState, turnNumber: 3 };

    const replay1 = createReplay(initialState, [
      { action: "Action 1", result: state2 },
      { action: "Action 2", result: state3 },
    ]);

    // Export, import, export, import
    const json1 = exportReplay(replay1);
    const replay2 = importReplay(json1);
    const json2 = exportReplay(replay2);
    const replay3 = importReplay(json2);

    expect(replay3).toEqual(replay1);
  });

  it("should throw ReplayImportError for invalid JSON", () => {
    const invalidJson = "{ this is not valid json }";

    expect(() => importReplay(invalidJson)).toThrow(ReplayImportError);
    expect(() => importReplay(invalidJson)).toThrow("Invalid JSON");
  });

  it("should throw ReplayImportError for non-object data", () => {
    const jsonString = JSON.stringify("just a string");

    expect(() => importReplay(jsonString)).toThrow(ReplayImportError);
    expect(() => importReplay(jsonString)).toThrow("not an object");
  });

  it("should throw ReplayImportError for null data", () => {
    const jsonNull = JSON.stringify(null);

    expect(() => importReplay(jsonNull)).toThrow(ReplayImportError);
    expect(() => importReplay(jsonNull)).toThrow("not an object");
  });

  it("should throw ReplayImportError for missing initialState", () => {
    const invalid = JSON.stringify({
      actions: [],
      metadata: {
        playerRoles: [],
        difficulty: 4,
        finalOutcome: "ongoing",
        totalTurns: 1,
        timestamp: Date.now(),
      },
    });

    expect(() => importReplay(invalid)).toThrow(ReplayImportError);
    expect(() => importReplay(invalid)).toThrow("initialState");
  });

  it("should throw ReplayImportError for missing actions", () => {
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    const invalid = JSON.stringify({
      initialState,
      metadata: {
        playerRoles: [],
        difficulty: 4,
        finalOutcome: "ongoing",
        totalTurns: 1,
        timestamp: Date.now(),
      },
    });

    expect(() => importReplay(invalid)).toThrow(ReplayImportError);
    expect(() => importReplay(invalid)).toThrow("actions");
  });

  it("should throw ReplayImportError for non-array actions", () => {
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    const invalid = JSON.stringify({
      initialState,
      actions: "not an array",
      metadata: {
        playerRoles: [],
        difficulty: 4,
        finalOutcome: "ongoing",
        totalTurns: 1,
        timestamp: Date.now(),
      },
    });

    expect(() => importReplay(invalid)).toThrow(ReplayImportError);
    expect(() => importReplay(invalid)).toThrow("actions array");
  });

  it("should throw ReplayImportError for missing metadata", () => {
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    const invalid = JSON.stringify({
      initialState,
      actions: [],
    });

    expect(() => importReplay(invalid)).toThrow(ReplayImportError);
    expect(() => importReplay(invalid)).toThrow("metadata");
  });

  it("should throw ReplayImportError for invalid action structure", () => {
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    const invalid = JSON.stringify({
      initialState,
      actions: [{ action: "Valid", result: initialState }, "not an object"],
      metadata: {
        playerRoles: [],
        difficulty: 4,
        finalOutcome: "ongoing",
        totalTurns: 1,
        timestamp: Date.now(),
      },
    });

    expect(() => importReplay(invalid)).toThrow(ReplayImportError);
    expect(() => importReplay(invalid)).toThrow("Action at index 1");
  });

  it("should throw ReplayImportError for action missing action string", () => {
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    const invalid = JSON.stringify({
      initialState,
      actions: [{ result: initialState }],
      metadata: {
        playerRoles: [],
        difficulty: 4,
        finalOutcome: "ongoing",
        totalTurns: 1,
        timestamp: Date.now(),
      },
    });

    expect(() => importReplay(invalid)).toThrow(ReplayImportError);
    expect(() => importReplay(invalid)).toThrow("missing action string");
  });

  it("should throw ReplayImportError for action missing result state", () => {
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    const invalid = JSON.stringify({
      initialState,
      actions: [{ action: "Test" }],
      metadata: {
        playerRoles: [],
        difficulty: 4,
        finalOutcome: "ongoing",
        totalTurns: 1,
        timestamp: Date.now(),
      },
    });

    expect(() => importReplay(invalid)).toThrow(ReplayImportError);
    expect(() => importReplay(invalid)).toThrow("missing result state");
  });

  it("should throw ReplayImportError for missing metadata.playerRoles", () => {
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    const invalid = JSON.stringify({
      initialState,
      actions: [],
      metadata: { difficulty: 4, finalOutcome: "ongoing", totalTurns: 1, timestamp: Date.now() },
    });

    expect(() => importReplay(invalid)).toThrow(ReplayImportError);
    expect(() => importReplay(invalid)).toThrow("playerRoles");
  });

  it("should throw ReplayImportError for missing metadata.difficulty", () => {
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    const invalid = JSON.stringify({
      initialState,
      actions: [],
      metadata: { playerRoles: [], finalOutcome: "ongoing", totalTurns: 1, timestamp: Date.now() },
    });

    expect(() => importReplay(invalid)).toThrow(ReplayImportError);
    expect(() => importReplay(invalid)).toThrow("difficulty");
  });

  it("should throw ReplayImportError for missing metadata.finalOutcome", () => {
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    const invalid = JSON.stringify({
      initialState,
      actions: [],
      metadata: { playerRoles: [], difficulty: 4, totalTurns: 1, timestamp: Date.now() },
    });

    expect(() => importReplay(invalid)).toThrow(ReplayImportError);
    expect(() => importReplay(invalid)).toThrow("finalOutcome");
  });

  it("should throw ReplayImportError for missing metadata.totalTurns", () => {
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    const invalid = JSON.stringify({
      initialState,
      actions: [],
      metadata: { playerRoles: [], difficulty: 4, finalOutcome: "ongoing", timestamp: Date.now() },
    });

    expect(() => importReplay(invalid)).toThrow(ReplayImportError);
    expect(() => importReplay(invalid)).toThrow("totalTurns");
  });

  it("should throw ReplayImportError for missing metadata.timestamp", () => {
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    const invalid = JSON.stringify({
      initialState,
      actions: [],
      metadata: { playerRoles: [], difficulty: 4, finalOutcome: "ongoing", totalTurns: 1 },
    });

    expect(() => importReplay(invalid)).toThrow(ReplayImportError);
    expect(() => importReplay(invalid)).toThrow("timestamp");
  });

  it("should successfully import a replay with multiple actions", () => {
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    const states = Array.from({ length: 5 }, (_, i) => ({
      ...initialState,
      turnNumber: i + 1,
    }));

    const actions = states.map((state, i) => ({
      action: `Action ${i + 1}`,
      result: state,
    }));

    const original = createReplay(initialState, actions);
    const json = exportReplay(original);
    const imported = importReplay(json);

    expect(imported.actions).toHaveLength(5);
    expect(imported.actions[0]?.action).toBe("Action 1");
    expect(imported.actions[4]?.action).toBe("Action 5");
  });

  it("should preserve complex game state through export/import", () => {
    const initialState = createGame({ playerCount: 4, difficulty: 6 });
    // Modify the state to have some interesting data
    const modifiedState = {
      ...initialState,
      turnNumber: 5,
      outbreakCount: 3,
      cures: {
        ...initialState.cures,
        [Disease.Blue]: "cured" as const,
        [Disease.Yellow]: "eradicated" as const,
      },
    };

    const replay = createReplay(initialState, [
      { action: "Complex action", result: modifiedState },
    ]);
    const json = exportReplay(replay);
    const imported = importReplay(json);

    expect(imported.actions[0]?.result.turnNumber).toBe(5);
    expect(imported.actions[0]?.result.outbreakCount).toBe(3);
    expect(imported.actions[0]?.result.cures[Disease.Blue]).toBe("cured");
    expect(imported.actions[0]?.result.cures[Disease.Yellow]).toBe("eradicated");
  });
});
