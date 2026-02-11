// AI Bot Players - Bot interface and implementations

import type { GameState, InfectionCard, PlayerCard, Player, GameConfig } from "./types";
import { Role, GameStatus, CureStatus } from "./types";
import { CITIES } from "./board";
import { OrchestratedGame } from "./orchestrator";

/**
 * Diagnostic information about a bot decision.
 *
 * Useful for debugging bot behavior and tuning strategy weights.
 */
export interface BotDecision {
  /** The action that was chosen */
  action: string;
  /** Optional human-readable reasoning for the decision */
  reasoning?: string;
  /** Optional score breakdown for the chosen action and alternatives */
  scores?: Record<string, number>;
}

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
  private enableDiagnostics: boolean;
  private lastDecision: BotDecision | null = null;

  constructor(
    weights: HeuristicWeights = DEFAULT_HEURISTIC_WEIGHTS,
    enableDiagnostics: boolean = false,
  ) {
    this.weights = weights;
    this.enableDiagnostics = enableDiagnostics;
  }

  /**
   * Get the last decision made by this bot (if diagnostics are enabled).
   *
   * @returns The last BotDecision with score breakdowns, or null if unavailable
   */
  getLastDecision(): BotDecision | null {
    return this.lastDecision;
  }

  /**
   * Clear the decision history.
   */
  clearDecisionHistory(): void {
    this.lastDecision = null;
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
    const chosenAction = best?.action ?? "";

    // Store decision diagnostics if enabled
    if (this.enableDiagnostics) {
      const scores: Record<string, number> = {};
      for (const { action, score } of scoredActions) {
        scores[action] = score;
      }

      const reasoning = this.generateReasoning(state, chosenAction, best?.score ?? 0);

      this.lastDecision = {
        action: chosenAction,
        reasoning,
        scores,
      };
    }

    return chosenAction;
  }

  /**
   * Generate human-readable reasoning for a chosen action.
   */
  private generateReasoning(state: GameState, action: string, score: number): string {
    const actionParts = action.split(":");
    const actionType = actionParts[0];

    switch (actionType) {
      case "treat":
        return `Treating disease (score: ${score.toFixed(1)}) - reduces immediate threat`;
      case "discover-cure":
        return `Discovering cure (score: ${score.toFixed(1)}) - critical for winning`;
      case "build":
        return `Building research station (score: ${score.toFixed(1)}) - improves access for cures`;
      case "drive-ferry":
      case "direct-flight":
      case "charter-flight":
      case "shuttle-flight":
      case "operations-expert-move":
        return `Moving to ${actionParts[1]} (score: ${score.toFixed(1)}) - strategic positioning`;
      case "share-give":
      case "share-take":
        return `Sharing knowledge (score: ${score.toFixed(1)}) - helps progress toward cure`;
      case "event":
        return `Playing event card (score: ${score.toFixed(1)}) - special ability`;
      default:
        return `Action: ${action} (score: ${score.toFixed(1)})`;
    }
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

/**
 * Configuration for assigning bots to specific player slots.
 *
 * Used for mixed human/bot games where some players are controlled by AI
 * and others are controlled by humans (via UI).
 *
 * @example
 * ```typescript
 * // Player 0 is human, players 1 and 2 are bots
 * const botConfigs: BotPlayerConfig[] = [
 *   { playerIndex: 1, bot: new PriorityBot() },
 *   { playerIndex: 2, bot: new RandomBot() }
 * ];
 * ```
 */
export interface BotPlayerConfig {
  /** The index of the player slot (0-based) */
  playerIndex: number;
  /** The bot that controls this player */
  bot: Bot;
}

/**
 * Result of running a bot game to completion.
 */
export interface GameResult {
  /** Whether the bots won the game */
  won: boolean;
  /** Number of turns played until game ended */
  turnCount: number;
  /** Diseases that were cured (0-4) */
  diseasesCured: number;
  /** Total number of outbreaks that occurred */
  outbreaks: number;
  /** Final game status */
  status: "won" | "lost";
  /** Reason for loss (if applicable) */
  lossReason?: string;
}

/**
 * Aggregate results from running multiple bot games.
 */
export interface AggregateResults {
  /** Total number of games played */
  gamesPlayed: number;
  /** Number of games won */
  gamesWon: number;
  /** Win rate (0.0 to 1.0) */
  winRate: number;
  /** Average number of turns per game */
  averageTurns: number;
  /** Average number of outbreaks per game */
  averageOutbreaks: number;
  /** Cure rate per disease color (0.0 to 1.0) */
  cureRates: {
    blue: number;
    yellow: number;
    black: number;
    red: number;
  };
  /** Individual game results */
  results: GameResult[];
}

/**
 * Run a complete game with bot players.
 *
 * @param config - Game configuration (player count, difficulty)
 * @param bots - Array of bots, one per player (length must match playerCount)
 * @returns GameResult with outcome statistics
 *
 * @example
 * ```typescript
 * const config = { playerCount: 2, difficulty: 4 };
 * const bots = [new PriorityBot(), new PriorityBot()];
 * const result = runBotGame(config, bots);
 * console.log(`Game ${result.won ? 'won' : 'lost'} in ${result.turnCount} turns`);
 * ```
 */
export function runBotGame(config: GameConfig, bots: Bot[]): GameResult {
  // Validate inputs
  if (bots.length !== config.playerCount) {
    throw new Error(
      `Number of bots (${bots.length}) must match player count (${config.playerCount})`,
    );
  }

  // Create the game
  const game = OrchestratedGame.create(config);

  let turnCount = 0;
  const maxTurns = 1000; // Safety limit to prevent infinite loops
  let lastPhase: "actions" | "draw" | "infect" = "infect"; // Track previous phase to detect new turns

  // Main game loop
  while (game.getStatus() === "playing" && turnCount < maxTurns) {
    const phase = game.getCurrentPhase();
    const currentPlayerIndex = game.getGameState().currentPlayerIndex;
    const bot = bots[currentPlayerIndex];

    if (!bot) {
      throw new Error(`No bot found for player ${currentPlayerIndex}`);
    }

    // Increment turn counter when we transition from infect phase to actions phase (start of new turn)
    if (phase === "actions" && lastPhase === "infect") {
      turnCount++;
    }
    lastPhase = phase;

    try {
      if (phase === "actions") {
        // Action phase: bot chooses and performs actions
        const actionsRemaining = game.getActionsRemaining();

        if (actionsRemaining > 0) {
          const availableActions = game.getAvailableActions();

          if (availableActions.length === 0) {
            // No actions available, advance phase
            const outcome = game.drawCards();
            if (outcome.gameStatus !== GameStatus.Ongoing) {
              break;
            }
          } else {
            // Bot chooses action
            const chosenAction = bot.chooseAction(game.getGameState(), availableActions);

            // Perform the action
            const outcome = game.performAction(chosenAction);

            // Check for game over
            if (outcome.gameStatus !== GameStatus.Ongoing) {
              break;
            }
          }
        } else {
          // No actions remaining, advance to draw phase
          const outcome = game.drawCards();
          if (outcome.gameStatus !== GameStatus.Ongoing) {
            break;
          }
        }
      } else if (phase === "draw") {
        // Draw phase: draw cards and handle epidemics/discards
        const outcome = game.drawCards();

        // Handle hand limit discards
        if (outcome.needsDiscard) {
          for (const playerIndex of outcome.playersNeedingDiscard) {
            const player = outcome.state.players[playerIndex];
            const playerBot = bots[playerIndex];

            if (!player || !playerBot) continue;

            const handSize = player.hand.length;
            const mustDiscard = handSize - 7;

            if (mustDiscard > 0) {
              const discardIndices = playerBot.chooseDiscards(
                outcome.state,
                playerIndex,
                mustDiscard,
              );

              // Apply discards (remove cards from hand in reverse order to preserve indices)
              for (const index of discardIndices.sort((a, b) => b - a)) {
                const card = player.hand[index];
                if (card) {
                  player.hand.splice(index, 1);
                }
              }
            }
          }
        }

        // Check for game over after drawing
        if (outcome.gameStatus !== GameStatus.Ongoing) {
          break;
        }
      } else if (phase === "infect") {
        // Infection phase: infect cities
        const outcome = game.infectCities();

        // Check for game over
        if (outcome.gameStatus !== GameStatus.Ongoing) {
          break;
        }
      }
    } catch (error) {
      // If an error occurs, treat as game loss
      const state = game.getGameState();
      const curedCount = Object.values(state.cures).filter(
        (status) => status !== CureStatus.Uncured,
      ).length;

      return {
        won: false,
        turnCount,
        diseasesCured: curedCount,
        outbreaks: state.outbreakCount,
        status: "lost",
        lossReason: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Game ended - collect results
  const finalState = game.getGameState();
  const finalStatus = game.getStatus();

  const curedCount = Object.values(finalState.cures).filter(
    (status) => status !== CureStatus.Uncured,
  ).length;

  const won = finalStatus === "won";

  let lossReason: string | undefined;
  if (!won) {
    // Determine loss reason
    if (finalState.outbreakCount >= 8) {
      lossReason = "8 outbreaks reached";
    } else if (
      finalState.cubeSupply.blue <= 0 ||
      finalState.cubeSupply.yellow <= 0 ||
      finalState.cubeSupply.black <= 0 ||
      finalState.cubeSupply.red <= 0
    ) {
      lossReason = "Cube supply exhausted";
    } else if (finalState.playerDeck.length === 0) {
      lossReason = "Player deck exhausted";
    } else if (turnCount >= maxTurns) {
      lossReason = "Maximum turn limit reached (safety)";
    } else {
      lossReason = "Unknown";
    }
  }

  return {
    won,
    turnCount,
    diseasesCured: curedCount,
    outbreaks: finalState.outbreakCount,
    status: won ? "won" : "lost",
    lossReason,
  };
}

/**
 * Run multiple bot games and aggregate results for statistical analysis.
 *
 * @param config - Game configuration (player count, difficulty)
 * @param bots - Array of bots, one per player (length must match playerCount)
 * @param count - Number of games to run
 * @param onProgress - Optional callback for progress updates (called after each game)
 * @returns AggregateResults with win rate, averages, and per-game results
 *
 * @example
 * ```typescript
 * const config = { playerCount: 2, difficulty: 4 };
 * const bots = [new PriorityBot(), new PriorityBot()];
 * const results = runBotGames(config, bots, 100, (completed, total) => {
 *   console.log(`Progress: ${completed}/${total}`);
 * });
 * console.log(`Win rate: ${(results.winRate * 100).toFixed(1)}%`);
 * console.log(`Average turns: ${results.averageTurns.toFixed(1)}`);
 * ```
 */
export function runBotGames(
  config: GameConfig,
  bots: Bot[],
  count: number,
  onProgress?: (completed: number, total: number) => void,
): AggregateResults {
  // Validate inputs
  if (count <= 0) {
    throw new Error("Count must be positive");
  }

  if (bots.length !== config.playerCount) {
    throw new Error(
      `Number of bots (${bots.length}) must match player count (${config.playerCount})`,
    );
  }

  const results: GameResult[] = [];
  let totalTurns = 0;
  let totalOutbreaks = 0;
  let gamesWon = 0;
  const cureCountsByColor = {
    blue: 0,
    yellow: 0,
    black: 0,
    red: 0,
  };

  // Run all games
  for (let i = 0; i < count; i++) {
    const result = runBotGame(config, bots);
    results.push(result);

    // Accumulate statistics
    totalTurns += result.turnCount;
    totalOutbreaks += result.outbreaks;

    if (result.won) {
      gamesWon++;
    }

    // Count which diseases were cured (by checking final game state)
    // We need to re-run the game to get cure status, or track it in GameResult
    // For now, we'll infer from diseasesCured count (not precise, but reasonable)
    // TODO: Could enhance GameResult to include per-disease cure status

    // Call progress callback if provided
    if (onProgress) {
      onProgress(i + 1, count);
    }
  }

  // Calculate cure rates by re-running games and tracking which diseases were cured
  // This is inefficient but necessary since GameResult doesn't track per-disease cures
  // We'll run a subset of games to estimate cure rates
  const sampleSize = Math.min(count, 100); // Sample at most 100 games for cure rate estimation
  for (let i = 0; i < sampleSize; i++) {
    const game = OrchestratedGame.create(config);

    // Run the game with bots (simplified version without full tracking)
    let safety = 0;
    const maxTurns = 1000;

    while (game.getStatus() === "playing" && safety < maxTurns) {
      const phase = game.getCurrentPhase();
      const currentPlayerIndex = game.getGameState().currentPlayerIndex;
      const bot = bots[currentPlayerIndex];

      if (!bot) break;

      try {
        if (phase === "actions") {
          const actionsRemaining = game.getActionsRemaining();
          if (actionsRemaining > 0) {
            const availableActions = game.getAvailableActions();
            if (availableActions.length > 0) {
              const action = bot.chooseAction(game.getGameState(), availableActions);
              const outcome = game.performAction(action);
              if (outcome.gameStatus !== GameStatus.Ongoing) break;
            } else {
              const outcome = game.drawCards();
              if (outcome.gameStatus !== GameStatus.Ongoing) break;
            }
          } else {
            const outcome = game.drawCards();
            if (outcome.gameStatus !== GameStatus.Ongoing) break;
          }
        } else if (phase === "draw") {
          const outcome = game.drawCards();
          if (outcome.gameStatus !== GameStatus.Ongoing) break;
        } else if (phase === "infect") {
          const outcome = game.infectCities();
          if (outcome.gameStatus !== GameStatus.Ongoing) break;
        }

        safety++;
      } catch {
        break;
      }
    }

    // Check which diseases were cured
    const finalState = game.getGameState();
    if (finalState.cures.blue !== CureStatus.Uncured) {
      cureCountsByColor.blue++;
    }
    if (finalState.cures.yellow !== CureStatus.Uncured) {
      cureCountsByColor.yellow++;
    }
    if (finalState.cures.black !== CureStatus.Uncured) {
      cureCountsByColor.black++;
    }
    if (finalState.cures.red !== CureStatus.Uncured) {
      cureCountsByColor.red++;
    }
  }

  // Calculate aggregate statistics
  const winRate = count > 0 ? gamesWon / count : 0;
  const averageTurns = count > 0 ? totalTurns / count : 0;
  const averageOutbreaks = count > 0 ? totalOutbreaks / count : 0;
  const cureRates = {
    blue: sampleSize > 0 ? cureCountsByColor.blue / sampleSize : 0,
    yellow: sampleSize > 0 ? cureCountsByColor.yellow / sampleSize : 0,
    black: sampleSize > 0 ? cureCountsByColor.black / sampleSize : 0,
    red: sampleSize > 0 ? cureCountsByColor.red / sampleSize : 0,
  };

  return {
    gamesPlayed: count,
    gamesWon,
    winRate,
    averageTurns,
    averageOutbreaks,
    cureRates,
    results,
  };
}
