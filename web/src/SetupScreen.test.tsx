import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SetupScreen } from './SetupScreen'

describe('SetupScreen', () => {
  it('renders with default selections (2 players, 4 epidemics)', () => {
    render(<SetupScreen onStartGame={vi.fn()} />)

    expect(screen.getByText('Pandemic')).toBeInTheDocument()

    // Get the button that contains "2 Players" text
    const twoPlayersButton = screen.getByText('2 Players').closest('button')
    expect(twoPlayersButton).toHaveClass('SetupScreen_option--selected')

    // Get the button that contains "Introductory" text
    const introButton = screen.getByText('Introductory').closest('button')
    expect(introButton).toHaveClass('SetupScreen_option--selected')

    expect(screen.getByText('Start Game')).toBeInTheDocument()
  })

  it('allows selecting player count', () => {
    render(<SetupScreen onStartGame={vi.fn()} />)

    const threePlayersButton = screen.getByText('3 Players')
    fireEvent.click(threePlayersButton)

    expect(threePlayersButton).toHaveClass('SetupScreen_option--selected')
    expect(screen.getByText('2 Players')).not.toHaveClass('SetupScreen_option--selected')
  })

  it('allows selecting difficulty', () => {
    render(<SetupScreen onStartGame={vi.fn()} />)

    const standardButton = screen.getByText('Standard').closest('button')
    fireEvent.click(standardButton!)

    expect(standardButton).toHaveClass('SetupScreen_option--selected')

    const introButton = screen.getByText('Introductory').closest('button')
    expect(introButton).not.toHaveClass('SetupScreen_option--selected')
  })

  it('calls onStartGame with selected config when Start Game is clicked', () => {
    const onStartGame = vi.fn()
    render(<SetupScreen onStartGame={onStartGame} />)

    // Select 4 players
    fireEvent.click(screen.getByText('4 Players'))

    // Select Heroic difficulty
    fireEvent.click(screen.getByText('Heroic'))

    // Click Start Game
    fireEvent.click(screen.getByText('Start Game'))

    expect(onStartGame).toHaveBeenCalledWith({
      playerCount: 4,
      difficulty: 6,
    })
  })

  it('calls onStartGame with default config', () => {
    const onStartGame = vi.fn()
    render(<SetupScreen onStartGame={onStartGame} />)

    fireEvent.click(screen.getByText('Start Game'))

    expect(onStartGame).toHaveBeenCalledWith({
      playerCount: 2,
      difficulty: 4,
    })
  })

  it('allows changing selections multiple times', () => {
    const onStartGame = vi.fn()
    render(<SetupScreen onStartGame={onStartGame} />)

    // Change player count multiple times
    fireEvent.click(screen.getByText('3 Players'))
    fireEvent.click(screen.getByText('4 Players'))
    fireEvent.click(screen.getByText('2 Players'))

    // Change difficulty multiple times
    fireEvent.click(screen.getByText('Standard'))
    fireEvent.click(screen.getByText('Heroic'))
    fireEvent.click(screen.getByText('Introductory'))

    fireEvent.click(screen.getByText('Start Game'))

    expect(onStartGame).toHaveBeenCalledWith({
      playerCount: 2,
      difficulty: 4,
    })
  })

  it('displays all difficulty levels with correct epidemic counts', () => {
    render(<SetupScreen onStartGame={vi.fn()} />)

    expect(screen.getByText('4 Epidemic Cards')).toBeInTheDocument()
    expect(screen.getByText('5 Epidemic Cards')).toBeInTheDocument()
    expect(screen.getByText('6 Epidemic Cards')).toBeInTheDocument()
  })
})
