import * as React from 'react'
import type { GameState, EventType } from '@engine/types'
import type { GameAction } from './state'
import './EventMenu.css'

interface EventMenuProps {
  gameState: GameState
  dispatch: React.Dispatch<GameAction>
}

/**
 * EventMenu displays a floating button and menu for playing event cards.
 * Event cards can be played at any time during any phase without consuming an action.
 */
export function EventMenu({ gameState, dispatch }: EventMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Find all event cards across all players
  const eventCards: Array<{
    playerIndex: number
    cardIndex: number
    event: EventType
  }> = []

  gameState.players.forEach((player, playerIndex) => {
    player.hand.forEach((card, cardIndex) => {
      if (card.type === 'event') {
        eventCards.push({ playerIndex, cardIndex, event: card.event })
      }
    })
  })

  // Also check Contingency Planner's stored event card
  gameState.players.forEach((player, playerIndex) => {
    if (player.storedEventCard && player.storedEventCard.type === 'event') {
      eventCards.push({
        playerIndex,
        cardIndex: -1, // Special index for stored event
        event: player.storedEventCard.event,
      })
    }
  })

  // If no event cards available, don't render anything
  if (eventCards.length === 0) {
    return null
  }

  const handleEventClick = (
    playerIndex: number,
    cardIndex: number,
    event: EventType
  ) => {
    setIsOpen(false)

    // Store the player index in the dialog so we know who is playing the event
    // Note: The dialogs themselves will need to be updated to use this playerIndex
    // For now, we'll pass it through the existing mechanisms

    // Different events require different dialogs
    switch (event) {
      case 'airlift':
        dispatch({ type: 'SET_DIALOG', dialog: { type: 'airlift' } })
        break

      case 'government_grant':
        dispatch({ type: 'SET_DIALOG', dialog: { type: 'governmentGrant' } })
        break

      case 'one_quiet_night':
        // One Quiet Night has no parameters, can be played immediately
        dispatch({
          type: 'PLAY_EVENT',
          playerIndex,
          params: { event: 'one_quiet_night' },
        })
        break

      case 'resilient_population':
        dispatch({
          type: 'SET_DIALOG',
          dialog: {
            type: 'resilientPopulation',
            discardPile: gameState.infectionDiscardPile,
          },
        })
        break

      case 'forecast':
        // Get top 6 cards from infection deck
        const topCards = gameState.infectionDeck.slice(0, 6).map((card) => ({
          city: card.city,
          color: card.color,
        }))
        dispatch({
          type: 'SET_DIALOG',
          dialog: { type: 'forecast', cards: topCards },
        })
        break
    }
  }

  return (
    <div className="EventMenu">
      <button
        className="EventMenu_button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Event cards menu"
      >
        Events ({eventCards.length})
      </button>

      {isOpen && (
        <div className="EventMenu_dropdown">
          <div className="EventMenu_header">Available Event Cards</div>
          <div className="EventMenu_items">
            {eventCards.map((item, index) => {
              const player = gameState.players[item.playerIndex]
              const isStoredEvent = item.cardIndex === -1

              return (
                <button
                  key={index}
                  className="EventMenu_item"
                  onClick={() =>
                    handleEventClick(item.playerIndex, item.cardIndex, item.event)
                  }
                >
                  <div className="EventMenu_eventName">
                    {formatEventName(item.event)}
                  </div>
                  <div className="EventMenu_owner">
                    {player ? formatRole(player.role) : `Player ${item.playerIndex + 1}`}
                    {isStoredEvent && ' (Stored)'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Format event name for display
 */
function formatEventName(event: EventType): string {
  switch (event) {
    case 'airlift':
      return 'Airlift'
    case 'forecast':
      return 'Forecast'
    case 'government_grant':
      return 'Government Grant'
    case 'one_quiet_night':
      return 'One Quiet Night'
    case 'resilient_population':
      return 'Resilient Population'
  }
}

/**
 * Format role for display
 */
function formatRole(role: string): string {
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
