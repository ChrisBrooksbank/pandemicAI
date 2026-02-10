# Game State & Setup

## Overview

Initialize and manage the complete Pandemic game state, including the board, disease cubes, card decks, players, and all game-level trackers.

## User Stories

- As a game engine consumer, I want to create a new game with configurable player count and difficulty so that I can start any valid game scenario
- As a game engine consumer, I want to query the current game state at any time so that I can build a UI or AI on top
- As a game engine consumer, I want the game to enforce all setup rules automatically so that the initial state is always valid

## Requirements

### Types & Data Model
- [ ] Define Disease enum: blue, yellow, black, red
- [ ] Define City type with name, color, and connections
- [ ] Define all 48 cities with their connections (from pandemic-board.md)
- [ ] Define PlayerCard type (city card, event card, epidemic card)
- [ ] Define InfectionCard type (city name + color)
- [ ] Define Role enum with all 7 roles
- [ ] Define Player type with role, location, and hand
- [ ] Define GameState type with all state fields (board cubes, decks, trackers, players, etc.)
- [ ] Define GameConfig type (player count 2-4, difficulty 4-6 epidemic cards)

### Game Setup
- [ ] Implement initial board state: all cities with 0 cubes, research station in Atlanta
- [ ] Implement infection deck: shuffle 48 infection cards
- [ ] Implement initial infection: draw 3+3+3 cards, place 3/2/1 cubes respectively
- [ ] Implement player deck creation: shuffle 48 city + 5 event cards, deal starting hands (4/3/2 cards for 2/3/4 players)
- [ ] Implement epidemic card insertion: divide remaining deck into N equal piles, shuffle 1 epidemic into each, stack without re-shuffling
- [ ] Implement role assignment: randomly assign roles to players
- [ ] Place all player pawns in Atlanta

### State Tracking
- [ ] Track infection rate (positions 1-7, rates: 2,2,2,3,3,4,4)
- [ ] Track outbreak count (0-8)
- [ ] Track disease cube supply per color (24 each, minus placed cubes)
- [ ] Track cure status per disease (uncured, cured, eradicated)
- [ ] Track research station locations (max 6)
- [ ] Track current player turn and phase
- [ ] Track player card draw pile and discard pile
- [ ] Track infection draw pile and discard pile

### Win/Loss Conditions
- [ ] Detect win: all 4 diseases cured
- [ ] Detect loss: 8th outbreak occurs
- [ ] Detect loss: disease cube supply exhausted for any color
- [ ] Detect loss: player deck exhausted when draw is needed

## Acceptance Criteria

- [ ] Can create a new game with 2, 3, or 4 players
- [ ] Can create a game with 4, 5, or 6 epidemic cards
- [ ] Initial infection places exactly 18 cubes (3+3+3 + 2+2+2 + 1+1+1)
- [ ] Starting hands are dealt correctly per player count
- [ ] Epidemic cards are evenly distributed in the player deck
- [ ] All state is queryable and immutable from outside the engine
- [ ] Invalid configurations (1 player, 7 epidemic cards, etc.) are rejected

## Out of Scope

- Player action logic (covered in player-actions.md)
- Infection/epidemic resolution (covered in infection-and-epidemics.md)
- Role-specific abilities (covered in roles-and-events.md)
