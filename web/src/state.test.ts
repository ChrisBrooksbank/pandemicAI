import { describe, it, expect } from 'vitest'
import { appReducer, initialState, type AppState, type GameAction } from './state'
import { TurnPhase } from '@engine/types'

describe('appReducer', () => {
  describe('START_GAME', () => {
    it('should initialize a new game with the given config', () => {
      const action: GameAction = {
        type: 'START_GAME',
        config: { playerCount: 2, difficulty: 4 },
      }

      const state = appReducer(initialState, action)

      expect(state.game).not.toBeNull()
      expect(state.game?.getGameState().players).toHaveLength(2)
      expect(state.dialog).toEqual({ type: 'none' })
      expect(state.selectedAction).toBeNull()
      expect(state.lastEpidemics).toEqual([])
      expect(state.lastInfections).toEqual([])
    })

    it('should reset state when starting a new game', () => {
      const stateWithGame: AppState = {
        ...initialState,
        game: null,
        dialog: { type: 'gameOver', won: true },
        selectedAction: 'some-action',
        lastEpidemics: [],
        lastInfections: [],
      }

      const action: GameAction = {
        type: 'START_GAME',
        config: { playerCount: 3, difficulty: 5 },
      }

      const state = appReducer(stateWithGame, action)

      expect(state.game).not.toBeNull()
      expect(state.dialog).toEqual({ type: 'none' })
      expect(state.selectedAction).toBeNull()
    })
  })

  describe('SELECT_ACTION', () => {
    it('should set the selected action', () => {
      const action: GameAction = {
        type: 'SELECT_ACTION',
        action: 'direct-flight',
      }

      const state = appReducer(initialState, action)

      expect(state.selectedAction).toBe('direct-flight')
    })

    it('should clear the selected action when null', () => {
      const stateWithSelection: AppState = {
        ...initialState,
        selectedAction: 'some-action',
      }

      const action: GameAction = {
        type: 'SELECT_ACTION',
        action: null,
      }

      const state = appReducer(stateWithSelection, action)

      expect(state.selectedAction).toBeNull()
    })
  })

  describe('CLOSE_DIALOG', () => {
    it('should close any open dialog', () => {
      const stateWithDialog: AppState = {
        ...initialState,
        dialog: { type: 'gameOver', won: true },
      }

      const action: GameAction = {
        type: 'CLOSE_DIALOG',
      }

      const state = appReducer(stateWithDialog, action)

      expect(state.dialog).toEqual({ type: 'none' })
    })
  })

  describe('SET_DIALOG', () => {
    it('should set the dialog to the specified value', () => {
      const action: GameAction = {
        type: 'SET_DIALOG',
        dialog: { type: 'gameOver', won: false, reason: 'Too many outbreaks' },
      }

      const state = appReducer(initialState, action)

      expect(state.dialog).toEqual({
        type: 'gameOver',
        won: false,
        reason: 'Too many outbreaks',
      })
    })
  })

  describe('CONFIRM_EPIDEMIC', () => {
    it('should close epidemic dialog when player hand is under limit', () => {
      // Create a game first
      const gameState = appReducer(initialState, {
        type: 'START_GAME',
        config: { playerCount: 2, difficulty: 4 },
      })

      // Set epidemic dialog
      const stateWithEpidemic: AppState = {
        ...gameState,
        dialog: { type: 'epidemic', epidemics: [] },
      }

      const action: GameAction = {
        type: 'CONFIRM_EPIDEMIC',
      }

      const state = appReducer(stateWithEpidemic, action)

      // Should close the dialog since current player's hand is likely < 7
      expect(state.dialog.type).toBe('none')
    })
  })

  describe('Integration: Game Flow', () => {
    it('should handle a basic game start and phase progression', () => {
      // Start game
      const state = appReducer(initialState, {
        type: 'START_GAME',
        config: { playerCount: 2, difficulty: 4 },
      })

      expect(state.game).not.toBeNull()
      expect(state.game?.getCurrentPhase()).toBe(TurnPhase.Actions)
      expect(state.game?.getActionsRemaining()).toBe(4)
    })
  })
})
