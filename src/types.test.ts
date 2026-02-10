import { describe, it, expect } from "vitest";
import {
  Disease,
  DiseaseColor,
  Role,
  RoleType,
  EventType,
  CureStatus,
  TurnPhase,
  GameStatus,
  CityCard,
  EventCard,
  EpidemicCard,
  PlayerCard,
  InfectionCard,
  Player,
  GameConfig,
  CityState,
  GameState,
} from "./types";

describe("Disease enum", () => {
  it("should have exactly 4 disease colors", () => {
    const diseases = Object.values(Disease);
    expect(diseases).toHaveLength(4);
  });

  it("should define blue disease", () => {
    expect(Disease.Blue).toBe("blue");
  });

  it("should define yellow disease", () => {
    expect(Disease.Yellow).toBe("yellow");
  });

  it("should define black disease", () => {
    expect(Disease.Black).toBe("black");
  });

  it("should define red disease", () => {
    expect(Disease.Red).toBe("red");
  });

  it("should contain all expected disease values", () => {
    const diseases = Object.values(Disease);
    expect(diseases).toContain("blue");
    expect(diseases).toContain("yellow");
    expect(diseases).toContain("black");
    expect(diseases).toContain("red");
  });
});

describe("DiseaseColor type", () => {
  it("should accept Disease enum values", () => {
    const color: DiseaseColor = Disease.Blue;
    expect(color).toBe(Disease.Blue);
  });
});

describe("Role enum", () => {
  it("should have exactly 7 roles", () => {
    const roles = Object.values(Role);
    expect(roles).toHaveLength(7);
  });

  it("should define contingency planner role", () => {
    expect(Role.ContingencyPlanner).toBe("contingency_planner");
  });

  it("should define dispatcher role", () => {
    expect(Role.Dispatcher).toBe("dispatcher");
  });

  it("should define medic role", () => {
    expect(Role.Medic).toBe("medic");
  });

  it("should define operations expert role", () => {
    expect(Role.OperationsExpert).toBe("operations_expert");
  });

  it("should define quarantine specialist role", () => {
    expect(Role.QuarantineSpecialist).toBe("quarantine_specialist");
  });

  it("should define researcher role", () => {
    expect(Role.Researcher).toBe("researcher");
  });

  it("should define scientist role", () => {
    expect(Role.Scientist).toBe("scientist");
  });

  it("should contain all expected role values", () => {
    const roles = Object.values(Role);
    expect(roles).toContain("contingency_planner");
    expect(roles).toContain("dispatcher");
    expect(roles).toContain("medic");
    expect(roles).toContain("operations_expert");
    expect(roles).toContain("quarantine_specialist");
    expect(roles).toContain("researcher");
    expect(roles).toContain("scientist");
  });
});

describe("RoleType type", () => {
  it("should accept Role enum values", () => {
    const role: RoleType = Role.Medic;
    expect(role).toBe(Role.Medic);
  });
});

describe("EventType enum", () => {
  it("should have exactly 5 event types", () => {
    const events = Object.values(EventType);
    expect(events).toHaveLength(5);
  });

  it("should define airlift event", () => {
    expect(EventType.Airlift).toBe("airlift");
  });

  it("should define forecast event", () => {
    expect(EventType.Forecast).toBe("forecast");
  });

  it("should define government grant event", () => {
    expect(EventType.GovernmentGrant).toBe("government_grant");
  });

  it("should define one quiet night event", () => {
    expect(EventType.OneQuietNight).toBe("one_quiet_night");
  });

  it("should define resilient population event", () => {
    expect(EventType.ResilientPopulation).toBe("resilient_population");
  });

  it("should contain all expected event values", () => {
    const events = Object.values(EventType);
    expect(events).toContain("airlift");
    expect(events).toContain("forecast");
    expect(events).toContain("government_grant");
    expect(events).toContain("one_quiet_night");
    expect(events).toContain("resilient_population");
  });
});

describe("CityCard", () => {
  it("should create a valid city card", () => {
    const card: CityCard = {
      type: "city",
      city: "Atlanta",
      color: Disease.Blue,
    };
    expect(card.type).toBe("city");
    expect(card.city).toBe("Atlanta");
    expect(card.color).toBe(Disease.Blue);
  });

  it("should support all disease colors", () => {
    const blueCard: CityCard = {
      type: "city",
      city: "Paris",
      color: Disease.Blue,
    };
    const yellowCard: CityCard = {
      type: "city",
      city: "Lima",
      color: Disease.Yellow,
    };
    const blackCard: CityCard = {
      type: "city",
      city: "Cairo",
      color: Disease.Black,
    };
    const redCard: CityCard = {
      type: "city",
      city: "Tokyo",
      color: Disease.Red,
    };

    expect(blueCard.color).toBe(Disease.Blue);
    expect(yellowCard.color).toBe(Disease.Yellow);
    expect(blackCard.color).toBe(Disease.Black);
    expect(redCard.color).toBe(Disease.Red);
  });
});

describe("EventCard", () => {
  it("should create a valid event card", () => {
    const card: EventCard = {
      type: "event",
      event: EventType.Airlift,
    };
    expect(card.type).toBe("event");
    expect(card.event).toBe(EventType.Airlift);
  });

  it("should support all event types", () => {
    const events = Object.values(EventType);
    events.forEach((eventType) => {
      const card: EventCard = {
        type: "event",
        event: eventType,
      };
      expect(card.event).toBe(eventType);
    });
  });
});

describe("EpidemicCard", () => {
  it("should create a valid epidemic card", () => {
    const card: EpidemicCard = {
      type: "epidemic",
    };
    expect(card.type).toBe("epidemic");
  });
});

describe("PlayerCard", () => {
  it("should accept city cards", () => {
    const card: PlayerCard = {
      type: "city",
      city: "Atlanta",
      color: Disease.Blue,
    };
    expect(card.type).toBe("city");
  });

  it("should accept event cards", () => {
    const card: PlayerCard = {
      type: "event",
      event: EventType.Forecast,
    };
    expect(card.type).toBe("event");
  });

  it("should accept epidemic cards", () => {
    const card: PlayerCard = {
      type: "epidemic",
    };
    expect(card.type).toBe("epidemic");
  });

  it("should allow type discrimination", () => {
    const cityCard: PlayerCard = {
      type: "city",
      city: "London",
      color: Disease.Blue,
    };
    const eventCard: PlayerCard = {
      type: "event",
      event: EventType.Airlift,
    };
    const epidemicCard: PlayerCard = {
      type: "epidemic",
    };

    if (cityCard.type === "city") {
      expect(cityCard.city).toBe("London");
      expect(cityCard.color).toBe(Disease.Blue);
    }

    if (eventCard.type === "event") {
      expect(eventCard.event).toBe(EventType.Airlift);
    }

    if (epidemicCard.type === "epidemic") {
      expect(epidemicCard.type).toBe("epidemic");
    }
  });
});

describe("InfectionCard", () => {
  it("should create a valid infection card", () => {
    const card: InfectionCard = {
      city: "Atlanta",
      color: Disease.Blue,
    };
    expect(card.city).toBe("Atlanta");
    expect(card.color).toBe(Disease.Blue);
  });

  it("should support all disease colors", () => {
    const blueCard: InfectionCard = {
      city: "Paris",
      color: Disease.Blue,
    };
    const yellowCard: InfectionCard = {
      city: "Lima",
      color: Disease.Yellow,
    };
    const blackCard: InfectionCard = {
      city: "Cairo",
      color: Disease.Black,
    };
    const redCard: InfectionCard = {
      city: "Tokyo",
      color: Disease.Red,
    };

    expect(blueCard.color).toBe(Disease.Blue);
    expect(yellowCard.color).toBe(Disease.Yellow);
    expect(blackCard.color).toBe(Disease.Black);
    expect(redCard.color).toBe(Disease.Red);
  });
});

describe("Player", () => {
  it("should create a valid player", () => {
    const player: Player = {
      role: Role.Medic,
      location: "Atlanta",
      hand: [],
    };
    expect(player.role).toBe(Role.Medic);
    expect(player.location).toBe("Atlanta");
    expect(player.hand).toEqual([]);
  });

  it("should support all roles", () => {
    const roles = Object.values(Role);
    roles.forEach((role) => {
      const player: Player = {
        role: role,
        location: "Atlanta",
        hand: [],
      };
      expect(player.role).toBe(role);
    });
  });

  it("should hold city cards in hand", () => {
    const player: Player = {
      role: Role.Scientist,
      location: "Paris",
      hand: [
        { type: "city", city: "London", color: Disease.Blue },
        { type: "city", city: "Madrid", color: Disease.Blue },
      ],
    };
    expect(player.hand).toHaveLength(2);
    expect(player.hand[0]?.type).toBe("city");
  });

  it("should hold event cards in hand", () => {
    const player: Player = {
      role: Role.Researcher,
      location: "Tokyo",
      hand: [
        { type: "event", event: EventType.Airlift },
        { type: "city", city: "Seoul", color: Disease.Red },
      ],
    };
    expect(player.hand).toHaveLength(2);
    expect(player.hand[0]?.type).toBe("event");
  });

  it("should allow empty hand", () => {
    const player: Player = {
      role: Role.OperationsExpert,
      location: "Atlanta",
      hand: [],
    };
    expect(player.hand).toEqual([]);
  });
});

describe("GameConfig", () => {
  it("should create a valid config with 2 players and 4 epidemics", () => {
    const config: GameConfig = {
      playerCount: 2,
      difficulty: 4,
    };
    expect(config.playerCount).toBe(2);
    expect(config.difficulty).toBe(4);
  });

  it("should create a valid config with 3 players and 5 epidemics", () => {
    const config: GameConfig = {
      playerCount: 3,
      difficulty: 5,
    };
    expect(config.playerCount).toBe(3);
    expect(config.difficulty).toBe(5);
  });

  it("should create a valid config with 4 players and 6 epidemics", () => {
    const config: GameConfig = {
      playerCount: 4,
      difficulty: 6,
    };
    expect(config.playerCount).toBe(4);
    expect(config.difficulty).toBe(6);
  });

  it("should support all valid player counts", () => {
    const validCounts: Array<2 | 3 | 4> = [2, 3, 4];
    validCounts.forEach((count) => {
      const config: GameConfig = {
        playerCount: count,
        difficulty: 5,
      };
      expect(config.playerCount).toBe(count);
    });
  });

  it("should support all valid difficulty levels", () => {
    const validDifficulties: Array<4 | 5 | 6> = [4, 5, 6];
    validDifficulties.forEach((diff) => {
      const config: GameConfig = {
        playerCount: 3,
        difficulty: diff,
      };
      expect(config.difficulty).toBe(diff);
    });
  });
});

describe("CureStatus enum", () => {
  it("should have exactly 3 cure statuses", () => {
    const statuses = Object.values(CureStatus);
    expect(statuses).toHaveLength(3);
  });

  it("should define uncured status", () => {
    expect(CureStatus.Uncured).toBe("uncured");
  });

  it("should define cured status", () => {
    expect(CureStatus.Cured).toBe("cured");
  });

  it("should define eradicated status", () => {
    expect(CureStatus.Eradicated).toBe("eradicated");
  });
});

describe("TurnPhase enum", () => {
  it("should have exactly 3 turn phases", () => {
    const phases = Object.values(TurnPhase);
    expect(phases).toHaveLength(3);
  });

  it("should define actions phase", () => {
    expect(TurnPhase.Actions).toBe("actions");
  });

  it("should define draw phase", () => {
    expect(TurnPhase.Draw).toBe("draw");
  });

  it("should define infect phase", () => {
    expect(TurnPhase.Infect).toBe("infect");
  });
});

describe("GameStatus enum", () => {
  it("should have exactly 3 game statuses", () => {
    const statuses = Object.values(GameStatus);
    expect(statuses).toHaveLength(3);
  });

  it("should define ongoing status", () => {
    expect(GameStatus.Ongoing).toBe("ongoing");
  });

  it("should define won status", () => {
    expect(GameStatus.Won).toBe("won");
  });

  it("should define lost status", () => {
    expect(GameStatus.Lost).toBe("lost");
  });
});

describe("CityState", () => {
  it("should create a city state with no cubes", () => {
    const state: CityState = {
      blue: 0,
      yellow: 0,
      black: 0,
      red: 0,
      hasResearchStation: false,
    };
    expect(state.blue).toBe(0);
    expect(state.yellow).toBe(0);
    expect(state.black).toBe(0);
    expect(state.red).toBe(0);
    expect(state.hasResearchStation).toBe(false);
  });

  it("should create a city state with cubes", () => {
    const state: CityState = {
      blue: 2,
      yellow: 1,
      black: 0,
      red: 3,
      hasResearchStation: false,
    };
    expect(state.blue).toBe(2);
    expect(state.yellow).toBe(1);
    expect(state.red).toBe(3);
  });

  it("should create a city state with a research station", () => {
    const state: CityState = {
      blue: 0,
      yellow: 0,
      black: 0,
      red: 0,
      hasResearchStation: true,
    };
    expect(state.hasResearchStation).toBe(true);
  });
});

describe("GameState", () => {
  it("should create a minimal game state", () => {
    const state: GameState = {
      config: { playerCount: 2, difficulty: 4 },
      players: [
        { role: Role.Medic, location: "Atlanta", hand: [] },
        { role: Role.Scientist, location: "Atlanta", hand: [] },
      ],
      currentPlayerIndex: 0,
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
      board: {
        Atlanta: {
          blue: 0,
          yellow: 0,
          black: 0,
          red: 0,
          hasResearchStation: true,
        },
      },
      cures: {
        [Disease.Blue]: CureStatus.Uncured,
        [Disease.Yellow]: CureStatus.Uncured,
        [Disease.Black]: CureStatus.Uncured,
        [Disease.Red]: CureStatus.Uncured,
      },
      cubeSupply: {
        [Disease.Blue]: 24,
        [Disease.Yellow]: 24,
        [Disease.Black]: 24,
        [Disease.Red]: 24,
      },
      infectionRatePosition: 1,
      outbreakCount: 0,
      playerDeck: [],
      playerDiscard: [],
      infectionDeck: [],
      infectionDiscard: [],
      status: GameStatus.Ongoing,
    };

    expect(state.config.playerCount).toBe(2);
    expect(state.players).toHaveLength(2);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.phase).toBe(TurnPhase.Actions);
    expect(state.actionsRemaining).toBe(4);
    expect(state.status).toBe(GameStatus.Ongoing);
  });

  it("should track infection rate position", () => {
    const state: GameState = {
      config: { playerCount: 3, difficulty: 5 },
      players: [],
      currentPlayerIndex: 0,
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
      board: {},
      cures: {
        [Disease.Blue]: CureStatus.Uncured,
        [Disease.Yellow]: CureStatus.Uncured,
        [Disease.Black]: CureStatus.Uncured,
        [Disease.Red]: CureStatus.Uncured,
      },
      cubeSupply: {
        [Disease.Blue]: 24,
        [Disease.Yellow]: 24,
        [Disease.Black]: 24,
        [Disease.Red]: 24,
      },
      infectionRatePosition: 3,
      outbreakCount: 0,
      playerDeck: [],
      playerDiscard: [],
      infectionDeck: [],
      infectionDiscard: [],
      status: GameStatus.Ongoing,
    };

    expect(state.infectionRatePosition).toBe(3);
  });

  it("should track outbreak count", () => {
    const state: GameState = {
      config: { playerCount: 4, difficulty: 6 },
      players: [],
      currentPlayerIndex: 0,
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
      board: {},
      cures: {
        [Disease.Blue]: CureStatus.Uncured,
        [Disease.Yellow]: CureStatus.Uncured,
        [Disease.Black]: CureStatus.Uncured,
        [Disease.Red]: CureStatus.Uncured,
      },
      cubeSupply: {
        [Disease.Blue]: 24,
        [Disease.Yellow]: 24,
        [Disease.Black]: 24,
        [Disease.Red]: 24,
      },
      infectionRatePosition: 1,
      outbreakCount: 5,
      playerDeck: [],
      playerDiscard: [],
      infectionDeck: [],
      infectionDiscard: [],
      status: GameStatus.Ongoing,
    };

    expect(state.outbreakCount).toBe(5);
  });

  it("should track cure status per disease", () => {
    const state: GameState = {
      config: { playerCount: 2, difficulty: 4 },
      players: [],
      currentPlayerIndex: 0,
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
      board: {},
      cures: {
        [Disease.Blue]: CureStatus.Cured,
        [Disease.Yellow]: CureStatus.Uncured,
        [Disease.Black]: CureStatus.Eradicated,
        [Disease.Red]: CureStatus.Uncured,
      },
      cubeSupply: {
        [Disease.Blue]: 20,
        [Disease.Yellow]: 18,
        [Disease.Black]: 24,
        [Disease.Red]: 15,
      },
      infectionRatePosition: 1,
      outbreakCount: 0,
      playerDeck: [],
      playerDiscard: [],
      infectionDeck: [],
      infectionDiscard: [],
      status: GameStatus.Ongoing,
    };

    expect(state.cures[Disease.Blue]).toBe(CureStatus.Cured);
    expect(state.cures[Disease.Black]).toBe(CureStatus.Eradicated);
    expect(state.cures[Disease.Yellow]).toBe(CureStatus.Uncured);
  });

  it("should track cube supply per disease", () => {
    const state: GameState = {
      config: { playerCount: 2, difficulty: 4 },
      players: [],
      currentPlayerIndex: 0,
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
      board: {},
      cures: {
        [Disease.Blue]: CureStatus.Uncured,
        [Disease.Yellow]: CureStatus.Uncured,
        [Disease.Black]: CureStatus.Uncured,
        [Disease.Red]: CureStatus.Uncured,
      },
      cubeSupply: {
        [Disease.Blue]: 20,
        [Disease.Yellow]: 18,
        [Disease.Black]: 22,
        [Disease.Red]: 15,
      },
      infectionRatePosition: 1,
      outbreakCount: 0,
      playerDeck: [],
      playerDiscard: [],
      infectionDeck: [],
      infectionDiscard: [],
      status: GameStatus.Ongoing,
    };

    expect(state.cubeSupply[Disease.Blue]).toBe(20);
    expect(state.cubeSupply[Disease.Yellow]).toBe(18);
    expect(state.cubeSupply[Disease.Black]).toBe(22);
    expect(state.cubeSupply[Disease.Red]).toBe(15);
  });

  it("should track player and infection decks", () => {
    const cityCard: CityCard = {
      type: "city",
      city: "Atlanta",
      color: Disease.Blue,
    };
    const infectionCard: InfectionCard = {
      city: "Paris",
      color: Disease.Blue,
    };

    const state: GameState = {
      config: { playerCount: 2, difficulty: 4 },
      players: [],
      currentPlayerIndex: 0,
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
      board: {},
      cures: {
        [Disease.Blue]: CureStatus.Uncured,
        [Disease.Yellow]: CureStatus.Uncured,
        [Disease.Black]: CureStatus.Uncured,
        [Disease.Red]: CureStatus.Uncured,
      },
      cubeSupply: {
        [Disease.Blue]: 24,
        [Disease.Yellow]: 24,
        [Disease.Black]: 24,
        [Disease.Red]: 24,
      },
      infectionRatePosition: 1,
      outbreakCount: 0,
      playerDeck: [cityCard],
      playerDiscard: [],
      infectionDeck: [infectionCard],
      infectionDiscard: [],
      status: GameStatus.Ongoing,
    };

    expect(state.playerDeck).toHaveLength(1);
    expect(state.infectionDeck).toHaveLength(1);
    expect(state.playerDeck[0]).toEqual(cityCard);
    expect(state.infectionDeck[0]).toEqual(infectionCard);
  });

  it("should track game status", () => {
    const wonState: GameState = {
      config: { playerCount: 2, difficulty: 4 },
      players: [],
      currentPlayerIndex: 0,
      phase: TurnPhase.Actions,
      actionsRemaining: 4,
      board: {},
      cures: {
        [Disease.Blue]: CureStatus.Cured,
        [Disease.Yellow]: CureStatus.Cured,
        [Disease.Black]: CureStatus.Cured,
        [Disease.Red]: CureStatus.Cured,
      },
      cubeSupply: {
        [Disease.Blue]: 24,
        [Disease.Yellow]: 24,
        [Disease.Black]: 24,
        [Disease.Red]: 24,
      },
      infectionRatePosition: 1,
      outbreakCount: 0,
      playerDeck: [],
      playerDiscard: [],
      infectionDeck: [],
      infectionDiscard: [],
      status: GameStatus.Won,
    };

    expect(wonState.status).toBe(GameStatus.Won);

    const lostState: GameState = {
      ...wonState,
      status: GameStatus.Lost,
      outbreakCount: 8,
    };

    expect(lostState.status).toBe(GameStatus.Lost);
  });
});
