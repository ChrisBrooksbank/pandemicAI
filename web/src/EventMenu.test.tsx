import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EventMenu } from './EventMenu'
import type { GameState, Player, EventType } from '@engine/types'

// Helper to create a minimal game state for testing
function createTestGameState(
  players: Partial<Player>[] = []
): GameState {
  const defaultPlayer: Player = {
    role: 'medic',
    location: 'Atlanta',
    hand: [],
  }

  return {
    players: players.map((p) => ({ ...defaultPlayer, ...p })),
    cities: {},
    cures: { blue: 'uncured', yellow: 'uncured', black: 'uncured', red: 'uncured' },
    cubeSupply: { blue: 24, yellow: 24, black: 24, red: 24 },
    outbreakCount: 0,
    infectionRateIndex: 0,
    infectionDeck: [],
    infectionDiscardPile: [],
    playerDeck: [],
    playerDiscardPile: [],
    researchStations: new Set(['Atlanta']),
    currentPlayerIndex: 0,
    turnPhase: 'actions',
    actionsRemaining: 4,
    skipNextInfectionPhase: false,
  }
}

describe('EventMenu', () => {
  it('does not render when no event cards are available', () => {
    const gameState = createTestGameState([
      { hand: [{ type: 'city', city: 'Atlanta', color: 'blue' }] },
    ])
    const dispatch = vi.fn()

    const { container } = render(<EventMenu gameState={gameState} dispatch={dispatch} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders button when event cards are available', () => {
    const gameState = createTestGameState([
      { hand: [{ type: 'event', event: 'airlift' as EventType }] },
    ])
    const dispatch = vi.fn()

    render(<EventMenu gameState={gameState} dispatch={dispatch} />)
    expect(screen.getByLabelText('Event cards menu')).toBeInTheDocument()
    expect(screen.getByText('Events (1)')).toBeInTheDocument()
  })

  it('shows multiple event cards from different players', () => {
    const gameState = createTestGameState([
      {
        role: 'medic',
        hand: [{ type: 'event', event: 'airlift' as EventType }],
      },
      {
        role: 'scientist',
        hand: [{ type: 'event', event: 'forecast' as EventType }],
      },
    ])
    const dispatch = vi.fn()

    render(<EventMenu gameState={gameState} dispatch={dispatch} />)
    expect(screen.getByText('Events (2)')).toBeInTheDocument()
  })

  it('opens dropdown menu when button is clicked', () => {
    const gameState = createTestGameState([
      { hand: [{ type: 'event', event: 'airlift' as EventType }] },
    ])
    const dispatch = vi.fn()

    render(<EventMenu gameState={gameState} dispatch={dispatch} />)

    const button = screen.getByLabelText('Event cards menu')
    fireEvent.click(button)

    expect(screen.getByText('Available Event Cards')).toBeInTheDocument()
    expect(screen.getByText('Airlift')).toBeInTheDocument()
  })

  it('includes Contingency Planner stored event card', () => {
    const gameState = createTestGameState([
      {
        role: 'contingency_planner',
        storedEventCard: { type: 'event', event: 'government_grant' as EventType },
      },
    ])
    const dispatch = vi.fn()

    render(<EventMenu gameState={gameState} dispatch={dispatch} />)
    expect(screen.getByText('Events (1)')).toBeInTheDocument()

    const button = screen.getByLabelText('Event cards menu')
    fireEvent.click(button)

    expect(screen.getByText('Government Grant')).toBeInTheDocument()
    expect(screen.getByText(/Contingency Planner.*Stored/i)).toBeInTheDocument()
  })

  it('opens Airlift dialog when Airlift event is clicked', () => {
    const gameState = createTestGameState([
      { hand: [{ type: 'event', event: 'airlift' as EventType }] },
    ])
    const dispatch = vi.fn()

    render(<EventMenu gameState={gameState} dispatch={dispatch} />)

    const button = screen.getByLabelText('Event cards menu')
    fireEvent.click(button)

    const airliftButton = screen.getByText('Airlift')
    fireEvent.click(airliftButton)

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_DIALOG',
      dialog: { type: 'airlift' },
    })
  })

  it('opens Government Grant dialog when Government Grant event is clicked', () => {
    const gameState = createTestGameState([
      { hand: [{ type: 'event', event: 'government_grant' as EventType }] },
    ])
    const dispatch = vi.fn()

    render(<EventMenu gameState={gameState} dispatch={dispatch} />)

    const button = screen.getByLabelText('Event cards menu')
    fireEvent.click(button)

    const grantButton = screen.getByText('Government Grant')
    fireEvent.click(grantButton)

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_DIALOG',
      dialog: { type: 'governmentGrant' },
    })
  })

  it('plays One Quiet Night immediately without dialog', () => {
    const gameState = createTestGameState([
      { hand: [{ type: 'event', event: 'one_quiet_night' as EventType }] },
    ])
    const dispatch = vi.fn()

    render(<EventMenu gameState={gameState} dispatch={dispatch} />)

    const button = screen.getByLabelText('Event cards menu')
    fireEvent.click(button)

    const oqnButton = screen.getByText('One Quiet Night')
    fireEvent.click(oqnButton)

    expect(dispatch).toHaveBeenCalledWith({
      type: 'PLAY_EVENT',
      playerIndex: 0,
      params: { event: 'one_quiet_night' },
    })
  })

  it('opens Resilient Population dialog with discard pile', () => {
    const gameState = createTestGameState([
      { hand: [{ type: 'event', event: 'resilient_population' as EventType }] },
    ])
    gameState.infectionDiscardPile = ['Atlanta', 'Chicago', 'Montreal']
    const dispatch = vi.fn()

    render(<EventMenu gameState={gameState} dispatch={dispatch} />)

    const button = screen.getByLabelText('Event cards menu')
    fireEvent.click(button)

    const rpButton = screen.getByText('Resilient Population')
    fireEvent.click(rpButton)

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_DIALOG',
      dialog: {
        type: 'resilientPopulation',
        discardPile: ['Atlanta', 'Chicago', 'Montreal'],
      },
    })
  })

  it('opens Forecast dialog with top 6 infection cards', () => {
    const gameState = createTestGameState([
      { hand: [{ type: 'event', event: 'forecast' as EventType }] },
    ])
    gameState.infectionDeck = [
      { city: 'Atlanta', color: 'blue' },
      { city: 'Chicago', color: 'blue' },
      { city: 'Montreal', color: 'blue' },
      { city: 'New York', color: 'blue' },
      { city: 'Washington', color: 'blue' },
      { city: 'San Francisco', color: 'blue' },
      { city: 'Los Angeles', color: 'yellow' },
    ]
    const dispatch = vi.fn()

    render(<EventMenu gameState={gameState} dispatch={dispatch} />)

    const button = screen.getByLabelText('Event cards menu')
    fireEvent.click(button)

    const forecastButton = screen.getByText('Forecast')
    fireEvent.click(forecastButton)

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_DIALOG',
      dialog: {
        type: 'forecast',
        cards: [
          { city: 'Atlanta', color: 'blue' },
          { city: 'Chicago', color: 'blue' },
          { city: 'Montreal', color: 'blue' },
          { city: 'New York', color: 'blue' },
          { city: 'Washington', color: 'blue' },
          { city: 'San Francisco', color: 'blue' },
        ],
      },
    })
  })

  it('closes dropdown after selecting an event', () => {
    const gameState = createTestGameState([
      { hand: [{ type: 'event', event: 'one_quiet_night' as EventType }] },
    ])
    const dispatch = vi.fn()

    render(<EventMenu gameState={gameState} dispatch={dispatch} />)

    const button = screen.getByLabelText('Event cards menu')
    fireEvent.click(button)

    expect(screen.getByText('Available Event Cards')).toBeInTheDocument()

    const oqnButton = screen.getByText('One Quiet Night')
    fireEvent.click(oqnButton)

    // Dropdown should be closed
    expect(screen.queryByText('Available Event Cards')).not.toBeInTheDocument()
  })

  it('displays player role for event card owner', () => {
    const gameState = createTestGameState([
      {
        role: 'operations_expert',
        hand: [{ type: 'event', event: 'airlift' as EventType }],
      },
    ])
    const dispatch = vi.fn()

    render(<EventMenu gameState={gameState} dispatch={dispatch} />)

    const button = screen.getByLabelText('Event cards menu')
    fireEvent.click(button)

    expect(screen.getByText('Operations Expert')).toBeInTheDocument()
  })
})
