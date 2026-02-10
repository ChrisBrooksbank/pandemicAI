# Roles & Events

## Overview

Implement all 7 role special abilities and all 5 event card effects from the Pandemic 2013 Revised Edition.

## User Stories

- As a game engine consumer, I want each role's special ability to automatically modify game behavior so that roles feel distinct and impactful
- As a game engine consumer, I want event cards to be playable at any time (even on other players' turns) without costing an action
- As a game engine consumer, I want role and event interactions to be correctly resolved so that edge cases are handled

## Requirements

### Roles

#### Contingency Planner
- [ ] Action: take 1 Event card from Player discard pile, place on role card
- [ ] Stored card does NOT count toward hand limit
- [ ] Only 1 Event card may be stored at a time
- [ ] When stored Event is played, remove it from the game entirely (not to discard)

#### Dispatcher
- [ ] Action: move any pawn to a city containing another pawn (no card needed)
- [ ] Action: move another player's pawn as if it were the Dispatcher's own
- [ ] When using another player's cards for movement, that player must agree

#### Medic
- [ ] Treat Disease action: remove ALL cubes of chosen color (not just 1)
- [ ] Passive: automatically remove all cubes of a CURED color from any city entered
- [ ] Passive triggers on movement into city and when cure is discovered while Medic is in a city
- [ ] Passive does NOT prevent cube placement; cubes are removed after being placed

#### Operations Expert
- [ ] Action: build research station in current city WITHOUT discarding a card
- [ ] Special move (once per turn): from a research station, discard any city card to move to any city

#### Quarantine Specialist
- [ ] Passive: prevent disease cube placement on current city AND all connected cities
- [ ] Applies during infection phase and epidemic resolution
- [ ] Does NOT remove existing cubes — only prevents new ones

#### Researcher
- [ ] Share Knowledge: can give ANY city card to another player in the same city
- [ ] Normal rules apply when TAKING cards (card must match city)

#### Scientist
- [ ] Discover a Cure: needs only 4 same-color city cards (instead of 5)

### Event Cards

All event cards can be played at any time (including other players' turns) and do NOT cost an action.

#### Airlift
- [ ] Move any 1 pawn to any city

#### Forecast
- [ ] Examine top 6 cards of Infection deck
- [ ] Rearrange them in any order
- [ ] Place back on top of Infection deck

#### Government Grant
- [ ] Build a research station in any city (no card discard, no pawn needed)
- [ ] If all 6 stations placed, may move one

#### One Quiet Night
- [ ] Skip the next Infect Cities phase entirely

#### Resilient Population
- [ ] Remove 1 card from Infection discard pile
- [ ] Card is permanently removed from the game (not just discarded)

### Event Card Rules
- [ ] Event cards can be played at any time, even during other players' turns
- [ ] Playing an event does NOT cost an action
- [ ] Event cards are discarded after use (to Player discard pile)
- [ ] Contingency Planner's stored event is removed from game instead of discarded

## Acceptance Criteria

- [ ] All 7 roles modify game behavior correctly per the rules
- [ ] Medic's passive ability triggers automatically on movement and cure discovery
- [ ] Quarantine Specialist prevents cubes in current city and all adjacent cities
- [ ] Operations Expert's special move is limited to once per turn
- [ ] Contingency Planner can only store 1 event, and stored event is removed from game after use
- [ ] All 5 event cards can be played at any time without costing an action
- [ ] Forecast allows viewing and reordering top 6 infection cards
- [ ] Resilient Population permanently removes an infection card from the game
- [ ] One Quiet Night correctly skips the next infection phase
- [ ] Event cards interact correctly with role abilities

## Out of Scope

- AI strategy for when to play event cards
- UI for event card timing windows
