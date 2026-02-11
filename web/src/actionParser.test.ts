import { describe, it, expect } from "vitest";
import { parseAction, groupActionsByType, getMovementDestinations } from "./actionParser";

describe("parseAction", () => {
  describe("movement actions", () => {
    it("parses drive-ferry actions", () => {
      const result = parseAction("drive-ferry:Atlanta");
      expect(result).toEqual({
        raw: "drive-ferry:Atlanta",
        type: "drive-ferry",
        params: { type: "drive-ferry", destination: "Atlanta" },
      });
    });

    it("parses direct-flight actions", () => {
      const result = parseAction("direct-flight:Tokyo");
      expect(result).toEqual({
        raw: "direct-flight:Tokyo",
        type: "direct-flight",
        params: { type: "direct-flight", destination: "Tokyo" },
      });
    });

    it("parses charter-flight actions", () => {
      const result = parseAction("charter-flight:Paris");
      expect(result).toEqual({
        raw: "charter-flight:Paris",
        type: "charter-flight",
        params: { type: "charter-flight", destination: "Paris" },
      });
    });

    it("parses shuttle-flight actions", () => {
      const result = parseAction("shuttle-flight:Milan");
      expect(result).toEqual({
        raw: "shuttle-flight:Milan",
        type: "shuttle-flight",
        params: { type: "shuttle-flight", destination: "Milan" },
      });
    });
  });

  describe("build and treat actions", () => {
    it("parses build-research-station without parameters", () => {
      const result = parseAction("build-research-station");
      expect(result).toEqual({
        raw: "build-research-station",
        type: "build-research-station",
        params: { type: "build-research-station", cityToRemove: undefined },
      });
    });

    it("parses build-research-station with city to remove", () => {
      const result = parseAction("build-research-station:Atlanta");
      expect(result).toEqual({
        raw: "build-research-station:Atlanta",
        type: "build-research-station",
        params: { type: "build-research-station", cityToRemove: "Atlanta" },
      });
    });

    it("parses treat actions", () => {
      const result = parseAction("treat:blue");
      expect(result).toEqual({
        raw: "treat:blue",
        type: "treat",
        params: { type: "treat", color: "blue" },
      });
    });
  });

  describe("share knowledge actions", () => {
    it("parses share-knowledge-give actions", () => {
      const result = parseAction("share-knowledge-give:1:Atlanta");
      expect(result).toEqual({
        raw: "share-knowledge-give:1:Atlanta",
        type: "share-knowledge-give",
        params: {
          type: "share-knowledge-give",
          targetPlayerIndex: 1,
          cityName: "Atlanta",
        },
      });
    });

    it("parses share-knowledge-take actions", () => {
      const result = parseAction("share-knowledge-take:2:Paris");
      expect(result).toEqual({
        raw: "share-knowledge-take:2:Paris",
        type: "share-knowledge-take",
        params: {
          type: "share-knowledge-take",
          targetPlayerIndex: 2,
          cityName: "Paris",
        },
      });
    });

    it("throws error for invalid share-knowledge-give parameters", () => {
      expect(() => parseAction("share-knowledge-give:invalid:Atlanta")).toThrow(
        "Invalid share-knowledge-give parameters",
      );
    });

    it("throws error for missing city name in share-knowledge-take", () => {
      expect(() => parseAction("share-knowledge-take:1")).toThrow(
        "Invalid share-knowledge-take parameters",
      );
    });
  });

  describe("cure discovery actions", () => {
    it("parses discover-cure actions", () => {
      const result = parseAction("discover-cure:blue");
      expect(result).toEqual({
        raw: "discover-cure:blue",
        type: "discover-cure",
        params: { type: "discover-cure", color: "blue" },
      });
    });
  });

  describe("role-specific actions", () => {
    it("parses dispatcher-move-to-pawn actions", () => {
      const result = parseAction("dispatcher-move-to-pawn:1:2");
      expect(result).toEqual({
        raw: "dispatcher-move-to-pawn:1:2",
        type: "dispatcher-move-to-pawn",
        params: {
          type: "dispatcher-move-to-pawn",
          playerToMove: 1,
          targetPlayer: 2,
        },
      });
    });

    it("throws error for invalid dispatcher-move-to-pawn parameters", () => {
      expect(() => parseAction("dispatcher-move-to-pawn:invalid:2")).toThrow(
        "Invalid dispatcher-move-to-pawn parameters",
      );
    });

    it("parses dispatcher-move-other actions without card source", () => {
      const result = parseAction("dispatcher-move-other:1:drive:Atlanta");
      expect(result).toEqual({
        raw: "dispatcher-move-other:1:drive:Atlanta",
        type: "dispatcher-move-other",
        params: {
          type: "dispatcher-move-other",
          playerIndex: 1,
          moveType: "drive",
          destination: "Atlanta",
          cardSource: undefined,
        },
      });
    });

    it("parses dispatcher-move-other actions with card source", () => {
      const result = parseAction("dispatcher-move-other:1:direct:Tokyo:player-card");
      expect(result).toEqual({
        raw: "dispatcher-move-other:1:direct:Tokyo:player-card",
        type: "dispatcher-move-other",
        params: {
          type: "dispatcher-move-other",
          playerIndex: 1,
          moveType: "direct",
          destination: "Tokyo",
          cardSource: "player-card",
        },
      });
    });

    it("throws error for invalid dispatcher-move-other parameters", () => {
      expect(() => parseAction("dispatcher-move-other:invalid:drive:Atlanta")).toThrow(
        "Invalid dispatcher-move-other parameters",
      );
    });

    it("parses ops-expert-move actions", () => {
      const result = parseAction("ops-expert-move:Paris:London");
      expect(result).toEqual({
        raw: "ops-expert-move:Paris:London",
        type: "ops-expert-move",
        params: {
          type: "ops-expert-move",
          destination: "Paris",
          cityCardToDiscard: "London",
        },
      });
    });

    it("throws error for invalid ops-expert-move parameters", () => {
      expect(() => parseAction("ops-expert-move:Paris")).toThrow(
        "Invalid ops-expert-move parameters",
      );
    });

    it("parses contingency-planner-take actions", () => {
      const result = parseAction("contingency-planner-take:Airlift");
      expect(result).toEqual({
        raw: "contingency-planner-take:Airlift",
        type: "contingency-planner-take",
        params: {
          type: "contingency-planner-take",
          eventType: "Airlift",
        },
      });
    });
  });

  describe("error handling", () => {
    it("throws error for empty action string", () => {
      expect(() => parseAction("")).toThrow("Invalid action string");
    });

    it("throws error for unknown action type", () => {
      expect(() => parseAction("unknown-action:param")).toThrow("Unknown action type");
    });
  });

  describe("city names with colons", () => {
    it("handles city names containing colons", () => {
      // Edge case: if a city name somehow contained a colon
      const result = parseAction("drive-ferry:City:Name");
      expect(result.params).toEqual({
        type: "drive-ferry",
        destination: "City:Name",
      });
    });
  });
});

describe("groupActionsByType", () => {
  it("groups actions by their type", () => {
    const actions = [
      "drive-ferry:Atlanta",
      "drive-ferry:Chicago",
      "direct-flight:Tokyo",
      "treat:blue",
      "treat:red",
      "build-research-station",
    ];

    const grouped = groupActionsByType(actions);

    expect(grouped.size).toBe(4);
    expect(grouped.get("drive-ferry")?.length).toBe(2);
    expect(grouped.get("direct-flight")?.length).toBe(1);
    expect(grouped.get("treat")?.length).toBe(2);
    expect(grouped.get("build-research-station")?.length).toBe(1);
  });

  it("returns empty map for empty action list", () => {
    const grouped = groupActionsByType([]);
    expect(grouped.size).toBe(0);
  });

  it("handles actions with same type but different parameters", () => {
    const actions = [
      "share-knowledge-give:1:Atlanta",
      "share-knowledge-give:2:Paris",
      "share-knowledge-take:1:London",
    ];

    const grouped = groupActionsByType(actions);

    expect(grouped.size).toBe(2);
    expect(grouped.get("share-knowledge-give")?.length).toBe(2);
    expect(grouped.get("share-knowledge-take")?.length).toBe(1);
  });

  it("skips invalid actions", () => {
    const actions = ["drive-ferry:Atlanta", "invalid-action", "treat:blue"];

    const grouped = groupActionsByType(actions);

    expect(grouped.size).toBe(2);
    expect(grouped.has("drive-ferry")).toBe(true);
    expect(grouped.has("treat")).toBe(true);
  });

  it("preserves parsed action details", () => {
    const actions = ["drive-ferry:Atlanta", "direct-flight:Tokyo"];

    const grouped = groupActionsByType(actions);

    const driveFerryActions = grouped.get("drive-ferry");
    expect(driveFerryActions?.[0]?.raw).toBe("drive-ferry:Atlanta");
    expect(driveFerryActions?.[0]?.params).toEqual({
      type: "drive-ferry",
      destination: "Atlanta",
    });

    const directFlightActions = grouped.get("direct-flight");
    expect(directFlightActions?.[0]?.raw).toBe("direct-flight:Tokyo");
    expect(directFlightActions?.[0]?.params).toEqual({
      type: "direct-flight",
      destination: "Tokyo",
    });
  });
});

describe("getMovementDestinations", () => {
  it("extracts destinations from movement actions", () => {
    const actions = [
      "drive-ferry:Atlanta",
      "drive-ferry:Chicago",
      "direct-flight:Tokyo",
      "charter-flight:Paris",
      "shuttle-flight:Milan",
    ];

    const destinations = getMovementDestinations(actions);

    expect(destinations.size).toBe(5);
    expect(destinations.has("Atlanta")).toBe(true);
    expect(destinations.has("Chicago")).toBe(true);
    expect(destinations.has("Tokyo")).toBe(true);
    expect(destinations.has("Paris")).toBe(true);
    expect(destinations.has("Milan")).toBe(true);
  });

  it("returns empty set for no movement actions", () => {
    const actions = ["treat:blue", "build-research-station", "discover-cure:red"];

    const destinations = getMovementDestinations(actions);

    expect(destinations.size).toBe(0);
  });

  it("deduplicates destinations", () => {
    const actions = [
      "drive-ferry:Atlanta",
      "direct-flight:Atlanta",
      "charter-flight:Atlanta",
    ];

    const destinations = getMovementDestinations(actions);

    expect(destinations.size).toBe(1);
    expect(destinations.has("Atlanta")).toBe(true);
  });

  it("includes ops-expert-move destinations", () => {
    const actions = ["ops-expert-move:Paris:London", "ops-expert-move:Tokyo:Beijing"];

    const destinations = getMovementDestinations(actions);

    expect(destinations.size).toBe(2);
    expect(destinations.has("Paris")).toBe(true);
    expect(destinations.has("Tokyo")).toBe(true);
  });

  it("includes dispatcher-move-other destinations", () => {
    const actions = [
      "dispatcher-move-other:1:drive:Atlanta",
      "dispatcher-move-other:2:direct:Tokyo:player-card",
    ];

    const destinations = getMovementDestinations(actions);

    expect(destinations.size).toBe(2);
    expect(destinations.has("Atlanta")).toBe(true);
    expect(destinations.has("Tokyo")).toBe(true);
  });

  it("skips invalid actions", () => {
    const actions = ["drive-ferry:Atlanta", "invalid-action", "direct-flight:Tokyo"];

    const destinations = getMovementDestinations(actions);

    expect(destinations.size).toBe(2);
    expect(destinations.has("Atlanta")).toBe(true);
    expect(destinations.has("Tokyo")).toBe(true);
  });

  it("handles mixed action types", () => {
    const actions = [
      "drive-ferry:Atlanta",
      "treat:blue",
      "direct-flight:Tokyo",
      "build-research-station",
      "shuttle-flight:Paris",
      "discover-cure:red",
    ];

    const destinations = getMovementDestinations(actions);

    expect(destinations.size).toBe(3);
    expect(destinations.has("Atlanta")).toBe(true);
    expect(destinations.has("Tokyo")).toBe(true);
    expect(destinations.has("Paris")).toBe(true);
  });
});
