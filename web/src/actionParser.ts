// Action parser utility for converting engine action strings to structured objects

/**
 * Parsed action with structured type and parameters
 */
export interface ParsedAction {
  /** Original action string */
  raw: string;
  /** Action type (e.g., "drive-ferry", "direct-flight") */
  type: string;
  /** Parsed parameters specific to each action type */
  params: ActionParams;
}

/**
 * Discriminated union of all action parameter types
 */
export type ActionParams =
  | { type: "drive-ferry"; destination: string }
  | { type: "direct-flight"; destination: string }
  | { type: "charter-flight"; destination: string }
  | { type: "shuttle-flight"; destination: string }
  | { type: "build-research-station"; cityToRemove?: string }
  | { type: "treat"; color: string }
  | { type: "share-knowledge-give"; targetPlayerIndex: number; cityName: string }
  | { type: "share-knowledge-take"; targetPlayerIndex: number; cityName: string }
  | { type: "discover-cure"; color: string }
  | {
      type: "dispatcher-move-to-pawn";
      playerToMove: number;
      targetPlayer: number;
    }
  | {
      type: "dispatcher-move-other";
      playerIndex: number;
      moveType: string;
      destination: string;
      cardSource?: string;
    }
  | {
      type: "ops-expert-move";
      destination: string;
      cityCardToDiscard: string;
    }
  | { type: "contingency-planner-take"; eventType: string };

/**
 * Parse an action string into a structured ParsedAction object.
 * Handles all action string formats from the game engine.
 *
 * @param raw - The raw action string (e.g., "drive-ferry:Atlanta")
 * @returns ParsedAction with structured type and parameters
 */
export function parseAction(raw: string): ParsedAction {
  const [actionType, ...paramParts] = raw.split(":");
  const paramsStr = paramParts.join(":"); // Rejoin in case city names have colons

  if (!actionType) {
    throw new Error(`Invalid action string: ${raw}`);
  }

  switch (actionType) {
    case "drive-ferry":
      return {
        raw,
        type: actionType,
        params: { type: "drive-ferry", destination: paramsStr },
      };

    case "direct-flight":
      return {
        raw,
        type: actionType,
        params: { type: "direct-flight", destination: paramsStr },
      };

    case "charter-flight":
      return {
        raw,
        type: actionType,
        params: { type: "charter-flight", destination: paramsStr },
      };

    case "shuttle-flight":
      return {
        raw,
        type: actionType,
        params: { type: "shuttle-flight", destination: paramsStr },
      };

    case "build-research-station": {
      const cityToRemove = paramsStr || undefined;
      return {
        raw,
        type: actionType,
        params: { type: "build-research-station", cityToRemove },
      };
    }

    case "treat":
      return {
        raw,
        type: actionType,
        params: { type: "treat", color: paramsStr },
      };

    case "share-knowledge-give": {
      const [targetIndexStr, cityName] = paramsStr.split(":");
      const targetPlayerIndex = parseInt(targetIndexStr ?? "", 10);
      if (isNaN(targetPlayerIndex) || !cityName) {
        throw new Error(`Invalid share-knowledge-give parameters: ${raw}`);
      }
      return {
        raw,
        type: actionType,
        params: { type: "share-knowledge-give", targetPlayerIndex, cityName },
      };
    }

    case "share-knowledge-take": {
      const [targetIndexStr, cityName] = paramsStr.split(":");
      const targetPlayerIndex = parseInt(targetIndexStr ?? "", 10);
      if (isNaN(targetPlayerIndex) || !cityName) {
        throw new Error(`Invalid share-knowledge-take parameters: ${raw}`);
      }
      return {
        raw,
        type: actionType,
        params: { type: "share-knowledge-take", targetPlayerIndex, cityName },
      };
    }

    case "discover-cure":
      return {
        raw,
        type: actionType,
        params: { type: "discover-cure", color: paramsStr },
      };

    case "dispatcher-move-to-pawn": {
      const [playerToMoveStr, targetPlayerStr] = paramsStr.split(":");
      const playerToMove = parseInt(playerToMoveStr ?? "", 10);
      const targetPlayer = parseInt(targetPlayerStr ?? "", 10);
      if (isNaN(playerToMove) || isNaN(targetPlayer)) {
        throw new Error(`Invalid dispatcher-move-to-pawn parameters: ${raw}`);
      }
      return {
        raw,
        type: actionType,
        params: { type: "dispatcher-move-to-pawn", playerToMove, targetPlayer },
      };
    }

    case "dispatcher-move-other": {
      const parts = paramsStr.split(":");
      const playerIndexStr = parts[0];
      const moveType = parts[1];
      const destination = parts[2];
      const cardSource = parts[3];

      const playerIndex = parseInt(playerIndexStr ?? "", 10);
      if (isNaN(playerIndex) || !moveType || !destination) {
        throw new Error(`Invalid dispatcher-move-other parameters: ${raw}`);
      }
      return {
        raw,
        type: actionType,
        params: {
          type: "dispatcher-move-other",
          playerIndex,
          moveType,
          destination,
          cardSource,
        },
      };
    }

    case "ops-expert-move": {
      const [destination, cityCardToDiscard] = paramsStr.split(":");
      if (!destination || !cityCardToDiscard) {
        throw new Error(`Invalid ops-expert-move parameters: ${raw}`);
      }
      return {
        raw,
        type: actionType,
        params: { type: "ops-expert-move", destination, cityCardToDiscard },
      };
    }

    case "contingency-planner-take":
      return {
        raw,
        type: actionType,
        params: { type: "contingency-planner-take", eventType: paramsStr },
      };

    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}

/**
 * Group actions by their type for UI organization.
 * Returns a Map where keys are action types and values are arrays of ParsedAction.
 *
 * @param actions - Array of raw action strings
 * @returns Map of action type to array of ParsedAction
 */
export function groupActionsByType(actions: string[]): Map<string, ParsedAction[]> {
  const grouped = new Map<string, ParsedAction[]>();

  for (const raw of actions) {
    try {
      const parsed = parseAction(raw);
      const existing = grouped.get(parsed.type) ?? [];
      existing.push(parsed);
      grouped.set(parsed.type, existing);
    } catch (error) {
      // Skip invalid actions (shouldn't happen with valid engine output)
      console.error(`Failed to parse action: ${raw}`, error);
    }
  }

  return grouped;
}

/**
 * Extract all unique movement destinations from a list of actions.
 * Useful for highlighting valid destinations on the map.
 *
 * @param actions - Array of raw action strings
 * @returns Set of city names that are valid movement destinations
 */
export function getMovementDestinations(actions: string[]): Set<string> {
  const destinations = new Set<string>();

  for (const raw of actions) {
    try {
      const parsed = parseAction(raw);

      // Check all movement-related action types
      if (parsed.params.type === "drive-ferry") {
        destinations.add(parsed.params.destination);
      } else if (parsed.params.type === "direct-flight") {
        destinations.add(parsed.params.destination);
      } else if (parsed.params.type === "charter-flight") {
        destinations.add(parsed.params.destination);
      } else if (parsed.params.type === "shuttle-flight") {
        destinations.add(parsed.params.destination);
      } else if (parsed.params.type === "ops-expert-move") {
        destinations.add(parsed.params.destination);
      } else if (parsed.params.type === "dispatcher-move-other") {
        destinations.add(parsed.params.destination);
      }
    } catch (error) {
      // Skip invalid actions
      console.error(`Failed to parse action: ${raw}`, error);
    }
  }

  return destinations;
}
