import React from "react";
import type { Dispatch } from "react";
import type { GameAction } from "./state";
import { EventType } from "@engine/types";
import "./ResilientPopulationDialog.css";

interface ResilientPopulationDialogProps {
  discardPile: string[];
  currentPlayerIndex: number;
  dispatch: Dispatch<GameAction>;
}

/**
 * Dialog for selecting infection card to remove from discard pile (Resilient Population event)
 */
export function ResilientPopulationDialog({
  discardPile,
  currentPlayerIndex,
  dispatch,
}: ResilientPopulationDialogProps) {
  const [selectedCard, setSelectedCard] = React.useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedCard !== null) {
      dispatch({
        type: "PLAY_EVENT",
        playerIndex: currentPlayerIndex,
        params: {
          event: EventType.ResilientPopulation,
          cityName: selectedCard,
        },
      });
      dispatch({ type: "CLOSE_DIALOG" });
    }
  };

  return (
    <div className="ResilientPopulationDialog_overlay">
      <div className="ResilientPopulationDialog_modal">
        <div className="ResilientPopulationDialog_header">
          <h2 className="ResilientPopulationDialog_title">Resilient Population</h2>
          <p className="ResilientPopulationDialog_subtitle">
            Remove one card from the infection discard pile
          </p>
        </div>

        <div className="ResilientPopulationDialog_body">
          <div className="ResilientPopulationDialog_cards">
            {discardPile.length === 0 ? (
              <p className="ResilientPopulationDialog_empty">
                No cards in infection discard pile
              </p>
            ) : (
              discardPile.map((city, index) => (
                <button
                  key={index}
                  className={`ResilientPopulationDialog_card ${
                    selectedCard === city ? "ResilientPopulationDialog_card--selected" : ""
                  }`}
                  onClick={() => setSelectedCard(city)}
                >
                  {city}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="ResilientPopulationDialog_footer">
          <button
            className="ResilientPopulationDialog_button ResilientPopulationDialog_button--confirm"
            onClick={handleConfirm}
            disabled={selectedCard === null}
          >
            Remove Card
          </button>
          <button
            className="ResilientPopulationDialog_button ResilientPopulationDialog_button--cancel"
            onClick={() => dispatch({ type: "CLOSE_DIALOG" })}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
