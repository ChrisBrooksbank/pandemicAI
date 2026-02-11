import type { GameState, DiseaseColor, CureStatus } from '@engine/types'
import { Disease } from '@engine/types'
import './StatusBar.css'

interface StatusBarProps {
  gameState: GameState
}

// Infection rate track (positions 1-7, starting at position 1)
const INFECTION_RATES = [2, 2, 2, 3, 3, 4, 4]

/**
 * StatusBar displays key game state indicators:
 * - Outbreak track (0-8)
 * - Infection rate
 * - Cure status for all 4 diseases
 * - Cube supply for all 4 diseases
 */
export function StatusBar({ gameState }: StatusBarProps) {
  const infectionRate = INFECTION_RATES[gameState.infectionRatePosition - 1] ?? 2
  const outbreakCount = gameState.outbreakCount

  // Calculate remaining cubes for each disease
  const cubeSupply: Record<DiseaseColor, number> = {
    [Disease.Blue]: gameState.cubeSupply[Disease.Blue] ?? 0,
    [Disease.Yellow]: gameState.cubeSupply[Disease.Yellow] ?? 0,
    [Disease.Black]: gameState.cubeSupply[Disease.Black] ?? 0,
    [Disease.Red]: gameState.cubeSupply[Disease.Red] ?? 0,
  }

  // Get cure status for each disease
  const cureStatuses: Record<DiseaseColor, CureStatus> = gameState.cures

  return (
    <div className="StatusBar">
      {/* Outbreak Track */}
      <div className="StatusBar_section">
        <h3 className="StatusBar_heading">Outbreak Track</h3>
        <div className="StatusBar_outbreakTrack">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((level) => (
            <div
              key={level}
              className={`StatusBar_outbreakMarker ${
                level === outbreakCount ? 'StatusBar_outbreakMarker--active' : ''
              } ${level >= 6 ? 'StatusBar_outbreakMarker--danger' : ''}`}
            >
              {level}
            </div>
          ))}
        </div>
        <p className="StatusBar_detail">
          {outbreakCount} outbreak{outbreakCount !== 1 ? 's' : ''} (8 = loss)
        </p>
      </div>

      {/* Infection Rate */}
      <div className="StatusBar_section">
        <h3 className="StatusBar_heading">Infection Rate</h3>
        <div className="StatusBar_infectionRate">
          <div className="StatusBar_infectionRateValue">{infectionRate}</div>
          <p className="StatusBar_detail">cards per infection phase</p>
        </div>
      </div>

      {/* Cure Indicators */}
      <div className="StatusBar_section">
        <h3 className="StatusBar_heading">Cures</h3>
        <div className="StatusBar_cures">
          {[Disease.Blue, Disease.Yellow, Disease.Black, Disease.Red].map((disease) => (
            <div key={disease} className="StatusBar_cure">
              <div
                className={`StatusBar_cureIndicator StatusBar_cureIndicator--${disease}`}
                data-status={cureStatuses[disease]}
                title={`${disease}: ${cureStatuses[disease]}`}
              >
                <span className="StatusBar_cureSymbol">
                  {cureStatuses[disease] === 'eradicated' ? '✓✓' : cureStatuses[disease] === 'cured' ? '✓' : '○'}
                </span>
              </div>
              <p className="StatusBar_cureLabel">{disease}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cube Supply */}
      <div className="StatusBar_section">
        <h3 className="StatusBar_heading">Cube Supply</h3>
        <div className="StatusBar_cubeSupply">
          {[Disease.Blue, Disease.Yellow, Disease.Black, Disease.Red].map((disease) => (
            <div key={disease} className="StatusBar_cubeCounter">
              <div
                className={`StatusBar_cubeBar StatusBar_cubeBar--${disease}`}
                style={{
                  width: `${(cubeSupply[disease] / 24) * 100}%`,
                }}
              />
              <p className="StatusBar_cubeCount">
                {cubeSupply[disease]}/24 {disease}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
