# Pandemic — Rules Reference

## Turn Structure

Each player's turn consists of three phases, performed in order:

1. **Take 4 Actions**
2. **Draw 2 Player Cards**
3. **Infect Cities**

---

## Phase 1: Actions (4 per turn)

A player may perform up to 4 actions on their turn. Actions may be done in any order and the same action may be repeated. There are 8 possible actions grouped into three categories.

### Movement Actions

#### 1. Drive / Ferry
Move your pawn to an **adjacent city** (connected by a line on the board).

#### 2. Direct Flight
Discard a city card to move your pawn to **the city named on the card**.

#### 3. Charter Flight
Discard the city card **matching the city you are currently in** to move your pawn to **any city** on the board.

#### 4. Shuttle Flight
Move your pawn from a city with a **research station** to **any other city with a research station**.

### Build Action

#### 5. Build a Research Station
Discard the city card matching your **current city** to place a research station there. If all 6 research stations are already on the board, you may move one from elsewhere.

### Special Actions

#### 6. Treat Disease
Remove **1 disease cube** of a single color from your current city. If the disease of that color has already been **cured**, remove **all cubes** of that color from the city instead (for 1 action).

#### 7. Share Knowledge
Either **give** or **take** a city card that matches the city both players are currently in. Both players must be in the same city, and the card exchanged must match that city. The player receiving the card must respect the 7-card hand limit.

#### 8. Discover a Cure
At a **research station**, discard **5 city cards of the same color** to cure the disease of that color. Place the cure marker (vial-side-up) on the Discovered Cures area. If no cubes of that color remain on the board when cured, the disease is **eradicated** — flip the cure marker to the sunset side.

---

## Phase 2: Draw 2 Player Cards

After completing actions, draw the top **2 cards** from the Player draw deck, one at a time.

- **City cards / Event cards** — add to your hand.
- **Epidemic cards** — resolve immediately (see below), then discard.

### Hand Limit
Players may hold a maximum of **7 cards**. If drawing causes you to exceed 7, you must immediately discard (or play an Event card) down to 7 before continuing. This applies to any player at any time they exceed the limit.

### Event Cards
Event cards may be played **at any time** (even on another player's turn) and do **not** cost an action. After playing, discard them.

### If the Player Deck Runs Out
If you cannot draw 2 cards because the Player deck is empty, **the game is immediately lost**.

---

## Epidemic Card Resolution

When an Epidemic card is drawn, resolve these 3 steps in order:

### Step 1: Increase
Move the **infection rate marker** forward 1 space on the Infection Rate Track.

### Step 2: Infect
Draw the **bottom card** of the Infection deck. Place **3 disease cubes** of the matching color on the named city. If this causes the city to exceed 3 cubes of that color, an **outbreak** occurs. Discard this card to the Infection discard pile.

### Step 3: Intensify
Pick up the entire **Infection discard pile**, **shuffle** it, and place it **on top** of the Infection draw deck. (This means recently infected cities are likely to be drawn again soon.)

---

## Infection Rate Track

| Position | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|----------|---|---|---|---|---|---|---|
| **Rate** | 2 | 2 | 2 | 3 | 3 | 4 | 4 |

The rate indicates how many Infection cards are drawn during Phase 3 of each turn. The marker starts on position 1 (rate of 2) and advances each time an Epidemic card is resolved.

---

## Phase 3: Infect Cities

Draw cards from the top of the **Infection deck** equal to the current **infection rate**. For each card drawn, place **1 disease cube** of the matching color on the named city. Discard each infection card after resolving it.

If a city already has **3 cubes** of the color being added, an **outbreak** occurs instead of placing a cube.

---

## Outbreaks

When a 4th cube of a single color would be placed on a city:

1. **Do not** place the extra cube.
2. **Advance the outbreak marker** by 1 on the Outbreak Track.
3. Place **1 cube of that color** on **every adjacent city**.

### Chain Reactions
If an adjacent city already has 3 cubes of that color, it also **outbreaks**. However, each city may only outbreak **once per chain reaction** — a city that has already outbreaked is skipped if triggered again during the same chain.

A single epidemic or infection card can potentially trigger multiple chain-reaction outbreaks.

---

## Winning the Game

Players win **immediately** when they discover the cure for the **4th and final disease**. They do not need to remove all cubes from the board — only find all 4 cures.

---

## Losing the Game

Players lose immediately if **any** of these occur:

1. **8 Outbreaks** — The outbreak marker reaches the skull-and-crossbones space (8th outbreak).
2. **Disease Cube Shortage** — A disease cube needs to be placed but there are none left in the supply of that color (all 24 are on the board).
3. **Player Deck Exhaustion** — A player needs to draw from the Player deck and it is empty.

---

## Cured vs. Eradicated Diseases

### Cured
- The cure marker is placed vial-side-up.
- Disease cubes of that color are still placed during infection.
- The **Treat Disease** action removes **all cubes** of that color from the current city (instead of just 1).
- The **Medic** automatically removes all cubes of a cured color from any city they enter or are in.

### Eradicated
- The cure marker is flipped to the sunset side.
- **No new cubes** of that color are placed during infection or epidemics.
- Infection cards of that color are still drawn but have no effect.
- A disease becomes eradicated when it is cured **and** all cubes of that color have been removed from the board.
