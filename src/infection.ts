// Infection phase logic including cube placement and outbreak detection
import { CureStatus, GameStatus, Role, type DiseaseColor, type GameState } from "./types";
import { getInfectionRate } from "./game";
import { getCity } from "./board";

/**
 * Check if cube placement should be prevented in a city due to Quarantine Specialist.
 * The Quarantine Specialist prevents cube placement in their current city and all adjacent cities.
 *
 * @param state - The current game state
 * @param cityName - The name of the city where cube would be placed
 * @returns true if cube placement should be prevented, false otherwise
 */
function isQuarantined(state: GameState, cityName: string): boolean {
  // Check if any player is a Quarantine Specialist
  for (const player of state.players) {
    if (player.role === Role.QuarantineSpecialist) {
      // Check if the city is the Quarantine Specialist's location
      if (player.location === cityName) {
        return true;
      }

      // Check if the city is adjacent to the Quarantine Specialist's location
      const qsCity = getCity(player.location);
      if (qsCity && qsCity.connections.includes(cityName)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Result of executing the infection phase
 */
export interface InfectionPhaseResult {
  /** Updated game state after infection */
  state: GameState;
  /** Cards that were drawn during infection */
  cardsDrawn: Array<{ city: string; color: DiseaseColor }>;
}

/**
 * Internal state for outbreak processing
 */
interface OutbreakState {
  /** The board state being modified */
  board: Record<string, GameState["board"][string]>;
  /** Cube supply being modified */
  cubeSupply: Record<DiseaseColor, number>;
  /** Outbreak counter */
  outbreakCount: number;
  /** Game status (may become Lost) */
  status: GameStatus;
  /** Set of cities that have already outbroken in this chain */
  outbrokenCities: Set<string>;
}

/**
 * Trigger an outbreak in a city, spreading disease to adjacent cities.
 * This function is recursive and handles chain reactions.
 *
 * Rules:
 * - Do NOT place the 4th cube that triggered the outbreak
 * - Increment outbreak counter by 1
 * - Place 1 cube of outbreak color on every adjacent city
 * - If adjacent city also has 3+ cubes of that color, it outbreaks too (chain reaction)
 * - A city can only outbreak once per chain (tracked via Set)
 * - Game is lost if outbreak count reaches 8
 * - Game is lost if cube supply is exhausted
 *
 * @param cityName - The city that is outbreaking
 * @param color - The disease color that is outbreaking
 * @param state - The current outbreak state (modified in place for efficiency)
 * @param cures - The cure status for each disease
 * @param gameState - The full game state (needed for Quarantine Specialist check)
 */
function processOutbreak(
  cityName: string,
  color: DiseaseColor,
  state: OutbreakState,
  cures: Record<DiseaseColor, CureStatus>,
  gameState: GameState,
): void {
  // Check if city has already outbroken in this chain
  if (state.outbrokenCities.has(cityName)) {
    return;
  }

  // Mark this city as having outbroken
  state.outbrokenCities.add(cityName);

  // Increment outbreak counter
  state.outbreakCount++;

  // Check for loss condition (8 outbreaks)
  if (state.outbreakCount >= 8) {
    state.status = GameStatus.Lost;
    return; // Stop processing further outbreaks
  }

  // Get adjacent cities
  const city = getCity(cityName);
  if (!city) {
    throw new Error(`City ${cityName} not found`);
  }

  // Place 1 cube on each adjacent city
  for (const adjacentCityName of city.connections) {
    // Skip if the disease is eradicated
    if (cures[color] === CureStatus.Eradicated) {
      continue;
    }

    // Skip if the adjacent city is quarantined by Quarantine Specialist
    if (isQuarantined(gameState, adjacentCityName)) {
      continue;
    }

    // Check cube supply
    const currentSupply = state.cubeSupply[color];
    if (currentSupply === undefined) {
      throw new Error(`Invalid disease color: ${color}`);
    }

    if (currentSupply <= 0) {
      // Game is lost due to cube supply exhaustion
      state.status = GameStatus.Lost;
      return; // Stop processing
    }

    // Get adjacent city state (clone if needed)
    const adjacentCityState = state.board[adjacentCityName];
    if (adjacentCityState === undefined) {
      throw new Error(`Adjacent city ${adjacentCityName} not found`);
    }

    // Clone city state if not already done
    if (adjacentCityState === state.board[adjacentCityName]) {
      state.board[adjacentCityName] = { ...adjacentCityState };
    }

    const updatedAdjacentState = state.board[adjacentCityName];
    if (updatedAdjacentState === undefined) {
      throw new Error(`Adjacent city ${adjacentCityName} not found after cloning`);
    }

    const currentCubes = updatedAdjacentState[color];

    // Check if this would trigger a chain reaction outbreak
    if (currentCubes >= 3) {
      // Chain reaction: adjacent city also outbreaks
      processOutbreak(adjacentCityName, color, state, cures, gameState);

      // If game was lost during recursion, stop processing
      if (state.status === GameStatus.Lost) {
        return;
      }
    } else {
      // Normal case: place 1 cube
      updatedAdjacentState[color] = currentCubes + 1;
      state.cubeSupply[color] = currentSupply - 1;
    }
  }
}

/**
 * Result of resolving an epidemic card
 */
export interface EpidemicResult {
  /** Updated game state after epidemic resolution */
  state: GameState;
  /** The city that was infected (from bottom of deck) */
  infectedCity: string;
  /** The color of the disease spread */
  infectedColor: DiseaseColor;
}

/**
 * Resolve an epidemic card.
 * Performs the 3-step epidemic process:
 * 1. Increase: advance infection rate marker by 1
 * 2. Infect: draw bottom card of infection deck, place 3 cubes (may trigger outbreak)
 * 3. Intensify: shuffle infection discard pile and place on top of infection draw deck
 *
 * @param state - The current game state
 * @returns EpidemicResult with updated state and information about the infected city
 * @throws Error if infection deck is empty
 */
export function resolveEpidemic(state: GameState): EpidemicResult {
  // Step 1: Increase infection rate marker
  const newInfectionRatePosition = Math.min(state.infectionRatePosition + 1, 7);

  // Step 2: Infect - draw bottom card from infection deck
  if (state.infectionDeck.length === 0) {
    throw new Error("Cannot resolve epidemic: infection deck is empty");
  }

  const bottomCard = state.infectionDeck[state.infectionDeck.length - 1];
  if (!bottomCard) {
    throw new Error("Cannot resolve epidemic: infection deck is empty");
  }

  // Remove bottom card from deck
  const updatedInfectionDeck = state.infectionDeck.slice(0, -1);

  // Place 3 cubes on the city (may trigger outbreak)
  // Clone board and cube supply
  const updatedBoard = { ...state.board };
  const updatedCubeSupply = { ...state.cubeSupply };
  let gameStatus = state.status;
  let outbreakCount = state.outbreakCount;

  // Check if disease is eradicated or city is quarantined
  const cureStatus = state.cures[bottomCard.color];
  const isQuarantinedCity = isQuarantined(state, bottomCard.city);
  if (cureStatus !== CureStatus.Eradicated && !isQuarantinedCity) {
    // Get the city state (clone it to avoid mutation)
    const cityState = updatedBoard[bottomCard.city];
    if (cityState === undefined) {
      throw new Error(`City ${bottomCard.city} not found on board`);
    }

    // Clone city state
    updatedBoard[bottomCard.city] = { ...cityState };
    const updatedCityState = updatedBoard[bottomCard.city];
    if (updatedCityState === undefined) {
      throw new Error(`City ${bottomCard.city} not found on board after cloning`);
    }

    const currentCubes = updatedCityState[bottomCard.color];

    // We need to place 3 cubes - this may trigger outbreak
    // Check if placing any of these cubes would exceed 3
    const cubesToPlace = 3;
    const finalCubeCount = currentCubes + cubesToPlace;

    if (finalCubeCount > 3) {
      // Will trigger outbreak
      // First, place cubes up to 3
      const cubesToPlaceBeforeOutbreak = 3 - currentCubes;
      if (cubesToPlaceBeforeOutbreak > 0) {
        const currentSupply = updatedCubeSupply[bottomCard.color];
        if (currentSupply === undefined) {
          throw new Error(`Invalid disease color: ${bottomCard.color}`);
        }

        if (currentSupply < cubesToPlaceBeforeOutbreak) {
          gameStatus = GameStatus.Lost;
        } else {
          updatedCityState[bottomCard.color] = 3;
          updatedCubeSupply[bottomCard.color] = currentSupply - cubesToPlaceBeforeOutbreak;
        }
      }

      // Trigger outbreak for remaining cubes
      if (gameStatus !== GameStatus.Lost) {
        const outbreakState: OutbreakState = {
          board: updatedBoard,
          cubeSupply: updatedCubeSupply,
          outbreakCount: outbreakCount,
          status: gameStatus,
          outbrokenCities: new Set<string>(),
        };

        processOutbreak(bottomCard.city, bottomCard.color, outbreakState, state.cures, state);

        gameStatus = outbreakState.status;
        outbreakCount = outbreakState.outbreakCount;
      }
    } else {
      // Can place all 3 cubes without outbreak
      const currentSupply = updatedCubeSupply[bottomCard.color];
      if (currentSupply === undefined) {
        throw new Error(`Invalid disease color: ${bottomCard.color}`);
      }

      if (currentSupply < cubesToPlace) {
        gameStatus = GameStatus.Lost;
      } else {
        updatedCityState[bottomCard.color] = finalCubeCount;
        updatedCubeSupply[bottomCard.color] = currentSupply - cubesToPlace;
      }
    }
  }

  // Add bottom card to discard pile
  const updatedInfectionDiscard = [...state.infectionDiscard, bottomCard];

  // Step 3: Intensify - shuffle discard pile and place on top of draw deck
  const shuffledDiscard = [...updatedInfectionDiscard];
  // Shuffle using Fisher-Yates algorithm
  for (let i = shuffledDiscard.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const cardI = shuffledDiscard[i];
    const cardJ = shuffledDiscard[j];
    if (cardI !== undefined && cardJ !== undefined) {
      shuffledDiscard[i] = cardJ;
      shuffledDiscard[j] = cardI;
    }
  }

  // Place shuffled discard on top of infection draw deck
  const finalInfectionDeck = [...shuffledDiscard, ...updatedInfectionDeck];

  return {
    state: {
      ...state,
      infectionRatePosition: newInfectionRatePosition,
      board: updatedBoard,
      cubeSupply: updatedCubeSupply,
      infectionDeck: finalInfectionDeck,
      infectionDiscard: [], // Discard pile is now empty
      outbreakCount: outbreakCount,
      status: gameStatus,
    },
    infectedCity: bottomCard.city,
    infectedColor: bottomCard.color,
  };
}

/**
 * Execute the infection phase of a turn.
 * Draws infection cards equal to the current infection rate and places 1 cube per card.
 *
 * Rules:
 * - Draw N cards from infection deck where N = infection rate for current position
 * - For each card, place 1 cube of matching color on that city
 * - Skip cube placement for eradicated diseases (card still drawn and discarded)
 * - If placing a cube would exceed 3 cubes, an outbreak occurs (not yet implemented)
 * - If cube supply is exhausted, game is lost immediately
 * - All drawn cards are discarded after resolution
 *
 * @param state - The current game state
 * @returns InfectionPhaseResult with updated state and cards drawn
 * @throws Error if infection deck doesn't have enough cards
 */
export function executeInfectionPhase(state: GameState): InfectionPhaseResult {
  // Check if the infection phase should be skipped (One Quiet Night event)
  if (state.skipNextInfectionPhase) {
    // Skip the infection phase but clear the flag
    return {
      state: {
        ...state,
        skipNextInfectionPhase: false,
      },
      cardsDrawn: [],
    };
  }

  // Get the current infection rate
  const rate = getInfectionRate(state.infectionRatePosition);

  // Check if infection deck has enough cards
  if (state.infectionDeck.length < rate) {
    throw new Error(
      `Infection deck doesn't have enough cards: need ${rate}, have ${state.infectionDeck.length}`,
    );
  }

  // Clone the state to avoid mutation
  const updatedBoard = { ...state.board };
  const updatedCubeSupply = { ...state.cubeSupply };
  const cardsDrawn: Array<{ city: string; color: DiseaseColor }> = [];

  // Draw and process N cards
  const drawnCards = state.infectionDeck.slice(0, rate);
  const remainingDeck = state.infectionDeck.slice(rate);
  const updatedDiscard = [...state.infectionDiscard, ...drawnCards];

  let gameStatus = state.status;
  let outbreakCount = state.outbreakCount;

  for (const card of drawnCards) {
    cardsDrawn.push({ city: card.city, color: card.color });

    // Check if disease is eradicated
    const cureStatus = state.cures[card.color];
    if (cureStatus === CureStatus.Eradicated) {
      // Skip cube placement but card is still drawn and discarded
      continue;
    }

    // Check if city is quarantined by Quarantine Specialist
    if (isQuarantined(state, card.city)) {
      // Skip cube placement but card is still drawn and discarded
      continue;
    }

    // Get the city state (clone it to avoid mutation)
    const cityState = updatedBoard[card.city];
    if (cityState === undefined) {
      throw new Error(`City ${card.city} not found on board`);
    }

    // Clone city state if not already cloned
    if (cityState === state.board[card.city]) {
      updatedBoard[card.city] = { ...cityState };
    }

    const updatedCityState = updatedBoard[card.city];
    if (updatedCityState === undefined) {
      throw new Error(`City ${card.city} not found on board after cloning`);
    }

    // Check current cube count for this color
    const currentCubes = updatedCityState[card.color];

    // Check if this would trigger an outbreak (4th cube)
    if (currentCubes >= 3) {
      // Trigger outbreak
      const outbreakState: OutbreakState = {
        board: updatedBoard,
        cubeSupply: updatedCubeSupply,
        outbreakCount: outbreakCount,
        status: gameStatus,
        outbrokenCities: new Set<string>(),
      };

      processOutbreak(card.city, card.color, outbreakState, state.cures, state);

      // Update from outbreak state
      gameStatus = outbreakState.status;
      outbreakCount = outbreakState.outbreakCount;

      // If game was lost during outbreak, stop processing
      if (gameStatus === GameStatus.Lost) {
        break;
      }
    } else {
      // Normal case: place 1 cube
      // Check cube supply
      const currentSupply = updatedCubeSupply[card.color];
      if (currentSupply === undefined) {
        throw new Error(`Invalid disease color: ${card.color}`);
      }

      if (currentSupply <= 0) {
        // Game is lost due to cube supply exhaustion
        gameStatus = GameStatus.Lost;
        break;
      }

      // Place 1 cube
      updatedCityState[card.color] = currentCubes + 1;
      updatedCubeSupply[card.color] = currentSupply - 1;
    }
  }

  return {
    state: {
      ...state,
      board: updatedBoard,
      cubeSupply: updatedCubeSupply,
      infectionDeck: remainingDeck,
      infectionDiscard: updatedDiscard,
      outbreakCount: outbreakCount,
      status: gameStatus,
    },
    cardsDrawn,
  };
}
