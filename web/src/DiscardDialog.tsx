import React from "react";
import type { Dispatch } from "react";
import type { GameAction } from "./state";
import type { PlayerCard } from "@engine/types";
import "./DiscardDialog.css";

interface DiscardDialogProps {
  playerIndex: number;
  playerHand: PlayerCard[];
  dispatch: Dispatch<GameAction>;
}

/**
 * Dialog for discarding cards down to the 7-card hand limit
 */
export function DiscardDialog({
  playerIndex,
  playerHand,
  dispatch,
}: DiscardDialogProps) {
  const handSize = playerHand.length;
  const cardsToDiscard = handSize - 7;

  // Track selected cards for discard
  const [selectedIndices, setSelectedIndices] = React.useState<number[]>([]);

  const toggleCard = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleDiscard = () => {
    if (selectedIndices.length === cardsToDiscard) {
      dispatch({
        type: "DISCARD_CARDS",
        playerIndex,
        cardIndices: selectedIndices,
      });
    }
  };

  return (
    <div className="DiscardDialog_overlay">
      <div className="DiscardDialog_modal">
        <div className="DiscardDialog_header">
          <h2 className="DiscardDialog_title">Hand Limit Exceeded</h2>
          <p className="DiscardDialog_subtitle">
            Player {playerIndex + 1} must discard {cardsToDiscard} card{cardsToDiscard !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="DiscardDialog_body">
          <div className="DiscardDialog_cards">
            {playerHand.map((card, index) => {
              const isSelected = selectedIndices.includes(index);
              const cardColor = card.type === "city" ? card.color : "event";

              return (
                <button
                  key={index}
                  className={`DiscardDialog_card DiscardDialog_card--${cardColor} ${
                    isSelected ? "DiscardDialog_card--selected" : ""
                  }`}
                  onClick={() => toggleCard(index)}
                >
                  {card.type === "city" ? card.city : card.event}
                </button>
              );
            })}
          </div>

          <p className="DiscardDialog_counter">
            Selected: {selectedIndices.length} / {cardsToDiscard}
          </p>
        </div>

        <div className="DiscardDialog_footer">
          <button
            className="DiscardDialog_button DiscardDialog_button--primary"
            onClick={handleDiscard}
            disabled={selectedIndices.length !== cardsToDiscard}
          >
            Discard Selected Cards
          </button>
        </div>
      </div>
    </div>
  );
}
