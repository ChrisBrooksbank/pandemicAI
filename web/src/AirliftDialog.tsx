import React from "react";
import type { Dispatch } from "react";
import type { GameAction } from "./state";
import type { GameState } from "@engine/types";
import { EventType } from "@engine/types";
import "./AirliftDialog.css";

interface AirliftDialogProps {
  gameState: GameState;
  dispatch: Dispatch<GameAction>;
}

/**
 * Dialog for selecting player and destination for Airlift event
 */
export function AirliftDialog({ gameState, dispatch }: AirliftDialogProps) {
  const [selectedPlayer, setSelectedPlayer] = React.useState<number | null>(null);
  const [selectedCity, setSelectedCity] = React.useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedPlayer !== null && selectedCity !== null) {
      dispatch({
        type: "PLAY_EVENT",
        playerIndex: gameState.currentPlayerIndex,
        params: {
          event: EventType.Airlift,
          targetPlayerIndex: selectedPlayer,
          destinationCity: selectedCity,
        },
      });
      dispatch({ type: "CLOSE_DIALOG" });
    }
  };

  return (
    <div className="AirliftDialog_overlay">
      <div className="AirliftDialog_modal">
        <div className="AirliftDialog_header">
          <h2 className="AirliftDialog_title">Airlift</h2>
          <p className="AirliftDialog_subtitle">
            Move any pawn to any city
          </p>
        </div>

        <div className="AirliftDialog_body">
          <div className="AirliftDialog_section">
            <h3 className="AirliftDialog_sectionTitle">Select Player</h3>
            <div className="AirliftDialog_players">
              {gameState.players.map((player, index) => (
                <button
                  key={index}
                  className={`AirliftDialog_playerButton ${
                    selectedPlayer === index ? "AirliftDialog_playerButton--selected" : ""
                  }`}
                  onClick={() => setSelectedPlayer(index)}
                >
                  Player {index + 1} ({player.role})
                  <div className="AirliftDialog_playerLocation">
                    Currently at: {player.location}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedPlayer !== null && (
            <div className="AirliftDialog_section">
              <h3 className="AirliftDialog_sectionTitle">Select Destination</h3>
              <input
                type="text"
                className="AirliftDialog_input"
                placeholder="Type city name..."
                value={selectedCity ?? ""}
                onChange={(e) => setSelectedCity(e.target.value)}
                list="cities"
              />
              <datalist id="cities">
                {Object.keys(gameState.board).map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
              <p className="AirliftDialog_hint">
                Or click a city on the map
              </p>
            </div>
          )}
        </div>

        <div className="AirliftDialog_footer">
          <button
            className="AirliftDialog_button AirliftDialog_button--confirm"
            onClick={handleConfirm}
            disabled={selectedPlayer === null || selectedCity === null}
          >
            Airlift
          </button>
          <button
            className="AirliftDialog_button AirliftDialog_button--cancel"
            onClick={() => dispatch({ type: "CLOSE_DIALOG" })}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
