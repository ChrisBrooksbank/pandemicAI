// Tests for game initialization
import { describe, it, expect } from "vitest";
import {
  initializeBoard,
  createInfectionDeck,
  performInitialInfection,
  createPlayerDeck,
  setupPlayers,
  createGame,
  getCurrentPlayer,
  getAvailableActions,
  getCityState,
  getCureStatus,
  getGameStatus,
  advancePhase,
  endTurn,
  drawPlayerCards,
  enforceHandLimit,
  getInfectionRate,
} from "./game";
import { CITIES } from "./board";
import { Disease, EventType, Role, CureStatus, GameStatus, TurnPhase } from "./types";

describe("initializeBoard", () => {
  it("should create a board with all 48 cities", () => {
    const board = initializeBoard();
    expect(Object.keys(board)).toHaveLength(48);
  });

  it("should initialize all cities with 0 disease cubes", () => {
    const board = initializeBoard();

    for (const city of CITIES) {
      expect(board[city.name]).toBeDefined();
      expect(board[city.name]?.blue).toBe(0);
      expect(board[city.name]?.yellow).toBe(0);
      expect(board[city.name]?.black).toBe(0);
      expect(board[city.name]?.red).toBe(0);
    }
  });

  it("should place a research station in Atlanta", () => {
    const board = initializeBoard();
    expect(board["Atlanta"]?.hasResearchStation).toBe(true);
  });

  it("should not place research stations in any other city", () => {
    const board = initializeBoard();

    for (const city of CITIES) {
      if (city.name !== "Atlanta") {
        expect(board[city.name]?.hasResearchStation).toBe(false);
      }
    }
  });

  it("should include all city names from CITIES constant", () => {
    const board = initializeBoard();
    const boardCities = Object.keys(board);

    for (const city of CITIES) {
      expect(boardCities).toContain(city.name);
    }
  });

  it("should return a new object each time (not reuse references)", () => {
    const board1 = initializeBoard();
    const board2 = initializeBoard();

    expect(board1).not.toBe(board2);
    expect(board1["Atlanta"]).not.toBe(board2["Atlanta"]);
  });
});

describe("createInfectionDeck", () => {
  it("should create a deck with exactly 48 cards", () => {
    const deck = createInfectionDeck();
    expect(deck).toHaveLength(48);
  });

  it("should contain one card for each city", () => {
    const deck = createInfectionDeck();
    const cityNames = deck.map((card) => card.city);
    const uniqueCityNames = new Set(cityNames);

    // All cities should be unique
    expect(uniqueCityNames.size).toBe(48);

    // Each city from CITIES should appear exactly once
    for (const city of CITIES) {
      const cardsForCity = deck.filter((card) => card.city === city.name);
      expect(cardsForCity).toHaveLength(1);
    }
  });

  it("should assign correct colors to each city", () => {
    const deck = createInfectionDeck();

    for (const card of deck) {
      const city = CITIES.find((c) => c.name === card.city);
      expect(city).toBeDefined();
      expect(card.color).toBe(city?.color);
    }
  });

  it("should have 12 cards of each color", () => {
    const deck = createInfectionDeck();

    const blueCards = deck.filter((card) => card.color === Disease.Blue);
    const yellowCards = deck.filter((card) => card.color === Disease.Yellow);
    const blackCards = deck.filter((card) => card.color === Disease.Black);
    const redCards = deck.filter((card) => card.color === Disease.Red);

    expect(blueCards).toHaveLength(12);
    expect(yellowCards).toHaveLength(12);
    expect(blackCards).toHaveLength(12);
    expect(redCards).toHaveLength(12);
  });

  it("should shuffle the deck (different order each time)", () => {
    // Run multiple times to ensure shuffling happens
    const deck1 = createInfectionDeck();
    const deck2 = createInfectionDeck();
    const deck3 = createInfectionDeck();

    // Convert to strings for comparison
    const order1 = deck1.map((card) => card.city).join(",");
    const order2 = deck2.map((card) => card.city).join(",");
    const order3 = deck3.map((card) => card.city).join(",");

    // With a proper shuffle, it's extremely unlikely that all three are identical
    // (probability of two identical shuffles is 1/48!, astronomically small)
    const allSame = order1 === order2 && order2 === order3;
    expect(allSame).toBe(false);
  });

  it("should return a new array each time (not reuse references)", () => {
    const deck1 = createInfectionDeck();
    const deck2 = createInfectionDeck();

    expect(deck1).not.toBe(deck2);
    expect(deck1[0]).not.toBe(deck2[0]);
  });

  it("should include Atlanta card", () => {
    const deck = createInfectionDeck();
    const atlantaCard = deck.find((card) => card.city === "Atlanta");

    expect(atlantaCard).toBeDefined();
    expect(atlantaCard?.color).toBe(Disease.Blue);
  });

  it("should include all major cities", () => {
    const deck = createInfectionDeck();
    const cityNames = deck.map((card) => card.city);

    const majorCities = ["Atlanta", "Paris", "London", "Tokyo", "Cairo", "Lima", "Hong Kong"];

    for (const city of majorCities) {
      expect(cityNames).toContain(city);
    }
  });
});

describe("performInitialInfection", () => {
  it("should draw exactly 9 cards from the infection deck", () => {
    const board = initializeBoard();
    const deck = createInfectionDeck();
    const result = performInitialInfection(board, deck);

    // 48 - 9 = 39 cards remaining
    expect(result.infectionDeck).toHaveLength(39);
    expect(result.infectionDiscard).toHaveLength(9);
  });

  it("should place exactly 18 disease cubes total", () => {
    const board = initializeBoard();
    const deck = createInfectionDeck();
    const result = performInitialInfection(board, deck);

    let totalCubes = 0;
    for (const cityName in result.board) {
      const cityState = result.board[cityName];
      if (cityState !== undefined) {
        totalCubes += cityState.blue + cityState.yellow + cityState.black + cityState.red;
      }
    }

    // 3+3+3 + 2+2+2 + 1+1+1 = 18 cubes
    expect(totalCubes).toBe(18);
  });

  it("should place cubes in the correct pattern (3/2/1)", () => {
    const board = initializeBoard();
    const deck = createInfectionDeck();
    const result = performInitialInfection(board, deck);

    // Count cities with each cube level
    const citiesWithCubes: Record<number, number> = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
    };

    for (const cityName in result.board) {
      const cityState = result.board[cityName];
      if (cityState !== undefined) {
        const totalInCity = cityState.blue + cityState.yellow + cityState.black + cityState.red;
        const count = citiesWithCubes[totalInCity];
        if (count !== undefined) {
          citiesWithCubes[totalInCity] = count + 1;
        }
      }
    }

    // Should have 3 cities with 3 cubes, 3 cities with 2 cubes, 3 cities with 1 cube
    expect(citiesWithCubes[3]).toBe(3);
    expect(citiesWithCubes[2]).toBe(3);
    expect(citiesWithCubes[1]).toBe(3);
    expect(citiesWithCubes[0]).toBe(39); // 48 - 9 = 39 cities with no cubes
  });

  it("should place cubes matching the card color", () => {
    const board = initializeBoard();
    const deck = createInfectionDeck();
    const result = performInitialInfection(board, deck);

    // Check that each infected city has cubes of only one color
    for (const cityName in result.board) {
      const cityState = result.board[cityName];
      if (cityState !== undefined) {
        const totalInCity = cityState.blue + cityState.yellow + cityState.black + cityState.red;
        if (totalInCity > 0) {
          // Count how many colors have cubes
          const colorsWithCubes = [
            cityState.blue > 0,
            cityState.yellow > 0,
            cityState.black > 0,
            cityState.red > 0,
          ].filter((hasCubes) => hasCubes).length;

          // Each city should have cubes of exactly one color
          expect(colorsWithCubes).toBe(1);
        }
      }
    }
  });

  it("should update cube supply correctly", () => {
    const board = initializeBoard();
    const deck = createInfectionDeck();
    const result = performInitialInfection(board, deck);

    // Total cubes placed = 18
    const blueUsed = 24 - (result.cubeSupply.blue ?? 0);
    const yellowUsed = 24 - (result.cubeSupply.yellow ?? 0);
    const blackUsed = 24 - (result.cubeSupply.black ?? 0);
    const redUsed = 24 - (result.cubeSupply.red ?? 0);
    const totalUsed = blueUsed + yellowUsed + blackUsed + redUsed;

    expect(totalUsed).toBe(18);

    // Each color should have <= 24 cubes remaining
    expect(result.cubeSupply.blue).toBeLessThanOrEqual(24);
    expect(result.cubeSupply.yellow).toBeLessThanOrEqual(24);
    expect(result.cubeSupply.black).toBeLessThanOrEqual(24);
    expect(result.cubeSupply.red).toBeLessThanOrEqual(24);

    // Each color should have >= 0 cubes remaining
    expect(result.cubeSupply.blue).toBeGreaterThanOrEqual(0);
    expect(result.cubeSupply.yellow).toBeGreaterThanOrEqual(0);
    expect(result.cubeSupply.black).toBeGreaterThanOrEqual(0);
    expect(result.cubeSupply.red).toBeGreaterThanOrEqual(0);
  });

  it("should move drawn cards to discard pile in order", () => {
    const board = initializeBoard();
    const deck = createInfectionDeck();
    const originalDeck = [...deck];
    const result = performInitialInfection(board, deck);

    // First 9 cards from original deck should be in discard
    const expectedDiscard = originalDeck.slice(0, 9);
    expect(result.infectionDiscard).toEqual(expectedDiscard);
  });

  it("should not mutate the original board", () => {
    const board = initializeBoard();
    const deck = createInfectionDeck();
    const originalBoardCopy = JSON.parse(JSON.stringify(board));

    performInitialInfection(board, deck);

    // Original board should be unchanged
    expect(board).toEqual(originalBoardCopy);
  });

  it("should not mutate the original infection deck", () => {
    const board = initializeBoard();
    const deck = createInfectionDeck();
    const originalDeckLength = deck.length;

    performInitialInfection(board, deck);

    // Original deck should still have 48 cards
    expect(deck).toHaveLength(originalDeckLength);
  });

  it("should place cubes on the correct cities based on drawn cards", () => {
    const board = initializeBoard();
    const deck = createInfectionDeck();
    const firstNineCards = deck.slice(0, 9);
    const result = performInitialInfection(board, deck);

    // Check that each of the first 9 cities has cubes
    for (const card of firstNineCards) {
      const cityState = result.board[card.city];
      expect(cityState).toBeDefined();

      // City should have cubes of the card's color
      const cubesOfColor = cityState?.[card.color] ?? 0;
      expect(cubesOfColor).toBeGreaterThan(0);
    }
  });

  it("should maintain research station in Atlanta", () => {
    const board = initializeBoard();
    const deck = createInfectionDeck();
    const result = performInitialInfection(board, deck);

    // Atlanta should still have its research station
    expect(result.board["Atlanta"]?.hasResearchStation).toBe(true);
  });

  it("should handle the case where Atlanta gets infected", () => {
    const board = initializeBoard();
    // Create a rigged deck with Atlanta as the first card
    const deck = createInfectionDeck();
    const atlantaCardIndex = deck.findIndex((card) => card.city === "Atlanta");
    const atlantaCard = deck[atlantaCardIndex];

    if (atlantaCard !== undefined && atlantaCardIndex !== -1) {
      // Move Atlanta card to the front
      deck.splice(atlantaCardIndex, 1);
      deck.unshift(atlantaCard);

      const result = performInitialInfection(board, deck);

      // Atlanta should have 3 blue cubes (first card gets 3 cubes)
      expect(result.board["Atlanta"]?.blue).toBe(3);
      // And still have its research station
      expect(result.board["Atlanta"]?.hasResearchStation).toBe(true);
    }
  });

  it("should throw error if infection deck is empty", () => {
    const board = initializeBoard();
    const emptyDeck: InfectionCard[] = [];

    expect(() => performInitialInfection(board, emptyDeck)).toThrow(
      "Infection deck is empty during initial infection",
    );
  });

  it("should throw error if infection deck has fewer than 9 cards", () => {
    const board = initializeBoard();
    const shortDeck = createInfectionDeck().slice(0, 5); // Only 5 cards

    expect(() => performInitialInfection(board, shortDeck)).toThrow();
  });
});

describe("createPlayerDeck", () => {
  it("should create a deck with correct total card count for each difficulty", () => {
    // 48 city cards + 5 event cards + N epidemic cards = 53 + N
    const deck4 = createPlayerDeck(4);
    const deck5 = createPlayerDeck(5);
    const deck6 = createPlayerDeck(6);

    expect(deck4).toHaveLength(57); // 53 + 4
    expect(deck5).toHaveLength(58); // 53 + 5
    expect(deck6).toHaveLength(59); // 53 + 6
  });

  it("should contain all 48 city cards", () => {
    const deck = createPlayerDeck(4);
    const cityCards = deck.filter((card) => card.type === "city");

    expect(cityCards).toHaveLength(48);

    // Check that each city appears exactly once
    const cityNames = cityCards.map((card) => (card.type === "city" ? card.city : ""));
    const uniqueCityNames = new Set(cityNames);
    expect(uniqueCityNames.size).toBe(48);

    // Verify all cities from CITIES are present
    for (const city of CITIES) {
      const hasCity = cityCards.some((card) => card.type === "city" && card.city === city.name);
      expect(hasCity).toBe(true);
    }
  });

  it("should contain all 5 event cards", () => {
    const deck = createPlayerDeck(4);
    const eventCards = deck.filter((card) => card.type === "event");

    expect(eventCards).toHaveLength(5);

    // Check that each event type appears exactly once
    const eventTypes = eventCards.map((card) => (card.type === "event" ? card.event : ""));
    const uniqueEventTypes = new Set(eventTypes);
    expect(uniqueEventTypes.size).toBe(5);

    // Verify all event types are present
    expect(eventTypes).toContain(EventType.Airlift);
    expect(eventTypes).toContain(EventType.Forecast);
    expect(eventTypes).toContain(EventType.GovernmentGrant);
    expect(eventTypes).toContain(EventType.OneQuietNight);
    expect(eventTypes).toContain(EventType.ResilientPopulation);
  });

  it("should contain the correct number of epidemic cards", () => {
    const deck4 = createPlayerDeck(4);
    const deck5 = createPlayerDeck(5);
    const deck6 = createPlayerDeck(6);

    const epidemicCount4 = deck4.filter((card) => card.type === "epidemic").length;
    const epidemicCount5 = deck5.filter((card) => card.type === "epidemic").length;
    const epidemicCount6 = deck6.filter((card) => card.type === "epidemic").length;

    expect(epidemicCount4).toBe(4);
    expect(epidemicCount5).toBe(5);
    expect(epidemicCount6).toBe(6);
  });

  it("should assign correct colors to city cards", () => {
    const deck = createPlayerDeck(4);
    const cityCards = deck.filter((card) => card.type === "city");

    for (const card of cityCards) {
      if (card.type === "city") {
        const city = CITIES.find((c) => c.name === card.city);
        expect(city).toBeDefined();
        expect(card.color).toBe(city?.color);
      }
    }
  });

  it("should have 12 city cards of each color", () => {
    const deck = createPlayerDeck(4);
    const cityCards = deck.filter((card) => card.type === "city");

    const blueCards = cityCards.filter(
      (card) => card.type === "city" && card.color === Disease.Blue,
    );
    const yellowCards = cityCards.filter(
      (card) => card.type === "city" && card.color === Disease.Yellow,
    );
    const blackCards = cityCards.filter(
      (card) => card.type === "city" && card.color === Disease.Black,
    );
    const redCards = cityCards.filter((card) => card.type === "city" && card.color === Disease.Red);

    expect(blueCards).toHaveLength(12);
    expect(yellowCards).toHaveLength(12);
    expect(blackCards).toHaveLength(12);
    expect(redCards).toHaveLength(12);
  });

  it("should distribute epidemic cards evenly throughout the deck", () => {
    const deck = createPlayerDeck(4);

    // Find positions of all epidemic cards
    const epidemicPositions: number[] = [];
    for (let i = 0; i < deck.length; i++) {
      if (deck[i]?.type === "epidemic") {
        epidemicPositions.push(i);
      }
    }

    expect(epidemicPositions).toHaveLength(4);

    // Check that epidemics are reasonably distributed (not all clustered together)
    // Due to shuffling within piles, we can't guarantee exact positions,
    // but we can verify they're not all in the same narrow range
    const minPos = Math.min(...epidemicPositions);
    const maxPos = Math.max(...epidemicPositions);
    const spread = maxPos - minPos;

    // Spread should be at least half the deck length
    expect(spread).toBeGreaterThan(deck.length / 3);
  });

  it("should shuffle the deck (different order each time)", () => {
    // Run multiple times to ensure shuffling happens
    const deck1 = createPlayerDeck(4);
    const deck2 = createPlayerDeck(4);
    const deck3 = createPlayerDeck(4);

    // Convert to strings for comparison (using a simple serialization)
    const serialize = (card: (typeof deck1)[0]) => {
      if (card.type === "city") return `city:${card.city}`;
      if (card.type === "event") return `event:${card.event}`;
      return "epidemic";
    };

    const order1 = deck1.map(serialize).join(",");
    const order2 = deck2.map(serialize).join(",");
    const order3 = deck3.map(serialize).join(",");

    // With a proper shuffle, it's extremely unlikely that all three are identical
    const allSame = order1 === order2 && order2 === order3;
    expect(allSame).toBe(false);
  });

  it("should return a new array each time (not reuse references)", () => {
    const deck1 = createPlayerDeck(4);
    const deck2 = createPlayerDeck(4);

    expect(deck1).not.toBe(deck2);
  });

  it("should not have epidemic cards in the first few positions (due to pile structure)", () => {
    // Run the test multiple times to account for randomness
    const decks = Array.from({ length: 10 }, () => createPlayerDeck(4));

    // For difficulty 4, the first pile has ~13 cards (53/4)
    // An epidemic might appear in the first pile, but statistically,
    // at least some decks should not have an epidemic in the first 5 positions
    const decksWithEarlyEpidemic = decks.filter((deck) => {
      const firstFiveCards = deck.slice(0, 5);
      return firstFiveCards.some((card) => card.type === "epidemic");
    });

    // Not all decks should have an epidemic in the first 5 positions
    // (Though some might due to shuffling within the first pile)
    // This is a probabilistic test, so we allow some to have early epidemics
    expect(decksWithEarlyEpidemic.length).toBeLessThan(10);
  });

  it("should evenly distribute epidemics across piles for difficulty 6", () => {
    const deck = createPlayerDeck(6);
    const epidemicPositions: number[] = [];

    for (let i = 0; i < deck.length; i++) {
      if (deck[i]?.type === "epidemic") {
        epidemicPositions.push(i);
      }
    }

    expect(epidemicPositions).toHaveLength(6);

    // Check reasonable distribution
    const minPos = Math.min(...epidemicPositions);
    const maxPos = Math.max(...epidemicPositions);
    const spread = maxPos - minPos;

    // Spread should cover most of the deck
    expect(spread).toBeGreaterThan(deck.length / 2);
  });
});

describe("setupPlayers", () => {
  it("should create the correct number of players", () => {
    const deck2 = createPlayerDeck(4);
    const deck3 = createPlayerDeck(4);
    const deck4 = createPlayerDeck(4);

    const result2 = setupPlayers(2, deck2);
    const result3 = setupPlayers(3, deck3);
    const result4 = setupPlayers(4, deck4);

    expect(result2.players).toHaveLength(2);
    expect(result3.players).toHaveLength(3);
    expect(result4.players).toHaveLength(4);
  });

  it("should deal the correct number of cards per player count", () => {
    const deck2 = createPlayerDeck(4);
    const deck3 = createPlayerDeck(4);
    const deck4 = createPlayerDeck(4);

    const result2 = setupPlayers(2, deck2);
    const result3 = setupPlayers(3, deck3);
    const result4 = setupPlayers(4, deck4);

    // 2 players → 4 cards each
    expect(result2.players[0]?.hand).toHaveLength(4);
    expect(result2.players[1]?.hand).toHaveLength(4);

    // 3 players → 3 cards each
    expect(result3.players[0]?.hand).toHaveLength(3);
    expect(result3.players[1]?.hand).toHaveLength(3);
    expect(result3.players[2]?.hand).toHaveLength(3);

    // 4 players → 2 cards each
    expect(result4.players[0]?.hand).toHaveLength(2);
    expect(result4.players[1]?.hand).toHaveLength(2);
    expect(result4.players[2]?.hand).toHaveLength(2);
    expect(result4.players[3]?.hand).toHaveLength(2);
  });

  it("should remove dealt cards from the player deck", () => {
    const deck = createPlayerDeck(4);
    const originalLength = deck.length;

    const result2 = setupPlayers(2, deck);
    // 2 players × 4 cards = 8 cards dealt
    expect(result2.playerDeck).toHaveLength(originalLength - 8);

    const result3 = setupPlayers(3, createPlayerDeck(4));
    // 3 players × 3 cards = 9 cards dealt
    expect(result3.playerDeck).toHaveLength(originalLength - 9);

    const result4 = setupPlayers(4, createPlayerDeck(4));
    // 4 players × 2 cards = 8 cards dealt
    expect(result4.playerDeck).toHaveLength(originalLength - 8);
  });

  it("should assign unique roles to each player", () => {
    const deck = createPlayerDeck(4);
    const result = setupPlayers(4, deck);

    const roles = result.players.map((p) => p.role);
    const uniqueRoles = new Set(roles);

    // All roles should be unique
    expect(uniqueRoles.size).toBe(4);
  });

  it("should assign valid roles from the Role enum", () => {
    const deck = createPlayerDeck(4);
    const result = setupPlayers(4, deck);

    const validRoles = Object.values(Role);

    for (const player of result.players) {
      expect(validRoles).toContain(player.role);
    }
  });

  it("should place all players in Atlanta", () => {
    const deck = createPlayerDeck(4);
    const result = setupPlayers(4, deck);

    for (const player of result.players) {
      expect(player.location).toBe("Atlanta");
    }
  });

  it("should assign different roles on each run (randomization)", () => {
    const deck1 = createPlayerDeck(4);
    const deck2 = createPlayerDeck(4);
    const deck3 = createPlayerDeck(4);

    const result1 = setupPlayers(4, deck1);
    const result2 = setupPlayers(4, deck2);
    const result3 = setupPlayers(4, deck3);

    const roles1 = result1.players.map((p) => p.role).join(",");
    const roles2 = result2.players.map((p) => p.role).join(",");
    const roles3 = result3.players.map((p) => p.role).join(",");

    // With randomization, it's extremely unlikely all three are identical
    const allSame = roles1 === roles2 && roles2 === roles3;
    expect(allSame).toBe(false);
  });

  it("should not mutate the original player deck", () => {
    const deck = createPlayerDeck(4);
    const originalLength = deck.length;

    setupPlayers(2, deck);

    // Original deck should still have all cards
    expect(deck).toHaveLength(originalLength);
  });

  it("should deal cards from the top of the deck", () => {
    const deck = createPlayerDeck(4);
    const expectedCards = deck.slice(0, 8); // First 8 cards for 2 players

    const result = setupPlayers(2, deck);

    // Collect all dealt cards
    const dealtCards = result.players.flatMap((p) => p.hand);

    // Should match the first 8 cards from the original deck
    expect(dealtCards).toEqual(expectedCards);
  });

  it("should handle all role types being available", () => {
    const deck = createPlayerDeck(4);
    const result = setupPlayers(4, deck);

    // With 4 players, we should get 4 out of the 7 possible roles
    const allRoles = [
      Role.ContingencyPlanner,
      Role.Dispatcher,
      Role.Medic,
      Role.OperationsExpert,
      Role.QuarantineSpecialist,
      Role.Researcher,
      Role.Scientist,
    ];

    for (const player of result.players) {
      expect(allRoles).toContain(player.role);
    }
  });

  it("should return player objects with all required fields", () => {
    const deck = createPlayerDeck(4);
    const result = setupPlayers(2, deck);

    for (const player of result.players) {
      expect(player).toHaveProperty("role");
      expect(player).toHaveProperty("location");
      expect(player).toHaveProperty("hand");
      expect(Array.isArray(player.hand)).toBe(true);
      expect(typeof player.role).toBe("string");
      expect(typeof player.location).toBe("string");
    }
  });

  it("should throw error if not enough cards in deck", () => {
    const emptyDeck: import("./types").PlayerCard[] = [];

    expect(() => setupPlayers(2, emptyDeck)).toThrow(
      "Not enough cards in deck to deal starting hands",
    );
  });

  it("should throw error if deck has only partial cards", () => {
    const deck = createPlayerDeck(4);
    const shortDeck = deck.slice(0, 5); // Only 5 cards, need 8 for 2 players

    expect(() => setupPlayers(2, shortDeck)).toThrow();
  });

  it("should work with decks containing epidemic cards", () => {
    // Epidemic cards might be in the starting hands
    const deck = createPlayerDeck(4);
    const result = setupPlayers(2, deck);

    expect(result.players).toHaveLength(2);
    expect(result.players[0]?.hand).toHaveLength(4);
    expect(result.players[1]?.hand).toHaveLength(4);

    // Players might have epidemic cards in their starting hands
    // (This is allowed by the game rules, though rare due to distribution)
    const allCards = result.players.flatMap((p) => p.hand);
    expect(allCards).toHaveLength(8);
  });

  it("should work with all difficulty levels", () => {
    const deck4 = createPlayerDeck(4);
    const deck5 = createPlayerDeck(5);
    const deck6 = createPlayerDeck(6);

    const result4 = setupPlayers(3, deck4);
    const result5 = setupPlayers(3, deck5);
    const result6 = setupPlayers(3, deck6);

    // All should successfully create 3 players with 3 cards each
    expect(result4.players).toHaveLength(3);
    expect(result5.players).toHaveLength(3);
    expect(result6.players).toHaveLength(3);

    for (const result of [result4, result5, result6]) {
      for (const player of result.players) {
        expect(player.hand).toHaveLength(3);
        expect(player.location).toBe("Atlanta");
      }
    }
  });

  it("should preserve card types in dealt hands", () => {
    const deck = createPlayerDeck(4);
    const result = setupPlayers(2, deck);

    for (const player of result.players) {
      for (const card of player.hand) {
        expect(card).toHaveProperty("type");
        expect(["city", "event", "epidemic"]).toContain(card.type);
      }
    }
  });

  it("should maintain correct deck state after dealing", () => {
    const deck = createPlayerDeck(4);
    const initialDeckCopy = [...deck];

    const result = setupPlayers(2, deck);

    // The remaining deck should be the original deck minus the first 8 cards
    const expectedRemainingDeck = initialDeckCopy.slice(8);
    expect(result.playerDeck).toEqual(expectedRemainingDeck);
  });
});

describe("createGame", () => {
  it("should create a valid game with 2 players and difficulty 4", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    expect(game).toBeDefined();
    expect(game.config.playerCount).toBe(2);
    expect(game.config.difficulty).toBe(4);
  });

  it("should create a valid game with 3 players and difficulty 5", () => {
    const game = createGame({ playerCount: 3, difficulty: 5 });

    expect(game).toBeDefined();
    expect(game.config.playerCount).toBe(3);
    expect(game.config.difficulty).toBe(5);
  });

  it("should create a valid game with 4 players and difficulty 6", () => {
    const game = createGame({ playerCount: 4, difficulty: 6 });

    expect(game).toBeDefined();
    expect(game.config.playerCount).toBe(4);
    expect(game.config.difficulty).toBe(6);
  });

  it("should throw error for invalid player count", () => {
    expect(() => createGame({ playerCount: 1 as 2, difficulty: 4 })).toThrow(
      "Invalid player count: 1. Must be 2, 3, or 4.",
    );

    expect(() => createGame({ playerCount: 5 as 2, difficulty: 4 })).toThrow(
      "Invalid player count: 5. Must be 2, 3, or 4.",
    );
  });

  it("should throw error for invalid difficulty", () => {
    expect(() => createGame({ playerCount: 2, difficulty: 3 as 4 })).toThrow(
      "Invalid difficulty: 3. Must be 4, 5, or 6.",
    );

    expect(() => createGame({ playerCount: 2, difficulty: 7 as 4 })).toThrow(
      "Invalid difficulty: 7. Must be 4, 5, or 6.",
    );
  });

  it("should initialize board with 48 cities", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    expect(Object.keys(game.board)).toHaveLength(48);
  });

  it("should place Atlanta research station", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    expect(game.board["Atlanta"]?.hasResearchStation).toBe(true);
  });

  it("should perform initial infection (18 cubes total)", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    let totalCubes = 0;
    for (const cityName in game.board) {
      const cityState = game.board[cityName];
      if (cityState !== undefined) {
        totalCubes += cityState.blue + cityState.yellow + cityState.black + cityState.red;
      }
    }

    expect(totalCubes).toBe(18);
  });

  it("should have 9 cities with disease cubes after initial infection", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    let citiesWithCubes = 0;
    for (const cityName in game.board) {
      const cityState = game.board[cityName];
      if (cityState !== undefined) {
        const total = cityState.blue + cityState.yellow + cityState.black + cityState.red;
        if (total > 0) {
          citiesWithCubes++;
        }
      }
    }

    expect(citiesWithCubes).toBe(9);
  });

  it("should create correct number of players", () => {
    const game2 = createGame({ playerCount: 2, difficulty: 4 });
    const game3 = createGame({ playerCount: 3, difficulty: 4 });
    const game4 = createGame({ playerCount: 4, difficulty: 4 });

    expect(game2.players).toHaveLength(2);
    expect(game3.players).toHaveLength(3);
    expect(game4.players).toHaveLength(4);
  });

  it("should deal correct starting hand sizes", () => {
    const game2 = createGame({ playerCount: 2, difficulty: 4 });
    const game3 = createGame({ playerCount: 3, difficulty: 4 });
    const game4 = createGame({ playerCount: 4, difficulty: 4 });

    // 2 players → 4 cards each
    expect(game2.players[0]?.hand).toHaveLength(4);
    expect(game2.players[1]?.hand).toHaveLength(4);

    // 3 players → 3 cards each
    expect(game3.players[0]?.hand).toHaveLength(3);
    expect(game3.players[1]?.hand).toHaveLength(3);
    expect(game3.players[2]?.hand).toHaveLength(3);

    // 4 players → 2 cards each
    expect(game4.players[0]?.hand).toHaveLength(2);
    expect(game4.players[1]?.hand).toHaveLength(2);
    expect(game4.players[2]?.hand).toHaveLength(2);
    expect(game4.players[3]?.hand).toHaveLength(2);
  });

  it("should place all players in Atlanta", () => {
    const game = createGame({ playerCount: 4, difficulty: 4 });

    for (const player of game.players) {
      expect(player.location).toBe("Atlanta");
    }
  });

  it("should assign unique roles to players", () => {
    const game = createGame({ playerCount: 4, difficulty: 4 });

    const roles = game.players.map((p) => p.role);
    const uniqueRoles = new Set(roles);

    expect(uniqueRoles.size).toBe(4);
  });

  it("should initialize all diseases as uncured", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    expect(game.cures[Disease.Blue]).toBe(CureStatus.Uncured);
    expect(game.cures[Disease.Yellow]).toBe(CureStatus.Uncured);
    expect(game.cures[Disease.Black]).toBe(CureStatus.Uncured);
    expect(game.cures[Disease.Red]).toBe(CureStatus.Uncured);
  });

  it("should initialize cube supply correctly (24 per color minus initial infection)", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Each color should have at most 24 cubes
    expect(game.cubeSupply[Disease.Blue]).toBeLessThanOrEqual(24);
    expect(game.cubeSupply[Disease.Yellow]).toBeLessThanOrEqual(24);
    expect(game.cubeSupply[Disease.Black]).toBeLessThanOrEqual(24);
    expect(game.cubeSupply[Disease.Red]).toBeLessThanOrEqual(24);

    // Total cubes used should be 18 (from initial infection)
    const totalRemaining =
      (game.cubeSupply[Disease.Blue] ?? 0) +
      (game.cubeSupply[Disease.Yellow] ?? 0) +
      (game.cubeSupply[Disease.Black] ?? 0) +
      (game.cubeSupply[Disease.Red] ?? 0);

    expect(totalRemaining).toBe(96 - 18); // 4 colors × 24 cubes - 18 placed
  });

  it("should initialize infection rate to position 1", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    expect(game.infectionRatePosition).toBe(1);
  });

  it("should initialize outbreak count to 0", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    expect(game.outbreakCount).toBe(0);
  });

  it("should set current player index to 0", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    expect(game.currentPlayerIndex).toBe(0);
  });

  it("should set initial phase to Actions", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    expect(game.phase).toBe(TurnPhase.Actions);
  });

  it("should set actions remaining to 4", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    expect(game.actionsRemaining).toBe(4);
  });

  it("should set game status to Ongoing", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    expect(game.status).toBe(GameStatus.Ongoing);
  });

  it("should have infection deck with 39 cards (48 - 9 for initial infection)", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    expect(game.infectionDeck).toHaveLength(39);
  });

  it("should have infection discard with 9 cards (from initial infection)", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    expect(game.infectionDiscard).toHaveLength(9);
  });

  it("should have player discard pile empty at start", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    expect(game.playerDiscard).toHaveLength(0);
  });

  it("should have player deck with correct number of cards after dealing hands", () => {
    const game2 = createGame({ playerCount: 2, difficulty: 4 });
    const game3 = createGame({ playerCount: 3, difficulty: 4 });
    const game4 = createGame({ playerCount: 4, difficulty: 4 });

    // Total cards = 48 city + 5 event + N epidemic = 53 + N
    // 2 players deal 8 cards (4 each)
    expect(game2.playerDeck).toHaveLength(57 - 8); // 53 + 4 - 8 = 49

    // 3 players deal 9 cards (3 each)
    expect(game3.playerDeck).toHaveLength(57 - 9); // 53 + 4 - 9 = 48

    // 4 players deal 8 cards (2 each)
    expect(game4.playerDeck).toHaveLength(57 - 8); // 53 + 4 - 8 = 49
  });

  it("should create different games on each call (due to shuffling)", () => {
    const game1 = createGame({ playerCount: 2, difficulty: 4 });
    const game2 = createGame({ playerCount: 2, difficulty: 4 });
    const game3 = createGame({ playerCount: 2, difficulty: 4 });

    // Check that infection patterns are different
    const getCubePattern = (game: typeof game1) => {
      return Object.keys(game.board)
        .map((cityName) => {
          const cityState = game.board[cityName];
          if (cityState !== undefined) {
            const total = cityState.blue + cityState.yellow + cityState.black + cityState.red;
            return `${cityName}:${total}`;
          }
          return "";
        })
        .join(",");
    };

    const pattern1 = getCubePattern(game1);
    const pattern2 = getCubePattern(game2);
    const pattern3 = getCubePattern(game3);

    // It's astronomically unlikely all three are identical
    const allSame = pattern1 === pattern2 && pattern2 === pattern3;
    expect(allSame).toBe(false);
  });

  it("should have all required GameState fields", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    expect(game).toHaveProperty("config");
    expect(game).toHaveProperty("players");
    expect(game).toHaveProperty("currentPlayerIndex");
    expect(game).toHaveProperty("phase");
    expect(game).toHaveProperty("actionsRemaining");
    expect(game).toHaveProperty("board");
    expect(game).toHaveProperty("cures");
    expect(game).toHaveProperty("cubeSupply");
    expect(game).toHaveProperty("infectionRatePosition");
    expect(game).toHaveProperty("outbreakCount");
    expect(game).toHaveProperty("playerDeck");
    expect(game).toHaveProperty("playerDiscard");
    expect(game).toHaveProperty("infectionDeck");
    expect(game).toHaveProperty("infectionDiscard");
    expect(game).toHaveProperty("status");
  });

  it("should work with all valid player count and difficulty combinations", () => {
    const configs: Array<{ playerCount: 2 | 3 | 4; difficulty: 4 | 5 | 6 }> = [
      { playerCount: 2, difficulty: 4 },
      { playerCount: 2, difficulty: 5 },
      { playerCount: 2, difficulty: 6 },
      { playerCount: 3, difficulty: 4 },
      { playerCount: 3, difficulty: 5 },
      { playerCount: 3, difficulty: 6 },
      { playerCount: 4, difficulty: 4 },
      { playerCount: 4, difficulty: 5 },
      { playerCount: 4, difficulty: 6 },
    ];

    for (const config of configs) {
      const game = createGame(config);
      expect(game.config).toEqual(config);
      expect(game.players).toHaveLength(config.playerCount);
      expect(game.status).toBe(GameStatus.Ongoing);
    }
  });

  it("should maintain immutability (not share references between games)", () => {
    const game1 = createGame({ playerCount: 2, difficulty: 4 });
    const game2 = createGame({ playerCount: 2, difficulty: 4 });

    expect(game1).not.toBe(game2);
    expect(game1.board).not.toBe(game2.board);
    expect(game1.players).not.toBe(game2.players);
    expect(game1.playerDeck).not.toBe(game2.playerDeck);
    expect(game1.infectionDeck).not.toBe(game2.infectionDeck);
  });
});

describe("getCurrentPlayer", () => {
  it("should return the first player when currentPlayerIndex is 0", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    const currentPlayer = getCurrentPlayer(game);

    expect(currentPlayer).toBe(game.players[0]);
    expect(currentPlayer.role).toBe(game.players[0]?.role);
  });

  it("should return the correct player based on currentPlayerIndex", () => {
    const game = createGame({ playerCount: 3, difficulty: 4 });

    // Test with player index 0
    game.currentPlayerIndex = 0;
    let currentPlayer = getCurrentPlayer(game);
    expect(currentPlayer).toBe(game.players[0]);

    // Test with player index 1
    game.currentPlayerIndex = 1;
    currentPlayer = getCurrentPlayer(game);
    expect(currentPlayer).toBe(game.players[1]);

    // Test with player index 2
    game.currentPlayerIndex = 2;
    currentPlayer = getCurrentPlayer(game);
    expect(currentPlayer).toBe(game.players[2]);
  });

  it("should return player with all expected properties", () => {
    const game = createGame({ playerCount: 4, difficulty: 4 });

    const currentPlayer = getCurrentPlayer(game);

    expect(currentPlayer).toHaveProperty("role");
    expect(currentPlayer).toHaveProperty("location");
    expect(currentPlayer).toHaveProperty("hand");
    expect(Array.isArray(currentPlayer.hand)).toBe(true);
  });

  it("should return the same player object on subsequent calls without state changes", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    const player1 = getCurrentPlayer(game);
    const player2 = getCurrentPlayer(game);

    expect(player1).toBe(player2);
  });

  it("should return different players as currentPlayerIndex changes", () => {
    const game = createGame({ playerCount: 4, difficulty: 4 });

    const player0 = getCurrentPlayer(game);

    game.currentPlayerIndex = 1;
    const player1 = getCurrentPlayer(game);

    expect(player0).not.toBe(player1);
    expect(player0.role).not.toBe(player1.role);
  });

  it("should throw error when currentPlayerIndex is out of bounds (negative)", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.currentPlayerIndex = -1;

    expect(() => getCurrentPlayer(game)).toThrow("Invalid currentPlayerIndex: -1");
  });

  it("should throw error when currentPlayerIndex is out of bounds (too high)", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.currentPlayerIndex = 2; // Only players 0 and 1 exist

    expect(() => getCurrentPlayer(game)).toThrow("Invalid currentPlayerIndex: 2");
  });

  it("should work correctly for all valid player counts", () => {
    const game2 = createGame({ playerCount: 2, difficulty: 4 });
    const game3 = createGame({ playerCount: 3, difficulty: 4 });
    const game4 = createGame({ playerCount: 4, difficulty: 4 });

    // 2 players
    expect(getCurrentPlayer(game2)).toBe(game2.players[0]);

    // 3 players
    expect(getCurrentPlayer(game3)).toBe(game3.players[0]);

    // 4 players
    expect(getCurrentPlayer(game4)).toBe(game4.players[0]);
  });

  it("should return player at their current location", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    const currentPlayer = getCurrentPlayer(game);

    expect(currentPlayer.location).toBe("Atlanta");
  });

  it("should return player with their dealt starting hand", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    const currentPlayer = getCurrentPlayer(game);

    // 2 players get 4 cards each
    expect(currentPlayer.hand).toHaveLength(4);
  });
});

describe("getAvailableActions", () => {
  it("should return an empty array (placeholder implementation)", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    const actions = getAvailableActions(game);

    expect(actions).toEqual([]);
  });

  it("should return an array type", () => {
    const game = createGame({ playerCount: 3, difficulty: 5 });

    const actions = getAvailableActions(game);

    expect(Array.isArray(actions)).toBe(true);
  });

  it("should work with any game configuration", () => {
    const game2 = createGame({ playerCount: 2, difficulty: 4 });
    const game3 = createGame({ playerCount: 3, difficulty: 5 });
    const game4 = createGame({ playerCount: 4, difficulty: 6 });

    expect(getAvailableActions(game2)).toEqual([]);
    expect(getAvailableActions(game3)).toEqual([]);
    expect(getAvailableActions(game4)).toEqual([]);
  });

  it("should work regardless of current player", () => {
    const game = createGame({ playerCount: 3, difficulty: 4 });

    // Test with different player indices
    game.currentPlayerIndex = 0;
    expect(getAvailableActions(game)).toEqual([]);

    game.currentPlayerIndex = 1;
    expect(getAvailableActions(game)).toEqual([]);

    game.currentPlayerIndex = 2;
    expect(getAvailableActions(game)).toEqual([]);
  });

  it("should return a new array on each call", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    const actions1 = getAvailableActions(game);
    const actions2 = getAvailableActions(game);

    // Should be equal but not the same reference
    expect(actions1).toEqual(actions2);
    expect(actions1).not.toBe(actions2);
  });
});

describe("getCityState", () => {
  it("should return the state of a city with no disease cubes", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    const cityState = getCityState(game, "Atlanta");

    expect(cityState).toBeDefined();
    expect(cityState.blue).toBeGreaterThanOrEqual(0);
    expect(cityState.yellow).toBeGreaterThanOrEqual(0);
    expect(cityState.black).toBeGreaterThanOrEqual(0);
    expect(cityState.red).toBeGreaterThanOrEqual(0);
  });

  it("should return the research station status for Atlanta", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    const atlantaState = getCityState(game, "Atlanta");

    expect(atlantaState.hasResearchStation).toBe(true);
  });

  it("should return the research station status for non-Atlanta cities", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    const parisState = getCityState(game, "Paris");

    expect(parisState.hasResearchStation).toBe(false);
  });

  it("should return the correct number of disease cubes for an infected city", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Find a city with disease cubes
    let infectedCityName = "";
    for (const cityName in game.board) {
      const cityState = game.board[cityName];
      if (cityState !== undefined) {
        const totalCubes = cityState.blue + cityState.yellow + cityState.black + cityState.red;
        if (totalCubes > 0) {
          infectedCityName = cityName;
          break;
        }
      }
    }

    // At least one city should be infected
    expect(infectedCityName).not.toBe("");

    const cityState = getCityState(game, infectedCityName);
    const totalCubes = cityState.blue + cityState.yellow + cityState.black + cityState.red;

    expect(totalCubes).toBeGreaterThan(0);
    expect(totalCubes).toBeLessThanOrEqual(3);
  });

  it("should return all cube counts for each disease color", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    const cityState = getCityState(game, "London");

    expect(cityState).toHaveProperty("blue");
    expect(cityState).toHaveProperty("yellow");
    expect(cityState).toHaveProperty("black");
    expect(cityState).toHaveProperty("red");
    expect(typeof cityState.blue).toBe("number");
    expect(typeof cityState.yellow).toBe("number");
    expect(typeof cityState.black).toBe("number");
    expect(typeof cityState.red).toBe("number");
  });

  it("should throw error for invalid city name", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    expect(() => getCityState(game, "InvalidCity")).toThrow("City not found: InvalidCity");
  });

  it("should throw error for empty city name", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    expect(() => getCityState(game, "")).toThrow("City not found: ");
  });

  it("should work for all 48 cities", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    for (const city of CITIES) {
      const cityState = getCityState(game, city.name);

      expect(cityState).toBeDefined();
      expect(cityState).toHaveProperty("blue");
      expect(cityState).toHaveProperty("yellow");
      expect(cityState).toHaveProperty("black");
      expect(cityState).toHaveProperty("red");
      expect(cityState).toHaveProperty("hasResearchStation");
    }
  });

  it("should be case-sensitive for city names", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // "Atlanta" exists, but "atlanta" does not
    expect(() => getCityState(game, "atlanta")).toThrow("City not found: atlanta");
  });

  it("should return a copy of the city state (immutability)", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    const cityState1 = getCityState(game, "Atlanta");
    const cityState2 = getCityState(game, "Atlanta");

    // Should be equal but not the same reference
    expect(cityState1).toEqual(cityState2);
    expect(cityState1).not.toBe(cityState2);
  });

  it("should not allow mutations to affect the game state", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    const cityState = getCityState(game, "Atlanta");
    const originalBlue = cityState.blue;

    // Mutate the returned city state
    cityState.blue = 99;
    cityState.hasResearchStation = false;

    // Game state should be unchanged
    const freshCityState = getCityState(game, "Atlanta");
    expect(freshCityState.blue).toBe(originalBlue);
    expect(freshCityState.hasResearchStation).toBe(true);
  });

  it("should return correct state for cities with different cube counts", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Find cities with different cube counts (3, 2, 1, 0)
    const citiesByCubeCount: Record<number, string> = {};

    for (const cityName in game.board) {
      const cityState = game.board[cityName];
      if (cityState !== undefined) {
        const totalCubes = cityState.blue + cityState.yellow + cityState.black + cityState.red;
        if (citiesByCubeCount[totalCubes] === undefined) {
          citiesByCubeCount[totalCubes] = cityName;
        }
      }
    }

    // Verify we can query each type
    for (const cubeCount in citiesByCubeCount) {
      const cityName = citiesByCubeCount[cubeCount];
      if (cityName !== undefined) {
        const cityState = getCityState(game, cityName);
        const total = cityState.blue + cityState.yellow + cityState.black + cityState.red;
        expect(total).toBe(parseInt(cubeCount));
      }
    }
  });

  it("should return correct state for major cities", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    const majorCities = ["Atlanta", "Paris", "London", "Tokyo", "Cairo", "Lima", "Hong Kong"];

    for (const cityName of majorCities) {
      const cityState = getCityState(game, cityName);

      expect(cityState).toBeDefined();
      expect(cityState.blue).toBeGreaterThanOrEqual(0);
      expect(cityState.yellow).toBeGreaterThanOrEqual(0);
      expect(cityState.black).toBeGreaterThanOrEqual(0);
      expect(cityState.red).toBeGreaterThanOrEqual(0);
      expect(typeof cityState.hasResearchStation).toBe("boolean");
    }
  });

  it("should work with different game configurations", () => {
    const game2 = createGame({ playerCount: 2, difficulty: 4 });
    const game3 = createGame({ playerCount: 3, difficulty: 5 });
    const game4 = createGame({ playerCount: 4, difficulty: 6 });

    // All configurations should support getCityState
    expect(() => getCityState(game2, "Atlanta")).not.toThrow();
    expect(() => getCityState(game3, "Paris")).not.toThrow();
    expect(() => getCityState(game4, "Tokyo")).not.toThrow();
  });

  it("should return valid cube counts (0-3 per color)", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    for (const city of CITIES) {
      const cityState = getCityState(game, city.name);

      expect(cityState.blue).toBeGreaterThanOrEqual(0);
      expect(cityState.blue).toBeLessThanOrEqual(3);
      expect(cityState.yellow).toBeGreaterThanOrEqual(0);
      expect(cityState.yellow).toBeLessThanOrEqual(3);
      expect(cityState.black).toBeGreaterThanOrEqual(0);
      expect(cityState.black).toBeLessThanOrEqual(3);
      expect(cityState.red).toBeGreaterThanOrEqual(0);
      expect(cityState.red).toBeLessThanOrEqual(3);
    }
  });

  it("should have exactly one city with a research station initially", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    let researchStationCount = 0;
    for (const city of CITIES) {
      const cityState = getCityState(game, city.name);
      if (cityState.hasResearchStation) {
        researchStationCount++;
      }
    }

    expect(researchStationCount).toBe(1);
  });

  it("should handle city names with spaces", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Cities like "Hong Kong", "Los Angeles", etc.
    const citiesWithSpaces = CITIES.filter((city) => city.name.includes(" "));

    expect(citiesWithSpaces.length).toBeGreaterThan(0);

    for (const city of citiesWithSpaces) {
      const cityState = getCityState(game, city.name);
      expect(cityState).toBeDefined();
    }
  });

  it("should return state that matches the board state exactly", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    for (const cityName in game.board) {
      const boardState = game.board[cityName];
      const queryState = getCityState(game, cityName);

      if (boardState !== undefined) {
        expect(queryState.blue).toBe(boardState.blue);
        expect(queryState.yellow).toBe(boardState.yellow);
        expect(queryState.black).toBe(boardState.black);
        expect(queryState.red).toBe(boardState.red);
        expect(queryState.hasResearchStation).toBe(boardState.hasResearchStation);
      }
    }
  });
});

describe("getCureStatus", () => {
  it("should return cure status for all 4 diseases", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    const cureStatus = getCureStatus(game);

    expect(cureStatus).toBeDefined();
    expect(cureStatus).toHaveProperty(Disease.Blue);
    expect(cureStatus).toHaveProperty(Disease.Yellow);
    expect(cureStatus).toHaveProperty(Disease.Black);
    expect(cureStatus).toHaveProperty(Disease.Red);
  });

  it("should return all diseases as uncured in a new game", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    const cureStatus = getCureStatus(game);

    expect(cureStatus[Disease.Blue]).toBe(CureStatus.Uncured);
    expect(cureStatus[Disease.Yellow]).toBe(CureStatus.Uncured);
    expect(cureStatus[Disease.Black]).toBe(CureStatus.Uncured);
    expect(cureStatus[Disease.Red]).toBe(CureStatus.Uncured);
  });

  it("should return a record with exactly 4 disease colors as keys", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    const cureStatus = getCureStatus(game);

    const keys = Object.keys(cureStatus);
    expect(keys).toHaveLength(4);
    expect(keys).toContain(Disease.Blue);
    expect(keys).toContain(Disease.Yellow);
    expect(keys).toContain(Disease.Black);
    expect(keys).toContain(Disease.Red);
  });

  it("should return valid CureStatus values for all diseases", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    const cureStatus = getCureStatus(game);

    const validStatuses = Object.values(CureStatus);

    expect(validStatuses).toContain(cureStatus[Disease.Blue]);
    expect(validStatuses).toContain(cureStatus[Disease.Yellow]);
    expect(validStatuses).toContain(cureStatus[Disease.Black]);
    expect(validStatuses).toContain(cureStatus[Disease.Red]);
  });

  it("should work with all game configurations", () => {
    const game2 = createGame({ playerCount: 2, difficulty: 4 });
    const game3 = createGame({ playerCount: 3, difficulty: 5 });
    const game4 = createGame({ playerCount: 4, difficulty: 6 });

    const status2 = getCureStatus(game2);
    const status3 = getCureStatus(game3);
    const status4 = getCureStatus(game4);

    // All should return valid cure status
    expect(status2[Disease.Blue]).toBe(CureStatus.Uncured);
    expect(status3[Disease.Yellow]).toBe(CureStatus.Uncured);
    expect(status4[Disease.Black]).toBe(CureStatus.Uncured);
  });

  it("should return a copy of the cure status (immutability)", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    const status1 = getCureStatus(game);
    const status2 = getCureStatus(game);

    // Should be equal but not the same reference
    expect(status1).toEqual(status2);
    expect(status1).not.toBe(status2);
  });

  it("should not allow mutations to affect the game state", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    const cureStatus = getCureStatus(game);

    // Mutate the returned cure status
    cureStatus[Disease.Blue] = CureStatus.Cured;
    cureStatus[Disease.Yellow] = CureStatus.Eradicated;

    // Game state should be unchanged
    const freshStatus = getCureStatus(game);
    expect(freshStatus[Disease.Blue]).toBe(CureStatus.Uncured);
    expect(freshStatus[Disease.Yellow]).toBe(CureStatus.Uncured);
  });

  it("should reflect changes to cure status if game state is modified", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Initial state - all uncured
    const initialStatus = getCureStatus(game);
    expect(initialStatus[Disease.Blue]).toBe(CureStatus.Uncured);

    // Modify game state
    game.cures[Disease.Blue] = CureStatus.Cured;

    // Query should reflect the change
    const updatedStatus = getCureStatus(game);
    expect(updatedStatus[Disease.Blue]).toBe(CureStatus.Cured);
    expect(updatedStatus[Disease.Yellow]).toBe(CureStatus.Uncured);
    expect(updatedStatus[Disease.Black]).toBe(CureStatus.Uncured);
    expect(updatedStatus[Disease.Red]).toBe(CureStatus.Uncured);
  });

  it("should handle all cure status types", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Set different cure statuses
    game.cures[Disease.Blue] = CureStatus.Uncured;
    game.cures[Disease.Yellow] = CureStatus.Cured;
    game.cures[Disease.Black] = CureStatus.Eradicated;
    game.cures[Disease.Red] = CureStatus.Uncured;

    const cureStatus = getCureStatus(game);

    expect(cureStatus[Disease.Blue]).toBe(CureStatus.Uncured);
    expect(cureStatus[Disease.Yellow]).toBe(CureStatus.Cured);
    expect(cureStatus[Disease.Black]).toBe(CureStatus.Eradicated);
    expect(cureStatus[Disease.Red]).toBe(CureStatus.Uncured);
  });

  it("should return the same values as direct access to game.cures", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    const cureStatus = getCureStatus(game);

    expect(cureStatus[Disease.Blue]).toBe(game.cures[Disease.Blue]);
    expect(cureStatus[Disease.Yellow]).toBe(game.cures[Disease.Yellow]);
    expect(cureStatus[Disease.Black]).toBe(game.cures[Disease.Black]);
    expect(cureStatus[Disease.Red]).toBe(game.cures[Disease.Red]);
  });

  it("should return a new object on each call", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    const status1 = getCureStatus(game);
    const status2 = getCureStatus(game);

    // Different references
    expect(status1).not.toBe(status2);

    // But same values
    expect(status1[Disease.Blue]).toBe(status2[Disease.Blue]);
    expect(status1[Disease.Yellow]).toBe(status2[Disease.Yellow]);
    expect(status1[Disease.Black]).toBe(status2[Disease.Black]);
    expect(status1[Disease.Red]).toBe(status2[Disease.Red]);
  });

  it("should work at the start of the game", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // At game start, all diseases should be uncured
    const cureStatus = getCureStatus(game);

    for (const disease of Object.values(Disease)) {
      expect(cureStatus[disease]).toBe(CureStatus.Uncured);
    }
  });

  it("should handle a scenario where all diseases are cured", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Cure all diseases
    game.cures[Disease.Blue] = CureStatus.Cured;
    game.cures[Disease.Yellow] = CureStatus.Cured;
    game.cures[Disease.Black] = CureStatus.Cured;
    game.cures[Disease.Red] = CureStatus.Cured;

    const cureStatus = getCureStatus(game);

    expect(cureStatus[Disease.Blue]).toBe(CureStatus.Cured);
    expect(cureStatus[Disease.Yellow]).toBe(CureStatus.Cured);
    expect(cureStatus[Disease.Black]).toBe(CureStatus.Cured);
    expect(cureStatus[Disease.Red]).toBe(CureStatus.Cured);
  });

  it("should handle a scenario where some diseases are eradicated", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Mix of statuses
    game.cures[Disease.Blue] = CureStatus.Eradicated;
    game.cures[Disease.Yellow] = CureStatus.Cured;
    game.cures[Disease.Black] = CureStatus.Uncured;
    game.cures[Disease.Red] = CureStatus.Eradicated;

    const cureStatus = getCureStatus(game);

    expect(cureStatus[Disease.Blue]).toBe(CureStatus.Eradicated);
    expect(cureStatus[Disease.Yellow]).toBe(CureStatus.Cured);
    expect(cureStatus[Disease.Black]).toBe(CureStatus.Uncured);
    expect(cureStatus[Disease.Red]).toBe(CureStatus.Eradicated);
  });

  it("should contain all Disease enum values as keys", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    const cureStatus = getCureStatus(game);

    const allDiseases = Object.values(Disease);

    for (const disease of allDiseases) {
      expect(cureStatus).toHaveProperty(disease);
    }
  });

  it("should not have extra properties beyond the 4 diseases", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    const cureStatus = getCureStatus(game);

    const keys = Object.keys(cureStatus);
    expect(keys).toHaveLength(4);
  });

  it("should work consistently across multiple calls", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    const status1 = getCureStatus(game);
    const status2 = getCureStatus(game);
    const status3 = getCureStatus(game);

    // All should return the same values
    expect(status1).toEqual(status2);
    expect(status2).toEqual(status3);
  });
});

describe("getGameStatus", () => {
  it("should return Ongoing for a new game", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Ongoing);
  });

  it("should return Won when all 4 diseases are cured", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Cure all diseases
    game.cures[Disease.Blue] = CureStatus.Cured;
    game.cures[Disease.Yellow] = CureStatus.Cured;
    game.cures[Disease.Black] = CureStatus.Cured;
    game.cures[Disease.Red] = CureStatus.Cured;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Won);
  });

  it("should return Won when all 4 diseases are eradicated", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Eradicate all diseases
    game.cures[Disease.Blue] = CureStatus.Eradicated;
    game.cures[Disease.Yellow] = CureStatus.Eradicated;
    game.cures[Disease.Black] = CureStatus.Eradicated;
    game.cures[Disease.Red] = CureStatus.Eradicated;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Won);
  });

  it("should return Won when diseases are a mix of cured and eradicated", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Mix of cured and eradicated
    game.cures[Disease.Blue] = CureStatus.Cured;
    game.cures[Disease.Yellow] = CureStatus.Eradicated;
    game.cures[Disease.Black] = CureStatus.Cured;
    game.cures[Disease.Red] = CureStatus.Eradicated;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Won);
  });

  it("should return Ongoing when only 3 diseases are cured", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Only 3 diseases cured
    game.cures[Disease.Blue] = CureStatus.Cured;
    game.cures[Disease.Yellow] = CureStatus.Cured;
    game.cures[Disease.Black] = CureStatus.Cured;
    game.cures[Disease.Red] = CureStatus.Uncured;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Ongoing);
  });

  it("should return Lost when outbreak count reaches 8", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Set outbreak count to 8
    game.outbreakCount = 8;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Lost);
  });

  it("should return Lost when outbreak count exceeds 8", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Set outbreak count above 8 (edge case, shouldn't happen in real game)
    game.outbreakCount = 10;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Lost);
  });

  it("should return Ongoing when outbreak count is 7", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Set outbreak count to 7 (one below loss condition)
    game.outbreakCount = 7;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Ongoing);
  });

  it("should return Lost when blue cube supply is exhausted", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Exhaust blue cubes
    game.cubeSupply[Disease.Blue] = 0;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Lost);
  });

  it("should return Lost when yellow cube supply is exhausted", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Exhaust yellow cubes
    game.cubeSupply[Disease.Yellow] = 0;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Lost);
  });

  it("should return Lost when black cube supply is exhausted", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Exhaust black cubes
    game.cubeSupply[Disease.Black] = 0;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Lost);
  });

  it("should return Lost when red cube supply is exhausted", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Exhaust red cubes
    game.cubeSupply[Disease.Red] = 0;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Lost);
  });

  it("should return Lost when cube supply is negative (edge case)", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Set cube supply to negative (shouldn't happen in real game)
    game.cubeSupply[Disease.Blue] = -1;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Lost);
  });

  it("should return Ongoing when cube supply is 1 for all colors", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Set all cube supplies to 1 (low but not exhausted)
    game.cubeSupply[Disease.Blue] = 1;
    game.cubeSupply[Disease.Yellow] = 1;
    game.cubeSupply[Disease.Black] = 1;
    game.cubeSupply[Disease.Red] = 1;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Ongoing);
  });

  it("should return Lost when multiple cube supplies are exhausted", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Exhaust multiple cube supplies
    game.cubeSupply[Disease.Blue] = 0;
    game.cubeSupply[Disease.Yellow] = 0;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Lost);
  });

  it("should return Lost when player deck is empty during draw phase", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Empty the player deck
    game.playerDeck = [];
    // Set phase to Draw (when cards need to be drawn)
    game.phase = TurnPhase.Draw;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Lost);
  });

  it("should return Ongoing when player deck is empty but not in draw phase", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Empty the player deck
    game.playerDeck = [];
    // Set phase to Actions (not drawing cards yet)
    game.phase = TurnPhase.Actions;

    const status = getGameStatus(game);

    // Should not be lost yet since we're not in draw phase
    expect(status).toBe(GameStatus.Ongoing);
  });

  it("should return Ongoing when player deck has 1 card during draw phase", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Leave only 1 card in player deck
    game.playerDeck = [{ type: "city", city: "Atlanta", color: Disease.Blue }];
    game.phase = TurnPhase.Draw;

    const status = getGameStatus(game);

    // Should still be ongoing (can draw 1 card, though not the required 2)
    // Note: In actual game, this would be handled during card drawing logic
    expect(status).toBe(GameStatus.Ongoing);
  });

  it("should prioritize win condition over loss conditions", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Win condition: all diseases cured
    game.cures[Disease.Blue] = CureStatus.Cured;
    game.cures[Disease.Yellow] = CureStatus.Cured;
    game.cures[Disease.Black] = CureStatus.Cured;
    game.cures[Disease.Red] = CureStatus.Cured;

    // Loss condition: outbreak count at 8
    game.outbreakCount = 8;

    const status = getGameStatus(game);

    // Win should be checked first
    expect(status).toBe(GameStatus.Won);
  });

  it("should check outbreak loss condition before cube supply", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Both loss conditions present
    game.outbreakCount = 8;
    game.cubeSupply[Disease.Blue] = 0;

    const status = getGameStatus(game);

    // Should still be Lost (outbreak checked first)
    expect(status).toBe(GameStatus.Lost);
  });

  it("should work with all game configurations", () => {
    const game2 = createGame({ playerCount: 2, difficulty: 4 });
    const game3 = createGame({ playerCount: 3, difficulty: 5 });
    const game4 = createGame({ playerCount: 4, difficulty: 6 });

    // All new games should be ongoing
    expect(getGameStatus(game2)).toBe(GameStatus.Ongoing);
    expect(getGameStatus(game3)).toBe(GameStatus.Ongoing);
    expect(getGameStatus(game4)).toBe(GameStatus.Ongoing);
  });

  it("should return the correct status value type", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    const status = getGameStatus(game);

    // Should be one of the GameStatus enum values
    const validStatuses = Object.values(GameStatus);
    expect(validStatuses).toContain(status);
  });

  it("should return consistent results for the same game state", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    const status1 = getGameStatus(game);
    const status2 = getGameStatus(game);
    const status3 = getGameStatus(game);

    expect(status1).toBe(status2);
    expect(status2).toBe(status3);
  });

  it("should detect win even with high outbreak count", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Win condition met
    game.cures[Disease.Blue] = CureStatus.Cured;
    game.cures[Disease.Yellow] = CureStatus.Cured;
    game.cures[Disease.Black] = CureStatus.Cured;
    game.cures[Disease.Red] = CureStatus.Cured;

    // But outbreak count is high (not 8 yet)
    game.outbreakCount = 7;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Won);
  });

  it("should detect win even with low cube supply", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Win condition met
    game.cures[Disease.Blue] = CureStatus.Cured;
    game.cures[Disease.Yellow] = CureStatus.Cured;
    game.cures[Disease.Black] = CureStatus.Cured;
    game.cures[Disease.Red] = CureStatus.Cured;

    // But cube supply is low (not 0)
    game.cubeSupply[Disease.Blue] = 1;
    game.cubeSupply[Disease.Yellow] = 2;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Won);
  });

  it("should handle all phase types correctly", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Test with Actions phase
    game.phase = TurnPhase.Actions;
    expect(getGameStatus(game)).toBe(GameStatus.Ongoing);

    // Test with Draw phase
    game.phase = TurnPhase.Draw;
    expect(getGameStatus(game)).toBe(GameStatus.Ongoing);

    // Test with Infect phase
    game.phase = TurnPhase.Infect;
    expect(getGameStatus(game)).toBe(GameStatus.Ongoing);
  });

  it("should return Ongoing for a game in progress with no win/loss conditions", () => {
    const game = createGame({ playerCount: 3, difficulty: 5 });

    // Partial progress - 2 diseases cured
    game.cures[Disease.Blue] = CureStatus.Cured;
    game.cures[Disease.Yellow] = CureStatus.Cured;
    // 5 outbreaks (not 8 yet)
    game.outbreakCount = 5;
    // Some cubes used but not exhausted
    game.cubeSupply[Disease.Blue] = 10;
    game.cubeSupply[Disease.Yellow] = 8;
    game.cubeSupply[Disease.Black] = 15;
    game.cubeSupply[Disease.Red] = 12;

    const status = getGameStatus(game);

    expect(status).toBe(GameStatus.Ongoing);
  });

  it("should match the initial game status field", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // For a new game, getGameStatus should match game.status
    const computedStatus = getGameStatus(game);

    expect(computedStatus).toBe(game.status);
    expect(computedStatus).toBe(GameStatus.Ongoing);
  });
});

describe("getInfectionRate", () => {
  it("should return 2 for position 1", () => {
    expect(getInfectionRate(1)).toBe(2);
  });

  it("should return 2 for position 2", () => {
    expect(getInfectionRate(2)).toBe(2);
  });

  it("should return 2 for position 3", () => {
    expect(getInfectionRate(3)).toBe(2);
  });

  it("should return 3 for position 4", () => {
    expect(getInfectionRate(4)).toBe(3);
  });

  it("should return 3 for position 5", () => {
    expect(getInfectionRate(5)).toBe(3);
  });

  it("should return 4 for position 6", () => {
    expect(getInfectionRate(6)).toBe(4);
  });

  it("should return 4 for position 7", () => {
    expect(getInfectionRate(7)).toBe(4);
  });

  it("should throw error for position 0", () => {
    expect(() => getInfectionRate(0)).toThrow(
      "Invalid infection rate position: 0. Must be between 1 and 7.",
    );
  });

  it("should throw error for position 8", () => {
    expect(() => getInfectionRate(8)).toThrow(
      "Invalid infection rate position: 8. Must be between 1 and 7.",
    );
  });

  it("should throw error for negative position", () => {
    expect(() => getInfectionRate(-1)).toThrow("Invalid infection rate position: -1");
  });

  it("should throw error for very large position", () => {
    expect(() => getInfectionRate(100)).toThrow("Invalid infection rate position: 100");
  });

  it("should match the infection rate track pattern [2,2,2,3,3,4,4]", () => {
    const expectedRates = [2, 2, 2, 3, 3, 4, 4];
    for (let position = 1; position <= 7; position++) {
      const expectedRate = expectedRates[position - 1];
      expect(getInfectionRate(position)).toBe(expectedRate);
    }
  });

  it("should work with game state infection rate position", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Game starts at position 1
    const initialRate = getInfectionRate(game.infectionRatePosition);
    expect(initialRate).toBe(2);

    // Simulate advancing infection rate
    game.infectionRatePosition = 4;
    const midGameRate = getInfectionRate(game.infectionRatePosition);
    expect(midGameRate).toBe(3);

    // Maximum position
    game.infectionRatePosition = 7;
    const maxRate = getInfectionRate(game.infectionRatePosition);
    expect(maxRate).toBe(4);
  });

  it("should return correct rate for all valid positions", () => {
    // Test all valid positions systematically
    for (let pos = 1; pos <= 7; pos++) {
      const rate = getInfectionRate(pos);
      expect(rate).toBeGreaterThanOrEqual(2);
      expect(rate).toBeLessThanOrEqual(4);
      expect(Number.isInteger(rate)).toBe(true);
    }
  });

  it("should be deterministic (same input gives same output)", () => {
    for (let pos = 1; pos <= 7; pos++) {
      const rate1 = getInfectionRate(pos);
      const rate2 = getInfectionRate(pos);
      const rate3 = getInfectionRate(pos);

      expect(rate1).toBe(rate2);
      expect(rate2).toBe(rate3);
    }
  });
});

describe("advancePhase", () => {
  it("should advance from Actions to Draw phase", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Game starts in Actions phase
    expect(game.phase).toBe(TurnPhase.Actions);

    const result = advancePhase(game);

    expect(result.phase).toBe(TurnPhase.Draw);
  });

  it("should advance from Draw to Infect phase", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Draw;

    const result = advancePhase(game);

    expect(result.phase).toBe(TurnPhase.Infect);
  });

  it("should advance from Infect to Actions phase with next player", () => {
    const game = createGame({ playerCount: 3, difficulty: 4 });
    game.phase = TurnPhase.Infect;
    game.currentPlayerIndex = 0;

    const result = advancePhase(game);

    expect(result.phase).toBe(TurnPhase.Actions);
    expect(result.currentPlayerIndex).toBe(1);
    expect(result.actionsRemaining).toBe(4);
  });

  it("should wrap to first player after last player's turn", () => {
    const game = createGame({ playerCount: 3, difficulty: 4 });
    game.phase = TurnPhase.Infect;
    game.currentPlayerIndex = 2; // Last player (index 2 of 3 players)

    const result = advancePhase(game);

    expect(result.phase).toBe(TurnPhase.Actions);
    expect(result.currentPlayerIndex).toBe(0); // Wrap to first player
    expect(result.actionsRemaining).toBe(4);
  });

  it("should not reset actions when advancing from Actions to Draw", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Actions;
    game.actionsRemaining = 2; // Player has used 2 actions

    const result = advancePhase(game);

    expect(result.phase).toBe(TurnPhase.Draw);
    expect(result.actionsRemaining).toBe(2); // Should not reset
  });

  it("should not reset actions when advancing from Draw to Infect", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Draw;
    game.actionsRemaining = 0; // Player has used all actions

    const result = advancePhase(game);

    expect(result.phase).toBe(TurnPhase.Infect);
    expect(result.actionsRemaining).toBe(0); // Should not reset yet
  });

  it("should reset actions to 4 when advancing from Infect to Actions", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Infect;
    game.actionsRemaining = 0; // Previous player used all actions

    const result = advancePhase(game);

    expect(result.phase).toBe(TurnPhase.Actions);
    expect(result.actionsRemaining).toBe(4); // Reset for new player
  });

  it("should not mutate the original game state", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    const originalPhase = game.phase;
    const originalPlayerIndex = game.currentPlayerIndex;

    advancePhase(game);

    // Original game should be unchanged
    expect(game.phase).toBe(originalPhase);
    expect(game.currentPlayerIndex).toBe(originalPlayerIndex);
  });

  it("should preserve all other game state when advancing phases", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Actions;

    const result = advancePhase(game);

    // All other fields should be preserved
    expect(result.config).toEqual(game.config);
    expect(result.players).toEqual(game.players);
    expect(result.board).toEqual(game.board);
    expect(result.cures).toEqual(game.cures);
    expect(result.cubeSupply).toEqual(game.cubeSupply);
    expect(result.infectionRatePosition).toBe(game.infectionRatePosition);
    expect(result.outbreakCount).toBe(game.outbreakCount);
    expect(result.playerDeck).toEqual(game.playerDeck);
    expect(result.playerDiscard).toEqual(game.playerDiscard);
    expect(result.infectionDeck).toEqual(game.infectionDeck);
    expect(result.infectionDiscard).toEqual(game.infectionDiscard);
    expect(result.status).toBe(game.status);
  });

  it("should work with 2 players", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Infect;
    game.currentPlayerIndex = 0;

    const result = advancePhase(game);

    expect(result.currentPlayerIndex).toBe(1);

    // Advance again
    const result2 = advancePhase({ ...result, phase: TurnPhase.Infect });
    expect(result2.currentPlayerIndex).toBe(0); // Wrap to first player
  });

  it("should work with 3 players", () => {
    const game = createGame({ playerCount: 3, difficulty: 4 });
    game.phase = TurnPhase.Infect;

    // Advance through all players
    game.currentPlayerIndex = 0;
    const result1 = advancePhase(game);
    expect(result1.currentPlayerIndex).toBe(1);

    const result2 = advancePhase({ ...result1, phase: TurnPhase.Infect });
    expect(result2.currentPlayerIndex).toBe(2);

    const result3 = advancePhase({ ...result2, phase: TurnPhase.Infect });
    expect(result3.currentPlayerIndex).toBe(0); // Wrap
  });

  it("should work with 4 players", () => {
    const game = createGame({ playerCount: 4, difficulty: 4 });
    game.phase = TurnPhase.Infect;

    // Advance through all players
    game.currentPlayerIndex = 0;
    const result1 = advancePhase(game);
    expect(result1.currentPlayerIndex).toBe(1);

    const result2 = advancePhase({ ...result1, phase: TurnPhase.Infect });
    expect(result2.currentPlayerIndex).toBe(2);

    const result3 = advancePhase({ ...result2, phase: TurnPhase.Infect });
    expect(result3.currentPlayerIndex).toBe(3);

    const result4 = advancePhase({ ...result3, phase: TurnPhase.Infect });
    expect(result4.currentPlayerIndex).toBe(0); // Wrap
  });

  it("should complete a full turn cycle (Actions → Draw → Infect → Actions)", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Start in Actions phase
    expect(game.phase).toBe(TurnPhase.Actions);
    expect(game.currentPlayerIndex).toBe(0);

    // Advance to Draw
    const state1 = advancePhase(game);
    expect(state1.phase).toBe(TurnPhase.Draw);
    expect(state1.currentPlayerIndex).toBe(0); // Same player

    // Advance to Infect
    const state2 = advancePhase(state1);
    expect(state2.phase).toBe(TurnPhase.Infect);
    expect(state2.currentPlayerIndex).toBe(0); // Same player

    // Advance to Actions with next player
    const state3 = advancePhase(state2);
    expect(state3.phase).toBe(TurnPhase.Actions);
    expect(state3.currentPlayerIndex).toBe(1); // Next player
    expect(state3.actionsRemaining).toBe(4); // Reset
  });

  it("should maintain player index when advancing from Actions to Draw", () => {
    const game = createGame({ playerCount: 3, difficulty: 4 });
    game.phase = TurnPhase.Actions;
    game.currentPlayerIndex = 1;

    const result = advancePhase(game);

    expect(result.phase).toBe(TurnPhase.Draw);
    expect(result.currentPlayerIndex).toBe(1); // Same player
  });

  it("should maintain player index when advancing from Draw to Infect", () => {
    const game = createGame({ playerCount: 3, difficulty: 4 });
    game.phase = TurnPhase.Draw;
    game.currentPlayerIndex = 2;

    const result = advancePhase(game);

    expect(result.phase).toBe(TurnPhase.Infect);
    expect(result.currentPlayerIndex).toBe(2); // Same player
  });

  it("should handle multiple full rounds of turns", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    let state = game;

    // Complete first player's turn (Actions → Draw → Infect → next player)
    state = advancePhase(state); // Actions → Draw
    state = advancePhase(state); // Draw → Infect
    state = advancePhase(state); // Infect → Actions (player 1)

    expect(state.phase).toBe(TurnPhase.Actions);
    expect(state.currentPlayerIndex).toBe(1);

    // Complete second player's turn
    state = advancePhase(state); // Actions → Draw
    state = advancePhase(state); // Draw → Infect
    state = advancePhase(state); // Infect → Actions (player 0 again)

    expect(state.phase).toBe(TurnPhase.Actions);
    expect(state.currentPlayerIndex).toBe(0); // Back to first player
  });

  it("should work correctly with different difficulty levels", () => {
    const game4 = createGame({ playerCount: 2, difficulty: 4 });
    const game5 = createGame({ playerCount: 2, difficulty: 5 });
    const game6 = createGame({ playerCount: 2, difficulty: 6 });

    game4.phase = TurnPhase.Actions;
    game5.phase = TurnPhase.Actions;
    game6.phase = TurnPhase.Actions;

    const result4 = advancePhase(game4);
    const result5 = advancePhase(game5);
    const result6 = advancePhase(game6);

    // All should advance to Draw phase regardless of difficulty
    expect(result4.phase).toBe(TurnPhase.Draw);
    expect(result5.phase).toBe(TurnPhase.Draw);
    expect(result6.phase).toBe(TurnPhase.Draw);
  });

  it("should return a new game state object", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    const result = advancePhase(game);

    // Should be a new object
    expect(result).not.toBe(game);
  });

  it("should handle edge case of player 0 wrapping correctly", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Infect;
    game.currentPlayerIndex = 1; // Last player in 2-player game

    const result = advancePhase(game);

    // Should wrap to player 0
    expect(result.currentPlayerIndex).toBe(0);
    expect(result.phase).toBe(TurnPhase.Actions);
  });
});

describe("endTurn", () => {
  it("should advance from Infect phase to Actions phase with next player", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Infect;
    game.currentPlayerIndex = 0;

    const result = endTurn(game);

    expect(result.phase).toBe(TurnPhase.Actions);
    expect(result.currentPlayerIndex).toBe(1);
    expect(result.actionsRemaining).toBe(4);
  });

  it("should throw error when called during Actions phase", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Actions;

    expect(() => endTurn(game)).toThrow(
      "Cannot end turn: must be in Infect phase, currently in actions phase",
    );
  });

  it("should throw error when called during Draw phase", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Draw;

    expect(() => endTurn(game)).toThrow(
      "Cannot end turn: must be in Infect phase, currently in draw phase",
    );
  });

  it("should wrap to first player after last player's turn", () => {
    const game = createGame({ playerCount: 3, difficulty: 4 });
    game.phase = TurnPhase.Infect;
    game.currentPlayerIndex = 2; // Last player

    const result = endTurn(game);

    expect(result.phase).toBe(TurnPhase.Actions);
    expect(result.currentPlayerIndex).toBe(0); // Wrap to first player
    expect(result.actionsRemaining).toBe(4);
  });

  it("should reset actions remaining to 4 for next player", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Infect;
    game.actionsRemaining = 0; // Previous player used all actions

    const result = endTurn(game);

    expect(result.actionsRemaining).toBe(4);
  });

  it("should not mutate the original game state", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Infect;
    const originalPlayerIndex = game.currentPlayerIndex;
    const originalPhase = game.phase;

    endTurn(game);

    // Original game should be unchanged
    expect(game.currentPlayerIndex).toBe(originalPlayerIndex);
    expect(game.phase).toBe(originalPhase);
  });

  it("should preserve all other game state", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Infect;

    const result = endTurn(game);

    // All other fields should be preserved
    expect(result.config).toEqual(game.config);
    expect(result.players).toEqual(game.players);
    expect(result.board).toEqual(game.board);
    expect(result.cures).toEqual(game.cures);
    expect(result.cubeSupply).toEqual(game.cubeSupply);
    expect(result.infectionRatePosition).toBe(game.infectionRatePosition);
    expect(result.outbreakCount).toBe(game.outbreakCount);
    expect(result.playerDeck).toEqual(game.playerDeck);
    expect(result.playerDiscard).toEqual(game.playerDiscard);
    expect(result.infectionDeck).toEqual(game.infectionDeck);
    expect(result.infectionDiscard).toEqual(game.infectionDiscard);
    expect(result.status).toBe(game.status);
  });

  it("should work correctly with 2 players", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Infect;
    game.currentPlayerIndex = 0;

    const result1 = endTurn(game);
    expect(result1.currentPlayerIndex).toBe(1);

    const result2 = endTurn({ ...result1, phase: TurnPhase.Infect });
    expect(result2.currentPlayerIndex).toBe(0); // Wrap to first player
  });

  it("should work correctly with 3 players", () => {
    const game = createGame({ playerCount: 3, difficulty: 4 });
    game.phase = TurnPhase.Infect;

    // Advance through all players
    game.currentPlayerIndex = 0;
    const result1 = endTurn(game);
    expect(result1.currentPlayerIndex).toBe(1);

    const result2 = endTurn({ ...result1, phase: TurnPhase.Infect });
    expect(result2.currentPlayerIndex).toBe(2);

    const result3 = endTurn({ ...result2, phase: TurnPhase.Infect });
    expect(result3.currentPlayerIndex).toBe(0); // Wrap
  });

  it("should work correctly with 4 players", () => {
    const game = createGame({ playerCount: 4, difficulty: 4 });
    game.phase = TurnPhase.Infect;

    // Advance through all players
    game.currentPlayerIndex = 0;
    const result1 = endTurn(game);
    expect(result1.currentPlayerIndex).toBe(1);

    const result2 = endTurn({ ...result1, phase: TurnPhase.Infect });
    expect(result2.currentPlayerIndex).toBe(2);

    const result3 = endTurn({ ...result2, phase: TurnPhase.Infect });
    expect(result3.currentPlayerIndex).toBe(3);

    const result4 = endTurn({ ...result3, phase: TurnPhase.Infect });
    expect(result4.currentPlayerIndex).toBe(0); // Wrap
  });

  it("should return a new game state object", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Infect;

    const result = endTurn(game);

    // Should be a new object
    expect(result).not.toBe(game);
  });

  it("should handle sequential turns correctly", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    let state = game;

    // Complete first player's action and draw phases manually
    state.phase = TurnPhase.Infect;
    state.currentPlayerIndex = 0;

    // End turn to advance to next player
    state = endTurn(state);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.phase).toBe(TurnPhase.Actions);

    // Complete second player's action and draw phases manually
    state.phase = TurnPhase.Infect;

    // End turn to wrap back to first player
    state = endTurn(state);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.phase).toBe(TurnPhase.Actions);
  });
});

describe("drawPlayerCards", () => {
  it("should draw 2 cards from the player deck", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    const initialDeckSize = game.playerDeck.length;
    const currentPlayer = getCurrentPlayer(game);
    const initialHandSize = currentPlayer.hand.length;

    // Set phase to Draw
    game.phase = TurnPhase.Draw;

    const result = drawPlayerCards(game);

    expect(result.state.playerDeck.length).toBe(initialDeckSize - 2);
    const updatedCurrentPlayer = getCurrentPlayer(result.state);
    expect(updatedCurrentPlayer.hand.length).toBe(initialHandSize + 2);
  });

  it("should add the top 2 cards from the deck to current player's hand", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    const card1 = game.playerDeck[0];
    const card2 = game.playerDeck[1];

    // Set phase to Draw
    game.phase = TurnPhase.Draw;

    const result = drawPlayerCards(game);
    const currentPlayer = getCurrentPlayer(result.state);

    // Check that the drawn cards are in the player's hand
    expect(currentPlayer.hand).toContainEqual(card1);
    expect(currentPlayer.hand).toContainEqual(card2);
  });

  it("should remove the drawn cards from the deck", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    const initialDeckLength = game.playerDeck.length;
    const card3 = game.playerDeck[2];

    // Set phase to Draw
    game.phase = TurnPhase.Draw;

    const result = drawPlayerCards(game);

    // The deck should have 2 fewer cards
    expect(result.state.playerDeck.length).toBe(initialDeckLength - 2);

    // The third card should now be at the top
    expect(result.state.playerDeck[0]).toEqual(card3);
  });

  it("should return empty epidemics array when no epidemic cards are drawn", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Set phase to Draw
    game.phase = TurnPhase.Draw;

    // Make sure the top 2 cards are not epidemic cards
    // (In a real game, epidemic cards are shuffled in, but we can manipulate for testing)
    const nonEpidemicCards = game.playerDeck.filter((card) => card.type !== "epidemic").slice(0, 2);
    game.playerDeck = [
      ...nonEpidemicCards,
      ...game.playerDeck.filter((card) => card.type !== "epidemic").slice(2),
    ];

    const result = drawPlayerCards(game);

    expect(result.epidemics).toEqual([]);
  });

  it("should resolve epidemic immediately and not add to hand", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Set phase to Draw
    game.phase = TurnPhase.Draw;

    // Setup known infection deck for epidemic resolution
    const cleanBoard = initializeBoard();
    game.board = cleanBoard;
    game.infectionDeck = [
      { city: "Paris", color: Disease.Blue },
      { city: "Atlanta", color: Disease.Blue }, // Bottom card
    ];
    game.infectionDiscard = [];
    game.infectionRatePosition = 1;

    // Place an epidemic card at the top of the deck
    const epidemicCard = { type: "epidemic" as const };
    const nonEpidemicCard = game.playerDeck.find((card) => card.type !== "epidemic");
    if (nonEpidemicCard) {
      game.playerDeck = [epidemicCard, nonEpidemicCard, ...game.playerDeck.slice(2)];

      const initialHandSize = getCurrentPlayer(game).hand.length;
      const result = drawPlayerCards(game);

      // Epidemic should be resolved, not added to hand
      expect(result.epidemics).toHaveLength(1);
      expect(result.epidemics[0]?.infectedCity).toBe("Atlanta");
      expect(result.epidemics[0]?.infectedColor).toBe(Disease.Blue);
      expect(result.epidemics[0]?.infectionRatePosition).toBe(2);

      // Hand should have 1 card (the non-epidemic card), not 2
      expect(getCurrentPlayer(result.state).hand.length).toBe(initialHandSize + 1);

      // Epidemic card should not be in hand
      expect(getCurrentPlayer(result.state).hand).not.toContainEqual(epidemicCard);

      // Epidemic card should be in discard pile
      expect(result.state.playerDiscard).toContainEqual(epidemicCard);

      // Infection rate should have increased
      expect(result.state.infectionRatePosition).toBe(2);

      // Atlanta should have 3 cubes
      expect(result.state.board["Atlanta"]?.blue).toBe(3);
    }
  });

  it("should throw error if not in Draw phase", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // In Actions phase
    expect(() => drawPlayerCards(game)).toThrow("must be in Draw phase");

    // In Infect phase
    game.phase = TurnPhase.Infect;
    expect(() => drawPlayerCards(game)).toThrow("must be in Draw phase");
  });

  it("should throw error if game has ended", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Draw;
    game.status = GameStatus.Won;

    expect(() => drawPlayerCards(game)).toThrow("game has ended");

    game.status = GameStatus.Lost;
    expect(() => drawPlayerCards(game)).toThrow("game has ended");
  });

  it("should set game status to Lost if deck has fewer than 2 cards", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Draw;

    // Leave only 1 card in the deck
    game.playerDeck = game.playerDeck.slice(0, 1);

    const result = drawPlayerCards(game);

    expect(result.state.status).toBe(GameStatus.Lost);
    expect(result.epidemics).toEqual([]);
  });

  it("should set game status to Lost if deck is empty", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Draw;

    // Empty the deck
    game.playerDeck = [];

    const result = drawPlayerCards(game);

    expect(result.state.status).toBe(GameStatus.Lost);
    expect(result.epidemics).toEqual([]);
  });

  it("should only add cards to current player's hand, not other players", () => {
    const game = createGame({ playerCount: 3, difficulty: 4 });
    game.phase = TurnPhase.Draw;

    // Ensure top 2 cards are not epidemic cards for this test
    const nonEpidemicCards = game.playerDeck.filter((card) => card.type !== "epidemic");
    const card1 = nonEpidemicCards[0];
    const card2 = nonEpidemicCards[1];

    if (!card1 || !card2) {
      throw new Error("Not enough non-epidemic cards in deck");
    }

    game.playerDeck = [card1, card2, ...game.playerDeck.slice(2)];

    const player0 = game.players[0];
    const player1 = game.players[1];
    const player2 = game.players[2];

    expect(player0).toBeDefined();
    expect(player1).toBeDefined();
    expect(player2).toBeDefined();

    if (!player0 || !player1 || !player2) {
      throw new Error("Players not initialized");
    }

    const player1InitialHand = [...player0.hand];
    const player2InitialHand = [...player1.hand];
    const player3InitialHand = [...player2.hand];

    // Current player is player 0
    expect(game.currentPlayerIndex).toBe(0);

    const result = drawPlayerCards(game);

    const resultPlayer0 = result.state.players[0];
    const resultPlayer1 = result.state.players[1];
    const resultPlayer2 = result.state.players[2];

    expect(resultPlayer0).toBeDefined();
    expect(resultPlayer1).toBeDefined();
    expect(resultPlayer2).toBeDefined();

    if (!resultPlayer0 || !resultPlayer1 || !resultPlayer2) {
      throw new Error("Result players not initialized");
    }

    // Player 0 should have 2 more cards (since we ensured no epidemics)
    expect(resultPlayer0.hand.length).toBe(player1InitialHand.length + 2);

    // Other players should have the same hand
    expect(resultPlayer1.hand).toEqual(player2InitialHand);
    expect(resultPlayer2.hand).toEqual(player3InitialHand);
  });

  it("should work for different player indices", () => {
    const game = createGame({ playerCount: 3, difficulty: 4 });
    game.phase = TurnPhase.Draw;

    // Set current player to player 1
    game.currentPlayerIndex = 1;

    const player1 = game.players[1];
    expect(player1).toBeDefined();

    if (!player1) {
      throw new Error("Player 1 not initialized");
    }

    const player2InitialHand = [...player1.hand];
    const initialDeckSize = game.playerDeck.length;

    const result = drawPlayerCards(game);

    const resultPlayer1 = result.state.players[1];
    expect(resultPlayer1).toBeDefined();

    if (!resultPlayer1) {
      throw new Error("Result player 1 not initialized");
    }

    // Player 1 should have 2 more cards
    expect(resultPlayer1.hand.length).toBe(player2InitialHand.length + 2);
    expect(result.state.playerDeck.length).toBe(initialDeckSize - 2);
  });

  it("should return a new game state object", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Draw;

    const result = drawPlayerCards(game);

    // Should be a new object
    expect(result.state).not.toBe(game);
    expect(result.state.players).not.toBe(game.players);
    expect(result.state.playerDeck).not.toBe(game.playerDeck);
  });

  it("should preserve other game state properties", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    game.phase = TurnPhase.Draw;

    const result = drawPlayerCards(game);

    expect(result.state.currentPlayerIndex).toBe(game.currentPlayerIndex);
    expect(result.state.phase).toBe(game.phase);
    expect(result.state.actionsRemaining).toBe(game.actionsRemaining);
    expect(result.state.board).toBe(game.board);
    expect(result.state.cures).toBe(game.cures);
    expect(result.state.infectionRatePosition).toBe(game.infectionRatePosition);
    expect(result.state.outbreakCount).toBe(game.outbreakCount);
  });
});

describe("enforceHandLimit", () => {
  it("should return success without changes if hand size is 7 or less", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });
    const currentPlayer = getCurrentPlayer(game);

    // Player starts with 4 cards, which is under the limit
    expect(currentPlayer.hand.length).toBe(4);

    const result = enforceHandLimit(game);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state).toBe(game);
      expect(getCurrentPlayer(result.state).hand.length).toBe(4);
    }
  });

  it("should return success without changes if hand size is exactly 7", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Give current player exactly 7 cards
    const currentPlayer = getCurrentPlayer(game);
    const extraCards: typeof currentPlayer.hand = [
      { type: "city", city: "Tokyo", color: Disease.Red },
      { type: "city", city: "Seoul", color: Disease.Red },
      { type: "city", city: "Bangkok", color: Disease.Red },
    ];

    game.players[game.currentPlayerIndex] = {
      ...currentPlayer,
      hand: [...currentPlayer.hand, ...extraCards],
    };

    expect(getCurrentPlayer(game).hand.length).toBe(7);

    const result = enforceHandLimit(game);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state).toBe(game);
      expect(getCurrentPlayer(result.state).hand.length).toBe(7);
    }
  });

  it("should enforce hand limit when player has 8 cards", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Give current player 8 cards (over the limit)
    const currentPlayer = getCurrentPlayer(game);
    const extraCards: typeof currentPlayer.hand = [
      { type: "city", city: "Tokyo", color: Disease.Red },
      { type: "city", city: "Seoul", color: Disease.Red },
      { type: "city", city: "Bangkok", color: Disease.Red },
      { type: "city", city: "Manila", color: Disease.Red },
    ];

    game.players[game.currentPlayerIndex] = {
      ...currentPlayer,
      hand: [...currentPlayer.hand, ...extraCards],
    };

    expect(getCurrentPlayer(game).hand.length).toBe(8);

    // Discard the first card (index 0)
    const result = enforceHandLimit(game, undefined, [0]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(getCurrentPlayer(result.state).hand.length).toBe(7);
      expect(result.state.playerDiscard.length).toBe(1);
    }
  });

  it("should enforce hand limit when player has 9 cards", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Give current player 9 cards (2 over the limit)
    const currentPlayer = getCurrentPlayer(game);
    const extraCards: typeof currentPlayer.hand = [
      { type: "city", city: "Tokyo", color: Disease.Red },
      { type: "city", city: "Seoul", color: Disease.Red },
      { type: "city", city: "Bangkok", color: Disease.Red },
      { type: "city", city: "Manila", color: Disease.Red },
      { type: "city", city: "Sydney", color: Disease.Red },
    ];

    game.players[game.currentPlayerIndex] = {
      ...currentPlayer,
      hand: [...currentPlayer.hand, ...extraCards],
    };

    expect(getCurrentPlayer(game).hand.length).toBe(9);

    // Discard 2 cards (indices 0 and 1)
    const result = enforceHandLimit(game, undefined, [0, 1]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(getCurrentPlayer(result.state).hand.length).toBe(7);
      expect(result.state.playerDiscard.length).toBe(2);
    }
  });

  it("should return error if discarding wrong number of cards", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Give current player 8 cards (1 over the limit)
    const currentPlayer = getCurrentPlayer(game);
    const extraCards: typeof currentPlayer.hand = [
      { type: "city", city: "Tokyo", color: Disease.Red },
      { type: "city", city: "Seoul", color: Disease.Red },
      { type: "city", city: "Bangkok", color: Disease.Red },
      { type: "city", city: "Manila", color: Disease.Red },
    ];

    game.players[game.currentPlayerIndex] = {
      ...currentPlayer,
      hand: [...currentPlayer.hand, ...extraCards],
    };

    // Try to discard 2 cards when only 1 should be discarded
    const result = enforceHandLimit(game, undefined, [0, 1]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Must discard exactly 1 card");
    }
  });

  it("should return error if discarding no cards when over limit", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Give current player 8 cards (1 over the limit)
    const currentPlayer = getCurrentPlayer(game);
    const extraCards: typeof currentPlayer.hand = [
      { type: "city", city: "Tokyo", color: Disease.Red },
      { type: "city", city: "Seoul", color: Disease.Red },
      { type: "city", city: "Bangkok", color: Disease.Red },
      { type: "city", city: "Manila", color: Disease.Red },
    ];

    game.players[game.currentPlayerIndex] = {
      ...currentPlayer,
      hand: [...currentPlayer.hand, ...extraCards],
    };

    // Try to discard no cards
    const result = enforceHandLimit(game, undefined, []);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Must discard exactly 1 card");
    }
  });

  it("should return error if card index is out of bounds", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Give current player 8 cards
    const currentPlayer = getCurrentPlayer(game);
    const extraCards: typeof currentPlayer.hand = [
      { type: "city", city: "Tokyo", color: Disease.Red },
      { type: "city", city: "Seoul", color: Disease.Red },
      { type: "city", city: "Bangkok", color: Disease.Red },
      { type: "city", city: "Manila", color: Disease.Red },
    ];

    game.players[game.currentPlayerIndex] = {
      ...currentPlayer,
      hand: [...currentPlayer.hand, ...extraCards],
    };

    // Try to discard a card at invalid index
    const result = enforceHandLimit(game, undefined, [10]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid card index");
    }
  });

  it("should return error if card index is negative", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Give current player 8 cards
    const currentPlayer = getCurrentPlayer(game);
    const extraCards: typeof currentPlayer.hand = [
      { type: "city", city: "Tokyo", color: Disease.Red },
      { type: "city", city: "Seoul", color: Disease.Red },
      { type: "city", city: "Bangkok", color: Disease.Red },
      { type: "city", city: "Manila", color: Disease.Red },
    ];

    game.players[game.currentPlayerIndex] = {
      ...currentPlayer,
      hand: [...currentPlayer.hand, ...extraCards],
    };

    // Try to discard a card at negative index
    const result = enforceHandLimit(game, undefined, [-1]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid card index");
    }
  });

  it("should return error if duplicate card indices provided", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Give current player 9 cards (2 over limit)
    const currentPlayer = getCurrentPlayer(game);
    const extraCards: typeof currentPlayer.hand = [
      { type: "city", city: "Tokyo", color: Disease.Red },
      { type: "city", city: "Seoul", color: Disease.Red },
      { type: "city", city: "Bangkok", color: Disease.Red },
      { type: "city", city: "Manila", color: Disease.Red },
      { type: "city", city: "Sydney", color: Disease.Red },
    ];

    game.players[game.currentPlayerIndex] = {
      ...currentPlayer,
      hand: [...currentPlayer.hand, ...extraCards],
    };

    // Try to discard same card twice
    const result = enforceHandLimit(game, undefined, [0, 0]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Cannot discard the same card multiple times");
    }
  });

  it("should discard the correct cards from player hand", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Give current player specific cards
    const currentPlayer = getCurrentPlayer(game);
    const hand: typeof currentPlayer.hand = [
      { type: "city", city: "Atlanta", color: Disease.Blue },
      { type: "city", city: "Tokyo", color: Disease.Red },
      { type: "city", city: "Paris", color: Disease.Blue },
      { type: "city", city: "Seoul", color: Disease.Red },
      { type: "city", city: "London", color: Disease.Blue },
      { type: "city", city: "Bangkok", color: Disease.Red },
      { type: "city", city: "Madrid", color: Disease.Blue },
      { type: "city", city: "Manila", color: Disease.Red },
    ];

    game.players[game.currentPlayerIndex] = {
      ...currentPlayer,
      hand,
    };

    // Discard Tokyo (index 1)
    const result = enforceHandLimit(game, undefined, [1]);

    expect(result.success).toBe(true);
    if (result.success) {
      const newHand = getCurrentPlayer(result.state).hand;
      expect(newHand.length).toBe(7);
      expect(newHand.find((c) => c.type === "city" && c.city === "Tokyo")).toBeUndefined();
      expect(newHand.find((c) => c.type === "city" && c.city === "Atlanta")).toBeDefined();

      // Check that Tokyo was added to discard pile
      expect(result.state.playerDiscard.length).toBe(1);
      expect(result.state.playerDiscard[0]).toEqual({
        type: "city",
        city: "Tokyo",
        color: Disease.Red,
      });
    }
  });

  it("should work with non-current player when playerIndex is specified", () => {
    const game = createGame({ playerCount: 3, difficulty: 4 });

    // Give player 1 (not current player 0) 8 cards
    const player1 = game.players[1];
    if (!player1) throw new Error("Player 1 not found");

    const extraCards: typeof player1.hand = [
      { type: "city", city: "Tokyo", color: Disease.Red },
      { type: "city", city: "Seoul", color: Disease.Red },
      { type: "city", city: "Bangkok", color: Disease.Red },
      { type: "city", city: "Manila", color: Disease.Red },
      { type: "city", city: "Sydney", color: Disease.Red },
    ];

    game.players[1] = {
      ...player1,
      hand: [...player1.hand, ...extraCards],
    };

    expect(game.players[1]?.hand.length).toBe(8);

    // Enforce hand limit for player 1
    const result = enforceHandLimit(game, 1, [0]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.players[1]?.hand.length).toBe(7);
      expect(result.state.playerDiscard.length).toBe(1);
    }
  });

  it("should return error for invalid player index", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    const result = enforceHandLimit(game, 10, []);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid player index");
    }
  });

  it("should preserve existing discard pile when enforcing hand limit", () => {
    const game = createGame({ playerCount: 2, difficulty: 4 });

    // Add some cards to discard pile
    game.playerDiscard = [
      { type: "city", city: "Chicago", color: Disease.Blue },
      { type: "city", city: "Montreal", color: Disease.Blue },
    ];

    // Give current player 8 cards
    const currentPlayer = getCurrentPlayer(game);
    const extraCards: typeof currentPlayer.hand = [
      { type: "city", city: "Tokyo", color: Disease.Red },
      { type: "city", city: "Seoul", color: Disease.Red },
      { type: "city", city: "Bangkok", color: Disease.Red },
      { type: "city", city: "Manila", color: Disease.Red },
    ];

    game.players[game.currentPlayerIndex] = {
      ...currentPlayer,
      hand: [...currentPlayer.hand, ...extraCards],
    };

    const result = enforceHandLimit(game, undefined, [0]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.playerDiscard.length).toBe(3);
      expect(result.state.playerDiscard[0]?.city).toBe("Chicago");
      expect(result.state.playerDiscard[1]?.city).toBe("Montreal");
    }
  });
});
