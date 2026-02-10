# Player Actions

## Overview

Implement all 8 player actions from the Pandemic rules, plus turn structure management (4 actions per turn, draw phase, infect phase).

## User Stories

- As a game engine consumer, I want to execute any valid player action so that the game state advances correctly
- As a game engine consumer, I want invalid actions to be rejected with clear errors so that the game rules are enforced
- As a game engine consumer, I want to query which actions are currently available so that I can present valid choices

## Requirements

### Movement Actions
- [ ] Drive/Ferry: move pawn to adjacent connected city
- [ ] Direct Flight: discard a city card to move to that city
- [ ] Charter Flight: discard card matching current city to move anywhere
- [ ] Shuttle Flight: move between two cities that both have research stations

### Build Action
- [ ] Build Research Station: discard card matching current city to place station; if all 6 are placed, allow moving one from elsewhere

### Special Actions
- [ ] Treat Disease: remove 1 cube of chosen color from current city; if disease is cured, remove ALL cubes of that color instead
- [ ] Share Knowledge: give or take a city card matching the current city; both players must be in the same city; receiving player must respect 7-card hand limit
- [ ] Discover a Cure: at a research station, discard 5 same-color city cards to cure that disease; if no cubes of that color remain, mark as eradicated

### Turn Structure
- [ ] Track actions remaining (4 per turn)
- [ ] Enforce action limit (cannot take more than 4 actions)
- [ ] Allow same action multiple times per turn
- [ ] Transition to draw phase after 4 actions (or fewer if player chooses)
- [ ] Draw 2 player cards (resolve epidemics immediately)
- [ ] Enforce 7-card hand limit after drawing
- [ ] Transition to infect phase after drawing
- [ ] Advance to next player after infection phase

### Action Validation
- [ ] Validate each action's preconditions before execution
- [ ] Return available actions for the current player
- [ ] Return clear error messages for invalid actions

## Acceptance Criteria

- [ ] All 8 actions work correctly per the rules
- [ ] Invalid actions are rejected (e.g., Direct Flight without the card, Share Knowledge when not in same city)
- [ ] Turn phases transition correctly: actions → draw → infect → next player
- [ ] Hand limit is enforced after drawing
- [ ] Actions decrement correctly and turn ends at 0 (or when player chooses to end early)
- [ ] Discover a Cure checks for eradication (no cubes on board = eradicated)

## Out of Scope

- Role-specific action modifications (covered in roles-and-events.md)
- Epidemic/infection resolution details (covered in infection-and-epidemics.md)
