import type { Dispatch } from "react";
import type { GameAction } from "./state";
import "./GameOverDialog.css";

interface GameOverDialogProps {
  won: boolean;
  reason?: string;
  dispatch: Dispatch<GameAction>;
}

/**
 * Dialog displaying game over state (win or loss)
 */
export function GameOverDialog({ won, reason, dispatch }: GameOverDialogProps) {
  return (
    <div className="GameOverDialog_overlay">
      <div className={`GameOverDialog_modal ${won ? "GameOverDialog_modal--won" : "GameOverDialog_modal--lost"}`}>
        <div className="GameOverDialog_header">
          <h2 className="GameOverDialog_title">{won ? "Victory!" : "Game Over"}</h2>
          {reason && <p className="GameOverDialog_reason">{reason}</p>}
        </div>

        <div className="GameOverDialog_body">
          <p className="GameOverDialog_message">
            {won
              ? "All diseases have been cured! Humanity is saved!"
              : "The diseases have overwhelmed humanity."}
          </p>
        </div>

        <div className="GameOverDialog_footer">
          <button
            className="GameOverDialog_button GameOverDialog_button--primary"
            onClick={() => {
              dispatch({ type: "CLOSE_DIALOG" });
              dispatch({
                type: "START_GAME",
                config: { playerCount: 2, difficulty: 5 },
              });
            }}
          >
            Play Again
          </button>
          <button
            className="GameOverDialog_button GameOverDialog_button--secondary"
            onClick={() => dispatch({ type: "CLOSE_DIALOG" })}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
