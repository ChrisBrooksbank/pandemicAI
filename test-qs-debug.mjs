import { createGame, initializeBoard } from './dist/game.js';
import { executeInfectionPhase } from './dist/infection.js';
import { Disease, Role } from './dist/types.js';

const state = createGame({ playerCount: 2, difficulty: 4 });
const cleanBoard = initializeBoard();

const player0 = state.players[0];

const parisState = cleanBoard["Paris"];
const londonState = cleanBoard["London"];

const testState = {
  ...state,
  board: {
    ...cleanBoard,
    Paris: { ...parisState, blue: 3 },
    London: { ...londonState, blue: 0 },
  },
  infectionDeck: [
    { city: "Paris", color: Disease.Blue },
    { city: "Tokyo", color: Disease.Red },
  ],
  infectionDiscard: [],
  infectionRatePosition: 1,
  players: [
    { ...player0, role: Role.QuarantineSpecialist, location: "London" },
    {
      ...(state.players[1] || state.players[0]),
      role: Role.Medic,
      location: "Atlanta",
    },
  ],
  cubeSupply: {
    blue: 21,
    yellow: 24,
    black: 24,
    red: 24,
  },
  outbreakCount: 0,
};

const result = executeInfectionPhase(testState);

console.log("Paris blue cubes:", result.state.board["Paris"]?.blue);
console.log("London blue cubes:", result.state.board["London"]?.blue);
console.log("Madrid blue cubes:", result.state.board["Madrid"]?.blue);
console.log("Essen blue cubes:", result.state.board["Essen"]?.blue);
console.log("Milan blue cubes:", result.state.board["Milan"]?.blue);
console.log("Algiers blue cubes:", result.state.board["Algiers"]?.blue);
console.log("Outbreak count:", result.state.outbreakCount);
console.log("Blue cube supply:", result.state.cubeSupply.blue);
