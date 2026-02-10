// AI Bot Players - Bot interface and implementations

import type { GameState, InfectionCard } from "./types";

/**
 * Interface for AI bot players that can play Pandemic autonomously.
 *
 * Bots receive the full game state (same information a human player sees)
 * and return action strings matching the engine's `getAvailableActions()` format.
 */
export interface Bot {
  /**
   * Choose an action to perform from the list of available actions.
   *
   * @param state - The current game state
   * @param availableActions - Array of action strings from getAvailableActions()
   * @returns The chosen action string (must be from availableActions)
   */
  chooseAction(state: GameState, availableActions: string[]): string;

  /**
   * Choose which cards to discard when the player's hand exceeds the limit.
   *
   * @param state - The current game state
   * @param playerIndex - Index of the player who must discard
   * @param mustDiscard - Number of cards that must be discarded
   * @returns Array of hand indices to discard (0-based, length must equal mustDiscard)
   */
  chooseDiscards(state: GameState, playerIndex: number, mustDiscard: number): number[];

  /**
   * Choose the order to arrange infection cards (for Forecast event card).
   *
   * @param cards - The infection cards to arrange
   * @returns The cards in the desired order (top to bottom of deck)
   */
  chooseForecastOrder(cards: InfectionCard[]): InfectionCard[];
}

/**
 * Helper function to select a random element from an array.
 */
function randomChoice<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error("Cannot choose from empty array");
  }
  const index = Math.floor(Math.random() * array.length);
  const element = array[index];
  if (element === undefined) {
    throw new Error("Unexpected undefined element");
  }
  return element;
}

/**
 * Helper function to shuffle an array using Fisher-Yates algorithm.
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    const swapElement = result[j];
    if (temp !== undefined && swapElement !== undefined) {
      result[i] = swapElement;
      result[j] = temp;
    }
  }
  return result;
}

/**
 * RandomBot selects random actions from available options.
 *
 * This bot is primarily useful for:
 * - Baseline performance comparison
 * - Fuzz testing the game engine for stability
 * - Ensuring the engine handles all valid action sequences
 *
 * Note: RandomBot does NOT play event cards to keep implementation simple.
 */
export class RandomBot implements Bot {
  /**
   * Choose a random non-event action from available actions.
   * Filters out event card actions to keep the bot simple.
   */
  chooseAction(_state: GameState, availableActions: string[]): string {
    // Filter out event card actions (they start with "event:")
    const nonEventActions = availableActions.filter((action) => !action.startsWith("event:"));

    // If only event actions are available, return the first available action
    // (this shouldn't normally happen during the action phase)
    if (nonEventActions.length === 0) {
      return availableActions[0] ?? "";
    }

    return randomChoice(nonEventActions);
  }

  /**
   * Choose random cards to discard.
   * Simply selects the first N cards from the hand.
   */
  chooseDiscards(state: GameState, playerIndex: number, mustDiscard: number): number[] {
    const player = state.players[playerIndex];
    if (!player) {
      return [];
    }

    const handSize = player.hand.length;
    if (mustDiscard > handSize) {
      // Discard entire hand if asked to discard more than available
      return Array.from({ length: handSize }, (_, i) => i);
    }

    // Generate random indices without replacement
    const indices = Array.from({ length: handSize }, (_, i) => i);
    const shuffled = shuffle(indices);
    return shuffled.slice(0, mustDiscard).sort((a, b) => a - b);
  }

  /**
   * Choose a random order for infection cards (for Forecast event).
   * Simply shuffles the cards randomly.
   */
  chooseForecastOrder(cards: InfectionCard[]): InfectionCard[] {
    return shuffle(cards);
  }
}
