// Pandemic Engine - Public API
// Exports will be added as modules are implemented

export {
  Disease,
  DiseaseColor,
  Role,
  RoleType,
  CureStatus,
  TurnPhase,
  GameStatus,
  type City,
  type Player,
  type GameConfig,
  type CityState,
  type GameState,
  type PlayerCard,
  type InfectionCard,
  type CityCard,
  type EventCard,
  type EpidemicCard,
  EventType,
} from "./types";
export { CITIES, CITY_MAP, getCity, getCitiesByColor } from "./board";
export {
  initializeBoard,
  createInfectionDeck,
  performInitialInfection,
  createPlayerDeck,
  setupPlayers,
  createGame,
  getCurrentPlayer,
  getAvailableActions,
  getCityState,
  getCureStatus,
  getGameStatus,
  getInfectionRate,
  advancePhase,
  endTurn,
  drawPlayerCards,
  enforceHandLimit,
  type InitialInfectionResult,
  type PlayerSetupResult,
  type DrawCardsResult,
} from "./game";
export {
  buildResearchStation,
  charterFlight,
  directFlight,
  discoverCure,
  driveFerry,
  operationsExpertMove,
  shareKnowledge,
  shuttleFlight,
  treatDisease,
  type ActionResult,
} from "./actions";
export {
  executeInfectionPhase,
  resolveEpidemic,
  type InfectionPhaseResult,
  type EpidemicResult,
} from "./infection";
