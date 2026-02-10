// Tests for game orchestration
import { describe, it, expect } from "vitest";
import { startGame, OrchestratedGame, GameOverError } from "./orchestrator";
import { GameStatus, TurnPhase } from "./types";

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
