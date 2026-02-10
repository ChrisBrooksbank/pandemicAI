// Tests for Bot interface

import { describe, it, expect } from "vitest";
import type { Bot } from "./bot";
import { RandomBot } from "./bot";
import { createGame } from "./game";
import { getAvailableActions } from "./game";
import type { GameState, InfectionCard, CityCard } from "./types";
import { Disease } from "./types";

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
