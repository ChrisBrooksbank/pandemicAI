// Tests for event card functionality
import { describe, it, expect } from "vitest";
import {
  playEventCard,
  hasEventCard,
  airlift,
  forecast,
  governmentGrant,
  oneQuietNight,
  resilientPopulation,
} from "./events";
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
      Essen: {
        blue: 0,
        yellow: 0,
        black: 0,
        red: 0,
        hasResearchStation: false,
      },
      Washington: {
        blue: 0,
        yellow: 0,
        black: 0,
        red: 0,
        hasResearchStation: false,
      },
      London: {
        blue: 0,
        yellow: 0,
        black: 0,
        red: 0,
        hasResearchStation: false,
      },
      Madrid: {
        blue: 0,
        yellow: 0,
        black: 0,
        red: 0,
        hasResearchStation: false,
      },
      Milan: {
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
    skipNextInfectionPhase: false,
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

  describe("airlift", () => {
    it("should move any player to any city", () => {
      const state = createTestGameState();
      const result = airlift(state, 1, "Paris");

      expect(result.success).toBe(true);
      if (result.success) {
        // Player 1 should be moved to Paris
        expect(result.state.players[1]?.location).toBe("Paris");
        // Player 0 should remain in Atlanta
        expect(result.state.players[0]?.location).toBe("Atlanta");
        // Event card should be removed from hand
        expect(result.state.players[0]?.hand).toHaveLength(1);
        // Event card should be in discard pile
        expect(result.state.playerDiscard).toHaveLength(1);
      }
    });

    it("should allow moving the current player", () => {
      const state = createTestGameState();
      const result = airlift(state, 0, "Chicago");

      expect(result.success).toBe(true);
      if (result.success) {
        // Player 0 should be moved to Chicago
        expect(result.state.players[0]?.location).toBe("Chicago");
      }
    });

    it("should work even if player is already at destination", () => {
      const state = createTestGameState();
      const result = airlift(state, 0, "Atlanta");

      expect(result.success).toBe(true);
      if (result.success) {
        // Player 0 should remain in Atlanta
        expect(result.state.players[0]?.location).toBe("Atlanta");
        // Event should still be played
        expect(result.state.playerDiscard).toHaveLength(1);
      }
    });

    it("should fail if event card is not in hand", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      // Remove Airlift from player 0's hand
      const stateNoEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "city", city: "Chicago", color: Disease.Blue }],
          },
          player1,
        ],
      };

      const result = airlift(stateNoEvent, 1, "Paris");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("does not have");
      }
    });

    it("should fail with invalid destination city", () => {
      const state = createTestGameState();
      const result = airlift(state, 1, "InvalidCity");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid destination city");
      }
    });

    it("should fail with invalid target player index", () => {
      const state = createTestGameState();
      const result = airlift(state, 999, "Paris");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid target player index");
      }
    });

    it("should allow a different player to play the event", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      // Give player 1 the Airlift card
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "city", city: "Chicago", color: Disease.Blue }],
          },
          {
            ...player1,
            hand: [
              { type: "city", city: "Paris", color: Disease.Blue },
              { type: "event", event: EventType.Airlift },
            ],
          },
        ],
      };

      // Player 1 plays Airlift to move player 0 to Paris
      const result = airlift(stateWithEvent, 0, "Paris", 1);
      expect(result.success).toBe(true);
      if (result.success) {
        // Player 0 should be moved to Paris
        expect(result.state.players[0]?.location).toBe("Paris");
        // Player 1's hand should have the event removed
        expect(result.state.players[1]?.hand).toHaveLength(1);
      }
    });

    it("should work with stored event from Contingency Planner", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const eventCard: EventCard = { type: "event", event: EventType.Airlift };
      const stateWithStored: GameState = {
        ...state,
        players: [
          {
            ...player0,
            role: Role.ContingencyPlanner,
            hand: [{ type: "city", city: "Chicago", color: Disease.Blue }],
            storedEventCard: eventCard,
          },
          player1,
        ],
      };

      const result = airlift(stateWithStored, 1, "Chicago");
      expect(result.success).toBe(true);
      if (result.success) {
        // Player 1 should be moved to Chicago
        expect(result.state.players[1]?.location).toBe("Chicago");
        // Stored event should be cleared
        expect(result.state.players[0]?.storedEventCard).toBeUndefined();
        // Stored event should NOT go to discard (removed from game)
        expect(result.state.playerDiscard).toHaveLength(0);
      }
    });

    it("should not cost an action", () => {
      const state = createTestGameState();
      const result = airlift(state, 1, "Paris");

      expect(result.success).toBe(true);
      if (result.success) {
        // Actions remaining should be unchanged
        expect(result.state.actionsRemaining).toBe(4);
      }
    });
  });

  describe("governmentGrant", () => {
    it("should build a research station in any city without card discard", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      // Give player 0 Government Grant event
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [
              { type: "city", city: "Chicago", color: Disease.Blue },
              { type: "event", event: EventType.GovernmentGrant },
            ],
          },
          player1,
        ],
      };

      const result = governmentGrant(stateWithEvent, "Paris");

      expect(result.success).toBe(true);
      if (result.success) {
        // Paris should now have a research station
        expect(result.state.board["Paris"]?.hasResearchStation).toBe(true);
        // Event card should be removed from hand
        expect(result.state.players[0]?.hand).toHaveLength(1);
        // Event card should be in discard pile
        expect(result.state.playerDiscard).toHaveLength(1);
        // City card should still be in hand (not discarded)
        expect(result.state.players[0]?.hand[0]).toEqual({
          type: "city",
          city: "Chicago",
          color: Disease.Blue,
        });
      }
    });

    it("should build a station without player being at that location", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            location: "Atlanta", // Player is in Atlanta
            hand: [{ type: "event", event: EventType.GovernmentGrant }],
          },
          player1,
        ],
      };

      // Build station in Paris (remote city)
      const result = governmentGrant(stateWithEvent, "Paris");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.board["Paris"]?.hasResearchStation).toBe(true);
        expect(result.state.players[0]?.location).toBe("Atlanta"); // Player stays in Atlanta
      }
    });

    it("should fail if target city already has a research station", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.GovernmentGrant }],
          },
          player1,
        ],
      };

      // Try to build in Atlanta (already has a station)
      const result = governmentGrant(stateWithEvent, "Atlanta");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("research station already exists");
      }
    });

    it("should fail with invalid target city", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.GovernmentGrant }],
          },
          player1,
        ],
      };

      const result = governmentGrant(stateWithEvent, "InvalidCity");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid target city");
      }
    });

    it("should handle 6 station limit by moving one", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      // Create state with 6 research stations
      const atlantaState = state.board["Atlanta"];
      const chicagoState = state.board["Chicago"];
      const parisState = state.board["Paris"];
      if (!atlantaState || !chicagoState || !parisState) {
        throw new Error("Test setup failed: missing cities");
      }
      const stateWith6Stations: GameState = {
        ...state,
        board: {
          ...state.board,
          Atlanta: { ...atlantaState, hasResearchStation: true },
          Chicago: { ...chicagoState, hasResearchStation: true },
          Paris: { ...parisState, hasResearchStation: true },
          London: { blue: 0, yellow: 0, black: 0, red: 0, hasResearchStation: true },
          Madrid: { blue: 0, yellow: 0, black: 0, red: 0, hasResearchStation: true },
          Milan: { blue: 0, yellow: 0, black: 0, red: 0, hasResearchStation: true },
        },
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.GovernmentGrant }],
          },
          player1,
        ],
      };

      // Build in Essen, removing station from Milan
      const result = governmentGrant(
        stateWith6Stations,
        "Essen",
        "Milan", // Remove station from Milan
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Essen should have a station
        expect(result.state.board["Essen"]?.hasResearchStation).toBe(true);
        // Milan should no longer have a station
        expect(result.state.board["Milan"]?.hasResearchStation).toBe(false);
        // Other stations should remain
        expect(result.state.board["Atlanta"]?.hasResearchStation).toBe(true);
        expect(result.state.board["Chicago"]?.hasResearchStation).toBe(true);
        expect(result.state.board["Paris"]?.hasResearchStation).toBe(true);
        expect(result.state.board["London"]?.hasResearchStation).toBe(true);
        expect(result.state.board["Madrid"]?.hasResearchStation).toBe(true);
      }
    });

    it("should fail when 6 stations exist but no city specified for removal", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const atlantaState = state.board["Atlanta"];
      const chicagoState = state.board["Chicago"];
      const parisState = state.board["Paris"];
      if (!atlantaState || !chicagoState || !parisState) {
        throw new Error("Test setup failed: missing cities");
      }
      const stateWith6Stations: GameState = {
        ...state,
        board: {
          ...state.board,
          Atlanta: { ...atlantaState, hasResearchStation: true },
          Chicago: { ...chicagoState, hasResearchStation: true },
          Paris: { ...parisState, hasResearchStation: true },
          London: { blue: 0, yellow: 0, black: 0, red: 0, hasResearchStation: true },
          Madrid: { blue: 0, yellow: 0, black: 0, red: 0, hasResearchStation: true },
          Milan: { blue: 0, yellow: 0, black: 0, red: 0, hasResearchStation: true },
        },
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.GovernmentGrant }],
          },
          player1,
        ],
      };

      const result = governmentGrant(stateWith6Stations, "Essen");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("all 6 stations are in use");
      }
    });

    it("should fail if trying to remove station when less than 6 exist", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.GovernmentGrant }],
          },
          player1,
        ],
      };

      // Try to build in Paris while removing Atlanta (only 1 station exists)
      const result = governmentGrant(stateWithEvent, "Paris", "Atlanta");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("only remove stations when all 6 are in use");
      }
    });

    it("should fail if city to remove doesn't have a station", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const atlantaState = state.board["Atlanta"];
      const chicagoState = state.board["Chicago"];
      const parisState = state.board["Paris"];
      if (!atlantaState || !chicagoState || !parisState) {
        throw new Error("Test setup failed: missing cities");
      }
      const stateWith6Stations: GameState = {
        ...state,
        board: {
          ...state.board,
          Atlanta: { ...atlantaState, hasResearchStation: true },
          Chicago: { ...chicagoState, hasResearchStation: true },
          Paris: { ...parisState, hasResearchStation: true },
          London: { blue: 0, yellow: 0, black: 0, red: 0, hasResearchStation: true },
          Madrid: { blue: 0, yellow: 0, black: 0, red: 0, hasResearchStation: true },
          Milan: { blue: 0, yellow: 0, black: 0, red: 0, hasResearchStation: true },
        },
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.GovernmentGrant }],
          },
          player1,
        ],
      };

      // Try to remove station from Essen (which doesn't have one)
      const result = governmentGrant(stateWith6Stations, "Washington", "Essen");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("no research station exists there");
      }
    });

    it("should work with stored event from Contingency Planner", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const eventCard: EventCard = { type: "event", event: EventType.GovernmentGrant };
      const stateWithStored: GameState = {
        ...state,
        players: [
          {
            ...player0,
            role: Role.ContingencyPlanner,
            hand: [],
            storedEventCard: eventCard,
          },
          player1,
        ],
      };

      const result = governmentGrant(stateWithStored, "Chicago");

      expect(result.success).toBe(true);
      if (result.success) {
        // Chicago should have a research station
        expect(result.state.board["Chicago"]?.hasResearchStation).toBe(true);
        // Stored event should be cleared
        expect(result.state.players[0]?.storedEventCard).toBeUndefined();
        // Stored event should NOT go to discard (removed from game)
        expect(result.state.playerDiscard).toHaveLength(0);
      }
    });

    it("should not cost an action", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.GovernmentGrant }],
          },
          player1,
        ],
      };

      const result = governmentGrant(stateWithEvent, "Chicago");

      expect(result.success).toBe(true);
      if (result.success) {
        // Actions remaining should be unchanged
        expect(result.state.actionsRemaining).toBe(4);
      }
    });

    it("should work during any turn phase", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.GovernmentGrant }],
          },
          player1,
        ],
      };

      // Test during draw phase
      const drawPhaseState = { ...stateWithEvent, phase: TurnPhase.Draw };
      const drawResult = governmentGrant(drawPhaseState, "Chicago");
      expect(drawResult.success).toBe(true);

      // Test during infect phase
      const infectPhaseState = { ...stateWithEvent, phase: TurnPhase.Infect };
      const infectResult = governmentGrant(infectPhaseState, "Chicago");
      expect(infectResult.success).toBe(true);
    });

    it("should allow a different player to play the event", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "city", city: "Chicago", color: Disease.Blue }],
          },
          {
            ...player1,
            hand: [
              { type: "city", city: "Paris", color: Disease.Blue },
              { type: "event", event: EventType.GovernmentGrant },
            ],
          },
        ],
      };

      // Player 1 plays Government Grant
      const result = governmentGrant(stateWithEvent, "Chicago", undefined, 1);
      expect(result.success).toBe(true);
      if (result.success) {
        // Chicago should have a station
        expect(result.state.board["Chicago"]?.hasResearchStation).toBe(true);
        // Player 1's hand should have the event removed
        expect(result.state.players[1]?.hand).toHaveLength(1);
      }
    });

    it("should fail if player doesn't have the event card", () => {
      const state = createTestGameState();
      const result = governmentGrant(state, "Chicago");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("does not have");
      }
    });
  });

  describe("oneQuietNight", () => {
    it("should set skipNextInfectionPhase flag to true", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.OneQuietNight }],
          },
          player1,
        ],
      };

      const result = oneQuietNight(stateWithEvent);

      expect(result.success).toBe(true);
      if (result.success) {
        // Flag should be set to skip next infection phase
        expect(result.state.skipNextInfectionPhase).toBe(true);
        // Event card should be removed from hand
        expect(result.state.players[0]?.hand).toHaveLength(0);
        // Event card should be in discard pile
        expect(result.state.playerDiscard).toHaveLength(1);
        expect(result.state.playerDiscard[0]).toEqual({
          type: "event",
          event: EventType.OneQuietNight,
        });
      }
    });

    it("should work during any turn phase", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.OneQuietNight }],
          },
          player1,
        ],
      };

      // Test during draw phase
      const drawPhaseState = { ...stateWithEvent, phase: TurnPhase.Draw };
      const drawResult = oneQuietNight(drawPhaseState);
      expect(drawResult.success).toBe(true);
      if (drawResult.success) {
        expect(drawResult.state.skipNextInfectionPhase).toBe(true);
      }

      // Test during infect phase
      const infectPhaseState = { ...stateWithEvent, phase: TurnPhase.Infect };
      const infectResult = oneQuietNight(infectPhaseState);
      expect(infectResult.success).toBe(true);
      if (infectResult.success) {
        expect(infectResult.state.skipNextInfectionPhase).toBe(true);
      }
    });

    it("should not cost an action", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.OneQuietNight }],
          },
          player1,
        ],
      };

      const result = oneQuietNight(stateWithEvent);

      expect(result.success).toBe(true);
      if (result.success) {
        // Actions remaining should be unchanged
        expect(result.state.actionsRemaining).toBe(4);
      }
    });

    it("should fail if player doesn't have the event card", () => {
      const state = createTestGameState();
      const result = oneQuietNight(state);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("does not have");
      }
    });

    it("should fail if game is not ongoing", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const wonState: GameState = {
        ...state,
        status: GameStatus.Won,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.OneQuietNight }],
          },
          player1,
        ],
      };

      const result = oneQuietNight(wonState);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("game has ended");
      }
    });

    it("should allow a different player to play the event", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "city", city: "Chicago", color: Disease.Blue }],
          },
          {
            ...player1,
            hand: [{ type: "event", event: EventType.OneQuietNight }],
          },
        ],
      };

      const result = oneQuietNight(stateWithEvent, 1);
      expect(result.success).toBe(true);
      if (result.success) {
        // Flag should be set
        expect(result.state.skipNextInfectionPhase).toBe(true);
        // Player 1's hand should have the event removed
        expect(result.state.players[1]?.hand).toHaveLength(0);
      }
    });

    it("should work with stored event from Contingency Planner", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const eventCard: EventCard = { type: "event", event: EventType.OneQuietNight };
      const stateWithStored: GameState = {
        ...state,
        players: [
          {
            ...player0,
            role: Role.ContingencyPlanner,
            hand: [],
            storedEventCard: eventCard,
          },
          player1,
        ],
      };

      const result = oneQuietNight(stateWithStored);
      expect(result.success).toBe(true);
      if (result.success) {
        // Flag should be set
        expect(result.state.skipNextInfectionPhase).toBe(true);
        // Stored event should be cleared
        expect(result.state.players[0]?.storedEventCard).toBeUndefined();
        // Stored event should NOT go to discard (removed from game)
        expect(result.state.playerDiscard).toHaveLength(0);
      }
    });
  });

  describe("resilientPopulation", () => {
    it("should remove a card from infection discard pile", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.ResilientPopulation }],
          },
          player1,
        ],
        infectionDiscard: [
          { city: "Chicago", color: Disease.Blue },
          { city: "Paris", color: Disease.Blue },
          { city: "Atlanta", color: Disease.Blue },
        ],
      };

      const result = resilientPopulation(stateWithEvent, "Paris");

      expect(result.success).toBe(true);
      if (result.success) {
        // Paris should be removed from infection discard
        expect(result.state.infectionDiscard).toHaveLength(2);
        expect(result.state.infectionDiscard.some((card) => card.city === "Paris")).toBe(false);
        expect(result.state.infectionDiscard.some((card) => card.city === "Chicago")).toBe(true);
        expect(result.state.infectionDiscard.some((card) => card.city === "Atlanta")).toBe(true);
        // Event card should be removed from hand
        expect(result.state.players[0]?.hand).toHaveLength(0);
        // Event card should be in discard pile
        expect(result.state.playerDiscard).toHaveLength(1);
      }
    });

    it("should permanently remove the card (not just discard)", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.ResilientPopulation }],
          },
          player1,
        ],
        infectionDeck: [
          { city: "London", color: Disease.Blue },
          { city: "Madrid", color: Disease.Blue },
        ],
        infectionDiscard: [
          { city: "Chicago", color: Disease.Blue },
          { city: "Paris", color: Disease.Blue },
        ],
      };

      const result = resilientPopulation(stateWithEvent, "Chicago");

      expect(result.success).toBe(true);
      if (result.success) {
        // Chicago should be gone from infection discard
        expect(result.state.infectionDiscard).toHaveLength(1);
        expect(result.state.infectionDiscard.some((card) => card.city === "Chicago")).toBe(false);
        // Chicago should NOT be in infection deck
        expect(result.state.infectionDeck.some((card) => card.city === "Chicago")).toBe(false);
        // Other cards unchanged
        expect(result.state.infectionDeck).toHaveLength(2);
      }
    });

    it("should fail if card is not in infection discard pile", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.ResilientPopulation }],
          },
          player1,
        ],
        infectionDiscard: [{ city: "Chicago", color: Disease.Blue }],
      };

      const result = resilientPopulation(stateWithEvent, "Paris");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("card not found in discard pile");
      }
    });

    it("should fail if infection discard pile is empty", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.ResilientPopulation }],
          },
          player1,
        ],
        infectionDiscard: [],
      };

      const result = resilientPopulation(stateWithEvent, "Atlanta");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("card not found in discard pile");
      }
    });

    it("should fail if player doesn't have the event card", () => {
      const state = createTestGameState();
      const stateWithDiscard: GameState = {
        ...state,
        infectionDiscard: [{ city: "Chicago", color: Disease.Blue }],
      };

      const result = resilientPopulation(stateWithDiscard, "Chicago");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("does not have");
      }
    });

    it("should fail if game is not ongoing", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const wonState: GameState = {
        ...state,
        status: GameStatus.Won,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.ResilientPopulation }],
          },
          player1,
        ],
        infectionDiscard: [{ city: "Chicago", color: Disease.Blue }],
      };

      const result = resilientPopulation(wonState, "Chicago");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("game has ended");
      }
    });

    it("should not cost an action", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.ResilientPopulation }],
          },
          player1,
        ],
        infectionDiscard: [{ city: "Chicago", color: Disease.Blue }],
      };

      const result = resilientPopulation(stateWithEvent, "Chicago");

      expect(result.success).toBe(true);
      if (result.success) {
        // Actions remaining should be unchanged
        expect(result.state.actionsRemaining).toBe(4);
      }
    });

    it("should work during any turn phase", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.ResilientPopulation }],
          },
          player1,
        ],
        infectionDiscard: [{ city: "Chicago", color: Disease.Blue }],
      };

      // Test during draw phase
      const drawPhaseState = { ...stateWithEvent, phase: TurnPhase.Draw };
      const drawResult = resilientPopulation(drawPhaseState, "Chicago");
      expect(drawResult.success).toBe(true);

      // Test during infect phase
      const infectPhaseState = {
        ...stateWithEvent,
        phase: TurnPhase.Infect,
        infectionDiscard: [{ city: "Chicago", color: Disease.Blue }],
      };
      const infectResult = resilientPopulation(infectPhaseState, "Chicago");
      expect(infectResult.success).toBe(true);
    });

    it("should allow a different player to play the event", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "city", city: "Chicago", color: Disease.Blue }],
          },
          {
            ...player1,
            hand: [{ type: "event", event: EventType.ResilientPopulation }],
          },
        ],
        infectionDiscard: [{ city: "Paris", color: Disease.Blue }],
      };

      const result = resilientPopulation(stateWithEvent, "Paris", 1);
      expect(result.success).toBe(true);
      if (result.success) {
        // Paris should be removed
        expect(result.state.infectionDiscard.some((card) => card.city === "Paris")).toBe(false);
        // Player 1's hand should have the event removed
        expect(result.state.players[1]?.hand).toHaveLength(0);
      }
    });

    it("should work with stored event from Contingency Planner", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const eventCard: EventCard = { type: "event", event: EventType.ResilientPopulation };
      const stateWithStored: GameState = {
        ...state,
        players: [
          {
            ...player0,
            role: Role.ContingencyPlanner,
            hand: [],
            storedEventCard: eventCard,
          },
          player1,
        ],
        infectionDiscard: [{ city: "Chicago", color: Disease.Blue }],
      };

      const result = resilientPopulation(stateWithStored, "Chicago");
      expect(result.success).toBe(true);
      if (result.success) {
        // Chicago should be removed
        expect(result.state.infectionDiscard.some((card) => card.city === "Chicago")).toBe(false);
        // Stored event should be cleared
        expect(result.state.players[0]?.storedEventCard).toBeUndefined();
        // Stored event should NOT go to discard (removed from game)
        expect(result.state.playerDiscard).toHaveLength(0);
      }
    });

    it("should handle removing the only card in discard", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.ResilientPopulation }],
          },
          player1,
        ],
        infectionDiscard: [{ city: "Chicago", color: Disease.Blue }],
      };

      const result = resilientPopulation(stateWithEvent, "Chicago");

      expect(result.success).toBe(true);
      if (result.success) {
        // Infection discard should be empty
        expect(result.state.infectionDiscard).toHaveLength(0);
      }
    });

    it("should handle removing duplicate city names (removes first occurrence)", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.ResilientPopulation }],
          },
          player1,
        ],
        infectionDiscard: [
          { city: "Chicago", color: Disease.Blue },
          { city: "Paris", color: Disease.Blue },
          { city: "Chicago", color: Disease.Blue },
        ],
      };

      const result = resilientPopulation(stateWithEvent, "Chicago");

      expect(result.success).toBe(true);
      if (result.success) {
        // Should have 2 cards left (removed first Chicago)
        expect(result.state.infectionDiscard).toHaveLength(2);
        // Paris should still be there
        expect(result.state.infectionDiscard.some((card) => card.city === "Paris")).toBe(true);
        // Second Chicago should still be there
        expect(result.state.infectionDiscard.some((card) => card.city === "Chicago")).toBe(true);
      }
    });
  });

  describe("forecast", () => {
    it("should rearrange top 6 cards of infection deck", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.Forecast }],
          },
          player1,
        ],
        infectionDeck: [
          { city: "Chicago", color: Disease.Blue },
          { city: "Paris", color: Disease.Blue },
          { city: "Atlanta", color: Disease.Blue },
          { city: "London", color: Disease.Blue },
          { city: "Madrid", color: Disease.Blue },
          { city: "Milan", color: Disease.Blue },
          { city: "Essen", color: Disease.Blue },
          { city: "Washington", color: Disease.Blue },
        ],
      };

      // Rearrange the top 6 cards
      const newOrder = ["Milan", "London", "Atlanta", "Chicago", "Madrid", "Paris"];
      const result = forecast(stateWithEvent, newOrder);

      expect(result.success).toBe(true);
      if (result.success) {
        // Top 6 cards should be in new order
        expect(result.state.infectionDeck[0]?.city).toBe("Milan");
        expect(result.state.infectionDeck[1]?.city).toBe("London");
        expect(result.state.infectionDeck[2]?.city).toBe("Atlanta");
        expect(result.state.infectionDeck[3]?.city).toBe("Chicago");
        expect(result.state.infectionDeck[4]?.city).toBe("Madrid");
        expect(result.state.infectionDeck[5]?.city).toBe("Paris");
        // Bottom 2 cards should remain unchanged
        expect(result.state.infectionDeck[6]?.city).toBe("Essen");
        expect(result.state.infectionDeck[7]?.city).toBe("Washington");
        // Event card should be removed from hand
        expect(result.state.players[0]?.hand).toHaveLength(0);
        // Event card should be in discard pile
        expect(result.state.playerDiscard).toHaveLength(1);
      }
    });

    it("should work with less than 6 cards in deck", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.Forecast }],
          },
          player1,
        ],
        infectionDeck: [
          { city: "Chicago", color: Disease.Blue },
          { city: "Paris", color: Disease.Blue },
          { city: "Atlanta", color: Disease.Blue },
        ],
      };

      // Rearrange the 3 cards
      const newOrder = ["Paris", "Atlanta", "Chicago"];
      const result = forecast(stateWithEvent, newOrder);

      expect(result.success).toBe(true);
      if (result.success) {
        // All 3 cards should be in new order
        expect(result.state.infectionDeck).toHaveLength(3);
        expect(result.state.infectionDeck[0]?.city).toBe("Paris");
        expect(result.state.infectionDeck[1]?.city).toBe("Atlanta");
        expect(result.state.infectionDeck[2]?.city).toBe("Chicago");
      }
    });

    it("should work with exactly 6 cards in deck", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.Forecast }],
          },
          player1,
        ],
        infectionDeck: [
          { city: "Chicago", color: Disease.Blue },
          { city: "Paris", color: Disease.Blue },
          { city: "Atlanta", color: Disease.Blue },
          { city: "London", color: Disease.Blue },
          { city: "Madrid", color: Disease.Blue },
          { city: "Milan", color: Disease.Blue },
        ],
      };

      const newOrder = ["Milan", "London", "Atlanta", "Chicago", "Madrid", "Paris"];
      const result = forecast(stateWithEvent, newOrder);

      expect(result.success).toBe(true);
      if (result.success) {
        // All 6 cards should be in new order
        expect(result.state.infectionDeck).toHaveLength(6);
        expect(result.state.infectionDeck[0]?.city).toBe("Milan");
        expect(result.state.infectionDeck[5]?.city).toBe("Paris");
      }
    });

    it("should fail if newOrder has wrong number of cards", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.Forecast }],
          },
          player1,
        ],
        infectionDeck: [
          { city: "Chicago", color: Disease.Blue },
          { city: "Paris", color: Disease.Blue },
          { city: "Atlanta", color: Disease.Blue },
          { city: "London", color: Disease.Blue },
          { city: "Madrid", color: Disease.Blue },
          { city: "Milan", color: Disease.Blue },
        ],
      };

      // Only provide 3 cards when 6 are expected
      const newOrder = ["Milan", "London", "Atlanta"];
      const result = forecast(stateWithEvent, newOrder);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("expected 6 cards, got 3");
      }
    });

    it("should fail if newOrder contains different cards", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.Forecast }],
          },
          player1,
        ],
        infectionDeck: [
          { city: "Chicago", color: Disease.Blue },
          { city: "Paris", color: Disease.Blue },
          { city: "Atlanta", color: Disease.Blue },
          { city: "London", color: Disease.Blue },
          { city: "Madrid", color: Disease.Blue },
          { city: "Milan", color: Disease.Blue },
        ],
      };

      // Replace Paris with Essen (invalid)
      const newOrder = ["Milan", "London", "Atlanta", "Chicago", "Madrid", "Essen"];
      const result = forecast(stateWithEvent, newOrder);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("must contain exactly the same cards");
      }
    });

    it("should fail if newOrder contains duplicates", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.Forecast }],
          },
          player1,
        ],
        infectionDeck: [
          { city: "Chicago", color: Disease.Blue },
          { city: "Paris", color: Disease.Blue },
          { city: "Atlanta", color: Disease.Blue },
          { city: "London", color: Disease.Blue },
          { city: "Madrid", color: Disease.Blue },
          { city: "Milan", color: Disease.Blue },
        ],
      };

      // Duplicate Chicago (invalid)
      const newOrder = ["Chicago", "Chicago", "Atlanta", "London", "Madrid", "Milan"];
      const result = forecast(stateWithEvent, newOrder);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("must contain exactly the same cards");
      }
    });

    it("should fail if player doesn't have the event card", () => {
      const state = createTestGameState();
      const stateWithDeck: GameState = {
        ...state,
        infectionDeck: [
          { city: "Chicago", color: Disease.Blue },
          { city: "Paris", color: Disease.Blue },
        ],
      };

      const result = forecast(stateWithDeck, ["Paris", "Chicago"]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("does not have");
      }
    });

    it("should fail if game is not ongoing", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const wonState: GameState = {
        ...state,
        status: GameStatus.Won,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.Forecast }],
          },
          player1,
        ],
        infectionDeck: [
          { city: "Chicago", color: Disease.Blue },
          { city: "Paris", color: Disease.Blue },
        ],
      };

      const result = forecast(wonState, ["Paris", "Chicago"]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("game has ended");
      }
    });

    it("should not cost an action", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.Forecast }],
          },
          player1,
        ],
        infectionDeck: [
          { city: "Chicago", color: Disease.Blue },
          { city: "Paris", color: Disease.Blue },
        ],
      };

      const result = forecast(stateWithEvent, ["Paris", "Chicago"]);

      expect(result.success).toBe(true);
      if (result.success) {
        // Actions remaining should be unchanged
        expect(result.state.actionsRemaining).toBe(4);
      }
    });

    it("should work during any turn phase", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.Forecast }],
          },
          player1,
        ],
        infectionDeck: [
          { city: "Chicago", color: Disease.Blue },
          { city: "Paris", color: Disease.Blue },
        ],
      };

      // Test during draw phase
      const drawPhaseState = { ...stateWithEvent, phase: TurnPhase.Draw };
      const drawResult = forecast(drawPhaseState, ["Paris", "Chicago"]);
      expect(drawResult.success).toBe(true);

      // Test during infect phase
      const infectPhaseState = {
        ...stateWithEvent,
        phase: TurnPhase.Infect,
        infectionDeck: [
          { city: "Chicago", color: Disease.Blue },
          { city: "Paris", color: Disease.Blue },
        ],
      };
      const infectResult = forecast(infectPhaseState, ["Paris", "Chicago"]);
      expect(infectResult.success).toBe(true);
    });

    it("should allow a different player to play the event", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "city", city: "Chicago", color: Disease.Blue }],
          },
          {
            ...player1,
            hand: [{ type: "event", event: EventType.Forecast }],
          },
        ],
        infectionDeck: [
          { city: "Chicago", color: Disease.Blue },
          { city: "Paris", color: Disease.Blue },
        ],
      };

      const result = forecast(stateWithEvent, ["Paris", "Chicago"], 1);
      expect(result.success).toBe(true);
      if (result.success) {
        // Deck should be reordered
        expect(result.state.infectionDeck[0]?.city).toBe("Paris");
        // Player 1's hand should have the event removed
        expect(result.state.players[1]?.hand).toHaveLength(0);
      }
    });

    it("should work with stored event from Contingency Planner", () => {
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
            hand: [],
            storedEventCard: eventCard,
          },
          player1,
        ],
        infectionDeck: [
          { city: "Chicago", color: Disease.Blue },
          { city: "Paris", color: Disease.Blue },
        ],
      };

      const result = forecast(stateWithStored, ["Paris", "Chicago"]);
      expect(result.success).toBe(true);
      if (result.success) {
        // Deck should be reordered
        expect(result.state.infectionDeck[0]?.city).toBe("Paris");
        // Stored event should be cleared
        expect(result.state.players[0]?.storedEventCard).toBeUndefined();
        // Stored event should NOT go to discard (removed from game)
        expect(result.state.playerDiscard).toHaveLength(0);
      }
    });

    it("should work with empty infection deck", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.Forecast }],
          },
          player1,
        ],
        infectionDeck: [],
      };

      const result = forecast(stateWithEvent, []);

      expect(result.success).toBe(true);
      if (result.success) {
        // Deck should remain empty
        expect(result.state.infectionDeck).toHaveLength(0);
        // Event should still be played
        expect(result.state.playerDiscard).toHaveLength(1);
      }
    });

    it("should preserve card colors when reordering", () => {
      const state = createTestGameState();
      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) {
        throw new Error("Test setup failed: missing players");
      }
      const stateWithEvent: GameState = {
        ...state,
        players: [
          {
            ...player0,
            hand: [{ type: "event", event: EventType.Forecast }],
          },
          player1,
        ],
        infectionDeck: [
          { city: "Chicago", color: Disease.Blue },
          { city: "Paris", color: Disease.Blue },
          { city: "Atlanta", color: Disease.Blue },
          { city: "Lagos", color: Disease.Yellow },
          { city: "Khartoum", color: Disease.Yellow },
          { city: "Kinshasa", color: Disease.Yellow },
        ],
      };

      const newOrder = ["Khartoum", "Chicago", "Lagos", "Paris", "Kinshasa", "Atlanta"];
      const result = forecast(stateWithEvent, newOrder);

      expect(result.success).toBe(true);
      if (result.success) {
        // Verify colors are preserved
        expect(result.state.infectionDeck[0]).toEqual({ city: "Khartoum", color: Disease.Yellow });
        expect(result.state.infectionDeck[1]).toEqual({ city: "Chicago", color: Disease.Blue });
        expect(result.state.infectionDeck[2]).toEqual({ city: "Lagos", color: Disease.Yellow });
        expect(result.state.infectionDeck[3]).toEqual({ city: "Paris", color: Disease.Blue });
        expect(result.state.infectionDeck[4]).toEqual({ city: "Kinshasa", color: Disease.Yellow });
        expect(result.state.infectionDeck[5]).toEqual({ city: "Atlanta", color: Disease.Blue });
      }
    });
  });
});
