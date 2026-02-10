// Tests for game orchestration
import { describe, it, expect } from "vitest";
import {
  startGame,
  OrchestratedGame,
  GameOverError,
  InvalidPhaseError,
  InvalidActionError,
} from "./orchestrator";
import { GameStatus, TurnPhase, Disease, Role, CureStatus, type GameState } from "./types";
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
