// Core type definitions for the Pandemic game engine

/**
 * The four disease colors in Pandemic
 */
export enum Disease {
  Blue = "blue",
  Yellow = "yellow",
  Black = "black",
  Red = "red",
}

/**
 * Type alias for disease colors
 */
export type DiseaseColor = Disease;

/**
 * The seven player roles in Pandemic (2013 Revised Edition)
 */
export enum Role {
  ContingencyPlanner = "contingency_planner",
  Dispatcher = "dispatcher",
  Medic = "medic",
  OperationsExpert = "operations_expert",
  QuarantineSpecialist = "quarantine_specialist",
  Researcher = "researcher",
  Scientist = "scientist",
}

/**
 * Type alias for role types
 */
export type RoleType = Role;

/**
 * Represents a city on the Pandemic board
 */
export interface City {
  /** The name of the city */
  name: string;
  /** The disease color/region this city belongs to */
  color: DiseaseColor;
  /** Array of city names this city is connected to */
  connections: string[];
}

/**
 * The five event card types in Pandemic
 */
export enum EventType {
  Airlift = "airlift",
  Forecast = "forecast",
  GovernmentGrant = "government_grant",
  OneQuietNight = "one_quiet_night",
  ResilientPopulation = "resilient_population",
}

/**
 * Represents a city card in the player deck
 */
export interface CityCard {
  type: "city";
  /** The name of the city */
  city: string;
  /** The disease color of this city */
  color: DiseaseColor;
}

/**
 * Represents an event card in the player deck
 */
export interface EventCard {
  type: "event";
  /** The event type */
  event: EventType;
}

/**
 * Represents an epidemic card in the player deck
 */
export interface EpidemicCard {
  type: "epidemic";
}

/**
 * Represents any card that can appear in the player deck
 * (discriminated union of CityCard, EventCard, and EpidemicCard)
 */
export type PlayerCard = CityCard | EventCard | EpidemicCard;

/**
 * Represents a card in the infection deck
 */
export interface InfectionCard {
  /** The name of the city to infect */
  city: string;
  /** The disease color to place */
  color: DiseaseColor;
}

/**
 * Represents a player in the game
 */
export interface Player {
  /** The player's assigned role */
  role: Role;
  /** The city where the player is currently located */
  location: string;
  /** The player's hand of cards */
  hand: PlayerCard[];
}

/**
 * Game configuration settings
 */
export interface GameConfig {
  /** Number of players (2-4) */
  playerCount: 2 | 3 | 4;
  /** Number of epidemic cards to include (4-6) */
  difficulty: 4 | 5 | 6;
}

/**
 * The cure status for a disease
 */
export enum CureStatus {
  /** Disease is not yet cured */
  Uncured = "uncured",
  /** Disease has been cured (5 cards discarded) */
  Cured = "cured",
  /** Disease has been cured and all cubes removed */
  Eradicated = "eradicated",
}

/**
 * The three phases of a player's turn
 */
export enum TurnPhase {
  /** Player is taking actions (4 available) */
  Actions = "actions",
  /** Player is drawing 2 player cards */
  Draw = "draw",
  /** Infecting cities based on infection rate */
  Infect = "infect",
}

/**
 * The overall game status
 */
export enum GameStatus {
  /** Game is in progress */
  Ongoing = "ongoing",
  /** Players have won (all 4 diseases cured) */
  Won = "won",
  /** Players have lost */
  Lost = "lost",
}

/**
 * Tracks the state of disease cubes in a single city
 */
export interface CityState {
  /** Number of blue cubes in the city (0-3) */
  blue: number;
  /** Number of yellow cubes in the city (0-3) */
  yellow: number;
  /** Number of black cubes in the city (0-3) */
  black: number;
  /** Number of red cubes in the city (0-3) */
  red: number;
  /** Whether this city has a research station */
  hasResearchStation: boolean;
}

/**
 * Complete game state for the Pandemic engine
 */
export interface GameState {
  /** Game configuration (player count, difficulty) */
  config: GameConfig;

  /** Array of players in turn order */
  players: Player[];

  /** Index of the current player (0-based) */
  currentPlayerIndex: number;

  /** Current turn phase */
  phase: TurnPhase;

  /** Number of actions remaining in the current action phase (0-4) */
  actionsRemaining: number;

  /** Board state: disease cubes and research stations per city */
  board: Record<string, CityState>;

  /** Cure status for each disease */
  cures: Record<DiseaseColor, CureStatus>;

  /** Disease cube supply remaining (24 per color initially, minus placed cubes) */
  cubeSupply: Record<DiseaseColor, number>;

  /** Current infection rate position (1-7) */
  infectionRatePosition: number;

  /** Number of outbreaks that have occurred (0-8) */
  outbreakCount: number;

  /** Player card draw deck */
  playerDeck: PlayerCard[];

  /** Player card discard pile */
  playerDiscard: PlayerCard[];

  /** Infection card draw deck */
  infectionDeck: InfectionCard[];

  /** Infection card discard pile */
  infectionDiscard: InfectionCard[];

  /** Overall game status (ongoing, won, lost) */
  status: GameStatus;

  /** Track if Operations Expert has used special move this turn */
  operationsExpertSpecialMoveUsed: boolean;
}
