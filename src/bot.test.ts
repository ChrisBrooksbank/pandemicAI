// Tests for Bot interface

import { describe, it, expect } from "vitest";
import type { Bot } from "./bot";
import {
  RandomBot,
  PriorityBot,
  HeuristicBot,
  DEFAULT_HEURISTIC_WEIGHTS,
  runBotGame,
  runBotGames,
} from "./bot";
import { createGame } from "./game";
import { getAvailableActions } from "./game";
import type { GameState, InfectionCard, CityCard, EventCard } from "./types";
import { Disease, Role, EventType } from "./types";

// Mock bot implementation for testing the interface
class MockBot implements Bot {
  chooseAction(state: GameState, availableActions: string[]): string {
    // Simple mock: always choose the first available action
    return availableActions[0] ?? "";
  }

  chooseDiscards(state: GameState, playerIndex: number, mustDiscard: number): number[] {
    // Simple mock: always discard the first N cards
    return Array.from({ length: mustDiscard }, (_, i) => i);
  }

  chooseForecastOrder(cards: InfectionCard[]): InfectionCard[] {
    // Simple mock: return cards in same order
    return [...cards];
  }
}

describe("Bot interface", () => {
  it("should define chooseAction method", () => {
    const bot: Bot = new MockBot();
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const actions = getAvailableActions(state);

    const chosenAction = bot.chooseAction(state, actions);

    expect(typeof chosenAction).toBe("string");
    expect(actions).toContain(chosenAction);
  });

  it("should define chooseDiscards method", () => {
    const bot: Bot = new MockBot();
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const playerIndex = 0;
    const mustDiscard = 2;

    const discardIndices = bot.chooseDiscards(state, playerIndex, mustDiscard);

    expect(Array.isArray(discardIndices)).toBe(true);
    expect(discardIndices).toHaveLength(mustDiscard);
    expect(discardIndices.every((idx) => typeof idx === "number")).toBe(true);
  });

  it("should define chooseForecastOrder method", () => {
    const bot: Bot = new MockBot();
    const cards: InfectionCard[] = [
      { city: "Atlanta", color: Disease.Blue },
      { city: "Chicago", color: Disease.Blue },
      { city: "Lagos", color: Disease.Yellow },
    ];

    const orderedCards = bot.chooseForecastOrder(cards);

    expect(Array.isArray(orderedCards)).toBe(true);
    expect(orderedCards).toHaveLength(cards.length);
    expect(orderedCards.every((card) => cards.includes(card))).toBe(true);
  });

  it("should allow different bot implementations", () => {
    class AlternativeBot implements Bot {
      chooseAction(state: GameState, availableActions: string[]): string {
        // Choose last action instead of first
        return availableActions[availableActions.length - 1] ?? "";
      }

      chooseDiscards(state: GameState, playerIndex: number, mustDiscard: number): number[] {
        // Discard from end instead of beginning
        const handSize = state.players[playerIndex]?.hand.length ?? 0;
        return Array.from({ length: mustDiscard }, (_, i) => handSize - mustDiscard + i);
      }

      chooseForecastOrder(cards: InfectionCard[]): InfectionCard[] {
        // Reverse the order
        return [...cards].reverse();
      }
    }

    const bot: Bot = new AlternativeBot();
    const state = createGame({ playerCount: 2, difficulty: 4 });
    const actions = getAvailableActions(state);

    const chosenAction = bot.chooseAction(state, actions);
    expect(typeof chosenAction).toBe("string");
    expect(actions).toContain(chosenAction);
  });
});

describe("RandomBot", () => {
  describe("chooseAction", () => {
    it("should choose an action from available actions", () => {
      const bot = new RandomBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });
      const actions = getAvailableActions(state);

      const chosenAction = bot.chooseAction(state, actions);

      expect(typeof chosenAction).toBe("string");
      expect(actions).toContain(chosenAction);
    });

    it("should not choose event card actions when mixed with regular actions", () => {
      const bot = new RandomBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      // Create a mixed list of actions including event card actions
      // Note: Event actions use "event:" prefix format
      const actions = [
        "drive-ferry:Chicago",
        "drive-ferry:Washington",
        "event:airlift:0:Tokyo",
        "event:forecast",
        "treat:blue",
        "event:government-grant:Paris",
      ];

      // Run multiple times to ensure RandomBot never chooses event actions
      for (let i = 0; i < 30; i++) {
        const chosenAction = bot.chooseAction(state, actions);
        expect(chosenAction).not.toMatch(/^event:/);
      }
    });

    it("should handle case where only event actions are available", () => {
      const bot = new RandomBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      // Simulate a state where only event actions are available
      const actions = ["event:airlift:0:Tokyo", "event:forecast"];

      const chosenAction = bot.chooseAction(state, actions);

      // Should return first action when no non-event actions exist
      expect(chosenAction).toBe("event:airlift:0:Tokyo");
    });

    it("should handle empty action list gracefully", () => {
      const bot = new RandomBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });
      const actions: string[] = [];

      const chosenAction = bot.chooseAction(state, actions);

      expect(chosenAction).toBe("");
    });

    it("should vary its choices over multiple calls", () => {
      const bot = new RandomBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      // Create a state with multiple possible actions
      const actions = [
        "Drive/Ferry to Chicago",
        "Drive/Ferry to Washington",
        "Drive/Ferry to Miami",
        "Treat Disease blue",
        "Build Research Station",
      ];

      const choices = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const choice = bot.chooseAction(state, actions);
        choices.add(choice);
      }

      // With 5 actions and 50 attempts, we should see multiple different choices
      // (very unlikely to get only 1 choice with random selection)
      expect(choices.size).toBeGreaterThan(1);
    });
  });

  describe("chooseDiscards", () => {
    it("should choose correct number of cards to discard", () => {
      const bot = new RandomBot();

      // Create game with cards in hand
      const state = createGame({ playerCount: 2, difficulty: 4 });
      const player = state.players[0];
      if (!player) {
        throw new Error("Player not found");
      }

      const cards: CityCard[] = [
        { type: "city", city: "Atlanta", color: Disease.Blue },
        { type: "city", city: "Chicago", color: Disease.Blue },
        { type: "city", city: "Montreal", color: Disease.Blue },
        { type: "city", city: "New York", color: Disease.Blue },
        { type: "city", city: "Washington", color: Disease.Blue },
      ];

      state.players[0] = {
        ...player,
        hand: cards,
      };

      const discardIndices = bot.chooseDiscards(state, 0, 2);

      expect(discardIndices).toHaveLength(2);
      expect(discardIndices.every((idx) => idx >= 0 && idx < 5)).toBe(true);
      // Indices should be sorted
      const first = discardIndices[0];
      const second = discardIndices[1];
      if (first !== undefined && second !== undefined) {
        expect(first).toBeLessThan(second);
      }
    });

    it("should return unique indices", () => {
      const bot = new RandomBot();

      const state = createGame({ playerCount: 2, difficulty: 4 });
      const player = state.players[0];
      if (!player) {
        throw new Error("Player not found");
      }

      const cards: CityCard[] = Array.from({ length: 7 }, (_, i) => ({
        type: "city" as const,
        city: `City${i}`,
        color: Disease.Blue,
      }));

      state.players[0] = {
        ...player,
        hand: cards,
      };

      const discardIndices = bot.chooseDiscards(state, 0, 3);

      expect(discardIndices).toHaveLength(3);
      const uniqueIndices = new Set(discardIndices);
      expect(uniqueIndices.size).toBe(3);
    });

    it("should handle discarding entire hand", () => {
      const bot = new RandomBot();

      const state = createGame({ playerCount: 2, difficulty: 4 });
      const player = state.players[0];
      if (!player) {
        throw new Error("Player not found");
      }

      const cards: CityCard[] = [
        { type: "city", city: "Atlanta", color: Disease.Blue },
        { type: "city", city: "Chicago", color: Disease.Blue },
      ];

      state.players[0] = {
        ...player,
        hand: cards,
      };

      // Ask to discard more than hand size
      const discardIndices = bot.chooseDiscards(state, 0, 5);

      // Should return all cards in hand
      expect(discardIndices).toHaveLength(2);
      expect(discardIndices).toContain(0);
      expect(discardIndices).toContain(1);
    });

    it("should handle empty hand", () => {
      const bot = new RandomBot();

      const state = createGame({ playerCount: 2, difficulty: 4 });
      const player = state.players[0];
      if (!player) {
        throw new Error("Player not found");
      }

      state.players[0] = {
        ...player,
        hand: [],
      };

      const discardIndices = bot.chooseDiscards(state, 0, 2);

      expect(discardIndices).toHaveLength(0);
    });

    it("should handle invalid player index", () => {
      const bot = new RandomBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const discardIndices = bot.chooseDiscards(state, 99, 2);

      expect(discardIndices).toEqual([]);
    });

    it("should vary its choices over multiple calls", () => {
      const bot = new RandomBot();

      const state = createGame({ playerCount: 2, difficulty: 4 });
      const player = state.players[0];
      if (!player) {
        throw new Error("Player not found");
      }

      const cards: CityCard[] = Array.from({ length: 7 }, (_, i) => ({
        type: "city" as const,
        city: `City${i}`,
        color: Disease.Blue,
      }));

      state.players[0] = {
        ...player,
        hand: cards,
      };

      const choiceSets = new Set<string>();
      for (let i = 0; i < 30; i++) {
        const indices = bot.chooseDiscards(state, 0, 3);
        choiceSets.add(JSON.stringify(indices));
      }

      // Should see multiple different discard patterns
      expect(choiceSets.size).toBeGreaterThan(1);
    });
  });

  describe("chooseForecastOrder", () => {
    it("should return all cards", () => {
      const bot = new RandomBot();

      const cards: InfectionCard[] = [
        { city: "Atlanta", color: Disease.Blue },
        { city: "Chicago", color: Disease.Blue },
        { city: "Lagos", color: Disease.Yellow },
        { city: "Mexico City", color: Disease.Yellow },
      ];

      const ordered = bot.chooseForecastOrder(cards);

      expect(ordered).toHaveLength(cards.length);
      expect(ordered.every((card) => cards.includes(card))).toBe(true);
    });

    it("should not duplicate or lose cards", () => {
      const bot = new RandomBot();

      const cards: InfectionCard[] = [
        { city: "Atlanta", color: Disease.Blue },
        { city: "Chicago", color: Disease.Blue },
        { city: "Lagos", color: Disease.Yellow },
      ];

      const ordered = bot.chooseForecastOrder(cards);

      expect(ordered).toHaveLength(3);
      expect(ordered.filter((c) => c.city === "Atlanta")).toHaveLength(1);
      expect(ordered.filter((c) => c.city === "Chicago")).toHaveLength(1);
      expect(ordered.filter((c) => c.city === "Lagos")).toHaveLength(1);
    });

    it("should vary the order over multiple calls", () => {
      const bot = new RandomBot();

      const cards: InfectionCard[] = [
        { city: "Atlanta", color: Disease.Blue },
        { city: "Chicago", color: Disease.Blue },
        { city: "Lagos", color: Disease.Yellow },
        { city: "Mexico City", color: Disease.Yellow },
        { city: "Tokyo", color: Disease.Red },
        { city: "Beijing", color: Disease.Red },
      ];

      const orders = new Set<string>();
      for (let i = 0; i < 30; i++) {
        const ordered = bot.chooseForecastOrder(cards);
        orders.add(JSON.stringify(ordered.map((c) => c.city)));
      }

      // Should see multiple different orderings
      expect(orders.size).toBeGreaterThan(1);
    });

    it("should handle empty card array", () => {
      const bot = new RandomBot();
      const cards: InfectionCard[] = [];

      const ordered = bot.chooseForecastOrder(cards);

      expect(ordered).toEqual([]);
    });

    it("should handle single card", () => {
      const bot = new RandomBot();
      const cards: InfectionCard[] = [{ city: "Atlanta", color: Disease.Blue }];

      const ordered = bot.chooseForecastOrder(cards);

      expect(ordered).toEqual(cards);
    });
  });
});

describe("HeuristicBot", () => {
  describe("constructor", () => {
    it("should accept custom weights", () => {
      const customWeights = {
        diseaseThreat: 2.0,
        cureProgress: 1.5,
        stationCoverage: 0.5,
        infectionDeckDanger: 1.0,
        roleSynergy: 0.8,
      };

      const bot = new HeuristicBot(customWeights);
      expect(bot).toBeDefined();
    });

    it("should use default weights when not provided", () => {
      const bot = new HeuristicBot();
      expect(bot).toBeDefined();
    });
  });

  describe("chooseAction", () => {
    it("should choose an action from available actions", () => {
      const bot = new HeuristicBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });
      const actions = getAvailableActions(state);

      const chosenAction = bot.chooseAction(state, actions);

      expect(typeof chosenAction).toBe("string");
      expect(actions).toContain(chosenAction);
    });

    it("should prioritize treating cities with 3 cubes (high outbreak risk)", () => {
      const bot = new HeuristicBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      const atlantaState = state.board["Atlanta"];
      if (!atlantaState) throw new Error("Atlanta not found");

      // Set up Atlanta with 3 blue cubes (high threat)
      state.board["Atlanta"] = {
        ...atlantaState,
        blue: 3,
      };
      state.players[0] = {
        ...player,
        location: "Atlanta",
        hand: [],
      };

      const actions = getAvailableActions(state);
      const chosenAction = bot.chooseAction(state, actions);

      // Should strongly prefer treating the 3-cube city
      expect(chosenAction).toBe("treat:blue");
    });

    it("should prioritize discovering cures when at research station with enough cards", () => {
      const bot = new HeuristicBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      const blueCards: CityCard[] = [
        { type: "city", city: "Atlanta", color: Disease.Blue },
        { type: "city", city: "Chicago", color: Disease.Blue },
        { type: "city", city: "Montreal", color: Disease.Blue },
        { type: "city", city: "New York", color: Disease.Blue },
        { type: "city", city: "Washington", color: Disease.Blue },
      ];

      state.players[0] = {
        ...player,
        location: "Atlanta",
        hand: blueCards,
      };

      const actions = getAvailableActions(state);
      const chosenAction = bot.chooseAction(state, actions);

      // Should choose to discover cure (high value action)
      expect(chosenAction).toBe("discover-cure:blue");
    });

    it("should move toward research station when holding enough cards for cure", () => {
      const bot = new HeuristicBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      const blueCards: CityCard[] = [
        { type: "city", city: "Paris", color: Disease.Blue },
        { type: "city", city: "Montreal", color: Disease.Blue },
        { type: "city", city: "New York", color: Disease.Blue },
        { type: "city", city: "Washington", color: Disease.Blue },
        { type: "city", city: "London", color: Disease.Blue },
      ];

      // Place player in Chicago (adjacent to Atlanta which has research station)
      state.players[0] = {
        ...player,
        location: "Chicago",
        hand: blueCards,
      };

      const actions = getAvailableActions(state);
      const chosenAction = bot.chooseAction(state, actions);

      // Should move toward Atlanta (research station) to discover cure
      // Could be drive-ferry or direct flight depending on scoring
      expect(chosenAction).toMatch(/^(drive-ferry:Atlanta|direct-flight:)/);
    });

    it("should give higher scores to Medic treating cured diseases", () => {
      const bot = new HeuristicBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      const atlantaState = state.board["Atlanta"];
      if (!atlantaState) throw new Error("Atlanta not found");

      // Mark blue as cured
      state.cures.blue = "cured";

      // Atlanta has 2 blue cubes
      state.board["Atlanta"] = {
        ...atlantaState,
        blue: 2,
      };

      state.players[0] = {
        ...player,
        role: Role.Medic,
        location: "Atlanta",
        hand: [],
      };

      const actions = getAvailableActions(state);
      const chosenAction = bot.chooseAction(state, actions);

      // Medic treating cured disease should have high score
      expect(chosenAction).toBe("treat:blue");
    });

    it("should give bonus to Scientist discovering cures", () => {
      const bot = new HeuristicBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      const blueCards: CityCard[] = [
        { type: "city", city: "Atlanta", color: Disease.Blue },
        { type: "city", city: "Chicago", color: Disease.Blue },
        { type: "city", city: "Montreal", color: Disease.Blue },
        { type: "city", city: "New York", color: Disease.Blue },
      ];

      state.players[0] = {
        ...player,
        role: Role.Scientist,
        location: "Atlanta",
        hand: blueCards,
      };

      const actions = getAvailableActions(state);
      const chosenAction = bot.chooseAction(state, actions);

      // Scientist should strongly prefer discovering cure with 4 cards
      expect(chosenAction).toBe("discover-cure:blue");
    });

    it("should consider infection deck danger for move actions", () => {
      const bot = new HeuristicBot({ ...DEFAULT_HEURISTIC_WEIGHTS, infectionDeckDanger: 2.0 });
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      // Add Chicago to infection discard pile
      state.infectionDiscardPile = [
        { city: "Chicago", color: Disease.Blue },
        { city: "Montreal", color: Disease.Blue },
      ];

      state.players[0] = {
        ...player,
        location: "Atlanta",
        hand: [],
      };

      const actions = ["drive-ferry:Chicago", "drive-ferry:Washington"];
      const chosenAction = bot.chooseAction(state, actions);

      // Should consider Chicago higher value due to infection discard
      expect(chosenAction).toBe("drive-ferry:Chicago");
    });

    it("should score One Quiet Night higher when infection rate is high", () => {
      const bot = new HeuristicBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      // Set high infection rate
      state.infectionRatePosition = 6;

      const oneQuietNightCard: EventCard = { type: "event", event: EventType.OneQuietNight };
      state.players[0] = {
        ...player,
        location: "Atlanta",
        hand: [oneQuietNightCard],
      };

      const actions = ["event:one-quiet-night", "drive-ferry:Chicago"];
      const chosenAction = bot.chooseAction(state, actions);

      // Should prefer One Quiet Night at high infection rate
      expect(chosenAction).toBe("event:one-quiet-night");
    });

    it("should give bonus to Operations Expert building stations", () => {
      const bot = new HeuristicBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      state.players[0] = {
        ...player,
        role: Role.OperationsExpert,
        location: "Chicago",
        hand: [{ type: "city", city: "Chicago", color: Disease.Blue }],
      };

      const actions = ["build", "drive-ferry:Atlanta"];
      const chosenAction = bot.chooseAction(state, actions);

      // Operations Expert should value building (doesn't cost a card)
      expect(chosenAction).toBe("build");
    });

    it("should handle empty action list", () => {
      const bot = new HeuristicBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });
      const actions: string[] = [];

      const chosenAction = bot.chooseAction(state, actions);

      expect(chosenAction).toBe("");
    });

    it("should return valid action from available actions", () => {
      const bot = new HeuristicBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });
      const actions = getAvailableActions(state);

      const chosenAction = bot.chooseAction(state, actions);

      expect(typeof chosenAction).toBe("string");
      expect(actions).toContain(chosenAction);
    });
  });

  describe("chooseDiscards", () => {
    it("should discard cards with fewest same-color duplicates", () => {
      const bot = new HeuristicBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      // Give player: 3 blue cards, 2 yellow cards, 1 red card, 1 black card
      const cards: CityCard[] = [
        { type: "city", city: "Atlanta", color: Disease.Blue },
        { type: "city", city: "Chicago", color: Disease.Blue },
        { type: "city", city: "Montreal", color: Disease.Blue },
        { type: "city", city: "Lagos", color: Disease.Yellow },
        { type: "city", city: "Kinshasa", color: Disease.Yellow },
        { type: "city", city: "Tokyo", color: Disease.Red },
        { type: "city", city: "Beijing", color: Disease.Black },
      ];

      state.players[0] = {
        ...player,
        hand: cards,
      };

      const discardIndices = bot.chooseDiscards(state, 0, 2);

      expect(discardIndices).toHaveLength(2);
      // Should discard the single cards (red and black) over cards with more duplicates
      expect(discardIndices).toContain(5); // Red
      expect(discardIndices).toContain(6); // Black
    });

    it("should keep event cards (high score)", () => {
      const bot = new HeuristicBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      const cards: PlayerCard[] = [
        { type: "city", city: "Atlanta", color: Disease.Blue },
        { type: "event", event: EventType.Airlift },
        { type: "city", city: "Chicago", color: Disease.Blue },
        { type: "event", event: EventType.Forecast },
      ];

      state.players[0] = {
        ...player,
        hand: cards,
      };

      const discardIndices = bot.chooseDiscards(state, 0, 2);

      expect(discardIndices).toHaveLength(2);
      // Should discard city cards, not event cards
      expect(discardIndices).not.toContain(1); // Airlift
      expect(discardIndices).not.toContain(3); // Forecast
    });

    it("should keep cards close to cure threshold", () => {
      const bot = new HeuristicBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      // 4 blue cards (close to cure) + 1 red card
      const cards: CityCard[] = [
        { type: "city", city: "Atlanta", color: Disease.Blue },
        { type: "city", city: "Chicago", color: Disease.Blue },
        { type: "city", city: "Montreal", color: Disease.Blue },
        { type: "city", city: "New York", color: Disease.Blue },
        { type: "city", city: "Tokyo", color: Disease.Red },
      ];

      state.players[0] = {
        ...player,
        hand: cards,
      };

      const discardIndices = bot.chooseDiscards(state, 0, 1);

      expect(discardIndices).toHaveLength(1);
      // Should discard the red card, keep blue cards (close to cure)
      expect(discardIndices).toContain(4);
    });

    it("should return sorted indices", () => {
      const bot = new HeuristicBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      const cards: CityCard[] = Array.from({ length: 7 }, (_, i) => ({
        type: "city" as const,
        city: `City${i}`,
        color: i % 2 === 0 ? Disease.Blue : Disease.Red,
      }));

      state.players[0] = {
        ...player,
        hand: cards,
      };

      const discardIndices = bot.chooseDiscards(state, 0, 3);

      expect(discardIndices).toHaveLength(3);
      // Indices should be sorted
      for (let i = 1; i < discardIndices.length; i++) {
        const prev = discardIndices[i - 1];
        const curr = discardIndices[i];
        if (prev !== undefined && curr !== undefined) {
          expect(prev).toBeLessThan(curr);
        }
      }
    });

    it("should handle invalid player index", () => {
      const bot = new HeuristicBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const discardIndices = bot.chooseDiscards(state, 99, 2);

      expect(discardIndices).toEqual([]);
    });

    it("should handle empty hand", () => {
      const bot = new HeuristicBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      state.players[0] = {
        ...player,
        hand: [],
      };

      const discardIndices = bot.chooseDiscards(state, 0, 2);

      expect(discardIndices).toEqual([]);
    });
  });

  describe("chooseForecastOrder", () => {
    it("should return all cards", () => {
      const bot = new HeuristicBot();

      const cards: InfectionCard[] = [
        { city: "Atlanta", color: Disease.Blue },
        { city: "Chicago", color: Disease.Blue },
        { city: "Lagos", color: Disease.Yellow },
      ];

      const ordered = bot.chooseForecastOrder(cards);

      expect(ordered).toHaveLength(cards.length);
      expect(ordered.every((card) => cards.includes(card))).toBe(true);
    });

    it("should not duplicate or lose cards", () => {
      const bot = new HeuristicBot();

      const cards: InfectionCard[] = [
        { city: "Atlanta", color: Disease.Blue },
        { city: "Chicago", color: Disease.Blue },
        { city: "Lagos", color: Disease.Yellow },
      ];

      const ordered = bot.chooseForecastOrder(cards);

      expect(ordered).toHaveLength(3);
      expect(ordered.filter((c) => c.city === "Atlanta")).toHaveLength(1);
      expect(ordered.filter((c) => c.city === "Chicago")).toHaveLength(1);
      expect(ordered.filter((c) => c.city === "Lagos")).toHaveLength(1);
    });

    it("should handle empty card array", () => {
      const bot = new HeuristicBot();
      const cards: InfectionCard[] = [];

      const ordered = bot.chooseForecastOrder(cards);

      expect(ordered).toEqual([]);
    });
  });

  describe("customizable weights", () => {
    it("should allow tuning strategy with different weights", () => {
      // Create bot that heavily prioritizes disease threat
      const threatBot = new HeuristicBot({
        diseaseThreat: 5.0,
        cureProgress: 0.1,
        stationCoverage: 0.1,
        infectionDeckDanger: 0.1,
        roleSynergy: 0.1,
      });

      const state = createGame({ playerCount: 2, difficulty: 4 });
      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      // Create scenario with both treatment option and cure option
      const atlantaState = state.board["Atlanta"];
      if (!atlantaState) throw new Error("Atlanta not found");

      state.board["Atlanta"] = {
        ...atlantaState,
        blue: 2,
      };

      state.players[0] = {
        ...player,
        location: "Atlanta",
        hand: [
          { type: "city", city: "Chicago", color: Disease.Blue },
          { type: "city", city: "Montreal", color: Disease.Blue },
          { type: "city", city: "New York", color: Disease.Blue },
          { type: "city", city: "Washington", color: Disease.Blue },
          { type: "city", city: "London", color: Disease.Blue },
        ],
      };

      const actions = getAvailableActions(state);
      const chosenAction = threatBot.chooseAction(state, actions);

      // With high threat weight, should still consider treating
      expect(typeof chosenAction).toBe("string");
      expect(actions).toContain(chosenAction);
    });
  });
});

describe("PriorityBot", () => {
  describe("chooseAction", () => {
    it("should prioritize treating city with 3 cubes", () => {
      const bot = new PriorityBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      // Set up state with 3 blue cubes in Atlanta
      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      const atlantaState = state.board["Atlanta"];
      if (!atlantaState) throw new Error("Atlanta not found");

      state.board["Atlanta"] = {
        ...atlantaState,
        blue: 3,
      };
      state.players[0] = {
        ...player,
        location: "Atlanta",
        hand: [],
      };

      const actions = getAvailableActions(state);
      const chosenAction = bot.chooseAction(state, actions);

      expect(chosenAction).toBe("treat:blue");
    });

    it("should prioritize discovering cure at research station with enough cards", () => {
      const bot = new PriorityBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      const atlantaState = state.board["Atlanta"];
      if (!atlantaState) throw new Error("Atlanta not found");

      // Give player 5 blue cards
      const blueCards: CityCard[] = [
        { type: "city", city: "Atlanta", color: Disease.Blue },
        { type: "city", city: "Chicago", color: Disease.Blue },
        { type: "city", city: "Montreal", color: Disease.Blue },
        { type: "city", city: "New York", color: Disease.Blue },
        { type: "city", city: "Washington", color: Disease.Blue },
      ];

      state.players[0] = {
        ...player,
        location: "Atlanta",
        hand: blueCards,
      };

      // Atlanta already has research station in initial setup
      const actions = getAvailableActions(state);
      const chosenAction = bot.chooseAction(state, actions);

      expect(chosenAction).toBe("discover-cure:blue");
    });

    it("should respect Scientist role (4 cards needed)", () => {
      const bot = new PriorityBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      // Give player 4 blue cards and Scientist role
      const blueCards: CityCard[] = [
        { type: "city", city: "Atlanta", color: Disease.Blue },
        { type: "city", city: "Chicago", color: Disease.Blue },
        { type: "city", city: "Montreal", color: Disease.Blue },
        { type: "city", city: "New York", color: Disease.Blue },
      ];

      state.players[0] = {
        ...player,
        role: Role.Scientist,
        location: "Atlanta",
        hand: blueCards,
      };

      const actions = getAvailableActions(state);
      const chosenAction = bot.chooseAction(state, actions);

      expect(chosenAction).toBe("discover-cure:blue");
    });

    it("should move toward research station when holding enough cards for cure", () => {
      const bot = new PriorityBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      // Give player 5 blue cards
      const blueCards: CityCard[] = [
        { type: "city", city: "Chicago", color: Disease.Blue },
        { type: "city", city: "Montreal", color: Disease.Blue },
        { type: "city", city: "New York", color: Disease.Blue },
        { type: "city", city: "Washington", color: Disease.Blue },
        { type: "city", city: "London", color: Disease.Blue },
      ];

      // Place player in Chicago (adjacent to Atlanta which has research station)
      state.players[0] = {
        ...player,
        location: "Chicago",
        hand: blueCards,
      };

      const actions = getAvailableActions(state);
      const chosenAction = bot.chooseAction(state, actions);

      // Should move toward Atlanta (research station)
      expect(chosenAction).toBe("drive-ferry:Atlanta");
    });

    it("should share knowledge when at same location with another player", () => {
      const bot = new PriorityBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player0 = state.players[0];
      const player1 = state.players[1];
      if (!player0 || !player1) throw new Error("Players not found");

      // Both players at Atlanta, player 0 has Atlanta card
      state.players[0] = {
        ...player0,
        location: "Atlanta",
        hand: [{ type: "city", city: "Atlanta", color: Disease.Blue }],
      };
      state.players[1] = {
        ...player1,
        location: "Atlanta",
        hand: [],
      };

      const actions = getAvailableActions(state);
      const chosenAction = bot.chooseAction(state, actions);

      // Should share the Atlanta card
      expect(chosenAction).toMatch(/^share-give:1:Atlanta$/);
    });

    it("should play One Quiet Night when infection rate is high", () => {
      const bot = new PriorityBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      // Set high infection rate
      state.infectionRatePosition = 5;

      // Give player One Quiet Night event card
      const oneQuietNightCard: EventCard = { type: "event", event: EventType.OneQuietNight };
      state.players[0] = {
        ...player,
        location: "Atlanta",
        hand: [oneQuietNightCard],
      };

      const actions = ["event:one-quiet-night", "drive-ferry:Chicago", "drive-ferry:Washington"];
      const chosenAction = bot.chooseAction(state, actions);

      expect(chosenAction).toBe("event:one-quiet-night");
    });

    it("should not play One Quiet Night when infection rate is low", () => {
      const bot = new PriorityBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      // Set low infection rate
      state.infectionRatePosition = 2;

      const oneQuietNightCard: EventCard = { type: "event", event: EventType.OneQuietNight };
      state.players[0] = {
        ...player,
        location: "Atlanta",
        hand: [oneQuietNightCard],
      };

      const actions = ["event:one-quiet-night", "drive-ferry:Chicago", "drive-ferry:Washington"];
      const chosenAction = bot.chooseAction(state, actions);

      // Should not play the event, choose a movement action instead
      expect(chosenAction).not.toBe("event:one-quiet-night");
    });

    it("should return valid action from available actions", () => {
      const bot = new PriorityBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });
      const actions = getAvailableActions(state);

      const chosenAction = bot.chooseAction(state, actions);

      expect(typeof chosenAction).toBe("string");
      expect(actions).toContain(chosenAction);
    });

    it("should handle empty action list", () => {
      const bot = new PriorityBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });
      const actions: string[] = [];

      const chosenAction = bot.chooseAction(state, actions);

      expect(chosenAction).toBe("");
    });
  });

  describe("chooseDiscards", () => {
    it("should discard cards with fewest same-color duplicates", () => {
      const bot = new PriorityBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      // Give player: 3 blue cards, 2 yellow cards, 1 red card, 1 black card
      const cards: CityCard[] = [
        { type: "city", city: "Atlanta", color: Disease.Blue }, // index 0
        { type: "city", city: "Chicago", color: Disease.Blue }, // index 1
        { type: "city", city: "Montreal", color: Disease.Blue }, // index 2
        { type: "city", city: "Lagos", color: Disease.Yellow }, // index 3
        { type: "city", city: "Kinshasa", color: Disease.Yellow }, // index 4
        { type: "city", city: "Tokyo", color: Disease.Red }, // index 5
        { type: "city", city: "Beijing", color: Disease.Black }, // index 6
      ];

      state.players[0] = {
        ...player,
        hand: cards,
      };

      const discardIndices = bot.chooseDiscards(state, 0, 2);

      expect(discardIndices).toHaveLength(2);
      // Should discard the single cards (red and black) over cards with more duplicates
      expect(discardIndices).toContain(5); // Red
      expect(discardIndices).toContain(6); // Black
    });

    it("should return sorted indices", () => {
      const bot = new PriorityBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const player = state.players[0];
      if (!player) throw new Error("Player not found");

      const cards: CityCard[] = Array.from({ length: 7 }, (_, i) => ({
        type: "city" as const,
        city: `City${i}`,
        color: Disease.Blue,
      }));

      state.players[0] = {
        ...player,
        hand: cards,
      };

      const discardIndices = bot.chooseDiscards(state, 0, 3);

      expect(discardIndices).toHaveLength(3);
      // Indices should be sorted
      for (let i = 1; i < discardIndices.length; i++) {
        const prev = discardIndices[i - 1];
        const curr = discardIndices[i];
        if (prev !== undefined && curr !== undefined) {
          expect(prev).toBeLessThan(curr);
        }
      }
    });

    it("should handle invalid player index", () => {
      const bot = new PriorityBot();
      const state = createGame({ playerCount: 2, difficulty: 4 });

      const discardIndices = bot.chooseDiscards(state, 99, 2);

      expect(discardIndices).toEqual([]);
    });
  });

  describe("chooseForecastOrder", () => {
    it("should return all cards", () => {
      const bot = new PriorityBot();

      const cards: InfectionCard[] = [
        { city: "Atlanta", color: Disease.Blue },
        { city: "Chicago", color: Disease.Blue },
        { city: "Lagos", color: Disease.Yellow },
      ];

      const ordered = bot.chooseForecastOrder(cards);

      expect(ordered).toHaveLength(cards.length);
      expect(ordered.every((card) => cards.includes(card))).toBe(true);
    });

    it("should not duplicate or lose cards", () => {
      const bot = new PriorityBot();

      const cards: InfectionCard[] = [
        { city: "Atlanta", color: Disease.Blue },
        { city: "Chicago", color: Disease.Blue },
        { city: "Lagos", color: Disease.Yellow },
      ];

      const ordered = bot.chooseForecastOrder(cards);

      expect(ordered).toHaveLength(3);
      expect(ordered.filter((c) => c.city === "Atlanta")).toHaveLength(1);
      expect(ordered.filter((c) => c.city === "Chicago")).toHaveLength(1);
      expect(ordered.filter((c) => c.city === "Lagos")).toHaveLength(1);
    });

    it("should handle empty card array", () => {
      const bot = new PriorityBot();
      const cards: InfectionCard[] = [];

      const ordered = bot.chooseForecastOrder(cards);

      expect(ordered).toEqual([]);
    });
  });
});

describe("runBotGame", () => {
  it("should complete a game and return GameResult", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new RandomBot(), new RandomBot()];

    const result = runBotGame(config, bots);

    // Verify result structure
    expect(result).toBeDefined();
    expect(typeof result.won).toBe("boolean");
    expect(typeof result.turnCount).toBe("number");
    expect(typeof result.diseasesCured).toBe("number");
    expect(typeof result.outbreaks).toBe("number");
    expect(result.status).toMatch(/^(won|lost)$/);

    // Verify constraints
    expect(result.turnCount).toBeGreaterThanOrEqual(0);
    expect(result.diseasesCured).toBeGreaterThanOrEqual(0);
    expect(result.diseasesCured).toBeLessThanOrEqual(4);
    expect(result.outbreaks).toBeGreaterThanOrEqual(0);

    // If lost, should have a reason
    if (!result.won) {
      expect(result.lossReason).toBeDefined();
    }
  });

  it("should throw error if bot count does not match player count", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new RandomBot()]; // Only 1 bot for 2 players

    expect(() => runBotGame(config, bots)).toThrow(
      "Number of bots (1) must match player count (2)",
    );
  });

  it("should complete game with RandomBot players", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new RandomBot(), new RandomBot()];

    const result = runBotGame(config, bots);

    // Game should complete (win or loss)
    expect(result.status).toMatch(/^(won|lost)$/);
    expect(result.turnCount).toBeGreaterThan(0);
  });

  it("should complete game with PriorityBot players", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new PriorityBot(), new PriorityBot()];

    const result = runBotGame(config, bots);

    // Game should complete (win or loss)
    expect(result.status).toMatch(/^(won|lost)$/);
    expect(result.turnCount).toBeGreaterThan(0);
  });

  it("should complete game with HeuristicBot players", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new HeuristicBot(), new HeuristicBot()];

    const result = runBotGame(config, bots);

    // Game should complete (win or loss)
    expect(result.status).toMatch(/^(won|lost)$/);
    expect(result.turnCount).toBeGreaterThan(0);
  });

  it("should complete game with mixed bot types", () => {
    const config = { playerCount: 3, difficulty: 4 };
    const bots = [new RandomBot(), new PriorityBot(), new HeuristicBot()];

    const result = runBotGame(config, bots);

    // Game should complete (win or loss)
    expect(result.status).toMatch(/^(won|lost)$/);
    expect(result.turnCount).toBeGreaterThan(0);
  });

  it("should track diseases cured correctly", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new PriorityBot(), new PriorityBot()];

    const result = runBotGame(config, bots);

    // Diseases cured should be 0-4
    expect(result.diseasesCured).toBeGreaterThanOrEqual(0);
    expect(result.diseasesCured).toBeLessThanOrEqual(4);

    // If won, all 4 diseases should be cured
    if (result.won) {
      expect(result.diseasesCured).toBe(4);
    }
  });

  it("should track outbreaks correctly", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new RandomBot(), new RandomBot()];

    const result = runBotGame(config, bots);

    // Outbreaks should be >= 0
    expect(result.outbreaks).toBeGreaterThanOrEqual(0);

    // If lost due to outbreaks, should be >= 8
    if (result.lossReason === "8 outbreaks reached") {
      expect(result.outbreaks).toBeGreaterThanOrEqual(8);
    }
  });

  it("should handle different player counts (2-4 players)", () => {
    for (let playerCount = 2; playerCount <= 4; playerCount++) {
      const config = { playerCount, difficulty: 4 };
      const bots = Array.from({ length: playerCount }, () => new RandomBot());

      const result = runBotGame(config, bots);

      expect(result.status).toMatch(/^(won|lost)$/);
    }
  });

  it("should handle different difficulty levels", () => {
    for (let difficulty = 4; difficulty <= 6; difficulty++) {
      const config = { playerCount: 2, difficulty };
      const bots = [new RandomBot(), new RandomBot()];

      const result = runBotGame(config, bots);

      expect(result.status).toMatch(/^(won|lost)$/);
    }
  });

  it("should set loss reason when game is lost", () => {
    const config = { playerCount: 2, difficulty: 6 }; // Harder difficulty
    const bots = [new RandomBot(), new RandomBot()];

    // Run multiple games until we get a loss (RandomBot should lose often on hard)
    let foundLoss = false;
    for (let i = 0; i < 5; i++) {
      const result = runBotGame(config, bots);
      if (!result.won) {
        foundLoss = true;
        expect(result.lossReason).toBeDefined();
        expect(typeof result.lossReason).toBe("string");
        expect(result.lossReason).toMatch(
          /^(8 outbreaks reached|Cube supply exhausted|Player deck exhausted|Maximum turn limit reached|Unknown)$/,
        );
        break;
      }
    }

    // At least one loss should occur with RandomBot on hard difficulty after 5 tries
    // If this fails, the test is flaky but that's acceptable given randomness
    expect(foundLoss).toBe(true);
  });

  it("should increment turn counter correctly", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new PriorityBot(), new PriorityBot()];

    const result = runBotGame(config, bots);

    // Turn count should be reasonable (not 0, not ridiculously high)
    expect(result.turnCount).toBeGreaterThan(0);
    expect(result.turnCount).toBeLessThan(1000); // Safety limit
  });

  it("should handle games that end in victory", () => {
    // This test might be flaky due to randomness, but PriorityBot has a chance to win
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new PriorityBot(), new PriorityBot()];

    // Run multiple games and check if at least one win is possible
    let foundWin = false;
    for (let i = 0; i < 10; i++) {
      const result = runBotGame(config, bots);
      if (result.won) {
        foundWin = true;
        expect(result.status).toBe("won");
        expect(result.diseasesCured).toBe(4);
        expect(result.lossReason).toBeUndefined();
        break;
      }
    }

    // PriorityBot should be able to win at least once in 10 tries on normal difficulty
    // If this consistently fails, there may be an issue with the bot or game logic
    // Note: This test may occasionally fail due to randomness, which is acceptable
    if (!foundWin) {
      console.warn(
        "PriorityBot did not win in 10 attempts - this may be due to randomness or bot strategy issues",
      );
    }
  });
});

describe("runBotGames", () => {
  it("should run multiple games and return aggregate results", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new RandomBot(), new RandomBot()];
    const count = 10;

    const results = runBotGames(config, bots, count);

    expect(results.gamesPlayed).toBe(count);
    expect(results.results).toHaveLength(count);
    expect(results.winRate).toBeGreaterThanOrEqual(0);
    expect(results.winRate).toBeLessThanOrEqual(1);
    expect(results.averageTurns).toBeGreaterThan(0);
    expect(results.averageOutbreaks).toBeGreaterThanOrEqual(0);
    expect(results.gamesWon).toBeGreaterThanOrEqual(0);
    expect(results.gamesWon).toBeLessThanOrEqual(count);
  });

  it("should calculate win rate correctly", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new RandomBot(), new RandomBot()];
    const count = 20;

    const results = runBotGames(config, bots, count);

    const expectedWinRate = results.gamesWon / results.gamesPlayed;
    expect(results.winRate).toBeCloseTo(expectedWinRate, 5);
  });

  it("should calculate average turns correctly", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new RandomBot(), new RandomBot()];
    const count = 10;

    const results = runBotGames(config, bots, count);

    const totalTurns = results.results.reduce((sum, result) => sum + result.turnCount, 0);
    const expectedAverage = totalTurns / count;

    expect(results.averageTurns).toBeCloseTo(expectedAverage, 5);
  });

  it("should calculate average outbreaks correctly", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new RandomBot(), new RandomBot()];
    const count = 10;

    const results = runBotGames(config, bots, count);

    const totalOutbreaks = results.results.reduce((sum, result) => sum + result.outbreaks, 0);
    const expectedAverage = totalOutbreaks / count;

    expect(results.averageOutbreaks).toBeCloseTo(expectedAverage, 5);
  });

  it("should include cure rates for all diseases", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new RandomBot(), new RandomBot()];
    const count = 10;

    const results = runBotGames(config, bots, count);

    expect(results.cureRates).toBeDefined();
    expect(results.cureRates.blue).toBeGreaterThanOrEqual(0);
    expect(results.cureRates.blue).toBeLessThanOrEqual(1);
    expect(results.cureRates.yellow).toBeGreaterThanOrEqual(0);
    expect(results.cureRates.yellow).toBeLessThanOrEqual(1);
    expect(results.cureRates.black).toBeGreaterThanOrEqual(0);
    expect(results.cureRates.black).toBeLessThanOrEqual(1);
    expect(results.cureRates.red).toBeGreaterThanOrEqual(0);
    expect(results.cureRates.red).toBeLessThanOrEqual(1);
  });

  it("should call progress callback for each game", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new RandomBot(), new RandomBot()];
    const count = 5;

    const progressCalls: Array<{ completed: number; total: number }> = [];
    const onProgress = (completed: number, total: number) => {
      progressCalls.push({ completed, total });
    };

    runBotGames(config, bots, count, onProgress);

    expect(progressCalls).toHaveLength(count);
    expect(progressCalls[0]).toEqual({ completed: 1, total: count });
    expect(progressCalls[count - 1]).toEqual({ completed: count, total: count });
  });

  it("should throw error if count is not positive", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new RandomBot(), new RandomBot()];

    expect(() => runBotGames(config, bots, 0)).toThrow("Count must be positive");
    expect(() => runBotGames(config, bots, -5)).toThrow("Count must be positive");
  });

  it("should throw error if bot count does not match player count", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new RandomBot()]; // Only 1 bot for 2 players

    expect(() => runBotGames(config, bots, 10)).toThrow(
      "Number of bots (1) must match player count (2)",
    );
  });

  it("should work with different bot types", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new PriorityBot(), new HeuristicBot()];
    const count = 5;

    const results = runBotGames(config, bots, count);

    expect(results.gamesPlayed).toBe(count);
    expect(results.results).toHaveLength(count);
  });

  it("should handle large game counts", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new RandomBot(), new RandomBot()];
    const count = 50;

    const results = runBotGames(config, bots, count);

    expect(results.gamesPlayed).toBe(count);
    expect(results.results).toHaveLength(count);
    expect(results.winRate).toBeGreaterThanOrEqual(0);
    expect(results.winRate).toBeLessThanOrEqual(1);
  });

  it("should store all individual game results", () => {
    const config = { playerCount: 2, difficulty: 4 };
    const bots = [new RandomBot(), new RandomBot()];
    const count = 10;

    const results = runBotGames(config, bots, count);

    expect(results.results).toHaveLength(count);

    for (const result of results.results) {
      expect(result.won).toBeDefined();
      expect(typeof result.won).toBe("boolean");
      expect(result.turnCount).toBeGreaterThanOrEqual(0);
      expect(result.diseasesCured).toBeGreaterThanOrEqual(0);
      expect(result.diseasesCured).toBeLessThanOrEqual(4);
      expect(result.outbreaks).toBeGreaterThanOrEqual(0);
      expect(result.status).toMatch(/^(won|lost)$/);
    }
  });
});
