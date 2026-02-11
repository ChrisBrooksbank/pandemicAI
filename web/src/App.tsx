import { useReducer } from 'react'
import { appReducer, initialState } from './state'
import { SetupScreen } from './SetupScreen'
import './App.css'

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // If no game is started, show setup screen
  if (!state.game) {
    return (
      <SetupScreen
        onStartGame={(config) => dispatch({ type: 'START_GAME', config })}
      />
    )
  }

  // Game is active
  const currentPlayer = state.game.getCurrentPlayer()
  const phase = state.game.getCurrentPhase()
  const actionsRemaining = state.game.getActionsRemaining()
  const gameState = state.game.getGameState()

  return (
    <div>
      <h1>Pandemic Game</h1>
      <div>
        <h2>Current Turn</h2>
        <p>Player: {currentPlayer.role}</p>
        <p>Location: {currentPlayer.location}</p>
        <p>Phase: {phase}</p>
        {phase === 'actions' && <p>Actions remaining: {actionsRemaining}</p>}
      </div>

      <div>
        <h2>Game Status</h2>
        <p>Outbreak count: {gameState.outbreakCount}</p>
        <p>Infection rate: {gameState.infectionRatePosition}</p>
      </div>

      <div>
        <h2>Actions</h2>
        {phase === 'actions' && (
          <button onClick={() => dispatch({ type: 'PERFORM_ACTION', action: 'pass' })}>
            End Actions
          </button>
        )}
        {phase === 'draw' && (
          <button onClick={() => dispatch({ type: 'DRAW_CARDS' })}>Draw 2 Cards</button>
        )}
        {phase === 'infect' && (
          <button onClick={() => dispatch({ type: 'INFECT_CITIES' })}>Infect Cities</button>
        )}
      </div>

      {state.dialog.type === 'epidemic' && (
        <div style={{ border: '2px solid red', padding: '1rem', margin: '1rem' }}>
          <h2>EPIDEMIC!</h2>
          {state.dialog.epidemics.map((epidemic, i) => (
            <p key={i}>
              {epidemic.infectedCity} infected with {epidemic.infectedColor}!
            </p>
          ))}
          <button onClick={() => dispatch({ type: 'CONFIRM_EPIDEMIC' })}>Continue</button>
        </div>
      )}

      {state.dialog.type === 'gameOver' && (
        <div style={{ border: '2px solid white', padding: '1rem', margin: '1rem' }}>
          <h2>{state.dialog.won ? 'Victory!' : 'Game Over'}</h2>
          <button onClick={() => dispatch({ type: 'CLOSE_DIALOG' })}>Close</button>
        </div>
      )}
    </div>
  )
}

export default App
