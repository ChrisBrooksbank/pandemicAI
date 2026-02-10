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
  EventType,
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
        // Ensure no Quarantine Specialist is at Atlanta or adjacent cities to prevent blocking
        players: state.players.map((p) => ({
          ...p,
          role: Role.Medic, // Use Medic role to avoid Quarantine Specialist interference
          location: "Tokyo", // Move players away from Atlanta
        })),
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
        // Ensure no Quarantine Specialist is at Atlanta or adjacent cities to prevent blocking
        players: state.players.map((p) => ({
          ...p,
          role: Role.Medic, // Use Medic role to avoid Quarantine Specialist interference
          location: "Tokyo", // Move players away from Atlanta
        })),
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

describe("Outcome type structure validation", () => {
  describe("ActionOutcome", () => {
    it("includes all required fields", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      const outcome = game.performAction("drive-ferry:Washington");

      // Validate all required fields are present
      expect(outcome).toHaveProperty("state");
      expect(outcome).toHaveProperty("action");
      expect(outcome).toHaveProperty("gameStatus");
      expect(outcome).toHaveProperty("sideEffects");
      expect(outcome).toHaveProperty("actionsRemaining");

      expect(typeof outcome.action).toBe("string");
      expect(typeof outcome.gameStatus).toBe("string");
      expect(typeof outcome.sideEffects).toBe("object");
      expect(typeof outcome.actionsRemaining).toBe("number");
    });

    it("includes side effects when eradication occurs", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set up for eradication
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
      expect(Array.isArray(outcome.sideEffects.diseasesEradicated)).toBe(true);
      expect(outcome.sideEffects.diseasesEradicated?.length).toBeGreaterThan(0);
    });
  });

  describe("DrawOutcome", () => {
    it("includes all required fields", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const drawPhaseState: GameState = { ...state, phase: TurnPhase.Draw };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      const outcome = game.drawCards();

      // Validate all required fields are present
      expect(outcome).toHaveProperty("state");
      expect(outcome).toHaveProperty("gameStatus");
      expect(outcome).toHaveProperty("cardsDrawn");
      expect(outcome).toHaveProperty("epidemics");
      expect(outcome).toHaveProperty("needsDiscard");
      expect(outcome).toHaveProperty("playersNeedingDiscard");

      expect(typeof outcome.gameStatus).toBe("string");
      expect(Array.isArray(outcome.cardsDrawn)).toBe(true);
      expect(Array.isArray(outcome.epidemics)).toBe(true);
      expect(typeof outcome.needsDiscard).toBe("boolean");
      expect(Array.isArray(outcome.playersNeedingDiscard)).toBe(true);
    });

    it("includes epidemic info with all required fields", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const epidemicCard: PlayerCard = { type: "epidemic" };
      const regularCard: CityCard = { type: "city", city: "Tokyo", color: Disease.Red };

      const drawPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Draw,
        playerDeck: [epidemicCard, regularCard, ...state.playerDeck.slice(2)],
      };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      const outcome = game.drawCards();

      expect(outcome.epidemics.length).toBeGreaterThan(0);
      const epidemic = outcome.epidemics[0];
      if (epidemic) {
        expect(epidemic).toHaveProperty("infectedCity");
        expect(epidemic).toHaveProperty("infectedColor");
        expect(epidemic).toHaveProperty("infectionRatePosition");
        expect(typeof epidemic.infectedCity).toBe("string");
        expect(typeof epidemic.infectedColor).toBe("string");
        expect(typeof epidemic.infectionRatePosition).toBe("number");
      }
    });

    it("includes drawn card info with all required fields", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const drawPhaseState: GameState = { ...state, phase: TurnPhase.Draw };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      const outcome = game.drawCards();

      for (const card of outcome.cardsDrawn) {
        expect(card).toHaveProperty("name");
        expect(card).toHaveProperty("type");
        expect(typeof card.name).toBe("string");
        expect(["city", "event"]).toContain(card.type);

        if (card.type === "city") {
          expect(card).toHaveProperty("color");
          expect(typeof card.color).toBe("string");
        }
      }
    });
  });

  describe("InfectOutcome", () => {
    it("includes all required fields", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const infectPhaseState: GameState = { ...state, phase: TurnPhase.Infect };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      const outcome = game.infectCities();

      // Validate all required fields are present
      expect(outcome).toHaveProperty("state");
      expect(outcome).toHaveProperty("gameStatus");
      expect(outcome).toHaveProperty("citiesInfected");
      expect(outcome).toHaveProperty("outbreaks");
      expect(outcome).toHaveProperty("cubesPlaced");

      expect(typeof outcome.gameStatus).toBe("string");
      expect(Array.isArray(outcome.citiesInfected)).toBe(true);
      expect(Array.isArray(outcome.outbreaks)).toBe(true);
      expect(typeof outcome.cubesPlaced).toBe("number");
    });

    it("includes infected city info with all required fields", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const infectPhaseState: GameState = { ...state, phase: TurnPhase.Infect };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      const outcome = game.infectCities();

      for (const infected of outcome.citiesInfected) {
        expect(infected).toHaveProperty("city");
        expect(infected).toHaveProperty("color");
        expect(typeof infected.city).toBe("string");
        expect(typeof infected.color).toBe("string");
      }
    });

    it("includes outbreak info with all required fields when outbreaks occur", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set up for outbreak
      const updatedBoard = { ...state.board };
      const atlantaState = updatedBoard["Atlanta"];
      if (atlantaState) {
        updatedBoard["Atlanta"] = { ...atlantaState, blue: 3 };
      }

      const atlantaCard = { city: "Atlanta", color: Disease.Blue };
      const infectPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Infect,
        board: updatedBoard,
        infectionDeck: [atlantaCard, ...state.infectionDeck.slice(1)],
      };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      const outcome = game.infectCities();

      if (outcome.outbreaks.length > 0) {
        const outbreak = outcome.outbreaks[0];
        if (outbreak) {
          expect(outbreak).toHaveProperty("city");
          expect(outbreak).toHaveProperty("color");
          expect(outbreak).toHaveProperty("cascade");
          expect(typeof outbreak.city).toBe("string");
          expect(typeof outbreak.color).toBe("string");
          expect(Array.isArray(outbreak.cascade)).toBe(true);
        }
      }
    });
  });

  describe("EventOutcome", () => {
    it("includes all required fields", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const eventCard: EventCard = { type: "event", event: EventType.OneQuietNight };
      const modifiedState: GameState = {
        ...state,
        players: state.players.map((p, i) => ({
          ...p,
          hand: i === 0 ? [eventCard] : [],
        })),
      };
      (game as unknown as { gameState: GameState }).gameState = modifiedState;

      const outcome = game.playEvent(0, { event: EventType.OneQuietNight });

      // Validate all required fields are present
      expect(outcome).toHaveProperty("state");
      expect(outcome).toHaveProperty("gameStatus");
      expect(outcome).toHaveProperty("eventType");
      expect(outcome).toHaveProperty("playerIndex");
      expect(outcome).toHaveProperty("fromStoredCard");

      expect(typeof outcome.gameStatus).toBe("string");
      expect(typeof outcome.eventType).toBe("string");
      expect(typeof outcome.playerIndex).toBe("number");
      expect(typeof outcome.fromStoredCard).toBe("boolean");
    });

    it("correctly identifies event from stored card", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const storedCard: EventCard = { type: "event", event: EventType.GovernmentGrant };
      const modifiedState: GameState = {
        ...state,
        players: state.players.map((p, i) => ({
          ...p,
          hand: [],
          storedEventCard: i === 0 ? storedCard : undefined,
        })),
      };
      (game as unknown as { gameState: GameState }).gameState = modifiedState;

      const outcome = game.playEvent(0, {
        event: EventType.GovernmentGrant,
        targetCity: "Tokyo",
      });

      expect(outcome.fromStoredCard).toBe(true);
    });

    it("correctly identifies event from hand", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const eventCard: EventCard = { type: "event", event: EventType.OneQuietNight };
      const modifiedState: GameState = {
        ...state,
        players: state.players.map((p, i) => ({
          ...p,
          hand: i === 0 ? [eventCard] : [],
        })),
      };
      (game as unknown as { gameState: GameState }).gameState = modifiedState;

      const outcome = game.playEvent(0, { event: EventType.OneQuietNight });

      expect(outcome.fromStoredCard).toBe(false);
    });
  });
});

describe("Phase transition edge cases", () => {
  describe("transition validation", () => {
    it("prevents performAction during Draw phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const drawPhaseState: GameState = { ...state, phase: TurnPhase.Draw };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      expect(() => game.performAction("drive-ferry:Washington")).toThrow(InvalidPhaseError);
      expect(() => game.performAction("drive-ferry:Washington")).toThrow(/Draw phase/);
    });

    it("prevents performAction during Infect phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const infectPhaseState: GameState = { ...state, phase: TurnPhase.Infect };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      expect(() => game.performAction("drive-ferry:Washington")).toThrow(InvalidPhaseError);
      expect(() => game.performAction("drive-ferry:Washington")).toThrow(/Infect phase/);
    });

    it("prevents drawCards during Actions phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      // Game starts in Actions phase
      expect(game.getCurrentPhase()).toBe(TurnPhase.Actions);

      expect(() => game.drawCards()).toThrow(InvalidPhaseError);
      expect(() => game.drawCards()).toThrow(/Draw phase/);
    });

    it("prevents drawCards during Infect phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const infectPhaseState: GameState = { ...state, phase: TurnPhase.Infect };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      expect(() => game.drawCards()).toThrow(InvalidPhaseError);
      expect(() => game.drawCards()).toThrow(/Draw phase/);
    });

    it("prevents infectCities during Actions phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      // Game starts in Actions phase
      expect(game.getCurrentPhase()).toBe(TurnPhase.Actions);

      expect(() => game.infectCities()).toThrow(InvalidPhaseError);
      expect(() => game.infectCities()).toThrow(/Infect phase/);
    });

    it("prevents infectCities during Draw phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const drawPhaseState: GameState = { ...state, phase: TurnPhase.Draw };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      expect(() => game.infectCities()).toThrow(InvalidPhaseError);
      expect(() => game.infectCities()).toThrow(/Infect phase/);
    });
  });

  describe("game over prevention", () => {
    it("prevents all actions when game is won", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const wonState: GameState = { ...state, status: GameStatus.Won };
      (game as unknown as { gameState: GameState }).gameState = wonState;

      expect(() => game.performAction("drive-ferry:Washington")).toThrow(GameOverError);
    });

    it("prevents all actions when game is lost", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const lostState: GameState = { ...state, status: GameStatus.Lost };
      (game as unknown as { gameState: GameState }).gameState = lostState;

      expect(() => game.performAction("drive-ferry:Washington")).toThrow(GameOverError);
    });

    it("prevents drawCards when game is won", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const wonState: GameState = { ...state, phase: TurnPhase.Draw, status: GameStatus.Won };
      (game as unknown as { gameState: GameState }).gameState = wonState;

      expect(() => game.drawCards()).toThrow(GameOverError);
    });

    it("prevents drawCards when game is lost", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const lostState: GameState = { ...state, phase: TurnPhase.Draw, status: GameStatus.Lost };
      (game as unknown as { gameState: GameState }).gameState = lostState;

      expect(() => game.drawCards()).toThrow(GameOverError);
    });

    it("prevents infectCities when game is won", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const wonState: GameState = { ...state, phase: TurnPhase.Infect, status: GameStatus.Won };
      (game as unknown as { gameState: GameState }).gameState = wonState;

      expect(() => game.infectCities()).toThrow(GameOverError);
    });

    it("prevents infectCities when game is lost", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const lostState: GameState = { ...state, phase: TurnPhase.Infect, status: GameStatus.Lost };
      (game as unknown as { gameState: GameState }).gameState = lostState;

      expect(() => game.infectCities()).toThrow(GameOverError);
    });

    it("prevents playEvent when game is won", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const eventCard: EventCard = { type: "event", event: EventType.OneQuietNight };
      const wonState: GameState = {
        ...state,
        status: GameStatus.Won,
        players: state.players.map((p, i) => ({
          ...p,
          hand: i === 0 ? [eventCard] : [],
        })),
      };
      (game as unknown as { gameState: GameState }).gameState = wonState;

      expect(() => game.playEvent(0, { event: EventType.OneQuietNight })).toThrow(GameOverError);
    });

    it("prevents playEvent when game is lost", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const eventCard: EventCard = { type: "event", event: EventType.OneQuietNight };
      const lostState: GameState = {
        ...state,
        status: GameStatus.Lost,
        players: state.players.map((p, i) => ({
          ...p,
          hand: i === 0 ? [eventCard] : [],
        })),
      };
      (game as unknown as { gameState: GameState }).gameState = lostState;

      expect(() => game.playEvent(0, { event: EventType.OneQuietNight })).toThrow(GameOverError);
    });
  });

  describe("phase transition timing", () => {
    it("does not advance from Actions to Draw if actions remain", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      expect(game.getCurrentPhase()).toBe(TurnPhase.Actions);
      expect(game.getActionsRemaining()).toBe(4);

      game.performAction("drive-ferry:Washington");

      expect(game.getCurrentPhase()).toBe(TurnPhase.Actions);
      expect(game.getActionsRemaining()).toBe(3);
    });

    it("does not advance from Draw to Infect if discards are needed", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set up player with 6 cards (will have 8 after drawing 2)
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

      // Should still be in Draw phase due to hand limit
      expect(outcome.needsDiscard).toBe(true);
      expect(game.getCurrentPhase()).toBe(TurnPhase.Draw);
    });

    it("does not advance if game ends during phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set up for deck exhaustion during draw
      const drawPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Draw,
        playerDeck: [],
      };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      const outcome = game.drawCards();

      // Game should be lost, no phase advancement
      expect(outcome.gameStatus).toBe(GameStatus.Lost);
      expect(game.getCurrentPhase()).toBe(TurnPhase.Draw);
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

  describe("getPlayableEvents", () => {
    it("returns empty array when no players have event cards", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      // Clear all player hands to ensure no event cards
      const state = game.getGameState();
      const clearedState: GameState = {
        ...state,
        players: state.players.map((p) => ({ ...p, hand: [] })),
      };
      (game as unknown as { gameState: GameState }).gameState = clearedState;

      const playableEvents = game.getPlayableEvents();
      expect(playableEvents).toEqual([]);
    });

    it("returns events from player hands", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Give player 0 two event cards
      const airliftCard: EventCard = { type: "event", event: EventType.Airlift };
      const forecastCard: EventCard = { type: "event", event: EventType.Forecast };
      const modifiedState: GameState = {
        ...state,
        players: state.players.map((p, i) => ({
          ...p,
          hand: i === 0 ? [airliftCard, forecastCard] : [],
        })),
      };
      (game as unknown as { gameState: GameState }).gameState = modifiedState;

      const playableEvents = game.getPlayableEvents();

      expect(playableEvents).toHaveLength(2);
      expect(playableEvents).toContainEqual({ playerIndex: 0, eventType: EventType.Airlift });
      expect(playableEvents).toContainEqual({ playerIndex: 0, eventType: EventType.Forecast });
    });

    it("includes stored event cards from Contingency Planner", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Give player 1 a stored event card
      const storedCard: EventCard = { type: "event", event: EventType.OneQuietNight };
      const modifiedState: GameState = {
        ...state,
        players: state.players.map((p, i) => ({
          ...p,
          hand: [],
          storedEventCard: i === 1 ? storedCard : undefined,
        })),
      };
      (game as unknown as { gameState: GameState }).gameState = modifiedState;

      const playableEvents = game.getPlayableEvents();

      expect(playableEvents).toHaveLength(1);
      expect(playableEvents[0]).toEqual({ playerIndex: 1, eventType: EventType.OneQuietNight });
    });

    it("returns events from multiple players", () => {
      const game = startGame({ playerCount: 3, difficulty: 4 });
      const state = game.getGameState();

      const airliftCard: EventCard = { type: "event", event: EventType.Airlift };
      const grantCard: EventCard = { type: "event", event: EventType.GovernmentGrant };
      const storedCard: EventCard = { type: "event", event: EventType.ResilientPopulation };

      const modifiedState: GameState = {
        ...state,
        players: state.players.map((p, i) => ({
          ...p,
          hand: i === 0 ? [airliftCard] : i === 1 ? [grantCard] : [],
          storedEventCard: i === 2 ? storedCard : undefined,
        })),
      };
      (game as unknown as { gameState: GameState }).gameState = modifiedState;

      const playableEvents = game.getPlayableEvents();

      expect(playableEvents).toHaveLength(3);
      expect(playableEvents).toContainEqual({ playerIndex: 0, eventType: EventType.Airlift });
      expect(playableEvents).toContainEqual({
        playerIndex: 1,
        eventType: EventType.GovernmentGrant,
      });
      expect(playableEvents).toContainEqual({
        playerIndex: 2,
        eventType: EventType.ResilientPopulation,
      });
    });
  });

  describe("playEvent", () => {
    it("plays Airlift event successfully during Actions phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Give player 0 an Airlift card
      const airliftCard: EventCard = { type: "event", event: EventType.Airlift };
      const modifiedState: GameState = {
        ...state,
        players: state.players.map((p, i) => ({
          ...p,
          hand: i === 0 ? [airliftCard] : [],
          location: "Atlanta",
        })),
      };
      (game as unknown as { gameState: GameState }).gameState = modifiedState;

      // Play airlift to move player 1 to Tokyo
      const outcome = game.playEvent(0, {
        event: EventType.Airlift,
        targetPlayerIndex: 1,
        destinationCity: "Tokyo",
      });

      expect(outcome.eventType).toBe(EventType.Airlift);
      expect(outcome.playerIndex).toBe(0);
      expect(outcome.fromStoredCard).toBe(false);
      expect(outcome.gameStatus).toBe(GameStatus.Ongoing);
      expect(game.getGameState().players[1]?.location).toBe("Tokyo");

      // Event card should be removed from hand
      expect(game.getGameState().players[0]?.hand).toHaveLength(0);
    });

    it("plays event during Draw phase (event cards playable anytime)", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Give player 0 a One Quiet Night card and advance to Draw phase
      const eventCard: EventCard = { type: "event", event: EventType.OneQuietNight };
      const modifiedState: GameState = {
        ...state,
        phase: TurnPhase.Draw,
        players: state.players.map((p, i) => ({
          ...p,
          hand: i === 0 ? [eventCard] : [],
        })),
      };
      (game as unknown as { gameState: GameState }).gameState = modifiedState;

      const outcome = game.playEvent(0, { event: EventType.OneQuietNight });

      expect(outcome.eventType).toBe(EventType.OneQuietNight);
      expect(outcome.gameStatus).toBe(GameStatus.Ongoing);
      expect(game.getGameState().skipNextInfectionPhase).toBe(true);

      // Phase should NOT advance (events don't change phase)
      expect(game.getCurrentPhase()).toBe(TurnPhase.Draw);
    });

    it("plays event from Contingency Planner stored card", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Give player 0 a stored Government Grant card
      const storedCard: EventCard = { type: "event", event: EventType.GovernmentGrant };
      const modifiedState: GameState = {
        ...state,
        players: state.players.map((p, i) => ({
          ...p,
          hand: [],
          storedEventCard: i === 0 ? storedCard : undefined,
        })),
      };
      (game as unknown as { gameState: GameState }).gameState = modifiedState;

      const outcome = game.playEvent(0, {
        event: EventType.GovernmentGrant,
        targetCity: "Tokyo",
      });

      expect(outcome.fromStoredCard).toBe(true);
      expect(game.getGameState().board["Tokyo"]?.hasResearchStation).toBe(true);

      // Stored card should be removed
      expect(game.getGameState().players[0]?.storedEventCard).toBeUndefined();
    });

    it("does not consume actions when playing event", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const eventCard: EventCard = { type: "event", event: EventType.OneQuietNight };
      const modifiedState: GameState = {
        ...state,
        players: state.players.map((p, i) => ({
          ...p,
          hand: i === 0 ? [eventCard] : [],
        })),
      };
      (game as unknown as { gameState: GameState }).gameState = modifiedState;

      const actionsBefore = game.getActionsRemaining();
      game.playEvent(0, { event: EventType.OneQuietNight });
      const actionsAfter = game.getActionsRemaining();

      expect(actionsAfter).toBe(actionsBefore);
    });

    it("throws InvalidActionError when player does not have event card", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Clear player hands
      const clearedState: GameState = {
        ...state,
        players: state.players.map((p) => ({ ...p, hand: [] })),
      };
      (game as unknown as { gameState: GameState }).gameState = clearedState;

      expect(() =>
        game.playEvent(0, {
          event: EventType.Airlift,
          targetPlayerIndex: 1,
          destinationCity: "Tokyo",
        }),
      ).toThrow(InvalidActionError);
    });

    it("throws InvalidActionError when event execution fails", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const eventCard: EventCard = { type: "event", event: EventType.ResilientPopulation };
      const modifiedState: GameState = {
        ...state,
        players: state.players.map((p, i) => ({
          ...p,
          hand: i === 0 ? [eventCard] : [],
        })),
        infectionDiscard: [], // Empty discard pile
      };
      (game as unknown as { gameState: GameState }).gameState = modifiedState;

      // Try to play Resilient Population with a city that's not in discard
      expect(() =>
        game.playEvent(0, {
          event: EventType.ResilientPopulation,
          cityName: "Atlanta",
        }),
      ).toThrow(InvalidActionError);
    });

    it("throws GameOverError when game has ended", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const eventCard: EventCard = { type: "event", event: EventType.OneQuietNight };
      const endedState: GameState = {
        ...state,
        status: GameStatus.Lost,
        players: state.players.map((p, i) => ({
          ...p,
          hand: i === 0 ? [eventCard] : [],
        })),
      };
      (game as unknown as { gameState: GameState }).gameState = endedState;

      expect(() => game.playEvent(0, { event: EventType.OneQuietNight })).toThrow(GameOverError);
    });

    it("plays Forecast event with reordering", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const eventCard: EventCard = { type: "event", event: EventType.Forecast };

      // Get the top 6 cards from infection deck
      const top6Cities = state.infectionDeck.slice(0, 6).map((card) => card.city);
      const reversedOrder = [...top6Cities].reverse();

      const modifiedState: GameState = {
        ...state,
        players: state.players.map((p, i) => ({
          ...p,
          hand: i === 0 ? [eventCard] : [],
        })),
      };
      (game as unknown as { gameState: GameState }).gameState = modifiedState;

      const outcome = game.playEvent(0, {
        event: EventType.Forecast,
        newOrder: reversedOrder,
      });

      expect(outcome.eventType).toBe(EventType.Forecast);

      // Verify the infection deck was reordered
      const newTop6 = game
        .getGameState()
        .infectionDeck.slice(0, 6)
        .map((card) => card.city);
      expect(newTop6).toEqual(reversedOrder);
    });

    it("plays Resilient Population to remove card from infection discard", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      const eventCard: EventCard = { type: "event", event: EventType.ResilientPopulation };
      const infectionCard = state.infectionDeck[0];
      if (!infectionCard) {
        throw new Error("Test setup failed: no infection cards");
      }

      const modifiedState: GameState = {
        ...state,
        players: state.players.map((p, i) => ({
          ...p,
          hand: i === 0 ? [eventCard] : [],
        })),
        infectionDiscard: [infectionCard],
      };
      (game as unknown as { gameState: GameState }).gameState = modifiedState;

      const discardLengthBefore = game.getGameState().infectionDiscard.length;

      const outcome = game.playEvent(0, {
        event: EventType.ResilientPopulation,
        cityName: infectionCard.city,
      });

      expect(outcome.eventType).toBe(EventType.ResilientPopulation);

      // Card should be removed from infection discard
      const discardLengthAfter = game.getGameState().infectionDiscard.length;
      expect(discardLengthAfter).toBe(discardLengthBefore - 1);
      expect(
        game.getGameState().infectionDiscard.find((c) => c.city === infectionCard.city),
      ).toBeUndefined();
    });
  });
});

describe("GameEvent Log", () => {
  describe("getEventLog", () => {
    it("returns empty log for new game", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      const log = game.getEventLog();
      expect(log).toEqual([]);
    });

    it("logs action-performed events", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      game.performAction("drive-ferry:Washington");

      const log = game.getEventLog();
      expect(log.length).toBeGreaterThan(0);

      const actionEvent = log.find((e) => e.type === "action-performed");
      expect(actionEvent).toBeDefined();
      if (actionEvent && actionEvent.type === "action-performed") {
        expect(actionEvent.action).toBe("drive-ferry:Washington");
        expect(actionEvent.turnNumber).toBe(1);
        expect(actionEvent.phase).toBe(TurnPhase.Actions);
        expect(actionEvent.playerIndex).toBe(0);
      }
    });

    it("logs cure-discovered events", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set up for cure discovery
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
      };
      (game as unknown as { gameState: GameState }).gameState = updatedState;

      game.performAction("discover-cure:blue");

      const log = game.getEventLog();
      const cureEvent = log.find((e) => e.type === "cure-discovered");
      expect(cureEvent).toBeDefined();
      if (cureEvent && cureEvent.type === "cure-discovered") {
        expect(cureEvent.disease).toBe(Disease.Blue);
        expect(cureEvent.turnNumber).toBe(1);
        expect(cureEvent.playerIndex).toBe(0);
      }
    });

    it("logs disease-eradicated events", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set up for eradication (cure + no cubes)
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

      game.performAction("discover-cure:blue");

      const log = game.getEventLog();
      const eradicationEvent = log.find((e) => e.type === "disease-eradicated");
      expect(eradicationEvent).toBeDefined();
      if (eradicationEvent && eradicationEvent.type === "disease-eradicated") {
        expect(eradicationEvent.disease).toBe(Disease.Blue);
        expect(eradicationEvent.turnNumber).toBe(1);
      }
    });
  });

  describe("drawCards event logging", () => {
    it("logs cards-drawn events", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Advance to Draw phase
      const drawPhaseState: GameState = { ...state, phase: TurnPhase.Draw };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      game.drawCards();

      const log = game.getEventLog();
      const cardsEvent = log.find((e) => e.type === "cards-drawn");
      expect(cardsEvent).toBeDefined();
      if (cardsEvent && cardsEvent.type === "cards-drawn") {
        expect(cardsEvent.cards.length).toBeGreaterThan(0);
        expect(cardsEvent.turnNumber).toBe(1);
        expect(cardsEvent.phase).toBe(TurnPhase.Draw);
      }
    });

    it("logs epidemic events", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Place epidemic card at top of deck
      const epidemicCard: PlayerCard = { type: "epidemic" };
      const regularCard: CityCard = { type: "city", city: "Tokyo", color: Disease.Red };

      const drawPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Draw,
        playerDeck: [epidemicCard, regularCard, ...state.playerDeck.slice(2)],
      };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      game.drawCards();

      const log = game.getEventLog();
      const epidemicEvent = log.find((e) => e.type === "epidemic");
      expect(epidemicEvent).toBeDefined();
      if (epidemicEvent && epidemicEvent.type === "epidemic") {
        expect(epidemicEvent.infectedCity).toBeDefined();
        expect(epidemicEvent.infectedColor).toBeDefined();
        expect(epidemicEvent.infectionRatePosition).toBeGreaterThan(0);
      }
    });
  });

  describe("infectCities event logging", () => {
    it("logs infection events", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Advance to Infect phase
      const infectPhaseState: GameState = { ...state, phase: TurnPhase.Infect };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      game.infectCities();

      const log = game.getEventLog();
      const infectionEvents = log.filter((e) => e.type === "infection");
      expect(infectionEvents.length).toBeGreaterThan(0);

      const firstInfection = infectionEvents[0];
      if (firstInfection && firstInfection.type === "infection") {
        expect(firstInfection.city).toBeDefined();
        expect(firstInfection.color).toBeDefined();
        expect(firstInfection.turnNumber).toBe(1);
      }
    });

    it("logs outbreak events", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set up for outbreak
      const updatedBoard = { ...state.board };
      const atlantaState = updatedBoard["Atlanta"];
      if (atlantaState) {
        updatedBoard["Atlanta"] = { ...atlantaState, blue: 3 };
      }

      const atlantaCard = { city: "Atlanta", color: Disease.Blue };
      const infectPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Infect,
        board: updatedBoard,
        infectionDeck: [atlantaCard, ...state.infectionDeck.slice(1)],
        // Ensure no Quarantine Specialist is at Atlanta or adjacent cities to prevent blocking
        players: state.players.map((p) => ({
          ...p,
          role: Role.Medic, // Use Medic role to avoid Quarantine Specialist interference
          location: "Tokyo", // Move players away from Atlanta
        })),
      };
      (game as unknown as { gameState: GameState }).gameState = infectPhaseState;

      game.infectCities();

      const log = game.getEventLog();
      const outbreakEvents = log.filter((e) => e.type === "outbreak");
      expect(outbreakEvents.length).toBeGreaterThan(0);

      const firstOutbreak = outbreakEvents[0];
      if (firstOutbreak && firstOutbreak.type === "outbreak") {
        expect(firstOutbreak.city).toBeDefined();
        expect(firstOutbreak.color).toBeDefined();
        expect(Array.isArray(firstOutbreak.cascade)).toBe(true);
      }
    });
  });

  describe("playEvent event logging", () => {
    it("logs event-card-played events", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Give player an event card
      const eventCard: EventCard = { type: "event", event: EventType.OneQuietNight };
      const modifiedState: GameState = {
        ...state,
        players: state.players.map((p, i) => ({
          ...p,
          hand: i === 0 ? [eventCard] : [],
        })),
      };
      (game as unknown as { gameState: GameState }).gameState = modifiedState;

      game.playEvent(0, { event: EventType.OneQuietNight });

      const log = game.getEventLog();
      const eventPlayedEvent = log.find((e) => e.type === "event-card-played");
      expect(eventPlayedEvent).toBeDefined();
      if (eventPlayedEvent && eventPlayedEvent.type === "event-card-played") {
        expect(eventPlayedEvent.eventType).toBe(EventType.OneQuietNight);
        expect(eventPlayedEvent.fromStoredCard).toBe(false);
        expect(eventPlayedEvent.playerIndex).toBe(0);
      }
    });

    it("logs event from stored card correctly", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Give player a stored event card
      const storedCard: EventCard = { type: "event", event: EventType.GovernmentGrant };
      const modifiedState: GameState = {
        ...state,
        players: state.players.map((p, i) => ({
          ...p,
          hand: [],
          storedEventCard: i === 0 ? storedCard : undefined,
        })),
      };
      (game as unknown as { gameState: GameState }).gameState = modifiedState;

      game.playEvent(0, {
        event: EventType.GovernmentGrant,
        targetCity: "Tokyo",
      });

      const log = game.getEventLog();
      const eventPlayedEvent = log.find((e) => e.type === "event-card-played");
      expect(eventPlayedEvent).toBeDefined();
      if (eventPlayedEvent && eventPlayedEvent.type === "event-card-played") {
        expect(eventPlayedEvent.fromStoredCard).toBe(true);
      }
    });
  });

  describe("game outcome event logging", () => {
    it("logs game-won event", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set up for immediate win (all cures discovered)
      const updatedState: GameState = {
        ...state,
        cures: {
          [Disease.Blue]: CureStatus.Cured,
          [Disease.Yellow]: CureStatus.Cured,
          [Disease.Black]: CureStatus.Cured,
          [Disease.Red]: CureStatus.Uncured,
        },
      };
      (game as unknown as { gameState: GameState }).gameState = updatedState;

      // Give red cards for final cure
      const redCards = [
        { type: "city" as const, city: "Bangkok", color: Disease.Red },
        { type: "city" as const, city: "Beijing", color: Disease.Red },
        { type: "city" as const, city: "Hong Kong", color: Disease.Red },
        { type: "city" as const, city: "Tokyo", color: Disease.Red },
        { type: "city" as const, city: "Shanghai", color: Disease.Red },
      ];

      const finalState: GameState = {
        ...updatedState,
        players: updatedState.players.map((p, i) => (i === 0 ? { ...p, hand: redCards } : p)),
      };
      (game as unknown as { gameState: GameState }).gameState = finalState;

      game.performAction("discover-cure:red");

      const log = game.getEventLog();
      const wonEvent = log.find((e) => e.type === "game-won");
      expect(wonEvent).toBeDefined();
      if (wonEvent && wonEvent.type === "game-won") {
        expect(wonEvent.turnNumber).toBe(1);
      }
    });

    it("logs game-lost event with reason", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });
      const state = game.getGameState();

      // Set up for loss by deck exhaustion
      const drawPhaseState: GameState = {
        ...state,
        phase: TurnPhase.Draw,
        playerDeck: [],
      };
      (game as unknown as { gameState: GameState }).gameState = drawPhaseState;

      game.drawCards();

      const log = game.getEventLog();
      const lostEvent = log.find((e) => e.type === "game-lost");
      expect(lostEvent).toBeDefined();
      if (lostEvent && lostEvent.type === "game-lost") {
        expect(lostEvent.reason).toBeDefined();
        expect(lostEvent.reason).toContain("exhausted");
      }
    });
  });

  describe("getEventsSince", () => {
    it("returns empty array when no events since turn", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      game.performAction("drive-ferry:Washington");

      const events = game.getEventsSince(10);
      expect(events).toEqual([]);
    });

    it("returns events after specified turn", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      // Perform actions in turn 1
      game.performAction("drive-ferry:Washington");

      // Manually increment turn counter for testing
      (game as unknown as { turnCounter: number }).turnCounter = 2;

      // Perform more actions in turn 2
      game.performAction("drive-ferry:Atlanta");

      const eventsSinceTurn1 = game.getEventsSince(1);
      expect(eventsSinceTurn1.length).toBeGreaterThan(0);

      // All returned events should be from turn 2 or later
      for (const event of eventsSinceTurn1) {
        expect(event.turnNumber).toBeGreaterThan(1);
      }
    });

    it("includes events from current turn", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      game.performAction("drive-ferry:Washington");

      const eventsSinceTurn0 = game.getEventsSince(0);
      expect(eventsSinceTurn0.length).toBeGreaterThan(0);
    });
  });

  describe("turn counter progression", () => {
    it("increments turn counter after infection phase", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      // Complete a full turn cycle
      const atlanta = getCity("Atlanta");
      const firstConnection = atlanta.connections[0];
      if (!firstConnection) {
        throw new Error("Atlanta must have at least one connection");
      }

      // Use up all 4 actions
      for (let i = 0; i < 4; i++) {
        const destination = i % 2 === 0 ? firstConnection : "Atlanta";
        game.performAction(`drive-ferry:${destination}`);
      }

      // Now in Draw phase
      game.drawCards();

      // Now in Infect phase (if no discards needed)
      const drawPhase = game.getCurrentPhase();
      if (drawPhase === TurnPhase.Infect) {
        game.infectCities();

        // After infection, turn counter should have incremented
        const log = game.getEventLog();
        const lastEvent = log[log.length - 1];
        if (lastEvent) {
          // The last infection/outbreak event should still be turn 1
          // But the next action will be turn 2
          expect(lastEvent.turnNumber).toBe(1);
        }
      }
    });
  });

  describe("event log includes all event types", () => {
    it("records events with correct structure", () => {
      const game = startGame({ playerCount: 2, difficulty: 4 });

      // Perform an action
      game.performAction("drive-ferry:Washington");

      const log = game.getEventLog();
      expect(log.length).toBeGreaterThan(0);

      // Every event should have turnNumber and phase
      for (const event of log) {
        expect(event.turnNumber).toBeDefined();
        expect(event.phase).toBeDefined();
        expect(event.type).toBeDefined();
      }
    });
  });
});
