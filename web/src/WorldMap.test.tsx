import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
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

    // Should render circles for city markers (48) + player pawns (2)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(48 + 2) // 48 cities + 2 players
  })

  it('offsets co-located player pawns horizontally', () => {
    const game = OrchestratedGame.create({ playerCount: 4, difficulty: 4 })
    const gameState = game.getGameState()

    const { container } = render(<WorldMap gameState={gameState} />)

    // All players start in Atlanta, so should have 4 pawns at different positions
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(48 + 4) // 48 cities + 4 players

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
})
