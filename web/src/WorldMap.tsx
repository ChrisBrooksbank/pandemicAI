import { CITIES } from '@engine/board'
import type { Disease, GameState } from '@engine/types'
import './WorldMap.css'

interface WorldMapProps {
  className?: string
  gameState?: GameState
  /** Available actions from the game engine */
  availableActions?: string[]
  /** Currently selected action (for two-step flows) */
  selectedAction?: string | null
  /** Callback when a city is clicked */
  onCityClick?: (cityName: string) => void
}

/**
 * City position coordinates on the 1200x700 SVG canvas
 * Roughly based on equirectangular projection of real-world locations
 */
const CITY_POSITIONS: Record<string, { x: number; y: number }> = {
  // North America (left side)
  'San Francisco': { x: 140, y: 280 },
  'Los Angeles': { x: 150, y: 310 },
  'Chicago': { x: 260, y: 240 },
  'Atlanta': { x: 280, y: 310 },
  'Montreal': { x: 300, y: 210 },
  'Washington': { x: 310, y: 280 },
  'New York': { x: 330, y: 250 },
  'Mexico City': { x: 190, y: 370 },
  'Miami': { x: 280, y: 350 },

  // South America
  'Bogota': { x: 250, y: 430 },
  'Lima': { x: 230, y: 490 },
  'Santiago': { x: 240, y: 570 },
  'Buenos Aires': { x: 290, y: 570 },
  'Sao Paulo': { x: 330, y: 520 },

  // Europe
  'London': { x: 500, y: 200 },
  'Essen': { x: 530, y: 190 },
  'Paris': { x: 510, y: 230 },
  'Madrid': { x: 480, y: 270 },
  'Milan': { x: 540, y: 250 },
  'St. Petersburg': { x: 620, y: 150 },

  // Africa
  'Algiers': { x: 520, y: 310 },
  'Cairo': { x: 600, y: 320 },
  'Khartoum': { x: 620, y: 400 },
  'Lagos': { x: 510, y: 430 },
  'Kinshasa': { x: 560, y: 470 },
  'Johannesburg': { x: 590, y: 550 },

  // Middle East & Central Asia
  'Istanbul': { x: 610, y: 270 },
  'Moscow': { x: 660, y: 180 },
  'Tehran': { x: 700, y: 300 },
  'Baghdad': { x: 680, y: 320 },
  'Riyadh': { x: 660, y: 360 },
  'Karachi': { x: 750, y: 350 },

  // South Asia
  'Delhi': { x: 800, y: 340 },
  'Mumbai': { x: 780, y: 370 },
  'Chennai': { x: 810, y: 410 },
  'Kolkata': { x: 850, y: 380 },

  // Southeast Asia
  'Bangkok': { x: 890, y: 410 },
  'Ho Chi Minh City': { x: 920, y: 430 },
  'Jakarta': { x: 920, y: 470 },

  // East Asia
  'Beijing': { x: 960, y: 270 },
  'Seoul': { x: 1000, y: 280 },
  'Shanghai': { x: 990, y: 320 },
  'Hong Kong': { x: 950, y: 380 },
  'Taipei': { x: 990, y: 380 },

  // Japan & Oceania
  'Tokyo': { x: 1050, y: 300 },
  'Osaka': { x: 1040, y: 320 },
  'Manila': { x: 990, y: 420 },
  'Sydney': { x: 1080, y: 560 },
}

/**
 * Disease color to CSS color mapping
 */
const DISEASE_COLORS: Record<Disease, string> = {
  [0]: '#4A90E2', // Blue
  [1]: '#F5A623', // Yellow
  [2]: '#333333', // Black
  [3]: '#D0021B', // Red
}

/**
 * Role color to CSS color mapping
 */
const ROLE_COLORS: Record<string, string> = {
  'contingency_planner': '#00CED1', // Cyan
  'dispatcher': '#FF69B4', // Pink
  'medic': '#FF8C00', // Orange
  'operations_expert': '#90EE90', // Light Green
  'quarantine_specialist': '#228B22', // Dark Green
  'researcher': '#8B4513', // Brown
  'scientist': '#FFFFFF', // White
}

/**
 * Generate all unique city connections as line segments
 * Deduplicates bidirectional connections
 */
function generateConnections() {
  const seen = new Set<string>()
  const connections: Array<{ from: string; to: string; isPacific: boolean }> = []

  for (const city of CITIES) {
    for (const neighbor of city.connections) {
      // Create sorted key to deduplicate bidirectional connections
      const key = [city.name, neighbor].sort().join('|')
      if (!seen.has(key)) {
        seen.add(key)

        // Check if this is a Pacific crossing connection
        const isPacific =
          (city.name === 'San Francisco' && (neighbor === 'Tokyo' || neighbor === 'Manila')) ||
          (city.name === 'Los Angeles' && neighbor === 'Sydney') ||
          (city.name === 'Tokyo' && neighbor === 'San Francisco') ||
          (city.name === 'Manila' && neighbor === 'San Francisco') ||
          (city.name === 'Sydney' && neighbor === 'Los Angeles')

        connections.push({ from: city.name, to: neighbor, isPacific })
      }
    }
  }

  return connections
}

export function WorldMap({
  className,
  gameState,
  availableActions = [],
  selectedAction = null,
  onCityClick
}: WorldMapProps) {
  const connections = generateConnections()

  /**
   * Get cube counts for a city from game state
   */
  const getCubes = (cityName: string) => {
    if (!gameState) return { blue: 0, yellow: 0, black: 0, red: 0 }
    const cityState = gameState.board[cityName]
    if (!cityState) return { blue: 0, yellow: 0, black: 0, red: 0 }
    return {
      blue: cityState.blue,
      yellow: cityState.yellow,
      black: cityState.black,
      red: cityState.red,
    }
  }

  /**
   * Check if a city has a research station
   */
  const hasResearchStation = (cityName: string) => {
    if (!gameState) return false
    const cityState = gameState.board[cityName]
    return cityState?.hasResearchStation ?? false
  }

  /**
   * Get all players at a specific city
   */
  const getPlayersAtCity = (cityName: string) => {
    if (!gameState) return []
    return gameState.players
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => player.location === cityName)
  }

  /**
   * Get the set of cities that can be clicked for movement actions
   */
  const getClickableDestinations = (): Set<string> => {
    const destinations = new Set<string>()

    for (const action of availableActions) {
      // Movement actions: drive-ferry, direct-flight, charter-flight, shuttle-flight
      if (action.startsWith('drive-ferry:')) {
        const city = action.split(':')[1]
        if (city) destinations.add(city)
      } else if (action.startsWith('direct-flight:')) {
        const city = action.split(':')[1]
        if (city) destinations.add(city)
      } else if (action.startsWith('charter-flight:')) {
        const city = action.split(':')[1]
        if (city) destinations.add(city)
      } else if (action.startsWith('shuttle-flight:')) {
        const city = action.split(':')[1]
        if (city) destinations.add(city)
      }
      // Special role movements
      else if (action.startsWith('ops-expert-move:')) {
        const city = action.split(':')[1]
        if (city) destinations.add(city)
      }
      // Dispatcher can move other players
      else if (action.startsWith('dispatcher-move-other:')) {
        const parts = action.split(':')
        // Format: dispatcher-move-other:playerIndex:moveType:destination[:cardSource]
        if (parts.length >= 4) {
          const destination = parts[3]
          if (destination) destinations.add(destination)
        }
      }
    }

    return destinations
  }

  /**
   * Find the action to perform when a city is clicked
   */
  const getActionForCity = (cityName: string): string | null => {
    // If a specific action type is selected (e.g., "direct-flight"), find that action
    if (selectedAction) {
      const action = availableActions.find(
        (a) => a.startsWith(`${selectedAction}:${cityName}`)
      )
      if (action) return action
    }

    // Otherwise, find any movement action to this city (prioritize drive-ferry)
    const driveAction = availableActions.find((a) => a === `drive-ferry:${cityName}`)
    if (driveAction) return driveAction

    const shuttleAction = availableActions.find((a) => a === `shuttle-flight:${cityName}`)
    if (shuttleAction) return shuttleAction

    const directAction = availableActions.find((a) => a === `direct-flight:${cityName}`)
    if (directAction) return directAction

    const charterAction = availableActions.find((a) => a === `charter-flight:${cityName}`)
    if (charterAction) return charterAction

    const opsExpertAction = availableActions.find((a) => a.startsWith(`ops-expert-move:${cityName}:`))
    if (opsExpertAction) return opsExpertAction

    return null
  }

  /**
   * Check if a city is the current player's location
   */
  const isCurrentPlayerLocation = (cityName: string): boolean => {
    if (!gameState) return false
    const currentPlayer = gameState.players[gameState.currentPlayerIndex]
    return currentPlayer?.location === cityName
  }

  const clickableDestinations = getClickableDestinations()

  /**
   * Handle city click
   */
  const handleCityClick = (cityName: string) => {
    if (!onCityClick) return

    const action = getActionForCity(cityName)
    if (action) {
      onCityClick(cityName)
    }
  }

  return (
    <svg
      className={`WorldMap ${className || ''}`}
      viewBox="0 0 1200 700"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="1200" height="700" fill="#0a1929" />

      {/* Connection lines */}
      <g className="WorldMap_connections">
        {connections.map(({ from, to, isPacific }) => {
          const fromPos = CITY_POSITIONS[from]
          const toPos = CITY_POSITIONS[to]

          if (!fromPos || !toPos) {
            console.warn(`Missing position for connection: ${from} -> ${to}`)
            return null
          }

          // For Pacific connections, draw dashed lines to the edges
          if (isPacific) {
            // Determine which direction the connection goes
            const isWestToEast = fromPos.x < toPos.x

            if (isWestToEast) {
              // Draw from western city to left edge, then from right edge to eastern city
              return (
                <g key={`${from}-${to}`}>
                  <line
                    x1={fromPos.x}
                    y1={fromPos.y}
                    x2={0}
                    y2={fromPos.y}
                    stroke="#555"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.6"
                  />
                  <line
                    x1={1200}
                    y1={toPos.y}
                    x2={toPos.x}
                    y2={toPos.y}
                    stroke="#555"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.6"
                  />
                </g>
              )
            } else {
              // Draw from eastern city to right edge, then from left edge to western city
              return (
                <g key={`${from}-${to}`}>
                  <line
                    x1={fromPos.x}
                    y1={fromPos.y}
                    x2={1200}
                    y2={fromPos.y}
                    stroke="#555"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.6"
                  />
                  <line
                    x1={0}
                    y1={toPos.y}
                    x2={toPos.x}
                    y2={toPos.y}
                    stroke="#555"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.6"
                  />
                </g>
              )
            }
          }

          // Normal connection line
          return (
            <line
              key={`${from}-${to}`}
              x1={fromPos.x}
              y1={fromPos.y}
              x2={toPos.x}
              y2={toPos.y}
              stroke="#555"
              strokeWidth="2"
              opacity="0.6"
            />
          )
        })}
      </g>

      {/* Cities */}
      <g className="WorldMap_cities">
        {CITIES.map((city) => {
          const pos = CITY_POSITIONS[city.name]

          if (!pos) {
            console.warn(`Missing position for city: ${city.name}`)
            return null
          }

          const color = DISEASE_COLORS[city.color]
          const cubes = getCubes(city.name)
          const hasStation = hasResearchStation(city.name)
          const playersHere = getPlayersAtCity(city.name)
          const isClickable = clickableDestinations.has(city.name)
          const isCurrentLocation = isCurrentPlayerLocation(city.name)

          return (
            <g
              key={city.name}
              className={`WorldMap_city ${isClickable ? 'WorldMap_city--clickable' : ''} ${isCurrentLocation ? 'WorldMap_city--current' : ''}`}
              onClick={() => isClickable && handleCityClick(city.name)}
              style={{ cursor: isClickable ? 'pointer' : 'default' }}
            >
              {/* Current player location glow */}
              {isCurrentLocation && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="14"
                  fill="none"
                  stroke="#FFD700"
                  strokeWidth="2"
                  opacity="0.6"
                  className="WorldMap_currentGlow"
                />
              )}

              {/* Clickable destination highlight */}
              {isClickable && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="12"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2"
                  opacity="0.8"
                  className="WorldMap_clickableHighlight"
                />
              )}

              {/* City circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="8"
                fill={color}
                stroke="#fff"
                strokeWidth="2"
              />

              {/* City name label */}
              <text
                x={pos.x}
                y={pos.y - 12}
                textAnchor="middle"
                className="WorldMap_cityLabel"
                fill="#fff"
                fontSize="11"
                fontFamily="sans-serif"
              >
                {city.name}
              </text>

              {/* Disease cubes (small squares positioned near the city) */}
              {(['blue', 'yellow', 'black', 'red'] as const).map((diseaseKey, colorIndex) => {
                const cubeCount = cubes[diseaseKey]
                const diseaseColor = colorIndex as Disease

                if (cubeCount === 0) return null

                // Position cubes in a grid to the right of the city
                const cubesArray = Array.from({ length: Math.min(cubeCount, 3) })
                return cubesArray.map((_, cubeIndex) => {
                  // Arrange cubes in a small grid: offset by color type and cube count
                  const offsetX = 12 + colorIndex * 6
                  const offsetY = -8 + cubeIndex * 6

                  return (
                    <rect
                      key={`${diseaseKey}-${cubeIndex}`}
                      x={pos.x + offsetX}
                      y={pos.y + offsetY}
                      width="5"
                      height="5"
                      fill={DISEASE_COLORS[diseaseColor]}
                      stroke="#000"
                      strokeWidth="0.5"
                    />
                  )
                })
              })}

              {/* Research station (white cross icon) */}
              {hasStation && (
                <g>
                  {/* Cross made of two rectangles */}
                  <rect
                    x={pos.x - 1.5}
                    y={pos.y + 10}
                    width="3"
                    height="8"
                    fill="#fff"
                    stroke="#000"
                    strokeWidth="0.5"
                  />
                  <rect
                    x={pos.x - 4}
                    y={pos.y + 12.5}
                    width="8"
                    height="3"
                    fill="#fff"
                    stroke="#000"
                    strokeWidth="0.5"
                  />
                </g>
              )}

              {/* Player pawns (role-colored circles with offset) */}
              {playersHere.map(({ player, index }, localIndex) => {
                // Offset pawns horizontally when multiple players are co-located
                const pawnOffsetX = localIndex * 10 - (playersHere.length - 1) * 5
                const pawnOffsetY = 20

                return (
                  <circle
                    key={index}
                    cx={pos.x + pawnOffsetX}
                    cy={pos.y + pawnOffsetY}
                    r="5"
                    fill={ROLE_COLORS[player.role]}
                    stroke="#000"
                    strokeWidth="1"
                  />
                )
              })}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
