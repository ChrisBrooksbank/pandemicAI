import { useReducer } from 'react'
import { appReducer, initialState } from './state'
import { SetupScreen } from './SetupScreen'
import { WorldMap } from './WorldMap'
import { StatusBar } from './StatusBar'
import { PlayerPanel } from './PlayerPanel'
import { ActionBar } from './ActionBar'
import { DiscardDialog } from './DiscardDialog'
import { EpidemicOverlay } from './EpidemicOverlay'
import { GameOverDialog } from './GameOverDialog'
import { ShareKnowledgeDialog } from './ShareKnowledgeDialog'
import { DiscoverCureDialog } from './DiscoverCureDialog'
import { ForecastDialog } from './ForecastDialog'
import { AirliftDialog } from './AirliftDialog'
import { GovernmentGrantDialog } from './GovernmentGrantDialog'
import { ResilientPopulationDialog } from './ResilientPopulationDialog'
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
  const phase = state.game.getCurrentPhase()
  const actionsRemaining = state.game.getActionsRemaining()
  const gameState = state.game.getGameState()
  const availableActions = state.game.getAvailableActions()

  // Handle city clicks for movement actions
  const handleCityClick = (cityName: string) => {
    // Find the action to perform when clicking this city
    // If a specific action is selected, use that; otherwise find any movement action
    let action: string | null = null

    if (state.selectedAction) {
      // Selected action mode (e.g., user clicked "Direct Flight" button)
      action = availableActions.find((a) =>
        a.startsWith(`${state.selectedAction}:${cityName}`)
      ) ?? null
    } else {
      // Auto-select the best movement action (prioritize drive-ferry)
      action =
        availableActions.find((a) => a === `drive-ferry:${cityName}`) ??
        availableActions.find((a) => a === `shuttle-flight:${cityName}`) ??
        availableActions.find((a) => a === `direct-flight:${cityName}`) ??
        availableActions.find((a) => a === `charter-flight:${cityName}`) ??
        availableActions.find((a) => a.startsWith(`ops-expert-move:${cityName}:`)) ??
        null
    }

    if (action) {
      dispatch({ type: 'PERFORM_ACTION', action })
    }
  }

  return (
    <div>
      <h1>Pandemic Game</h1>

      <StatusBar gameState={gameState} />

      <WorldMap
        gameState={gameState}
        availableActions={availableActions}
        selectedAction={state.selectedAction}
        onCityClick={handleCityClick}
      />

      <PlayerPanel
        gameState={gameState}
        currentPlayerIndex={gameState.currentPlayerIndex}
        phase={phase}
        actionsRemaining={actionsRemaining}
      />

      <ActionBar
        phase={phase}
        actionsRemaining={actionsRemaining}
        availableActions={availableActions}
        selectedAction={state.selectedAction}
        dispatch={dispatch}
      />

      {/* Dialogs */}
      {state.dialog.type === 'discard' && (
        <DiscardDialog
          playerIndex={state.dialog.playerIndex}
          playerHand={gameState.players[state.dialog.playerIndex]?.hand ?? []}
          dispatch={dispatch}
        />
      )}

      {state.dialog.type === 'epidemic' && (
        <EpidemicOverlay epidemics={state.dialog.epidemics} dispatch={dispatch} />
      )}

      {state.dialog.type === 'gameOver' && (
        <GameOverDialog
          won={state.dialog.won}
          reason={state.dialog.reason}
          dispatch={dispatch}
        />
      )}

      {state.dialog.type === 'shareKnowledge' && (
        <ShareKnowledgeDialog options={state.dialog.options} dispatch={dispatch} />
      )}

      {state.dialog.type === 'discoverCure' && (
        <DiscoverCureDialog
          playerHand={gameState.players[gameState.currentPlayerIndex]?.hand ?? []}
          diseaseColor={
            state.dialog.cardIndices[0] !== undefined
              ? (gameState.players[gameState.currentPlayerIndex]?.hand[state.dialog.cardIndices[0]]?.type === 'city'
                  ? gameState.players[gameState.currentPlayerIndex]?.hand[state.dialog.cardIndices[0]]?.color
                  : 'blue') ?? 'blue'
              : 'blue'
          }
          cardIndices={state.dialog.cardIndices}
          dispatch={dispatch}
        />
      )}

      {state.dialog.type === 'forecast' && (
        <ForecastDialog cards={state.dialog.cards} dispatch={dispatch} />
      )}

      {state.dialog.type === 'airlift' && (
        <AirliftDialog gameState={gameState} dispatch={dispatch} />
      )}

      {state.dialog.type === 'governmentGrant' && (
        <GovernmentGrantDialog gameState={gameState} dispatch={dispatch} />
      )}

      {state.dialog.type === 'resilientPopulation' && (
        <ResilientPopulationDialog
          discardPile={state.dialog.discardPile}
          currentPlayerIndex={gameState.currentPlayerIndex}
          dispatch={dispatch}
        />
      )}
    </div>
  )
}

export default App
