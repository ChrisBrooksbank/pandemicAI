// Game initialization and state management
import { CITIES } from "./board";
import {
  CureStatus,
  Disease,
  EventType,
  GameStatus,
  Role,
  TurnPhase,
  type CityState,
  type GameConfig,
  type GameState,
  type InfectionCard,
  type Player,
  type PlayerCard,
} from "./types";
import { resolveEpidemic } from "./infection";

/**
 * Initialize the board state for a new game.
 * All cities start with 0 disease cubes.
 * Atlanta starts with a research station.
 *
 * @returns A record mapping city names to their initial state
 */
export function initializeBoard(): Record<string, CityState> {
  const board: Record<string, CityState> = {};

  for (const city of CITIES) {
    board[city.name] = {
      blue: 0,
      yellow: 0,
      black: 0,
      red: 0,
      hasResearchStation: city.name === "Atlanta",
    };
  }

  return board;
}

/**
 * Create and shuffle the infection deck.
 * Creates 48 infection cards (one for each city).
 *
 * @returns A shuffled array of 48 infection cards
 */
export function createInfectionDeck(): InfectionCard[] {
  // Create one infection card for each city
  const deck: InfectionCard[] = CITIES.map((city) => ({
    city: city.name,
    color: city.color,
  }));

  // Shuffle the deck using Fisher-Yates algorithm
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const cardI = deck[i];
    const cardJ = deck[j];
    // Loop bounds ensure these indices are valid
    if (cardI !== undefined && cardJ !== undefined) {
      deck[i] = cardJ;
      deck[j] = cardI;
    }
  }

  return deck;
}

/**
 * Result of performing the initial infection during game setup
 */
export interface InitialInfectionResult {
  /** Updated board state with placed disease cubes */
  board: Record<string, CityState>;
  /** Updated infection deck (9 cards removed) */
  infectionDeck: InfectionCard[];
  /** Infection discard pile (9 cards added) */
  infectionDiscard: InfectionCard[];
  /** Updated cube supply (18 cubes removed total) */
  cubeSupply: Record<string, number>;
}

/**
 * Perform the initial infection during game setup.
 * Draws 3+3+3 cards from the infection deck and places 3/2/1 cubes respectively.
 * Total of 18 disease cubes are placed across 9 cities.
 *
 * @param board - The initial board state (all cities with 0 cubes)
 * @param infectionDeck - The shuffled infection deck (48 cards)
 * @returns Updated board, infection deck, discard pile, and cube supply
 */
export function performInitialInfection(
  board: Record<string, CityState>,
  infectionDeck: InfectionCard[],
): InitialInfectionResult {
  // Clone the board to avoid mutation
  const updatedBoard: Record<string, CityState> = {};
  for (const cityName in board) {
    const cityState = board[cityName];
    if (cityState !== undefined) {
      updatedBoard[cityName] = { ...cityState };
    }
  }

  // Clone the infection deck
  const deck = [...infectionDeck];
  const discard: InfectionCard[] = [];

  // Initialize cube supply tracking (24 cubes per color)
  const cubeSupply: Record<string, number> = {
    blue: 24,
    yellow: 24,
    black: 24,
    red: 24,
  };

  // Helper function to draw and infect
  const infectCity = (cubeCount: number): void => {
    const card = deck.shift();
    if (card === undefined) {
      throw new Error("Infection deck is empty during initial infection");
    }

    const cityState = updatedBoard[card.city];
    if (cityState === undefined) {
      throw new Error(`City ${card.city} not found on board`);
    }

    // Place cubes of the card's color
    const color = card.color;
    cityState[color] = (cityState[color] || 0) + cubeCount;

    // Update cube supply
    const currentSupply = cubeSupply[color];
    if (currentSupply === undefined) {
      throw new Error(`Invalid disease color: ${color}`);
    }
    cubeSupply[color] = currentSupply - cubeCount;

    // Add card to discard pile
    discard.push(card);
  };

  // Draw 3 cards, place 3 cubes each (9 cubes total)
  for (let i = 0; i < 3; i++) {
    infectCity(3);
  }

  // Draw 3 cards, place 2 cubes each (6 cubes total)
  for (let i = 0; i < 3; i++) {
    infectCity(2);
  }

  // Draw 3 cards, place 1 cube each (3 cubes total)
  for (let i = 0; i < 3; i++) {
    infectCity(1);
  }

  return {
    board: updatedBoard,
    infectionDeck: deck,
    infectionDiscard: discard,
    cubeSupply,
  };
}

/**
 * Create and shuffle the player deck with epidemic cards inserted.
 * Creates 48 city cards + 5 event cards, shuffles them, then divides into N piles
 * and shuffles one epidemic card into each pile.
 *
 * @param difficulty - Number of epidemic cards to include (4-6)
 * @returns A shuffled player deck with epidemic cards evenly distributed
 */
export function createPlayerDeck(difficulty: 4 | 5 | 6): PlayerCard[] {
  // Create 48 city cards (one for each city)
  const cityCards: PlayerCard[] = CITIES.map((city) => ({
    type: "city" as const,
    city: city.name,
    color: city.color,
  }));

  // Create 5 event cards (one of each type)
  const eventCards: PlayerCard[] = [
    { type: "event" as const, event: EventType.Airlift },
    { type: "event" as const, event: EventType.Forecast },
    { type: "event" as const, event: EventType.GovernmentGrant },
    { type: "event" as const, event: EventType.OneQuietNight },
    { type: "event" as const, event: EventType.ResilientPopulation },
  ];

  // Combine and shuffle city + event cards (53 total)
  const baseDeck = [...cityCards, ...eventCards];
  shuffleArray(baseDeck);

  // Insert epidemic cards evenly
  // Divide the base deck into N equal piles (where N = difficulty)
  // Shuffle one epidemic card into each pile
  // Stack the piles without further shuffling
  const pileSize = Math.floor(baseDeck.length / difficulty);
  const finalDeck: PlayerCard[] = [];

  for (let i = 0; i < difficulty; i++) {
    // Determine start and end indices for this pile
    const startIndex = i * pileSize;
    // Last pile gets any remaining cards
    const endIndex = i === difficulty - 1 ? baseDeck.length : (i + 1) * pileSize;

    // Extract this pile
    const pile = baseDeck.slice(startIndex, endIndex);

    // Add one epidemic card to this pile
    pile.push({ type: "epidemic" as const });

    // Shuffle this pile
    shuffleArray(pile);

    // Add shuffled pile to final deck
    finalDeck.push(...pile);
  }

  return finalDeck;
}

/**
 * Shuffle an array in place using Fisher-Yates algorithm
 * @param array - The array to shuffle
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const itemI = array[i];
    const itemJ = array[j];
    // Loop bounds ensure these indices are valid
    if (itemI !== undefined && itemJ !== undefined) {
      array[i] = itemJ;
      array[j] = itemI;
    }
  }
}

/**
 * Result of setting up players during game initialization
 */
export interface PlayerSetupResult {
  /** Array of initialized players with roles, starting location, and hands */
  players: Player[];
  /** Updated player deck after dealing starting hands */
  playerDeck: PlayerCard[];
}

/**
 * Setup players for a new game.
 * - Assigns random roles to each player
 * - Deals starting hands based on player count (4/3/2 cards for 2/3/4 players)
 * - Places all pawns in Atlanta
 *
 * @param playerCount - Number of players (2-4)
 * @param playerDeck - The player deck (already shuffled with epidemic cards inserted)
 * @returns Initialized players and updated player deck
 */
export function setupPlayers(playerCount: 2 | 3 | 4, playerDeck: PlayerCard[]): PlayerSetupResult {
  // Create array of all available roles
  const availableRoles: Role[] = [
    Role.ContingencyPlanner,
    Role.Dispatcher,
    Role.Medic,
    Role.OperationsExpert,
    Role.QuarantineSpecialist,
    Role.Researcher,
    Role.Scientist,
  ];

  // Shuffle roles
  shuffleArray(availableRoles);

  // Determine starting hand size based on player count
  const handSize = playerCount === 2 ? 4 : playerCount === 3 ? 3 : 2;

  // Clone the player deck to avoid mutation
  const deck = [...playerDeck];

  // Initialize players
  const players: Player[] = [];

  for (let i = 0; i < playerCount; i++) {
    // Assign role (already shuffled, so just take in order)
    const role = availableRoles[i];
    if (role === undefined) {
      throw new Error(`Not enough roles available for player ${i}`);
    }

    // Deal starting hand
    const hand: PlayerCard[] = [];
    for (let j = 0; j < handSize; j++) {
      const card = deck.shift();
      if (card === undefined) {
        throw new Error(`Not enough cards in deck to deal starting hands`);
      }
      hand.push(card);
    }

    // Create player (all start in Atlanta)
    players.push({
      role,
      location: "Atlanta",
      hand,
    });
  }

  return {
    players,
    playerDeck: deck,
  };
}

/**
 * Create a new Pandemic game with the specified configuration.
 * This combines all game setup steps:
 * - Initialize the board
 * - Create and shuffle the infection deck
 * - Perform initial infection (3+3+3 pattern)
 * - Create the player deck with epidemic cards
 * - Setup players with roles and starting hands
 * - Initialize all game state trackers
 *
 * @param config - Game configuration (player count and difficulty)
 * @returns Complete initialized game state
 */
export function createGame(config: GameConfig): GameState {
  // Validate configuration
  if (![2, 3, 4].includes(config.playerCount)) {
    throw new Error(`Invalid player count: ${config.playerCount}. Must be 2, 3, or 4.`);
  }
  if (![4, 5, 6].includes(config.difficulty)) {
    throw new Error(`Invalid difficulty: ${config.difficulty}. Must be 4, 5, or 6.`);
  }

  // Step 1: Initialize board
  const initialBoard = initializeBoard();

  // Step 2: Create and shuffle infection deck
  const infectionDeck = createInfectionDeck();

  // Step 3: Perform initial infection
  const infectionResult = performInitialInfection(initialBoard, infectionDeck);

  // Step 4: Create player deck with epidemic cards
  const playerDeck = createPlayerDeck(config.difficulty);

  // Step 5: Setup players
  const playerSetup = setupPlayers(config.playerCount, playerDeck);

  // Step 6: Create complete game state
  const gameState: GameState = {
    config,
    players: playerSetup.players,
    currentPlayerIndex: 0,
    phase: TurnPhase.Actions,
    actionsRemaining: 4,
    board: infectionResult.board,
    cures: {
      [Disease.Blue]: CureStatus.Uncured,
      [Disease.Yellow]: CureStatus.Uncured,
      [Disease.Black]: CureStatus.Uncured,
      [Disease.Red]: CureStatus.Uncured,
    },
    cubeSupply: infectionResult.cubeSupply,
    infectionRatePosition: 1,
    outbreakCount: 0,
    playerDeck: playerSetup.playerDeck,
    playerDiscard: [],
    infectionDeck: infectionResult.infectionDeck,
    infectionDiscard: infectionResult.infectionDiscard,
    status: GameStatus.Ongoing,
    operationsExpertSpecialMoveUsed: false,
  };

  return gameState;
}

/**
 * Get the current player whose turn it is.
 *
 * @param state - The current game state
 * @returns The current player
 */
export function getCurrentPlayer(state: GameState): Player {
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer === undefined) {
    throw new Error(`Invalid currentPlayerIndex: ${state.currentPlayerIndex}`);
  }
  return currentPlayer;
}

/**
 * Get the available actions for the current player.
 * Returns an empty array for now (action logic not yet implemented).
 *
 * @param _state - The current game state
 * @returns Array of available actions (currently empty)
 */
export function getAvailableActions(_state: GameState): string[] {
  // Placeholder implementation - will return actual available actions once action system is implemented
  return [];
}

/**
 * Get the state of a specific city.
 * Returns the number of disease cubes and research station status for the city.
 *
 * @param state - The current game state
 * @param cityName - The name of the city to query
 * @returns The city's state (disease cubes and research station status)
 * @throws Error if the city name is not found on the board
 */
export function getCityState(state: GameState, cityName: string): CityState {
  const cityState = state.board[cityName];
  if (cityState === undefined) {
    throw new Error(`City not found: ${cityName}`);
  }

  // Return a copy to maintain immutability
  return { ...cityState };
}

/**
 * Get the cure status for all diseases.
 * Returns the cure status (uncured, cured, or eradicated) for each of the 4 diseases.
 *
 * @param state - The current game state
 * @returns A record mapping each disease color to its cure status
 */
export function getCureStatus(state: GameState): Record<Disease, CureStatus> {
  // Return a copy to maintain immutability
  return { ...state.cures };
}

/**
 * Get the current game status (ongoing, won, or lost).
 *
 * Win condition: All 4 diseases have been cured.
 * Loss conditions:
 * - 8 outbreaks have occurred
 * - Any disease cube supply is exhausted (0 or below)
 * - Player deck is empty when cards need to be drawn
 *
 * @param state - The current game state
 * @returns The game status (ongoing, won, or lost)
 */
export function getGameStatus(state: GameState): GameStatus {
  // Check for win: all 4 diseases are cured or eradicated
  const allDiseasesCured = Object.values(state.cures).every(
    (cureStatus) => cureStatus === CureStatus.Cured || cureStatus === CureStatus.Eradicated,
  );
  if (allDiseasesCured) {
    return GameStatus.Won;
  }

  // Check for loss condition 1: 8 outbreaks
  if (state.outbreakCount >= 8) {
    return GameStatus.Lost;
  }

  // Check for loss condition 2: cube supply exhausted for any color
  const cubeSupplyExhausted = Object.values(state.cubeSupply).some((supply) => supply <= 0);
  if (cubeSupplyExhausted) {
    return GameStatus.Lost;
  }

  // Check for loss condition 3: player deck empty
  // Note: This check is meaningful when cards need to be drawn.
  // During actual gameplay, the game should be lost immediately when
  // a player cannot draw 2 cards. For now, we check if the deck is empty.
  if (state.playerDeck.length === 0 && state.phase === TurnPhase.Draw) {
    return GameStatus.Lost;
  }

  // Game is still ongoing
  return GameStatus.Ongoing;
}

/**
 * Advance to the next turn phase.
 * Transitions: Actions → Draw → Infect → Actions (next player)
 *
 * When transitioning from Actions to Draw:
 * - Does not reset actions remaining (this happens after Infect phase)
 *
 * When transitioning from Draw to Infect:
 * - No state changes except phase
 *
 * When transitioning from Infect to Actions:
 * - Advances to next player
 * - Resets actions remaining to 4
 *
 * @param state - The current game state
 * @returns Updated game state with advanced phase
 */
export function advancePhase(state: GameState): GameState {
  switch (state.phase) {
    case TurnPhase.Actions:
      // Transition to Draw phase
      return {
        ...state,
        phase: TurnPhase.Draw,
      };

    case TurnPhase.Draw:
      // Transition to Infect phase
      return {
        ...state,
        phase: TurnPhase.Infect,
      };

    case TurnPhase.Infect: {
      // Transition to Actions phase with next player
      const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
      return {
        ...state,
        phase: TurnPhase.Actions,
        currentPlayerIndex: nextPlayerIndex,
        actionsRemaining: 4,
        operationsExpertSpecialMoveUsed: false,
      };
    }

    default:
      throw new Error(`Unknown turn phase: ${state.phase}`);
  }
}

/**
 * End the current turn and advance to the next player.
 * Must be called during the Infect phase to transition to the next player's action phase.
 *
 * @param state - The current game state
 * @returns Updated game state with next player's turn started
 * @throws Error if not currently in the Infect phase
 */
export function endTurn(state: GameState): GameState {
  // Validate that we're in the Infect phase
  if (state.phase !== TurnPhase.Infect) {
    throw new Error(`Cannot end turn: must be in Infect phase, currently in ${state.phase} phase`);
  }

  // Use advancePhase to transition from Infect to Actions with next player
  return advancePhase(state);
}

/**
 * Result of drawing player cards
 */
export interface DrawCardsResult {
  /** Updated game state after drawing cards */
  state: GameState;
  /** Array of epidemic results if any epidemic cards were drawn */
  epidemics: Array<{
    infectedCity: string;
    infectedColor: Disease;
    infectionRatePosition: number;
  }>;
}

/**
 * Draw 2 player cards from the deck and add them to the current player's hand.
 * Must be called during the Draw phase.
 *
 * Epidemic cards are resolved immediately when drawn:
 * - They are NOT added to the player's hand
 * - They are discarded to the player discard pile after resolution
 * - The epidemic 3-step process is executed (increase rate, infect bottom card, intensify)
 *
 * Note: This function does NOT enforce hand limit. Call enforceHandLimit() after drawing if needed.
 *
 * @param state - The current game state
 * @returns DrawCardsResult with updated state and epidemic information
 * @throws Error if not in Draw phase, if game has ended, or if deck doesn't have enough cards
 */
export function drawPlayerCards(state: GameState): DrawCardsResult {
  // Validate that game is ongoing
  if (state.status !== GameStatus.Ongoing) {
    throw new Error(`Cannot draw cards: game has ended with status ${state.status}`);
  }

  // Validate that we're in the Draw phase
  if (state.phase !== TurnPhase.Draw) {
    throw new Error(`Cannot draw cards: must be in Draw phase, currently in ${state.phase} phase`);
  }

  // Check if deck has at least 2 cards
  if (state.playerDeck.length < 2) {
    // Game is lost if we cannot draw 2 cards
    return {
      state: {
        ...state,
        status: GameStatus.Lost,
      },
      epidemics: [],
    };
  }

  let currentState = state;
  const epidemics: Array<{
    infectedCity: string;
    infectedColor: Disease;
    infectionRatePosition: number;
  }> = [];

  // Draw 2 cards, one at a time, resolving epidemics as they occur
  for (let i = 0; i < 2; i++) {
    // Check if deck is empty (may have been modified by previous epidemic)
    if (currentState.playerDeck.length === 0) {
      // Game is lost if we cannot draw all required cards
      return {
        state: {
          ...currentState,
          status: GameStatus.Lost,
        },
        epidemics,
      };
    }

    const card = currentState.playerDeck[0];
    if (!card) {
      throw new Error("Player deck is empty");
    }

    // Remove card from deck
    const updatedPlayerDeck = currentState.playerDeck.slice(1);

    if (card.type === "epidemic") {
      // Resolve epidemic immediately
      const epidemicResult = resolveEpidemic(currentState);

      // Update current state with epidemic resolution
      currentState = {
        ...epidemicResult.state,
        playerDeck: updatedPlayerDeck,
        playerDiscard: [...epidemicResult.state.playerDiscard, card], // Discard epidemic card
      };

      // Track epidemic information
      epidemics.push({
        infectedCity: epidemicResult.infectedCity,
        infectedColor: epidemicResult.infectedColor,
        infectionRatePosition: epidemicResult.state.infectionRatePosition,
      });

      // If game was lost during epidemic, stop drawing
      if (currentState.status === GameStatus.Lost) {
        return {
          state: currentState,
          epidemics,
        };
      }
    } else {
      // Non-epidemic card: add to current player's hand
      const currentPlayer = getCurrentPlayer(currentState);
      const updatedHand = [...currentPlayer.hand, card];

      // Update players array with the new hand
      const updatedPlayers = currentState.players.map((player, index) => {
        if (index === currentState.currentPlayerIndex) {
          return {
            ...player,
            hand: updatedHand,
          };
        }
        return player;
      });

      currentState = {
        ...currentState,
        players: updatedPlayers,
        playerDeck: updatedPlayerDeck,
      };
    }
  }

  return {
    state: currentState,
    epidemics,
  };
}

/**
 * Infection rate track mapping.
 * Maps infection rate positions (1-7) to the number of infection cards to draw.
 * Position 1 (start) = 2 cards, gradually increasing to position 7 = 4 cards.
 */
const INFECTION_RATE_TRACK: readonly number[] = [2, 2, 2, 3, 3, 4, 4];

/**
 * Get the infection rate (number of infection cards to draw) for a given position.
 *
 * @param position - The position on the infection rate track (1-7)
 * @returns The number of infection cards to draw at this position
 * @throws Error if position is out of range
 */
export function getInfectionRate(position: number): number {
  if (position < 1 || position > 7) {
    throw new Error(`Invalid infection rate position: ${position}. Must be between 1 and 7.`);
  }

  // Convert 1-based position to 0-based array index
  const rate = INFECTION_RATE_TRACK[position - 1];

  if (rate === undefined) {
    throw new Error(`No infection rate defined for position ${position}`);
  }

  return rate;
}

/**
 * Enforce the 7-card hand limit by discarding specified cards.
 * Players must discard down to 7 cards if they have more than 7.
 *
 * @param state - The current game state
 * @param playerIndex - Index of the player whose hand to check (defaults to current player)
 * @param cardsToDiscard - Array of card indices to discard (0-based, relative to player's hand)
 * @returns ActionResult with updated state or error message
 */
export function enforceHandLimit(
  state: GameState,
  playerIndex?: number,
  cardsToDiscard: number[] = [],
): { success: true; state: GameState } | { success: false; error: string } {
  // Default to current player if no index specified
  const targetPlayerIndex = playerIndex ?? state.currentPlayerIndex;

  // Validate player index
  const player = state.players[targetPlayerIndex];
  if (!player) {
    return {
      success: false,
      error: `Invalid player index: ${targetPlayerIndex}`,
    };
  }

  const handSize = player.hand.length;

  // If hand size is 7 or less, no action needed
  if (handSize <= 7) {
    return {
      success: true,
      state,
    };
  }

  // Calculate how many cards need to be discarded
  const cardsToDiscardCount = handSize - 7;

  // Validate that the correct number of cards are being discarded
  if (cardsToDiscard.length !== cardsToDiscardCount) {
    return {
      success: false,
      error: `Must discard exactly ${cardsToDiscardCount} card(s) to reach hand limit of 7 (currently have ${handSize})`,
    };
  }

  // Validate that all indices are valid and unique
  const uniqueIndices = new Set(cardsToDiscard);
  if (uniqueIndices.size !== cardsToDiscard.length) {
    return {
      success: false,
      error: "Cannot discard the same card multiple times",
    };
  }

  for (const index of cardsToDiscard) {
    if (index < 0 || index >= handSize) {
      return {
        success: false,
        error: `Invalid card index: ${index} (hand has ${handSize} cards)`,
      };
    }
  }

  // Get the cards being discarded
  const discardedCards = cardsToDiscard
    .map((index) => player.hand[index])
    .filter((card) => card !== undefined);

  // Create new hand without the discarded cards
  const updatedHand = player.hand.filter((_, index) => !cardsToDiscard.includes(index));

  // Update the player's hand
  const updatedPlayers = state.players.map((p, index) => {
    if (index === targetPlayerIndex) {
      return {
        ...p,
        hand: updatedHand,
      };
    }
    return p;
  });

  return {
    success: true,
    state: {
      ...state,
      players: updatedPlayers,
      playerDiscard: [...state.playerDiscard, ...discardedCards],
    },
  };
}
