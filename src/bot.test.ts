// Tests for Bot interface

import { describe, it, expect } from "vitest";
import type { Bot } from "./bot";
import { RandomBot, PriorityBot, HeuristicBot, DEFAULT_HEURISTIC_WEIGHTS } from "./bot";
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
