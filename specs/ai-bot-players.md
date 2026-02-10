# AI / Bot Players

## Overview

Provide automated players that can play Pandemic using the game engine's public API, enabling solo play with AI teammates, automated testing, and strategy experimentation.

## User Stories

- As a solo player, I want AI teammates that make reasonable decisions so that I can play Pandemic alone
- As a developer, I want bots that can play complete games autonomously so that I can stress-test the engine
- As a strategy enthusiast, I want to observe bot games and compare different strategies
- As a UI developer, I want a bot API that integrates cleanly with the game orchestrator so that mixing human and bot players is seamless

## Requirements

### Bot Interface

- [ ] `Bot` interface: `{ chooseAction(state: GameState, availableActions: string[]): string }`
- [ ] `chooseDiscards(state: GameState, playerIndex: number, mustDiscard: number): number[]` for hand limit
- [ ] `chooseForecastOrder(cards: InfectionCard[]): InfectionCard[]` for Forecast event decisions
- [ ] Bots receive the full game state (same information a human player sees)
- [ ] Bots return action strings from the engine's `getAvailableActions()` format
- [ ] Bot decisions are synchronous (return a value, not a promise) for simplicity

### Strategy: Random Bot

- [ ] Selects a random action from available actions each turn
- [ ] Random card selection for discards
- [ ] Useful as a baseline and for fuzz-testing the engine
- [ ] Does not play event cards (simplest possible bot)

### Strategy: Priority Bot

- [ ] Rule-based strategy using a priority system:
  1. If at a city with 3 cubes of a color, treat that disease
  2. If holding 5+ cards of one color (4 for Scientist) and at a research station, discover cure
  3. If holding 5+ cards of one color and not at a station, move toward nearest station
  4. If a city has 3 cubes nearby, move toward it
  5. If at a location matching a hand card and another player is here, share knowledge
  6. Otherwise, move toward the city with the most disease cubes
- [ ] Plays event cards when obviously beneficial (e.g., One Quiet Night when infection rate is high)
- [ ] Respects role abilities (e.g., Medic prioritizes movement to cured-disease cities, Scientist adjusts cure threshold)
- [ ] Discards lowest-value cards (fewest same-color duplicates) when over hand limit

### Strategy: Heuristic Bot

- [ ] Scores each available action using a weighted heuristic function
- [ ] Factors considered:
  - Disease threat level per city (cubes * proximity to outbreak)
  - Progress toward cures (cards in hand per color vs. threshold)
  - Research station coverage (distance from stations)
  - Infection deck danger (cities in discard pile that could come back after epidemic)
  - Role synergy (weight actions that leverage the bot's role ability)
- [ ] Selects the highest-scoring action
- [ ] Event card evaluation: score the benefit of each playable event vs. holding it
- [ ] Configurable weights for tuning strategy

### Bot Game Runner

- [ ] `runBotGame(config: GameConfig, bots: Bot[]): GameResult` plays a complete game with all bots
- [ ] `GameResult` includes: won/lost, turn count, diseases cured, outbreaks, event log summary
- [ ] `runBotGames(config: GameConfig, bots: Bot[], count: number): AggregateResults` runs many games for statistics
- [ ] `AggregateResults` includes: win rate, average turns, average outbreaks, cure rate per disease
- [ ] Progress callback for long-running batch simulations

### Mixed Human/Bot Games

- [ ] `BotPlayerConfig` type: `{ playerIndex: number; bot: Bot }` assigns bots to specific player slots
- [ ] Non-bot players are human-controlled (UI makes decisions)
- [ ] When it's a bot player's turn, the orchestrator auto-plays their actions
- [ ] Bots also make discard decisions when their hand exceeds the limit
- [ ] Clear indication in the UI of which players are bots

### Bot Diagnostics

- [ ] `BotDecision` type: `{ action: string; reasoning?: string; scores?: Record<string, number> }`
- [ ] Heuristic bot can optionally return score breakdowns for each considered action
- [ ] Decision log: array of all bot decisions for post-game analysis
- [ ] Useful for debugging bot behavior and tuning strategy weights

## Acceptance Criteria

- [ ] Random bot can complete games without errors (validates engine stability)
- [ ] Priority bot wins at least 10% of games on Introductory difficulty (4 epidemics) with 2 players
- [ ] Heuristic bot wins more often than Priority bot on the same difficulty
- [ ] `runBotGames()` can execute 1000 games and produce aggregate statistics
- [ ] Bots handle all 7 roles without errors
- [ ] Bots handle all 5 event cards (at minimum: don't crash; ideally: play them strategically)
- [ ] Mixed human/bot games work with the orchestrator (bot auto-plays on its turn)
- [ ] Bot decisions are deterministic given the same state and random seed

## Out of Scope

- Machine learning or neural network strategies (this is rule-based/heuristic only)
- Difficulty adaptation (bots don't adjust strategy based on win history)
- Communication between bots (no cooperative planning, each bot decides independently)
- Online bot hosting or bot-as-a-service
- Natural language explanation of bot reasoning
