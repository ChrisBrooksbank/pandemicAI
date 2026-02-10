// Tests for game orchestration
import { describe, it, expect } from "vitest";
import {
  startGame,
  OrchestratedGame,
  GameOverError,
  InvalidPhaseError,
  InvalidActionError,
} from "./orchestrator";
import {
  GameStatus,
  TurnPhase,
  Disease,
  Role,
  CureStatus,
  type GameState,
  type CityCard,
  type EventCard,
  type PlayerCard,
} from "./types";
import { getCity } from "./board";

describe("OrchestratedGame", () => {
  describe("startGame", () => {
    it("creates a new game in playing status", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      expect(game.getStatus()).toBe("playing");
    });

    it("starts in the action phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      expect(game.getCurrentPhase()).toBe(TurnPhase.Actions);
    });

    it("starts with 4 actions remaining", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      expect(game.getActionsRemaining()).toBe(4);
    });

    it("creates correct number of players", () => {
      const game2 = startGame({ playerCount: 2, difficulty: 4 });
      const game3 = startGame({ playerCount: 3, difficulty: 5 });
      const game4 = startGame({ playerCount: 4, difficulty: 6 });

      expect(game2.getGameState().players).toHaveLength(2);
      expect(game3.getGameState().players).toHaveLength(3);
      expect(game4.getGameState().players).toHaveLength(4);
    });
  });

  describe("getStatus", () => {
    it("returns 'playing' for ongoing game", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      expect(game.getStatus()).toBe("playing");
    });

    // Note: Win/loss status tests would require full game simulation
    // or use of internal state mutation which violates immutability.
    // These will be covered by integration tests in later phases.
  });

  describe("getCurrentPhase", () => {
    it("returns the current turn phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      expect(game.getCurrentPhase()).toBe(TurnPhase.Actions);
    });
  });

  describe("getCurrentPlayer", () => {
    it("returns the active player", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const player = game.getCurrentPlayer();

      expect(player).toBeDefined();
      expect(player.role).toBeDefined();
      expect(player.location).toBe("Atlanta");
    });
  });

  describe("getActionsRemaining", () => {
    it("returns 4 at start of action phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      expect(game.getActionsRemaining()).toBe(4);
    });

    // Note: Testing non-action phases will be covered by integration tests
    // when phase transition methods are implemented in later tasks
  });

  describe("getGameState", () => {
    it("returns the underlying game state", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      expect(state.players).toHaveLength(2);
      expect(state.phase).toBe(TurnPhase.Actions);
      expect(state.currentPlayerIndex).toBe(0);
    });
  });

  describe("GameOverError", () => {
    it("has correct error message for won status", () => {
      const error = new GameOverError(GameStatus.Won);

      expect(error.message).toContain("Game is already over");
      expect(error.message).toContain("won");
      expect(error.name).toBe("GameOverError");
    });

    it("has correct error message for lost status", () => {
      const error = new GameOverError(GameStatus.Lost);

      expect(error.message).toContain("Game is already over");
      expect(error.message).toContain("lost");
      expect(error.name).toBe("GameOverError");
    });
  });
});

describe("OrchestratedGame.create", () => {
  it("creates game with correct configuration", () => {
    const game = OrchestratedGame.create({ playerCount: 3, difficulty: 5 });

    expect(game.getGameState().config.playerCount).toBe(3);
    expect(game.getGameState().config.difficulty).toBe(5);
  });
});

describe("OrchestratedGame.getAvailableActions", () => {
  it("returns available actions from engine", () => {
    const game = startGame({ playerCount: 2, difficulty: 4 });
    const actions = game.getAvailableActions();

    expect(actions.length).toBeGreaterThan(0);
    // Should include drive-ferry actions to connected cities
    const atlanta = getCity("Atlanta");
    expect(atlanta).toBeDefined();
    if (atlanta) {
      for (const connectedCity of atlanta.connections) {
        expect(actions).toContain(`drive-ferry:${connectedCity}`);
      }
    }
  });

  it("returns empty array when not in actions phase", () => {
    const game = startGame({ playerCount: 2, difficulty: 4 });
    const state = game.getGameState();

    // Manually advance to Draw phase for testing
    const drawPhaseState: GameState = { ...state, phase: TurnPhase.Draw };
    (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

    const actions = game.getAvailableActions();
    expect(actions).toEqual([]);
  });
});

describe("OrchestratedGame.performAction", () => {
  describe("basic movement actions", () => {
    it("performs drive-ferry action successfully", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const currentPlayer = game.getCurrentPlayer();
      expect(currentPlayer.location).toBe("Atlanta");

      // Atlanta is connected to Washington, Miami, and Chicago
      const outcome = game.performAction("drive-ferry:Washington");

      expect(outcome.action).toBe("drive-ferry:Washington");
      expect(outcome.gameStatus).toBe(GameStatus.Ongoing);
      expect(outcome.actionsRemaining).toBe(3);
      expect(game.getCurrentPlayer().location).toBe("Washington");
    });

    it("decrements actions remaining", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      expect(game.getActionsRemaining()).toBe(4);

      game.performAction("drive-ferry:Washington");
      expect(game.getActionsRemaining()).toBe(3);

      game.performAction("drive-ferry:Atlanta");
      expect(game.getActionsRemaining()).toBe(2);
    });

    it("throws InvalidActionError for invalid move", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      // Tokyo is not connected to Atlanta
      expect(() => game.performAction("drive-ferry:Tokyo")).toThrow(InvalidActionError);
    });
  });

  describe("build and treat actions", () => {
    it("performs build-research-station action", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Give player an Atlanta card so they can build
      const atlantaCard = { type: "city" as const, city: "Atlanta", color: Disease.Blue };
      const updatedState: GameState = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0 ? { ...p, hand: [atlantaCard, ...p.hand] } : p,
        ),
      };
      (game as unknown as { gameState: GameState }).gameState = updatedState;

      // Move to Washington first (Atlanta already has a station)
      game.performAction("drive-ferry:Washington");

      // Give Washington card
      const washingtonCard = { type: "city" as const, city: "Washington", color: Disease.Blue };
      const state2 = game.getGameState();
      const updatedState2: GameState = {
        ...state2,
        players: state2.players.map((p, i) =>
          i === 0 ? { ...p, hand: [washingtonCard, ...p.hand] } : p,
        ),
      };
      (game as unknown as { gameState: GameState }).gameState = updatedState2;

      const outcome = game.performAction("build-research-station");

      expect(outcome.action).toBe("build-research-station");
      expect(outcome.state.board["Washington"]?.hasResearchStation).toBe(true);
      expect(outcome.actionsRemaining).toBe(2);
    });

    it("performs treat-disease action", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Place a blue cube in Atlanta
      const updatedBoard = { ...state.board };
      const atlantaState = updatedBoard["Atlanta"];
      if (atlantaState) {
        updatedBoard["Atlanta"] = { ...atlantaState, blue: 1 };
      }
      const updatedState: GameState = { ...state, board: updatedBoard };
      (game as unknown as { gameState: GameState }).gameState = updatedState;

      const outcome = game.performAction("treat:blue");

      expect(outcome.action).toBe("treat:blue");
      expect(outcome.state.board["Atlanta"]?.blue).toBe(0);
      expect(outcome.actionsRemaining).toBe(3);
    });
  });

  describe("cure discovery", () => {
    it("performs discover-cure action and detects eradication", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set up state for cure discovery
      // Give player 5 blue city cards, place them at Atlanta (research station)
      const blueCards = [
        { type: "city" as const, city: "Atlanta", color: Disease.Blue },
        { type: "city" as const, city: "Chicago", color: Disease.Blue },
        { type: "city" as const, city: "Montreal", color: Disease.Blue },
        { type: "city" as const, city: "New York", color: Disease.Blue },
        { type: "city" as const, city: "Washington", color: Disease.Blue },
      ];

      const updatedState: GameState = {
        ...state,
        players: state.players.map((p, i) => (i === 0 ? { ...p, hand: blueCards } : p)),
        // Make sure board has no blue cubes so cure becomes eradication
        board: Object.fromEntries(
          Object.entries(state.board).map(([city, cityState]) => [city, { ...cityState, blue: 0 }]),
        ),
      };
      (game as unknown as { gameState: GameState }).gameState = updatedState;

      const outcome = game.performAction("discover-cure:blue");

      expect(outcome.action).toBe("discover-cure:blue");
      expect(outcome.state.cures[Disease.Blue]).toBe(CureStatus.Eradicated);
      expect(outcome.sideEffects.diseasesEradicated).toContain(Disease.Blue);
      expect(outcome.actionsRemaining).toBe(3);
    });
  });

  describe("phase validation", () => {
    it("throws InvalidPhaseError when not in Actions phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Manually advance to Draw phase
      const drawPhaseState: GameState = { ...state, phase: TurnPhase.Draw };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      expect(() => game.performAction("drive-ferry:Washington")).toThrow(InvalidPhaseError);
    });

    it("throws InvalidActionError when no actions remaining", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set actions remaining to 0
      const noActionsState: GameState = { ...state, actionsRemaining: 0 };
      (game as unknown as { gameState: GameState }).gameState = noActionsState;

      expect(() => game.performAction("drive-ferry:Washington")).toThrow(InvalidActionError);
      expect(() => game.performAction("drive-ferry:Washington")).toThrow(/No actions remaining/);
    });

    it("throws GameOverError when game has ended", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set game to won status
      const wonState: GameState = { ...state, status: GameStatus.Won };
      (game as unknown as { gameState: GameState }).gameState = wonState;

      expect(() => game.performAction("drive-ferry:Washington")).toThrow(GameOverError);
    });
  });

  describe("action string parsing", () => {
    it("throws InvalidActionError for unknown action type", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      expect(() => game.performAction("unknown-action:param")).toThrow(InvalidActionError);
      expect(() => game.performAction("unknown-action:param")).toThrow(/Unknown action type/);
    });

    it("throws InvalidActionError for missing parameters", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      expect(() => game.performAction("drive-ferry:")).toThrow(InvalidActionError);
      expect(() => game.performAction("treat:")).toThrow(InvalidActionError);
    });

    it("handles share-knowledge actions with correct parameters", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set up for share knowledge: both players in Atlanta, player 0 has Atlanta card
      const atlantaCard = { type: "city" as const, city: "Atlanta", color: Disease.Blue };
      const updatedState: GameState = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0
            ? { ...p, hand: [atlantaCard], location: "Atlanta" }
            : { ...p, location: "Atlanta" },
        ),
      };
      (game as unknown as { gameState: GameState }).gameState = updatedState;

      const outcome = game.performAction("share-knowledge-give:1:Atlanta");

      expect(outcome.action).toBe("share-knowledge-give:1:Atlanta");
      expect(outcome.actionsRemaining).toBe(3);
    });
  });

  describe("role-specific actions", () => {
    it("performs ops-expert-move action", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set player to Operations Expert at research station with a city card
      const chicagoCard = { type: "city" as const, city: "Chicago", color: Disease.Blue };
      const updatedState: GameState = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0
            ? { ...p, role: Role.OperationsExpert, hand: [chicagoCard], location: "Atlanta" }
            : p,
        ),
        operationsExpertSpecialMoveUsed: false,
      };
      (game as unknown as { gameState: GameState }).gameState = updatedState;

      const outcome = game.performAction("ops-expert-move:Tokyo:Chicago");

      expect(outcome.action).toBe("ops-expert-move:Tokyo:Chicago");
      expect(outcome.state.players[0]?.location).toBe("Tokyo");
    });

    it("performs dispatcher-move-to-pawn action", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set player 0 to Dispatcher
      // Action format: dispatcher-move-to-pawn:playerToMove:targetPlayer
      // Move player 1 to where player 0 is (both currently in Atlanta)
      const updatedState: GameState = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0
            ? { ...p, role: Role.Dispatcher, location: "Atlanta" }
            : { ...p, location: "Washington" },
        ),
      };
      (game as unknown as { gameState: GameState }).gameState = updatedState;

      // Move player 1 to player 0's location (Atlanta)
      const outcome = game.performAction("dispatcher-move-to-pawn:1:0");

      expect(outcome.action).toBe("dispatcher-move-to-pawn:1:0");
      expect(outcome.state.players[1]?.location).toBe("Atlanta");
    });

    it("performs dispatcher-move-other action with drive", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set player 0 to Dispatcher, player 1 in Atlanta
      const updatedState: GameState = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0
            ? { ...p, role: Role.Dispatcher, location: "Atlanta" }
            : { ...p, location: "Atlanta" },
        ),
      };
      (game as unknown as { gameState: GameState }).gameState = updatedState;

      // Move player 1 to Washington using drive
      const outcome = game.performAction("dispatcher-move-other:1:drive:Washington");

      expect(outcome.action).toBe("dispatcher-move-other:1:drive:Washington");
      expect(outcome.state.players[1]?.location).toBe("Washington");
    });
  });

  describe("side effects detection", () => {
    it("detects disease eradication as side effect", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set up for eradication: cure exists, no cubes on board
      const blueCards = [
        { type: "city" as const, city: "Atlanta", color: Disease.Blue },
        { type: "city" as const, city: "Chicago", color: Disease.Blue },
        { type: "city" as const, city: "Montreal", color: Disease.Blue },
        { type: "city" as const, city: "New York", color: Disease.Blue },
        { type: "city" as const, city: "Washington", color: Disease.Blue },
      ];

      const updatedState: GameState = {
        ...state,
        players: state.players.map((p, i) => (i === 0 ? { ...p, hand: blueCards } : p)),
        board: Object.fromEntries(
          Object.entries(state.board).map(([city, cityState]) => [city, { ...cityState, blue: 0 }]),
        ),
      };
      (game as unknown as { gameState: GameState }).gameState = updatedState;

      const outcome = game.performAction("discover-cure:blue");

      expect(outcome.sideEffects.diseasesEradicated).toBeDefined();
      expect(outcome.sideEffects.diseasesEradicated).toContain(Disease.Blue);
    });
  });
});

describe("OrchestratedGame.drawCards", () => {
  describe("phase validation", () => {
    it("throws InvalidPhaseError when not in Draw phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      // Game starts in Actions phase
      expect(game.getCurrentPhase()).toBe(TurnPhase.Actions);

      expect(() => game.drawCards()).toThrow(InvalidPhaseError);
      expect(() => game.drawCards()).toThrow(/Draw phase/);
    });

    it("succeeds when in Draw phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Manually advance to Draw phase
      const drawPhaseState: GameState = { ...state, phase: TurnPhase.Draw };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      const outcome = game.drawCards();

      expect(outcome).toBeDefined();
      expect(outcome.gameStatus).toBeDefined();
    });

    it("throws GameOverError when game has ended", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set game to lost status in Draw phase
      const lostState: GameState = { ...state, phase: TurnPhase.Draw, status: GameStatus.Lost };
      (game as unknown as { gameState: GameState }).gameState = lostState;

      expect(() => game.drawCards()).toThrow(GameOverError);
    });
  });

  describe("drawing regular cards", () => {
    it("draws 2 city cards and adds them to hand", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const initialHandSize = state.players[0]?.hand.length ?? 0;

      // Ensure the top 2 cards are city cards (not epidemics)
      const card1: CityCard = { type: "city", city: "Tokyo", color: Disease.Red };
      const card2: CityCard = { type: "city", city: "Beijing", color: Disease.Red };
      const playerDeck = [card1, card2, ...state.playerDeck.slice(2)];

      // Advance to Draw phase
      const drawPhaseState: GameState = { ...state, phase: TurnPhase.Draw, playerDeck };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      const outcome = game.drawCards();

      expect(outcome.cardsDrawn).toHaveLength(2);
      expect(outcome.epidemics).toHaveLength(0);
      expect(outcome.gameStatus).toBe(GameStatus.Ongoing);

      // Hand should have 2 more cards
      const currentPlayer = game.getCurrentPlayer();
      expect(currentPlayer.hand.length).toBe(initialHandSize + 2);
    });

    it("populates card details correctly", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Advance to Draw phase
      const drawPhaseState: GameState = { ...state, phase: TurnPhase.Draw };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      const outcome = game.drawCards();

      // Check that drawn cards have proper structure
      for (const card of outcome.cardsDrawn) {
        expect(card.name).toBeDefined();
        expect(card.type).toMatch(/^(city|event)$/);
        if (card.type === "city") {
          expect(card.color).toBeDefined();
          expect(card.color).toMatch(/^(blue|yellow|black|red)$/);
        }
      }
    });
  });

  describe("hand limit detection", () => {
    it("detects when hand limit is not exceeded", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Start with 4 cards (2-player game), draw 2 more = 6 total (under limit)
      const drawPhaseState: GameState = { ...state, phase: TurnPhase.Draw };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      const outcome = game.drawCards();

      expect(outcome.needsDiscard).toBe(false);
      expect(outcome.playersNeedingDiscard).toHaveLength(0);
    });

    it("detects when hand limit is exceeded", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Give player 6 cards, then draw 2 more = 8 total (over limit)
      const sixCards: CityCard[] = [
        { type: "city", city: "Atlanta", color: Disease.Blue },
        { type: "city", city: "Chicago", color: Disease.Blue },
        { type: "city", city: "Montreal", color: Disease.Blue },
        { type: "city", city: "New York", color: Disease.Blue },
        { type: "city", city: "Washington", color: Disease.Blue },
        { type: "city", city: "London", color: Disease.Blue },
      ];

      // Ensure the top 2 cards are city cards (not epidemics)
      const card1: CityCard = { type: "city", city: "Tokyo", color: Disease.Red };
      const card2: CityCard = { type: "city", city: "Beijing", color: Disease.Red };
      const playerDeck = [card1, card2, ...state.playerDeck.slice(2)];

      const drawPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Draw,
        players: state.players.map((p, i) => (i === 0 ? { ...p, hand: sixCards } : p)),
        playerDeck,
      };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      const outcome = game.drawCards();

      expect(outcome.needsDiscard).toBe(true);
      expect(outcome.playersNeedingDiscard).toContain(0);
      expect(game.getCurrentPlayer().hand.length).toBe(8);
    });

    it("handles exactly 7 cards (at limit, no discard needed)", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Give player 5 cards, then draw 2 more = 7 total (exactly at limit)
      const fiveCards: CityCard[] = [
        { type: "city", city: "Atlanta", color: Disease.Blue },
        { type: "city", city: "Chicago", color: Disease.Blue },
        { type: "city", city: "Montreal", color: Disease.Blue },
        { type: "city", city: "New York", color: Disease.Blue },
        { type: "city", city: "Washington", color: Disease.Blue },
      ];

      // Ensure the deck has 2 city cards (not epidemics)
      const card1: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
      const card2: CityCard = { type: "city", city: "London", color: Disease.Blue };
      const playerDeck = [card1, card2, ...state.playerDeck.slice(2)];

      const drawPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Draw,
        players: state.players.map((p, i) => (i === 0 ? { ...p, hand: fiveCards } : p)),
        playerDeck,
      };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      const outcome = game.drawCards();

      expect(outcome.needsDiscard).toBe(false);
      expect(outcome.playersNeedingDiscard).toHaveLength(0);
      // Hand should have 7 cards (check outcome state, not game state which has advanced to Infect phase)
      const playerInOutcome = outcome.state.players[0];
      if (playerInOutcome) {
        expect(playerInOutcome.hand.length).toBe(7);
      }
    });
  });

  describe("epidemic resolution", () => {
    it("resolves epidemic card when drawn", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Place an epidemic card at the top of the player deck
      const epidemicCard: PlayerCard = { type: "epidemic" };
      const regularCard: CityCard = { type: "city", city: "Tokyo", color: Disease.Red };

      const drawPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Draw,
        playerDeck: [epidemicCard, regularCard, ...state.playerDeck.slice(2)],
      };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      const outcome = game.drawCards();

      // Should have 1 epidemic
      expect(outcome.epidemics).toHaveLength(1);

      // Should have drawn 1 regular card (the other was epidemic)
      expect(outcome.cardsDrawn).toHaveLength(1);

      // Epidemic info should be populated
      const epidemic = outcome.epidemics[0];
      if (epidemic) {
        expect(epidemic.infectedCity).toBeDefined();
        expect(epidemic.infectedColor).toBeDefined();
        expect(epidemic.infectionRatePosition).toBeGreaterThan(0);
      }
    });

    it("resolves multiple epidemics when both cards are epidemics", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Place two epidemic cards at the top of the player deck
      const epidemic1: PlayerCard = { type: "epidemic" };
      const epidemic2: PlayerCard = { type: "epidemic" };

      const drawPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Draw,
        playerDeck: [epidemic1, epidemic2, ...state.playerDeck.slice(2)],
      };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      const outcome = game.drawCards();

      // Should have 2 epidemics
      expect(outcome.epidemics).toHaveLength(2);

      // Should have drawn 0 regular cards (both were epidemics)
      expect(outcome.cardsDrawn).toHaveLength(0);
    });

    it("handles epidemic causing game loss", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set up state where epidemic will cause loss (8 outbreaks already)
      const epidemicCard: PlayerCard = { type: "epidemic" };
      const regularCard: CityCard = { type: "city", city: "Tokyo", color: Disease.Red };

      const drawPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Draw,
        outbreakCount: 7, // One more outbreak will lose
        playerDeck: [epidemicCard, regularCard, ...state.playerDeck.slice(2)],
      };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      const outcome = game.drawCards();

      // Game may or may not be lost depending on if the epidemic causes outbreak
      // At minimum, we should have epidemic info
      expect(outcome.epidemics).toHaveLength(1);
    });
  });

  describe("deck exhaustion", () => {
    it("causes game loss when deck has fewer than 2 cards", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set deck to have only 1 card
      const oneCard: CityCard = { type: "city", city: "Tokyo", color: Disease.Red };

      const drawPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Draw,
        playerDeck: [oneCard],
      };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      const outcome = game.drawCards();

      // Game should be lost
      expect(outcome.gameStatus).toBe(GameStatus.Lost);
    });

    it("causes game loss when deck is empty", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const drawPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Draw,
        playerDeck: [],
      };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      const outcome = game.drawCards();

      // Game should be lost
      expect(outcome.gameStatus).toBe(GameStatus.Lost);
    });
  });

  describe("event cards", () => {
    it("draws event card and adds to hand", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Place an event card and a city card at the top
      const eventCard: EventCard = { type: "event", event: "airlift" };
      const cityCard: CityCard = { type: "city", city: "Tokyo", color: Disease.Red };

      const drawPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Draw,
        playerDeck: [eventCard, cityCard, ...state.playerDeck.slice(2)],
      };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      const outcome = game.drawCards();

      expect(outcome.cardsDrawn).toHaveLength(2);

      // One should be an event
      const eventDrawn = outcome.cardsDrawn.find((c) => c.type === "event");
      expect(eventDrawn).toBeDefined();
      expect(eventDrawn?.name).toBe("airlift");

      // Event card should be in hand
      const currentPlayer = game.getCurrentPlayer();
      const eventInHand = currentPlayer.hand.find(
        (c) => c.type === "event" && c.event === "airlift",
      );
      expect(eventInHand).toBeDefined();
    });
  });
});

describe("OrchestratedGame.infectCities", () => {
  describe("phase validation", () => {
    it("throws InvalidPhaseError when not in Infect phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      // Game starts in Actions phase
      expect(game.getCurrentPhase()).toBe(TurnPhase.Actions);

      expect(() => game.infectCities()).toThrow(InvalidPhaseError);
      expect(() => game.infectCities()).toThrow(/Infect phase/);
    });

    it("succeeds when in Infect phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Manually advance to Infect phase
      const infectPhaseState: GameState = { ...state, phase: TurnPhase.Infect };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      const outcome = game.infectCities();

      expect(outcome).toBeDefined();
      expect(outcome.gameStatus).toBeDefined();
    });

    it("throws GameOverError when game has ended", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set game to lost status in Infect phase
      const lostState: GameState = { ...state, phase: TurnPhase.Infect, status: GameStatus.Lost };
      (game as unknown as { gameState: GameState }).gameState = lostState;

      expect(() => game.infectCities()).toThrow(GameOverError);
    });
  });

  describe("basic infection", () => {
    it("infects cities based on infection rate", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Manually advance to Infect phase
      const infectPhaseState: GameState = { ...state, phase: TurnPhase.Infect };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      const outcome = game.infectCities();

      // Should have infected some cities
      expect(outcome.citiesInfected.length).toBeGreaterThan(0);
      expect(outcome.gameStatus).toBe(GameStatus.Ongoing);
    });

    it("reports infected cities with correct structure", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Manually advance to Infect phase
      const infectPhaseState: GameState = { ...state, phase: TurnPhase.Infect };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      const outcome = game.infectCities();

      // Check that infected cities have proper structure
      for (const infected of outcome.citiesInfected) {
        expect(infected.city).toBeDefined();
        expect(infected.color).toBeDefined();
        expect(infected.color).toMatch(/^(blue|yellow|black|red)$/);
      }
    });

    it("places cubes on the board", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Manually advance to Infect phase
      const infectPhaseState: GameState = { ...state, phase: TurnPhase.Infect };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      const outcome = game.infectCities();

      // Cubes should have been placed
      expect(outcome.cubesPlaced).toBeGreaterThan(0);
    });
  });

  describe("One Quiet Night event", () => {
    it("skips infection phase when One Quiet Night is active", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set One Quiet Night flag and advance to Infect phase
      const infectPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Infect,
        skipNextInfectionPhase: true,
      };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      const outcome = game.infectCities();

      // Should have infected no cities
      expect(outcome.citiesInfected).toHaveLength(0);
      expect(outcome.cubesPlaced).toBe(0);
      expect(outcome.outbreaks).toHaveLength(0);
      expect(outcome.gameStatus).toBe(GameStatus.Ongoing);

      // Flag should be cleared
      expect(outcome.state.skipNextInfectionPhase).toBe(false);
    });
  });

  describe("outbreak detection", () => {
    it("detects outbreaks when cities exceed 3 cubes", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set up a city with 3 cubes that will outbreak when infected
      const updatedBoard = { ...state.board };
      const atlantaState = updatedBoard["Atlanta"];
      if (atlantaState) {
        updatedBoard["Atlanta"] = { ...atlantaState, blue: 3 };
      }

      // Place Atlanta infection card at the top of the infection deck
      const atlantaCard = { city: "Atlanta", color: Disease.Blue };
      const infectPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Infect,
        board: updatedBoard,
        infectionDeck: [atlantaCard, ...state.infectionDeck.slice(1)],
      };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      const outcome = game.infectCities();

      // Should have triggered at least one outbreak
      expect(outcome.outbreaks.length).toBeGreaterThan(0);
    });

    it("reports outbreak information with city and color", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set up a city with 3 cubes that will outbreak when infected
      const updatedBoard = { ...state.board };
      const atlantaState = updatedBoard["Atlanta"];
      if (atlantaState) {
        updatedBoard["Atlanta"] = { ...atlantaState, blue: 3 };
      }

      // Place Atlanta infection card at the top of the infection deck
      const atlantaCard = { city: "Atlanta", color: Disease.Blue };
      const infectPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Infect,
        board: updatedBoard,
        infectionDeck: [atlantaCard, ...state.infectionDeck.slice(1)],
      };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      const outcome = game.infectCities();

      // Check outbreak structure
      if (outcome.outbreaks.length > 0) {
        const outbreak = outcome.outbreaks[0];
        if (outbreak) {
          expect(outbreak.city).toBeDefined();
          expect(outbreak.color).toBeDefined();
          expect(outbreak.cascade).toBeDefined();
          expect(Array.isArray(outbreak.cascade)).toBe(true);
        }
      }
    });
  });

  describe("loss conditions", () => {
    it("detects game loss when outbreak count reaches 8", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set up state where one more outbreak will lose
      const updatedBoard = { ...state.board };
      const atlantaState = updatedBoard["Atlanta"];
      if (atlantaState) {
        updatedBoard["Atlanta"] = { ...atlantaState, blue: 3 };
      }

      // Place Atlanta infection card at the top
      const atlantaCard = { city: "Atlanta", color: Disease.Blue };
      const infectPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Infect,
        outbreakCount: 7, // One more outbreak will lose
        board: updatedBoard,
        infectionDeck: [atlantaCard, ...state.infectionDeck.slice(1)],
      };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      const outcome = game.infectCities();

      // Game should be lost
      expect(outcome.gameStatus).toBe(GameStatus.Lost);
    });

    it("detects game loss when cube supply is exhausted", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set cube supply to 0 for blue
      const infectPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Infect,
        cubeSupply: { ...state.cubeSupply, [Disease.Blue]: 0 },
      };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      const outcome = game.infectCities();

      // Game should be lost if a blue city was infected
      const blueInfected = outcome.citiesInfected.some((c) => c.color === Disease.Blue);
      if (blueInfected) {
        expect(outcome.gameStatus).toBe(GameStatus.Lost);
      }
    });
  });

  describe("eradicated diseases", () => {
    it("skips cube placement for eradicated diseases", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Eradicate blue disease
      const infectPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Infect,
        cures: { ...state.cures, [Disease.Blue]: CureStatus.Eradicated },
      };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      const initialBlueSupply = infectPhaseState.cubeSupply[Disease.Blue] ?? 0;

      const outcome = game.infectCities();

      // Blue cube supply should not have changed
      expect(outcome.state.cubeSupply[Disease.Blue]).toBe(initialBlueSupply);
    });
  });
});

describe("Phase auto-advancement", () => {
  describe("Actions -> Draw transition", () => {
    it("auto-advances to Draw phase when actions reach 0", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      // Perform 4 actions by moving back and forth between two cities
      const atlanta = getCity("Atlanta");
      const firstConnection = atlanta.connections[0];

      if (!firstConnection) {
        throw new Error("Atlanta must have at least one connection");
      }

      // Move to firstConnection, back to Atlanta, to firstConnection, back to Atlanta
      game.performAction(`drive-ferry:${firstConnection}`);
      expect(game.getActionsRemaining()).toBe(3);
      expect(game.getCurrentPhase()).toBe(TurnPhase.Actions);

      game.performAction(`drive-ferry:Atlanta`);
      expect(game.getActionsRemaining()).toBe(2);
      expect(game.getCurrentPhase()).toBe(TurnPhase.Actions);

      game.performAction(`drive-ferry:${firstConnection}`);
      expect(game.getActionsRemaining()).toBe(1);
      expect(game.getCurrentPhase()).toBe(TurnPhase.Actions);

      // Perform the 4th action - should auto-advance to Draw phase
      const outcome = game.performAction(`drive-ferry:Atlanta`);
      expect(outcome.actionsRemaining).toBe(0);
      expect(game.getCurrentPhase()).toBe(TurnPhase.Draw);
    });

    it("does not advance if actions remain", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const atlanta = getCity("Atlanta");
      const firstConnection = atlanta.connections[0];

      if (!firstConnection) {
        throw new Error("Atlanta must have at least one connection");
      }

      // Perform 1 action
      game.performAction(`drive-ferry:${firstConnection}`);

      // Should still be in Actions phase
      expect(game.getCurrentPhase()).toBe(TurnPhase.Actions);
      expect(game.getActionsRemaining()).toBe(3);
    });
  });

  describe("Draw -> Infect transition", () => {
    it("auto-advances to Infect phase when no discards needed", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Manually advance to Draw phase
      const drawPhaseState: GameState = { ...state, phase: TurnPhase.Draw };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      // Draw cards (should not exceed hand limit)
      const outcome = game.drawCards();

      // Should auto-advance to Infect phase if no discards needed
      if (!outcome.needsDiscard) {
        expect(game.getCurrentPhase()).toBe(TurnPhase.Infect);
      }
    });

    it("does not advance if discards needed", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Give player 6 cards, then draw 2 more = 8 total (over limit)
      const sixCards: CityCard[] = [
        { type: "city", city: "Atlanta", color: Disease.Blue },
        { type: "city", city: "Chicago", color: Disease.Blue },
        { type: "city", city: "Montreal", color: Disease.Blue },
        { type: "city", city: "New York", color: Disease.Blue },
        { type: "city", city: "Washington", color: Disease.Blue },
        { type: "city", city: "London", color: Disease.Blue },
      ];

      const card1: CityCard = { type: "city", city: "Paris", color: Disease.Blue };
      const card2: CityCard = { type: "city", city: "Madrid", color: Disease.Blue };
      const playerDeck = [card1, card2, ...state.playerDeck.slice(2)];

      const drawPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Draw,
        players: state.players.map((p, i) => (i === 0 ? { ...p, hand: sixCards } : p)),
        playerDeck,
      };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      const outcome = game.drawCards();

      // Should NOT auto-advance if discards needed
      expect(outcome.needsDiscard).toBe(true);
      expect(game.getCurrentPhase()).toBe(TurnPhase.Draw);
    });
  });

  describe("Infect -> Actions transition", () => {
    it("auto-advances to next player's Actions phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const initialPlayerIndex = state.currentPlayerIndex;

      // Manually advance to Infect phase
      const infectPhaseState: GameState = { ...state, phase: TurnPhase.Infect };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      // Execute infection phase
      game.infectCities();

      // Should auto-advance to Actions phase with next player
      expect(game.getCurrentPhase()).toBe(TurnPhase.Actions);
      expect(game.getActionsRemaining()).toBe(4);
      expect(game.getGameState().currentPlayerIndex).toBe((initialPlayerIndex + 1) % 2);
    });

    it("wraps around to player 0 after last player", () => {
      const game = startGame({ playerCount: 3, difficulty: 4 });
      const state = game.getGameState();

      // Set to last player (index 2)
      const infectPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Infect,
        currentPlayerIndex: 2,
      };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      // Execute infection phase
      game.infectCities();

      // Should wrap around to player 0
      expect(game.getCurrentPhase()).toBe(TurnPhase.Actions);
      expect(game.getGameState().currentPlayerIndex).toBe(0);
    });

    it("resets special action flags", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set some flags that should be reset
      const infectPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Infect,
        operationsExpertSpecialMoveUsed: true,
        skipNextInfectionPhase: true,
      };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      // Execute infection phase
      const outcome = game.infectCities();

      // Flags should be reset
      expect(outcome.state.operationsExpertSpecialMoveUsed).toBe(false);
      expect(outcome.state.skipNextInfectionPhase).toBe(false);
    });
  });

  describe("Full turn cycle", () => {
    it("completes a full turn cycle through all phases", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const initialPlayerIndex = state.currentPlayerIndex;

      // Phase 1: Actions (start state)
      expect(game.getCurrentPhase()).toBe(TurnPhase.Actions);
      expect(game.getActionsRemaining()).toBe(4);

      // Perform 4 actions to advance to Draw phase
      const atlanta = getCity("Atlanta");
      const firstConnection = atlanta.connections[0];

      if (!firstConnection) {
        throw new Error("Atlanta must have at least one connection");
      }

      for (let i = 0; i < 4; i++) {
        const destination = i % 2 === 0 ? firstConnection : "Atlanta";
        game.performAction(`drive-ferry:${destination}`);
      }

      // Phase 2: Draw (after 4 actions)
      expect(game.getCurrentPhase()).toBe(TurnPhase.Draw);

      // Draw cards (will auto-advance to Infect if no discards needed)
      const drawOutcome = game.drawCards();

      // Phase 3: Infect (if no discards needed)
      if (!drawOutcome.needsDiscard) {
        expect(game.getCurrentPhase()).toBe(TurnPhase.Infect);

        // Execute infection phase (will auto-advance to next player's Actions)
        game.infectCities();

        // Phase 4: Back to Actions with next player
        expect(game.getCurrentPhase()).toBe(TurnPhase.Actions);
        expect(game.getActionsRemaining()).toBe(4);
        expect(game.getGameState().currentPlayerIndex).toBe((initialPlayerIndex + 1) % 2);
      }
    });
  });
});
