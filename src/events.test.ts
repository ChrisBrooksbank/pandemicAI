// Tests for event card functionality
import { describe, it, expect } from "vitest";
import { playEventCard, hasEventCard } from "./events";
import {
  Disease,
  EventType,
  GameStatus,
  Role,
  TurnPhase,
  CureStatus,
  type GameState,
  type EventCard,
} from "./types";

describe("Event Card Playability", () => {
  // Helper to create a minimal game state for testing
  const createTestGameState = (): GameState => ({
    config: { playerCount: 2, difficulty: 4 },
    players: [
      {
        role: Role.Medic,
        location: "Atlanta",
        hand: [
          { type: "city", city: "Chicago", color: Disease.Blue },
          { type: "event", event: EventType.Airlift },
        ],
      },
      {
        role: Role.Scientist,
        location: "Atlanta",
        hand: [{ type: "city", city: "Paris", color: Disease.Blue }],
      },
    ],
    currentPlayerIndex: 0,
    phase: TurnPhase.Actions,
    actionsRemaining: 4,
    board: {
      Atlanta: {
        blue: 0,
        yellow: 0,
        black: 0,
        red: 0,
        hasResearchStation: true,
      },
      Chicago: {
        blue: 1,
        yellow: 0,
        black: 0,
        red: 0,
        hasResearchStation: false,
      },
      Paris: {
        blue: 0,
        yellow: 0,
        black: 0,
        red: 0,
        hasResearchStation: false,
      },
    },
    cures: {
      [Disease.Blue]: CureStatus.Uncured,
      [Disease.Yellow]: CureStatus.Uncured,
      [Disease.Black]: CureStatus.Uncured,
      [Disease.Red]: CureStatus.Uncured,
    },
    cubeSupply: {
      [Disease.Blue]: 23,
      [Disease.Yellow]: 24,
      [Disease.Black]: 24,
      [Disease.Red]: 24,
    },
    infectionRatePosition: 1,
    outbreakCount: 0,
    playerDeck: [],
    playerDiscard: [],
    infectionDeck: [],
    infectionDiscard: [],
    status: GameStatus.Ongoing,
    operationsExpertSpecialMoveUsed: false,
  });

  describe("playEventCard", () => {
    it("should successfully play an event card from the current player's hand", () => {
      const state = createTestGameState();
      const result = playEventCard(state, EventType.Airlift);

      expect(result.success).toBe(true);
      if (result.success) {
        // Event card should be removed from hand
        expect(result.state.players[0]?.hand).toHaveLength(1);
        expect(result.state.players[0]?.hand[0]).toEqual({
          type: "city",
          city: "Chicago",
          color: Disease.Blue,
        });

        // Event card should be in discard pile
        expect(result.state.playerDiscard).toHaveLength(1);
        expect(result.state.playerDiscard[0]).toEqual({
          type: "event",
          event: EventType.Airlift,
        });
      }
    });

    it("should work during any turn phase (not just action phase)", () => {
      const state = createTestGameState();

      // Test during draw phase
      const drawPhaseState = { ...state, phase: TurnPhase.Draw };
      const drawResult = playEventCard(drawPhaseState, EventType.Airlift);
      expect(drawResult.success).toBe(true);

      // Test during infect phase
      const infectPhaseState = { ...state, phase: TurnPhase.Infect };
      const infectResult = playEventCard(infectPhaseState, EventType.Airlift);
      expect(infectResult.success).toBe(true);
    });

    it("should not cost an action (actionsRemaining unchanged)", () => {
      const state = createTestGameState();
      const result = playEventCard(state, EventType.Airlift);

      expect(result.success).toBe(true);
      if (result.success) {
        // Actions remaining should be unchanged
        expect(result.state.actionsRemaining).toBe(4);
      }
    });

    it("should work even when actionsRemaining is 0", () => {
      const state = createTestGameState();
      const stateNoActions = { ...state, actionsRemaining: 0 };

      const result = playEventCard(stateNoActions, EventType.Airlift);
      expect(result.success).toBe(true);
    });

    it("should fail if player doesn't have the event card", () => {
      const state = createTestGameState();
      const result = playEventCard(state, EventType.Forecast);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("does not have");
      }
    });

    it("should fail if game is not ongoing", () => {
      const state = createTestGameState();
      const wonState = { ...state, status: GameStatus.Won };

      const result = playEventCard(wonState, EventType.Airlift);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("game has ended");
      }
    });

    it("should allow specifying a different player index", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      // Give player 1 an event card
      const stateWithEvent: GameState = {
        ...state,
        players: [
          player0,
          {
            ...player1,
            hand: [
              { type: "city", city: "Paris", color: Disease.Blue },
              { type: "event", event: EventType.GovernmentGrant },
            ],
          },
        ],
      };

      const result = playEventCard(stateWithEvent, EventType.GovernmentGrant, 1);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[1]?.hand).toHaveLength(1);
        expect(result.state.playerDiscard).toHaveLength(1);
      }
    });

    it("should play stored event from Contingency Planner", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const eventCard: EventCard = { type: "event", event: EventType.Forecast };
      const stateWithStored: GameState = {
        ...state,
        players: [
          {
            ...player0,
            role: Role.ContingencyPlanner,
            storedEventCard: eventCard,
          },
          player1,
        ],
      };

      const result = playEventCard(stateWithStored, EventType.Forecast);
      expect(result.success).toBe(true);
      if (result.success) {
        // Stored event should be cleared
        expect(result.state.players[0]?.storedEventCard).toBeUndefined();
        // Stored event should NOT go to discard (removed from game)
        expect(result.state.playerDiscard).toHaveLength(0);
      }
    });

    it("should prefer hand over stored event when both exist", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const eventCard: EventCard = { type: "event", event: EventType.Airlift };
      const stateWithBoth: GameState = {
        ...state,
        players: [
          {
            ...player0,
            role: Role.ContingencyPlanner,
            hand: [
              { type: "city", city: "Chicago", color: Disease.Blue },
              { type: "event", event: EventType.Airlift },
            ],
            storedEventCard: eventCard,
          },
          player1,
        ],
      };

      const result = playEventCard(stateWithBoth, EventType.Airlift);
      expect(result.success).toBe(true);
      if (result.success) {
        // Hand event should be used
        expect(result.state.players[0]?.hand).toHaveLength(1);
        // Stored event should still be there
        expect(result.state.players[0]?.storedEventCard).toEqual(eventCard);
        // Event should go to discard (not removed from game)
        expect(result.state.playerDiscard).toHaveLength(1);
      }
    });
  });

  describe("hasEventCard", () => {
    it("should return true if player has event in hand", () => {
      const state = createTestGameState();
      expect(hasEventCard(state, EventType.Airlift)).toBe(true);
    });

    it("should return false if player doesn't have event", () => {
      const state = createTestGameState();
      expect(hasEventCard(state, EventType.Forecast)).toBe(false);
    });

    it("should return true if event is stored (Contingency Planner)", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const eventCard: EventCard = { type: "event", event: EventType.Forecast };
      const stateWithStored: GameState = {
        ...state,
        players: [
          {
            ...player0,
            role: Role.ContingencyPlanner,
            storedEventCard: eventCard,
          },
          player1,
        ],
      };

      expect(hasEventCard(stateWithStored, EventType.Forecast)).toBe(true);
    });

    it("should work with specified player index", () => {
      const state = createTestGameState();
      expect(hasEventCard(state, EventType.Airlift, 0)).toBe(true);
      expect(hasEventCard(state, EventType.Airlift, 1)).toBe(false);
    });

    it("should return false for invalid player index", () => {
      const state = createTestGameState();
      expect(hasEventCard(state, EventType.Airlift, 999)).toBe(false);
    });
  });
});
