// Player action implementations
import { getCity } from "./board";
import { getCurrentPlayer } from "./game";
import {
  CureStatus,
  Disease,
  EventType,
  GameStatus,
  Role,
  TurnPhase,
  type DiseaseColor,
  type GameState,
} from "./types";

/**
 * Result type for actions that can succeed or fail
 */
export type ActionResult<T = GameState> =
  | { success: true; state: T }
  | { success: false; error: string };

/**
 * Medic's passive ability: automatically remove all cubes of cured diseases from the city.
 * This is triggered when:
 * 1. The Medic moves into a city
 * 2. A disease is cured while the Medic is in a city with cubes of that color
 *
 * @param state - The current game state
 * @param playerIndex - Index of the player (must be Medic)
 * @param cityName - Name of the city to auto-clear
 * @returns Updated game state with cubes removed
 */
function applyMedicPassive(state: GameState, playerIndex: number, cityName: string): GameState {
  const player = state.players[playerIndex];
  if (!player || player.role !== Role.Medic) {
    return state;
  }

  const cityState = state.board[cityName];
  if (!cityState) {
    return state;
  }

  // Find all cured diseases with cubes in this city
  const colors: DiseaseColor[] = [Disease.Blue, Disease.Yellow, Disease.Black, Disease.Red];
  let updatedState = state;

  for (const color of colors) {
    const cureStatus = state.cures[color];
    const cubeCount = cityState[color];

    // Only auto-remove if disease is cured (or eradicated) and there are cubes
    if (
      (cureStatus === CureStatus.Cured || cureStatus === CureStatus.Eradicated) &&
      cubeCount > 0
    ) {
      // Remove all cubes of this color
      const updatedBoard = { ...updatedState.board };
      updatedBoard[cityName] = {
        ...cityState,
        [color]: 0,
      };

      // Return cubes to supply
      const currentSupply = updatedState.cubeSupply[color];
      if (currentSupply !== undefined) {
        const updatedCubeSupply = {
          ...updatedState.cubeSupply,
          [color]: currentSupply + cubeCount,
        };

        updatedState = {
          ...updatedState,
          board: updatedBoard,
          cubeSupply: updatedCubeSupply,
        };
      }
    }
  }

  return updatedState;
}

/**
 * Validate common preconditions for all actions
 * @param state - The current game state
 * @returns Error message if validation fails, null otherwise
 */
function validateActionPreconditions(state: GameState): string | null {
  // Check if game is still ongoing
  if (state.status !== GameStatus.Ongoing) {
    return `Cannot perform action: game has ended with status ${state.status}`;
  }

  // Check if it's the action phase
  if (state.phase !== TurnPhase.Actions) {
    return `Cannot perform action: current phase is ${state.phase}, not actions`;
  }

  // Check if there are actions remaining
  if (state.actionsRemaining <= 0) {
    return "Cannot perform action: no actions remaining this turn";
  }

  return null;
}

/**
 * Drive/Ferry action: Move to an adjacent connected city.
 * No card required. Can only move to cities connected by a line on the board.
 *
 * @param state - The current game state
 * @param destinationCity - The name of the city to move to
 * @returns ActionResult with updated state or error message
 */
export function driveFerry(state: GameState, destinationCity: string): ActionResult {
  // Validate common action preconditions
  const preconditionError = validateActionPreconditions(state);
  if (preconditionError) {
    return { success: false, error: preconditionError };
  }

  // Get current player
  const currentPlayer = getCurrentPlayer(state);
  const currentLocation = currentPlayer.location;

  // Validate destination city exists
  const destination = getCity(destinationCity);
  if (!destination) {
    return {
      success: false,
      error: `Invalid destination: ${destinationCity} is not a valid city`,
    };
  }

  // Validate connection exists
  const currentCity = getCity(currentLocation);
  if (!currentCity) {
    return {
      success: false,
      error: `Invalid current location: ${currentLocation}`,
    };
  }

  if (!currentCity.connections.includes(destinationCity)) {
    return {
      success: false,
      error: `Cannot drive/ferry from ${currentLocation} to ${destinationCity}: cities are not connected`,
    };
  }

  // Create updated state with player moved to destination
  const updatedPlayers = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        location: destinationCity,
      };
    }
    return player;
  });

  // Decrement actions remaining
  const actionsRemaining = state.actionsRemaining - 1;

  let newState = {
    ...state,
    players: updatedPlayers,
    actionsRemaining,
  };

  // Apply Medic's passive ability (auto-remove cured disease cubes)
  newState = applyMedicPassive(newState, state.currentPlayerIndex, destinationCity);

  return {
    success: true,
    state: newState,
  };
}

/**
 * Direct Flight action: Discard a city card to move directly to that city.
 * Requires the player to have the city card in their hand.
 *
 * @param state - The current game state
 * @param destinationCity - The name of the city to fly to
 * @returns ActionResult with updated state or error message
 */
export function directFlight(state: GameState, destinationCity: string): ActionResult {
  // Validate common action preconditions
  const preconditionError = validateActionPreconditions(state);
  if (preconditionError) {
    return { success: false, error: preconditionError };
  }

  // Get current player
  const currentPlayer = getCurrentPlayer(state);

  // Validate destination city exists
  const destination = getCity(destinationCity);
  if (!destination) {
    return {
      success: false,
      error: `Invalid destination: ${destinationCity} is not a valid city`,
    };
  }

  // Check if player has the city card in their hand
  const cardIndex = currentPlayer.hand.findIndex(
    (card) => card.type === "city" && card.city === destinationCity,
  );

  if (cardIndex === -1) {
    return {
      success: false,
      error: `Cannot direct flight to ${destinationCity}: player does not have that city card`,
    };
  }

  // Remove the card from player's hand and add to discard pile
  const updatedHand = currentPlayer.hand.filter((_, index) => index !== cardIndex);
  const discardedCard = currentPlayer.hand[cardIndex];

  // Create updated state with player moved and card discarded
  const updatedPlayers = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        location: destinationCity,
        hand: updatedHand,
      };
    }
    return player;
  });

  // Decrement actions remaining
  const actionsRemaining = state.actionsRemaining - 1;

  let newState = {
    ...state,
    players: updatedPlayers,
    actionsRemaining,
    playerDiscard: discardedCard ? [...state.playerDiscard, discardedCard] : state.playerDiscard,
  };

  // Apply Medic's passive ability (auto-remove cured disease cubes)
  newState = applyMedicPassive(newState, state.currentPlayerIndex, destinationCity);

  return {
    success: true,
    state: newState,
  };
}

/**
 * Charter Flight action: Discard the city card matching the current location to move to any city.
 * Requires the player to have the card for their current location.
 *
 * @param state - The current game state
 * @param destinationCity - The name of the city to fly to
 * @returns ActionResult with updated state or error message
 */
export function charterFlight(state: GameState, destinationCity: string): ActionResult {
  // Validate common action preconditions
  const preconditionError = validateActionPreconditions(state);
  if (preconditionError) {
    return { success: false, error: preconditionError };
  }

  // Get current player
  const currentPlayer = getCurrentPlayer(state);
  const currentLocation = currentPlayer.location;

  // Validate destination city exists
  const destination = getCity(destinationCity);
  if (!destination) {
    return {
      success: false,
      error: `Invalid destination: ${destinationCity} is not a valid city`,
    };
  }

  // Check if player has the current location card in their hand
  const cardIndex = currentPlayer.hand.findIndex(
    (card) => card.type === "city" && card.city === currentLocation,
  );

  if (cardIndex === -1) {
    return {
      success: false,
      error: `Cannot charter flight from ${currentLocation}: player does not have that city card`,
    };
  }

  // Remove the card from player's hand and add to discard pile
  const updatedHand = currentPlayer.hand.filter((_, index) => index !== cardIndex);
  const discardedCard = currentPlayer.hand[cardIndex];

  // Create updated state with player moved and card discarded
  const updatedPlayers = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        location: destinationCity,
        hand: updatedHand,
      };
    }
    return player;
  });

  // Decrement actions remaining
  const actionsRemaining = state.actionsRemaining - 1;

  let newState = {
    ...state,
    players: updatedPlayers,
    actionsRemaining,
    playerDiscard: discardedCard ? [...state.playerDiscard, discardedCard] : state.playerDiscard,
  };

  // Apply Medic's passive ability (auto-remove cured disease cubes)
  newState = applyMedicPassive(newState, state.currentPlayerIndex, destinationCity);

  return {
    success: true,
    state: newState,
  };
}

/**
 * Shuttle Flight action: Move between two cities that both have research stations.
 * No card required. Both current location and destination must have research stations.
 *
 * @param state - The current game state
 * @param destinationCity - The name of the city to move to
 * @returns ActionResult with updated state or error message
 */
export function shuttleFlight(state: GameState, destinationCity: string): ActionResult {
  // Validate common action preconditions
  const preconditionError = validateActionPreconditions(state);
  if (preconditionError) {
    return { success: false, error: preconditionError };
  }

  // Get current player
  const currentPlayer = getCurrentPlayer(state);
  const currentLocation = currentPlayer.location;

  // Validate destination city exists
  const destination = getCity(destinationCity);
  if (!destination) {
    return {
      success: false,
      error: `Invalid destination: ${destinationCity} is not a valid city`,
    };
  }

  // Check if current location has a research station
  const currentCityState = state.board[currentLocation];
  if (!currentCityState) {
    return {
      success: false,
      error: `Invalid current location: ${currentLocation}`,
    };
  }

  if (!currentCityState.hasResearchStation) {
    return {
      success: false,
      error: `Cannot shuttle flight from ${currentLocation}: no research station at current location`,
    };
  }

  // Check if destination has a research station
  const destinationCityState = state.board[destinationCity];
  if (!destinationCityState) {
    return {
      success: false,
      error: `Invalid destination: ${destinationCity}`,
    };
  }

  if (!destinationCityState.hasResearchStation) {
    return {
      success: false,
      error: `Cannot shuttle flight to ${destinationCity}: no research station at destination`,
    };
  }

  // Create updated state with player moved to destination
  const updatedPlayers = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        location: destinationCity,
      };
    }
    return player;
  });

  // Decrement actions remaining
  const actionsRemaining = state.actionsRemaining - 1;

  let newState = {
    ...state,
    players: updatedPlayers,
    actionsRemaining,
  };

  // Apply Medic's passive ability (auto-remove cured disease cubes)
  newState = applyMedicPassive(newState, state.currentPlayerIndex, destinationCity);

  return {
    success: true,
    state: newState,
  };
}

/**
 * Build Research Station action: Discard the city card matching current location to place a research station.
 * Operations Expert: Can build without discarding a card.
 * If all 6 research stations are already on the board, must also specify a city to remove one from.
 *
 * @param state - The current game state
 * @param cityToRemoveStation - Optional: city to remove station from (required if 6 stations already built)
 * @returns ActionResult with updated state or error message
 */
export function buildResearchStation(state: GameState, cityToRemoveStation?: string): ActionResult {
  // Validate common action preconditions
  const preconditionError = validateActionPreconditions(state);
  if (preconditionError) {
    return { success: false, error: preconditionError };
  }

  // Get current player
  const currentPlayer = getCurrentPlayer(state);
  const currentLocation = currentPlayer.location;

  // Check if current location already has a research station
  const currentCityState = state.board[currentLocation];
  if (!currentCityState) {
    return {
      success: false,
      error: `Invalid current location: ${currentLocation}`,
    };
  }

  if (currentCityState.hasResearchStation) {
    return {
      success: false,
      error: `Cannot build research station in ${currentLocation}: research station already exists here`,
    };
  }

  // Check if player is Operations Expert (can build without card)
  const isOperationsExpert = currentPlayer.role === Role.OperationsExpert;

  // Check if player has the current location card in their hand
  const cardIndex = currentPlayer.hand.findIndex(
    (card) => card.type === "city" && card.city === currentLocation,
  );

  if (cardIndex === -1 && !isOperationsExpert) {
    return {
      success: false,
      error: `Cannot build research station in ${currentLocation}: player does not have that city card`,
    };
  }

  // Count existing research stations
  const existingStations = Object.values(state.board).filter(
    (cityState) => cityState.hasResearchStation,
  ).length;

  // If 6 stations already exist, must remove one
  if (existingStations >= 6) {
    if (!cityToRemoveStation) {
      return {
        success: false,
        error:
          "Cannot build research station: all 6 stations are in use. Must specify a city to remove one from.",
      };
    }

    // Validate the city to remove station from exists and has a station
    const cityToRemoveState = state.board[cityToRemoveStation];
    if (!cityToRemoveState) {
      return {
        success: false,
        error: `Invalid city to remove station from: ${cityToRemoveStation}`,
      };
    }

    if (!cityToRemoveState.hasResearchStation) {
      return {
        success: false,
        error: `Cannot remove research station from ${cityToRemoveStation}: no research station exists there`,
      };
    }
  } else if (cityToRemoveStation) {
    // If less than 6 stations exist, should not specify a city to remove
    return {
      success: false,
      error: "Cannot remove research station: only remove stations when all 6 are in use",
    };
  }

  // Remove the card from player's hand and add to discard pile (if card was used)
  // Operations Expert can build without discarding, even if they have the matching card
  const shouldDiscardCard = cardIndex !== -1 && !isOperationsExpert;
  const updatedHand = shouldDiscardCard
    ? currentPlayer.hand.filter((_, index) => index !== cardIndex)
    : currentPlayer.hand;
  const discardedCard = shouldDiscardCard ? currentPlayer.hand[cardIndex] : undefined;

  // Create updated board
  const updatedBoard: Record<string, typeof currentCityState> = {};
  for (const cityName in state.board) {
    const cityState = state.board[cityName];
    if (cityState !== undefined) {
      if (cityName === currentLocation) {
        // Add research station to current location
        updatedBoard[cityName] = {
          ...cityState,
          hasResearchStation: true,
        };
      } else if (cityName === cityToRemoveStation) {
        // Remove research station from specified city
        updatedBoard[cityName] = {
          ...cityState,
          hasResearchStation: false,
        };
      } else {
        updatedBoard[cityName] = cityState;
      }
    }
  }

  // Update players
  const updatedPlayers = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        hand: updatedHand,
      };
    }
    return player;
  });

  // Decrement actions remaining
  const actionsRemaining = state.actionsRemaining - 1;

  return {
    success: true,
    state: {
      ...state,
      players: updatedPlayers,
      board: updatedBoard,
      actionsRemaining,
      playerDiscard: discardedCard ? [...state.playerDiscard, discardedCard] : state.playerDiscard,
    },
  };
}

/**
 * Treat Disease action: Remove disease cubes from the current city.
 * Removes 1 cube of the specified color, or ALL cubes of that color if the disease is cured.
 * Medic role: Always removes ALL cubes of the specified color (not just 1).
 *
 * @param state - The current game state
 * @param color - The disease color to treat
 * @returns ActionResult with updated state or error message
 */
export function treatDisease(state: GameState, color: DiseaseColor): ActionResult {
  // Validate common action preconditions
  const preconditionError = validateActionPreconditions(state);
  if (preconditionError) {
    return { success: false, error: preconditionError };
  }

  // Get current player
  const currentPlayer = getCurrentPlayer(state);
  const currentLocation = currentPlayer.location;

  // Get current city state
  const currentCityState = state.board[currentLocation];
  if (!currentCityState) {
    return {
      success: false,
      error: `Invalid current location: ${currentLocation}`,
    };
  }

  // Check if there are cubes of the specified color to treat
  const cubeCount = currentCityState[color];
  if (cubeCount === 0) {
    return {
      success: false,
      error: `Cannot treat ${color} disease in ${currentLocation}: no ${color} cubes present`,
    };
  }

  // Check if disease is cured
  const cureStatus = state.cures[color];
  if (cureStatus === undefined) {
    return {
      success: false,
      error: `Invalid disease color: ${color}`,
    };
  }

  const isCured = cureStatus === "cured" || cureStatus === "eradicated";

  // Determine how many cubes to remove
  // Medic: always removes all cubes
  // Others: remove all if cured, otherwise 1
  const isMedic = currentPlayer.role === "medic";
  const cubesToRemove = isCured || isMedic ? cubeCount : 1;

  // Create updated board
  const updatedBoard: Record<string, typeof currentCityState> = {};
  for (const cityName in state.board) {
    const cityState = state.board[cityName];
    if (cityState !== undefined) {
      if (cityName === currentLocation) {
        updatedBoard[cityName] = {
          ...cityState,
          [color]: cubeCount - cubesToRemove,
        };
      } else {
        updatedBoard[cityName] = cityState;
      }
    }
  }

  // Update cube supply (return cubes to supply)
  const currentSupply = state.cubeSupply[color];
  if (currentSupply === undefined) {
    return {
      success: false,
      error: `Invalid disease color: ${color}`,
    };
  }

  const updatedCubeSupply = {
    ...state.cubeSupply,
    [color]: currentSupply + cubesToRemove,
  };

  // Decrement actions remaining
  const actionsRemaining = state.actionsRemaining - 1;

  return {
    success: true,
    state: {
      ...state,
      board: updatedBoard,
      cubeSupply: updatedCubeSupply,
      actionsRemaining,
    },
  };
}

/**
 * Share Knowledge action: Give or take a city card matching the current city.
 * Both players must be in the same city. The card must match the city they're both in.
 * Researcher role: Can give ANY city card (not just the one matching current city).
 * The receiving player must not exceed the 7-card hand limit.
 *
 * @param state - The current game state
 * @param targetPlayerIndex - Index of the player to share with (0-based)
 * @param giveCard - true to give a card to target player, false to take a card from target player
 * @param cityCard - Optional: specific city card to give (for Researcher giving any card)
 * @returns ActionResult with updated state or error message
 */
export function shareKnowledge(
  state: GameState,
  targetPlayerIndex: number,
  giveCard: boolean,
  cityCard?: string,
): ActionResult {
  // Validate common action preconditions
  const preconditionError = validateActionPreconditions(state);
  if (preconditionError) {
    return { success: false, error: preconditionError };
  }

  // Get current player
  const currentPlayer = getCurrentPlayer(state);
  const currentLocation = currentPlayer.location;

  // Validate target player index
  if (targetPlayerIndex < 0 || targetPlayerIndex >= state.players.length) {
    return {
      success: false,
      error: `Invalid target player index: ${targetPlayerIndex}`,
    };
  }

  // Cannot share with yourself
  if (targetPlayerIndex === state.currentPlayerIndex) {
    return {
      success: false,
      error: "Cannot share knowledge with yourself",
    };
  }

  // Get target player
  const targetPlayer = state.players[targetPlayerIndex];
  if (!targetPlayer) {
    return {
      success: false,
      error: `Invalid target player index: ${targetPlayerIndex}`,
    };
  }

  // Both players must be in the same city
  if (targetPlayer.location !== currentLocation) {
    return {
      success: false,
      error: `Cannot share knowledge: both players must be in the same city (current: ${currentLocation}, target: ${targetPlayer.location})`,
    };
  }

  // Determine giver and receiver
  const giverIndex = giveCard ? state.currentPlayerIndex : targetPlayerIndex;
  const receiverIndex = giveCard ? targetPlayerIndex : state.currentPlayerIndex;
  const giver = state.players[giverIndex];
  const receiver = state.players[receiverIndex];

  if (!giver || !receiver) {
    return {
      success: false,
      error: "Invalid player indices",
    };
  }

  // Validate destination city exists
  const destination = getCity(currentLocation);
  if (!destination) {
    return {
      success: false,
      error: `Invalid current location: ${currentLocation}`,
    };
  }

  // Check if giver is a Researcher and is giving a card
  const isResearcherGiving = giver.role === "researcher" && giveCard;

  // Determine which card to transfer
  let cardToShareCity = currentLocation;
  if (isResearcherGiving && cityCard) {
    // Researcher can give any city card
    cardToShareCity = cityCard;
  }

  // Check if giver has the city card
  const cardIndex = giver.hand.findIndex(
    (card) => card.type === "city" && card.city === cardToShareCity,
  );

  if (cardIndex === -1) {
    const giverRole = giveCard ? "you do" : "they do";
    return {
      success: false,
      error: `Cannot share knowledge: ${giverRole} not have the ${cardToShareCity} city card`,
    };
  }

  // Check hand limit for receiver
  if (receiver.hand.length >= 7) {
    const receiverRole = giveCard ? "target player" : "you";
    return {
      success: false,
      error: `Cannot share knowledge: ${receiverRole} already have 7 cards (hand limit)`,
    };
  }

  // Get the card to transfer
  const cardToTransfer = giver.hand[cardIndex];
  if (!cardToTransfer) {
    return {
      success: false,
      error: `Card not found at index ${cardIndex}`,
    };
  }

  // Create updated players
  const updatedPlayers = state.players.map((player, index) => {
    if (index === giverIndex) {
      // Remove card from giver's hand
      return {
        ...player,
        hand: player.hand.filter((_, i) => i !== cardIndex),
      };
    } else if (index === receiverIndex) {
      // Add card to receiver's hand
      return {
        ...player,
        hand: [...player.hand, cardToTransfer],
      };
    }
    return player;
  });

  // Decrement actions remaining
  const actionsRemaining = state.actionsRemaining - 1;

  return {
    success: true,
    state: {
      ...state,
      players: updatedPlayers,
      actionsRemaining,
    },
  };
}
/**
 * Discover a Cure action: At a research station, discard 5 city cards of the same color to cure that disease.
 * Scientist role: Needs only 4 city cards (instead of 5).
 * If no cubes of that color remain on the board when cured, the disease is eradicated.
 *
 * @param state - The current game state
 * @param color - The disease color to cure
 * @returns ActionResult with updated state or error message
 */
export function discoverCure(state: GameState, color: DiseaseColor): ActionResult {
  // Validate common action preconditions
  const preconditionError = validateActionPreconditions(state);
  if (preconditionError) {
    return { success: false, error: preconditionError };
  }

  // Get current player
  const currentPlayer = getCurrentPlayer(state);
  const currentLocation = currentPlayer.location;

  // Check if current location has a research station
  const currentCityState = state.board[currentLocation];
  if (!currentCityState) {
    return {
      success: false,
      error: `Invalid current location: ${currentLocation}`,
    };
  }

  if (!currentCityState.hasResearchStation) {
    return {
      success: false,
      error: `Cannot discover cure: no research station in ${currentLocation}`,
    };
  }

  // Check if disease is already cured
  const cureStatus = state.cures[color];
  if (cureStatus === undefined) {
    return {
      success: false,
      error: `Invalid disease color: ${color}`,
    };
  }

  if (cureStatus === "cured" || cureStatus === "eradicated") {
    return {
      success: false,
      error: `Cannot discover cure: ${color} disease is already cured`,
    };
  }

  // Find all city cards of the specified color in player's hand
  const cityCardsOfColor = currentPlayer.hand.filter(
    (card) => card.type === "city" && card.color === color,
  );

  // Scientist needs only 4 cards, others need 5
  const isScientist = currentPlayer.role === "scientist";
  const cardsNeeded = isScientist ? 4 : 5;

  // Check if player has enough cards
  if (cityCardsOfColor.length < cardsNeeded) {
    return {
      success: false,
      error: `Cannot discover cure: need ${cardsNeeded} ${color} city cards, but only have ${cityCardsOfColor.length}`,
    };
  }

  // Select cards to discard
  const cardsToDiscard = cityCardsOfColor.slice(0, cardsNeeded);

  // Remove these 5 cards from player's hand
  let remainingHand = [...currentPlayer.hand];
  for (const cardToDiscard of cardsToDiscard) {
    const index = remainingHand.findIndex(
      (card) =>
        card.type === "city" && cardToDiscard.type === "city" && card.city === cardToDiscard.city,
    );
    if (index !== -1) {
      remainingHand = remainingHand.filter((_, i) => i !== index);
    }
  }

  // Update players
  const updatedPlayers = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        hand: remainingHand,
      };
    }
    return player;
  });

  // Mark disease as cured initially (we'll check for eradication after Medic passive)
  const updatedCures = {
    ...state.cures,
    [color]: CureStatus.Cured,
  };

  // Decrement actions remaining
  const actionsRemaining = state.actionsRemaining - 1;

  let newState = {
    ...state,
    players: updatedPlayers,
    cures: updatedCures,
    actionsRemaining,
    playerDiscard: [...state.playerDiscard, ...cardsToDiscard],
  };

  // Apply Medic's passive ability to all Medics' current locations
  // (a newly cured disease triggers auto-clear in any city where a Medic is present)
  for (let i = 0; i < newState.players.length; i++) {
    const player = newState.players[i];
    if (player && player.role === Role.Medic) {
      newState = applyMedicPassive(newState, i, player.location);
    }
  }

  // NOW check if disease should be eradicated (after Medic passive has run)
  let totalCubesOfColor = 0;
  for (const cityName in newState.board) {
    const cityState = newState.board[cityName];
    if (cityState !== undefined) {
      totalCubesOfColor += cityState[color];
    }
  }

  // Update to eradicated if no cubes remain
  if (totalCubesOfColor === 0) {
    newState = {
      ...newState,
      cures: {
        ...newState.cures,
        [color]: CureStatus.Eradicated,
      },
    };
  }

  // Check if all diseases are now cured (win condition)
  const allDiseasesCured = Object.values(newState.cures).every(
    (status) => status === CureStatus.Cured || status === CureStatus.Eradicated,
  );

  return {
    success: true,
    state: {
      ...newState,
      status: allDiseasesCured ? GameStatus.Won : newState.status,
    },
  };
}

/**
 * Dispatcher Move Pawn to Other Pawn: Move any pawn to a city containing another pawn.
 * Does not require discarding a card.
 * The Dispatcher must be the current player to use this ability.
 *
 * @param state - The current game state
 * @param playerToMoveIndex - Index of the player to move (0-based)
 * @param targetPlayerIndex - Index of the player whose city to move to (0-based)
 * @returns ActionResult with updated state or error message
 */
export function dispatcherMoveToOtherPawn(
  state: GameState,
  playerToMoveIndex: number,
  targetPlayerIndex: number,
): ActionResult {
  // Validate common action preconditions
  const preconditionError = validateActionPreconditions(state);
  if (preconditionError) {
    return { success: false, error: preconditionError };
  }

  // Get current player (must be Dispatcher)
  const currentPlayer = getCurrentPlayer(state);

  // Check if current player is Dispatcher
  if (currentPlayer.role !== Role.Dispatcher) {
    return {
      success: false,
      error: "Cannot use Dispatcher ability: current player is not Dispatcher",
    };
  }

  // Validate player to move index
  if (playerToMoveIndex < 0 || playerToMoveIndex >= state.players.length) {
    return {
      success: false,
      error: `Invalid player to move index: ${playerToMoveIndex}`,
    };
  }

  // Validate target player index
  if (targetPlayerIndex < 0 || targetPlayerIndex >= state.players.length) {
    return {
      success: false,
      error: `Invalid target player index: ${targetPlayerIndex}`,
    };
  }

  // Cannot move to the same player
  if (playerToMoveIndex === targetPlayerIndex) {
    return {
      success: false,
      error: "Cannot move player to their own location",
    };
  }

  const playerToMove = state.players[playerToMoveIndex];
  const targetPlayer = state.players[targetPlayerIndex];

  if (!playerToMove || !targetPlayer) {
    return {
      success: false,
      error: "Invalid player indices",
    };
  }

  const destinationCity = targetPlayer.location;

  // Create updated state with player moved to target player's location
  const updatedPlayers = state.players.map((player, index) => {
    if (index === playerToMoveIndex) {
      return {
        ...player,
        location: destinationCity,
      };
    }
    return player;
  });

  // Decrement actions remaining
  const actionsRemaining = state.actionsRemaining - 1;

  let newState = {
    ...state,
    players: updatedPlayers,
    actionsRemaining,
  };

  // Apply Medic's passive ability if the moved player is the Medic
  if (playerToMove.role === Role.Medic) {
    newState = applyMedicPassive(newState, playerToMoveIndex, destinationCity);
  }

  return {
    success: true,
    state: newState,
  };
}

/**
 * Dispatcher Move Other Player: Move another player's pawn as if it were the Dispatcher's own.
 * Can use Drive/Ferry, Direct Flight, Charter Flight, or Shuttle Flight.
 * When using Direct Flight or Charter Flight, can use cards from either the Dispatcher's hand or the other player's hand.
 *
 * @param state - The current game state
 * @param playerToMoveIndex - Index of the player to move (0-based)
 * @param moveType - Type of movement ("drive", "direct", "charter", "shuttle")
 * @param destinationCity - The name of the city to move to
 * @param useOtherPlayerCard - For direct/charter flights: true to use other player's card, false to use Dispatcher's card
 * @returns ActionResult with updated state or error message
 */
export function dispatcherMoveOtherPlayer(
  state: GameState,
  playerToMoveIndex: number,
  moveType: "drive" | "direct" | "charter" | "shuttle",
  destinationCity: string,
  useOtherPlayerCard: boolean = false,
): ActionResult {
  // Validate common action preconditions
  const preconditionError = validateActionPreconditions(state);
  if (preconditionError) {
    return { success: false, error: preconditionError };
  }

  // Get current player (must be Dispatcher)
  const currentPlayer = getCurrentPlayer(state);

  // Check if current player is Dispatcher
  if (currentPlayer.role !== Role.Dispatcher) {
    return {
      success: false,
      error: "Cannot use Dispatcher ability: current player is not Dispatcher",
    };
  }

  // Validate player to move index
  if (playerToMoveIndex < 0 || playerToMoveIndex >= state.players.length) {
    return {
      success: false,
      error: `Invalid player to move index: ${playerToMoveIndex}`,
    };
  }

  const playerToMove = state.players[playerToMoveIndex];
  if (!playerToMove) {
    return {
      success: false,
      error: `Invalid player to move index: ${playerToMoveIndex}`,
    };
  }

  const currentLocation = playerToMove.location;

  // Validate destination city exists
  const destination = getCity(destinationCity);
  if (!destination) {
    return {
      success: false,
      error: `Invalid destination: ${destinationCity} is not a valid city`,
    };
  }

  // Variables for card handling
  let cardHolderIndex: number | null = null;
  let cardIndex = -1;
  let cityCardNeeded: string | null = null;

  // Handle different move types
  if (moveType === "drive") {
    // Drive/Ferry: Check if cities are connected
    const currentCity = getCity(currentLocation);
    if (!currentCity) {
      return {
        success: false,
        error: `Invalid current location: ${currentLocation}`,
      };
    }

    if (!currentCity.connections.includes(destinationCity)) {
      return {
        success: false,
        error: `Cannot drive/ferry from ${currentLocation} to ${destinationCity}: cities are not connected`,
      };
    }
  } else if (moveType === "direct") {
    // Direct Flight: Need the destination city card
    cityCardNeeded = destinationCity;
    cardHolderIndex = useOtherPlayerCard ? playerToMoveIndex : state.currentPlayerIndex;
  } else if (moveType === "charter") {
    // Charter Flight: Need the current location city card
    cityCardNeeded = currentLocation;
    cardHolderIndex = useOtherPlayerCard ? playerToMoveIndex : state.currentPlayerIndex;
  } else if (moveType === "shuttle") {
    // Shuttle Flight: Both cities must have research stations
    const currentCityState = state.board[currentLocation];
    const destinationCityState = state.board[destinationCity];

    if (!currentCityState || !destinationCityState) {
      return {
        success: false,
        error: `Invalid city state`,
      };
    }

    if (!currentCityState.hasResearchStation) {
      return {
        success: false,
        error: `Cannot shuttle flight from ${currentLocation}: no research station at current location`,
      };
    }

    if (!destinationCityState.hasResearchStation) {
      return {
        success: false,
        error: `Cannot shuttle flight to ${destinationCity}: no research station at destination`,
      };
    }
  }

  // Check for required card if needed
  if (cityCardNeeded && cardHolderIndex !== null) {
    const cardHolder = state.players[cardHolderIndex];
    if (!cardHolder) {
      return {
        success: false,
        error: `Invalid card holder index: ${cardHolderIndex}`,
      };
    }

    cardIndex = cardHolder.hand.findIndex(
      (card) => card.type === "city" && card.city === cityCardNeeded,
    );

    if (cardIndex === -1) {
      const cardSource = useOtherPlayerCard ? "other player" : "Dispatcher";
      return {
        success: false,
        error: `Cannot perform ${moveType} flight: ${cardSource} does not have the ${cityCardNeeded} city card`,
      };
    }
  }

  // Create updated players array
  let updatedPlayers = [...state.players];
  let playerDiscard = [...state.playerDiscard];

  // Move the player
  updatedPlayers = updatedPlayers.map((player, index) => {
    if (index === playerToMoveIndex) {
      return {
        ...player,
        location: destinationCity,
      };
    }
    return player;
  });

  // Discard card if needed
  if (cityCardNeeded && cardHolderIndex !== null && cardIndex !== -1) {
    const cardHolder = updatedPlayers[cardHolderIndex];
    if (cardHolder) {
      const discardedCard = cardHolder.hand[cardIndex];
      if (discardedCard) {
        updatedPlayers = updatedPlayers.map((player, index) => {
          if (index === cardHolderIndex) {
            return {
              ...player,
              hand: player.hand.filter((_, i) => i !== cardIndex),
            };
          }
          return player;
        });
        playerDiscard = [...playerDiscard, discardedCard];
      }
    }
  }

  // Decrement actions remaining
  const actionsRemaining = state.actionsRemaining - 1;

  let newState = {
    ...state,
    players: updatedPlayers,
    actionsRemaining,
    playerDiscard,
  };

  // Apply Medic's passive ability if the moved player is the Medic
  if (playerToMove.role === Role.Medic) {
    newState = applyMedicPassive(newState, playerToMoveIndex, destinationCity);
  }

  return {
    success: true,
    state: newState,
  };
}

/**
 * Operations Expert Special Move: From a research station, discard any city card to move to any city.
 * This special move can only be used once per turn.
 * Must be at a research station. Can discard any city card (not just matching city).
 *
 * @param state - The current game state
 * @param destinationCity - The name of the city to move to
 * @param cityCardToDiscard - The name of the city card to discard
 * @returns ActionResult with updated state or error message
 */
export function operationsExpertMove(
  state: GameState,
  destinationCity: string,
  cityCardToDiscard: string,
): ActionResult {
  // Validate common action preconditions
  const preconditionError = validateActionPreconditions(state);
  if (preconditionError) {
    return { success: false, error: preconditionError };
  }

  // Get current player
  const currentPlayer = getCurrentPlayer(state);
  const currentLocation = currentPlayer.location;

  // Check if current player is Operations Expert
  if (currentPlayer.role !== Role.OperationsExpert) {
    return {
      success: false,
      error: "Cannot use Operations Expert special move: current player is not Operations Expert",
    };
  }

  // Check if special move has already been used this turn
  if (state.operationsExpertSpecialMoveUsed) {
    return {
      success: false,
      error: "Cannot use Operations Expert special move: already used once this turn",
    };
  }

  // Check if current location has a research station
  const currentCityState = state.board[currentLocation];
  if (!currentCityState) {
    return {
      success: false,
      error: `Invalid current location: ${currentLocation}`,
    };
  }

  if (!currentCityState.hasResearchStation) {
    return {
      success: false,
      error: `Cannot use Operations Expert special move from ${currentLocation}: no research station at current location`,
    };
  }

  // Validate destination city exists
  const destination = getCity(destinationCity);
  if (!destination) {
    return {
      success: false,
      error: `Invalid destination: ${destinationCity} is not a valid city`,
    };
  }

  // Check if player has the city card to discard
  const cardIndex = currentPlayer.hand.findIndex(
    (card) => card.type === "city" && card.city === cityCardToDiscard,
  );

  if (cardIndex === -1) {
    return {
      success: false,
      error: `Cannot use Operations Expert special move: player does not have the ${cityCardToDiscard} city card`,
    };
  }

  // Remove the card from player's hand and add to discard pile
  const updatedHand = currentPlayer.hand.filter((_, index) => index !== cardIndex);
  const discardedCard = currentPlayer.hand[cardIndex];

  // Create updated state with player moved and card discarded
  const updatedPlayers = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        location: destinationCity,
        hand: updatedHand,
      };
    }
    return player;
  });

  // Decrement actions remaining and mark special move as used
  const actionsRemaining = state.actionsRemaining - 1;

  let newState = {
    ...state,
    players: updatedPlayers,
    actionsRemaining,
    operationsExpertSpecialMoveUsed: true,
    playerDiscard: discardedCard ? [...state.playerDiscard, discardedCard] : state.playerDiscard,
  };

  // Apply Medic's passive ability (auto-remove cured disease cubes)
  newState = applyMedicPassive(newState, state.currentPlayerIndex, destinationCity);

  return {
    success: true,
    state: newState,
  };
}

/**
 * Contingency Planner Special Action: Take an event card from the player discard pile and store it.
 * The stored card does not count toward hand limit.
 * Only 1 event card may be stored at a time.
 * When the stored event is played, it is removed from the game (not discarded).
 *
 * @param state - The current game state
 * @param eventType - The type of event card to take from discard
 * @returns ActionResult with updated state or error message
 */
export function contingencyPlannerTakeEvent(state: GameState, eventType: EventType): ActionResult {
  // Validate common action preconditions
  const preconditionError = validateActionPreconditions(state);
  if (preconditionError) {
    return { success: false, error: preconditionError };
  }

  // Get current player
  const currentPlayer = getCurrentPlayer(state);

  // Check if current player is Contingency Planner
  if (currentPlayer.role !== Role.ContingencyPlanner) {
    return {
      success: false,
      error: "Cannot use Contingency Planner ability: current player is not Contingency Planner",
    };
  }

  // Check if player already has a stored event card
  if (currentPlayer.storedEventCard) {
    return {
      success: false,
      error: "Cannot store event card: Contingency Planner already has a stored event card",
    };
  }

  // Find the event card in the player discard pile
  const eventCardIndex = state.playerDiscard.findIndex(
    (card) => card.type === "event" && card.event === eventType,
  );

  if (eventCardIndex === -1) {
    return {
      success: false,
      error: `Cannot take event card: ${eventType} not found in player discard pile`,
    };
  }

  const eventCard = state.playerDiscard[eventCardIndex];
  if (eventCard?.type !== "event") {
    return {
      success: false,
      error: "Invalid card type: expected event card",
    };
  }

  // Remove the event card from discard pile
  const updatedDiscard = state.playerDiscard.filter((_, index) => index !== eventCardIndex);

  // Store the event card on the player
  const updatedPlayers = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        storedEventCard: eventCard,
      };
    }
    return player;
  });

  // Decrement actions remaining
  const actionsRemaining = state.actionsRemaining - 1;

  const newState = {
    ...state,
    players: updatedPlayers,
    actionsRemaining,
    playerDiscard: updatedDiscard,
  };

  return {
    success: true,
    state: newState,
  };
}
