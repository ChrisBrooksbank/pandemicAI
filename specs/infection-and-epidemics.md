# Infection & Epidemics

## Overview

Implement the infection system including the Infect Cities phase, epidemic card resolution, outbreak mechanics, and chain reactions.

## User Stories

- As a game engine consumer, I want the infection phase to automatically place cubes per the current infection rate so that disease spreads correctly
- As a game engine consumer, I want epidemic cards to be resolved with the 3-step process so that the game escalates properly
- As a game engine consumer, I want outbreaks and chain reactions to resolve automatically so that cascading effects are handled correctly

## Requirements

### Infection Phase
- [ ] Draw infection cards equal to current infection rate
- [ ] Place 1 disease cube of matching color on each drawn city
- [ ] Skip cube placement on eradicated diseases (card still drawn but no effect)
- [ ] Trigger outbreak if city already has 3 cubes of that color
- [ ] Discard infection cards after resolving

### Infection Rate Track
- [ ] Track position 1-7 on the infection rate track
- [ ] Map positions to rates: [2, 2, 2, 3, 3, 4, 4]
- [ ] Advance marker when epidemic is resolved

### Epidemic Resolution
- [ ] Step 1 - Increase: advance infection rate marker by 1
- [ ] Step 2 - Infect: draw BOTTOM card of infection deck, place 3 cubes of matching color on that city
- [ ] Step 3 - Intensify: shuffle infection discard pile and place ON TOP of infection draw deck
- [ ] Handle outbreak if epidemic city exceeds 3 cubes
- [ ] Discard epidemic card after resolution

### Outbreak Mechanics
- [ ] Do NOT place the 4th cube — trigger outbreak instead
- [ ] Advance outbreak marker by 1
- [ ] Place 1 cube of the outbreak color on every adjacent city
- [ ] Check for chain reactions: if adjacent city also exceeds 3 cubes, it outbreaks too
- [ ] Track cities that have already outbreaked in current chain — skip them if triggered again
- [ ] Check loss condition: 8th outbreak = game over
- [ ] Check loss condition: cube supply exhausted = game over

### Disease Cube Supply
- [ ] Track remaining cubes per color (24 each)
- [ ] When placing cubes, check supply first
- [ ] If supply runs out during placement, game is lost immediately

## Acceptance Criteria

- [ ] Infection phase draws correct number of cards per infection rate
- [ ] Epidemics correctly perform all 3 steps in order
- [ ] Intensify step recycles discard pile to top of infection deck
- [ ] Outbreaks cascade correctly through chain reactions
- [ ] No city outbreaks twice in a single chain reaction
- [ ] Eradicated diseases are skipped during infection
- [ ] All 3 loss conditions are detected (8 outbreaks, cube shortage, empty player deck)
- [ ] Quarantine Specialist prevention is respected (defer to roles-and-events.md for implementation)

## Out of Scope

- Quarantine Specialist's prevention ability (covered in roles-and-events.md)
- Event cards that modify infection (covered in roles-and-events.md)
