import React from "react";
import type { Dispatch } from "react";
import type { GameAction } from "./state";
import type { GameState } from "@engine/types";
import { EventType } from "@engine/types";
import "./GovernmentGrantDialog.css";

interface GovernmentGrantDialogProps {
  gameState: GameState;
  dispatch: Dispatch<GameAction>;
}

/**
 * Dialog for selecting city for Government Grant event (build research station anywhere)
 */
export function GovernmentGrantDialog({
  gameState,
  dispatch,
}: GovernmentGrantDialogProps) {
  const [selectedCity, setSelectedCity] = React.useState<string | null>(null);
  const [stationToRemove, setStationToRemove] = React.useState<string | null>(null);

  // Count existing research stations
  const existingStations = Object.entries(gameState.board)
    .filter(([, city]) => city.researchStation)
    .map(([name]) => name);

  const needsRemoval = existingStations.length >= 6;

  const handleConfirm = () => {
    if (selectedCity === null) return;
    if (needsRemoval && stationToRemove === null) return;

    dispatch({
      type: "PLAY_EVENT",
      playerIndex: gameState.currentPlayerIndex,
      params: {
        event: EventType.GovernmentGrant,
        targetCity: selectedCity,
        cityToRemoveStation: stationToRemove ?? undefined,
      },
    });
    dispatch({ type: "CLOSE_DIALOG" });
  };

  return (
    <div className="GovernmentGrantDialog_overlay">
      <div className="GovernmentGrantDialog_modal">
        <div className="GovernmentGrantDialog_header">
          <h2 className="GovernmentGrantDialog_title">Government Grant</h2>
          <p className="GovernmentGrantDialog_subtitle">
            Build a research station in any city
          </p>
        </div>

        <div className="GovernmentGrantDialog_body">
          <div className="GovernmentGrantDialog_section">
            <h3 className="GovernmentGrantDialog_sectionTitle">Select City</h3>
            <input
              type="text"
              className="GovernmentGrantDialog_input"
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
            <p className="GovernmentGrantDialog_hint">
              Or click a city on the map
            </p>
          </div>

          {needsRemoval && (
            <div className="GovernmentGrantDialog_section">
              <h3 className="GovernmentGrantDialog_sectionTitle">
                6 Stations Exist - Select One to Remove
              </h3>
              <div className="GovernmentGrantDialog_stations">
                {existingStations.map((city) => (
                  <button
                    key={city}
                    className={`GovernmentGrantDialog_stationButton ${
                      stationToRemove === city ? "GovernmentGrantDialog_stationButton--selected" : ""
                    }`}
                    onClick={() => setStationToRemove(city)}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="GovernmentGrantDialog_footer">
          <button
            className="GovernmentGrantDialog_button GovernmentGrantDialog_button--confirm"
            onClick={handleConfirm}
            disabled={selectedCity === null || (needsRemoval && stationToRemove === null)}
          >
            Build Station
          </button>
          <button
            className="GovernmentGrantDialog_button GovernmentGrantDialog_button--cancel"
            onClick={() => dispatch({ type: "CLOSE_DIALOG" })}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
