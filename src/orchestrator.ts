// Game orchestration - high-level game loop coordinator
import { createGame, getCurrentPlayer, getGameStatus } from "./game";
import { GameStatus, TurnPhase, type GameConfig, type GameState, type Player } from "./types";

/**
 * Orchestrated game status includes setup phase before playing begins
 */
export type OrchestratedGameStatus = "setup" | "playing" | "won" | "lost";

/**
 * Error thrown when attempting actions on a completed game
 */
export class GameOverError extends Error {
  constructor(status: GameStatus) {
    super(`Game is already over with status: ${status}`);
    this.name = "GameOverError";
  }
}

/**
 * OrchestratedGame wraps GameState and provides high-level game lifecycle management.
 * Handles phase transitions, turn sequencing, and multi-step resolution flows.
 */
export class OrchestratedGame {
  private gameState: GameState;
  private orchestratedStatus: OrchestratedGameStatus;

  /**
   * Private constructor - use startGame() to create instances
   */
  private constructor(gameState: GameState) {
    this.gameState = gameState;
    this.orchestratedStatus = "playing";
  }

  /**
   * Create a new orchestrated game from a config.
   * The game begins in the "playing" state, ready for the first player's action phase.
   *
   * @param config - Game configuration (player count, difficulty)
   * @returns A new OrchestratedGame instance
   */
  static create(config: GameConfig): OrchestratedGame {
    const gameState = createGame(config);
    return new OrchestratedGame(gameState);
  }

  /**
   * Get the current orchestrated game status.
   * Returns "playing" | "won" | "lost".
   * "setup" is only used during construction and is never returned.
   *
   * @returns The current game status
   */
  getStatus(): OrchestratedGameStatus {
    // Update status based on underlying game state
    const gameStatus = getGameStatus(this.gameState);

    if (gameStatus === GameStatus.Won) {
      this.orchestratedStatus = "won";
    } else if (gameStatus === GameStatus.Lost) {
      this.orchestratedStatus = "lost";
    } else {
      this.orchestratedStatus = "playing";
    }

    return this.orchestratedStatus;
  }

  /**
   * Get the current turn phase.
   *
   * @returns The current phase (Actions | Draw | Infect)
   */
  getCurrentPhase(): TurnPhase {
    return this.gameState.phase;
  }

  /**
   * Get the current active player.
   *
   * @returns The player whose turn it is
   */
  getCurrentPlayer(): Player {
    return getCurrentPlayer(this.gameState);
  }

  /**
   * Get the number of actions remaining in the current action phase.
   * Returns 0 if not in the action phase.
   *
   * @returns Number of actions remaining (0-4)
   */
  getActionsRemaining(): number {
    if (this.gameState.phase !== TurnPhase.Actions) {
      return 0;
    }
    return this.gameState.actionsRemaining;
  }

  /**
   * Get the underlying game state (read-only).
   * This is provided for UI rendering and should not be mutated directly.
   *
   * @returns The current game state
   */
  getGameState(): Readonly<GameState> {
    return this.gameState;
  }

  /**
   * Validate that the game is still in progress.
   * Throws GameOverError if the game has ended.
   */
  private validateGameOngoing(): void {
    const status = this.getStatus();
    if (status === "won" || status === "lost") {
      throw new GameOverError(status === "won" ? GameStatus.Won : GameStatus.Lost);
    }
  }
}

/**
 * Create and start a new orchestrated game.
 * This is the primary entry point for creating games with the orchestrator.
 *
 * @param config - Game configuration (player count, difficulty)
 * @returns A new OrchestratedGame instance ready to play
 */
export function startGame(config: GameConfig): OrchestratedGame {
  return OrchestratedGame.create(config);
}
