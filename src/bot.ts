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
