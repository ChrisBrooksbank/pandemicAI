// Tests for Dispatcher role abilities
import { describe, expect, it } from "vitest";
import { dispatcherMoveOtherPlayer, dispatcherMoveToOtherPawn } from "./actions";
import { createGame } from "./game";
import { Disease, Role, type GameState } from "./types";

describe("Dispatcher role abilities", () => {
  // Helper to create a test game with Dispatcher as current player
  function createDispatcherGame(): GameState {
    const state = createGame({ playerCount: 3, difficulty: 4 });

    // Assign roles and clear hands for deterministic tests
    // Dispatcher (player 0), Medic (player 1), Scientist (player 2)
    const updatedPlayers = state.players.map((player, index) => {
      if (index === 0) {
        return { ...player, role: Role.Dispatcher, location: "Atlanta", hand: [] };
      } else if (index === 1) {
        return { ...player, role: Role.Medic, location: "Chicago", hand: [] };
      } else {
        return { ...player, role: Role.Scientist, location: "Miami", hand: [] };
      }
    });

    return { ...state, players: updatedPlayers };
  }

  describe("dispatcherMoveToOtherPawn", () => {
    it("should move a player to another player's city", () => {
      const state = createDispatcherGame();
      // Player 1 (Medic) is in Chicago, Player 2 (Scientist) is in Miami
      // Move Player 2 to Chicago (where Player 1 is)

      const result = dispatcherMoveToOtherPawn(state, 2, 1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[2]?.location).toBe("Chicago");
        expect(result.state.actionsRemaining).toBe(3); // Started with 4, used 1
      }
    });

    it("should move a player to the Dispatcher's city", () => {
      const state = createDispatcherGame();
      // Dispatcher is in Atlanta, move Player 1 (Medic) to Atlanta

      const result = dispatcherMoveToOtherPawn(state, 1, 0);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[1]?.location).toBe("Atlanta");
        expect(result.state.actionsRemaining).toBe(3);
      }
    });

    it("should fail if current player is not Dispatcher", () => {
      const state = createDispatcherGame();
      // Change current player to someone else (Player 1)
      const modifiedState = { ...state, currentPlayerIndex: 1 };

      const result = dispatcherMoveToOtherPawn(modifiedState, 2, 0);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not Dispatcher");
      }
    });

    it("should fail if trying to move player to their own location", () => {
      const state = createDispatcherGame();

      const result = dispatcherMoveToOtherPawn(state, 1, 1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("own location");
      }
    });

    it("should fail with invalid player index", () => {
      const state = createDispatcherGame();

      const result = dispatcherMoveToOtherPawn(state, 5, 0);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid player to move index");
      }
    });

    it("should trigger Medic passive ability when moving Medic to city with cured disease", () => {
      let state = createDispatcherGame();

      // Place some blue cubes in Miami
      const updatedBoard = { ...state.board };
      const miamiState = updatedBoard["Miami"];
      if (miamiState) {
        updatedBoard["Miami"] = { ...miamiState, blue: 2 };
      }

      // Mark blue disease as cured
      const updatedCures = { ...state.cures, [Disease.Blue]: "cured" as const };

      state = {
        ...state,
        board: updatedBoard,
        cures: updatedCures,
      };

      // Move Medic (player 1) to Miami (where player 2 is) - Miami has cured disease cubes
      const result = dispatcherMoveToOtherPawn(state, 1, 2);

      expect(result.success).toBe(true);
      if (result.success) {
        // Medic should have auto-cleared the blue cubes
        expect(result.state.board["Miami"]?.blue).toBe(0);
        expect(result.state.players[1]?.location).toBe("Miami");
      }
    });
  });

  describe("dispatcherMoveOtherPlayer - Drive/Ferry", () => {
    it("should move another player using drive/ferry", () => {
      const state = createDispatcherGame();
      // Move Player 1 (Medic) from Chicago to Montreal (connected)

      const result = dispatcherMoveOtherPlayer(state, 1, "drive", "Montreal");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[1]?.location).toBe("Montreal");
        expect(result.state.actionsRemaining).toBe(3);
      }
    });

    it("should fail if cities are not connected", () => {
      const state = createDispatcherGame();
      // Try to move Player 1 from Chicago to Miami (not connected)

      const result = dispatcherMoveOtherPlayer(state, 1, "drive", "Miami");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not connected");
      }
    });

    it("should fail if current player is not Dispatcher", () => {
      const state = createDispatcherGame();
      const modifiedState = { ...state, currentPlayerIndex: 1 };

      const result = dispatcherMoveOtherPlayer(modifiedState, 2, "drive", "Washington");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not Dispatcher");
      }
    });
  });

  describe("dispatcherMoveOtherPlayer - Direct Flight", () => {
    it("should move another player using their city card for direct flight", () => {
      let state = createDispatcherGame();

      // Give Player 1 (Medic) a Miami city card (replace hand to prevent flaky tests)
      const updatedPlayers = state.players.map((player, index) => {
        if (index === 1) {
          return {
            ...player,
            hand: [{ type: "city" as const, city: "Miami", color: Disease.Yellow }],
          };
        }
        return player;
      });

      state = { ...state, players: updatedPlayers };

      // Move Player 1 to Miami using their own card
      const result = dispatcherMoveOtherPlayer(state, 1, "direct", "Miami", true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[1]?.location).toBe("Miami");
        expect(result.state.actionsRemaining).toBe(3);
        // Card should be discarded, hand should be empty
        expect(result.state.players[1]?.hand).toHaveLength(0);
      }
    });

    it("should move another player using Dispatcher's city card for direct flight", () => {
      let state = createDispatcherGame();

      // Give Dispatcher (Player 0) a Miami city card (replace hand to prevent flaky tests)
      const updatedPlayers = state.players.map((player, index) => {
        if (index === 0) {
          return {
            ...player,
            hand: [{ type: "city" as const, city: "Miami", color: Disease.Yellow }],
          };
        }
        return player;
      });

      state = { ...state, players: updatedPlayers };

      // Move Player 1 to Miami using Dispatcher's card
      const result = dispatcherMoveOtherPlayer(state, 1, "direct", "Miami", false);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[1]?.location).toBe("Miami");
        // Dispatcher's card should be discarded, hand should be empty
        expect(result.state.players[0]?.hand).toHaveLength(0);
      }
    });

    it("should fail if required card is not in hand", () => {
      const state = createDispatcherGame();

      // Try to move Player 1 to Miami without having Miami card
      const result = dispatcherMoveOtherPlayer(state, 1, "direct", "Miami", true);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("does not have");
        expect(result.error).toContain("Miami");
      }
    });
  });

  describe("dispatcherMoveOtherPlayer - Charter Flight", () => {
    it("should move another player using charter flight with their card", () => {
      let state = createDispatcherGame();

      // Give Player 1 (Medic in Chicago) a Chicago city card
      const updatedPlayers = state.players.map((player, index) => {
        if (index === 1) {
          return {
            ...player,
            hand: [...player.hand, { type: "city" as const, city: "Chicago", color: Disease.Blue }],
          };
        }
        return player;
      });

      state = { ...state, players: updatedPlayers };

      // Move Player 1 from Chicago to anywhere using charter flight
      const result = dispatcherMoveOtherPlayer(state, 1, "charter", "Tokyo", true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[1]?.location).toBe("Tokyo");
        // Chicago card should be discarded
        expect(
          result.state.players[1]?.hand.some(
            (card) => card.type === "city" && card.city === "Chicago",
          ),
        ).toBe(false);
      }
    });

    it("should move another player using charter flight with Dispatcher's card", () => {
      let state = createDispatcherGame();

      // Give Dispatcher (Player 0) a Chicago city card (where Player 1 is)
      const updatedPlayers = state.players.map((player, index) => {
        if (index === 0) {
          return {
            ...player,
            hand: [...player.hand, { type: "city" as const, city: "Chicago", color: Disease.Blue }],
          };
        }
        return player;
      });

      state = { ...state, players: updatedPlayers };

      // Move Player 1 from Chicago to Tokyo using Dispatcher's Chicago card
      const result = dispatcherMoveOtherPlayer(state, 1, "charter", "Tokyo", false);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[1]?.location).toBe("Tokyo");
        // Dispatcher's card should be discarded
        expect(
          result.state.players[0]?.hand.some(
            (card) => card.type === "city" && card.city === "Chicago",
          ),
        ).toBe(false);
      }
    });
  });

  describe("dispatcherMoveOtherPlayer - Shuttle Flight", () => {
    it("should move another player between research stations", () => {
      let state = createDispatcherGame();

      // Add research stations to Chicago and Miami
      const updatedBoard = { ...state.board };
      const chicagoState = updatedBoard["Chicago"];
      const miamiState = updatedBoard["Miami"];
      if (chicagoState && miamiState) {
        updatedBoard["Chicago"] = { ...chicagoState, hasResearchStation: true };
        updatedBoard["Miami"] = { ...miamiState, hasResearchStation: true };
      }

      state = { ...state, board: updatedBoard };

      // Move Player 1 from Chicago to Miami via shuttle
      const result = dispatcherMoveOtherPlayer(state, 1, "shuttle", "Miami");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[1]?.location).toBe("Miami");
        expect(result.state.actionsRemaining).toBe(3);
      }
    });

    it("should fail if origin city has no research station", () => {
      let state = createDispatcherGame();

      // Add research station to Miami only
      const updatedBoard = { ...state.board };
      const miamiState = updatedBoard["Miami"];
      if (miamiState) {
        updatedBoard["Miami"] = { ...miamiState, hasResearchStation: true };
      }

      state = { ...state, board: updatedBoard };

      // Try to shuttle from Chicago (no station) to Miami
      const result = dispatcherMoveOtherPlayer(state, 1, "shuttle", "Miami");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("no research station at current location");
      }
    });

    it("should fail if destination city has no research station", () => {
      let state = createDispatcherGame();

      // Add research station to Chicago only
      const updatedBoard = { ...state.board };
      const chicagoState = updatedBoard["Chicago"];
      if (chicagoState) {
        updatedBoard["Chicago"] = { ...chicagoState, hasResearchStation: true };
      }

      state = { ...state, board: updatedBoard };

      // Try to shuttle from Chicago to Miami (no station)
      const result = dispatcherMoveOtherPlayer(state, 1, "shuttle", "Miami");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("no research station at destination");
      }
    });
  });
});
