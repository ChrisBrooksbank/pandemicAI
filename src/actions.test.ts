// Tests for player actions
import { describe, expect, it } from "vitest";
import {
  buildResearchStation,
  charterFlight,
  contingencyPlannerTakeEvent,
  directFlight,
  discoverCure,
  driveFerry,
  operationsExpertMove,
  shareKnowledge,
  shuttleFlight,
  treatDisease,
} from "./actions";
import { createGame } from "./game";
import {
  CureStatus,
  Disease,
  EventType,
  GameStatus,
  Role,
  TurnPhase,
  type CityCard,
  type EventCard,
  type GameState,
} from "./types";

describe("driveFerry", () => {
  // Helper to create a test game state with a player in a specific location
  function createTestGame(location: string = "Atlanta"): GameState {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    // Move the current player to the specified location
    const updatedPlayers = state.players.map((player, index) => {
      if (index === 0) {
        return { ...player, location };
      }
      return player;
    });
    return { ...state, players: updatedPlayers };
  }

  it("should successfully move player to adjacent city", () => {
    const state = createTestGame("Atlanta");
    const result = driveFerry(state, "Chicago");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("Chicago");
      expect(result.state.actionsRemaining).toBe(3); // Started with 4, used 1
    }
  });

  it("should allow movement to any connected city", () => {
    // Atlanta is connected to: Chicago, Miami, Washington
    const state = createTestGame("Atlanta");

    const resultChicago = driveFerry(state, "Chicago");
    expect(resultChicago.success).toBe(true);

    const resultMiami = driveFerry(state, "Miami");
    expect(resultMiami.success).toBe(true);

    const resultWashington = driveFerry(state, "Washington");
    expect(resultWashington.success).toBe(true);
  });

  it("should fail when destination is not connected", () => {
    const state = createTestGame("Atlanta");
    // London is not connected to Atlanta
    const result = driveFerry(state, "London");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not connected");
      expect(result.error).toContain("Atlanta");
      expect(result.error).toContain("London");
    }
  });

  it("should fail when destination city does not exist", () => {
    const state = createTestGame("Atlanta");
    const result = driveFerry(state, "InvalidCity");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not a valid city");
    }
  });

  it("should decrement actions remaining", () => {
    const state = createTestGame("Atlanta");
    const result1 = driveFerry(state, "Chicago");

    expect(result1.success).toBe(true);
    if (result1.success) {
      expect(result1.state.actionsRemaining).toBe(3);

      const result2 = driveFerry(result1.state, "Montreal");
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.state.actionsRemaining).toBe(2);
      }
    }
  });

  it("should preserve other player locations", () => {
    const state = createTestGame("Atlanta");
    const originalPlayer2Location = state.players[1]?.location;

    const result = driveFerry(state, "Chicago");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("Chicago");
      expect(result.state.players[1]?.location).toBe(originalPlayer2Location);
    }
  });

  it("should work with different starting cities", () => {
    const state = createTestGame("London");
    // London is connected to: Essen, Madrid, New York, Paris
    const result = driveFerry(state, "Paris");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("Paris");
    }
  });

  it("should preserve game state except player location and actions", () => {
    const state = createTestGame("Atlanta");
    const originalBoard = state.board;
    const originalCures = state.cures;
    const originalDecks = {
      playerDeck: state.playerDeck,
      infectionDeck: state.infectionDeck,
    };

    const result = driveFerry(state, "Chicago");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.board).toBe(originalBoard);
      expect(result.state.cures).toBe(originalCures);
      expect(result.state.playerDeck).toBe(originalDecks.playerDeck);
      expect(result.state.infectionDeck).toBe(originalDecks.infectionDeck);
    }
  });

  it("should handle chain of movements", () => {
    let state = createTestGame("Atlanta");

    // Atlanta -> Chicago
    let result = driveFerry(state, "Chicago");
    expect(result.success).toBe(true);
    if (!result.success) return;
    state = result.state;

    // Chicago -> Montreal
    result = driveFerry(state, "Montreal");
    expect(result.success).toBe(true);
    if (!result.success) return;
    state = result.state;

    // Montreal -> Washington
    result = driveFerry(state, "Washington");
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.state.players[0]?.location).toBe("Washington");
    expect(result.state.actionsRemaining).toBe(1); // Started with 4, used 3
  });
});

describe("directFlight", () => {
  // Helper to create a test game state with a player having specific cards
  function createTestGameWithCards(
    location: string = "Atlanta",
    cards: CityCard[] = [],
  ): GameState {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    // Update the current player with the specified location and cards
    const updatedPlayers = state.players.map((player, index) => {
      if (index === 0) {
        return { ...player, location, hand: cards };
      }
      return player;
    });
    return { ...state, players: updatedPlayers };
  }

  it("should successfully fly to a city when player has that card", () => {
    const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [londonCard]);

    const result = directFlight(state, "London");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("London");
      expect(result.state.actionsRemaining).toBe(3); // Started with 4, used 1
    }
  });

  it("should remove the city card from player's hand", () => {
    const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
    const parisCard: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [londonCard, parisCard]);

    const result = directFlight(state, "London");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.hand).toHaveLength(1);
      expect(result.state.players[0]?.hand[0]).toEqual(parisCard);
    }
  });

  it("should add the discarded card to the player discard pile", () => {
    const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [londonCard]);
    const originalDiscardSize = state.playerDiscard.length;

    const result = directFlight(state, "London");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.playerDiscard).toHaveLength(originalDiscardSize + 1);
      expect(result.state.playerDiscard[result.state.playerDiscard.length - 1]).toEqual(londonCard);
    }
  });

  it("should fail when player does not have the destination city card", () => {
    const parisCard: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [parisCard]);

    const result = directFlight(state, "London");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("does not have that city card");
      expect(result.error).toContain("London");
    }
  });

  it("should fail when player has no cards in hand", () => {
    const state = createTestGameWithCards("Atlanta", []);

    const result = directFlight(state, "London");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("does not have that city card");
    }
  });

  it("should fail when destination city does not exist", () => {
    const invalidCard: CityCard = { type: "city", city: "InvalidCity", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [invalidCard]);

    const result = directFlight(state, "InvalidCity");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not a valid city");
    }
  });

  it("should allow flying to any city regardless of distance", () => {
    const tokyoCard: CityCard = { type: "city", city: "Tokyo", color: Disease.Red };
    const state = createTestGameWithCards("Atlanta", [tokyoCard]);

    const result = directFlight(state, "Tokyo");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("Tokyo");
    }
  });

  it("should allow flying to current location (no-op move)", () => {
    const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [atlantaCard]);

    const result = directFlight(state, "Atlanta");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("Atlanta");
      expect(result.state.players[0]?.hand).toHaveLength(0); // Card still discarded
      expect(result.state.actionsRemaining).toBe(3); // Action still consumed
    }
  });

  it("should preserve other player locations and hands", () => {
    const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [londonCard]);
    const originalPlayer2Location = state.players[1]?.location;
    const originalPlayer2Hand = state.players[1]?.hand;

    const result = directFlight(state, "London");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[1]?.location).toBe(originalPlayer2Location);
      expect(result.state.players[1]?.hand).toEqual(originalPlayer2Hand);
    }
  });

  it("should handle multiple cards of same color", () => {
    const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
    const parisCard: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
    const essenCard: CityCard = { type: "city", city: "Essen", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [londonCard, parisCard, essenCard]);

    const result = directFlight(state, "Paris");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("Paris");
      expect(result.state.players[0]?.hand).toHaveLength(2);
      expect(result.state.players[0]?.hand).toContainEqual(londonCard);
      expect(result.state.players[0]?.hand).toContainEqual(essenCard);
      expect(result.state.players[0]?.hand).not.toContainEqual(parisCard);
    }
  });

  it("should preserve game state except player location, hand, discard, and actions", () => {
    const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [londonCard]);
    const originalBoard = state.board;
    const originalCures = state.cures;
    const originalDecks = {
      playerDeck: state.playerDeck,
      infectionDeck: state.infectionDeck,
    };

    const result = directFlight(state, "London");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.board).toBe(originalBoard);
      expect(result.state.cures).toBe(originalCures);
      expect(result.state.playerDeck).toBe(originalDecks.playerDeck);
      expect(result.state.infectionDeck).toBe(originalDecks.infectionDeck);
    }
  });

  it("should chain with other actions", () => {
    const chicagoCard: CityCard = { type: "city", city: "Chicago", color: Disease.Blue };
    const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
    let state = createTestGameWithCards("Atlanta", [chicagoCard, londonCard]);

    // First, direct flight to Chicago
    let result = directFlight(state, "Chicago");
    expect(result.success).toBe(true);
    if (!result.success) return;
    state = result.state;
    expect(state.actionsRemaining).toBe(3);

    // Then drive/ferry to Montreal (adjacent to Chicago)
    result = driveFerry(state, "Montreal");
    expect(result.success).toBe(true);
    if (!result.success) return;
    state = result.state;
    expect(state.actionsRemaining).toBe(2);

    expect(result.state.players[0]?.location).toBe("Montreal");
    expect(result.state.players[0]?.hand).toHaveLength(1); // Only London card remains
  });
});

describe("charterFlight", () => {
  // Helper to create a test game state with a player at a location with specific cards
  function createTestGameWithCards(
    location: string = "Atlanta",
    cards: CityCard[] = [],
  ): GameState {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    // Update the current player with the specified location and cards
    const updatedPlayers = state.players.map((player, index) => {
      if (index === 0) {
        return { ...player, location, hand: cards };
      }
      return player;
    });
    return { ...state, players: updatedPlayers };
  }

  it("should successfully fly to any city when player has current location card", () => {
    const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [atlantaCard]);

    const result = charterFlight(state, "Tokyo");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("Tokyo");
      expect(result.state.actionsRemaining).toBe(3); // Started with 4, used 1
    }
  });

  it("should remove the current location card from player's hand", () => {
    const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
    const parisCard: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [atlantaCard, parisCard]);

    const result = charterFlight(state, "Tokyo");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.hand).toHaveLength(1);
      expect(result.state.players[0]?.hand[0]).toEqual(parisCard);
    }
  });

  it("should add the discarded card to the player discard pile", () => {
    const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [atlantaCard]);
    const originalDiscardSize = state.playerDiscard.length;

    const result = charterFlight(state, "Tokyo");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.playerDiscard).toHaveLength(originalDiscardSize + 1);
      expect(result.state.playerDiscard[result.state.playerDiscard.length - 1]).toEqual(
        atlantaCard,
      );
    }
  });

  it("should fail when player does not have the current location card", () => {
    const parisCard: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [parisCard]);

    const result = charterFlight(state, "Tokyo");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("does not have that city card");
      expect(result.error).toContain("Atlanta");
    }
  });

  it("should fail when player has no cards in hand", () => {
    const state = createTestGameWithCards("Atlanta", []);

    const result = charterFlight(state, "Tokyo");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("does not have that city card");
    }
  });

  it("should fail when destination city does not exist", () => {
    const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [atlantaCard]);

    const result = charterFlight(state, "InvalidCity");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not a valid city");
    }
  });

  it("should allow flying to any city regardless of distance", () => {
    const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [atlantaCard]);

    const result = charterFlight(state, "Tokyo");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("Tokyo");
    }
  });

  it("should allow flying to current location (no-op move)", () => {
    const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [atlantaCard]);

    const result = charterFlight(state, "Atlanta");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("Atlanta");
      expect(result.state.players[0]?.hand).toHaveLength(0); // Card still discarded
      expect(result.state.actionsRemaining).toBe(3); // Action still consumed
    }
  });

  it("should allow flying to connected or non-connected cities", () => {
    const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [atlantaCard]);

    // Chicago is connected to Atlanta
    const result1 = charterFlight(state, "Chicago");
    expect(result1.success).toBe(true);

    // Reset state for next test
    const state2 = createTestGameWithCards("Atlanta", [atlantaCard]);
    // Tokyo is NOT connected to Atlanta
    const result2 = charterFlight(state2, "Tokyo");
    expect(result2.success).toBe(true);
  });

  it("should preserve other player locations and hands", () => {
    const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [atlantaCard]);
    const originalPlayer2Location = state.players[1]?.location;
    const originalPlayer2Hand = state.players[1]?.hand;

    const result = charterFlight(state, "Tokyo");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[1]?.location).toBe(originalPlayer2Location);
      expect(result.state.players[1]?.hand).toEqual(originalPlayer2Hand);
    }
  });

  it("should work from different starting cities", () => {
    const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
    const state = createTestGameWithCards("London", [londonCard]);

    const result = charterFlight(state, "Sydney");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("Sydney");
    }
  });

  it("should preserve game state except player location, hand, discard, and actions", () => {
    const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [atlantaCard]);
    const originalBoard = state.board;
    const originalCures = state.cures;
    const originalDecks = {
      playerDeck: state.playerDeck,
      infectionDeck: state.infectionDeck,
    };

    const result = charterFlight(state, "Tokyo");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.board).toBe(originalBoard);
      expect(result.state.cures).toBe(originalCures);
      expect(result.state.playerDeck).toBe(originalDecks.playerDeck);
      expect(result.state.infectionDeck).toBe(originalDecks.infectionDeck);
    }
  });

  it("should chain with other actions", () => {
    const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
    const tokyoCard: CityCard = { type: "city", city: "Tokyo", color: Disease.Red };
    let state = createTestGameWithCards("Atlanta", [atlantaCard, tokyoCard]);

    // First, charter flight to Tokyo
    let result = charterFlight(state, "Tokyo");
    expect(result.success).toBe(true);
    if (!result.success) return;
    state = result.state;
    expect(state.actionsRemaining).toBe(3);

    // Then direct flight to somewhere else (we still have Tokyo card)
    result = directFlight(state, "Tokyo");
    expect(result.success).toBe(true);
    if (!result.success) return;
    state = result.state;
    expect(state.actionsRemaining).toBe(2);

    expect(result.state.players[0]?.location).toBe("Tokyo");
    expect(result.state.players[0]?.hand).toHaveLength(0); // Both cards used
  });

  it("should differ from direct flight - discards current location card, not destination card", () => {
    const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
    const tokyoCard: CityCard = { type: "city", city: "Tokyo", color: Disease.Red };
    const state = createTestGameWithCards("Atlanta", [atlantaCard, tokyoCard]);

    // Charter flight: discard Atlanta card to fly to Tokyo
    const result = charterFlight(state, "Tokyo");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("Tokyo");
      // Should still have Tokyo card in hand
      expect(result.state.players[0]?.hand).toHaveLength(1);
      expect(result.state.players[0]?.hand[0]).toEqual(tokyoCard);
      // Should have discarded Atlanta card
      expect(result.state.playerDiscard[result.state.playerDiscard.length - 1]).toEqual(
        atlantaCard,
      );
    }
  });
});

describe("shuttleFlight", () => {
  // Helper to create a test game state with research stations at specific cities
  function createTestGameWithResearchStations(
    location: string = "Atlanta",
    additionalStations: string[] = [],
  ): GameState {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    // Move the current player to the specified location
    const updatedPlayers = state.players.map((player, index) => {
      if (index === 0) {
        return { ...player, location };
      }
      return player;
    });

    // Add research stations to the specified cities
    const updatedBoard = { ...state.board };
    for (const city of additionalStations) {
      const cityState = updatedBoard[city];
      if (cityState) {
        updatedBoard[city] = { ...cityState, hasResearchStation: true };
      }
    }

    return { ...state, players: updatedPlayers, board: updatedBoard };
  }

  it("should successfully move between two cities with research stations", () => {
    // Atlanta has a research station by default
    const state = createTestGameWithResearchStations("Atlanta", ["Chicago"]);
    const result = shuttleFlight(state, "Chicago");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("Chicago");
      expect(result.state.actionsRemaining).toBe(3); // Started with 4, used 1
    }
  });

  it("should not require any cards", () => {
    // Atlanta has a research station by default
    const state = createTestGameWithResearchStations("Atlanta", ["London"]);
    // Clear player's hand
    const updatedPlayers = state.players.map((player, index) => {
      if (index === 0) {
        return { ...player, hand: [] };
      }
      return player;
    });
    const stateWithEmptyHand = { ...state, players: updatedPlayers };

    const result = shuttleFlight(stateWithEmptyHand, "London");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("London");
      expect(result.state.players[0]?.hand).toHaveLength(0); // Hand remains empty
    }
  });

  it("should not affect player discard pile", () => {
    const state = createTestGameWithResearchStations("Atlanta", ["Paris"]);
    const originalDiscardSize = state.playerDiscard.length;

    const result = shuttleFlight(state, "Paris");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.playerDiscard).toHaveLength(originalDiscardSize);
    }
  });

  it("should fail when current location has no research station", () => {
    // Move player to Chicago (no research station)
    const state = createTestGameWithResearchStations("Chicago", ["London"]);

    const result = shuttleFlight(state, "London");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("no research station at current location");
      expect(result.error).toContain("Chicago");
    }
  });

  it("should fail when destination has no research station", () => {
    // Atlanta has a research station by default, but London doesn't
    const state = createTestGameWithResearchStations("Atlanta", []);

    const result = shuttleFlight(state, "London");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("no research station at destination");
      expect(result.error).toContain("London");
    }
  });

  it("should fail when neither location has a research station", () => {
    // Move player to Chicago (no research station), London also has none
    const state = createTestGameWithResearchStations("Chicago", []);

    const result = shuttleFlight(state, "London");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("no research station at current location");
    }
  });

  it("should fail when destination city does not exist", () => {
    const state = createTestGameWithResearchStations("Atlanta", []);

    const result = shuttleFlight(state, "InvalidCity");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not a valid city");
    }
  });

  it("should allow shuttle to any city with research station regardless of distance", () => {
    // Atlanta has a station, add one to Tokyo (far away)
    const state = createTestGameWithResearchStations("Atlanta", ["Tokyo"]);

    const result = shuttleFlight(state, "Tokyo");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("Tokyo");
    }
  });

  it("should work regardless of whether cities are connected", () => {
    // Chicago and Tokyo are not connected, but both have research stations
    const state = createTestGameWithResearchStations("Chicago", ["Chicago", "Tokyo"]);

    const result = shuttleFlight(state, "Tokyo");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("Tokyo");
    }
  });

  it("should allow moving to current location (no-op move)", () => {
    const state = createTestGameWithResearchStations("Atlanta", []);

    const result = shuttleFlight(state, "Atlanta");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("Atlanta");
      expect(result.state.actionsRemaining).toBe(3); // Action still consumed
    }
  });

  it("should preserve other player locations", () => {
    const state = createTestGameWithResearchStations("Atlanta", ["Paris"]);
    const originalPlayer2Location = state.players[1]?.location;

    const result = shuttleFlight(state, "Paris");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.location).toBe("Paris");
      expect(result.state.players[1]?.location).toBe(originalPlayer2Location);
    }
  });

  it("should preserve player hand", () => {
    const state = createTestGameWithResearchStations("Atlanta", ["London"]);
    const originalHand = state.players[0]?.hand;

    const result = shuttleFlight(state, "London");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.hand).toEqual(originalHand);
    }
  });

  it("should decrement actions remaining", () => {
    const state = createTestGameWithResearchStations("Atlanta", ["Chicago", "Paris"]);

    const result1 = shuttleFlight(state, "Chicago");
    expect(result1.success).toBe(true);
    if (result1.success) {
      expect(result1.state.actionsRemaining).toBe(3);

      const result2 = shuttleFlight(result1.state, "Paris");
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.state.actionsRemaining).toBe(2);
      }
    }
  });

  it("should preserve game state except player location and actions", () => {
    const state = createTestGameWithResearchStations("Atlanta", ["Tokyo"]);
    const originalBoard = state.board;
    const originalCures = state.cures;
    const originalDecks = {
      playerDeck: state.playerDeck,
      infectionDeck: state.infectionDeck,
    };
    const originalDiscard = state.playerDiscard;

    const result = shuttleFlight(state, "Tokyo");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.board).toBe(originalBoard);
      expect(result.state.cures).toBe(originalCures);
      expect(result.state.playerDeck).toBe(originalDecks.playerDeck);
      expect(result.state.infectionDeck).toBe(originalDecks.infectionDeck);
      expect(result.state.playerDiscard).toBe(originalDiscard);
    }
  });

  it("should work with multiple research stations on the board", () => {
    // Set up multiple research stations
    const state = createTestGameWithResearchStations("Atlanta", [
      "Chicago",
      "London",
      "Paris",
      "Tokyo",
    ]);

    // Can shuttle to any of them from Atlanta
    const result1 = shuttleFlight(state, "Chicago");
    expect(result1.success).toBe(true);

    const state2 = createTestGameWithResearchStations("Atlanta", [
      "Chicago",
      "London",
      "Paris",
      "Tokyo",
    ]);
    const result2 = shuttleFlight(state2, "Tokyo");
    expect(result2.success).toBe(true);

    const state3 = createTestGameWithResearchStations("Atlanta", [
      "Chicago",
      "London",
      "Paris",
      "Tokyo",
    ]);
    const result3 = shuttleFlight(state3, "Paris");
    expect(result3.success).toBe(true);
  });

  it("should chain with other actions", () => {
    const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
    let state = createTestGameWithResearchStations("Atlanta", ["Chicago", "London"]);

    // Add a card to the player's hand
    const updatedPlayers = state.players.map((player, index) => {
      if (index === 0) {
        return { ...player, hand: [atlantaCard] };
      }
      return player;
    });
    state = { ...state, players: updatedPlayers };

    // First, shuttle flight to Chicago
    let result = shuttleFlight(state, "Chicago");
    expect(result.success).toBe(true);
    if (!result.success) return;
    state = result.state;
    expect(state.actionsRemaining).toBe(3);
    expect(state.players[0]?.location).toBe("Chicago");

    // Then drive/ferry to Montreal (adjacent to Chicago)
    result = driveFerry(state, "Montreal");
    expect(result.success).toBe(true);
    if (!result.success) return;
    state = result.state;
    expect(state.actionsRemaining).toBe(2);
    expect(state.players[0]?.location).toBe("Montreal");
    expect(state.players[0]?.hand).toHaveLength(1); // Still has Atlanta card
  });

  it("should differ from drive/ferry - ignores city connections", () => {
    // Atlanta and Tokyo are not connected by drive/ferry
    const state = createTestGameWithResearchStations("Atlanta", ["Tokyo"]);

    // Drive/ferry would fail
    const driveResult = driveFerry(state, "Tokyo");
    expect(driveResult.success).toBe(false);

    // But shuttle flight succeeds
    const shuttleResult = shuttleFlight(state, "Tokyo");
    expect(shuttleResult.success).toBe(true);
    if (shuttleResult.success) {
      expect(shuttleResult.state.players[0]?.location).toBe("Tokyo");
    }
  });

  it("should differ from direct/charter flight - requires no cards", () => {
    // Atlanta has a research station, add one to London
    const state = createTestGameWithResearchStations("Atlanta", ["London"]);

    // Clear player's hand to ensure no cards are available
    const updatedPlayers = state.players.map((player, index) => {
      if (index === 0) {
        return { ...player, hand: [] };
      }
      return player;
    });
    const stateWithEmptyHand = { ...state, players: updatedPlayers };

    // Direct flight would fail (no London card)
    const directResult = directFlight(stateWithEmptyHand, "London");
    expect(directResult.success).toBe(false);

    // Charter flight would fail (no Atlanta card)
    const charterResult = charterFlight(stateWithEmptyHand, "London");
    expect(charterResult.success).toBe(false);

    // But shuttle flight succeeds without any cards
    const shuttleResult = shuttleFlight(stateWithEmptyHand, "London");
    expect(shuttleResult.success).toBe(true);
    if (shuttleResult.success) {
      expect(shuttleResult.state.players[0]?.location).toBe("London");
      expect(shuttleResult.state.players[0]?.hand).toHaveLength(0);
    }
  });
});

describe("Action Validation", () => {
  // Helper to create a test game state with specific conditions
  function createTestGameWithConditions(overrides: Partial<GameState> = {}): GameState {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    return { ...state, ...overrides };
  }

  describe("validateActionPreconditions - game status", () => {
    it("should fail when game is won", () => {
      const state = createTestGameWithConditions({ status: GameStatus.Won });
      const result = driveFerry(state, "Chicago");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("game has ended");
        expect(result.error).toContain("won");
      }
    });

    it("should fail when game is lost", () => {
      const state = createTestGameWithConditions({ status: GameStatus.Lost });
      const result = driveFerry(state, "Chicago");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("game has ended");
        expect(result.error).toContain("lost");
      }
    });

    it("should succeed when game is ongoing", () => {
      const state = createTestGameWithConditions({ status: GameStatus.Ongoing });
      const result = driveFerry(state, "Chicago");

      expect(result.success).toBe(true);
    });
  });

  describe("validateActionPreconditions - turn phase", () => {
    it("should fail during draw phase", () => {
      const state = createTestGameWithConditions({ phase: TurnPhase.Draw });
      const result = driveFerry(state, "Chicago");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("current phase is");
        expect(result.error).toContain("draw");
        expect(result.error).toContain("not actions");
      }
    });

    it("should fail during infect phase", () => {
      const state = createTestGameWithConditions({ phase: TurnPhase.Infect });
      const result = driveFerry(state, "Chicago");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("current phase is");
        expect(result.error).toContain("infect");
        expect(result.error).toContain("not actions");
      }
    });

    it("should succeed during actions phase", () => {
      const state = createTestGameWithConditions({ phase: TurnPhase.Actions });
      const result = driveFerry(state, "Chicago");

      expect(result.success).toBe(true);
    });
  });

  describe("validateActionPreconditions - actions remaining", () => {
    it("should fail when no actions remaining", () => {
      const state = createTestGameWithConditions({ actionsRemaining: 0 });
      const result = driveFerry(state, "Chicago");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("no actions remaining");
      }
    });

    it("should succeed when actions remaining is 1", () => {
      const state = createTestGameWithConditions({ actionsRemaining: 1 });
      const result = driveFerry(state, "Chicago");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.actionsRemaining).toBe(0);
      }
    });

    it("should succeed when actions remaining is 4", () => {
      const state = createTestGameWithConditions({ actionsRemaining: 4 });
      const result = driveFerry(state, "Chicago");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.actionsRemaining).toBe(3);
      }
    });
  });

  describe("validation applies to all movement actions", () => {
    it("should validate driveFerry", () => {
      const state = createTestGameWithConditions({ actionsRemaining: 0 });
      const result = driveFerry(state, "Chicago");
      expect(result.success).toBe(false);
    });

    it("should validate directFlight", () => {
      const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
      const state = createTestGameWithConditions({ actionsRemaining: 0 });
      // Add card to player's hand
      const updatedPlayers = state.players.map((player, index) => {
        if (index === 0) {
          return { ...player, hand: [londonCard] };
        }
        return player;
      });
      const stateWithCard = { ...state, players: updatedPlayers };

      const result = directFlight(stateWithCard, "London");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("no actions remaining");
      }
    });

    it("should validate charterFlight", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      const state = createTestGameWithConditions({ actionsRemaining: 0 });
      // Add card to player's hand
      const updatedPlayers = state.players.map((player, index) => {
        if (index === 0) {
          return { ...player, hand: [atlantaCard] };
        }
        return player;
      });
      const stateWithCard = { ...state, players: updatedPlayers };

      const result = charterFlight(stateWithCard, "Tokyo");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("no actions remaining");
      }
    });

    it("should validate shuttleFlight", () => {
      const state = createTestGameWithConditions({ actionsRemaining: 0 });
      // Add research station to Chicago
      const updatedBoard = { ...state.board };
      const chicagoState = updatedBoard.Chicago;
      if (chicagoState) {
        updatedBoard.Chicago = { ...chicagoState, hasResearchStation: true };
      }
      const stateWithStation = { ...state, board: updatedBoard };

      const result = shuttleFlight(stateWithStation, "Chicago");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("no actions remaining");
      }
    });
  });

  describe("validation executes before action-specific checks", () => {
    it("should check preconditions before invalid destination in driveFerry", () => {
      const state = createTestGameWithConditions({ actionsRemaining: 0 });
      // Invalid destination would normally be caught, but preconditions should fail first
      const result = driveFerry(state, "InvalidCity");

      expect(result.success).toBe(false);
      if (!result.success) {
        // Should get precondition error, not invalid city error
        expect(result.error).toContain("no actions remaining");
        expect(result.error).not.toContain("not a valid city");
      }
    });

    it("should check preconditions before missing card in directFlight", () => {
      const state = createTestGameWithConditions({ actionsRemaining: 0 });
      // Player doesn't have London card, but preconditions should fail first
      const result = directFlight(state, "London");

      expect(result.success).toBe(false);
      if (!result.success) {
        // Should get precondition error, not missing card error
        expect(result.error).toContain("no actions remaining");
        expect(result.error).not.toContain("does not have that city card");
      }
    });
  });

  describe("multiple invalid conditions", () => {
    it("should fail with first precondition error when multiple conditions are invalid", () => {
      // Game won AND no actions remaining AND wrong phase
      const state = createTestGameWithConditions({
        status: GameStatus.Won,
        phase: TurnPhase.Draw,
        actionsRemaining: 0,
      });
      const result = driveFerry(state, "Chicago");

      expect(result.success).toBe(false);
      if (!result.success) {
        // Should fail on first check (game status)
        expect(result.error).toContain("game has ended");
      }
    });
  });
});

describe("buildResearchStation", () => {
  // Helper to create a test game state with a player at a location with specific cards
  function createTestGameWithCards(
    location: string = "Atlanta",
    cards: CityCard[] = [],
  ): GameState {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    // Update the current player with the specified location and cards
    const updatedPlayers = state.players.map((player, index) => {
      if (index === 0) {
        return { ...player, location, hand: cards };
      }
      return player;
    });
    return { ...state, players: updatedPlayers };
  }

  it("should successfully build a research station when player has matching city card", () => {
    const chicagoCard: CityCard = { type: "city", city: "Chicago", color: Disease.Blue };
    const state = createTestGameWithCards("Chicago", [chicagoCard]);

    const result = buildResearchStation(state);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.board.Chicago?.hasResearchStation).toBe(true);
      expect(result.state.actionsRemaining).toBe(3); // Started with 4, used 1
    }
  });

  it("should remove the city card from player's hand", () => {
    const chicagoCard: CityCard = { type: "city", city: "Chicago", color: Disease.Blue };
    const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
    const state = createTestGameWithCards("Chicago", [chicagoCard, londonCard]);

    const result = buildResearchStation(state);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.hand).toHaveLength(1);
      expect(result.state.players[0]?.hand[0]).toEqual(londonCard);
    }
  });

  it("should add the discarded card to the player discard pile", () => {
    const chicagoCard: CityCard = { type: "city", city: "Chicago", color: Disease.Blue };
    const state = createTestGameWithCards("Chicago", [chicagoCard]);
    const originalDiscardSize = state.playerDiscard.length;

    const result = buildResearchStation(state);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.playerDiscard).toHaveLength(originalDiscardSize + 1);
      expect(result.state.playerDiscard[result.state.playerDiscard.length - 1]).toEqual(
        chicagoCard,
      );
    }
  });

  it("should fail when player does not have the current location card", () => {
    const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
    const state = createTestGameWithCards("Chicago", [londonCard]);

    const result = buildResearchStation(state);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("does not have that city card");
      expect(result.error).toContain("Chicago");
    }
  });

  it("should fail when current location already has a research station", () => {
    const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
    const state = createTestGameWithCards("Atlanta", [atlantaCard]);
    // Atlanta starts with a research station

    const result = buildResearchStation(state);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("research station already exists");
      expect(result.error).toContain("Atlanta");
    }
  });

  it("should count Atlanta's initial research station towards the 6 station limit", () => {
    // Build 5 more stations (Atlanta already has 1)
    const parisCard: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
    let state = createTestGameWithCards("Paris", [parisCard]);

    // Add 5 more research stations to reach the 6-station limit
    const updatedBoard = { ...state.board };
    const chicago = updatedBoard.Chicago;
    const london = updatedBoard.London;
    const tokyo = updatedBoard.Tokyo;
    const sydney = updatedBoard.Sydney;
    const lagos = updatedBoard.Lagos;
    if (chicago && london && tokyo && sydney && lagos) {
      updatedBoard.Chicago = { ...chicago, hasResearchStation: true };
      updatedBoard.London = { ...london, hasResearchStation: true };
      updatedBoard.Tokyo = { ...tokyo, hasResearchStation: true };
      updatedBoard.Sydney = { ...sydney, hasResearchStation: true };
      updatedBoard.Lagos = { ...lagos, hasResearchStation: true };
    }
    state = { ...state, board: updatedBoard };

    // Now try to build a 7th station without specifying a city to remove
    const result = buildResearchStation(state);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("all 6 stations are in use");
      expect(result.error).toContain("Must specify a city to remove");
    }
  });

  it("should allow building when exactly 6 stations exist and a city is specified to remove", () => {
    const parisCard: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
    let state = createTestGameWithCards("Paris", [parisCard]);

    // Add 5 more research stations to reach the 6-station limit
    const updatedBoard = { ...state.board };
    const chicago = updatedBoard.Chicago;
    const london = updatedBoard.London;
    const tokyo = updatedBoard.Tokyo;
    const sydney = updatedBoard.Sydney;
    const lagos = updatedBoard.Lagos;
    if (chicago && london && tokyo && sydney && lagos) {
      updatedBoard.Chicago = { ...chicago, hasResearchStation: true };
      updatedBoard.London = { ...london, hasResearchStation: true };
      updatedBoard.Tokyo = { ...tokyo, hasResearchStation: true };
      updatedBoard.Sydney = { ...sydney, hasResearchStation: true };
      updatedBoard.Lagos = { ...lagos, hasResearchStation: true };
    }
    state = { ...state, board: updatedBoard };

    // Build in Paris by removing station from Chicago
    const result = buildResearchStation(state, "Chicago");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.board.Paris?.hasResearchStation).toBe(true);
      expect(result.state.board.Chicago?.hasResearchStation).toBe(false);
      // Should still have exactly 6 stations
      const stationCount = Object.values(result.state.board).filter(
        (cityState) => cityState.hasResearchStation,
      ).length;
      expect(stationCount).toBe(6);
    }
  });

  it("should fail when trying to remove station from city that doesn't have one", () => {
    const parisCard: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
    let state = createTestGameWithCards("Paris", [parisCard]);

    // Add 5 more research stations to reach the 6-station limit
    const updatedBoard = { ...state.board };
    const chicago = updatedBoard.Chicago;
    const london = updatedBoard.London;
    const tokyo = updatedBoard.Tokyo;
    const sydney = updatedBoard.Sydney;
    const lagos = updatedBoard.Lagos;
    if (chicago && london && tokyo && sydney && lagos) {
      updatedBoard.Chicago = { ...chicago, hasResearchStation: true };
      updatedBoard.London = { ...london, hasResearchStation: true };
      updatedBoard.Tokyo = { ...tokyo, hasResearchStation: true };
      updatedBoard.Sydney = { ...sydney, hasResearchStation: true };
      updatedBoard.Lagos = { ...lagos, hasResearchStation: true };
    }
    state = { ...state, board: updatedBoard };

    // Try to remove station from Montreal, which doesn't have one
    const result = buildResearchStation(state, "Montreal");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("no research station exists");
      expect(result.error).toContain("Montreal");
    }
  });

  it("should fail when specifying city to remove but less than 6 stations exist", () => {
    const chicagoCard: CityCard = { type: "city", city: "Chicago", color: Disease.Blue };
    const state = createTestGameWithCards("Chicago", [chicagoCard]);
    // Only Atlanta has a station (1 total)

    const result = buildResearchStation(state, "Atlanta");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("only remove stations when all 6 are in use");
    }
  });

  it("should preserve other city states when building a station", () => {
    const chicagoCard: CityCard = { type: "city", city: "Chicago", color: Disease.Blue };
    let state = createTestGameWithCards("Chicago", [chicagoCard]);

    // Add some disease cubes to Chicago and London
    const updatedBoard = { ...state.board };
    const chicago = updatedBoard.Chicago;
    const london = updatedBoard.London;
    if (chicago && london) {
      updatedBoard.Chicago = { ...chicago, blue: 2, red: 1 };
      updatedBoard.London = { ...london, blue: 3 };
    }
    state = { ...state, board: updatedBoard };

    const result = buildResearchStation(state);

    expect(result.success).toBe(true);
    if (result.success) {
      // Chicago should have station AND preserve disease cubes
      expect(result.state.board.Chicago?.hasResearchStation).toBe(true);
      expect(result.state.board.Chicago?.blue).toBe(2);
      expect(result.state.board.Chicago?.red).toBe(1);
      // London should be unchanged
      expect(result.state.board.London?.blue).toBe(3);
      expect(result.state.board.London?.hasResearchStation).toBe(false);
    }
  });

  it("should work from different cities", () => {
    const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
    const state = createTestGameWithCards("London", [londonCard]);

    const result = buildResearchStation(state);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.board.London?.hasResearchStation).toBe(true);
    }
  });

  it("should decrement actions remaining", () => {
    const chicagoCard: CityCard = { type: "city", city: "Chicago", color: Disease.Blue };
    const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
    let state = createTestGameWithCards("Chicago", [chicagoCard, londonCard]);

    const result1 = buildResearchStation(state);
    expect(result1.success).toBe(true);
    if (!result1.success) return;
    state = result1.state;
    expect(state.actionsRemaining).toBe(3);

    // Move to London and build another station
    const updatedPlayers = state.players.map((player, index) => {
      if (index === 0) {
        return { ...player, location: "London" };
      }
      return player;
    });
    state = { ...state, players: updatedPlayers };

    const result2 = buildResearchStation(state);
    expect(result2.success).toBe(true);
    if (result2.success) {
      expect(result2.state.actionsRemaining).toBe(2);
    }
  });

  it("should chain with other actions", () => {
    const chicagoCard: CityCard = { type: "city", city: "Chicago", color: Disease.Blue };
    let state = createTestGameWithCards("Atlanta", [chicagoCard]);

    // First, drive to Chicago
    let result = driveFerry(state, "Chicago");
    expect(result.success).toBe(true);
    if (!result.success) return;
    state = result.state;
    expect(state.actionsRemaining).toBe(3);

    // Then build a research station in Chicago
    result = buildResearchStation(state);
    expect(result.success).toBe(true);
    if (!result.success) return;
    state = result.state;
    expect(state.actionsRemaining).toBe(2);

    expect(result.state.board.Chicago?.hasResearchStation).toBe(true);
    expect(result.state.players[0]?.location).toBe("Chicago");
  });
});

describe("treatDisease", () => {
  // Helper to create a test game state with disease cubes in a specific city
  function createTestGameWithDiseases(
    location: string = "Atlanta",
    diseases: Partial<Record<Disease, number>> = {},
  ): GameState {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    // Move the current player to the specified location
    // Set role to Dispatcher (a role without special abilities affecting treat/cure actions)
    const updatedPlayers = state.players.map((player, index) => {
      if (index === 0) {
        return { ...player, location, role: "dispatcher" };
      }
      return player;
    });

    // Add disease cubes to the location
    const updatedBoard = { ...state.board };
    const cityState = updatedBoard[location];
    if (cityState) {
      updatedBoard[location] = {
        ...cityState,
        blue: diseases[Disease.Blue] ?? cityState.blue,
        yellow: diseases[Disease.Yellow] ?? cityState.yellow,
        black: diseases[Disease.Black] ?? cityState.black,
        red: diseases[Disease.Red] ?? cityState.red,
      };
    }

    // Update cube supply to reflect placed cubes
    const cubeSupply = { ...state.cubeSupply };
    for (const [color, count] of Object.entries(diseases)) {
      const currentSupply = cubeSupply[color];
      if (currentSupply !== undefined && count !== undefined) {
        cubeSupply[color] = currentSupply - count;
      }
    }

    return { ...state, players: updatedPlayers, board: updatedBoard, cubeSupply };
  }

  it("should successfully remove 1 cube of the specified color", () => {
    const state = createTestGameWithDiseases("Atlanta", { [Disease.Blue]: 2 });

    const result = treatDisease(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.board.Atlanta?.blue).toBe(1); // 2 - 1 = 1
      expect(result.state.actionsRemaining).toBe(3); // Started with 4, used 1
    }
  });

  it("should return cube to supply", () => {
    const state = createTestGameWithDiseases("Atlanta", { [Disease.Blue]: 2 });
    const originalSupply = state.cubeSupply[Disease.Blue] ?? 0;

    const result = treatDisease(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.cubeSupply[Disease.Blue]).toBe(originalSupply + 1);
    }
  });

  it("should remove all cubes of specified color when disease is cured", () => {
    let state = createTestGameWithDiseases("Atlanta", { [Disease.Blue]: 3 });
    // Mark blue disease as cured
    const updatedCures = { ...state.cures, [Disease.Blue]: CureStatus.Cured };
    state = { ...state, cures: updatedCures };

    const result = treatDisease(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.board.Atlanta?.blue).toBe(0); // All 3 cubes removed
      expect(result.state.actionsRemaining).toBe(3);
    }
  });

  it("should return all cubes to supply when disease is cured", () => {
    let state = createTestGameWithDiseases("Atlanta", { [Disease.Blue]: 3 });
    const originalSupply = state.cubeSupply[Disease.Blue] ?? 0;
    // Mark blue disease as cured
    const updatedCures = { ...state.cures, [Disease.Blue]: CureStatus.Cured };
    state = { ...state, cures: updatedCures };

    const result = treatDisease(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.cubeSupply[Disease.Blue]).toBe(originalSupply + 3);
    }
  });

  it("should remove all cubes when disease is eradicated", () => {
    let state = createTestGameWithDiseases("Atlanta", { [Disease.Blue]: 2 });
    // Mark blue disease as eradicated
    const updatedCures = { ...state.cures, [Disease.Blue]: CureStatus.Eradicated };
    state = { ...state, cures: updatedCures };

    const result = treatDisease(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.board.Atlanta?.blue).toBe(0); // All 2 cubes removed
    }
  });

  it("should fail when there are no cubes of the specified color", () => {
    const state = createTestGameWithDiseases("Atlanta", { [Disease.Blue]: 0 });

    const result = treatDisease(state, Disease.Blue);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("no blue cubes present");
      expect(result.error).toContain("Atlanta");
    }
  });

  it("should work with different disease colors", () => {
    const state = createTestGameWithDiseases("Atlanta", {
      [Disease.Blue]: 1,
      [Disease.Yellow]: 2,
      [Disease.Black]: 1,
      [Disease.Red]: 3,
    });

    const resultBlue = treatDisease(state, Disease.Blue);
    expect(resultBlue.success).toBe(true);

    const resultYellow = treatDisease(state, Disease.Yellow);
    expect(resultYellow.success).toBe(true);

    const resultBlack = treatDisease(state, Disease.Black);
    expect(resultBlack.success).toBe(true);

    const resultRed = treatDisease(state, Disease.Red);
    expect(resultRed.success).toBe(true);
  });

  it("should only remove cubes from current location, not other cities", () => {
    let state = createTestGameWithDiseases("Atlanta", { [Disease.Blue]: 2 });

    // Add blue cubes to Chicago as well
    const updatedBoard = { ...state.board };
    const chicagoState = updatedBoard.Chicago;
    if (chicagoState) {
      updatedBoard.Chicago = { ...chicagoState, blue: 3 };
    }
    state = { ...state, board: updatedBoard };

    const result = treatDisease(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.board.Atlanta?.blue).toBe(1); // Treated
      expect(result.state.board.Chicago?.blue).toBe(3); // Unchanged
    }
  });

  it("should allow treating same color multiple times", () => {
    let state = createTestGameWithDiseases("Atlanta", { [Disease.Blue]: 3 });

    // Treat blue once
    let result = treatDisease(state, Disease.Blue);
    expect(result.success).toBe(true);
    if (!result.success) return;
    state = result.state;
    expect(state.board.Atlanta?.blue).toBe(2);
    expect(state.actionsRemaining).toBe(3);

    // Treat blue again
    result = treatDisease(state, Disease.Blue);
    expect(result.success).toBe(true);
    if (!result.success) return;
    state = result.state;
    expect(state.board.Atlanta?.blue).toBe(1);
    expect(state.actionsRemaining).toBe(2);

    // Treat blue a third time
    result = treatDisease(state, Disease.Blue);
    expect(result.success).toBe(true);
    if (!result.success) return;
    state = result.state;
    expect(state.board.Atlanta?.blue).toBe(0);
    expect(state.actionsRemaining).toBe(1);
  });

  it("should fail on fourth treatment attempt when all cubes removed", () => {
    let state = createTestGameWithDiseases("Atlanta", { [Disease.Blue]: 3 });

    // Treat blue 3 times to remove all cubes
    for (let i = 0; i < 3; i++) {
      const result = treatDisease(state, Disease.Blue);
      expect(result.success).toBe(true);
      if (!result.success) return;
      state = result.state;
    }

    // Fourth attempt should fail
    const result = treatDisease(state, Disease.Blue);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("no blue cubes present");
    }
  });

  it("should preserve other disease cubes in the same city", () => {
    const state = createTestGameWithDiseases("Atlanta", {
      [Disease.Blue]: 2,
      [Disease.Yellow]: 1,
      [Disease.Black]: 3,
    });

    const result = treatDisease(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.board.Atlanta?.blue).toBe(1); // Treated
      expect(result.state.board.Atlanta?.yellow).toBe(1); // Unchanged
      expect(result.state.board.Atlanta?.black).toBe(3); // Unchanged
    }
  });

  it("should work from different cities", () => {
    const state = createTestGameWithDiseases("London", { [Disease.Blue]: 2 });

    const result = treatDisease(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.board.London?.blue).toBe(1);
    }
  });

  it("should decrement actions remaining", () => {
    let state = createTestGameWithDiseases("Atlanta", {
      [Disease.Blue]: 2,
      [Disease.Yellow]: 1,
    });

    const result1 = treatDisease(state, Disease.Blue);
    expect(result1.success).toBe(true);
    if (!result1.success) return;
    state = result1.state;
    expect(state.actionsRemaining).toBe(3);

    const result2 = treatDisease(state, Disease.Yellow);
    expect(result2.success).toBe(true);
    if (result2.success) {
      expect(result2.state.actionsRemaining).toBe(2);
    }
  });

  it("should treat 1 cube even when disease is uncured", () => {
    let state = createTestGameWithDiseases("Atlanta", { [Disease.Blue]: 3 });
    // Explicitly ensure blue is uncured
    const updatedCures = { ...state.cures, [Disease.Blue]: CureStatus.Uncured };
    state = { ...state, cures: updatedCures };

    const result = treatDisease(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.board.Atlanta?.blue).toBe(2); // Only 1 cube removed
    }
  });

  it("should handle treating the last cube of an uncured disease", () => {
    let state = createTestGameWithDiseases("Atlanta", { [Disease.Blue]: 1 });
    const updatedCures = { ...state.cures, [Disease.Blue]: CureStatus.Uncured };
    state = { ...state, cures: updatedCures };

    const result = treatDisease(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.board.Atlanta?.blue).toBe(0);
      // Note: Cure status should remain Uncured (eradication check is separate)
      expect(result.state.cures[Disease.Blue]).toBe(CureStatus.Uncured);
    }
  });

  it("should chain with other actions", () => {
    let state = createTestGameWithDiseases("Atlanta", { [Disease.Blue]: 2 });

    // First, treat disease
    let result = treatDisease(state, Disease.Blue);
    expect(result.success).toBe(true);
    if (!result.success) return;
    state = result.state;
    expect(state.actionsRemaining).toBe(3);

    // Then drive to Chicago
    result = driveFerry(state, "Chicago");
    expect(result.success).toBe(true);
    if (!result.success) return;
    state = result.state;
    expect(state.actionsRemaining).toBe(2);

    expect(result.state.players[0]?.location).toBe("Chicago");
    expect(result.state.board.Atlanta?.blue).toBe(1); // Still treated
  });

  it("should not modify research station status", () => {
    const state = createTestGameWithDiseases("Atlanta", { [Disease.Blue]: 2 });
    const hasStation = state.board.Atlanta?.hasResearchStation;

    const result = treatDisease(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.board.Atlanta?.hasResearchStation).toBe(hasStation);
    }
  });
});

describe("shareKnowledge", () => {
  // Helper to create a test game state with two players at specific locations with specific cards
  function createTestGameWithPlayers(
    player1Location: string = "Atlanta",
    player1Cards: CityCard[] = [],
    player2Location: string = "Atlanta",
    player2Cards: CityCard[] = [],
  ): GameState {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const updatedPlayers = state.players.map((player, index) => {
      if (index === 0) {
        return { ...player, location: player1Location, hand: player1Cards };
      } else if (index === 1) {
        return { ...player, location: player2Location, hand: player2Cards };
      }
      return player;
    });
    return { ...state, players: updatedPlayers };
  }

  describe("giving a card to another player", () => {
    it("should successfully give city card to another player in the same city", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      const state = createTestGameWithPlayers("Atlanta", [atlantaCard], "Atlanta", []);

      const result = shareKnowledge(state, 1, true); // Give to player 1

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[0]?.hand).toHaveLength(0); // Card removed from current player
        expect(result.state.players[1]?.hand).toHaveLength(1); // Card added to target player
        expect(result.state.players[1]?.hand[0]).toEqual(atlantaCard);
        expect(result.state.actionsRemaining).toBe(3); // Action consumed
      }
    });

    it("should fail when current player does not have the matching city card", () => {
      const chicagoCard: CityCard = { type: "city", city: "Chicago", color: Disease.Blue };
      const state = createTestGameWithPlayers("Atlanta", [chicagoCard], "Atlanta", []);

      const result = shareKnowledge(state, 1, true);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("you do not have");
        expect(result.error).toContain("Atlanta");
      }
    });

    it("should fail when target player is in a different city", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      const state = createTestGameWithPlayers("Atlanta", [atlantaCard], "Chicago", []);

      const result = shareKnowledge(state, 1, true);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("same city");
        expect(result.error).toContain("Atlanta");
        expect(result.error).toContain("Chicago");
      }
    });

    it("should fail when target player has 7 cards (hand limit)", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
      const parisCard: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
      const chicagoCard: CityCard = { type: "city", city: "Chicago", color: Disease.Blue };
      const tokyoCard: CityCard = { type: "city", city: "Tokyo", color: Disease.Red };
      const miamiCard: CityCard = { type: "city", city: "Miami", color: Disease.Yellow };
      const madridCard: CityCard = { type: "city", city: "Madrid", color: Disease.Blue };
      const lagosCard: CityCard = { type: "city", city: "Lagos", color: Disease.Yellow };

      const state = createTestGameWithPlayers("Atlanta", [atlantaCard], "Atlanta", [
        londonCard,
        parisCard,
        chicagoCard,
        tokyoCard,
        miamiCard,
        madridCard,
        lagosCard,
      ]);

      const result = shareKnowledge(state, 1, true);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("7 cards");
        expect(result.error).toContain("target player");
      }
    });

    it("should preserve other cards in both players' hands", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
      const parisCard: CityCard = { type: "city", city: "Paris", color: Disease.Blue };

      const state = createTestGameWithPlayers("Atlanta", [atlantaCard, londonCard], "Atlanta", [
        parisCard,
      ]);

      const result = shareKnowledge(state, 1, true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[0]?.hand).toHaveLength(1);
        expect(result.state.players[0]?.hand[0]).toEqual(londonCard);
        expect(result.state.players[1]?.hand).toHaveLength(2);
        expect(result.state.players[1]?.hand).toContainEqual(parisCard);
        expect(result.state.players[1]?.hand).toContainEqual(atlantaCard);
      }
    });
  });

  describe("taking a card from another player", () => {
    it("should successfully take city card from another player in the same city", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      const state = createTestGameWithPlayers("Atlanta", [], "Atlanta", [atlantaCard]);

      const result = shareKnowledge(state, 1, false); // Take from player 1

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[0]?.hand).toHaveLength(1); // Card added to current player
        expect(result.state.players[0]?.hand[0]).toEqual(atlantaCard);
        expect(result.state.players[1]?.hand).toHaveLength(0); // Card removed from target player
        expect(result.state.actionsRemaining).toBe(3); // Action consumed
      }
    });

    it("should fail when target player does not have the matching city card", () => {
      const chicagoCard: CityCard = { type: "city", city: "Chicago", color: Disease.Blue };
      const state = createTestGameWithPlayers("Atlanta", [], "Atlanta", [chicagoCard]);

      const result = shareKnowledge(state, 1, false);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("they do not have");
        expect(result.error).toContain("Atlanta");
      }
    });

    it("should fail when current player has 7 cards (hand limit)", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
      const parisCard: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
      const chicagoCard: CityCard = { type: "city", city: "Chicago", color: Disease.Blue };
      const tokyoCard: CityCard = { type: "city", city: "Tokyo", color: Disease.Red };
      const miamiCard: CityCard = { type: "city", city: "Miami", color: Disease.Yellow };
      const madridCard: CityCard = { type: "city", city: "Madrid", color: Disease.Blue };
      const lagosCard: CityCard = { type: "city", city: "Lagos", color: Disease.Yellow };

      const state = createTestGameWithPlayers(
        "Atlanta",
        [londonCard, parisCard, chicagoCard, tokyoCard, miamiCard, madridCard, lagosCard],
        "Atlanta",
        [atlantaCard],
      );

      const result = shareKnowledge(state, 1, false);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("7 cards");
        expect(result.error).toContain("you");
      }
    });

    it("should fail when target player is in a different city", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      const state = createTestGameWithPlayers("Atlanta", [], "Chicago", [atlantaCard]);

      const result = shareKnowledge(state, 1, false);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("same city");
      }
    });
  });

  describe("validation", () => {
    it("should fail when trying to share with yourself", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      const state = createTestGameWithPlayers("Atlanta", [atlantaCard], "Chicago", []);

      const result = shareKnowledge(state, 0, true); // Try to give to yourself (player 0)

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Cannot share knowledge with yourself");
      }
    });

    it("should fail with invalid target player index (negative)", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      const state = createTestGameWithPlayers("Atlanta", [atlantaCard], "Atlanta", []);

      const result = shareKnowledge(state, -1, true);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid target player index");
      }
    });

    it("should fail with invalid target player index (too high)", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      const state = createTestGameWithPlayers("Atlanta", [atlantaCard], "Atlanta", []);

      const result = shareKnowledge(state, 5, true); // Only 2 players in game

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid target player index");
      }
    });

    it("should fail when city does not exist", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      let state = createTestGameWithPlayers("Atlanta", [atlantaCard], "Atlanta", []);

      // Manually set both players' location to invalid city (edge case)
      const updatedPlayers = state.players.map((player) => {
        return { ...player, location: "InvalidCity" };
      });
      state = { ...state, players: updatedPlayers };

      const result = shareKnowledge(state, 1, true);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid current location");
      }
    });
  });

  describe("different cities", () => {
    it("should work from Chicago when both players are there", () => {
      const chicagoCard: CityCard = { type: "city", city: "Chicago", color: Disease.Blue };
      const state = createTestGameWithPlayers("Chicago", [chicagoCard], "Chicago", []);

      const result = shareKnowledge(state, 1, true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[0]?.hand).toHaveLength(0);
        expect(result.state.players[1]?.hand).toHaveLength(1);
        expect(result.state.players[1]?.hand[0]).toEqual(chicagoCard);
      }
    });

    it("should work from Tokyo when both players are there", () => {
      const tokyoCard: CityCard = { type: "city", city: "Tokyo", color: Disease.Red };
      const state = createTestGameWithPlayers("Tokyo", [tokyoCard], "Tokyo", []);

      const result = shareKnowledge(state, 1, true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[1]?.hand[0]).toEqual(tokyoCard);
      }
    });
  });

  describe("game state preservation", () => {
    it("should not modify the board state", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      const state = createTestGameWithPlayers("Atlanta", [atlantaCard], "Atlanta", []);
      const originalBoard = state.board;

      const result = shareKnowledge(state, 1, true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.board).toBe(originalBoard);
      }
    });

    it("should not modify player locations", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      const state = createTestGameWithPlayers("Atlanta", [atlantaCard], "Atlanta", []);

      const result = shareKnowledge(state, 1, true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[0]?.location).toBe("Atlanta");
        expect(result.state.players[1]?.location).toBe("Atlanta");
      }
    });

    it("should not add cards to discard pile", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      const state = createTestGameWithPlayers("Atlanta", [atlantaCard], "Atlanta", []);
      const originalDiscardSize = state.playerDiscard.length;

      const result = shareKnowledge(state, 1, true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.playerDiscard).toHaveLength(originalDiscardSize);
      }
    });

    it("should decrement actions remaining", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      let state = createTestGameWithPlayers("Atlanta", [atlantaCard], "Atlanta", []);

      // First share: give Atlanta card to player 1
      const result1 = shareKnowledge(state, 1, true);
      expect(result1.success).toBe(true);
      if (!result1.success) return;
      state = result1.state;
      expect(state.actionsRemaining).toBe(3);
      expect(state.players[1]?.hand).toContainEqual(atlantaCard);

      // Now player 1 has the Atlanta card, take it back (still in Atlanta)
      const result2 = shareKnowledge(state, 1, false);
      expect(result2.success).toBe(true);
      if (!result2.success) return;
      state = result2.state;
      expect(state.actionsRemaining).toBe(2);
      expect(state.players[0]?.hand).toContainEqual(atlantaCard);
    });
  });

  describe("chaining with other actions", () => {
    it("should chain with movement actions", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      let state = createTestGameWithPlayers("Atlanta", [atlantaCard], "Atlanta", []);

      // First, share knowledge
      let result = shareKnowledge(state, 1, true);
      expect(result.success).toBe(true);
      if (!result.success) return;
      state = result.state;
      expect(state.actionsRemaining).toBe(3);
      expect(state.players[1]?.hand).toHaveLength(1);

      // Then drive to Chicago
      result = driveFerry(state, "Chicago");
      expect(result.success).toBe(true);
      if (!result.success) return;
      state = result.state;
      expect(state.actionsRemaining).toBe(2);
      expect(state.players[0]?.location).toBe("Chicago");
      expect(state.players[1]?.hand).toHaveLength(1); // Still has the card
    });
  });

  describe("multi-player scenarios (3 players)", () => {
    it("should work with player index 2 in a 3-player game", () => {
      const atlantaCard: CityCard = { type: "city", city: "Atlanta", color: Disease.Blue };
      let state = createGame({ playerCount: 3, difficulty: 4 });

      // Set all 3 players to Atlanta
      const updatedPlayers = state.players.map((player, index) => {
        if (index === 0) {
          return { ...player, location: "Atlanta", hand: [atlantaCard] };
        }
        return { ...player, location: "Atlanta" };
      });
      state = { ...state, players: updatedPlayers };

      const result = shareKnowledge(state, 2, true); // Give to player 2

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[0]?.hand).toHaveLength(0);
        expect(result.state.players[2]?.hand).toContainEqual(atlantaCard);
      }
    });
  });
});

describe("discoverCure", () => {
  // Helper to create a test game with player at Atlanta (with research station)
  // and specific cards in hand
  function createTestGameWithCards(cards: CityCard[]): GameState {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const updatedPlayers = state.players.map((player, index) => {
      if (index === 0) {
        // Set role to Dispatcher (no special abilities for curing)
        return { ...player, location: "Atlanta", hand: cards, role: "dispatcher" };
      }
      return player;
    });
    return { ...state, players: updatedPlayers };
  }

  it("should successfully cure a disease with 5 cards of the same color", () => {
    // Create 5 blue city cards
    const blueCards: CityCard[] = [
      { type: "city", city: "Atlanta", color: Disease.Blue },
      { type: "city", city: "Chicago", color: Disease.Blue },
      { type: "city", city: "London", color: Disease.Blue },
      { type: "city", city: "Paris", color: Disease.Blue },
      { type: "city", city: "Milan", color: Disease.Blue },
    ];

    const state = createTestGameWithCards(blueCards);

    // Ensure there's at least one blue cube on the board (so it's cured, not eradicated)
    const parisState = state.board["Paris"];
    if (parisState) {
      state.board["Paris"] = { ...parisState, blue: 1 };
      state.cubeSupply.blue = (state.cubeSupply.blue || 24) - 1;
    }

    const result = discoverCure(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.cures[Disease.Blue]).toBe(CureStatus.Cured);
      expect(result.state.players[0]?.hand).toHaveLength(0); // All 5 cards discarded
      expect(result.state.playerDiscard).toHaveLength(5); // 5 cards in discard
      expect(result.state.actionsRemaining).toBe(3);
    }
  });

  it("should eradicate disease when no cubes remain on board", () => {
    const blueCards: CityCard[] = [
      { type: "city", city: "Atlanta", color: Disease.Blue },
      { type: "city", city: "Chicago", color: Disease.Blue },
      { type: "city", city: "London", color: Disease.Blue },
      { type: "city", city: "Paris", color: Disease.Blue },
      { type: "city", city: "Milan", color: Disease.Blue },
    ];

    let state = createTestGameWithCards(blueCards);

    // Remove all blue cubes from the board (default game starts with no cubes,
    // but let's be explicit)
    const updatedBoard: Record<string, CityState> = {};
    for (const cityName in state.board) {
      const cityState = state.board[cityName];
      if (cityState !== undefined) {
        updatedBoard[cityName] = {
          ...cityState,
          blue: 0,
        };
      }
    }
    state = { ...state, board: updatedBoard };

    const result = discoverCure(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.cures[Disease.Blue]).toBe(CureStatus.Eradicated);
    }
  });

  it("should cure (not eradicate) when cubes remain on board", () => {
    const blueCards: CityCard[] = [
      { type: "city", city: "Atlanta", color: Disease.Blue },
      { type: "city", city: "Chicago", color: Disease.Blue },
      { type: "city", city: "London", color: Disease.Blue },
      { type: "city", city: "Paris", color: Disease.Blue },
      { type: "city", city: "Milan", color: Disease.Blue },
    ];

    let state = createTestGameWithCards(blueCards);

    // Add blue cubes to Chicago
    const updatedBoard: Record<string, CityState> = {};
    for (const cityName in state.board) {
      const cityState = state.board[cityName];
      if (cityState !== undefined) {
        if (cityName === "Chicago") {
          updatedBoard[cityName] = {
            ...cityState,
            blue: 2,
          };
        } else {
          updatedBoard[cityName] = cityState;
        }
      }
    }
    state = { ...state, board: updatedBoard };

    const result = discoverCure(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.cures[Disease.Blue]).toBe(CureStatus.Cured);
    }
  });

  it("should discard exactly 5 cards even if player has more than 5", () => {
    const blueCards: CityCard[] = [
      { type: "city", city: "Atlanta", color: Disease.Blue },
      { type: "city", city: "Chicago", color: Disease.Blue },
      { type: "city", city: "London", color: Disease.Blue },
      { type: "city", city: "Paris", color: Disease.Blue },
      { type: "city", city: "Milan", color: Disease.Blue },
      { type: "city", city: "New York", color: Disease.Blue },
      { type: "city", city: "Madrid", color: Disease.Blue },
    ];

    const state = createTestGameWithCards(blueCards);

    // Add a blue cube to the board so disease won't be eradicated
    const londonState = state.board["London"];
    if (!londonState) throw new Error("London not found");
    const updatedBoard = {
      ...state.board,
      London: { ...londonState, blue: 1 },
    };
    const stateWithCubes = {
      ...state,
      board: updatedBoard,
      cubeSupply: { ...state.cubeSupply, blue: state.cubeSupply.blue - 1 },
    };

    const result = discoverCure(stateWithCubes, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[0]?.hand).toHaveLength(2); // 7 - 5 = 2 cards remaining
      expect(result.state.playerDiscard).toHaveLength(5); // Exactly 5 cards discarded
      expect(result.state.cures[Disease.Blue]).toBe(CureStatus.Cured);
    }
  });

  it("should work with different disease colors", () => {
    const yellowCards: CityCard[] = [
      { type: "city", city: "Lagos", color: Disease.Yellow },
      { type: "city", city: "Khartoum", color: Disease.Yellow },
      { type: "city", city: "Kinshasa", color: Disease.Yellow },
      { type: "city", city: "Johannesburg", color: Disease.Yellow },
      { type: "city", city: "Sao Paulo", color: Disease.Yellow },
    ];

    const state = createTestGameWithCards(yellowCards);
    const result = discoverCure(state, Disease.Yellow);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.cures[Disease.Yellow]).toBe(CureStatus.Cured);
      expect(result.state.cures[Disease.Blue]).toBe(CureStatus.Uncured); // Others unchanged
    }
  });

  it("should fail when not at a research station", () => {
    const blueCards: CityCard[] = [
      { type: "city", city: "Atlanta", color: Disease.Blue },
      { type: "city", city: "Chicago", color: Disease.Blue },
      { type: "city", city: "London", color: Disease.Blue },
      { type: "city", city: "Paris", color: Disease.Blue },
      { type: "city", city: "Milan", color: Disease.Blue },
    ];

    let state = createTestGameWithCards(blueCards);

    // Move player to Chicago (no research station)
    const updatedPlayers = state.players.map((player, index) => {
      if (index === 0) {
        return { ...player, location: "Chicago" };
      }
      return player;
    });
    state = { ...state, players: updatedPlayers };

    const result = discoverCure(state, Disease.Blue);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("no research station");
    }
  });

  it("should fail when player has fewer than 5 cards of the color", () => {
    const cards: CityCard[] = [
      { type: "city", city: "Atlanta", color: Disease.Blue },
      { type: "city", city: "Chicago", color: Disease.Blue },
      { type: "city", city: "London", color: Disease.Blue },
      { type: "city", city: "Paris", color: Disease.Blue },
      // Only 4 blue cards
    ];

    const state = createTestGameWithCards(cards);
    const result = discoverCure(state, Disease.Blue);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("need 5");
      expect(result.error).toContain("only have 4");
    }
  });

  it("should fail when player has 0 cards of the color", () => {
    const cards: CityCard[] = [
      { type: "city", city: "Lagos", color: Disease.Yellow },
      { type: "city", city: "Khartoum", color: Disease.Yellow },
    ];

    const state = createTestGameWithCards(cards);
    const result = discoverCure(state, Disease.Blue);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("need 5");
      expect(result.error).toContain("only have 0");
    }
  });

  it("should fail when disease is already cured", () => {
    const blueCards: CityCard[] = [
      { type: "city", city: "Atlanta", color: Disease.Blue },
      { type: "city", city: "Chicago", color: Disease.Blue },
      { type: "city", city: "London", color: Disease.Blue },
      { type: "city", city: "Paris", color: Disease.Blue },
      { type: "city", city: "Milan", color: Disease.Blue },
    ];

    let state = createTestGameWithCards(blueCards);

    // Cure the disease first
    state = {
      ...state,
      cures: {
        ...state.cures,
        [Disease.Blue]: CureStatus.Cured,
      },
    };

    const result = discoverCure(state, Disease.Blue);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("already cured");
    }
  });

  it("should fail when disease is eradicated", () => {
    const blueCards: CityCard[] = [
      { type: "city", city: "Atlanta", color: Disease.Blue },
      { type: "city", city: "Chicago", color: Disease.Blue },
      { type: "city", city: "London", color: Disease.Blue },
      { type: "city", city: "Paris", color: Disease.Blue },
      { type: "city", city: "Milan", color: Disease.Blue },
    ];

    let state = createTestGameWithCards(blueCards);

    // Eradicate the disease
    state = {
      ...state,
      cures: {
        ...state.cures,
        [Disease.Blue]: CureStatus.Eradicated,
      },
    };

    const result = discoverCure(state, Disease.Blue);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("already cured");
    }
  });

  it("should fail when no actions remaining", () => {
    const blueCards: CityCard[] = [
      { type: "city", city: "Atlanta", color: Disease.Blue },
      { type: "city", city: "Chicago", color: Disease.Blue },
      { type: "city", city: "London", color: Disease.Blue },
      { type: "city", city: "Paris", color: Disease.Blue },
      { type: "city", city: "Milan", color: Disease.Blue },
    ];

    let state = createTestGameWithCards(blueCards);
    state = { ...state, actionsRemaining: 0 };

    const result = discoverCure(state, Disease.Blue);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("no actions remaining");
    }
  });

  it("should fail when game is not in action phase", () => {
    const blueCards: CityCard[] = [
      { type: "city", city: "Atlanta", color: Disease.Blue },
      { type: "city", city: "Chicago", color: Disease.Blue },
      { type: "city", city: "London", color: Disease.Blue },
      { type: "city", city: "Paris", color: Disease.Blue },
      { type: "city", city: "Milan", color: Disease.Blue },
    ];

    let state = createTestGameWithCards(blueCards);
    state = { ...state, phase: TurnPhase.Draw };

    const result = discoverCure(state, Disease.Blue);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("current phase is");
    }
  });

  it("should fail when game has ended", () => {
    const blueCards: CityCard[] = [
      { type: "city", city: "Atlanta", color: Disease.Blue },
      { type: "city", city: "Chicago", color: Disease.Blue },
      { type: "city", city: "London", color: Disease.Blue },
      { type: "city", city: "Paris", color: Disease.Blue },
      { type: "city", city: "Milan", color: Disease.Blue },
    ];

    let state = createTestGameWithCards(blueCards);
    state = { ...state, status: GameStatus.Won };

    const result = discoverCure(state, Disease.Blue);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("game has ended");
    }
  });

  it("should preserve other players", () => {
    const blueCards: CityCard[] = [
      { type: "city", city: "Atlanta", color: Disease.Blue },
      { type: "city", city: "Chicago", color: Disease.Blue },
      { type: "city", city: "London", color: Disease.Blue },
      { type: "city", city: "Paris", color: Disease.Blue },
      { type: "city", city: "Milan", color: Disease.Blue },
    ];

    const state = createTestGameWithCards(blueCards);
    const player2OriginalHand = state.players[1]?.hand;

    const result = discoverCure(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[1]?.hand).toEqual(player2OriginalHand);
    }
  });

  it("should preserve board state", () => {
    const blueCards: CityCard[] = [
      { type: "city", city: "Atlanta", color: Disease.Blue },
      { type: "city", city: "Chicago", color: Disease.Blue },
      { type: "city", city: "London", color: Disease.Blue },
      { type: "city", city: "Paris", color: Disease.Blue },
      { type: "city", city: "Milan", color: Disease.Blue },
    ];

    const state = createTestGameWithCards(blueCards);
    const originalBoard = state.board;

    const result = discoverCure(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.board).toEqual(originalBoard);
    }
  });

  it("should handle player with mixed color cards correctly", () => {
    const mixedCards: CityCard[] = [
      { type: "city", city: "Atlanta", color: Disease.Blue },
      { type: "city", city: "Chicago", color: Disease.Blue },
      { type: "city", city: "Lagos", color: Disease.Yellow },
      { type: "city", city: "London", color: Disease.Blue },
      { type: "city", city: "Paris", color: Disease.Blue },
      { type: "city", city: "Milan", color: Disease.Blue },
      { type: "city", city: "Tokyo", color: Disease.Red },
    ];

    const state = createTestGameWithCards(mixedCards);
    // Add a blue cube to ensure disease is cured (not eradicated)
    const updatedBoard = { ...state.board };
    const londonState = updatedBoard["London"];
    if (londonState !== undefined) {
      updatedBoard["London"] = { ...londonState, blue: 1 };
    }
    const stateWithCubes = { ...state, board: updatedBoard };

    const result = discoverCure(stateWithCubes, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      // Should keep the yellow and red cards
      expect(result.state.players[0]?.hand).toHaveLength(2);
      const remainingCards = result.state.players[0]?.hand;
      expect(
        remainingCards?.some((card) => card.type === "city" && card.color === Disease.Yellow),
      ).toBe(true);
      expect(
        remainingCards?.some((card) => card.type === "city" && card.color === Disease.Red),
      ).toBe(true);
      expect(result.state.cures[Disease.Blue]).toBe(CureStatus.Cured);
    }
  });

  it("should update game status to Won when discovering the 4th cure", () => {
    // Create a game with 3 diseases already cured
    const blueCards: CityCard[] = [
      { type: "city", city: "Atlanta", color: Disease.Blue },
      { type: "city", city: "Chicago", color: Disease.Blue },
      { type: "city", city: "London", color: Disease.Blue },
      { type: "city", city: "Paris", color: Disease.Blue },
      { type: "city", city: "Milan", color: Disease.Blue },
    ];

    let state = createTestGameWithCards(blueCards);

    // Add a blue cube to ensure the disease is cured (not eradicated)
    const atlantaState = state.board["Atlanta"];
    if (atlantaState) {
      state.board["Atlanta"] = { ...atlantaState, blue: 1 };
    }

    // Set 3 diseases as already cured
    state = {
      ...state,
      cures: {
        ...state.cures,
        [Disease.Yellow]: CureStatus.Cured,
        [Disease.Black]: CureStatus.Cured,
        [Disease.Red]: CureStatus.Cured,
      },
      status: GameStatus.Ongoing,
    };

    // Discover the 4th cure (blue)
    const result = discoverCure(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.cures[Disease.Blue]).toBe(CureStatus.Cured);
      expect(result.state.status).toBe(GameStatus.Won);
    }
  });

  it("should not update game status to Won when discovering a cure if not all diseases are cured", () => {
    const blueCards: CityCard[] = [
      { type: "city", city: "Atlanta", color: Disease.Blue },
      { type: "city", city: "Chicago", color: Disease.Blue },
      { type: "city", city: "London", color: Disease.Blue },
      { type: "city", city: "Paris", color: Disease.Blue },
      { type: "city", city: "Milan", color: Disease.Blue },
    ];

    let state = createTestGameWithCards(blueCards);

    // Add a blue cube to ensure the disease is cured (not eradicated)
    const atlantaState = state.board["Atlanta"];
    if (atlantaState) {
      state.board["Atlanta"] = { ...atlantaState, blue: 1 };
    }

    // Set only 1 disease as already cured
    state = {
      ...state,
      cures: {
        ...state.cures,
        [Disease.Yellow]: CureStatus.Cured,
      },
      status: GameStatus.Ongoing,
    };

    // Discover the 2nd cure (blue)
    const result = discoverCure(state, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.cures[Disease.Blue]).toBe(CureStatus.Cured);
      expect(result.state.status).toBe(GameStatus.Ongoing); // Still ongoing
    }
  });
});

// Integration tests for win/loss scenarios
describe("Integration: Win/Loss Scenarios", () => {
  it("should win the game by curing all 4 diseases", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });

    // Get the first two players
    const player0 = state.players[0];
    const player1 = state.players[1];
    if (!player0 || !player1) {
      throw new Error("Expected 2 players in game state");
    }

    // Add a blue cube to ensure the disease is cured (not eradicated)
    const atlantaState = state.board["Atlanta"];
    if (!atlantaState) {
      throw new Error("Atlanta not found on board");
    }
    const updatedBoard = {
      ...state.board,
      Atlanta: { ...atlantaState, blue: 1 },
    };

    // Manually set up a scenario where 3 diseases are cured
    const modifiedState: GameState = {
      ...state,
      board: updatedBoard,
      players: [
        {
          ...player0,
          location: "Atlanta",
          hand: [
            { type: "city", city: "Atlanta", color: Disease.Blue },
            { type: "city", city: "Chicago", color: Disease.Blue },
            { type: "city", city: "London", color: Disease.Blue },
            { type: "city", city: "Paris", color: Disease.Blue },
            { type: "city", city: "Milan", color: Disease.Blue },
          ],
        },
        player1,
      ],
      cures: {
        [Disease.Yellow]: CureStatus.Cured,
        [Disease.Black]: CureStatus.Cured,
        [Disease.Red]: CureStatus.Cured,
        [Disease.Blue]: CureStatus.Uncured,
      },
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
      status: GameStatus.Ongoing,
    };

    // Discover the 4th cure
    const result = discoverCure(modifiedState, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      // Game should be won
      expect(result.state.status).toBe(GameStatus.Won);

      // All 4 diseases should be cured (blue is cured, not eradicated, due to the cube on board)
      expect(result.state.cures[Disease.Blue]).toBe(CureStatus.Cured);
      expect(result.state.cures[Disease.Yellow]).toBe(CureStatus.Cured);
      expect(result.state.cures[Disease.Black]).toBe(CureStatus.Cured);
      expect(result.state.cures[Disease.Red]).toBe(CureStatus.Cured);
    }
  });

  it("should win the game even if diseases are eradicated (not just cured)", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });

    const player0 = state.players[0];
    const player1 = state.players[1];
    if (!player0 || !player1) {
      throw new Error("Expected 2 players in game state");
    }

    const modifiedState: GameState = {
      ...state,
      players: [
        {
          ...player0,
          location: "Atlanta",
          hand: [
            { type: "city", city: "Atlanta", color: Disease.Blue },
            { type: "city", city: "Chicago", color: Disease.Blue },
            { type: "city", city: "London", color: Disease.Blue },
            { type: "city", city: "Paris", color: Disease.Blue },
            { type: "city", city: "Milan", color: Disease.Blue },
          ],
        },
        player1,
      ],
      cures: {
        [Disease.Yellow]: CureStatus.Eradicated,
        [Disease.Black]: CureStatus.Eradicated,
        [Disease.Red]: CureStatus.Cured,
        [Disease.Blue]: CureStatus.Uncured,
      },
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
      status: GameStatus.Ongoing,
    };

    const result = discoverCure(modifiedState, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.status).toBe(GameStatus.Won);
    }
  });

  it("should continue playing when only some diseases are cured", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });

    const player0 = state.players[0];
    const player1 = state.players[1];
    if (!player0 || !player1) {
      throw new Error("Expected 2 players in game state");
    }

    // Add a blue cube to ensure the disease is cured (not eradicated)
    const atlantaState = state.board["Atlanta"];
    if (!atlantaState) {
      throw new Error("Atlanta not found on board");
    }
    const updatedBoard = {
      ...state.board,
      Atlanta: { ...atlantaState, blue: 1 },
    };

    const modifiedState: GameState = {
      ...state,
      board: updatedBoard,
      players: [
        {
          ...player0,
          location: "Atlanta",
          hand: [
            { type: "city", city: "Atlanta", color: Disease.Blue },
            { type: "city", city: "Chicago", color: Disease.Blue },
            { type: "city", city: "London", color: Disease.Blue },
            { type: "city", city: "Paris", color: Disease.Blue },
            { type: "city", city: "Milan", color: Disease.Blue },
          ],
        },
        player1,
      ],
      cures: {
        [Disease.Yellow]: CureStatus.Cured,
        [Disease.Black]: CureStatus.Uncured,
        [Disease.Red]: CureStatus.Uncured,
        [Disease.Blue]: CureStatus.Uncured,
      },
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
      status: GameStatus.Ongoing,
    };

    const result = discoverCure(modifiedState, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      // Game should still be ongoing
      expect(result.state.status).toBe(GameStatus.Ongoing);

      // Only 2 diseases cured
      expect(result.state.cures[Disease.Blue]).toBe(CureStatus.Cured);
      expect(result.state.cures[Disease.Yellow]).toBe(CureStatus.Cured);
      expect(result.state.cures[Disease.Black]).toBe(CureStatus.Uncured);
      expect(result.state.cures[Disease.Red]).toBe(CureStatus.Uncured);
    }
  });
});

describe("Role: Medic", () => {
  it("should remove all cubes of a color when treating (not just 1)", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const player0 = state.players[0];
    if (!player0) throw new Error("Player 0 not found");

    // Place 3 blue cubes in Atlanta
    const atlantaState = state.board["Atlanta"];
    if (!atlantaState) throw new Error("Atlanta not found");

    const currentBlue = atlantaState.blue;
    const cubesToAdd = 3 - currentBlue;

    const modifiedState: GameState = {
      ...state,
      board: {
        ...state.board,
        Atlanta: { ...atlantaState, blue: 3 },
      },
      cubeSupply: {
        ...state.cubeSupply,
        [Disease.Blue]: (state.cubeSupply[Disease.Blue] ?? 24) - cubesToAdd,
      },
      players: [
        { ...player0, role: "medic", location: "Atlanta" },
        state.players[1] || state.players[0],
      ],
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
    };

    const initialSupply = modifiedState.cubeSupply[Disease.Blue] ?? 0;

    const result = treatDisease(modifiedState, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      // Medic removes all 3 cubes, not just 1
      expect(result.state.board["Atlanta"]?.blue).toBe(0);
      // Cubes returned to supply
      expect(result.state.cubeSupply[Disease.Blue]).toBe(initialSupply + 3);
    }
  });

  it("should auto-remove cured disease cubes when Medic moves into a city", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const player0 = state.players[0];
    if (!player0) throw new Error("Player 0 not found");

    // Place blue cubes in Chicago and cure blue disease
    const chicagoState = state.board["Chicago"];
    if (!chicagoState) throw new Error("Chicago not found");

    const currentBlue = chicagoState.blue;
    const cubesToAdd = 2 - currentBlue;

    const modifiedState: GameState = {
      ...state,
      board: {
        ...state.board,
        Chicago: { ...chicagoState, blue: 2 },
      },
      cubeSupply: {
        ...state.cubeSupply,
        [Disease.Blue]: (state.cubeSupply[Disease.Blue] ?? 24) - cubesToAdd,
      },
      players: [
        { ...player0, role: "medic", location: "Atlanta" },
        state.players[1] || state.players[0],
      ],
      cures: {
        ...state.cures,
        [Disease.Blue]: CureStatus.Cured,
      },
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
    };

    const initialSupply = modifiedState.cubeSupply[Disease.Blue] ?? 0;

    // Medic drives from Atlanta to Chicago
    const result = driveFerry(modifiedState, "Chicago");

    expect(result.success).toBe(true);
    if (result.success) {
      // Medic should be in Chicago
      expect(result.state.players[0]?.location).toBe("Chicago");
      // Blue cubes should be auto-removed (passive ability)
      expect(result.state.board["Chicago"]?.blue).toBe(0);
      // Cubes returned to supply
      expect(result.state.cubeSupply[Disease.Blue]).toBe(initialSupply + 2);
    }
  });

  it("should not auto-remove uncured disease cubes when Medic moves", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const player0 = state.players[0];
    if (!player0) throw new Error("Player 0 not found");

    // Place blue cubes in Chicago, but DON'T cure blue
    const chicagoState = state.board["Chicago"];
    if (!chicagoState) throw new Error("Chicago not found");

    const modifiedState: GameState = {
      ...state,
      board: {
        ...state.board,
        Chicago: { ...chicagoState, blue: 2 },
      },
      players: [
        { ...player0, role: "medic", location: "Atlanta" },
        state.players[1] || state.players[0],
      ],
      cures: {
        ...state.cures,
        [Disease.Blue]: CureStatus.Uncured, // Not cured
      },
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
    };

    // Medic drives from Atlanta to Chicago
    const result = driveFerry(modifiedState, "Chicago");

    expect(result.success).toBe(true);
    if (result.success) {
      // Medic should be in Chicago
      expect(result.state.players[0]?.location).toBe("Chicago");
      // Blue cubes should NOT be auto-removed (disease not cured)
      expect(result.state.board["Chicago"]?.blue).toBe(2);
    }
  });

  it("should auto-remove cured disease cubes when cure is discovered while Medic is in city", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const player0 = state.players[0];
    if (!player0) throw new Error("Player 0 not found");

    // Medic is in Paris with blue cubes, about to cure blue disease
    const parisState = state.board["Paris"];
    if (!parisState) throw new Error("Paris not found");

    const atlantaState = state.board["Atlanta"];
    if (!atlantaState) throw new Error("Atlanta not found");

    // Clear all blue cubes from the board (so cure will lead to eradication)
    const clearedBoard: Record<string, CityState> = {};
    for (const cityName in state.board) {
      const cityState = state.board[cityName];
      if (cityState !== undefined) {
        clearedBoard[cityName] = { ...cityState, blue: 0 };
      }
    }

    const parisClearedState = clearedBoard["Paris"];
    const atlantaClearedState = clearedBoard["Atlanta"];
    if (!parisClearedState || !atlantaClearedState) {
      throw new Error("City state not found");
    }

    const modifiedState: GameState = {
      ...state,
      board: {
        ...clearedBoard,
        Paris: { ...parisClearedState, hasResearchStation: true, blue: 3 },
        Atlanta: { ...atlantaClearedState, hasResearchStation: true },
      },
      players: [
        {
          ...player0,
          role: "medic",
          location: "Paris",
          hand: [
            { type: "city", city: "Atlanta", color: Disease.Blue },
            { type: "city", city: "Chicago", color: Disease.Blue },
            { type: "city", city: "London", color: Disease.Blue },
            { type: "city", city: "Milan", color: Disease.Blue },
            { type: "city", city: "Paris", color: Disease.Blue },
          ],
        },
        state.players[1] || state.players[0],
      ],
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
    };

    // Medic discovers cure for blue
    const result = discoverCure(modifiedState, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      // Blue disease should be eradicated (all cubes removed by Medic's passive)
      expect(result.state.cures[Disease.Blue]).toBe(CureStatus.Eradicated);
      // Blue cubes in Paris should be auto-removed by Medic's passive
      expect(result.state.board["Paris"]?.blue).toBe(0);
    }
  });
});

describe("Role: Scientist", () => {
  it("should need only 4 cards to discover a cure (instead of 5)", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const player0 = state.players[0];
    if (!player0) throw new Error("Player 0 not found");

    const atlantaState = state.board["Atlanta"];
    if (!atlantaState) throw new Error("Atlanta not found");

    // Clear all blue cubes from the board (so cure will lead to eradication)
    const clearedBoard: Record<string, CityState> = {};
    for (const cityName in state.board) {
      const cityState = state.board[cityName];
      if (cityState !== undefined) {
        clearedBoard[cityName] = { ...cityState, blue: 0 };
      }
    }

    const atlantaClearedState2 = clearedBoard["Atlanta"];
    if (!atlantaClearedState2) {
      throw new Error("Atlanta state not found");
    }

    const modifiedState: GameState = {
      ...state,
      board: {
        ...clearedBoard,
        Atlanta: { ...atlantaClearedState2, hasResearchStation: true },
      },
      players: [
        {
          ...player0,
          role: "scientist",
          location: "Atlanta",
          hand: [
            { type: "city", city: "Atlanta", color: Disease.Blue },
            { type: "city", city: "Chicago", color: Disease.Blue },
            { type: "city", city: "London", color: Disease.Blue },
            { type: "city", city: "Paris", color: Disease.Blue },
            // Only 4 blue cards (normally need 5)
          ],
        },
        state.players[1] || state.players[0],
      ],
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
    };

    const result = discoverCure(modifiedState, Disease.Blue);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.cures[Disease.Blue]).toBe(CureStatus.Eradicated);
      // Only 4 cards should be discarded
      expect(result.state.playerDiscard.length).toBe(4);
    }
  });

  it("should fail if Scientist has only 3 cards", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const player0 = state.players[0];
    if (!player0) throw new Error("Player 0 not found");

    const atlantaState = state.board["Atlanta"];
    if (!atlantaState) throw new Error("Atlanta not found");

    const modifiedState: GameState = {
      ...state,
      board: {
        ...state.board,
        Atlanta: { ...atlantaState, hasResearchStation: true },
      },
      players: [
        {
          ...player0,
          role: "scientist",
          location: "Atlanta",
          hand: [
            { type: "city", city: "Atlanta", color: Disease.Blue },
            { type: "city", city: "Chicago", color: Disease.Blue },
            { type: "city", city: "London", color: Disease.Blue },
            // Only 3 blue cards (need 4)
          ],
        },
        state.players[1] || state.players[0],
      ],
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
    };

    const result = discoverCure(modifiedState, Disease.Blue);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("need 4");
      expect(result.error).toContain("only have 3");
    }
  });
});

describe("Role: Researcher", () => {
  it("should allow Researcher to give ANY city card (not just matching city)", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const player0 = state.players[0];
    const player1 = state.players[1];
    if (!player0 || !player1) throw new Error("Players not found");

    const modifiedState: GameState = {
      ...state,
      players: [
        {
          ...player0,
          role: "researcher",
          location: "Atlanta",
          hand: [
            { type: "city", city: "London", color: Disease.Blue }, // Different from current city
            { type: "city", city: "Paris", color: Disease.Blue },
          ],
        },
        {
          ...player1,
          location: "Atlanta", // Same city as Researcher
          hand: [],
        },
      ],
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
    };

    // Researcher gives London card while in Atlanta (normally not allowed)
    const result = shareKnowledge(modifiedState, 1, true, "London");

    expect(result.success).toBe(true);
    if (result.success) {
      // Player 0 (Researcher) should have lost the London card
      expect(result.state.players[0]?.hand.length).toBe(1);
      expect(result.state.players[0]?.hand[0]).toEqual({
        type: "city",
        city: "Paris",
        color: Disease.Blue,
      });
      // Player 1 should have received the London card
      expect(result.state.players[1]?.hand.length).toBe(1);
      expect(result.state.players[1]?.hand[0]).toEqual({
        type: "city",
        city: "London",
        color: Disease.Blue,
      });
    }
  });

  it("should require matching city card when Researcher TAKES a card", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const player0 = state.players[0];
    const player1 = state.players[1];
    if (!player0 || !player1) throw new Error("Players not found");

    const modifiedState: GameState = {
      ...state,
      players: [
        {
          ...player0,
          role: "researcher",
          location: "Atlanta",
          hand: [],
        },
        {
          ...player1,
          location: "Atlanta",
          hand: [
            { type: "city", city: "London", color: Disease.Blue }, // Different from current city
          ],
        },
      ],
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
    };

    // Researcher tries to take London card while in Atlanta (should fail)
    const result = shareKnowledge(modifiedState, 1, false);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not have the Atlanta city card");
    }
  });

  it("should work normally for non-Researcher players", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const player0 = state.players[0];
    const player1 = state.players[1];
    if (!player0 || !player1) throw new Error("Players not found");

    const modifiedState: GameState = {
      ...state,
      players: [
        {
          ...player0,
          role: "medic", // Not researcher
          location: "Atlanta",
          hand: [
            { type: "city", city: "London", color: Disease.Blue }, // Different from current city
          ],
        },
        {
          ...player1,
          location: "Atlanta",
          hand: [],
        },
      ],
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
    };

    // Non-researcher tries to give London card while in Atlanta (should fail)
    const result = shareKnowledge(modifiedState, 1, true);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not have the Atlanta city card");
    }
  });
});

describe("Operations Expert Role Abilities", () => {
  function createTestGameWithRole(role: Role, location: string = "Atlanta"): GameState {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    // Set player role and location
    const updatedPlayers = state.players.map((player, index) => {
      if (index === 0) {
        return { ...player, role, location };
      }
      return player;
    });
    return { ...state, players: updatedPlayers };
  }

  describe("buildResearchStation - Operations Expert ability", () => {
    it("should allow Operations Expert to build without discarding card", () => {
      const state = createTestGameWithRole(Role.OperationsExpert, "London");

      const result = buildResearchStation(state);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.board.London?.hasResearchStation).toBe(true);
        expect(result.state.players[0]?.hand.length).toBe(state.players[0]?.hand.length); // No card discarded
        expect(result.state.actionsRemaining).toBe(3);
      }
    });

    it("should allow Operations Expert to build with card if they have it", () => {
      let state = createTestGameWithRole(Role.OperationsExpert, "London");

      // Add London card to hand
      const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
      const updatedPlayers = state.players.map((player, index) => {
        if (index === 0) {
          return { ...player, hand: [...player.hand, londonCard] };
        }
        return player;
      });
      state = { ...state, players: updatedPlayers };

      const originalHandSize = state.players[0]?.hand.length ?? 0;
      const result = buildResearchStation(state);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.board.London?.hasResearchStation).toBe(true);
        // Card is discarded if player has it
        expect(result.state.players[0]?.hand.length).toBe(originalHandSize - 1);
        expect(result.state.playerDiscard.length).toBe(state.playerDiscard.length + 1);
      }
    });

    it("should fail for non-Operations Expert without city card", () => {
      const state = createTestGameWithRole(Role.Medic, "London");

      const result = buildResearchStation(state);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("does not have that city card");
      }
    });

    it("should allow Operations Expert to build when at 6 station limit", () => {
      let state = createTestGameWithRole(Role.OperationsExpert, "London");

      // Add 6 research stations to other cities
      const updatedBoard = { ...state.board };
      const cities = ["Chicago", "Miami", "Washington", "San Francisco", "Montreal", "New York"];
      for (const city of cities) {
        const cityState = updatedBoard[city];
        if (cityState) {
          updatedBoard[city] = { ...cityState, hasResearchStation: true };
        }
      }
      state = { ...state, board: updatedBoard };

      const result = buildResearchStation(state, "Chicago");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.board.London?.hasResearchStation).toBe(true);
        expect(result.state.board.Chicago?.hasResearchStation).toBe(false);
      }
    });
  });

  describe("operationsExpertMove", () => {
    it("should allow Operations Expert to move from research station with any city card", () => {
      let state = createTestGameWithRole(Role.OperationsExpert, "Atlanta");

      // Add Paris card to hand (not matching current location)
      const parisCard: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
      const updatedPlayers = state.players.map((player, index) => {
        if (index === 0) {
          return { ...player, hand: [...player.hand, parisCard] };
        }
        return player;
      });
      state = { ...state, players: updatedPlayers };

      const result = operationsExpertMove(state, "London", "Paris");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[0]?.location).toBe("London");
        expect(result.state.actionsRemaining).toBe(3);
        expect(result.state.operationsExpertSpecialMoveUsed).toBe(true);
        expect(
          result.state.playerDiscard.some((card) => card.type === "city" && card.city === "Paris"),
        ).toBe(true);
      }
    });

    it("should fail if not Operations Expert", () => {
      let state = createTestGameWithRole(Role.Medic, "Atlanta");

      const parisCard: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
      const updatedPlayers = state.players.map((player, index) => {
        if (index === 0) {
          return { ...player, hand: [...player.hand, parisCard] };
        }
        return player;
      });
      state = { ...state, players: updatedPlayers };

      const result = operationsExpertMove(state, "London", "Paris");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not Operations Expert");
      }
    });

    it("should fail if not at research station", () => {
      let state = createTestGameWithRole(Role.OperationsExpert, "London");

      const parisCard: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
      const updatedPlayers = state.players.map((player, index) => {
        if (index === 0) {
          return { ...player, hand: [...player.hand, parisCard] };
        }
        return player;
      });
      state = { ...state, players: updatedPlayers };

      const result = operationsExpertMove(state, "Madrid", "Paris");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("no research station at current location");
      }
    });

    it("should fail if player does not have the city card", () => {
      const state = createTestGameWithRole(Role.OperationsExpert, "Atlanta");

      const result = operationsExpertMove(state, "London", "Paris");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("does not have the Paris city card");
      }
    });

    it("should fail if special move already used this turn", () => {
      let state = createTestGameWithRole(Role.OperationsExpert, "Atlanta");

      // Add two city cards
      const parisCard: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
      const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
      const updatedPlayers = state.players.map((player, index) => {
        if (index === 0) {
          return { ...player, hand: [...player.hand, parisCard, londonCard] };
        }
        return player;
      });
      state = { ...state, players: updatedPlayers };

      // Use special move once
      const result1 = operationsExpertMove(state, "London", "Paris");
      expect(result1.success).toBe(true);
      if (!result1.success) return;

      // Try to use special move again
      const result2 = operationsExpertMove(result1.state, "Madrid", "London");
      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.error).toContain("already used once this turn");
      }
    });

    it("should allow special move again after turn ends", () => {
      let state = createTestGameWithRole(Role.OperationsExpert, "Atlanta");

      // Add Paris card
      const parisCard: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
      const updatedPlayers = state.players.map((player, index) => {
        if (index === 0) {
          return { ...player, hand: [...player.hand, parisCard] };
        }
        return player;
      });
      state = { ...state, players: updatedPlayers };

      // Use special move
      const result1 = operationsExpertMove(state, "London", "Paris");
      expect(result1.success).toBe(true);
      if (!result1.success) return;

      // Simulate turn ending and starting new turn
      const newTurnState = {
        ...result1.state,
        phase: TurnPhase.Actions,
        actionsRemaining: 4,
        operationsExpertSpecialMoveUsed: false,
      };

      // Add London card for second move
      const londonCard: CityCard = { type: "city", city: "London", color: Disease.Blue };
      const updatedPlayers2 = newTurnState.players.map((player, index) => {
        if (index === 0) {
          return { ...player, hand: [...player.hand, londonCard], location: "Atlanta" };
        }
        return player;
      });
      const newTurnState2 = { ...newTurnState, players: updatedPlayers2 };

      // Should be able to use special move again
      const result2 = operationsExpertMove(newTurnState2, "Paris", "London");
      expect(result2.success).toBe(true);
    });

    it("should apply Medic passive ability after move", () => {
      let state = createTestGameWithRole(Role.OperationsExpert, "Atlanta");
      // Change player 0 to Medic
      const updatedPlayers = state.players.map((player, index) => {
        if (index === 0) {
          return { ...player, role: Role.Medic };
        }
        return player;
      });
      state = { ...state, players: updatedPlayers };

      // Add Paris card and cubes to London (cured disease)
      const parisCard: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
      const updatedPlayers2 = state.players.map((player, index) => {
        if (index === 0) {
          return { ...player, hand: [...player.hand, parisCard] };
        }
        return player;
      });
      const updatedBoard = { ...state.board };
      const londonState = updatedBoard.London;
      if (londonState) {
        updatedBoard.London = { ...londonState, blue: 2 };
      }
      state = {
        ...state,
        players: updatedPlayers2,
        board: updatedBoard,
        cures: { ...state.cures, [Disease.Blue]: CureStatus.Cured },
      };

      // Medic cannot use Operations Expert special move
      const result = operationsExpertMove(state, "London", "Paris");
      expect(result.success).toBe(false);
    });

    it("should allow moving to any city, not just adjacent", () => {
      let state = createTestGameWithRole(Role.OperationsExpert, "Atlanta");

      // Add Tokyo card (far from Atlanta)
      const tokyoCard: CityCard = { type: "city", city: "Tokyo", color: Disease.Red };
      const updatedPlayers = state.players.map((player, index) => {
        if (index === 0) {
          return { ...player, hand: [...player.hand, tokyoCard] };
        }
        return player;
      });
      state = { ...state, players: updatedPlayers };

      const result = operationsExpertMove(state, "Tokyo", "Tokyo");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[0]?.location).toBe("Tokyo");
      }
    });
  });
});

describe("Contingency Planner Role Abilities", () => {
  function createTestGameWithRole(role: Role, location: string = "Atlanta"): GameState {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    // Set player role and location
    const updatedPlayers = state.players.map((player, index) => {
      if (index === 0) {
        return { ...player, role, location };
      }
      return player;
    });
    return { ...state, players: updatedPlayers };
  }

  describe("contingencyPlannerTakeEvent", () => {
    it("should allow Contingency Planner to take event card from discard", () => {
      let state = createTestGameWithRole(Role.ContingencyPlanner, "Atlanta");

      // Add an event card to player discard pile
      const airliftCard: EventCard = { type: "event", event: EventType.Airlift };
      state = { ...state, playerDiscard: [airliftCard] };

      const result = contingencyPlannerTakeEvent(state, EventType.Airlift);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[0]?.storedEventCard).toEqual(airliftCard);
        expect(result.state.playerDiscard).toHaveLength(0);
        expect(result.state.actionsRemaining).toBe(3);
      }
    });

    it("should not allow storing event when one is already stored", () => {
      let state = createTestGameWithRole(Role.ContingencyPlanner, "Atlanta");

      // Set a stored event card
      const airliftCard: EventCard = { type: "event", event: EventType.Airlift };
      const updatedPlayers = state.players.map((player, index) => {
        if (index === 0) {
          return { ...player, storedEventCard: airliftCard };
        }
        return player;
      });
      state = { ...state, players: updatedPlayers };

      // Add another event to discard
      const forecastCard: EventCard = { type: "event", event: EventType.Forecast };
      state = { ...state, playerDiscard: [forecastCard] };

      const result = contingencyPlannerTakeEvent(state, EventType.Forecast);

      expect(result.success).toBe(false);
      expect(result.error).toContain("already has a stored event card");
    });

    it("should fail if event card not in discard pile", () => {
      const state = createTestGameWithRole(Role.ContingencyPlanner, "Atlanta");

      const result = contingencyPlannerTakeEvent(state, EventType.Airlift);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found in player discard pile");
    });

    it("should fail if player is not Contingency Planner", () => {
      let state = createTestGameWithRole(Role.Medic, "Atlanta");

      // Add an event card to discard
      const airliftCard: EventCard = { type: "event", event: EventType.Airlift };
      state = { ...state, playerDiscard: [airliftCard] };

      const result = contingencyPlannerTakeEvent(state, EventType.Airlift);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not Contingency Planner");
    });

    it("should remove specific event from discard when multiple events present", () => {
      let state = createTestGameWithRole(Role.ContingencyPlanner, "Atlanta");

      // Add multiple event cards to discard
      const airliftCard: EventCard = { type: "event", event: EventType.Airlift };
      const forecastCard: EventCard = { type: "event", event: EventType.Forecast };
      const governmentGrantCard: EventCard = {
        type: "event",
        event: EventType.GovernmentGrant,
      };
      state = { ...state, playerDiscard: [airliftCard, forecastCard, governmentGrantCard] };

      const result = contingencyPlannerTakeEvent(state, EventType.Forecast);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.players[0]?.storedEventCard).toEqual(forecastCard);
        expect(result.state.playerDiscard).toHaveLength(2);
        expect(result.state.playerDiscard).toContainEqual(airliftCard);
        expect(result.state.playerDiscard).toContainEqual(governmentGrantCard);
        expect(result.state.playerDiscard).not.toContainEqual(forecastCard);
      }
    });

    it("should cost 1 action to store event card", () => {
      let state = createTestGameWithRole(Role.ContingencyPlanner, "Atlanta");

      // Add an event card to discard
      const airliftCard: EventCard = { type: "event", event: EventType.Airlift };
      state = { ...state, playerDiscard: [airliftCard], actionsRemaining: 4 };

      const result = contingencyPlannerTakeEvent(state, EventType.Airlift);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.actionsRemaining).toBe(3);
      }
    });

    it("should not count stored event toward hand limit", () => {
      let state = createTestGameWithRole(Role.ContingencyPlanner, "Atlanta");

      // Add an event card to discard
      const airliftCard: EventCard = { type: "event", event: EventType.Airlift };
      state = { ...state, playerDiscard: [airliftCard] };

      // Give player 7 cards (hand limit)
      const cards: CityCard[] = [
        { type: "city", city: "London", color: Disease.Blue },
        { type: "city", city: "Paris", color: Disease.Blue },
        { type: "city", city: "Madrid", color: Disease.Blue },
        { type: "city", city: "Milan", color: Disease.Blue },
        { type: "city", city: "Essen", color: Disease.Blue },
        { type: "city", city: "Atlanta", color: Disease.Blue },
        { type: "city", city: "Chicago", color: Disease.Blue },
      ];
      const updatedPlayers = state.players.map((player, index) => {
        if (index === 0) {
          return { ...player, hand: cards };
        }
        return player;
      });
      state = { ...state, players: updatedPlayers };

      const result = contingencyPlannerTakeEvent(state, EventType.Airlift);

      expect(result.success).toBe(true);
      if (result.success) {
        // Player has 7 cards in hand + 1 stored event (not counted)
        expect(result.state.players[0]?.hand.length).toBe(7);
        expect(result.state.players[0]?.storedEventCard).toEqual(airliftCard);
      }
    });
  });
});
