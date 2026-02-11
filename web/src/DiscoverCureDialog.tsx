import type { Dispatch } from "react";
import type { GameAction } from "./state";
import type { PlayerCard, DiseaseColor } from "@engine/types";
import "./DiscoverCureDialog.css";

interface DiscoverCureDialogProps {
  playerHand: PlayerCard[];
  diseaseColor: DiseaseColor;
  cardIndices: number[];
  dispatch: Dispatch<GameAction>;
}

/**
 * Dialog confirming which cards to discard for discovering a cure
 */
export function DiscoverCureDialog({
  playerHand,
  diseaseColor,
  cardIndices,
  dispatch,
}: DiscoverCureDialogProps) {
  const cardsToDiscard = cardIndices.map((i) => playerHand[i]);

  return (
    <div className="DiscoverCureDialog_overlay">
      <div className="DiscoverCureDialog_modal">
        <div className="DiscoverCureDialog_header">
          <h2 className="DiscoverCureDialog_title">Discover Cure</h2>
          <p className="DiscoverCureDialog_subtitle">
            Discard these cards to cure the{" "}
            <span className={`DiscoverCureDialog_disease DiscoverCureDialog_disease--${diseaseColor}`}>
              {diseaseColor}
            </span>{" "}
            disease?
          </p>
        </div>

        <div className="DiscoverCureDialog_body">
          <div className="DiscoverCureDialog_cards">
            {cardsToDiscard.map((card, index) => (
              <div
                key={index}
                className={`DiscoverCureDialog_card DiscoverCureDialog_card--${diseaseColor}`}
              >
                {card?.type === "city" ? card.city : "Unknown"}
              </div>
            ))}
          </div>
        </div>

        <div className="DiscoverCureDialog_footer">
          <button
            className="DiscoverCureDialog_button DiscoverCureDialog_button--confirm"
            onClick={() => {
              dispatch({
                type: "PERFORM_ACTION",
                action: `discover-cure:${diseaseColor}`,
              });
              dispatch({ type: "CLOSE_DIALOG" });
            }}
          >
            Discover Cure
          </button>
          <button
            className="DiscoverCureDialog_button DiscoverCureDialog_button--cancel"
            onClick={() => dispatch({ type: "CLOSE_DIALOG" })}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
