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
