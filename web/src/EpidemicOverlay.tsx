import type { Dispatch } from "react";
import type { GameAction } from "./state";
import type { EpidemicInfo } from "@engine/orchestrator";
import "./EpidemicOverlay.css";

interface EpidemicOverlayProps {
  epidemics: EpidemicInfo[];
  dispatch: Dispatch<GameAction>;
}

/**
 * Overlay displaying epidemic event information
 */
export function EpidemicOverlay({ epidemics, dispatch }: EpidemicOverlayProps) {
  return (
    <div className="EpidemicOverlay_overlay">
      <div className="EpidemicOverlay_modal">
        <div className="EpidemicOverlay_header">
          <h2 className="EpidemicOverlay_title">EPIDEMIC!</h2>
        </div>

        <div className="EpidemicOverlay_body">
          {epidemics.map((epidemic, i) => (
            <div key={i} className="EpidemicOverlay_info">
              <div className="EpidemicOverlay_detail">
                <span className="EpidemicOverlay_label">City Infected:</span>
                <span className={`EpidemicOverlay_city EpidemicOverlay_city--${epidemic.infectedColor}`}>
                  {epidemic.infectedCity}
                </span>
              </div>
              <div className="EpidemicOverlay_detail">
                <span className="EpidemicOverlay_label">Disease:</span>
                <span className={`EpidemicOverlay_disease EpidemicOverlay_disease--${epidemic.infectedColor}`}>
                  {epidemic.infectedColor}
                </span>
              </div>
              <div className="EpidemicOverlay_detail">
                <span className="EpidemicOverlay_label">New Infection Rate:</span>
                <span className="EpidemicOverlay_rate">{epidemic.newInfectionRate}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="EpidemicOverlay_footer">
          <button
            className="EpidemicOverlay_button"
            onClick={() => dispatch({ type: "CONFIRM_EPIDEMIC" })}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
