import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { WorldMap } from './WorldMap'

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
})
