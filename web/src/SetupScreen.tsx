import { useState } from 'react'
import type { GameConfig } from '@engine/types'
import './SetupScreen.css'

interface SetupScreenProps {
  onStartGame: (config: GameConfig) => void
}

export function SetupScreen({ onStartGame }: SetupScreenProps) {
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2)
  const [difficulty, setDifficulty] = useState<4 | 5 | 6>(4)

  const handleStartGame = () => {
    onStartGame({ playerCount, difficulty })
  }

  return (
    <div className="SetupScreen">
      <div className="SetupScreen_container">
        <h1 className="SetupScreen_title">Pandemic</h1>
        <p className="SetupScreen_subtitle">Board Game Engine - 2013 Revised Edition</p>

        <div className="SetupScreen_form">
          <div className="SetupScreen_section">
            <label className="SetupScreen_label">Number of Players</label>
            <div className="SetupScreen_buttonGroup">
              <button
                className={`SetupScreen_option ${playerCount === 2 ? 'SetupScreen_option--selected' : ''}`}
                onClick={() => setPlayerCount(2)}
              >
                2 Players
              </button>
              <button
                className={`SetupScreen_option ${playerCount === 3 ? 'SetupScreen_option--selected' : ''}`}
                onClick={() => setPlayerCount(3)}
              >
                3 Players
              </button>
              <button
                className={`SetupScreen_option ${playerCount === 4 ? 'SetupScreen_option--selected' : ''}`}
                onClick={() => setPlayerCount(4)}
              >
                4 Players
              </button>
            </div>
          </div>

          <div className="SetupScreen_section">
            <label className="SetupScreen_label">Difficulty</label>
            <div className="SetupScreen_buttonGroup SetupScreen_buttonGroup--vertical">
              <button
                className={`SetupScreen_option ${difficulty === 4 ? 'SetupScreen_option--selected' : ''}`}
                onClick={() => setDifficulty(4)}
              >
                <span className="SetupScreen_optionTitle">Introductory</span>
                <span className="SetupScreen_optionDetail">4 Epidemic Cards</span>
              </button>
              <button
                className={`SetupScreen_option ${difficulty === 5 ? 'SetupScreen_option--selected' : ''}`}
                onClick={() => setDifficulty(5)}
              >
                <span className="SetupScreen_optionTitle">Standard</span>
                <span className="SetupScreen_optionDetail">5 Epidemic Cards</span>
              </button>
              <button
                className={`SetupScreen_option ${difficulty === 6 ? 'SetupScreen_option--selected' : ''}`}
                onClick={() => setDifficulty(6)}
              >
                <span className="SetupScreen_optionTitle">Heroic</span>
                <span className="SetupScreen_optionDetail">6 Epidemic Cards</span>
              </button>
            </div>
          </div>

          <button className="SetupScreen_startButton" onClick={handleStartGame}>
            Start Game
          </button>
        </div>
      </div>
    </div>
  )
}
