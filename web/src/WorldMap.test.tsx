import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorldMap } from './WorldMap'
import { OrchestratedGame } from '@engine/orchestrator'

describe('WorldMap', () => {
  it('renders SVG with correct viewBox', () => {
    const { container } = render(<WorldMap />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 1200 700')
  })

  it('renders all 48 cities', () => {
    const { container } = render(<WorldMap />)
    const cityGroups = container.querySelectorAll('.WorldMap_city')
    expect(cityGroups.length).toBe(48)
  })

  it('renders city labels', () => {
    render(<WorldMap />)
    // Check for a few key cities
    expect(screen.getByText('Atlanta')).toBeTruthy()
    expect(screen.getByText('Tokyo')).toBeTruthy()
    expect(screen.getByText('Paris')).toBeTruthy()
    expect(screen.getByText('Sydney')).toBeTruthy()
  })

  it('renders connection lines', () => {
    const { container } = render(<WorldMap />)
    const lines = container.querySelectorAll('line')
    // Should have approximately 96 connection lines (48 cities with avg ~2 connections each, deduplicated)
    // Exact count depends on the connection graph structure
    expect(lines.length).toBeGreaterThan(80)
  })

  it('renders city circles with disease colors', () => {
    const { container } = render(<WorldMap />)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(48)

    // Check that all circles have valid attributes
    circles.forEach((circle) => {
      expect(circle.getAttribute('cx')).not.toBeNull()
      expect(circle.getAttribute('cy')).not.toBeNull()
      expect(circle.getAttribute('r')).toBe('8')
    })
  })

  it('renders Pacific crossing connections as dashed lines', () => {
    const { container } = render(<WorldMap />)
    const dashedLines = container.querySelectorAll('line[stroke-dasharray]')
    // Should have Pacific connections (SF-Tokyo, SF-Manila, LA-Sydney = 6 line segments)
    expect(dashedLines.length).toBeGreaterThan(0)
  })

  it('applies custom className when provided', () => {
    const { container } = render(<WorldMap className="custom-class" />)
    const svg = container.querySelector('svg')
    expect(svg?.classList.contains('custom-class')).toBe(true)
  })

  it('renders disease cubes when gameState is provided', () => {
    const game = OrchestratedGame.create({ playerCount: 2, difficulty: 4 })
    const gameState = game.getGameState()

    const { container } = render(<WorldMap gameState={gameState} />)

    // After initial infection, there should be disease cubes
    const cubeRects = container.querySelectorAll('rect[width="5"][height="5"]')
    expect(cubeRects.length).toBeGreaterThan(0)
  })

  it('renders research stations when gameState is provided', () => {
    const game = OrchestratedGame.create({ playerCount: 2, difficulty: 4 })
    const gameState = game.getGameState()

    const { container } = render(<WorldMap gameState={gameState} />)

    // Atlanta should have a research station (initial setup)
    // Research stations are rendered as white rectangles (cross)
    const stationRects = container.querySelectorAll('rect[fill="#fff"]')
    expect(stationRects.length).toBeGreaterThan(0)
  })

  it('renders player pawns when gameState is provided', () => {
    const game = OrchestratedGame.create({ playerCount: 2, difficulty: 4 })
    const gameState = game.getGameState()

    const { container } = render(<WorldMap gameState={gameState} />)

    // Should render circles for:
    // - 48 city markers
    // - 2 player pawns
    // - 1 current location glow
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(48 + 2 + 1) // 48 cities + 2 players + 1 glow
  })

  it('offsets co-located player pawns horizontally', () => {
    const game = OrchestratedGame.create({ playerCount: 4, difficulty: 4 })
    const gameState = game.getGameState()

    const { container } = render(<WorldMap gameState={gameState} />)

    // All players start in Atlanta, so should have 4 pawns at different positions
    // Should render circles for:
    // - 48 city markers
    // - 4 player pawns
    // - 1 current location glow
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(48 + 4 + 1) // 48 cities + 4 players + 1 glow

    // Player pawns are rendered last and have r="5", while city circles have r="8"
    const pawnCircles = Array.from(circles).filter((c) => c.getAttribute('r') === '5')
    expect(pawnCircles.length).toBe(4)

    // Player pawns should have different cx values (offset)
    const cxValues = pawnCircles.map((c) => c.getAttribute('cx'))
    const uniqueCxValues = new Set(cxValues)
    expect(uniqueCxValues.size).toBe(4) // All 4 pawns should have different x positions
  })

  it('renders without gameState (no cubes, stations, or pawns)', () => {
    const { container } = render(<WorldMap />)

    // Should only have city circles (48 total)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(48)

    // Should not have disease cubes or research stations
    const cubeRects = container.querySelectorAll('rect[width="5"][height="5"]')
    expect(cubeRects.length).toBe(0)
  })

  describe('City click handlers', () => {
    it('highlights clickable destination cities', () => {
      const game = OrchestratedGame.create({ playerCount: 2, difficulty: 4 })
      const gameState = game.getGameState()
      const availableActions = game.getAvailableActions()

      const { container } = render(
        <WorldMap
          gameState={gameState}
          availableActions={availableActions}
        />
      )

      // Should have highlight circles for clickable cities
      const highlights = container.querySelectorAll('.WorldMap_clickableHighlight')
      expect(highlights.length).toBeGreaterThan(0)
    })

    it('shows current player location with glow effect', () => {
      const game = OrchestratedGame.create({ playerCount: 2, difficulty: 4 })
      const gameState = game.getGameState()

      const { container } = render(<WorldMap gameState={gameState} />)

      // Should have a glow circle for current player location (Atlanta)
      const glows = container.querySelectorAll('.WorldMap_currentGlow')
      expect(glows.length).toBe(1)
    })

    it('calls onCityClick when clicking a valid destination', () => {
      const game = OrchestratedGame.create({ playerCount: 2, difficulty: 4 })
      const gameState = game.getGameState()
      const availableActions = game.getAvailableActions()
      const onCityClick = vi.fn()

      render(
        <WorldMap
          gameState={gameState}
          availableActions={availableActions}
          onCityClick={onCityClick}
        />
      )

      // Find a clickable city (one with drive-ferry action)
      const driveAction = availableActions.find((a) => a.startsWith('drive-ferry:'))
      expect(driveAction).toBeTruthy()

      if (driveAction) {
        const cityName = driveAction.split(':')[1]
        expect(cityName).toBeTruthy()

        if (cityName) {
          // Find the specific city by its text label
          const cityLabel = screen.getByText(cityName)
          expect(cityLabel).toBeTruthy()

          // Click the parent group element
          const cityGroup = cityLabel.closest('.WorldMap_city')
          expect(cityGroup).toBeTruthy()

          if (cityGroup) {
            fireEvent.click(cityGroup)
            expect(onCityClick).toHaveBeenCalledWith(cityName)
          }
        }
      }
    })

    it('does not call onCityClick when clicking non-clickable city', () => {
      const game = OrchestratedGame.create({ playerCount: 2, difficulty: 4 })
      const gameState = game.getGameState()
      const availableActions = game.getAvailableActions()
      const onCityClick = vi.fn()

      const { container } = render(
        <WorldMap
          gameState={gameState}
          availableActions={availableActions}
          onCityClick={onCityClick}
        />
      )

      // Find a non-clickable city (one not in availableActions)
      const clickableDestinations = new Set<string>()
      availableActions.forEach((action) => {
        const parts = action.split(':')
        if (parts.length >= 2) {
          const city = parts[1]
          if (city) clickableDestinations.add(city)
        }
      })

      const cityGroups = container.querySelectorAll('.WorldMap_city')
      const nonClickableCity = Array.from(cityGroups).find(
        (g) => !g.classList.contains('WorldMap_city--clickable')
      )

      if (nonClickableCity) {
        fireEvent.click(nonClickableCity)
        expect(onCityClick).not.toHaveBeenCalled()
      }
    })

    it('sets pointer cursor on clickable cities', () => {
      const game = OrchestratedGame.create({ playerCount: 2, difficulty: 4 })
      const gameState = game.getGameState()
      const availableActions = game.getAvailableActions()

      const { container } = render(
        <WorldMap
          gameState={gameState}
          availableActions={availableActions}
        />
      )

      const clickableCities = container.querySelectorAll('.WorldMap_city--clickable')
      expect(clickableCities.length).toBeGreaterThan(0)

      clickableCities.forEach((city) => {
        const element = city as HTMLElement
        expect(element.style.cursor).toBe('pointer')
      })
    })

    it('handles multiple movement types to same destination', () => {
      const game = OrchestratedGame.create({ playerCount: 2, difficulty: 4 })
      const onCityClick = vi.fn()

      // Move away from Atlanta first
      const moveAction = game.getAvailableActions().find((a) => a.startsWith('drive-ferry:'))
      if (moveAction) {
        game.performAction(moveAction)

        // Build a research station in current city to enable shuttle flight
        const buildAction = game.getAvailableActions().find((a) => a.startsWith('build-research-station'))
        if (buildAction) {
          game.performAction(buildAction)

          const gameState = game.getGameState()
          const availableActions = game.getAvailableActions()

          render(
            <WorldMap
              gameState={gameState}
              availableActions={availableActions}
              onCityClick={onCityClick}
            />
          )

          // Atlanta should be clickable (has research station, can shuttle back)
          // The component should pick the best action (prioritize drive-ferry if available)
          const atlantaActions = availableActions.filter((a) => a.includes('Atlanta'))
          expect(atlantaActions.length).toBeGreaterThan(0)
        }
      }
    })
  })
})
