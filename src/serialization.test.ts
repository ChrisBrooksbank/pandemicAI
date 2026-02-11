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
} from "./serialization";
import { createGame } from "./game";
import { GameState, Disease, Role, CureStatus } from "./types";

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
