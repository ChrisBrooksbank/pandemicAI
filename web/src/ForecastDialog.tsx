import React from "react";
import type { Dispatch } from "react";
import type { GameAction } from "./state";
import type { DiseaseColor } from "@engine/types";
import "./ForecastDialog.css";

interface ForecastDialogProps {
  cards: Array<{ city: string; color: DiseaseColor }>;
  dispatch: Dispatch<GameAction>;
}

/**
 * Dialog for reordering the top 6 infection cards (Forecast event)
 */
export function ForecastDialog({ cards, dispatch }: ForecastDialogProps) {
  const [orderedCards, setOrderedCards] = React.useState(cards);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...orderedCards];
    [newOrder[index - 1], newOrder[index]] = [
      newOrder[index] as { city: string; color: DiseaseColor },
      newOrder[index - 1] as { city: string; color: DiseaseColor },
    ];
    setOrderedCards(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === orderedCards.length - 1) return;
    const newOrder = [...orderedCards];
    [newOrder[index], newOrder[index + 1]] = [
      newOrder[index + 1] as { city: string; color: DiseaseColor },
      newOrder[index] as { city: string; color: DiseaseColor },
    ];
    setOrderedCards(newOrder);
  };

  return (
    <div className="ForecastDialog_overlay">
      <div className="ForecastDialog_modal">
        <div className="ForecastDialog_header">
          <h2 className="ForecastDialog_title">Forecast</h2>
          <p className="ForecastDialog_subtitle">
            Rearrange the top {cards.length} infection cards
          </p>
        </div>

        <div className="ForecastDialog_body">
          <div className="ForecastDialog_cards">
            {orderedCards.map((card, index) => (
              <div key={index} className="ForecastDialog_cardRow">
                <div className="ForecastDialog_position">{index + 1}</div>
                <div className={`ForecastDialog_card ForecastDialog_card--${card.color}`}>
                  {card.city}
                </div>
                <div className="ForecastDialog_controls">
                  <button
                    className="ForecastDialog_moveButton"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                  >
                    ▲
                  </button>
                  <button
                    className="ForecastDialog_moveButton"
                    onClick={() => moveDown(index)}
                    disabled={index === orderedCards.length - 1}
                  >
                    ▼
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ForecastDialog_footer">
          <button
            className="ForecastDialog_button ForecastDialog_button--confirm"
            onClick={() => {
              dispatch({
                type: "PLAY_EVENT",
                playerIndex: 0, // TODO: get actual player index
                params: {
                  event: 1, // EventType.Forecast
                  newOrder: orderedCards.map((c) => c.city),
                },
              });
              dispatch({ type: "CLOSE_DIALOG" });
            }}
          >
            Confirm Order
          </button>
          <button
            className="ForecastDialog_button ForecastDialog_button--cancel"
            onClick={() => dispatch({ type: "CLOSE_DIALOG" })}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
