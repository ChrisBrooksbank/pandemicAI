// AI Bot Players - Bot interface and implementations

import type { GameState, InfectionCard, PlayerCard, Player } from "./types";
import { Role } from "./types";
import { CITIES } from "./board";

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
 * Helper function to get the city object for a given city name.
 */
function getCityByName(cityName: string) {
  return CITIES.find((city) => city.name === cityName);
}

/**
 * Helper function to calculate distance between two cities using BFS.
 * Returns the minimum number of moves needed, or Infinity if unreachable.
 */
function calculateDistance(from: string, to: string): number {
  if (from === to) return 0;

  const visited = new Set<string>();
  const queue: Array<{ city: string; distance: number }> = [{ city: from, distance: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    if (current.city === to) {
      return current.distance;
    }

    visited.add(current.city);

    const cityData = CITIES.find((c) => c.name === current.city);
    if (!cityData) continue;

    for (const neighbor of cityData.connections) {
      if (!visited.has(neighbor)) {
        queue.push({ city: neighbor, distance: current.distance + 1 });
      }
    }
  }

  return Infinity;
}

/**
 * Helper function to find nearest research station from a city.
 */
function findNearestStation(state: GameState, fromCity: string): string | null {
  let nearest: string | null = null;
  let minDistance = Infinity;

  for (const cityName in state.board) {
    const cityState = state.board[cityName];
    if (cityState?.hasResearchStation) {
      const distance = calculateDistance(fromCity, cityName);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = cityName;
      }
    }
  }

  return nearest;
}

/**
 * Helper function to count city cards of each color in hand.
 */
function countCardsByColor(hand: PlayerCard[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const card of hand) {
    if (card.type === "city") {
      counts[card.color] = (counts[card.color] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * Helper function to find city with most cubes.
 */
function findCityWithMostCubes(state: GameState): { city: string; cubes: number } | null {
  let maxCity: string | null = null;
  let maxCubes = 0;

  for (const cityName in state.board) {
    const cityState = state.board[cityName];
    if (!cityState) continue;

    const totalCubes = cityState.blue + cityState.yellow + cityState.black + cityState.red;
    if (totalCubes > maxCubes) {
      maxCubes = totalCubes;
      maxCity = cityName;
    }
  }

  return maxCity ? { city: maxCity, cubes: maxCubes } : null;
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

/**
 * Configuration weights for HeuristicBot scoring.
 */
export interface HeuristicWeights {
  /** Weight for disease threat level (cubes * proximity to outbreak) */
  diseaseThreat: number;
  /** Weight for progress toward cures */
  cureProgress: number;
  /** Weight for research station coverage */
  stationCoverage: number;
  /** Weight for infection deck danger */
  infectionDeckDanger: number;
  /** Weight for role synergy bonus */
  roleSynergy: number;
}

/**
 * Default weights for HeuristicBot.
 */
export const DEFAULT_HEURISTIC_WEIGHTS: HeuristicWeights = {
  diseaseThreat: 1.0,
  cureProgress: 0.8,
  stationCoverage: 0.3,
  infectionDeckDanger: 0.5,
  roleSynergy: 0.6,
};

/**
 * HeuristicBot implements a scoring-based strategy.
 *
 * Scores each available action using weighted heuristic factors:
 * - Disease threat level per city (cubes * proximity to outbreak)
 * - Progress toward cures (cards in hand per color vs. threshold)
 * - Research station coverage (distance from stations)
 * - Infection deck danger (cities in discard pile that could come back after epidemic)
 * - Role synergy (weight actions that leverage the bot's role ability)
 *
 * Selects the highest-scoring action. Weights are configurable for tuning strategy.
 */
export class HeuristicBot implements Bot {
  private weights: HeuristicWeights;

  constructor(weights: HeuristicWeights = DEFAULT_HEURISTIC_WEIGHTS) {
    this.weights = weights;
  }

  chooseAction(state: GameState, availableActions: string[]): string {
    if (availableActions.length === 0) {
      return "";
    }

    // Score each action
    const scoredActions = availableActions.map((action) => ({
      action,
      score: this.scoreAction(state, action),
    }));

    // Sort by score (descending) and return highest
    scoredActions.sort((a, b) => b.score - a.score);

    const best = scoredActions[0];
    return best?.action ?? "";
  }

  private scoreAction(state: GameState, action: string): number {
    let score = 0;

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) return 0;

    const actionParts = action.split(":");
    const actionType = actionParts[0];

    // Score based on action type and factors
    switch (actionType) {
      case "treat":
        score += this.scoreTreatAction(state, currentPlayer, actionParts[1] ?? "");
        break;

      case "discover-cure":
        score += this.scoreDiscoverCureAction(state, actionParts[1] ?? "");
        break;

      case "drive-ferry":
      case "direct-flight":
      case "charter-flight":
      case "shuttle-flight":
      case "operations-expert-move":
        score += this.scoreMoveAction(state, currentPlayer, actionParts[1] ?? "", actionType ?? "");
        break;

      case "build":
        score += this.scoreBuildAction(state, currentPlayer);
        break;

      case "share-give":
      case "share-take":
        score += this.scoreShareAction(state, currentPlayer, action);
        break;

      case "event":
        score += this.scoreEventAction(state, action);
        break;

      default:
        // Unknown action type, give neutral score
        score = 0.1;
    }

    return score;
  }

  private scoreTreatAction(state: GameState, player: Player, color: string): number {
    const cityState = state.board[player.location];
    if (!cityState) return 0;

    const cubeCount = cityState[color as keyof typeof cityState];
    if (typeof cubeCount !== "number") return 0;

    // Base score on number of cubes
    let score = cubeCount * this.weights.diseaseThreat * 3;

    // Bonus for treating cities about to outbreak (3 cubes)
    if (cubeCount === 3) {
      score += this.weights.diseaseThreat * 10;
    }

    // Bonus for Medic treating cured diseases (clears all at once)
    if (player.role === Role.Medic) {
      const cureStatus = state.cures[color as keyof typeof state.cures];
      if (cureStatus === "cured" || cureStatus === "eradicated") {
        score += this.weights.roleSynergy * 5;
      }
    }

    return score;
  }

  private scoreDiscoverCureAction(state: GameState, _color: string): number {
    // Very high score - discovering cures is a win condition
    let score = this.weights.cureProgress * 20;

    // Bonus if this is our first cure
    const curedCount = Object.values(state.cures).filter((status) => status !== "uncured").length;
    if (curedCount === 0) {
      score += this.weights.cureProgress * 5;
    }

    // Bonus for Scientist (role synergy)
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer?.role === Role.Scientist) {
      score += this.weights.roleSynergy * 3;
    }

    return score;
  }

  private scoreMoveAction(
    state: GameState,
    player: Player,
    destination: string,
    moveType: string,
  ): number {
    if (!destination) return 0;

    let score = 0;

    const destState = state.board[destination];
    if (!destState) return 0;

    // Factor 1: Disease threat at destination
    const totalCubes = destState.blue + destState.yellow + destState.black + destState.red;
    if (totalCubes > 0) {
      score += this.weights.diseaseThreat * totalCubes * 2;

      // Extra bonus for 3-cube cities (about to outbreak)
      if (totalCubes === 3) {
        score += this.weights.diseaseThreat * 8;
      }
    }

    // Factor 2: Distance to research station (if we need to cure)
    const cardsNeeded = player.role === Role.Scientist ? 4 : 5;
    const colorCounts = countCardsByColor(player.hand);
    const hasEnoughForCure = Object.values(colorCounts).some((count) => count >= cardsNeeded);

    if (hasEnoughForCure && destState.hasResearchStation) {
      score += this.weights.stationCoverage * 15;
    }

    // Factor 3: Infection deck danger (cities in discard that could come back)
    const isInInfectionDiscard = state.infectionDiscard.some(
      (card: InfectionCard) => card.city === destination,
    );
    if (isInInfectionDiscard) {
      score += this.weights.infectionDeckDanger * 2;
    }

    // Factor 4: Role synergy
    if (player.role === Role.Medic) {
      // Medic should move to cured disease cities (passive ability auto-clears)
      for (const [color, cubes] of Object.entries({
        blue: destState.blue,
        yellow: destState.yellow,
        black: destState.black,
        red: destState.red,
      })) {
        if (cubes > 0) {
          const cureStatus = state.cures[color as keyof typeof state.cures];
          if (cureStatus === "cured" || cureStatus === "eradicated") {
            score += this.weights.roleSynergy * cubes * 4;
          }
        }
      }
    }

    // Penalize expensive moves (direct flight, charter flight)
    if (moveType === "direct-flight" || moveType === "charter-flight") {
      score -= 2; // Small penalty for using cards
    }

    return Math.max(score, 0.1); // Minimum score to avoid zero
  }

  private scoreBuildAction(state: GameState, player: Player): number {
    const cityState = state.board[player.location];
    if (!cityState) return 0;

    // Base score for building stations
    let score = this.weights.stationCoverage * 5;

    // Bonus if we need a station for curing
    const cardsNeeded = player.role === Role.Scientist ? 4 : 5;
    const colorCounts = countCardsByColor(player.hand);
    const hasEnoughForCure = Object.values(colorCounts).some((count) => count >= cardsNeeded);

    if (hasEnoughForCure) {
      score += this.weights.cureProgress * 10;
    }

    // Bonus for Operations Expert (doesn't cost a card)
    if (player.role === Role.OperationsExpert) {
      score += this.weights.roleSynergy * 5;
    }

    // Penalty if we're near the 6-station limit
    const stationCount = Object.values(state.board).filter(
      (city) => city.hasResearchStation,
    ).length;
    if (stationCount >= 5) {
      score -= 5;
    }

    return score;
  }

  private scoreShareAction(state: GameState, player: Player, action: string): number {
    // Moderate score for knowledge sharing (helps progress toward cures)
    let score = this.weights.cureProgress * 3;

    // Bonus for Researcher (can give any card)
    if (player.role === Role.Researcher && action.startsWith("share-give:")) {
      score += this.weights.roleSynergy * 4;
    }

    return score;
  }

  private scoreEventAction(state: GameState, action: string): number {
    // Score event cards based on current game state
    let score = 0;

    if (action === "event:one-quiet-night") {
      // Higher score when infection rate is high
      score = this.weights.infectionDeckDanger * state.infectionRatePosition * 2;
    } else if (action.startsWith("event:airlift:")) {
      // Moderate score for airlift (flexible movement)
      score = this.weights.stationCoverage * 4;
    } else if (action.startsWith("event:government-grant:")) {
      // Score similar to building a station
      score = this.weights.stationCoverage * 5;
    } else if (action === "event:forecast") {
      // Moderate score for forecast (information + rearrangement)
      score = this.weights.infectionDeckDanger * 3;
    } else if (action.startsWith("event:resilient-population:")) {
      // High score for resilient population (removes infection threat)
      score = this.weights.infectionDeckDanger * 6;
    }

    return score;
  }

  chooseDiscards(state: GameState, playerIndex: number, mustDiscard: number): number[] {
    const player = state.players[playerIndex];
    if (!player) {
      return [];
    }

    const handSize = player.hand.length;
    if (mustDiscard > handSize) {
      return Array.from({ length: handSize }, (_, i) => i);
    }

    // Score each card (lower score = more likely to discard)
    const cardScores = player.hand.map((card, index) => {
      let score = 0;

      if (card.type === "event") {
        // Keep event cards (high score)
        score = 100;
      } else if (card.type === "city") {
        // Score city cards based on cure progress
        const colorCounts = countCardsByColor(player.hand);
        const colorCount = colorCounts[card.color] ?? 0;

        // Keep cards that are part of a larger set (closer to cure)
        score = colorCount * 10;

        // Bonus for cards we're close to curing
        const cardsNeeded = player.role === Role.Scientist ? 4 : 5;
        if (colorCount >= cardsNeeded - 1) {
          score += 20;
        }
      }

      return { index, score };
    });

    // Sort by score (ascending) and take the lowest-scored cards
    cardScores.sort((a, b) => a.score - b.score);
    return cardScores
      .slice(0, mustDiscard)
      .map((item) => item.index)
      .sort((a, b) => a - b);
  }

  chooseForecastOrder(cards: InfectionCard[]): InfectionCard[] {
    // Strategy: arrange cards to minimize danger
    // This is a simplified strategy - a full implementation would need GameState
    // For now, just shuffle (same as RandomBot and PriorityBot)
    return shuffle(cards);
  }
}

/**
 * PriorityBot implements a rule-based strategy using priorities.
 *
 * Priority order:
 * 1. If at a city with 3 cubes of any color, treat that disease
 * 2. If holding 5+ cards of one color (4 for Scientist) and at research station, discover cure
 * 3. If holding 5+ cards of one color and not at station, move toward nearest station
 * 4. If a city nearby has 3 cubes, move toward it
 * 5. If at location matching hand card and another player is here, share knowledge
 * 6. Otherwise, move toward the city with the most disease cubes
 *
 * Event card strategy:
 * - Plays One Quiet Night when infection rate is high (4+)
 * - Other events are not played (simple strategy)
 *
 * Respects role abilities (e.g., Scientist cure threshold, Medic treat priority)
 */
export class PriorityBot implements Bot {
  chooseAction(state: GameState, availableActions: string[]): string {
    // Filter out event actions (except One Quiet Night in certain conditions)
    const nonEventActions = availableActions.filter((action) => !action.startsWith("event:"));

    // Consider One Quiet Night if infection rate is high
    const oneQuietNightAction = availableActions.find(
      (action) => action === "event:one-quiet-night",
    );
    if (oneQuietNightAction && state.infectionRatePosition >= 4) {
      return oneQuietNightAction;
    }

    // If no non-event actions available, return first action
    if (nonEventActions.length === 0) {
      return availableActions[0] ?? "";
    }

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) {
      return nonEventActions[0] ?? "";
    }

    const currentLocation = currentPlayer.location;
    const currentCityState = state.board[currentLocation];

    if (!currentCityState) {
      return nonEventActions[0] ?? "";
    }

    // Priority 1: Treat disease if current city has 3 cubes of any color
    const treatActions = nonEventActions.filter((action) => action.startsWith("treat:"));
    for (const action of treatActions) {
      const color = action.split(":")[1];
      if (color && currentCityState[color as keyof typeof currentCityState] === 3) {
        return action;
      }
    }

    // Priority 2: Discover cure if at research station with enough cards
    const cardsNeeded = currentPlayer.role === Role.Scientist ? 4 : 5;
    if (currentCityState.hasResearchStation) {
      const discoverActions = nonEventActions.filter((action) =>
        action.startsWith("discover-cure:"),
      );
      if (discoverActions.length > 0) {
        // Prefer discovering cures for diseases that are not yet cured
        for (const action of discoverActions) {
          return action;
        }
      }
    }

    // Priority 3: Move toward nearest station if holding enough cards for a cure
    const colorCounts = countCardsByColor(currentPlayer.hand);
    let hasEnoughForCure = false;
    for (const count of Object.values(colorCounts)) {
      if (count >= cardsNeeded) {
        hasEnoughForCure = true;
        break;
      }
    }

    if (hasEnoughForCure && !currentCityState.hasResearchStation) {
      const nearestStation = findNearestStation(state, currentLocation);
      if (nearestStation) {
        // Find movement action toward nearest station
        const moveActions = nonEventActions.filter(
          (action) =>
            action.startsWith("drive-ferry:") ||
            action.startsWith("direct-flight:") ||
            action.startsWith("shuttle-flight:"),
        );

        // Pick action that gets us closest to the station
        let bestAction: string | null = null;
        let bestDistance = Infinity;

        for (const action of moveActions) {
          const parts = action.split(":");
          const destination = parts[1];
          if (destination) {
            const distance = calculateDistance(destination, nearestStation);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestAction = action;
            }
          }
        }

        if (bestAction) {
          return bestAction;
        }
      }
    }

    // Priority 4: Move toward city with 3 cubes if nearby
    const cityData = getCityByName(currentLocation);
    if (cityData) {
      // Check adjacent cities for 3-cube cities
      for (const adjacentCity of cityData.connections) {
        const adjacentState = state.board[adjacentCity];
        if (adjacentState) {
          const totalCubes =
            adjacentState.blue + adjacentState.yellow + adjacentState.black + adjacentState.red;
          if (totalCubes === 3) {
            const action = `drive-ferry:${adjacentCity}`;
            if (nonEventActions.includes(action)) {
              return action;
            }
          }
        }
      }
    }

    // Priority 5: Share knowledge if at location with another player and have matching card
    const shareActions = nonEventActions.filter((action) => action.startsWith("share-"));
    if (shareActions.length > 0) {
      // Prefer giving cards that help other players get closer to cures
      const giveActions = shareActions.filter((action) => action.startsWith("share-give:"));
      if (giveActions.length > 0) {
        return giveActions[0] ?? shareActions[0] ?? "";
      }
      return shareActions[0] ?? "";
    }

    // Priority 6: Move toward city with most cubes
    const mostCubesCity = findCityWithMostCubes(state);
    if (mostCubesCity) {
      const moveActions = nonEventActions.filter(
        (action) =>
          action.startsWith("drive-ferry:") ||
          action.startsWith("direct-flight:") ||
          action.startsWith("shuttle-flight:"),
      );

      let bestAction: string | null = null;
      let bestDistance = Infinity;

      for (const action of moveActions) {
        const parts = action.split(":");
        const destination = parts[1];
        if (destination) {
          const distance = calculateDistance(destination, mostCubesCity.city);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestAction = action;
          }
        }
      }

      if (bestAction) {
        return bestAction;
      }
    }

    // Fallback: choose first non-event action
    return nonEventActions[0] ?? availableActions[0] ?? "";
  }

  chooseDiscards(state: GameState, playerIndex: number, mustDiscard: number): number[] {
    const player = state.players[playerIndex];
    if (!player) {
      return [];
    }

    const handSize = player.hand.length;
    if (mustDiscard > handSize) {
      return Array.from({ length: handSize }, (_, i) => i);
    }

    // Strategy: discard cards with fewest same-color duplicates
    // Keep cards that are closer to completing a cure
    const colorCounts = countCardsByColor(player.hand);

    // Score each card (lower score = more likely to discard)
    const cardScores = player.hand.map((card, index) => {
      if (card.type !== "city") {
        // Event cards: keep them (high score)
        return { index, score: 100 };
      }

      // City cards: score based on how many of that color we have
      const colorCount = colorCounts[card.color] ?? 0;
      return { index, score: colorCount };
    });

    // Sort by score (ascending) and take the lowest-scored cards
    cardScores.sort((a, b) => a.score - b.score);
    return cardScores
      .slice(0, mustDiscard)
      .map((item) => item.index)
      .sort((a, b) => a - b);
  }

  chooseForecastOrder(cards: InfectionCard[]): InfectionCard[] {
    // Strategy: place cards for eradicated diseases on top (they won't place cubes)
    // Then place cards for cured diseases
    // Finally place cards for uncured diseases at the bottom (more dangerous)

    // For now, simple strategy: just shuffle (same as RandomBot)
    // A more sophisticated strategy would require access to GameState
    return shuffle(cards);
  }
}
