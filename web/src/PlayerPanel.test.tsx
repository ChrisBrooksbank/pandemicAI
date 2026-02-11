import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { PlayerPanel } from './PlayerPanel'
import type { GameState, Player, PlayerCard } from '@engine/types'
import { Disease, Role, TurnPhase, CureStatus } from '@engine/types'

/**
 * Helper to create a minimal test GameState
 */
function createTestGameState(players: Player[]): GameState {
  return {
    board: {},
    players,
    playerDeck: [],
    playerDiscard: [],
    infectionDeck: [],
    infectionDiscard: [],
    currentPlayerIndex: 0,
    turnPhase: TurnPhase.Actions,
    actionsRemaining: 4,
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
    researchStations: ['Atlanta'],
    skipNextInfectionPhase: false,
  }
}

describe('PlayerPanel', () => {
  it('renders the current player role and location', () => {
    const players: Player[] = [
      {
        role: Role.Medic,
        location: 'Atlanta',
        hand: [],
      },
    ]
    const gameState = createTestGameState(players)

    render(
      <PlayerPanel
        gameState={gameState}
        currentPlayerIndex={0}
        phase={TurnPhase.Actions}
        actionsRemaining={4}
      />
    )

    expect(screen.getByRole('heading', { name: 'Medic' })).toBeInTheDocument()
    expect(screen.getByText(/Atlanta/)).toBeInTheDocument()
  })

  it('displays phase indicator for current player', () => {
    const players: Player[] = [
      {
        role: Role.Scientist,
        location: 'Atlanta',
        hand: [],
      },
    ]
    const gameState = createTestGameState(players)

    render(
      <PlayerPanel
        gameState={gameState}
        currentPlayerIndex={0}
        phase={TurnPhase.Actions}
        actionsRemaining={3}
      />
    )

    expect(screen.getByText(/Actions Phase/)).toBeInTheDocument()
    expect(screen.getByText(/3 actions left/)).toBeInTheDocument()
  })

  it('displays player hand with city cards', () => {
    const hand: PlayerCard[] = [
      { type: 'city', city: 'Paris', color: Disease.Blue },
      { type: 'city', city: 'Tokyo', color: Disease.Red },
    ]
    const players: Player[] = [
      {
        role: Role.Researcher,
        location: 'Atlanta',
        hand,
      },
    ]
    const gameState = createTestGameState(players)

    render(
      <PlayerPanel
        gameState={gameState}
        currentPlayerIndex={0}
        phase={TurnPhase.Actions}
        actionsRemaining={4}
      />
    )

    expect(screen.getByText('Paris')).toBeInTheDocument()
    expect(screen.getByText('Tokyo')).toBeInTheDocument()
    expect(screen.getByText(/Hand \(2\/7\)/)).toBeInTheDocument()
  })

  it('displays event cards in hand', () => {
    const hand: PlayerCard[] = [
      { type: 'event', event: 'airlift' },
      { type: 'event', event: 'government_grant' },
    ]
    const players: Player[] = [
      {
        role: Role.Dispatcher,
        location: 'Atlanta',
        hand,
      },
    ]
    const gameState = createTestGameState(players)

    render(
      <PlayerPanel
        gameState={gameState}
        currentPlayerIndex={0}
        phase={TurnPhase.Actions}
        actionsRemaining={4}
      />
    )

    expect(screen.getByText('Airlift')).toBeInTheDocument()
    expect(screen.getByText('Government Grant')).toBeInTheDocument()
  })

  it('displays empty hand message when no cards', () => {
    const players: Player[] = [
      {
        role: Role.OperationsExpert,
        location: 'Atlanta',
        hand: [],
      },
    ]
    const gameState = createTestGameState(players)

    render(
      <PlayerPanel
        gameState={gameState}
        currentPlayerIndex={0}
        phase={TurnPhase.Actions}
        actionsRemaining={4}
      />
    )

    expect(screen.getByText('No cards')).toBeInTheDocument()
    expect(screen.getByText(/Hand \(0\/7\)/)).toBeInTheDocument()
  })

  it('renders tabs for all players', () => {
    const players: Player[] = [
      { role: Role.Medic, location: 'Atlanta', hand: [] },
      { role: Role.Scientist, location: 'Paris', hand: [] },
      { role: Role.Researcher, location: 'Tokyo', hand: [] },
    ]
    const gameState = createTestGameState(players)

    render(
      <PlayerPanel
        gameState={gameState}
        currentPlayerIndex={0}
        phase={TurnPhase.Actions}
        actionsRemaining={4}
      />
    )

    // Check that all player role tabs are present
    const tabs = screen.getAllByRole('button')
    expect(tabs).toHaveLength(3)
    expect(tabs[0]).toHaveTextContent('Medic')
    expect(tabs[1]).toHaveTextContent('Scientist')
    expect(tabs[2]).toHaveTextContent('Researcher')
  })

  it('allows switching between player tabs', async () => {
    const user = userEvent.setup()
    const players: Player[] = [
      {
        role: Role.Medic,
        location: 'Atlanta',
        hand: [{ type: 'city', city: 'Paris', color: Disease.Blue }],
      },
      {
        role: Role.Scientist,
        location: 'Tokyo',
        hand: [{ type: 'city', city: 'London', color: Disease.Blue }],
      },
    ]
    const gameState = createTestGameState(players)

    render(
      <PlayerPanel
        gameState={gameState}
        currentPlayerIndex={0}
        phase={TurnPhase.Actions}
        actionsRemaining={4}
      />
    )

    // Initially shows Medic's hand
    expect(screen.getByText('Paris')).toBeInTheDocument()
    expect(screen.queryByText('London')).not.toBeInTheDocument()

    // Click Scientist tab
    const tabs = screen.getAllByRole('button')
    await user.click(tabs[1]!)

    // Now shows Scientist's hand
    expect(screen.queryByText('Paris')).not.toBeInTheDocument()
    expect(screen.getByText('London')).toBeInTheDocument()
    expect(screen.getByText(/Tokyo/)).toBeInTheDocument()
  })

  it('displays stored event card for Contingency Planner', () => {
    const players: Player[] = [
      {
        role: Role.ContingencyPlanner,
        location: 'Atlanta',
        hand: [],
        storedEventCard: { type: 'event', event: 'forecast' },
      },
    ]
    const gameState = createTestGameState(players)

    render(
      <PlayerPanel
        gameState={gameState}
        currentPlayerIndex={0}
        phase={TurnPhase.Actions}
        actionsRemaining={4}
      />
    )

    expect(screen.getByText('Stored Event')).toBeInTheDocument()
    expect(screen.getByText('Forecast')).toBeInTheDocument()
  })

  it('does not show phase indicator for non-current players', async () => {
    const user = userEvent.setup()
    const players: Player[] = [
      { role: Role.Medic, location: 'Atlanta', hand: [] },
      { role: Role.Scientist, location: 'Paris', hand: [] },
    ]
    const gameState = createTestGameState(players)

    render(
      <PlayerPanel
        gameState={gameState}
        currentPlayerIndex={0}
        phase={TurnPhase.Actions}
        actionsRemaining={4}
      />
    )

    // Current player shows phase
    expect(screen.getByText(/Actions Phase/)).toBeInTheDocument()

    // Switch to non-current player
    const tabs = screen.getAllByRole('button')
    await user.click(tabs[1]!)

    // Phase indicator should not be shown
    expect(screen.queryByText(/Actions Phase/)).not.toBeInTheDocument()
  })

  it('displays current player indicator (star) on tab', () => {
    const players: Player[] = [
      { role: Role.Medic, location: 'Atlanta', hand: [] },
      { role: Role.Scientist, location: 'Paris', hand: [] },
    ]
    const gameState = createTestGameState(players)

    render(
      <PlayerPanel
        gameState={gameState}
        currentPlayerIndex={0}
        phase={TurnPhase.Actions}
        actionsRemaining={4}
      />
    )

    const tabs = screen.getAllByRole('button')
    expect(tabs[0]).toHaveTextContent('★')
    expect(tabs[1]).not.toHaveTextContent('★')
  })

  it('formats different phases correctly', () => {
    const players: Player[] = [
      { role: Role.Medic, location: 'Atlanta', hand: [] },
    ]
    const gameState = createTestGameState(players)

    const { rerender } = render(
      <PlayerPanel
        gameState={gameState}
        currentPlayerIndex={0}
        phase={TurnPhase.Draw}
        actionsRemaining={0}
      />
    )

    expect(screen.getByText(/Draw Phase/)).toBeInTheDocument()

    rerender(
      <PlayerPanel
        gameState={gameState}
        currentPlayerIndex={0}
        phase={TurnPhase.Infect}
        actionsRemaining={0}
      />
    )

    expect(screen.getByText(/Infect Phase/)).toBeInTheDocument()
  })
})
