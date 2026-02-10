// Game orchestration - high-level game loop coordinator
import { createGame, getCurrentPlayer, getGameStatus, getAvailableActions } from "./game";
import {
  driveFerry,
  directFlight,
  charterFlight,
  shuttleFlight,
  buildResearchStation,
  treatDisease,
  shareKnowledge,
  discoverCure,
  dispatcherMoveToOtherPawn,
  dispatcherMoveOtherPlayer,
  operationsExpertMove,
  contingencyPlannerTakeEvent,
  type ActionResult,
} from "./actions";
import {
  GameStatus,
  TurnPhase,
  Disease,
  CureStatus,
  EventType,
  type GameConfig,
  type GameState,
  type Player,
  type DiseaseColor,
} from "./types";

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
 * Error thrown when attempting an action during the wrong phase
 */
export class InvalidPhaseError extends Error {
  constructor(action: string, currentPhase: TurnPhase) {
    super(`Cannot perform action '${action}' during ${currentPhase} phase`);
    this.name = "InvalidPhaseError";
  }
}

/**
 * Error thrown when attempting an invalid action
 */
export class InvalidActionError extends Error {
  constructor(action: string, reason: string) {
    super(`Invalid action '${action}': ${reason}`);
    this.name = "InvalidActionError";
  }
}

/**
 * Side effects that can occur when performing an action
 */
export interface ActionSideEffects {
  /** Disease colors that were auto-cleared by Medic passive ability */
  medicPassiveClears?: DiseaseColor[];
  /** Diseases that became eradicated as a result of this action */
  diseasesEradicated?: DiseaseColor[];
  /** Cities where Quarantine Specialist blocked cube placement */
  quarantineBlocks?: string[];
}

/**
 * Outcome of performing a player action
 */
export interface ActionOutcome {
  /** The updated game state after the action */
  state: GameState;
  /** The action that was performed (original action string) */
  action: string;
  /** Current game status after the action */
  gameStatus: GameStatus;
  /** Side effects that occurred (passive abilities, eradications) */
  sideEffects: ActionSideEffects;
  /** Number of actions remaining after this action */
  actionsRemaining: number;
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

  /**
   * Get the available actions for the current player.
   * Returns action strings that can be passed to performAction().
   *
   * @returns Array of available action strings
   */
  getAvailableActions(): string[] {
    return getAvailableActions(this.gameState);
  }

  /**
   * Detect side effects after an action is performed.
   * Checks for Medic passive clears and disease eradications.
   *
   * @param oldState - The state before the action
   * @param newState - The state after the action
   * @returns Side effects that occurred
   */
  private detectSideEffects(oldState: GameState, newState: GameState): ActionSideEffects {
    const sideEffects: ActionSideEffects = {};

    // Check for diseases that became eradicated
    const colors: DiseaseColor[] = [Disease.Blue, Disease.Yellow, Disease.Black, Disease.Red];
    const eradicated: DiseaseColor[] = [];

    for (const color of colors) {
      const oldStatus = oldState.cures[color];
      const newStatus = newState.cures[color];

      if (oldStatus !== CureStatus.Eradicated && newStatus === CureStatus.Eradicated) {
        eradicated.push(color);
      }
    }

    if (eradicated.length > 0) {
      sideEffects.diseasesEradicated = eradicated;
    }

    // Note: Medic passive clears are already included in the action result
    // We would need to track them separately if we wanted to report them,
    // but for now we just detect eradications

    return sideEffects;
  }

  /**
   * Parse an action string and execute the corresponding action.
   * Action strings follow the format: "action-type:parameters"
   *
   * @param actionString - The action to perform
   * @returns The outcome of the action including updated state and side effects
   * @throws InvalidPhaseError if not in Actions phase
   * @throws InvalidActionError if the action is invalid
   * @throws GameOverError if the game has ended
   */
  performAction(actionString: string): ActionOutcome {
    // Validate game is ongoing
    this.validateGameOngoing();

    // Also check the underlying state status field directly
    // (in case it was manually set, e.g., in tests)
    if (this.gameState.status !== GameStatus.Ongoing) {
      throw new GameOverError(this.gameState.status);
    }

    // Validate we're in the Actions phase
    if (this.gameState.phase !== TurnPhase.Actions) {
      throw new InvalidPhaseError(actionString, this.gameState.phase);
    }

    // Validate actions remaining
    if (this.gameState.actionsRemaining <= 0) {
      throw new InvalidActionError(actionString, "No actions remaining");
    }

    // Parse the action string
    const [actionType, ...paramParts] = actionString.split(":");
    const params = paramParts.join(":"); // Rejoin in case city names have colons

    let result: ActionResult;

    // Execute the appropriate action based on type
    switch (actionType) {
      case "drive-ferry":
        if (!params) {
          throw new InvalidActionError(actionString, "Missing destination city");
        }
        result = driveFerry(this.gameState, params);
        break;

      case "direct-flight":
        if (!params) {
          throw new InvalidActionError(actionString, "Missing destination city");
        }
        result = directFlight(this.gameState, params);
        break;

      case "charter-flight":
        if (!params) {
          throw new InvalidActionError(actionString, "Missing destination city");
        }
        result = charterFlight(this.gameState, params);
        break;

      case "shuttle-flight":
        if (!params) {
          throw new InvalidActionError(actionString, "Missing destination city");
        }
        result = shuttleFlight(this.gameState, params);
        break;

      case "build-research-station":
        // Params is optional - only needed when removing a station
        result = buildResearchStation(this.gameState, params || undefined);
        break;

      case "treat":
        if (!params) {
          throw new InvalidActionError(actionString, "Missing disease color");
        }
        result = treatDisease(this.gameState, params as DiseaseColor);
        break;

      case "share-knowledge-give":
        if (!params) {
          throw new InvalidActionError(actionString, "Missing parameters");
        }
        {
          const [targetIndexStr, cityName] = params.split(":");
          const targetIndex = parseInt(targetIndexStr ?? "", 10);
          if (isNaN(targetIndex) || !cityName) {
            throw new InvalidActionError(actionString, "Invalid share knowledge parameters");
          }
          result = shareKnowledge(this.gameState, targetIndex, true, cityName);
        }
        break;

      case "share-knowledge-take":
        if (!params) {
          throw new InvalidActionError(actionString, "Missing parameters");
        }
        {
          const [targetIndexStr, cityName] = params.split(":");
          const targetIndex = parseInt(targetIndexStr ?? "", 10);
          if (isNaN(targetIndex) || !cityName) {
            throw new InvalidActionError(actionString, "Invalid share knowledge parameters");
          }
          result = shareKnowledge(this.gameState, targetIndex, false, cityName);
        }
        break;

      case "discover-cure":
        if (!params) {
          throw new InvalidActionError(actionString, "Missing disease color");
        }
        result = discoverCure(this.gameState, params as DiseaseColor);
        break;

      case "dispatcher-move-to-pawn":
        if (!params) {
          throw new InvalidActionError(actionString, "Missing parameters");
        }
        {
          // Format: dispatcher-move-to-pawn:playerToMove:targetPlayer
          const [playerToMoveStr, targetPlayerStr] = params.split(":");
          const playerToMove = parseInt(playerToMoveStr ?? "", 10);
          const targetPlayer = parseInt(targetPlayerStr ?? "", 10);
          if (isNaN(playerToMove) || isNaN(targetPlayer)) {
            throw new InvalidActionError(actionString, "Invalid player indices");
          }
          result = dispatcherMoveToOtherPawn(this.gameState, playerToMove, targetPlayer);
        }
        break;

      case "dispatcher-move-other":
        if (!params) {
          throw new InvalidActionError(actionString, "Missing parameters");
        }
        {
          // Format: dispatcher-move-other:playerIndex:moveType:destination[:cardSource]
          const parts = params.split(":");
          const playerIndexStr = parts[0];
          const moveType = parts[1];
          const destination = parts[2];
          const cardSource = parts[3];

          const playerIndex = parseInt(playerIndexStr ?? "", 10);
          if (isNaN(playerIndex) || !moveType || !destination) {
            throw new InvalidActionError(actionString, "Invalid dispatcher move parameters");
          }

          // Determine if using other player's card
          const useOtherPlayerCard = cardSource === "player-card";

          result = dispatcherMoveOtherPlayer(
            this.gameState,
            playerIndex,
            moveType as "drive" | "direct" | "charter" | "shuttle",
            destination,
            useOtherPlayerCard,
          );
        }
        break;

      case "ops-expert-move":
        if (!params) {
          throw new InvalidActionError(actionString, "Missing parameters");
        }
        {
          // Format: ops-expert-move:destination:cityCardToDiscard
          const [destination, cityCardToDiscard] = params.split(":");
          if (!destination || !cityCardToDiscard) {
            throw new InvalidActionError(actionString, "Invalid operations expert move parameters");
          }
          result = operationsExpertMove(this.gameState, destination, cityCardToDiscard);
        }
        break;

      case "contingency-planner-take":
        if (!params) {
          throw new InvalidActionError(actionString, "Missing event type");
        }
        result = contingencyPlannerTakeEvent(this.gameState, params as EventType);
        break;

      default:
        throw new InvalidActionError(actionString, `Unknown action type: ${actionType}`);
    }

    // Check if the action succeeded
    if (!result.success) {
      throw new InvalidActionError(actionString, result.error);
    }

    // Update the internal game state
    const oldState = this.gameState;
    this.gameState = result.state;

    // Detect side effects
    const sideEffects = this.detectSideEffects(oldState, this.gameState);

    // Get the updated game status
    const gameStatus = getGameStatus(this.gameState);

    // Return the outcome
    return {
      state: this.gameState,
      action: actionString,
      gameStatus,
      sideEffects,
      actionsRemaining: this.gameState.actionsRemaining,
    };
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
