import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBar } from './StatusBar'
import type { GameState } from '@engine/types'
import { Disease, CureStatus } from '@engine/types'

// Helper to create a minimal GameState for testing
function createTestGameState(overrides?: Partial<GameState>): GameState {
  return {
    cities: [],
    players: [],
    currentPlayerIndex: 0,
    currentPhase: 'actions',
    actionsRemaining: 4,
    playerDeck: [],
    playerDiscardPile: [],
    infectionDeck: [],
    infectionDiscardPile: [],
    infectionRatePosition: 0,
    infectionRates: [2, 2, 2, 3, 3, 4, 4],
    outbreakCount: 0,
    cubeSupply: {
      [Disease.Blue]: 24,
      [Disease.Yellow]: 24,
      [Disease.Black]: 24,
      [Disease.Red]: 24,
    },
    cures: {
      [Disease.Blue]: CureStatus.Uncured,
      [Disease.Yellow]: CureStatus.Uncured,
      [Disease.Black]: CureStatus.Uncured,
      [Disease.Red]: CureStatus.Uncured,
    },
    eradicatedDiseases: new Set(),
    researchStations: [],
    skipNextInfectionPhase: false,
    contingencyPlannerCard: null,
    gameStatus: 'ongoing',
    ...overrides,
  } as GameState
}

describe('StatusBar', () => {
  it('displays outbreak track with current count', () => {
    const gameState = createTestGameState({ outbreakCount: 3 })
    render(<StatusBar gameState={gameState} />)

    expect(screen.getByText('Outbreak Track')).toBeInTheDocument()
    expect(screen.getByText('3 outbreaks (8 = loss)')).toBeInTheDocument()
  })

  it('displays singular outbreak text for 1 outbreak', () => {
    const gameState = createTestGameState({ outbreakCount: 1 })
    render(<StatusBar gameState={gameState} />)

    expect(screen.getByText('1 outbreak (8 = loss)')).toBeInTheDocument()
  })

  it('displays infection rate from infection rate array', () => {
    const gameState = createTestGameState({
      infectionRatePosition: 4,
      infectionRates: [2, 2, 2, 3, 3, 4, 4],
    })
    render(<StatusBar gameState={gameState} />)

    expect(screen.getByText('Infection Rate')).toBeInTheDocument()
    const infectionRateValue = document.querySelector('.StatusBar_infectionRateValue')
    expect(infectionRateValue).toHaveTextContent('3')
    expect(screen.getByText('cards per infection phase')).toBeInTheDocument()
  })

  it('displays cure indicators for all 4 diseases', () => {
    const gameState = createTestGameState()
    render(<StatusBar gameState={gameState} />)

    expect(screen.getByText('Cures')).toBeInTheDocument()
    expect(screen.getByText('blue')).toBeInTheDocument()
    expect(screen.getByText('yellow')).toBeInTheDocument()
    expect(screen.getByText('black')).toBeInTheDocument()
    expect(screen.getByText('red')).toBeInTheDocument()
  })

  it('displays uncured status with circle symbol', () => {
    const gameState = createTestGameState({
      cures: {
        [Disease.Blue]: CureStatus.Uncured,
        [Disease.Yellow]: CureStatus.Uncured,
        [Disease.Black]: CureStatus.Uncured,
        [Disease.Red]: CureStatus.Uncured,
      },
    })
    render(<StatusBar gameState={gameState} />)

    const blueIndicator = screen.getByTitle('blue: uncured')
    expect(blueIndicator).toBeInTheDocument()
    expect(blueIndicator).toHaveAttribute('data-status', 'uncured')
    expect(blueIndicator.textContent).toContain('○')
  })

  it('displays cured status with single checkmark', () => {
    const gameState = createTestGameState({
      cures: {
        [Disease.Blue]: CureStatus.Cured,
        [Disease.Yellow]: CureStatus.Uncured,
        [Disease.Black]: CureStatus.Uncured,
        [Disease.Red]: CureStatus.Uncured,
      },
    })
    render(<StatusBar gameState={gameState} />)

    const blueIndicator = screen.getByTitle('blue: cured')
    expect(blueIndicator).toHaveAttribute('data-status', 'cured')
    expect(blueIndicator.textContent).toContain('✓')
    expect(blueIndicator.textContent).not.toContain('✓✓')
  })

  it('displays eradicated status with double checkmark', () => {
    const gameState = createTestGameState({
      cures: {
        [Disease.Blue]: CureStatus.Eradicated,
        [Disease.Yellow]: CureStatus.Cured,
        [Disease.Black]: CureStatus.Uncured,
        [Disease.Red]: CureStatus.Uncured,
      },
    })
    render(<StatusBar gameState={gameState} />)

    const blueIndicator = screen.getByTitle('blue: eradicated')
    expect(blueIndicator).toHaveAttribute('data-status', 'eradicated')
    expect(blueIndicator.textContent).toContain('✓✓')
  })

  it('displays cube supply counters for all 4 diseases', () => {
    const gameState = createTestGameState({
      cubeSupply: {
        [Disease.Blue]: 18,
        [Disease.Yellow]: 12,
        [Disease.Black]: 6,
        [Disease.Red]: 24,
      },
    })
    render(<StatusBar gameState={gameState} />)

    expect(screen.getByText('Cube Supply')).toBeInTheDocument()
    expect(screen.getByText('18/24 blue')).toBeInTheDocument()
    expect(screen.getByText('12/24 yellow')).toBeInTheDocument()
    expect(screen.getByText('6/24 black')).toBeInTheDocument()
    expect(screen.getByText('24/24 red')).toBeInTheDocument()
  })

  it('handles edge case of 0 outbreaks', () => {
    const gameState = createTestGameState({ outbreakCount: 0 })
    render(<StatusBar gameState={gameState} />)

    expect(screen.getByText('0 outbreaks (8 = loss)')).toBeInTheDocument()
  })

  it('handles edge case of 8 outbreaks (loss condition)', () => {
    const gameState = createTestGameState({ outbreakCount: 8 })
    render(<StatusBar gameState={gameState} />)

    expect(screen.getByText('8 outbreaks (8 = loss)')).toBeInTheDocument()
  })

  it('displays all infection rates correctly', () => {
    const infectionRates = [2, 2, 2, 3, 3, 4, 4]

    infectionRates.forEach((rate, index) => {
      const gameState = createTestGameState({
        infectionRatePosition: index + 1,
        infectionRates,
      })
      const { unmount } = render(<StatusBar gameState={gameState} />)

      const infectionRateValue = document.querySelector('.StatusBar_infectionRateValue')
      expect(infectionRateValue).toHaveTextContent(rate.toString())
      unmount()
    })
  })

  it('handles depleted cube supply', () => {
    const gameState = createTestGameState({
      cubeSupply: {
        [Disease.Blue]: 0,
        [Disease.Yellow]: 0,
        [Disease.Black]: 0,
        [Disease.Red]: 0,
      },
    })
    render(<StatusBar gameState={gameState} />)

    expect(screen.getByText('0/24 blue')).toBeInTheDocument()
    expect(screen.getByText('0/24 yellow')).toBeInTheDocument()
    expect(screen.getByText('0/24 black')).toBeInTheDocument()
    expect(screen.getByText('0/24 red')).toBeInTheDocument()
  })
})
