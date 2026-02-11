import type { TurnPhase } from "@engine/types";
import type { Dispatch } from "react";
import type { GameAction } from "./state";
import "./ActionBar.css";

interface ActionBarProps {
  phase: TurnPhase;
  actionsRemaining: number;
  availableActions: string[];
  selectedAction: string | null;
  dispatch: Dispatch<GameAction>;
}

/**
 * ActionBar displays phase-specific buttons for player interactions
 */
export function ActionBar({
  phase,
  actionsRemaining,
  availableActions,
  selectedAction,
  dispatch,
}: ActionBarProps) {
  // Actions Phase: show grouped action buttons
  if (phase === "actions") {
    return (
      <div className="ActionBar_container">
        <div className="ActionBar_header">
          <h2>Actions Phase</h2>
          <span className="ActionBar_counter">
            {actionsRemaining} action{actionsRemaining !== 1 ? "s" : ""} remaining
          </span>
        </div>

        <div className="ActionBar_groups">
          {/* Movement Actions */}
          <ActionGroup
            title="Movement"
            actions={availableActions}
            patterns={[
              /^drive-ferry:/,
              /^direct-flight:/,
              /^charter-flight:/,
              /^shuttle-flight:/,
              /^ops-expert-move:/,
            ]}
            selectedAction={selectedAction}
            dispatch={dispatch}
          />

          {/* Treatment Actions */}
          <ActionGroup
            title="Treat Disease"
            actions={availableActions}
            patterns={[/^treat:/]}
            selectedAction={selectedAction}
            dispatch={dispatch}
          />

          {/* Build Actions */}
          <ActionGroup
            title="Build"
            actions={availableActions}
            patterns={[/^build-research-station$/]}
            selectedAction={selectedAction}
            dispatch={dispatch}
          />

          {/* Share Knowledge Actions */}
          <ActionGroup
            title="Share Knowledge"
            actions={availableActions}
            patterns={[/^share-give:/, /^share-take:/]}
            selectedAction={selectedAction}
            dispatch={dispatch}
          />

          {/* Discover Cure Actions */}
          <ActionGroup
            title="Discover Cure"
            actions={availableActions}
            patterns={[/^discover-cure:/]}
            selectedAction={selectedAction}
            dispatch={dispatch}
          />

          {/* Role-specific Actions */}
          <ActionGroup
            title="Role Abilities"
            actions={availableActions}
            patterns={[
              /^dispatcher-move:/,
              /^dispatcher-direct-flight:/,
              /^contingency-planner-take:/,
            ]}
            selectedAction={selectedAction}
            dispatch={dispatch}
          />
        </div>

        {/* Pass/End Actions button */}
        <div className="ActionBar_endPhase">
          <button
            className="ActionBar_button ActionBar_button--end"
            onClick={() => dispatch({ type: "PERFORM_ACTION", action: "pass" })}
          >
            End Actions Phase
          </button>
        </div>
      </div>
    );
  }

  // Draw Phase: show "Draw 2 Cards" button
  if (phase === "draw") {
    return (
      <div className="ActionBar_container">
        <div className="ActionBar_header">
          <h2>Draw Phase</h2>
        </div>
        <div className="ActionBar_phaseAction">
          <button
            className="ActionBar_button ActionBar_button--primary"
            onClick={() => dispatch({ type: "DRAW_CARDS" })}
          >
            Draw 2 Cards
          </button>
        </div>
      </div>
    );
  }

  // Infect Phase: show "Infect Cities" button
  if (phase === "infect") {
    return (
      <div className="ActionBar_container">
        <div className="ActionBar_header">
          <h2>Infect Phase</h2>
        </div>
        <div className="ActionBar_phaseAction">
          <button
            className="ActionBar_button ActionBar_button--danger"
            onClick={() => dispatch({ type: "INFECT_CITIES" })}
          >
            Infect Cities
          </button>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * ActionGroup displays a group of related actions
 */
interface ActionGroupProps {
  title: string;
  actions: string[];
  patterns: RegExp[];
  selectedAction: string | null;
  dispatch: Dispatch<GameAction>;
}

function ActionGroup({
  title,
  actions,
  patterns,
  selectedAction,
  dispatch,
}: ActionGroupProps) {
  // Filter actions that match any of the patterns
  const matchedActions = actions.filter((action) =>
    patterns.some((pattern) => pattern.test(action))
  );

  // Don't render group if no actions match
  if (matchedActions.length === 0) {
    return null;
  }

  return (
    <div className="ActionBar_group">
      <h3 className="ActionBar_groupTitle">{title}</h3>
      <div className="ActionBar_groupButtons">
        {matchedActions.map((action) => {
          const isSelected = selectedAction === action;
          const label = formatActionLabel(action);

          return (
            <button
              key={action}
              className={`ActionBar_button ${
                isSelected ? "ActionBar_button--selected" : ""
              }`}
              onClick={() => {
                // If action needs two steps (e.g., direct-flight:City), select it
                // Otherwise, perform it directly
                if (needsTargetSelection(action)) {
                  dispatch({ type: "SELECT_ACTION", action });
                } else {
                  dispatch({ type: "PERFORM_ACTION", action });
                }
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Format an action string into a human-readable label
 */
function formatActionLabel(action: string): string {
  // Extract the action type
  const parts = action.split(":");
  const actionType = parts[0] ?? "";

  switch (actionType) {
    case "drive-ferry":
      return `Drive to ${parts[1] ?? ""}`;
    case "direct-flight":
      return `Fly to ${parts[1] ?? ""}`;
    case "charter-flight":
      return `Charter to ${parts[1] ?? ""}`;
    case "shuttle-flight":
      return `Shuttle to ${parts[1] ?? ""}`;
    case "ops-expert-move":
      return `Ops Move to ${parts[1] ?? ""}`;
    case "treat":
      return `Treat ${parts[1] ?? ""}`;
    case "build-research-station":
      return "Build Station";
    case "share-give":
      return `Give ${parts[1] ?? ""} to Player ${parts[2] ?? ""}`;
    case "share-take":
      return `Take ${parts[1] ?? ""} from Player ${parts[2] ?? ""}`;
    case "discover-cure":
      return `Discover Cure (${parts[1] ?? ""})`;
    case "dispatcher-move":
      return `Move Player ${parts[1] ?? ""} to ${parts[2] ?? ""}`;
    case "dispatcher-direct-flight":
      return `Dispatcher Fly Player ${parts[1] ?? ""} to ${parts[2] ?? ""}`;
    case "contingency-planner-take":
      return `Store Event: ${parts[1] ?? ""}`;
    default:
      return action;
  }
}

/**
 * Check if an action requires target selection (two-step flow)
 */
function needsTargetSelection(action: string): boolean {
  // Most actions with parameters are complete
  // Only a few action types need target selection
  // For now, all actions are complete from getAvailableActions()
  return false;
}
