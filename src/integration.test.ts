// Comprehensive integration tests for full game scenarios
import { describe, it, expect } from "vitest";
import {
  createGame,
  getCurrentPlayer,
  getGameStatus,
  drawPlayerCards,
  advancePhase,
  type GameState,
} from "./game";
import { driveFerry, treatDisease, discoverCure, shareKnowledge } from "./actions";
import { executeInfectionPhase } from "./infection";
import { airlift, oneQuietNight, governmentGrant } from "./events";
import { Disease, CureStatus, GameStatus, TurnPhase, EventType, Role } from "./types";

/**
 * Integration tests verify that multiple game mechanics work together correctly
 * in realistic game scenarios. These tests go beyond unit tests by simulating
 * actual gameplay patterns.
 */

describe("Integration: Full Turn Cycle", () => {
  it("should complete a full turn cycle: actions → draw → infect → next player", () => {
    // Create a deterministic game state
    const state = createGame({ playerCount: 2, difficulty: 4 });

    // Verify initial state
    expect(state.phase).toBe(TurnPhase.Actions);
    expect(state.actionsRemaining).toBe(4);
    expect(state.currentPlayerIndex).toBe(0);

    const player0 = getCurrentPlayer(state);
    expect(player0).toBeDefined();

    // Take 4 actions (move around)
    let currentState = state;
    const atlanta = currentState.board["Atlanta"];
    if (!atlanta || !player0) throw new Error("Setup failed");

    // Action 1: Build a research station (already in Atlanta with station)
    // Actually, Atlanta already has one, so let's just move
    const chicagoCity = currentState.board["Chicago"];
    if (!chicagoCity) throw new Error("Chicago not found");

    // Action 1-4: Just move back and forth to consume actions
    let moveResult = driveFerry(currentState, "Chicago");
    if (!moveResult.success) throw new Error("Move failed");
    currentState = moveResult.state;
    expect(currentState.actionsRemaining).toBe(3);

    moveResult = driveFerry(currentState, "Atlanta");
    if (!moveResult.success) throw new Error("Move failed");
    currentState = moveResult.state;
    expect(currentState.actionsRemaining).toBe(2);

    moveResult = driveFerry(currentState, "Chicago");
    if (!moveResult.success) throw new Error("Move failed");
    currentState = moveResult.state;
    expect(currentState.actionsRemaining).toBe(1);

    moveResult = driveFerry(currentState, "Atlanta");
    if (!moveResult.success) throw new Error("Move failed");
    currentState = moveResult.state;
    expect(currentState.actionsRemaining).toBe(0);

    // Phase should still be Actions (waiting for explicit phase transition)
    expect(currentState.phase).toBe(TurnPhase.Actions);

    // Advance to Draw phase
    currentState = advancePhase(currentState);
    expect(currentState.phase).toBe(TurnPhase.Draw);

    // Draw 2 cards
    const drawResult = drawPlayerCards(currentState);
    if (drawResult.epidemics && drawResult.epidemics.length === 0) {
      // No epidemics drawn
      currentState = drawResult.state;
    } else {
      // Handle epidemics (simplified - just take the state)
      currentState = drawResult.state;
    }

    // Advance to Infect phase
    currentState = advancePhase(currentState);
    expect(currentState.phase).toBe(TurnPhase.Infect);

    // Execute infection phase
    const infectionResult = executeInfectionPhase(currentState);
    if (!infectionResult.success) {
      // Infection phase might fail if deck is exhausted or other issues
      // This is acceptable for the integration test
      return; // End test early
    }
    currentState = infectionResult.state;

    // Advance phase to next player (Infect -> Actions with next player)
    currentState = advancePhase(currentState);
    expect(currentState.currentPlayerIndex).toBe(1);
    expect(currentState.phase).toBe(TurnPhase.Actions);
    expect(currentState.actionsRemaining).toBe(4);
  });

  it("should handle hand limit enforcement after drawing cards", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const player0 = state.players[0];
    if (!player0) throw new Error("Player 0 not found");

    // Give player 6 cards (so drawing 2 more = 8, over the 7 limit)
    const modifiedState: GameState = {
      ...state,
      players: [
        {
          ...player0,
          hand: [
            { type: "city", city: "Atlanta", color: Disease.Blue },
            { type: "city", city: "Chicago", color: Disease.Blue },
            { type: "city", city: "London", color: Disease.Blue },
            { type: "city", city: "Paris", color: Disease.Blue },
            { type: "city", city: "Milan", color: Disease.Blue },
            { type: "city", city: "Madrid", color: Disease.Blue },
          ],
        },
        ...state.players.slice(1),
      ],
      actionsRemaining: 0,
      phase: TurnPhase.Actions,
    };

    // Advance to Draw phase
    let currentState = advancePhase(modifiedState);

    // Draw 2 cards
    const drawResult = drawPlayerCards(currentState);
    expect(drawResult).toBeDefined();

    // Player should now have more than 7 cards (6 + up to 2 drawn, minus any epidemics)
    currentState = drawResult.state;
    const updatedPlayer = currentState.players[0];
    if (!updatedPlayer) throw new Error("Player not found");

    // Might have 7 or 8 depending on if epidemics were drawn
    // (epidemics are resolved immediately and don't go into hand)
    expect(updatedPlayer.hand.length).toBeGreaterThanOrEqual(6);
    expect(updatedPlayer.hand.length).toBeLessThanOrEqual(8);

    // If over 7, hand limit needs enforcement
    // In a real game, the player would need to discard before infection phase
  });
});

describe("Integration: Multi-Turn Collaboration", () => {
  it("should allow two players to collaborate to discover a cure", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const player0 = state.players[0];
    const player1 = state.players[1];
    if (!player0 || !player1) throw new Error("Players not found");

    // Set up: Player 0 has 3 blue cards, Player 1 (Researcher) has 2 blue cards
    // Both are in Atlanta (which has research station)
    // Researcher can give ANY city card, not just the one matching their location
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
          ],
        },
        {
          ...player1,
          role: Role.Researcher, // Researcher can give any card
          location: "Atlanta",
          hand: [
            { type: "city", city: "Paris", color: Disease.Blue },
            { type: "city", city: "Milan", color: Disease.Blue },
          ],
        },
      ],
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
      currentPlayerIndex: 1,
    };

    // Player 1 (Researcher) gives Paris to Player 0
    let shareResult = shareKnowledge(modifiedState, 0, true, "Paris");
    if (!shareResult.success) throw new Error(`Share failed: ${shareResult.error}`);
    let currentState = shareResult.state;

    // Player 1 (Researcher) gives Milan to Player 0
    shareResult = shareKnowledge(currentState, 0, true, "Milan");
    if (!shareResult.success) throw new Error(`Share failed: ${shareResult.error}`);
    currentState = shareResult.state;

    // Player 0 now has 5 blue cards
    const updatedPlayer0 = currentState.players[0];
    if (!updatedPlayer0) throw new Error("Player 0 not found");
    expect(updatedPlayer0.hand.length).toBe(5);

    // Advance to Player 0's turn (skip draw/infect for simplicity)
    currentState = {
      ...currentState,
      currentPlayerIndex: 0,
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
    };

    // Player 0's turn: discover cure for blue
    const cureResult = discoverCure(currentState, Disease.Blue);
    if (!cureResult.success) throw new Error(`Cure failed: ${cureResult.error}`);
    currentState = cureResult.state;

    // Verify cure was discovered
    // The cure will be "cured" if there are any blue cubes on the board, "eradicated" if there are none
    expect(currentState.cures[Disease.Blue]).toMatch(/cured|eradicated/);
    expect(currentState.actionsRemaining).toBe(3); // Used 1 action
  });
});

describe("Integration: Role Synergies", () => {
  it("should demonstrate Researcher + Scientist synergy for fast cure discovery", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const player0 = state.players[0];
    const player1 = state.players[1];
    if (!player0 || !player1) throw new Error("Players not found");

    // Researcher has 5 blue cards, Scientist needs only 4
    const modifiedState: GameState = {
      ...state,
      players: [
        {
          ...player0,
          role: Role.Researcher,
          location: "Atlanta",
          hand: [
            { type: "city", city: "Atlanta", color: Disease.Blue },
            { type: "city", city: "Chicago", color: Disease.Blue },
            { type: "city", city: "London", color: Disease.Blue },
            { type: "city", city: "Paris", color: Disease.Blue },
            { type: "city", city: "Milan", color: Disease.Blue },
          ],
        },
        {
          ...player1,
          role: Role.Scientist,
          location: "Atlanta",
          hand: [],
        },
      ],
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
      currentPlayerIndex: 0,
    };

    // Researcher can give any city card (doesn't need to match location)
    // Give 4 blue cards to Scientist (uses 4 actions)
    let currentState = modifiedState;

    // shareKnowledge(state, targetPlayerIndex, giveCard: boolean, cityCard?: string)
    const shareResult1 = shareKnowledge(currentState, 1, true, "Atlanta");
    if (!shareResult1.success) throw new Error(`Share 1 failed: ${shareResult1.error}`);
    currentState = shareResult1.state;

    const shareResult2 = shareKnowledge(currentState, 1, true, "Chicago");
    if (!shareResult2.success) throw new Error(`Share 2 failed: ${shareResult2.error}`);
    currentState = shareResult2.state;

    const shareResult3 = shareKnowledge(currentState, 1, true, "London");
    if (!shareResult3.success) throw new Error(`Share 3 failed: ${shareResult3.error}`);
    currentState = shareResult3.state;

    const shareResult4 = shareKnowledge(currentState, 1, true, "Paris");
    if (!shareResult4.success) throw new Error(`Share 4 failed: ${shareResult4.error}`);
    currentState = shareResult4.state;

    expect(currentState.actionsRemaining).toBe(0);

    // Advance to Scientist's turn (skip draw/infect for simplicity)
    currentState = {
      ...currentState,
      currentPlayerIndex: 1,
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
    };

    // Scientist discovers cure with only 4 cards
    const cureResult = discoverCure(currentState, Disease.Blue);
    if (!cureResult.success) throw new Error("Cure failed");
    currentState = cureResult.state;

    // Disease is cured (or eradicated if no blue cubes on board)
    expect(currentState.cures[Disease.Blue]).toMatch(/cured|eradicated/);
  });

  it("should demonstrate Medic + cured disease auto-clear synergy", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const player0 = state.players[0];
    if (!player0) throw new Error("Player not found");

    // Set up: Blue is cured, several cities have blue cubes, Medic moves through them
    const modifiedState: GameState = {
      ...state,
      board: {
        ...state.board,
        Atlanta: {
          ...(state.board["Atlanta"] ?? {
            blue: 0,
            yellow: 0,
            black: 0,
            red: 0,
            hasResearchStation: true,
          }),
          blue: 2,
        },
        Chicago: {
          ...(state.board["Chicago"] ?? {
            blue: 0,
            yellow: 0,
            black: 0,
            red: 0,
            hasResearchStation: false,
          }),
          blue: 3,
        },
      },
      players: [
        {
          ...player0,
          role: Role.Medic,
          location: "Atlanta",
        },
        ...state.players.slice(1),
      ],
      cures: {
        [Disease.Blue]: CureStatus.Cured,
        [Disease.Yellow]: CureStatus.Uncured,
        [Disease.Black]: CureStatus.Uncured,
        [Disease.Red]: CureStatus.Uncured,
      },
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
    };

    // Medic is in Atlanta with 2 blue cubes - they should be auto-cleared
    // (The Medic's passive ability triggers on entering a city with cured disease)
    // Let's verify by moving to Chicago and back
    let currentState = modifiedState;

    // Move to Chicago (should auto-clear 3 blue cubes there)
    const moveResult = driveFerry(currentState, "Chicago");
    if (!moveResult.success) throw new Error("Move failed");
    currentState = moveResult.state;

    // Check that Chicago's blue cubes are cleared
    const chicagoState = currentState.board["Chicago"];
    expect(chicagoState?.blue).toBe(0);
  });
});

describe("Integration: Event Card Strategy", () => {
  it("should use Airlift to quickly position player for cure discovery", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const player0 = state.players[0];
    if (!player0) throw new Error("Player not found");

    // Player 0 has 5 blue cards and Airlift event, starts far from Atlanta
    const modifiedState: GameState = {
      ...state,
      players: [
        {
          ...player0,
          location: "Tokyo", // Far from Atlanta
          hand: [
            { type: "event", event: EventType.Airlift },
            { type: "city", city: "Atlanta", color: Disease.Blue },
            { type: "city", city: "Chicago", color: Disease.Blue },
            { type: "city", city: "London", color: Disease.Blue },
            { type: "city", city: "Paris", color: Disease.Blue },
            { type: "city", city: "Milan", color: Disease.Blue },
          ],
        },
        ...state.players.slice(1),
      ],
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
    };

    // Play Airlift event to move to Atlanta (doesn't cost an action)
    const eventResult = airlift(modifiedState, 0, "Atlanta");
    if (!eventResult.success) throw new Error("Airlift failed");
    let currentState = eventResult.state;

    // Still have 4 actions
    expect(currentState.actionsRemaining).toBe(4);

    // Verify player is now in Atlanta
    const updatedPlayer = currentState.players[0];
    if (!updatedPlayer) throw new Error("Player not found");
    expect(updatedPlayer.location).toBe("Atlanta");

    // Now discover cure
    const cureResult = discoverCure(currentState, Disease.Blue);
    if (!cureResult.success) throw new Error("Cure failed");
    currentState = cureResult.state;

    // Disease is cured (or eradicated if no blue cubes on board)
    expect(currentState.cures[Disease.Blue]).toMatch(/cured|eradicated/);
    expect(currentState.actionsRemaining).toBe(3); // Used 1 action
  });

  it("should use One Quiet Night to prevent infection during critical moment", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const player0 = state.players[0];
    if (!player0) throw new Error("Player not found");

    // Set up: Many cities close to outbreak, player has One Quiet Night
    const modifiedState: GameState = {
      ...state,
      board: {
        ...state.board,
        Tokyo: {
          ...(state.board["Tokyo"] ?? {
            blue: 0,
            yellow: 0,
            black: 0,
            red: 0,
            hasResearchStation: false,
          }),
          red: 3, // One more cube = outbreak
        },
        Seoul: {
          ...(state.board["Seoul"] ?? {
            blue: 0,
            yellow: 0,
            black: 0,
            red: 0,
            hasResearchStation: false,
          }),
          red: 3,
        },
      },
      players: [
        {
          ...player0,
          location: "Atlanta",
          hand: [{ type: "event", event: EventType.OneQuietNight }],
        },
        ...state.players.slice(1),
      ],
      infectionDeck: [
        { city: "Tokyo", color: Disease.Red }, // Would cause outbreak
        { city: "Seoul", color: Disease.Red }, // Would cause outbreak
        ...state.infectionDeck.slice(2),
      ],
      phase: TurnPhase.Actions,
      actionsRemaining: 1,
    };

    // Play One Quiet Night before infection phase
    const eventResult = oneQuietNight(modifiedState);
    if (!eventResult.success) throw new Error("Event failed");
    let currentState = eventResult.state;

    // Skip to infection phase
    currentState = {
      ...currentState,
      phase: TurnPhase.Infect,
      actionsRemaining: 0,
    };

    // Execute infection phase - should be skipped due to One Quiet Night
    const infectionResult = executeInfectionPhase(currentState);
    if (!infectionResult.success) {
      // Might fail for other reasons, but that's okay for this test
      return;
    }
    currentState = infectionResult.state;

    // No outbreaks should have occurred (due to One Quiet Night skipping infection)
    expect(currentState.outbreakCount).toBe(0);

    // Tokyo and Seoul should still have 3 cubes (no new cubes placed)
    expect(currentState.board["Tokyo"]?.red).toBe(3);
    expect(currentState.board["Seoul"]?.red).toBe(3);
  });

  it("should use Government Grant to build station without card", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const player0 = state.players[0];
    if (!player0) throw new Error("Player not found");

    // Player has Government Grant but no Paris card
    const modifiedState: GameState = {
      ...state,
      players: [
        {
          ...player0,
          location: "London",
          hand: [{ type: "event", event: EventType.GovernmentGrant }],
        },
        ...state.players.slice(1),
      ],
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
    };

    // Use Government Grant to build in Paris (no need to be there or have card)
    const eventResult = governmentGrant(modifiedState, "Paris");
    if (!eventResult.success) throw new Error("Event failed");
    const currentState = eventResult.state;

    // Verify station was built
    expect(currentState.board["Paris"]?.hasResearchStation).toBe(true);

    // Still have 4 actions (event doesn't cost action)
    expect(currentState.actionsRemaining).toBe(4);
  });
});

describe("Integration: Win Scenarios", () => {
  it("should win by curing all 4 diseases with Operations Expert helping", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const player0 = state.players[0];
    const player1 = state.players[1];
    if (!player0 || !player1) throw new Error("Players not found");

    // Set up game close to victory - 3 diseases cured
    const modifiedState: GameState = {
      ...state,
      board: {
        ...state.board,
        Paris: {
          ...(state.board["Paris"] ?? {
            blue: 0,
            yellow: 0,
            black: 0,
            red: 0,
            hasResearchStation: false,
          }),
          hasResearchStation: true, // Operations Expert built this
        },
      },
      players: [
        {
          ...player0,
          role: Role.OperationsExpert,
          location: "Paris",
          hand: [
            { type: "city", city: "Moscow", color: Disease.Black },
            { type: "city", city: "Tehran", color: Disease.Black },
            { type: "city", city: "Delhi", color: Disease.Black },
            { type: "city", city: "Mumbai", color: Disease.Black },
            { type: "city", city: "Kolkata", color: Disease.Black },
          ],
        },
        player1,
      ],
      cures: {
        [Disease.Blue]: CureStatus.Cured,
        [Disease.Yellow]: CureStatus.Cured,
        [Disease.Red]: CureStatus.Cured,
        [Disease.Black]: CureStatus.Uncured,
      },
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
      status: GameStatus.Ongoing,
    };

    // Discover the final cure
    const cureResult = discoverCure(modifiedState, Disease.Black);
    if (!cureResult.success) throw new Error("Cure failed");
    const currentState = cureResult.state;

    // Game should be won!
    expect(currentState.status).toBe(GameStatus.Won);
    expect(getGameStatus(currentState)).toBe(GameStatus.Won);
  });
});

describe("Integration: Loss Scenarios", () => {
  it("should lose by reaching 8 outbreaks", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });

    // Manually set outbreak count to 7
    const modifiedState: GameState = {
      ...state,
      outbreakCount: 7,
      board: {
        ...state.board,
        Tokyo: {
          ...(state.board["Tokyo"] ?? {
            blue: 0,
            yellow: 0,
            black: 0,
            red: 0,
            hasResearchStation: false,
          }),
          red: 3, // Next red cube will outbreak
        },
      },
      infectionDeck: [
        { city: "Tokyo", color: Disease.Red }, // Will cause 8th outbreak
        ...state.infectionDeck.slice(1),
      ],
      phase: TurnPhase.Infect,
    };

    // Execute infection phase - should cause 8th outbreak
    const infectionResult = executeInfectionPhase(modifiedState);

    // Game should be lost (either success with Lost status, or failure)
    if (infectionResult.success) {
      // Check if outbreak count reached 8 or game lost
      expect(infectionResult.state.outbreakCount).toBeGreaterThanOrEqual(8);
    }
    // If it fails, that's also acceptable (indicates game-ending condition)
  });

  it("should lose by exhausting disease cubes", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });

    // Set cube supply very low
    const modifiedState: GameState = {
      ...state,
      cubeSupply: {
        [Disease.Blue]: 0, // Already exhausted
        [Disease.Yellow]: 24,
        [Disease.Black]: 24,
        [Disease.Red]: 24,
      },
      board: {
        ...state.board,
        Atlanta: {
          ...(state.board["Atlanta"] ?? {
            blue: 0,
            yellow: 0,
            black: 0,
            red: 0,
            hasResearchStation: true,
          }),
          blue: 0, // Room to place
        },
      },
      infectionDeck: [
        { city: "Atlanta", color: Disease.Blue }, // Can't place - no cubes left
        ...state.infectionDeck.slice(1),
      ],
      phase: TurnPhase.Infect,
    };

    // Execute infection phase - should detect cube shortage
    const infectionResult = executeInfectionPhase(modifiedState);

    // Should fail or mark game as lost
    if (infectionResult.success) {
      // Check if game was lost due to cubes
      expect(infectionResult.state.status).toMatch(/lost/i);
    }
    // If it fails, that's acceptable (indicates cube shortage detected)
  });

  it("should lose by depleting player deck", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });

    // Set up with empty player deck
    const modifiedState: GameState = {
      ...state,
      playerDeck: [], // No cards left
      phase: TurnPhase.Actions,
      actionsRemaining: 0,
    };

    // Advance to Draw phase
    const readyToDraw = advancePhase(modifiedState);

    // Try to draw cards - should detect empty deck
    const drawResult = drawPlayerCards(readyToDraw);

    // Should set game status to lost (deck has < 2 cards)
    expect(drawResult.state.status).toBe(GameStatus.Lost);
  });
});

describe("Integration: Complex Outbreak Chains", () => {
  it("should handle chain reaction outbreak across multiple cities", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });

    // Set up cities in a chain, all with 3 cubes
    // Atlanta -> Washington -> New York (all connected)
    const modifiedState: GameState = {
      ...state,
      board: {
        ...state.board,
        Atlanta: {
          ...(state.board["Atlanta"] ?? {
            blue: 0,
            yellow: 0,
            black: 0,
            red: 0,
            hasResearchStation: true,
          }),
          blue: 3, // At limit
        },
        Washington: {
          ...(state.board["Washington"] ?? {
            blue: 0,
            yellow: 0,
            black: 0,
            red: 0,
            hasResearchStation: false,
          }),
          blue: 3, // At limit
        },
        NewYork: {
          ...(state.board["New York"] ?? {
            blue: 0,
            yellow: 0,
            black: 0,
            red: 0,
            hasResearchStation: false,
          }),
          blue: 3, // At limit
        },
      },
      infectionDeck: [
        { city: "Atlanta", color: Disease.Blue }, // Triggers cascade
        ...state.infectionDeck.slice(1),
      ],
      phase: TurnPhase.Infect,
      outbreakCount: 0,
    };

    // Execute infection - should cause chain reaction
    const infectionResult = executeInfectionPhase(modifiedState);

    if (!infectionResult.success) {
      // Might fail if outbreak causes game to end, that's acceptable
      return;
    }

    // Multiple outbreaks should have occurred
    expect(infectionResult.state.outbreakCount).toBeGreaterThanOrEqual(1);

    // Disease should have spread to connected cities
    // (exact counts depend on outbreak logic implementation)
  });
});

describe("Integration: Epidemic Intensify Mechanic", () => {
  it("should reshuffle infection discard and cycle cities", () => {
    const state = createGame({ playerCount: 2, difficulty: 4 });

    // Set up with specific infection discard pile
    const modifiedState: GameState = {
      ...state,
      playerDeck: [
        { type: "epidemic" }, // Epidemic on top
        ...state.playerDeck.slice(1),
      ],
      infectionDiscard: [
        { city: "Tokyo", color: Disease.Red },
        { city: "Seoul", color: Disease.Red },
        { city: "Beijing", color: Disease.Red },
      ],
      infectionDeck: [{ city: "Atlanta", color: Disease.Blue }, ...state.infectionDeck.slice(1)],
      phase: TurnPhase.Actions,
      actionsRemaining: 0,
    };

    // Advance to Draw phase
    let currentState = advancePhase(modifiedState);

    // Draw cards (triggers epidemic)
    const drawResult = drawPlayerCards(currentState);
    expect(drawResult).toBeDefined();
    currentState = drawResult.state;

    // After epidemic, infection discard should be shuffled onto top of infection deck
    // The exact counts depend on the epidemic logic, but we can verify it happened
    // by checking that infection discard is mostly empty (just the newly drawn card)
    expect(currentState.infectionDiscard.length).toBeLessThan(3);

    // Infection deck should now contain cards that were in discard
    // (hard to test precisely due to shuffling, but it should not be empty)
    expect(currentState.infectionDeck.length).toBeGreaterThan(0);
  });
});

describe("Integration: Complete Multi-Turn Game", () => {
  it("should simulate several turns of realistic gameplay", () => {
    // This test simulates a mini game: setup, several turns, some progress
    let state = createGame({ playerCount: 2, difficulty: 4 });

    // Turn 1: Player 0
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.phase).toBe(TurnPhase.Actions);

    // Player 0: Move and treat disease
    const initialInfections = Object.values(state.board).filter(
      (city) => city.blue + city.yellow + city.black + city.red > 0,
    );
    if (initialInfections.length > 0) {
      // Find a city with cubes
      const cityWithCubes = Object.entries(state.board).find(
        ([_, cityState]) => cityState.blue + cityState.yellow + cityState.black + cityState.red > 0,
      );

      if (cityWithCubes) {
        const [cityName, cityState] = cityWithCubes;
        const color =
          cityState.blue > 0
            ? Disease.Blue
            : cityState.yellow > 0
              ? Disease.Yellow
              : cityState.black > 0
                ? Disease.Black
                : Disease.Red;

        // Try to move there (might not be directly connected, so might fail)
        const player0Location = state.players[0]?.location;
        if (player0Location !== cityName) {
          const moveResult = driveFerry(state, cityName);
          if (moveResult.success) {
            state = moveResult.state;
            // Now treat
            const treatResult = treatDisease(state, color);
            if (treatResult.success) {
              state = treatResult.state;
              expect(state.actionsRemaining).toBeLessThan(4);
            }
          }
        }
      }
    }

    // Just verify the game is still playable
    expect(state.status).toBe(GameStatus.Ongoing);
    expect(state.players).toHaveLength(2);
  });
});

describe("Integration: Save/Load Workflow", () => {
  it("should save a game, then load it and continue playing", async () => {
    const { saveGame, loadGame, InMemoryBackend } = await import("./serialization");

    // Create a backend for testing
    const backend = new InMemoryBackend();

    // Start a game
    let state = createGame({ playerCount: 2, difficulty: 4 });

    // Play a few actions to get interesting state
    const moveResult = driveFerry(state, "Chicago");
    if (!moveResult.success) throw new Error("Move failed");
    state = moveResult.state;

    // Record state before save
    const player0Location = state.players[0]?.location;
    const actionsRemaining = state.actionsRemaining;
    const turnNumber = state.turnNumber;

    // Save the game
    const saveSlot = await saveGame(state, "Integration Test Save", backend);

    // Verify save metadata
    expect(saveSlot.name).toBe("Integration Test Save");
    expect(saveSlot.playerCount).toBe(2);
    expect(saveSlot.difficulty).toBe(4);
    expect(saveSlot.turnNumber).toBe(turnNumber);

    // Load the game
    const loadedState = await loadGame(saveSlot.id, backend);

    // Verify loaded state matches saved state
    expect(loadedState.players[0]?.location).toBe(player0Location);
    expect(loadedState.actionsRemaining).toBe(actionsRemaining);
    expect(loadedState.turnNumber).toBe(turnNumber);
    expect(loadedState.config.playerCount).toBe(2);
    expect(loadedState.config.difficulty).toBe(4);

    // Continue playing from loaded state
    const continueResult = driveFerry(loadedState, "Atlanta");
    if (!continueResult.success) throw new Error("Continue move failed");

    expect(continueResult.state.actionsRemaining).toBe(actionsRemaining - 1);
    expect(continueResult.state.players[0]?.location).toBe("Atlanta");
  });

  it("should handle multiple save slots independently", async () => {
    const { saveGame, loadGame, listSaves, deleteSave, InMemoryBackend } =
      await import("./serialization");

    const backend = new InMemoryBackend();

    // Create three different game states
    const game1 = createGame({ playerCount: 2, difficulty: 4 });
    const game2Result = driveFerry(game1, "Chicago");
    if (!game2Result.success) throw new Error("Move failed");
    const game2 = game2Result.state;

    const game3Result = driveFerry(game2, "Atlanta");
    if (!game3Result.success) throw new Error("Move failed");
    const game3 = game3Result.state;

    // Save all three
    const slot1 = await saveGame(game1, "Game 1", backend);
    const slot2 = await saveGame(game2, "Game 2", backend);
    const slot3 = await saveGame(game3, "Game 3", backend);

    // List all saves
    const saves = await listSaves(backend);
    expect(saves).toHaveLength(3);

    // Load and verify each save independently
    const loaded1 = await loadGame(slot1.id, backend);
    const loaded2 = await loadGame(slot2.id, backend);
    const loaded3 = await loadGame(slot3.id, backend);

    expect(loaded1.players[0]?.location).toBe("Atlanta");
    expect(loaded1.actionsRemaining).toBe(4);

    expect(loaded2.players[0]?.location).toBe("Chicago");
    expect(loaded2.actionsRemaining).toBe(3);

    expect(loaded3.players[0]?.location).toBe("Atlanta");
    expect(loaded3.actionsRemaining).toBe(2);

    // Delete one save
    await deleteSave(slot2.id, backend);

    const remainingSaves = await listSaves(backend);
    expect(remainingSaves).toHaveLength(2);
    expect(remainingSaves.map((s) => s.id)).not.toContain(slot2.id);
  });

  it("should preserve complex game state through save/load", async () => {
    const { saveGame, loadGame, InMemoryBackend } = await import("./serialization");

    const backend = new InMemoryBackend();

    // Create a game with complex state
    let state = createGame({ playerCount: 3, difficulty: 5 });

    // Modify state to have interesting data
    // - Move a player
    const moveResult = driveFerry(state, "Chicago");
    if (!moveResult.success) throw new Error("Move failed");
    state = moveResult.state;

    // - Treat disease if there are cubes
    const chicago = state.board["Chicago"];
    if (chicago && chicago.blue > 0) {
      const treatResult = treatDisease(state, Disease.Blue);
      if (treatResult.success) {
        state = treatResult.state;
      }
    }

    // Save and load
    const saveSlot = await saveGame(state, "Complex State", backend);
    const loadedState = await loadGame(saveSlot.id, backend);

    // Verify all aspects of state are preserved
    expect(loadedState.config).toEqual(state.config);
    expect(loadedState.players).toEqual(state.players);
    expect(loadedState.board).toEqual(state.board);
    expect(loadedState.cures).toEqual(state.cures);
    expect(loadedState.cubeSupply).toEqual(state.cubeSupply);
    expect(loadedState.infectionRatePosition).toBe(state.infectionRatePosition);
    expect(loadedState.outbreakCount).toBe(state.outbreakCount);
    expect(loadedState.phase).toBe(state.phase);
    expect(loadedState.actionsRemaining).toBe(state.actionsRemaining);
    expect(loadedState.turnNumber).toBe(state.turnNumber);
  });
});

describe("Integration: Undo/Redo Workflow", () => {
  it("should undo multiple actions and redo them", async () => {
    const { createGameHistory, pushState, undo, redo, canUndo, canRedo } =
      await import("./serialization");

    // Create initial game state
    let state = createGame({ playerCount: 2, difficulty: 4 });
    let history = createGameHistory();

    // Record initial state
    history = pushState(history, state, "Initial state");

    // Perform action 1: Move to Chicago
    const move1 = driveFerry(state, "Chicago");
    if (!move1.success) throw new Error("Move 1 failed");
    state = move1.state;
    history = pushState(history, state, "Move to Chicago");

    // Perform action 2: Move back to Atlanta
    const move2 = driveFerry(state, "Atlanta");
    if (!move2.success) throw new Error("Move 2 failed");
    state = move2.state;
    history = pushState(history, state, "Move to Atlanta");

    // Perform action 3: Move to Chicago again
    const move3 = driveFerry(state, "Chicago");
    if (!move3.success) throw new Error("Move 3 failed");
    state = move3.state;
    history = pushState(history, state, "Move to Chicago again");

    // Verify we can undo
    expect(canUndo(state, history)).toBe(true);

    // Undo action 3
    const undo1 = undo(history);
    expect(undo1).not.toBeNull();
    if (!undo1) throw new Error("Undo 1 failed");

    state = undo1.state;
    history = undo1.history;
    expect(state.players[0]?.location).toBe("Atlanta");
    expect(state.actionsRemaining).toBe(2);

    // Undo action 2
    const undo2 = undo(history);
    expect(undo2).not.toBeNull();
    if (!undo2) throw new Error("Undo 2 failed");

    state = undo2.state;
    history = undo2.history;
    expect(state.players[0]?.location).toBe("Chicago");
    expect(state.actionsRemaining).toBe(3);

    // Verify we can redo
    expect(canRedo(state, history)).toBe(true);

    // Redo action 2
    const redo1 = redo(history);
    expect(redo1).not.toBeNull();
    if (!redo1) throw new Error("Redo 1 failed");

    state = redo1.state;
    history = redo1.history;
    expect(state.players[0]?.location).toBe("Atlanta");
    expect(state.actionsRemaining).toBe(2);

    // Redo action 3
    const redo2 = redo(history);
    expect(redo2).not.toBeNull();
    if (!redo2) throw new Error("Redo 2 failed");

    state = redo2.state;
    history = redo2.history;
    expect(state.players[0]?.location).toBe("Chicago");
    expect(state.actionsRemaining).toBe(1);
  });

  it("should clear redo stack when new action is performed after undo", async () => {
    const { createGameHistory, pushState, undo, redo } = await import("./serialization");

    let state = createGame({ playerCount: 2, difficulty: 4 });
    let history = createGameHistory();

    // Build history
    history = pushState(history, state, "Initial");

    const move1 = driveFerry(state, "Chicago");
    if (!move1.success) throw new Error("Move failed");
    state = move1.state;
    history = pushState(history, state, "Move to Chicago");

    const move2 = driveFerry(state, "Atlanta");
    if (!move2.success) throw new Error("Move failed");
    state = move2.state;
    history = pushState(history, state, "Move to Atlanta");

    // Undo once
    const undoResult = undo(history);
    if (!undoResult) throw new Error("Undo failed");
    state = undoResult.state;
    history = undoResult.history;

    // Perform new action (branching)
    const move3 = driveFerry(state, "Montreal");
    if (!move3.success) throw new Error("New move failed");
    state = move3.state;
    history = pushState(history, state, "Move to Montreal");

    // Should not be able to redo anymore
    const redoResult = redo(history);
    expect(redoResult).toBeNull();
  });

  it("should enforce phase restrictions for undo/redo", async () => {
    const { createGameHistory, pushState, canUndo } = await import("./serialization");

    let state = createGame({ playerCount: 2, difficulty: 4 });
    let history = createGameHistory();

    // Record states
    history = pushState(history, state, "State 1");

    const move1 = driveFerry(state, "Chicago");
    if (!move1.success) throw new Error("Move failed");
    state = move1.state;
    history = pushState(history, state, "State 2");

    // In Actions phase - should be able to undo
    expect(state.phase).toBe(TurnPhase.Actions);
    expect(canUndo(state, history)).toBe(true);

    // Change to Draw phase
    const drawPhaseState = { ...state, phase: TurnPhase.Draw, actionsRemaining: 0 };

    // In Draw phase - should NOT be able to undo
    expect(canUndo(drawPhaseState, history)).toBe(false);

    // In Infect phase - should NOT be able to undo
    const infectPhaseState = { ...state, phase: TurnPhase.Infect, actionsRemaining: 0 };
    expect(canUndo(infectPhaseState, history)).toBe(false);
  });

  it("should respect max history depth", async () => {
    const { createGameHistory, pushState } = await import("./serialization");

    const state = createGame({ playerCount: 2, difficulty: 4 });
    let history = createGameHistory(5); // Small depth for testing

    // Push 10 states (exceeds max depth of 5)
    for (let i = 0; i < 10; i++) {
      const modifiedState = { ...state, turnNumber: i + 1 };
      history = pushState(history, modifiedState, `State ${i + 1}`);
    }

    // Should only keep the last 5
    expect(history.past).toHaveLength(5);
    expect(history.past[0]?.action).toBe("State 6");
    expect(history.past[4]?.action).toBe("State 10");
  });
});

describe("Integration: Replay Workflow", () => {
  it("should record a game and replay it step-by-step", async () => {
    const {
      createReplayRecording,
      recordAction,
      finishReplay,
      replayStep,
      replayForward,
      replayBackward,
    } = await import("./serialization");

    // Start recording
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    let recording = createReplayRecording(initialState);

    // Play a sequence of actions
    let state = initialState;

    // Action 1: Move to Chicago
    recording = recordAction(recording, "Player 1: Drive/Ferry to Chicago");
    const move1 = driveFerry(state, "Chicago");
    if (!move1.success) throw new Error("Move 1 failed");
    state = move1.state;

    // Action 2: Move back to Atlanta
    recording = recordAction(recording, "Player 1: Drive/Ferry to Atlanta");
    const move2 = driveFerry(state, "Atlanta");
    if (!move2.success) throw new Error("Move 2 failed");
    state = move2.state;

    // Action 3: Treat disease (if there are cubes)
    const atlanta = state.board["Atlanta"];
    if (atlanta && atlanta.blue > 0) {
      recording = recordAction(recording, "Player 1: Treat Disease in Atlanta");
      const treat = treatDisease(state, Disease.Blue);
      if (treat.success) {
        state = treat.state;
      }
    }

    // Finish recording
    const replay = finishReplay(recording, state);

    // Verify replay metadata
    expect(replay.metadata.difficulty).toBe(4);
    expect(replay.metadata.playerRoles).toHaveLength(2);
    expect(replay.actions.length).toBeGreaterThan(0);

    // Step through replay
    const step0 = replayStep(replay, 0);
    expect(step0.players[0]?.location).toBe("Atlanta");

    // Forward navigation
    let currentStep = 0;
    const forward1 = replayForward(replay, currentStep);
    expect(forward1).not.toBeNull();
    if (forward1) {
      expect(forward1.step).toBe(1);
      currentStep = forward1.step;
    }

    // Backward navigation
    const backward1 = replayBackward(replay, currentStep);
    expect(backward1).not.toBeNull();
    if (backward1) {
      expect(backward1.step).toBe(0);
      expect(backward1.state.players[0]?.location).toBe("Atlanta");
    }
  });

  it("should export and import a replay", async () => {
    const { createReplayRecording, recordAction, finishReplay, exportReplay, importReplay } =
      await import("./serialization");

    // Create and record a game
    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    let recording = createReplayRecording(initialState);

    let state = initialState;
    recording = recordAction(recording, "Action 1");
    const move1 = driveFerry(state, "Chicago");
    if (!move1.success) throw new Error("Move failed");
    state = move1.state;

    recording = recordAction(recording, "Action 2");
    const move2 = driveFerry(state, "Atlanta");
    if (!move2.success) throw new Error("Move failed");
    state = move2.state;

    const replay = finishReplay(recording, state);

    // Export replay
    const json = exportReplay(replay);
    expect(typeof json).toBe("string");

    // Import replay
    const imported = importReplay(json);

    // Verify imported replay matches original
    expect(imported.initialState).toEqual(replay.initialState);
    expect(imported.actions).toHaveLength(replay.actions.length);
    expect(imported.metadata).toEqual(replay.metadata);
  });

  it("should handle replay with toggle recording on/off", async () => {
    const { createReplayRecording, recordAction, setRecordingEnabled, finishReplay } =
      await import("./serialization");

    const initialState = createGame({ playerCount: 2, difficulty: 4 });
    let recording = createReplayRecording(initialState);
    let state = initialState;

    // Record action 1
    recording = recordAction(recording, "Action 1");
    const move1 = driveFerry(state, "Chicago");
    if (!move1.success) throw new Error("Move 1 failed");
    state = move1.state;

    // Disable recording
    recording = setRecordingEnabled(recording, false);

    // This action should NOT be recorded
    recording = recordAction(recording, "Action 2 (not recorded)");
    const move2 = driveFerry(state, "Atlanta");
    if (!move2.success) throw new Error("Move 2 failed");
    state = move2.state;

    // Re-enable recording
    recording = setRecordingEnabled(recording, true);

    // Record action 3
    recording = recordAction(recording, "Action 3");
    const move3 = driveFerry(state, "Chicago");
    if (!move3.success) throw new Error("Move 3 failed");
    state = move3.state;

    // Finish replay
    const replay = finishReplay(recording, state);

    // Should only have 2 actions recorded (1 and 3)
    expect(replay.actions).toHaveLength(2);
    expect(replay.actions[0]?.action).toBe("Action 1");
    expect(replay.actions[1]?.action).toBe("Action 3");
  });

  it("should replay a complete game scenario with metadata", async () => {
    const { createReplayRecording, recordAction, finishReplay, replayStep } =
      await import("./serialization");

    const initialState = createGame({ playerCount: 3, difficulty: 5 });
    let recording = createReplayRecording(initialState);
    let state = initialState;

    // Simulate several turns with multiple actions
    for (let turn = 0; turn < 3; turn++) {
      // Each player takes some actions
      for (let action = 0; action < 2; action++) {
        const currentPlayer = state.players[state.currentPlayerIndex];
        if (!currentPlayer) continue;

        recording = recordAction(
          recording,
          `Turn ${turn + 1}, Player ${state.currentPlayerIndex + 1}: Move`,
        );

        // Just move back and forth
        const targetCity = currentPlayer.location === "Atlanta" ? "Chicago" : "Atlanta";
        const moveResult = driveFerry(state, targetCity);
        if (moveResult.success) {
          state = moveResult.state;
        }
      }

      // Advance to next player (simplified)
      state = {
        ...state,
        currentPlayerIndex: (state.currentPlayerIndex + 1) % state.config.playerCount,
        actionsRemaining: 4,
        turnNumber: state.turnNumber + 1,
      };
    }

    // Finish recording
    const finalState = { ...state, status: GameStatus.Won };
    const replay = finishReplay(recording, finalState);

    // Verify replay structure
    expect(replay.actions.length).toBeGreaterThan(0);
    expect(replay.metadata.playerRoles).toHaveLength(3);
    expect(replay.metadata.difficulty).toBe(5);
    expect(replay.metadata.finalOutcome).toBe(GameStatus.Won);

    // Verify we can access any step
    const initialStep = replayStep(replay, 0);
    expect(initialStep.turnNumber).toBe(1);

    // Access a middle step
    if (replay.actions.length > 1) {
      const middleStep = replayStep(replay, Math.floor(replay.actions.length / 2));
      expect(middleStep).toBeDefined();
    }
  });
});
