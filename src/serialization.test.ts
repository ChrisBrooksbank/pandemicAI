// Tests for serialization and deserialization functionality

import { describe, it, expect } from "vitest";
import { serializeGame, deserializeGame, DeserializationError } from "./serialization";
import { createGame } from "./game";
import { GameState, Disease, Role } from "./types";

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
