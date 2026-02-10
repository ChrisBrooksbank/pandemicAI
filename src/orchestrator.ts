// Game orchestration - high-level game loop coordinator
import {
  createGame,
  getCurrentPlayer,
  getGameStatus,
  getAvailableActions,
  drawPlayerCards,
  advancePhase,
  type DrawCardsResult,
} from "./game";
import { executeInfectionPhase, type InfectionPhaseResult } from "./infection";
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
  airlift,
  forecast,
  governmentGrant,
  oneQuietNight,
  resilientPopulation,
  hasEventCard,
} from "./events";
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
 * Base interface for all game events
 */
interface BaseGameEvent {
  /** The turn number when this event occurred */
  turnNumber: number;
  /** The phase when this event occurred */
  phase: TurnPhase;
  /** The player index who caused this event (if applicable) */
  playerIndex?: number;
}

/**
 * Event emitted when a player action is performed
 */
interface ActionPerformedEvent extends BaseGameEvent {
  type: "action-performed";
  /** The action string that was performed */
  action: string;
  /** Side effects that occurred */
  sideEffects: ActionSideEffects;
}

/**
 * Event emitted when cards are drawn
 */
interface CardsDrawnEvent extends BaseGameEvent {
  type: "cards-drawn";
  /** The cards that were drawn */
  cards: DrawnCard[];
}

/**
 * Event emitted when an epidemic occurs
 */
interface EpidemicEvent extends BaseGameEvent {
  type: "epidemic";
  /** The city that was infected */
  infectedCity: string;
  /** The disease color that spread */
  infectedColor: DiseaseColor;
  /** New infection rate position */
  infectionRatePosition: number;
}

/**
 * Event emitted when cities are infected
 */
interface InfectionEvent extends BaseGameEvent {
  type: "infection";
  /** The city that was infected */
  city: string;
  /** The disease color placed */
  color: DiseaseColor;
}

/**
 * Event emitted when an outbreak occurs
 */
interface OutbreakEvent extends BaseGameEvent {
  type: "outbreak";
  /** The city where the outbreak occurred */
  city: string;
  /** The disease color that outbroke */
  color: DiseaseColor;
  /** Cities affected in the cascade */
  cascade: string[];
}

/**
 * Event emitted when a cure is discovered
 */
interface CureDiscoveredEvent extends BaseGameEvent {
  type: "cure-discovered";
  /** The disease that was cured */
  disease: DiseaseColor;
}

/**
 * Event emitted when a disease is eradicated
 */
interface DiseaseEradicatedEvent extends BaseGameEvent {
  type: "disease-eradicated";
  /** The disease that was eradicated */
  disease: DiseaseColor;
}

/**
 * Event emitted when an event card is played
 */
interface EventCardPlayedEvent extends BaseGameEvent {
  type: "event-card-played";
  /** The type of event that was played */
  eventType: EventType;
  /** Whether it was from a stored card */
  fromStoredCard: boolean;
}

/**
 * Event emitted when the game is won
 */
interface GameWonEvent extends BaseGameEvent {
  type: "game-won";
}

/**
 * Event emitted when the game is lost
 */
interface GameLostEvent extends BaseGameEvent {
  type: "game-lost";
  /** The reason for the loss */
  reason: string;
}

/**
 * Discriminated union of all game event types
 */
export type GameEvent =
  | ActionPerformedEvent
  | CardsDrawnEvent
  | EpidemicEvent
  | InfectionEvent
  | OutbreakEvent
  | CureDiscoveredEvent
  | DiseaseEradicatedEvent
  | EventCardPlayedEvent
  | GameWonEvent
  | GameLostEvent;

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
  constructor(action: string, currentPhase: TurnPhase, requiredPhase?: TurnPhase) {
    // Capitalize phase names for error messages
    const capitalize = (phase: TurnPhase) => phase.charAt(0).toUpperCase() + phase.slice(1);
    const phaseMsg = requiredPhase
      ? `must be in ${capitalize(requiredPhase)} phase`
      : `cannot be done during ${capitalize(currentPhase)} phase`;
    super(
      `Cannot perform action '${action}': ${phaseMsg}, currently in ${capitalize(currentPhase)} phase`,
    );
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
 * Information about a card that was drawn
 */
export interface DrawnCard {
  /** The name of the card (city name for city cards, event name for event cards) */
  name: string;
  /** The type of card drawn */
  type: "city" | "event";
  /** For city cards, the disease color */
  color?: DiseaseColor;
}

/**
 * Information about an epidemic that occurred during card draw
 */
export interface EpidemicInfo {
  /** The city that was infected (from bottom of infection deck) */
  infectedCity: string;
  /** The disease color that was spread */
  infectedColor: DiseaseColor;
  /** The new infection rate position after increase */
  infectionRatePosition: number;
}

/**
 * Outcome of drawing player cards
 */
export interface DrawOutcome {
  /** The updated game state after drawing */
  state: GameState;
  /** Current game status after drawing (may be lost if deck exhausted or epidemic caused loss) */
  gameStatus: GameStatus;
  /** Cards that were drawn and added to the player's hand */
  cardsDrawn: DrawnCard[];
  /** Epidemic information if any epidemics occurred */
  epidemics: EpidemicInfo[];
  /** Whether the hand limit is exceeded and discards are needed */
  needsDiscard: boolean;
  /** Player indices that need to discard (typically just current player) */
  playersNeedingDiscard: number[];
}

/**
 * Information about a city that was infected during the infection phase
 */
export interface InfectedCity {
  /** The name of the city */
  city: string;
  /** The disease color that was placed */
  color: DiseaseColor;
}

/**
 * Information about an outbreak that occurred
 */
export interface OutbreakInfo {
  /** The city where the outbreak started */
  city: string;
  /** The disease color that outbroke */
  color: DiseaseColor;
  /** Cities affected in the cascade (may be empty for isolated outbreaks) */
  cascade: string[];
}

/**
 * Outcome of executing the infection phase
 */
export interface InfectOutcome {
  /** The updated game state after infection */
  state: GameState;
  /** Current game status after infection (may be lost if outbreaks or cube exhaustion) */
  gameStatus: GameStatus;
  /** Cities infected (with city name and color) */
  citiesInfected: InfectedCity[];
  /** Outbreaks triggered (with outbreak details and cascade chains) */
  outbreaks: OutbreakInfo[];
  /** Total number of cubes placed during this phase */
  cubesPlaced: number;
}

/**
 * Parameters for event card effects
 */
export type EventParams =
  | { event: EventType.Airlift; targetPlayerIndex: number; destinationCity: string }
  | { event: EventType.GovernmentGrant; targetCity: string; cityToRemoveStation?: string }
  | { event: EventType.OneQuietNight }
  | { event: EventType.ResilientPopulation; cityName: string }
  | { event: EventType.Forecast; newOrder: string[] };

/**
 * Outcome of playing an event card
 */
export interface EventOutcome {
  /** The updated game state after playing the event */
  state: GameState;
  /** Current game status after the event (should remain Ongoing unless something went wrong) */
  gameStatus: GameStatus;
  /** The type of event that was played */
  eventType: EventType;
  /** The player who played the event */
  playerIndex: number;
  /** Whether the event was played from stored card (Contingency Planner) */
  fromStoredCard: boolean;
}

/**
 * OrchestratedGame wraps GameState and provides high-level game lifecycle management.
 * Handles phase transitions, turn sequencing, and multi-step resolution flows.
 */
export class OrchestratedGame {
  private gameState: GameState;
  private orchestratedStatus: OrchestratedGameStatus;
  private eventLog: GameEvent[];
  private turnCounter: number;

  /**
   * Private constructor - use startGame() to create instances
   */
  private constructor(gameState: GameState) {
    this.gameState = gameState;
    this.orchestratedStatus = "playing";
    this.eventLog = [];
    this.turnCounter = 1;
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
   * Get the full game event log.
   * Returns all events that have occurred during the game in chronological order.
   *
   * @returns Array of all game events
   */
  getEventLog(): readonly GameEvent[] {
    return this.eventLog;
  }

  /**
   * Get game events that occurred since a specific turn number.
   * Useful for incremental UI updates.
   *
   * @param turnNumber - The turn number to start from (exclusive)
   * @returns Array of events that occurred after the specified turn
   */
  getEventsSince(turnNumber: number): readonly GameEvent[] {
    return this.eventLog.filter((event) => event.turnNumber > turnNumber);
  }

  /**
   * Add an event to the log.
   * Internal helper method to record game events.
   *
   * @param event - The event to log (turnNumber and phase will be added automatically)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private logEvent(event: any): void {
    const fullEvent = {
      ...event,
      turnNumber: this.turnCounter,
      phase: this.gameState.phase,
    };
    this.eventLog.push(fullEvent as GameEvent);
  }

  /**
   * Validate that the game is still in progress.
   * Throws GameOverError if the game has ended.
   *
   * Note: This checks the game state's status field directly, not computed conditions.
   * This allows methods like drawCards() to detect and report new loss conditions.
   */
  private validateGameOngoing(): void {
    // Check the status field directly, not the computed status
    if (this.gameState.status !== GameStatus.Ongoing) {
      throw new GameOverError(this.gameState.status);
    }
  }

  /**
   * Determine the reason for game loss based on current state.
   * Used for logging game-lost events with helpful context.
   *
   * @returns A string describing why the game was lost
   */
  private determineGameLossReason(): string {
    if (this.gameState.outbreakCount >= 8) {
      return "8 outbreaks occurred";
    }
    if (this.gameState.playerDeck.length === 0) {
      return "Player deck exhausted";
    }
    const colors: DiseaseColor[] = [Disease.Blue, Disease.Yellow, Disease.Black, Disease.Red];
    for (const color of colors) {
      const supply = this.gameState.cubeSupply[color];
      if (supply !== undefined && supply <= 0) {
        return `${color} cube supply exhausted`;
      }
    }
    return "Unknown loss condition";
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
   * Draw 2 player cards and resolve all consequences.
   * Must be called during the Draw phase.
   *
   * This method:
   * - Draws 2 cards from the player deck
   * - Resolves epidemics immediately (increase rate, infect bottom card, intensify)
   * - Adds non-epidemic cards to the current player's hand
   * - Checks if hand limit is exceeded
   * - Detects win/loss conditions
   *
   * @returns DrawOutcome with cards drawn, epidemics resolved, and hand limit status
   * @throws InvalidPhaseError if not in Draw phase
   * @throws GameOverError if the game has ended
   */
  drawCards(): DrawOutcome {
    // Validate game is ongoing
    this.validateGameOngoing();

    // Validate we're in the Draw phase
    if (this.gameState.phase !== TurnPhase.Draw) {
      throw new InvalidPhaseError("drawCards", this.gameState.phase, TurnPhase.Draw);
    }

    // Track the top 2 cards of the deck before drawing
    const topTwoCards = this.gameState.playerDeck.slice(0, 2);

    // Call the engine's drawPlayerCards function
    let drawResult: DrawCardsResult;
    try {
      drawResult = drawPlayerCards(this.gameState);
    } catch (error) {
      // The engine throws regular errors for game-ending conditions
      // We need to catch those and convert them or handle them appropriately
      if (error instanceof Error && error.message.includes("game has ended")) {
        throw new GameOverError(this.gameState.status);
      }
      throw error;
    }

    // Update internal game state
    this.gameState = drawResult.state;

    // Get the updated game status from the state
    // (don't re-compute with getGameStatus, use the status from drawResult)
    const gameStatus = this.gameState.status;

    // Build the list of drawn cards by examining the top 2 cards we tracked
    const cardsDrawn: DrawnCard[] = [];

    for (const card of topTwoCards) {
      if (card && card.type !== "epidemic") {
        if (card.type === "city") {
          cardsDrawn.push({
            name: card.city,
            type: "city",
            color: card.color,
          });
        } else if (card.type === "event") {
          cardsDrawn.push({
            name: card.event,
            type: "event",
          });
        }
      }
    }

    // Convert epidemic information
    const epidemics: EpidemicInfo[] = drawResult.epidemics.map((epi) => ({
      infectedCity: epi.infectedCity,
      infectedColor: epi.infectedColor,
      infectionRatePosition: epi.infectionRatePosition,
    }));

    // Log cards drawn event
    if (cardsDrawn.length > 0) {
      this.logEvent({
        type: "cards-drawn",
        cards: cardsDrawn,
        playerIndex: this.gameState.currentPlayerIndex,
      });
    }

    // Log epidemic events
    for (const epidemic of epidemics) {
      this.logEvent({
        type: "epidemic",
        infectedCity: epidemic.infectedCity,
        infectedColor: epidemic.infectedColor,
        infectionRatePosition: epidemic.infectionRatePosition,
        playerIndex: this.gameState.currentPlayerIndex,
      });
    }

    // Log game lost event if it occurred during draw
    if (gameStatus === GameStatus.Lost) {
      this.logEvent({
        type: "game-lost",
        reason: this.determineGameLossReason(),
        playerIndex: this.gameState.currentPlayerIndex,
      });
    }

    // Check if hand limit is exceeded for current player
    const updatedPlayer = getCurrentPlayer(this.gameState);
    const needsDiscard = updatedPlayer.hand.length > 7;
    const playersNeedingDiscard = needsDiscard ? [this.gameState.currentPlayerIndex] : [];

    // Auto-advance to Infect phase if no discards needed and game is still ongoing
    if (!needsDiscard && gameStatus === GameStatus.Ongoing) {
      this.gameState = advancePhase(this.gameState);
    }

    return {
      state: this.gameState,
      gameStatus,
      cardsDrawn,
      epidemics,
      needsDiscard,
      playersNeedingDiscard,
    };
  }

  /**
   * Execute the infection phase.
   * Must be called during the Infect phase.
   *
   * This method:
   * - Draws N infection cards where N = current infection rate
   * - Places 1 cube of matching color on each infected city
   * - Resolves any outbreaks (with cascade chains)
   * - Detects win/loss conditions
   * - Handles One Quiet Night event (skips infection, clears flag)
   *
   * @returns InfectOutcome with cities infected, outbreaks, and cubes placed
   * @throws InvalidPhaseError if not in Infect phase
   * @throws GameOverError if the game has ended
   */
  infectCities(): InfectOutcome {
    // Validate game is ongoing
    this.validateGameOngoing();

    // Validate we're in the Infect phase
    if (this.gameState.phase !== TurnPhase.Infect) {
      throw new InvalidPhaseError("infectCities", this.gameState.phase, TurnPhase.Infect);
    }

    // Track the initial outbreak count and board state to detect outbreaks
    const initialOutbreakCount = this.gameState.outbreakCount;
    const initialBoard = this.gameState.board;

    // Call the engine's executeInfectionPhase function
    const infectionResult: InfectionPhaseResult = executeInfectionPhase(this.gameState);

    // Update internal game state
    this.gameState = infectionResult.state;

    // Get the updated game status
    const gameStatus = this.gameState.status;

    // Build the list of infected cities
    const citiesInfected: InfectedCity[] = infectionResult.cardsDrawn.map((card) => ({
      city: card.city,
      color: card.color,
    }));

    // Detect outbreaks by comparing outbreak counts
    const outbreaksOccurred = this.gameState.outbreakCount > initialOutbreakCount;
    const outbreaks: OutbreakInfo[] = [];

    if (outbreaksOccurred) {
      // We can't easily track the exact outbreak chain from the result,
      // but we can at least report that outbreaks occurred.
      // For now, we'll create a simplified outbreak report.
      // A more detailed implementation would track outbreaks in the infection phase.
      const numOutbreaks = this.gameState.outbreakCount - initialOutbreakCount;

      // Try to identify which cities outbroke by looking for cities with changes
      // This is a heuristic - the actual outbreak detection is complex
      for (const card of infectionResult.cardsDrawn) {
        const oldCityState = initialBoard[card.city];

        if (oldCityState) {
          const oldCubes = oldCityState[card.color];

          // If the city had 3+ cubes before, it likely outbroke
          if (oldCubes >= 3) {
            outbreaks.push({
              city: card.city,
              color: card.color,
              cascade: [], // Cascade tracking would require engine changes
            });
          }
        }
      }

      // If we didn't identify enough outbreaks, add generic entries
      while (outbreaks.length < numOutbreaks) {
        outbreaks.push({
          city: "Unknown",
          color: Disease.Blue,
          cascade: [],
        });
      }
    }

    // Calculate cubes placed by comparing cube supplies
    const cubesPlaced = citiesInfected.length; // Simplified: 1 cube per card drawn

    // Log infection events
    for (const infected of citiesInfected) {
      this.logEvent({
        type: "infection",
        city: infected.city,
        color: infected.color,
        playerIndex: this.gameState.currentPlayerIndex,
      });
    }

    // Log outbreak events
    for (const outbreak of outbreaks) {
      this.logEvent({
        type: "outbreak",
        city: outbreak.city,
        color: outbreak.color,
        cascade: outbreak.cascade,
        playerIndex: this.gameState.currentPlayerIndex,
      });
    }

    // Log game lost event if it occurred during infection
    if (gameStatus === GameStatus.Lost) {
      this.logEvent({
        type: "game-lost",
        reason: this.determineGameLossReason(),
        playerIndex: this.gameState.currentPlayerIndex,
      });
    }

    // Auto-advance to next player's Actions phase only if game is still ongoing
    if (gameStatus === GameStatus.Ongoing) {
      this.gameState = advancePhase(this.gameState);
      // Increment turn counter when moving to next player
      this.turnCounter++;
    }

    return {
      state: this.gameState,
      gameStatus,
      citiesInfected,
      outbreaks,
      cubesPlaced,
    };
  }

  /**
   * Get all events that can be played by any player.
   * Includes both events in player hands and events stored on Contingency Planner.
   *
   * @returns Array of playable events with player index and event type
   */
  getPlayableEvents(): Array<{ playerIndex: number; eventType: EventType }> {
    const playableEvents: Array<{ playerIndex: number; eventType: EventType }> = [];

    // Check each player's hand and stored card
    for (let i = 0; i < this.gameState.players.length; i++) {
      const player = this.gameState.players[i];
      if (!player) continue;

      // Check cards in hand
      for (const card of player.hand) {
        if (card.type === "event") {
          playableEvents.push({
            playerIndex: i,
            eventType: card.event,
          });
        }
      }

      // Check stored event card (Contingency Planner)
      if (player.storedEventCard) {
        playableEvents.push({
          playerIndex: i,
          eventType: player.storedEventCard.event,
        });
      }
    }

    return playableEvents;
  }

  /**
   * Play an event card during any phase.
   * Event cards can be played at any time and do not consume actions.
   *
   * This method:
   * - Validates the game is ongoing
   * - Validates the player has the event card (in hand or stored on Contingency Planner)
   * - Executes the event-specific logic
   * - Does NOT advance the phase or consume actions
   *
   * @param playerIndex - Index of the player playing the event
   * @param params - Event-specific parameters (discriminated union by event type)
   * @returns EventOutcome with updated state and event information
   * @throws InvalidActionError if the event cannot be played
   * @throws GameOverError if the game has ended
   */
  playEvent(playerIndex: number, params: EventParams): EventOutcome {
    // Validate game is ongoing
    this.validateGameOngoing();

    // Validate player index
    const player = this.gameState.players[playerIndex];
    if (!player) {
      throw new InvalidActionError(
        `playEvent:${params.event}`,
        `Invalid player index: ${playerIndex}`,
      );
    }

    // Check if player has the event card (in hand or stored)
    const hasCard = hasEventCard(this.gameState, params.event, playerIndex);
    if (!hasCard) {
      throw new InvalidActionError(
        `playEvent:${params.event}`,
        `Player ${playerIndex} does not have ${params.event} event card`,
      );
    }

    // Determine if the event is from stored card (Contingency Planner)
    const fromStoredCard = player.storedEventCard?.event === params.event;

    // Execute the event based on type
    let result;
    switch (params.event) {
      case EventType.Airlift:
        result = airlift(
          this.gameState,
          params.targetPlayerIndex,
          params.destinationCity,
          playerIndex,
        );
        break;

      case EventType.GovernmentGrant:
        result = governmentGrant(
          this.gameState,
          params.targetCity,
          params.cityToRemoveStation,
          playerIndex,
        );
        break;

      case EventType.OneQuietNight:
        result = oneQuietNight(this.gameState, playerIndex);
        break;

      case EventType.ResilientPopulation:
        result = resilientPopulation(this.gameState, params.cityName, playerIndex);
        break;

      case EventType.Forecast:
        result = forecast(this.gameState, params.newOrder, playerIndex);
        break;

      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = params;
        throw new InvalidActionError(
          "playEvent",
          `Unknown event type: ${(_exhaustive as EventParams).event}`,
        );
      }
    }

    // Check if the event succeeded
    if (!result.success) {
      throw new InvalidActionError(`playEvent:${params.event}`, result.error);
    }

    // Update the internal game state
    this.gameState = result.state;

    // Get the updated game status
    const gameStatus = getGameStatus(this.gameState);

    // Log the event card played event
    this.logEvent({
      type: "event-card-played",
      eventType: params.event,
      fromStoredCard,
      playerIndex,
    });

    // Return the outcome (no phase advancement, no action consumption)
    return {
      state: this.gameState,
      gameStatus,
      eventType: params.event,
      playerIndex,
      fromStoredCard,
    };
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
      throw new InvalidPhaseError(actionString, this.gameState.phase, TurnPhase.Actions);
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

    // Log the action performed event
    this.logEvent({
      type: "action-performed",
      action: actionString,
      sideEffects,
      playerIndex: oldState.currentPlayerIndex,
    });

    // Log cure discovery if it happened
    const colors: DiseaseColor[] = [Disease.Blue, Disease.Yellow, Disease.Black, Disease.Red];
    for (const color of colors) {
      const oldCure = oldState.cures[color];
      const newCure = this.gameState.cures[color];
      if (oldCure === CureStatus.Uncured && newCure === CureStatus.Cured) {
        this.logEvent({
          type: "cure-discovered",
          disease: color,
          playerIndex: oldState.currentPlayerIndex,
        });
      }
    }

    // Log eradication events
    if (sideEffects.diseasesEradicated) {
      for (const disease of sideEffects.diseasesEradicated) {
        this.logEvent({
          type: "disease-eradicated",
          disease,
          playerIndex: oldState.currentPlayerIndex,
        });
      }
    }

    // Log game won/lost events
    if (gameStatus === GameStatus.Won) {
      this.logEvent({
        type: "game-won",
        playerIndex: oldState.currentPlayerIndex,
      });
    } else if (gameStatus === GameStatus.Lost) {
      this.logEvent({
        type: "game-lost",
        reason: this.determineGameLossReason(),
        playerIndex: oldState.currentPlayerIndex,
      });
    }

    // Auto-advance to Draw phase if no actions remaining and game is still ongoing
    if (this.gameState.actionsRemaining === 0 && gameStatus === GameStatus.Ongoing) {
      this.gameState = advancePhase(this.gameState);
    }

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
