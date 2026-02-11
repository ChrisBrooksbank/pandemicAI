import { createGame } from '@engine/index.ts'
import './App.css'

function App() {
  // Test the @engine alias by creating a game
  const game = createGame({ playerCount: 2, difficulty: 4 })
  const currentPlayer = game.players[game.currentPlayerIndex]

  return (
    <div>
      <h1>Pandemic Game Engine</h1>
      <p>Game initialized successfully!</p>
      <p>Current player: {currentPlayer?.role}</p>
      <p>Current location: {currentPlayer?.location}</p>
      <p>Outbreak count: {game.outbreakCount}</p>
    </div>
  )
}

export default App
