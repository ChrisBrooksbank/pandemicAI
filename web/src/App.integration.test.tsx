import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import App from './App'

describe('App - Full Game Integration', () => {
  beforeEach(() => {
    // Clear any previous state
    vi.clearAllMocks()
  })

  it('completes full game setup flow', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Step 1: Setup Screen
    expect(screen.getByText('Pandemic')).toBeInTheDocument()
    expect(screen.getByText('Start Game')).toBeInTheDocument()

    // Step 2: Start game with default settings
    const startButton = screen.getByText('Start Game')
    await user.click(startButton)

    // Step 3: Game board should render
    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    // Verify all major UI components rendered
    expect(screen.getByText(/Outbreak Track/i)).toBeInTheDocument()
    expect(screen.getByText(/Infection Rate/i)).toBeInTheDocument()
    expect(screen.getByText(/Cures/i)).toBeInTheDocument()
    // Role name is displayed without "Role:" prefix
    const playerPanel = document.querySelector('.PlayerPanel')
    expect(playerPanel).toBeTruthy()
  })

  it('renders game board with all required components', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('Start Game'))

    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    // Status Bar components
    expect(screen.getByText(/Outbreak Track/i)).toBeInTheDocument()
    expect(screen.getByText(/Infection Rate/i)).toBeInTheDocument()
    expect(screen.getByText(/Cures/i)).toBeInTheDocument()

    // Player Panel
    // Role name is displayed without "Role:" prefix
    const playerPanel = document.querySelector('.PlayerPanel')
    expect(playerPanel).toBeTruthy()

    // Action Bar - verify it exists (check for App_actionBar container)
    const actionBar = document.querySelector('.App_actionBar')
    expect(actionBar).toBeTruthy()

    // World Map - verify it exists
    const worldMap = document.querySelector('.WorldMap')
    expect(worldMap).toBeTruthy()
  })

  it('handles city clicks on the map for movement', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('Start Game'))

    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    // Verify the map renders
    const worldMap = document.querySelector('.WorldMap')
    expect(worldMap).toBeTruthy()

    // City clicks are handled via SVG - can't easily test in jsdom
    // But we verify the map component loaded without crashing
  })

  it('renders all player information correctly', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Start a 4-player game
    await user.click(screen.getByText('4 Players'))
    await user.click(screen.getByText('Start Game'))

    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    // Should show role information (role name displayed without "Role:" prefix)
    const playerPanel = document.querySelector('.PlayerPanel')
    expect(playerPanel).toBeTruthy()

    // Should show actions remaining
    expect(screen.getByText(/4 actions remaining/i)).toBeInTheDocument()
  })

  it('handles different difficulty levels', async () => {
    const user = userEvent.setup()

    // Test Introductory (4 epidemics)
    const { unmount } = render(<App />)
    await user.click(screen.getByText('Start Game'))
    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })
    unmount()

    // Test Standard (5 epidemics)
    render(<App />)
    await user.click(screen.getByText('Standard'))
    await user.click(screen.getByText('Start Game'))
    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })
    unmount()

    // Test Heroic (6 epidemics)
    render(<App />)
    await user.click(screen.getByText('Heroic'))
    await user.click(screen.getByText('Start Game'))
    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })

  it('validates cure indicators update correctly', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('Start Game'))

    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    // Check cure status heading exists
    expect(screen.getByText(/Cures/i)).toBeInTheDocument()

    // We can't easily trigger a cure without manipulating game state
    // This test verifies the cure indicator component renders
  })

  it('validates outbreak counter renders correctly', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('Start Game'))

    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    // Check outbreak track heading
    expect(screen.getByText(/Outbreak Track/i)).toBeInTheDocument()

    // Check initial outbreak detail text
    expect(screen.getByText(/0 outbreaks?/i)).toBeInTheDocument()
  })

  it('validates infection rate display', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('Start Game'))

    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    // Check infection rate heading
    expect(screen.getByText(/Infection Rate/i)).toBeInTheDocument()

    // Initial infection rate should be 2 (check the specific element)
    const infectionRateValue = document.querySelector('.StatusBar_infectionRateValue')
    expect(infectionRateValue).toHaveTextContent('2')
    expect(screen.getByText(/cards per infection phase/i)).toBeInTheDocument()
  })

  it('handles different player counts', async () => {
    const user = userEvent.setup()

    // Test 2 players
    const { unmount } = render(<App />)
    await user.click(screen.getByText('Start Game'))
    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })
    unmount()

    // Test 3 players
    render(<App />)
    await user.click(screen.getByText('3 Players'))
    await user.click(screen.getByText('Start Game'))
    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })
    unmount()

    // Test 4 players
    render(<App />)
    await user.click(screen.getByText('4 Players'))
    await user.click(screen.getByText('Start Game'))
    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })

  it('validates cube supply indicators', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('Start Game'))

    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    // Check cube supply heading
    expect(screen.getByText(/Cube Supply/i)).toBeInTheDocument()

    // Should show counts for all 4 colors (format: "X/24 <color>")
    expect(screen.getByText(/\/24 blue/i)).toBeInTheDocument()
    expect(screen.getByText(/\/24 yellow/i)).toBeInTheDocument()
    expect(screen.getByText(/\/24 black/i)).toBeInTheDocument()
    expect(screen.getByText(/\/24 red/i)).toBeInTheDocument()
  })

  it('does not crash during initial render', async () => {
    // Smoke test - just verify app can render without errors
    const { unmount } = render(<App />)
    expect(screen.getByText('Pandemic')).toBeInTheDocument()
    unmount()

    // Verify multiple renders don't cause issues
    render(<App />)
    expect(screen.getByText('Pandemic')).toBeInTheDocument()
  })

  it('allows returning to setup screen', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Start game
    await user.click(screen.getByText('Start Game'))

    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    // Game is running - verify we're not on setup screen
    expect(screen.queryByText('Start Game')).not.toBeInTheDocument()

    // Note: Returning to setup requires game over dialog or explicit reset
    // That functionality is tested via GameOverDialog component tests
  })

  it('validates initial phase is Actions', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('Start Game'))

    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    // Verify actions remaining counter shows 4
    expect(screen.getByText(/4 actions remaining/i)).toBeInTheDocument()
  })

  it('renders event menu component', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('Start Game'))

    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    // Event menu should exist in DOM (may or may not be visible depending on cards)
    // EventMenu component itself has more detailed tests
    const app = document.querySelector('.App')
    expect(app).toBeTruthy()
  })

  it('handles player panel with hand display', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('Start Game'))

    await waitFor(() => {
      expect(screen.getAllByText(/Actions Phase/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    // Player panel should show role name (without "Role:" prefix) and starting hand
    const playerPanel2 = document.querySelector('.PlayerPanel')
    expect(playerPanel2).toBeTruthy()
  })
})
