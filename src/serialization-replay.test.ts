// Tests for game replay functionality

import { describe, expect, it } from "vitest";
import { createGame } from "./game";
import { driveFerry } from "./actions";
import {
  createReplay,
  replayStep,
  replayForward,
  replayBackward,
  type ReplayAction,
  type ReplayMetadata,
} from "./serialization";
import { Role, GameStatus } from "./types";

describe("GameReplay", () => {
  describe("createReplay", () => {
    it("should create a replay with initial state and actions", () => {
      const initialState = createGame({ playerCount: 2, difficulty: 4 });
      const actions: ReplayAction[] = [
        {
          action: "Drive/Ferry to Chicago",
          result: { ...initialState, turnNumber: 1 },
        },
        {
          action: "Treat Disease in Chicago",
          result: { ...initialState, turnNumber: 2 },
        },
      ];

      const replay = createReplay(initialState, actions);

      expect(replay.initialState).toBe(initialState);
      expect(replay.actions).toHaveLength(2);
      expect(replay.metadata.playerRoles).toHaveLength(2);
      expect(replay.metadata.difficulty).toBe(4);
    });

    it("should extract metadata from states when not provided", () => {
      const initialState = createGame({ playerCount: 3, difficulty: 5 });
      const finalState = {
        ...initialState,
        turnNumber: 10,
        status: GameStatus.Won,
      };
      const actions: ReplayAction[] = [
        {
          action: "Action 1",
          result: finalState,
        },
      ];

      const replay = createReplay(initialState, actions);

      expect(replay.metadata.difficulty).toBe(5);
      expect(replay.metadata.totalTurns).toBe(10);
      expect(replay.metadata.finalOutcome).toBe(GameStatus.Won);
      expect(replay.metadata.playerRoles).toHaveLength(3);
    });

    it("should use provided metadata if given", () => {
      const initialState = createGame({ playerCount: 2, difficulty: 4 });
      const customMetadata: ReplayMetadata = {
        playerNames: ["Alice", "Bob"],
        playerRoles: [Role.Medic, Role.Scientist],
        difficulty: 4,
        finalOutcome: GameStatus.Lost,
        totalTurns: 15,
        timestamp: 1234567890,
      };

      const replay = createReplay(initialState, [], customMetadata);

      expect(replay.metadata).toEqual(customMetadata);
      expect(replay.metadata.playerNames).toEqual(["Alice", "Bob"]);
    });

    it("should handle empty actions array", () => {
      const initialState = createGame({ playerCount: 2, difficulty: 4 });

      const replay = createReplay(initialState, []);

      expect(replay.actions).toHaveLength(0);
      expect(replay.metadata.totalTurns).toBe(initialState.turnNumber); // Starts at 1
      expect(replay.metadata.finalOutcome).toBe(GameStatus.Ongoing);
    });
  });

  describe("replayStep", () => {
    it("should return initial state for step 0", () => {
      const initialState = createGame({ playerCount: 2, difficulty: 4 });
      const replay = createReplay(initialState, []);

      const state = replayStep(replay, 0);

      expect(state).toBe(initialState);
    });

    it("should return correct state for any step index", () => {
      const initialState = createGame({ playerCount: 2, difficulty: 4 });
      const state1 = { ...initialState, turnNumber: 1 };
      const state2 = { ...initialState, turnNumber: 2 };
      const state3 = { ...initialState, turnNumber: 3 };

      const actions: ReplayAction[] = [
        { action: "Action 1", result: state1 },
        { action: "Action 2", result: state2 },
        { action: "Action 3", result: state3 },
      ];

      const replay = createReplay(initialState, actions);

      expect(replayStep(replay, 0)).toBe(initialState);
      expect(replayStep(replay, 1)).toBe(state1);
      expect(replayStep(replay, 2)).toBe(state2);
      expect(replayStep(replay, 3)).toBe(state3);
    });

    it("should throw error for negative step index", () => {
      const initialState = createGame({ playerCount: 2, difficulty: 4 });
      const replay = createReplay(initialState, []);

      expect(() => replayStep(replay, -1)).toThrow("out of bounds");
    });

    it("should throw error for step index beyond end", () => {
      const initialState = createGame({ playerCount: 2, difficulty: 4 });
      const actions: ReplayAction[] = [
        { action: "Action 1", result: { ...initialState, turnNumber: 1 } },
      ];
      const replay = createReplay(initialState, actions);

      expect(() => replayStep(replay, 5)).toThrow("out of bounds");
    });
  });

  describe("replayForward", () => {
    it("should advance to the next step", () => {
      const initialState = createGame({ playerCount: 2, difficulty: 4 });
      const state1 = { ...initialState, turnNumber: 1 };
      const state2 = { ...initialState, turnNumber: 2 };

      const actions: ReplayAction[] = [
        { action: "Action 1", result: state1 },
        { action: "Action 2", result: state2 },
      ];

      const replay = createReplay(initialState, actions);

      // From step 0 to step 1
      const result1 = replayForward(replay, 0);
      expect(result1).not.toBeNull();
      expect(result1?.step).toBe(1);
      expect(result1?.state).toBe(state1);

      // From step 1 to step 2
      const result2 = replayForward(replay, 1);
      expect(result2).not.toBeNull();
      expect(result2?.step).toBe(2);
      expect(result2?.state).toBe(state2);
    });

    it("should return null when already at the end", () => {
      const initialState = createGame({ playerCount: 2, difficulty: 4 });
      const actions: ReplayAction[] = [
        { action: "Action 1", result: { ...initialState, turnNumber: 1 } },
      ];

      const replay = createReplay(initialState, actions);

      // Already at step 1 (last step)
      const result = replayForward(replay, 1);
      expect(result).toBeNull();
    });

    it("should return null for empty replay", () => {
      const initialState = createGame({ playerCount: 2, difficulty: 4 });
      const replay = createReplay(initialState, []);

      const result = replayForward(replay, 0);
      expect(result).toBeNull();
    });
  });

  describe("replayBackward", () => {
    it("should move back to the previous step", () => {
      const initialState = createGame({ playerCount: 2, difficulty: 4 });
      const state1 = { ...initialState, turnNumber: 1 };
      const state2 = { ...initialState, turnNumber: 2 };

      const actions: ReplayAction[] = [
        { action: "Action 1", result: state1 },
        { action: "Action 2", result: state2 },
      ];

      const replay = createReplay(initialState, actions);

      // From step 2 to step 1
      const result1 = replayBackward(replay, 2);
      expect(result1).not.toBeNull();
      expect(result1?.step).toBe(1);
      expect(result1?.state).toBe(state1);

      // From step 1 to step 0
      const result2 = replayBackward(replay, 1);
      expect(result2).not.toBeNull();
      expect(result2?.step).toBe(0);
      expect(result2?.state).toBe(initialState);
    });

    it("should return null when already at the beginning", () => {
      const initialState = createGame({ playerCount: 2, difficulty: 4 });
      const actions: ReplayAction[] = [
        { action: "Action 1", result: { ...initialState, turnNumber: 1 } },
      ];

      const replay = createReplay(initialState, actions);

      // Already at step 0 (beginning)
      const result = replayBackward(replay, 0);
      expect(result).toBeNull();
    });
  });

  describe("Replay integration test", () => {
    it("should replay a sequence of game actions", () => {
      // Create a deterministic game
      const initialState = createGame({ playerCount: 2, difficulty: 4 });

      // Perform some actions and track states
      // Action 1: Move player to an adjacent city
      const state1Result = driveFerry(initialState, "Chicago");
      expect(state1Result.success).toBe(true); // Ensure action succeeded

      const actions: ReplayAction[] = state1Result.success
        ? [
            {
              action: "Drive/Ferry from Atlanta to Chicago",
              result: state1Result.state,
            },
          ]
        : [];

      // Create the replay
      const replay = createReplay(initialState, actions);

      // Step through the replay
      expect(replayStep(replay, 0)).toBe(initialState);
      expect(replayStep(replay, 1)).toBe(state1Result.success ? state1Result.state : initialState);

      // Test forward navigation
      const forward = replayForward(replay, 0);
      expect(forward).not.toBeNull();
      expect(forward?.step).toBe(1);

      // Test backward navigation
      const backward = replayBackward(replay, 1);
      expect(backward).not.toBeNull();
      expect(backward?.step).toBe(0);
    });

    it("should handle a complete game replay with metadata", () => {
      const initialState = createGame({ playerCount: 2, difficulty: 4 });

      // Simulate a few turns
      const state1 = { ...initialState, turnNumber: 1, actionsRemaining: 3 };
      const state2 = { ...initialState, turnNumber: 2, actionsRemaining: 2 };
      const finalState = {
        ...initialState,
        turnNumber: 10,
        status: GameStatus.Won,
      };

      const actions: ReplayAction[] = [
        { action: "Turn 1 - Action 1", result: state1 },
        { action: "Turn 1 - Action 2", result: state2 },
        { action: "Final action - Win!", result: finalState },
      ];

      const metadata: ReplayMetadata = {
        playerNames: ["Alice", "Bob"],
        playerRoles: [Role.Medic, Role.Scientist],
        difficulty: 4,
        finalOutcome: GameStatus.Won,
        totalTurns: 10,
        timestamp: Date.now(),
      };

      const replay = createReplay(initialState, actions, metadata);

      // Verify replay structure
      expect(replay.actions).toHaveLength(3);
      expect(replay.metadata.playerNames).toEqual(["Alice", "Bob"]);
      expect(replay.metadata.finalOutcome).toBe(GameStatus.Won);

      // Step through entire replay
      let currentStep = 0;
      expect(replayStep(replay, currentStep).turnNumber).toBe(initialState.turnNumber); // Initial state's turnNumber

      const step1 = replayForward(replay, currentStep);
      expect(step1?.state.turnNumber).toBe(1);
      currentStep = step1?.step ?? currentStep;

      const step2 = replayForward(replay, currentStep);
      expect(step2?.state.turnNumber).toBe(2);
      currentStep = step2?.step ?? currentStep;

      const step3 = replayForward(replay, currentStep);
      expect(step3?.state.status).toBe(GameStatus.Won);
      expect(step3?.state.turnNumber).toBe(10);

      // Try to go forward again (should be at end)
      const beyondEnd = replayForward(replay, step3?.step ?? 0);
      expect(beyondEnd).toBeNull();
    });
  });

  describe("Replay boundary cases", () => {
    it("should handle single action replay", () => {
      const initialState = createGame({ playerCount: 2, difficulty: 4 });
      const finalState = { ...initialState, turnNumber: 1 };
      const actions: ReplayAction[] = [{ action: "Single action", result: finalState }];

      const replay = createReplay(initialState, actions);

      expect(replayStep(replay, 0)).toBe(initialState);
      expect(replayStep(replay, 1)).toBe(finalState);

      const forward = replayForward(replay, 0);
      expect(forward?.step).toBe(1);
      expect(forward?.state).toBe(finalState);

      const cantGoForward = replayForward(replay, 1);
      expect(cantGoForward).toBeNull();

      const backward = replayBackward(replay, 1);
      expect(backward?.step).toBe(0);
      expect(backward?.state).toBe(initialState);

      const cantGoBackward = replayBackward(replay, 0);
      expect(cantGoBackward).toBeNull();
    });

    it("should handle large replay sequences", () => {
      const initialState = createGame({ playerCount: 2, difficulty: 4 });
      const actions: ReplayAction[] = [];

      // Create 100 action steps
      for (let i = 1; i <= 100; i++) {
        actions.push({
          action: `Action ${i}`,
          result: { ...initialState, turnNumber: i },
        });
      }

      const replay = createReplay(initialState, actions);

      expect(replay.actions).toHaveLength(100);

      // Test accessing middle step
      const midState = replayStep(replay, 50);
      expect(midState.turnNumber).toBe(50);

      // Test forward/backward from middle
      const forward = replayForward(replay, 50);
      expect(forward?.step).toBe(51);
      expect(forward?.state.turnNumber).toBe(51);

      const backward = replayBackward(replay, 50);
      expect(backward?.step).toBe(49);
      expect(backward?.state.turnNumber).toBe(49);
    });
  });
});
