// Event card implementations
import { EventType, GameStatus, type EventCard, type GameState } from "./types";

/**
 * Result type for event actions
 */
export type EventResult<T = GameState> =
  | { success: true; state: T }
  | { success: false; error: string };

/**
 * Play an event card from the current player's hand.
 * Event cards can be played at any time (even during other players' turns)
 * and do not cost an action.
 *
 * @param state - The current game state
 * @param eventType - The type of event card to play
 * @param playerIndex - Index of the player playing the event (defaults to current player)
 * @returns EventResult with updated state or error message
 */
export function playEventCard(
  state: GameState,
  eventType: EventType,
  playerIndex?: number,
): EventResult {
  // Event cards can be played at any time, but not if the game is over
  if (state.status !== GameStatus.Ongoing) {
    return {
      success: false,
      error: `Cannot play event card: game has ended with status ${state.status}`,
    };
  }

  // Default to current player if not specified
  const actingPlayerIndex = playerIndex ?? state.currentPlayerIndex;
  const player = state.players[actingPlayerIndex];

  if (!player) {
    return {
      success: false,
      error: `Invalid player index: ${actingPlayerIndex}`,
    };
  }

  // Check if the player has the event card in their hand
  const eventCardIndex = player.hand.findIndex(
    (card) => card.type === "event" && card.event === eventType,
  );

  // If not in hand, check if it's stored on Contingency Planner's role card
  const isStoredEvent =
    eventCardIndex === -1 &&
    player.storedEventCard !== undefined &&
    player.storedEventCard.event === eventType;

  if (eventCardIndex === -1 && !isStoredEvent) {
    return {
      success: false,
      error: `Player does not have ${eventType} event card in hand or stored`,
    };
  }

  // Remove the event card from the player's hand or stored card
  const updatedPlayers = [...state.players];
  let discardedCard: EventCard;

  if (isStoredEvent && player.storedEventCard) {
    // Playing stored event from Contingency Planner
    discardedCard = player.storedEventCard;
    updatedPlayers[actingPlayerIndex] = {
      ...player,
      storedEventCard: undefined, // Remove stored card
    };
  } else {
    // Playing from hand
    discardedCard = player.hand[eventCardIndex] as EventCard;
    const updatedHand = player.hand.filter((_, index) => index !== eventCardIndex);
    updatedPlayers[actingPlayerIndex] = {
      ...player,
      hand: updatedHand,
    };
  }

  // If the event was stored by Contingency Planner, it's removed from the game
  // Otherwise, it goes to the player discard pile
  const updatedPlayerDiscard = isStoredEvent
    ? state.playerDiscard // Don't add to discard - remove from game
    : [...state.playerDiscard, discardedCard];

  const newState: GameState = {
    ...state,
    players: updatedPlayers,
    playerDiscard: updatedPlayerDiscard,
  };

  // Event card has been removed from hand/storage and discarded (or removed)
  // The specific event effect will be implemented in separate functions
  // For now, this function just handles the card removal and discard logic

  return {
    success: true,
    state: newState,
  };
}

/**
 * Check if a player has a specific event card (in hand or stored).
 *
 * @param state - The current game state
 * @param eventType - The type of event card to check for
 * @param playerIndex - Index of the player to check (defaults to current player)
 * @returns True if the player has the event card
 */
export function hasEventCard(
  state: GameState,
  eventType: EventType,
  playerIndex?: number,
): boolean {
  const actingPlayerIndex = playerIndex ?? state.currentPlayerIndex;
  const player = state.players[actingPlayerIndex];

  if (!player) {
    return false;
  }

  // Check hand
  const hasInHand = player.hand.some((card) => card.type === "event" && card.event === eventType);

  // Check stored card (Contingency Planner only)
  const hasStored = player.storedEventCard?.event === eventType;

  return hasInHand || hasStored;
}

/**
 * Play the Airlift event card.
 * Move any 1 pawn to any city.
 *
 * @param state - The current game state
 * @param targetPlayerIndex - Index of the player to move
 * @param destinationCity - Name of the city to move the player to
 * @param eventPlayerIndex - Index of the player playing the event (defaults to current player)
 * @returns EventResult with updated state or error message
 */
export function airlift(
  state: GameState,
  targetPlayerIndex: number,
  destinationCity: string,
  eventPlayerIndex?: number,
): EventResult {
  // First, play the event card (handles validation and card removal)
  const playResult = playEventCard(state, EventType.Airlift, eventPlayerIndex);
  if (!playResult.success) {
    return playResult;
  }

  // Validate target player index
  const targetPlayer = playResult.state.players[targetPlayerIndex];
  if (!targetPlayer) {
    return {
      success: false,
      error: `Invalid target player index: ${targetPlayerIndex}`,
    };
  }

  // Validate destination city exists on the board
  const cityState = playResult.state.board[destinationCity];
  if (cityState === undefined) {
    return {
      success: false,
      error: `Invalid destination city: ${destinationCity}`,
    };
  }

  // Move the target player to the destination city
  const updatedPlayers = [...playResult.state.players];
  updatedPlayers[targetPlayerIndex] = {
    ...targetPlayer,
    location: destinationCity,
  };

  return {
    success: true,
    state: {
      ...playResult.state,
      players: updatedPlayers,
    },
  };
}

/**
 * Play the Government Grant event card.
 * Build a research station in any city (no card discard needed, no pawn needs to be there).
 * If all 6 stations are already placed, may move one.
 *
 * @param state - The current game state
 * @param targetCity - Name of the city to build the research station in
 * @param cityToRemoveStation - Optional: city to remove station from (required if 6 stations already built)
 * @param eventPlayerIndex - Index of the player playing the event (defaults to current player)
 * @returns EventResult with updated state or error message
 */
export function governmentGrant(
  state: GameState,
  targetCity: string,
  cityToRemoveStation?: string,
  eventPlayerIndex?: number,
): EventResult {
  // First, play the event card (handles validation and card removal)
  const playResult = playEventCard(state, EventType.GovernmentGrant, eventPlayerIndex);
  if (!playResult.success) {
    return playResult;
  }

  // Validate target city exists on the board
  const targetCityState = playResult.state.board[targetCity];
  if (targetCityState === undefined) {
    return {
      success: false,
      error: `Invalid target city: ${targetCity}`,
    };
  }

  // Check if target city already has a research station
  if (targetCityState.hasResearchStation) {
    return {
      success: false,
      error: `Cannot build research station in ${targetCity}: research station already exists here`,
    };
  }

  // Count existing research stations
  const existingStations = Object.values(playResult.state.board).filter(
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
    const cityToRemoveState = playResult.state.board[cityToRemoveStation];
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

  // Create updated board
  const updatedBoard: Record<string, typeof targetCityState> = {};
  for (const cityName in playResult.state.board) {
    const cityState = playResult.state.board[cityName];
    if (cityState !== undefined) {
      if (cityName === targetCity) {
        // Add research station to target city
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

  return {
    success: true,
    state: {
      ...playResult.state,
      board: updatedBoard,
    },
  };
}

/**
 * Play the One Quiet Night event card.
 * Skip the next Infect Cities phase entirely.
 *
 * @param state - The current game state
 * @param eventPlayerIndex - Index of the player playing the event (defaults to current player)
 * @returns EventResult with updated state or error message
 */
export function oneQuietNight(state: GameState, eventPlayerIndex?: number): EventResult {
  // First, play the event card (handles validation and card removal)
  const playResult = playEventCard(state, EventType.OneQuietNight, eventPlayerIndex);
  if (!playResult.success) {
    return playResult;
  }

  // Set the flag to skip the next infection phase
  return {
    success: true,
    state: {
      ...playResult.state,
      skipNextInfectionPhase: true,
    },
  };
}

/**
 * Play the Resilient Population event card.
 * Remove 1 card from the Infection discard pile (permanently removed from the game).
 *
 * @param state - The current game state
 * @param cityName - Name of the city card to remove from infection discard
 * @param eventPlayerIndex - Index of the player playing the event (defaults to current player)
 * @returns EventResult with updated state or error message
 */
export function resilientPopulation(
  state: GameState,
  cityName: string,
  eventPlayerIndex?: number,
): EventResult {
  // First, play the event card (handles validation and card removal)
  const playResult = playEventCard(state, EventType.ResilientPopulation, eventPlayerIndex);
  if (!playResult.success) {
    return playResult;
  }

  // Check if the specified card exists in the infection discard pile
  const cardIndex = playResult.state.infectionDiscard.findIndex((card) => card.city === cityName);

  if (cardIndex === -1) {
    return {
      success: false,
      error: `Cannot remove ${cityName} from infection discard: card not found in discard pile`,
    };
  }

  // Remove the card from the infection discard pile (permanently removed from game)
  const updatedInfectionDiscard = playResult.state.infectionDiscard.filter(
    (_, index) => index !== cardIndex,
  );

  return {
    success: true,
    state: {
      ...playResult.state,
      infectionDiscard: updatedInfectionDiscard,
    },
  };
}
