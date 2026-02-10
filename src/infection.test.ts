// Tests for infection phase logic
import { describe, expect, it } from "vitest";
import { createGame, initializeBoard } from "./game";
import { executeInfectionPhase, resolveEpidemic } from "./infection";
import { CureStatus, Disease, GameStatus, Role, type GameState } from "./types";

describe("executeInfectionPhase", () => {
  it("should draw cards equal to infection rate and place 1 cube per card", () => {
    // Create a game and manually set up infection deck with known cards
    const state = createGame({ playerCount: 2, difficulty: 4 });

    // Reset the board to have no cubes (remove initial infection effects)
    const cleanBoard = initializeBoard();

    // Set up infection deck with known cities
    const infectionDeck = [
      { city: "Atlanta", color: Disease.Blue },
      { city: "Paris", color: Disease.Blue },
    ];

    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck,
      infectionDiscard: [],
      infectionRatePosition: 1, // Rate = 2 cards
      // Ensure no Quarantine Specialist interferes by setting roles explicitly
      players: state.players.map((player) => ({
        ...player,
        role: Role.Medic, // Use any role except Quarantine Specialist
      })),
      cubeSupply: {
        blue: 24,
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = executeInfectionPhase(testState);

    // Should draw 2 cards (infection rate at position 1 = 2)
    expect(result.cardsDrawn).toHaveLength(2);
    expect(result.cardsDrawn[0]).toEqual({ city: "Atlanta", color: Disease.Blue });
    expect(result.cardsDrawn[1]).toEqual({ city: "Paris", color: Disease.Blue });

    // Should place 1 blue cube in Atlanta
    expect(result.state.board["Atlanta"]?.blue).toBe(1);

    // Should place 1 blue cube in Paris
    expect(result.state.board["Paris"]?.blue).toBe(1);

    // Should move cards to discard pile
    expect(result.state.infectionDiscard).toHaveLength(2);
    expect(result.state.infectionDeck).toHaveLength(0);

    // Should decrease cube supply by 2
    expect(result.state.cubeSupply.blue).toBe(22);
  });

  it("should respect infection rate position when drawing cards", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    // Set up infection deck with unique cities to avoid initial infection conflicts
    const infectionDeck = [
      { city: "Essen", color: Disease.Blue },
      { city: "Milan", color: Disease.Blue },
      { city: "Montreal", color: Disease.Blue },
      { city: "New York", color: Disease.Blue },
    ];

    // Position 6 = rate of 4 cards
    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck,
      infectionRatePosition: 6,
      cubeSupply: {
        blue: 24,
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = executeInfectionPhase(testState);

    // Should draw 4 cards (infection rate at position 6 = 4)
    expect(result.cardsDrawn).toHaveLength(4);
    expect(result.state.infectionDeck).toHaveLength(0);
  });

  it("should skip cube placement for eradicated diseases", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    // Set up infection deck with blue cities
    const infectionDeck = [
      { city: "Atlanta", color: Disease.Blue },
      { city: "Paris", color: Disease.Blue },
    ];

    // Mark blue disease as eradicated
    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck,
      infectionDiscard: [],
      infectionRatePosition: 1, // Rate = 2 cards
      cubeSupply: {
        blue: 24,
        yellow: 24,
        black: 24,
        red: 24,
      },
      cures: {
        ...state.cures,
        [Disease.Blue]: CureStatus.Eradicated,
      },
    };

    const result = executeInfectionPhase(testState);

    // Should still draw 2 cards
    expect(result.cardsDrawn).toHaveLength(2);

    // Should NOT place any cubes (eradicated)
    expect(result.state.board["Atlanta"]?.blue).toBe(0);
    expect(result.state.board["Paris"]?.blue).toBe(0);

    // Should still move cards to discard pile
    expect(result.state.infectionDiscard).toHaveLength(2);

    // Cube supply should not change
    expect(result.state.cubeSupply.blue).toBe(24);
  });

  it("should handle mixed eradicated and active diseases", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    // Set up infection deck with blue and yellow cities
    const infectionDeck = [
      { city: "Atlanta", color: Disease.Blue },
      { city: "Bogota", color: Disease.Yellow },
    ];

    // Mark blue disease as eradicated
    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck,
      infectionDiscard: [],
      infectionRatePosition: 1, // Rate = 2 cards
      cubeSupply: {
        blue: 24,
        yellow: 24,
        black: 24,
        red: 24,
      },
      cures: {
        ...state.cures,
        [Disease.Blue]: CureStatus.Eradicated,
      },
    };

    const result = executeInfectionPhase(testState);

    // Should draw 2 cards
    expect(result.cardsDrawn).toHaveLength(2);

    // Should NOT place blue cube (eradicated)
    expect(result.state.board["Atlanta"]?.blue).toBe(0);

    // Should place yellow cube (not eradicated)
    expect(result.state.board["Bogota"]?.yellow).toBe(1);

    // Blue supply unchanged, yellow supply decreased
    expect(result.state.cubeSupply.blue).toBe(24);
    expect(result.state.cubeSupply.yellow).toBe(23);
  });

  it("should detect cube supply exhaustion and lose the game", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    // Set up infection deck with 2 cards to match infection rate
    const infectionDeck = [
      { city: "Atlanta", color: Disease.Blue },
      { city: "Paris", color: Disease.Blue },
    ];

    // Set cube supply to 0 for blue
    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck,
      infectionRatePosition: 1, // Rate = 2
      cubeSupply: {
        blue: 0, // No blue cubes left
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = executeInfectionPhase(testState);

    // Game should be lost due to cube supply exhaustion
    expect(result.state.status).toBe(GameStatus.Lost);
  });

  it("should accumulate cubes on cities over multiple infections", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    // Manually set Atlanta to have 2 blue cubes already
    const atlantaState = cleanBoard["Atlanta"];
    if (!atlantaState) throw new Error("Atlanta not found");

    const boardWithCubes = {
      ...cleanBoard,
      Atlanta: {
        ...atlantaState,
        blue: 2,
      },
    };

    const infectionDeck = [
      { city: "Atlanta", color: Disease.Blue },
      { city: "Paris", color: Disease.Blue },
    ];

    const testState: GameState = {
      ...state,
      board: boardWithCubes,
      infectionDeck,
      infectionRatePosition: 1, // Rate = 2
      // Ensure no Quarantine Specialist interferes
      players: state.players.map((player) => ({
        ...player,
        role: Role.Medic,
      })),
      cubeSupply: {
        blue: 22, // 2 cubes already on board
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = executeInfectionPhase(testState);

    // Should add 1 more cube to Atlanta (2 -> 3)
    expect(result.state.board["Atlanta"]?.blue).toBe(3);
  });

  it("should trigger outbreak when 4th cube would be placed", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    // Set Atlanta to have 3 blue cubes already
    const atlantaState = cleanBoard["Atlanta"];
    if (!atlantaState) throw new Error("Atlanta not found");

    const boardWithCubes = {
      ...cleanBoard,
      Atlanta: {
        ...atlantaState,
        blue: 3,
      },
    };

    const testState: GameState = {
      ...state,
      board: boardWithCubes,
      infectionDeck: [
        { city: "Atlanta", color: Disease.Blue },
        { city: "Paris", color: Disease.Blue },
      ],
      infectionDiscard: [],
      infectionRatePosition: 1, // Rate = 2
      outbreakCount: 0,
      // Ensure no Quarantine Specialist interferes
      players: state.players.map((player) => ({
        ...player,
        role: Role.Medic,
      })),
      cubeSupply: {
        blue: 21, // 3 cubes already on board
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = executeInfectionPhase(testState);

    // Should NOT place 4th cube in Atlanta (stays at 3)
    expect(result.state.board["Atlanta"]?.blue).toBe(3);

    // Should increment outbreak counter
    expect(result.state.outbreakCount).toBe(1);

    // Should place 1 blue cube on adjacent cities (Chicago, Miami, Washington)
    // Atlanta connections: ["Chicago", "Miami", "Washington"]
    expect(result.state.board["Chicago"]?.blue).toBe(1);
    expect(result.state.board["Miami"]?.blue).toBe(1);
    expect(result.state.board["Washington"]?.blue).toBe(1);

    // Should also process the second card (Paris)
    expect(result.state.board["Paris"]?.blue).toBe(1);
  });

  it("should throw error if infection deck has insufficient cards", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });

    // Set up infection deck with only 1 card
    const infectionDeck = [{ city: "Atlanta", color: Disease.Blue }];

    const testState: GameState = {
      ...state,
      infectionDeck,
      infectionRatePosition: 1, // Rate = 2, need 2 cards but only have 1
    };

    expect(() => executeInfectionPhase(testState)).toThrow(
      "Infection deck doesn't have enough cards: need 2, have 1",
    );
  });

  it("should place different colored cubes correctly", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const infectionDeck = [
      { city: "Atlanta", color: Disease.Blue },
      { city: "Bogota", color: Disease.Yellow },
      { city: "Baghdad", color: Disease.Black },
      { city: "Bangkok", color: Disease.Red },
    ];

    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck,
      infectionRatePosition: 6, // Rate = 4 cards
      // Ensure no Quarantine Specialist interferes
      players: state.players.map((player) => ({
        ...player,
        role: Role.Medic,
      })),
      cubeSupply: {
        blue: 24,
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = executeInfectionPhase(testState);

    // Each city should have 1 cube of the correct color
    expect(result.state.board["Atlanta"]?.blue).toBe(1);
    expect(result.state.board["Bogota"]?.yellow).toBe(1);
    expect(result.state.board["Baghdad"]?.black).toBe(1);
    expect(result.state.board["Bangkok"]?.red).toBe(1);

    // Cube supplies should each decrease by 1
    expect(result.state.cubeSupply.blue).toBe(23);
    expect(result.state.cubeSupply.yellow).toBe(23);
    expect(result.state.cubeSupply.black).toBe(23);
    expect(result.state.cubeSupply.red).toBe(23);
  });
});

describe("Outbreak mechanics", () => {
  it("should trigger outbreak and spread to adjacent cities", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    // Set Atlanta to have 3 blue cubes
    const atlantaState = cleanBoard["Atlanta"];
    if (!atlantaState) throw new Error("Atlanta not found");

    const boardWithCubes = {
      ...cleanBoard,
      Atlanta: {
        ...atlantaState,
        blue: 3,
      },
    };

    const infectionDeck = [
      { city: "Atlanta", color: Disease.Blue },
      { city: "Paris", color: Disease.Blue },
    ];

    const testState: GameState = {
      ...state,
      board: boardWithCubes,
      infectionDeck,
      infectionDiscard: [],
      infectionRatePosition: 1, // Rate = 2
      outbreakCount: 0,
      // Ensure no Quarantine Specialist interferes
      players: state.players.map((player) => ({
        ...player,
        role: Role.Medic,
      })),
      cubeSupply: {
        blue: 21,
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = executeInfectionPhase(testState);

    // Atlanta should still have 3 blue cubes (4th cube not placed)
    expect(result.state.board["Atlanta"]?.blue).toBe(3);

    // Outbreak counter should increment
    expect(result.state.outbreakCount).toBe(1);

    // Adjacent cities should each get 1 blue cube
    // Atlanta connections: ["Chicago", "Miami", "Washington"]
    expect(result.state.board["Chicago"]?.blue).toBe(1);
    expect(result.state.board["Miami"]?.blue).toBe(1);
    expect(result.state.board["Washington"]?.blue).toBe(1);

    // Cube supply should decrease by 3 (outbreak spread) + 1 (Paris card)
    expect(result.state.cubeSupply.blue).toBe(17); // 21 - 3 (outbreak) - 1 (Paris) = 17
  });

  it("should handle chain reaction outbreaks", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const atlantaState = cleanBoard["Atlanta"];
    const chicagoState = cleanBoard["Chicago"];
    if (!atlantaState || !chicagoState) {
      throw new Error("Atlanta or Chicago not found");
    }

    // Set Atlanta and Chicago to both have 3 blue cubes
    const boardWithCubes = {
      ...cleanBoard,
      Atlanta: {
        ...atlantaState,
        blue: 3,
      },
      Chicago: {
        ...chicagoState,
        blue: 3,
      },
    };

    const testState: GameState = {
      ...state,
      board: boardWithCubes,
      infectionDeck: [
        { city: "Atlanta", color: Disease.Blue },
        { city: "Paris", color: Disease.Blue },
      ],
      infectionDiscard: [],
      infectionRatePosition: 1, // Rate = 2
      outbreakCount: 0,
      // Ensure no Quarantine Specialist interferes
      players: state.players.map((player) => ({
        ...player,
        role: Role.Medic,
      })),
      cubeSupply: {
        blue: 18, // 6 cubes already on board
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = executeInfectionPhase(testState);

    // Both Atlanta and Chicago should have 3 cubes (not 4)
    expect(result.state.board["Atlanta"]?.blue).toBe(3);
    expect(result.state.board["Chicago"]?.blue).toBe(3);

    // Should have 2 outbreaks (Atlanta + Chicago chain reaction)
    expect(result.state.outbreakCount).toBe(2);

    // Miami and Washington get cubes from Atlanta outbreak
    expect(result.state.board["Miami"]?.blue).toBeGreaterThan(0);
    expect(result.state.board["Washington"]?.blue).toBeGreaterThan(0);

    // Chicago's neighbors also get cubes (except Atlanta, which already outbroke)
    // Chicago connections: ["Atlanta", "Los Angeles", "Mexico City", "Montreal", "San Francisco"]
    expect(result.state.board["Los Angeles"]?.blue).toBe(1);
    expect(result.state.board["Mexico City"]?.blue).toBe(1);
    expect(result.state.board["Montreal"]?.blue).toBe(1);
    expect(result.state.board["San Francisco"]?.blue).toBe(1);
  });

  it("should not outbreak same city twice in one chain", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const atlantaState = cleanBoard["Atlanta"];
    const chicagoState = cleanBoard["Chicago"];
    const miamiState = cleanBoard["Miami"];
    if (!atlantaState || !chicagoState || !miamiState) {
      throw new Error("Cities not found");
    }

    // Create a scenario where city might be triggered multiple times
    // Set Atlanta, Chicago, and Miami to all have 3 blue cubes
    const boardWithCubes = {
      ...cleanBoard,
      Atlanta: { ...atlantaState, blue: 3 },
      Chicago: { ...chicagoState, blue: 3 },
      Miami: { ...miamiState, blue: 3 },
    };

    const infectionDeck = [
      { city: "Atlanta", color: Disease.Blue },
      { city: "Paris", color: Disease.Blue },
    ];

    const testState: GameState = {
      ...state,
      board: boardWithCubes,
      infectionDeck,
      infectionRatePosition: 1, // Rate = 2
      outbreakCount: 0,
      // Ensure no Quarantine Specialist interferes
      players: state.players.map((player) => ({
        ...player,
        role: Role.Medic,
      })),
      cubeSupply: {
        blue: 15,
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = executeInfectionPhase(testState);

    // All three cities should still have exactly 3 cubes
    expect(result.state.board["Atlanta"]?.blue).toBe(3);
    expect(result.state.board["Chicago"]?.blue).toBe(3);
    expect(result.state.board["Miami"]?.blue).toBe(3);

    // Should have exactly 3 outbreaks (no duplicates)
    expect(result.state.outbreakCount).toBe(3);
  });

  it("should lose game when outbreak count reaches 8", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const atlantaState = cleanBoard["Atlanta"];
    if (!atlantaState) throw new Error("Atlanta not found");

    // Set Atlanta to have 3 blue cubes
    const boardWithCubes = {
      ...cleanBoard,
      Atlanta: { ...atlantaState, blue: 3 },
    };

    const infectionDeck = [
      { city: "Atlanta", color: Disease.Blue },
      { city: "Paris", color: Disease.Blue },
    ];

    const testState: GameState = {
      ...state,
      board: boardWithCubes,
      infectionDeck,
      infectionRatePosition: 1, // Rate = 2
      outbreakCount: 7, // One more outbreak will lose the game
      // Ensure no Quarantine Specialist interferes
      players: state.players.map((player) => ({
        ...player,
        role: Role.Medic,
      })),
      cubeSupply: {
        blue: 21,
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = executeInfectionPhase(testState);

    // Outbreak counter should be 8
    expect(result.state.outbreakCount).toBe(8);

    // Game should be lost
    expect(result.state.status).toBe(GameStatus.Lost);
  });

  it("should lose game when cube supply exhausted during outbreak cascade", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const atlantaState = cleanBoard["Atlanta"];
    if (!atlantaState) throw new Error("Atlanta not found");

    // Set Atlanta to have 3 blue cubes
    const boardWithCubes = {
      ...cleanBoard,
      Atlanta: { ...atlantaState, blue: 3 },
    };

    const infectionDeck = [
      { city: "Atlanta", color: Disease.Blue },
      { city: "Paris", color: Disease.Blue },
    ];

    const testState: GameState = {
      ...state,
      board: boardWithCubes,
      infectionDeck,
      infectionRatePosition: 1, // Rate = 2
      outbreakCount: 0,
      // Ensure no Quarantine Specialist interferes
      players: state.players.map((player) => ({
        ...player,
        role: Role.Medic,
      })),
      cubeSupply: {
        blue: 2, // Only 2 cubes left, but outbreak needs 3 (Chicago, Miami, Washington)
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = executeInfectionPhase(testState);

    // Game should be lost due to cube exhaustion
    expect(result.state.status).toBe(GameStatus.Lost);
  });

  it("should skip outbreak entirely when disease is eradicated", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const atlantaState = cleanBoard["Atlanta"];
    if (!atlantaState) throw new Error("Atlanta not found");

    // Set Atlanta to have 3 blue cubes
    const boardWithCubes = {
      ...cleanBoard,
      Atlanta: { ...atlantaState, blue: 3 },
    };

    const infectionDeck = [
      { city: "Atlanta", color: Disease.Blue },
      { city: "Paris", color: Disease.Blue },
    ];

    const testState: GameState = {
      ...state,
      board: boardWithCubes,
      infectionDeck,
      infectionRatePosition: 1, // Rate = 2
      outbreakCount: 0,
      cubeSupply: {
        blue: 21,
        yellow: 24,
        black: 24,
        red: 24,
      },
      cures: {
        ...state.cures,
        [Disease.Blue]: CureStatus.Eradicated,
      },
    };

    const result = executeInfectionPhase(testState);

    // NO outbreak should be triggered because eradicated diseases don't place cubes
    expect(result.state.outbreakCount).toBe(0);

    // Atlanta should still have exactly 3 cubes (no 4th cube placed)
    expect(result.state.board["Atlanta"]?.blue).toBe(3);

    // No cubes should be placed on any cities (eradicated)
    expect(result.state.board["Chicago"]?.blue).toBe(0);
    expect(result.state.board["Miami"]?.blue).toBe(0);
    expect(result.state.board["Washington"]?.blue).toBe(0);
    expect(result.state.board["Paris"]?.blue).toBe(0);

    // Cube supply should not change
    expect(result.state.cubeSupply.blue).toBe(21);
  });
});

describe("Epidemic resolution", () => {
  it("should increase infection rate by 1", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck: [{ city: "Atlanta", color: Disease.Blue }],
      infectionDiscard: [],
      infectionRatePosition: 2, // Position 2
      cubeSupply: {
        blue: 24,
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = resolveEpidemic(testState);

    // Infection rate should increase from 2 to 3
    expect(result.state.infectionRatePosition).toBe(3);
  });

  it("should not increase infection rate beyond 7", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck: [{ city: "Atlanta", color: Disease.Blue }],
      infectionDiscard: [],
      infectionRatePosition: 7, // Already at max
      cubeSupply: {
        blue: 24,
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = resolveEpidemic(testState);

    // Infection rate should stay at 7
    expect(result.state.infectionRatePosition).toBe(7);
  });

  it("should draw bottom card from infection deck and place 3 cubes", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck: [
        { city: "Paris", color: Disease.Blue },
        { city: "Atlanta", color: Disease.Blue }, // Bottom card
      ],
      infectionDiscard: [],
      infectionRatePosition: 1,
      // Ensure no Quarantine Specialist interferes
      players: state.players.map((player) => ({
        ...player,
        role: Role.Medic,
      })),
      cubeSupply: {
        blue: 24,
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = resolveEpidemic(testState);

    // Should infect Atlanta (bottom card)
    expect(result.infectedCity).toBe("Atlanta");
    expect(result.infectedColor).toBe(Disease.Blue);

    // Should place 3 blue cubes in Atlanta
    expect(result.state.board["Atlanta"]?.blue).toBe(3);

    // Should decrease cube supply by 3
    expect(result.state.cubeSupply.blue).toBe(21);

    // Infection deck should have Atlanta on top (from shuffled discard) + Paris
    // After epidemic: bottom card (Atlanta) is drawn, discarded, then discard pile (containing Atlanta)
    // is shuffled and placed on top of remaining deck (Paris)
    expect(result.state.infectionDeck).toHaveLength(2);
    expect(result.state.infectionDeck[0]?.city).toBe("Atlanta"); // Atlanta shuffled on top
    expect(result.state.infectionDeck[1]?.city).toBe("Paris"); // Paris remains
  });

  it("should shuffle infection discard pile and place on top of draw deck (intensify)", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck: [
        { city: "Paris", color: Disease.Blue },
        { city: "Milan", color: Disease.Blue },
        { city: "Atlanta", color: Disease.Blue }, // Bottom card
      ],
      infectionDiscard: [
        { city: "London", color: Disease.Blue },
        { city: "Madrid", color: Disease.Blue },
        { city: "Essen", color: Disease.Blue },
      ],
      infectionRatePosition: 1,
      cubeSupply: {
        blue: 24,
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = resolveEpidemic(testState);

    // Infection discard should be empty after intensify
    expect(result.state.infectionDiscard).toHaveLength(0);

    // Infection deck should have: 3 shuffled discard cards + Atlanta + Paris + Milan = 6 cards
    // (Atlanta was bottom card, gets added to discard, then discard shuffled on top)
    expect(result.state.infectionDeck.length).toBe(6);

    // The last 2 cards in the deck should be Paris and Milan (original deck, minus bottom card)
    const deckLength = result.state.infectionDeck.length;
    expect(result.state.infectionDeck[deckLength - 2]?.city).toBe("Paris");
    expect(result.state.infectionDeck[deckLength - 1]?.city).toBe("Milan");

    // The first 4 cards should be the shuffled discard pile (London, Madrid, Essen, Atlanta)
    const topFourCities = result.state.infectionDeck
      .slice(0, 4)
      .map((card) => card.city)
      .sort();
    expect(topFourCities).toEqual(["Atlanta", "Essen", "London", "Madrid"]);
  });

  it("should trigger outbreak if epidemic city has 3 cubes", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const atlantaState = cleanBoard["Atlanta"];
    if (!atlantaState) throw new Error("Atlanta not found");

    // Set Atlanta to have 2 blue cubes already
    const boardWithCubes = {
      ...cleanBoard,
      Atlanta: { ...atlantaState, blue: 2 },
    };

    const testState: GameState = {
      ...state,
      board: boardWithCubes,
      infectionDeck: [{ city: "Atlanta", color: Disease.Blue }],
      infectionDiscard: [],
      infectionRatePosition: 1,
      outbreakCount: 0,
      cubeSupply: {
        blue: 22,
        yellow: 24,
        black: 24,
        red: 24,
      },
      // Ensure no Quarantine Specialist interferes - use Medic and Scientist roles in safe locations
      players: [
        { role: Role.Medic, location: "Tokyo", hand: [], contingencyCard: null },
        { role: Role.Scientist, location: "Sydney", hand: [], contingencyCard: null },
      ],
    };

    const result = resolveEpidemic(testState);

    // Atlanta should have 3 cubes (2 + 1 placed before outbreak)
    expect(result.state.board["Atlanta"]?.blue).toBe(3);

    // Should have 1 outbreak
    expect(result.state.outbreakCount).toBe(1);

    // Adjacent cities should each get 1 blue cube
    expect(result.state.board["Chicago"]?.blue).toBe(1);
    expect(result.state.board["Miami"]?.blue).toBe(1);
    expect(result.state.board["Washington"]?.blue).toBe(1);
  });

  it("should skip cube placement for eradicated diseases during epidemic", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck: [{ city: "Atlanta", color: Disease.Blue }],
      infectionDiscard: [],
      infectionRatePosition: 1,
      cubeSupply: {
        blue: 24,
        yellow: 24,
        black: 24,
        red: 24,
      },
      cures: {
        ...state.cures,
        [Disease.Blue]: CureStatus.Eradicated,
      },
    };

    const result = resolveEpidemic(testState);

    // Should still increase infection rate
    expect(result.state.infectionRatePosition).toBe(2);

    // Should NOT place any cubes (eradicated)
    expect(result.state.board["Atlanta"]?.blue).toBe(0);

    // Cube supply should not change
    expect(result.state.cubeSupply.blue).toBe(24);

    // Should still intensify (shuffle discard on top)
    expect(result.state.infectionDiscard).toHaveLength(0);
  });

  it("should throw error if infection deck is empty", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });

    const testState: GameState = {
      ...state,
      infectionDeck: [], // Empty deck
      infectionRatePosition: 1,
    };

    expect(() => resolveEpidemic(testState)).toThrow(
      "Cannot resolve epidemic: infection deck is empty",
    );
  });

  it("should lose game if cube supply exhausted during epidemic", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck: [{ city: "Atlanta", color: Disease.Blue }],
      infectionDiscard: [],
      infectionRatePosition: 1,
      // Ensure no Quarantine Specialist interferes
      players: state.players.map((player) => ({
        ...player,
        role: Role.Medic,
      })),
      cubeSupply: {
        blue: 2, // Only 2 cubes left, but epidemic needs 3
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = resolveEpidemic(testState);

    // Game should be lost due to cube exhaustion
    expect(result.state.status).toBe(GameStatus.Lost);
  });
});

describe("Role: Quarantine Specialist", () => {
  it("should prevent cube placement in Quarantine Specialist's current city during infection phase", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const player0 = state.players[0];
    if (!player0) throw new Error("Player 0 not found");

    // Set up infection deck to infect Atlanta (where QS is located)
    const infectionDeck = [
      { city: "Atlanta", color: Disease.Blue },
      { city: "Paris", color: Disease.Blue },
    ];

    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck,
      infectionDiscard: [],
      infectionRatePosition: 1, // Rate = 2 cards
      players: [
        { ...player0, role: Role.QuarantineSpecialist, location: "Atlanta" },
        state.players[1] || state.players[0],
      ],
      cubeSupply: {
        blue: 24,
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = executeInfectionPhase(testState);

    // Should draw 2 cards
    expect(result.cardsDrawn).toHaveLength(2);

    // Atlanta should have NO cubes (quarantined)
    expect(result.state.board["Atlanta"]?.blue).toBe(0);

    // Paris should have 1 cube (not quarantined)
    expect(result.state.board["Paris"]?.blue).toBe(1);

    // Only 1 cube should be removed from supply (Paris)
    expect(result.state.cubeSupply.blue).toBe(23);
  });

  it("should prevent cube placement in cities adjacent to Quarantine Specialist during infection phase", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const player0 = state.players[0];
    if (!player0) throw new Error("Player 0 not found");

    // Atlanta is connected to: Chicago, Miami, Washington
    // Set up infection deck to infect Chicago (adjacent to Atlanta)
    const infectionDeck = [
      { city: "Chicago", color: Disease.Blue },
      { city: "Paris", color: Disease.Blue }, // Not adjacent to Atlanta
    ];

    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck,
      infectionDiscard: [],
      infectionRatePosition: 1, // Rate = 2 cards
      players: [
        { ...player0, role: Role.QuarantineSpecialist, location: "Atlanta" },
        state.players[1] || state.players[0],
      ],
      cubeSupply: {
        blue: 24,
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = executeInfectionPhase(testState);

    // Should draw 2 cards
    expect(result.cardsDrawn).toHaveLength(2);

    // Chicago should have NO cubes (quarantined - adjacent to Atlanta)
    expect(result.state.board["Chicago"]?.blue).toBe(0);

    // Paris should have 1 cube (not adjacent to Atlanta)
    expect(result.state.board["Paris"]?.blue).toBe(1);

    // Only 1 cube should be removed from supply (Paris)
    expect(result.state.cubeSupply.blue).toBe(23);
  });

  it("should prevent cube placement during epidemic in quarantined city", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const player0 = state.players[0];
    if (!player0) throw new Error("Player 0 not found");

    // Set up infection deck with Atlanta at the bottom (epidemic draws from bottom)
    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck: [{ city: "Atlanta", color: Disease.Blue }],
      infectionDiscard: [],
      infectionRatePosition: 1,
      players: [
        { ...player0, role: Role.QuarantineSpecialist, location: "Atlanta" },
        state.players[1] || state.players[0],
      ],
      cubeSupply: {
        blue: 24,
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = resolveEpidemic(testState);

    // Infection rate should increase
    expect(result.state.infectionRatePosition).toBe(2);

    // Atlanta should have NO cubes (quarantined)
    expect(result.state.board["Atlanta"]?.blue).toBe(0);

    // No cubes should be removed from supply
    expect(result.state.cubeSupply.blue).toBe(24);

    // Should still intensify (shuffle discard on top)
    expect(result.state.infectionDiscard).toHaveLength(0);
  });

  it("should prevent outbreaks from spreading to quarantined cities", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const player0 = state.players[0];
    if (!player0) throw new Error("Player 0 not found");

    // Set up: San Francisco has 3 blue cubes, QS is in Atlanta
    // Atlanta connections: ["Chicago", "Miami", "Washington"]
    // San Francisco connections: ["Chicago", "Los Angeles", "Manila", "Tokyo"]
    // When San Francisco outbreaks, it should NOT spread to Chicago (quarantined - adjacent to Atlanta)
    const sfState = cleanBoard["San Francisco"];
    const atlantaState = cleanBoard["Atlanta"];
    if (!sfState || !atlantaState) throw new Error("City not found");

    const testState: GameState = {
      ...state,
      board: {
        ...cleanBoard,
        "San Francisco": { ...sfState, blue: 3 },
        Atlanta: { ...atlantaState, blue: 0 },
      },
      infectionDeck: [
        { city: "San Francisco", color: Disease.Blue },
        { city: "Baghdad", color: Disease.Black }, // Different color, won't affect test
      ],
      infectionDiscard: [],
      infectionRatePosition: 1, // Rate = 2 cards
      players: [
        { ...player0, role: Role.QuarantineSpecialist, location: "Atlanta" },
        {
          ...(state.players[1] || state.players[0]),
          role: Role.Medic, // Ensure player 1 is not also a QS
          location: "Miami", // Keep them away from SF
        },
      ],
      cubeSupply: {
        blue: 21, // 3 already in SF
        yellow: 24,
        black: 24,
        red: 24,
      },
      outbreakCount: 0,
    };

    const result = executeInfectionPhase(testState);

    // San Francisco should still have 3 cubes (outbreak doesn't place 4th cube)
    expect(result.state.board["San Francisco"]?.blue).toBe(3);

    // Atlanta should have NO cubes (quarantined - QS is here)
    expect(result.state.board["Atlanta"]?.blue).toBe(0);

    // Chicago should have NO cubes (quarantined - adjacent to Atlanta where QS is)
    expect(result.state.board["Chicago"]?.blue).toBe(0);

    // Los Angeles, Manila, and Tokyo should get 1 blue cube each (not quarantined)
    expect(result.state.board["Los Angeles"]?.blue).toBe(1);
    expect(result.state.board["Manila"]?.blue).toBe(1);
    expect(result.state.board["Tokyo"]?.blue).toBe(1);

    // Outbreak counter should increment
    expect(result.state.outbreakCount).toBe(1);

    // 3 cubes placed (LA, Manila, Tokyo), Chicago was quarantined
    expect(result.state.cubeSupply.blue).toBe(18); // 21 - 3 = 18
  });

  it("should not prevent cube placement in non-adjacent cities", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const player0 = state.players[0];
    if (!player0) throw new Error("Player 0 not found");

    // QS is in Atlanta, but Tokyo is far away (not adjacent)
    const infectionDeck = [
      { city: "Tokyo", color: Disease.Red },
      { city: "Seoul", color: Disease.Red },
    ];

    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck,
      infectionDiscard: [],
      infectionRatePosition: 1, // Rate = 2 cards
      players: [
        { ...player0, role: Role.QuarantineSpecialist, location: "Atlanta" },
        state.players[1] || state.players[0],
      ],
      cubeSupply: {
        blue: 24,
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = executeInfectionPhase(testState);

    // Both Tokyo and Seoul should be infected (not quarantined)
    expect(result.state.board["Tokyo"]?.red).toBe(1);
    expect(result.state.board["Seoul"]?.red).toBe(1);

    // 2 cubes should be removed from supply
    expect(result.state.cubeSupply.red).toBe(22);
  });

  it("should work with multiple Quarantine Specialists in different locations", () => {
    const state = createGame({ playerCount: 4, difficulty: 4 });
    const cleanBoard = initializeBoard();

    // Set up 2 QS in different locations: one in Atlanta, one in London
    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck: [
        { city: "Chicago", color: Disease.Blue }, // Adjacent to Atlanta
        { city: "Paris", color: Disease.Blue }, // Adjacent to London
        { city: "Tokyo", color: Disease.Red }, // Not adjacent to either
      ],
      infectionDiscard: [],
      infectionRatePosition: 2, // Rate = 2 cards
      players: [
        {
          role: Role.QuarantineSpecialist,
          location: "Atlanta",
          hand: [],
        },
        {
          role: Role.QuarantineSpecialist,
          location: "London",
          hand: [],
        },
        state.players[2] || state.players[0],
        state.players[3] || state.players[0],
      ],
      cubeSupply: {
        blue: 24,
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = executeInfectionPhase(testState);

    // Chicago should have NO cubes (quarantined by Atlanta QS)
    expect(result.state.board["Chicago"]?.blue).toBe(0);

    // Paris should have NO cubes (quarantined by London QS)
    expect(result.state.board["Paris"]?.blue).toBe(0);

    // Tokyo should have 1 cube (not quarantined) - wait, infection rate is 2, so only 2 cards drawn
    // Let me check: infectionRatePosition 2 should give rate 2 (positions 1-3 all give rate 2)
    // But we have 3 cards in the deck, so only first 2 are drawn
    expect(result.cardsDrawn).toHaveLength(2);

    // No cubes should be removed from supply (both were quarantined)
    expect(result.state.cubeSupply.blue).toBe(24);
  });

  it("should skip infection phase when skipNextInfectionPhase is true", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const cleanBoard = initializeBoard();

    const testState: GameState = {
      ...state,
      board: cleanBoard,
      infectionDeck: [
        { city: "Atlanta", color: Disease.Blue },
        { city: "Chicago", color: Disease.Blue },
      ],
      infectionDiscard: [],
      infectionRatePosition: 1, // Rate = 2 cards
      skipNextInfectionPhase: true, // One Quiet Night effect
      cubeSupply: {
        blue: 24,
        yellow: 24,
        black: 24,
        red: 24,
      },
    };

    const result = executeInfectionPhase(testState);

    // No cards should be drawn
    expect(result.cardsDrawn).toHaveLength(0);

    // Flag should be cleared after skipping
    expect(result.state.skipNextInfectionPhase).toBe(false);

    // Board should be unchanged (no cubes placed)
    expect(result.state.board["Atlanta"]?.blue).toBe(0);
    expect(result.state.board["Chicago"]?.blue).toBe(0);

    // Infection deck should be unchanged (no cards drawn)
    expect(result.state.infectionDeck).toHaveLength(2);
    expect(result.state.infectionDiscard).toHaveLength(0);

    // Cube supply should be unchanged
    expect(result.state.cubeSupply.blue).toBe(24);
  });
});
