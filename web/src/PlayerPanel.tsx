import * as React from 'react'
import type { GameState, PlayerCard, Role, TurnPhase } from '@engine/types'
import './PlayerPanel.css'

interface PlayerPanelProps {
  gameState: GameState
  currentPlayerIndex: number
  phase: TurnPhase
  actionsRemaining: number
}

/**
 * PlayerPanel displays:
 * - Current player's role and location
 * - Phase indicator (Actions/Draw/Infect) with actions remaining counter
 * - Player's hand of cards
 * - Tabs to view other players' hands
 */
export function PlayerPanel({
  gameState,
  currentPlayerIndex,
  phase,
  actionsRemaining,
}: PlayerPanelProps) {
  // Local state for selected player tab (defaults to current player)
  const [selectedPlayerIndex, setSelectedPlayerIndex] = React.useState(currentPlayerIndex)

  // Update selected player when current player changes (auto-follow)
  React.useEffect(() => {
    setSelectedPlayerIndex(currentPlayerIndex)
  }, [currentPlayerIndex])

  const selectedPlayer = gameState.players[selectedPlayerIndex]
  const isCurrentPlayer = selectedPlayerIndex === currentPlayerIndex

  if (!selectedPlayer) {
    return <div className="PlayerPanel">No player data</div>
  }

  return (
    <div className="PlayerPanel">
      {/* Player Tabs */}
      <div className="PlayerPanel_tabs">
        {gameState.players.map((player, index) => (
          <button
            key={index}
            className={`PlayerPanel_tab ${
              index === selectedPlayerIndex ? 'PlayerPanel_tab--active' : ''
            } ${index === currentPlayerIndex ? 'PlayerPanel_tab--current' : ''}`}
            onClick={() => setSelectedPlayerIndex(index)}
            data-role={player.role}
          >
            <span className="PlayerPanel_tabRole">{formatRole(player.role)}</span>
            {index === currentPlayerIndex && (
              <span className="PlayerPanel_tabCurrentIndicator">★</span>
            )}
          </button>
        ))}
      </div>

      {/* Player Info */}
      <div className="PlayerPanel_info">
        <div className="PlayerPanel_roleHeader">
          <h2 className="PlayerPanel_roleName" data-role={selectedPlayer.role}>
            {formatRole(selectedPlayer.role)}
          </h2>
          {isCurrentPlayer && (
            <div className="PlayerPanel_phaseIndicator" data-phase={phase}>
              {formatPhase(phase)}
              {phase === 'actions' && (
                <span className="PlayerPanel_actionsRemaining">
                  {' '}
                  ({actionsRemaining} action{actionsRemaining !== 1 ? 's' : ''} left)
                </span>
              )}
            </div>
          )}
        </div>
        <p className="PlayerPanel_location">
          Location: <strong>{selectedPlayer.location}</strong>
        </p>
      </div>

      {/* Player Hand */}
      <div className="PlayerPanel_hand">
        <h3 className="PlayerPanel_handHeading">
          Hand ({selectedPlayer.hand.length}/7)
        </h3>
        <div className="PlayerPanel_cards">
          {selectedPlayer.hand.length === 0 && (
            <p className="PlayerPanel_emptyHand">No cards</p>
          )}
          {selectedPlayer.hand.map((card, index) => (
            <PlayerCardDisplay key={index} card={card} />
          ))}
        </div>
      </div>

      {/* Stored Event Card (Contingency Planner only) */}
      {selectedPlayer.storedEventCard && (
        <div className="PlayerPanel_storedEvent">
          <h3 className="PlayerPanel_handHeading">Stored Event</h3>
          <div className="PlayerPanel_cards">
            <PlayerCardDisplay card={selectedPlayer.storedEventCard} />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Displays a single player card (city card, event card, or epidemic card)
 */
function PlayerCardDisplay({ card }: { card: PlayerCard }) {
  if (card.type === 'city') {
    return (
      <div className="PlayerCard PlayerCard--city" data-color={card.color}>
        <div className="PlayerCard_header">{card.city}</div>
        <div className="PlayerCard_footer">{card.color}</div>
      </div>
    )
  }

  if (card.type === 'event') {
    return (
      <div className="PlayerCard PlayerCard--event">
        <div className="PlayerCard_header">EVENT</div>
        <div className="PlayerCard_eventName">{formatEventName(card.event)}</div>
      </div>
    )
  }

  // Epidemic card (should rarely appear in hand, but include for completeness)
  return (
    <div className="PlayerCard PlayerCard--epidemic">
      <div className="PlayerCard_header">EPIDEMIC</div>
    </div>
  )
}

/**
 * Format role enum to display text
 */
function formatRole(role: Role): string {
  switch (role) {
    case 'contingency_planner':
      return 'Contingency Planner'
    case 'dispatcher':
      return 'Dispatcher'
    case 'medic':
      return 'Medic'
    case 'operations_expert':
      return 'Operations Expert'
    case 'quarantine_specialist':
      return 'Quarantine Specialist'
    case 'researcher':
      return 'Researcher'
    case 'scientist':
      return 'Scientist'
    default:
      return role
  }
}

/**
 * Format phase enum to display text
 */
function formatPhase(phase: TurnPhase): string {
  switch (phase) {
    case 'actions':
      return 'Actions Phase'
    case 'draw':
      return 'Draw Phase'
    case 'infect':
      return 'Infect Phase'
    default:
      return phase
  }
}

/**
 * Format event name for display
 */
function formatEventName(event: string): string {
  return event
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
