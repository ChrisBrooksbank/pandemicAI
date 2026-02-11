import type { Dispatch } from "react";
import type { GameAction } from "./state";
import "./ShareKnowledgeDialog.css";

interface ShareKnowledgeDialogProps {
  options: string[];
  dispatch: Dispatch<GameAction>;
}

/**
 * Dialog for selecting which share knowledge action to perform
 */
export function ShareKnowledgeDialog({
  options,
  dispatch,
}: ShareKnowledgeDialogProps) {
  return (
    <div className="ShareKnowledgeDialog_overlay">
      <div className="ShareKnowledgeDialog_modal">
        <div className="ShareKnowledgeDialog_header">
          <h2 className="ShareKnowledgeDialog_title">Share Knowledge</h2>
          <p className="ShareKnowledgeDialog_subtitle">
            Select how you want to share knowledge
          </p>
        </div>

        <div className="ShareKnowledgeDialog_body">
          <div className="ShareKnowledgeDialog_options">
            {options.map((action, index) => {
              const parts = action.split(":");
              const actionType = parts[0];
              const cardName = parts[1];
              const playerIndex = parts[2];

              const label =
                actionType === "share-give"
                  ? `Give "${cardName}" to Player ${playerIndex}`
                  : `Take "${cardName}" from Player ${playerIndex}`;

              return (
                <button
                  key={index}
                  className="ShareKnowledgeDialog_option"
                  onClick={() => {
                    dispatch({ type: "PERFORM_ACTION", action });
                    dispatch({ type: "CLOSE_DIALOG" });
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="ShareKnowledgeDialog_footer">
          <button
            className="ShareKnowledgeDialog_button ShareKnowledgeDialog_button--cancel"
            onClick={() => dispatch({ type: "CLOSE_DIALOG" })}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
