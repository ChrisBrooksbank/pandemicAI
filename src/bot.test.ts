// Tests for Bot interface

import { describe, it, expect } from "vitest";
import type { Bot } from "./bot";
import { createGame } from "./game";
import { getAvailableActions } from "./game";
import type { GameState, InfectionCard } from "./types";
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
