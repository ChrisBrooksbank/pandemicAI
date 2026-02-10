// City connections and board data for Pandemic
import { Disease, type City } from "./types";

/**
 * All 48 cities on the Pandemic board with their connections
 * Data sourced from pandemic-board.md
 */
export const CITIES: ReadonlyArray<City> = [
  // Blue Cities (North America & Europe)
  {
    name: "Atlanta",
    color: Disease.Blue,
    connections: ["Chicago", "Miami", "Washington"],
  },
  {
    name: "Chicago",
    color: Disease.Blue,
    connections: ["Atlanta", "Los Angeles", "Mexico City", "Montreal", "San Francisco"],
  },
  {
    name: "Essen",
    color: Disease.Blue,
    connections: ["London", "Milan", "Paris", "St. Petersburg"],
  },
  {
    name: "London",
    color: Disease.Blue,
    connections: ["Essen", "Madrid", "New York", "Paris"],
  },
  {
    name: "Madrid",
    color: Disease.Blue,
    connections: ["Algiers", "London", "New York", "Paris", "Sao Paulo"],
  },
  {
    name: "Milan",
    color: Disease.Blue,
    connections: ["Essen", "Istanbul", "Paris"],
  },
  {
    name: "Montreal",
    color: Disease.Blue,
    connections: ["Chicago", "New York", "Washington"],
  },
  {
    name: "New York",
    color: Disease.Blue,
    connections: ["London", "Madrid", "Montreal", "Washington"],
  },
  {
    name: "Paris",
    color: Disease.Blue,
    connections: ["Algiers", "Essen", "London", "Madrid", "Milan"],
  },
  {
    name: "San Francisco",
    color: Disease.Blue,
    connections: ["Chicago", "Los Angeles", "Manila", "Tokyo"],
  },
  {
    name: "St. Petersburg",
    color: Disease.Blue,
    connections: ["Essen", "Istanbul", "Moscow"],
  },
  {
    name: "Washington",
    color: Disease.Blue,
    connections: ["Atlanta", "Miami", "Montreal", "New York"],
  },

  // Yellow Cities (Central/South America & Africa)
  {
    name: "Bogota",
    color: Disease.Yellow,
    connections: ["Buenos Aires", "Lima", "Mexico City", "Miami", "Sao Paulo"],
  },
  {
    name: "Buenos Aires",
    color: Disease.Yellow,
    connections: ["Bogota", "Sao Paulo"],
  },
  {
    name: "Johannesburg",
    color: Disease.Yellow,
    connections: ["Khartoum", "Kinshasa"],
  },
  {
    name: "Khartoum",
    color: Disease.Yellow,
    connections: ["Cairo", "Johannesburg", "Kinshasa", "Lagos"],
  },
  {
    name: "Kinshasa",
    color: Disease.Yellow,
    connections: ["Johannesburg", "Khartoum", "Lagos"],
  },
  {
    name: "Lagos",
    color: Disease.Yellow,
    connections: ["Khartoum", "Kinshasa", "Sao Paulo"],
  },
  {
    name: "Lima",
    color: Disease.Yellow,
    connections: ["Bogota", "Mexico City", "Santiago"],
  },
  {
    name: "Los Angeles",
    color: Disease.Yellow,
    connections: ["Chicago", "Mexico City", "San Francisco", "Sydney"],
  },
  {
    name: "Mexico City",
    color: Disease.Yellow,
    connections: ["Bogota", "Chicago", "Lima", "Los Angeles", "Miami"],
  },
  {
    name: "Miami",
    color: Disease.Yellow,
    connections: ["Atlanta", "Bogota", "Mexico City", "Washington"],
  },
  {
    name: "Santiago",
    color: Disease.Yellow,
    connections: ["Lima"],
  },
  {
    name: "Sao Paulo",
    color: Disease.Yellow,
    connections: ["Bogota", "Buenos Aires", "Lagos", "Madrid"],
  },

  // Black Cities (Middle East, Central & South Asia)
  {
    name: "Algiers",
    color: Disease.Black,
    connections: ["Cairo", "Istanbul", "Madrid", "Paris"],
  },
  {
    name: "Baghdad",
    color: Disease.Black,
    connections: ["Cairo", "Istanbul", "Karachi", "Riyadh", "Tehran"],
  },
  {
    name: "Cairo",
    color: Disease.Black,
    connections: ["Algiers", "Baghdad", "Istanbul", "Khartoum", "Riyadh"],
  },
  {
    name: "Chennai",
    color: Disease.Black,
    connections: ["Bangkok", "Delhi", "Jakarta", "Kolkata", "Mumbai"],
  },
  {
    name: "Delhi",
    color: Disease.Black,
    connections: ["Chennai", "Karachi", "Kolkata", "Mumbai", "Tehran"],
  },
  {
    name: "Istanbul",
    color: Disease.Black,
    connections: ["Algiers", "Baghdad", "Cairo", "Milan", "Moscow", "St. Petersburg"],
  },
  {
    name: "Karachi",
    color: Disease.Black,
    connections: ["Baghdad", "Delhi", "Mumbai", "Riyadh", "Tehran"],
  },
  {
    name: "Kolkata",
    color: Disease.Black,
    connections: ["Bangkok", "Chennai", "Delhi", "Hong Kong"],
  },
  {
    name: "Moscow",
    color: Disease.Black,
    connections: ["Istanbul", "St. Petersburg", "Tehran"],
  },
  {
    name: "Mumbai",
    color: Disease.Black,
    connections: ["Chennai", "Delhi", "Karachi"],
  },
  {
    name: "Riyadh",
    color: Disease.Black,
    connections: ["Baghdad", "Cairo", "Karachi"],
  },
  {
    name: "Tehran",
    color: Disease.Black,
    connections: ["Baghdad", "Delhi", "Karachi", "Moscow"],
  },

  // Red Cities (East Asia, Southeast Asia & Oceania)
  {
    name: "Bangkok",
    color: Disease.Red,
    connections: ["Chennai", "Ho Chi Minh City", "Hong Kong", "Jakarta", "Kolkata"],
  },
  {
    name: "Beijing",
    color: Disease.Red,
    connections: ["Seoul", "Shanghai"],
  },
  {
    name: "Ho Chi Minh City",
    color: Disease.Red,
    connections: ["Bangkok", "Hong Kong", "Jakarta", "Manila"],
  },
  {
    name: "Hong Kong",
    color: Disease.Red,
    connections: ["Bangkok", "Ho Chi Minh City", "Kolkata", "Manila", "Shanghai", "Taipei"],
  },
  {
    name: "Jakarta",
    color: Disease.Red,
    connections: ["Bangkok", "Chennai", "Ho Chi Minh City", "Sydney"],
  },
  {
    name: "Manila",
    color: Disease.Red,
    connections: ["Ho Chi Minh City", "Hong Kong", "San Francisco", "Sydney", "Taipei"],
  },
  {
    name: "Osaka",
    color: Disease.Red,
    connections: ["Taipei", "Tokyo"],
  },
  {
    name: "Seoul",
    color: Disease.Red,
    connections: ["Beijing", "Shanghai", "Tokyo"],
  },
  {
    name: "Shanghai",
    color: Disease.Red,
    connections: ["Beijing", "Hong Kong", "Seoul", "Taipei", "Tokyo"],
  },
  {
    name: "Sydney",
    color: Disease.Red,
    connections: ["Jakarta", "Los Angeles", "Manila"],
  },
  {
    name: "Taipei",
    color: Disease.Red,
    connections: ["Hong Kong", "Manila", "Osaka", "Shanghai"],
  },
  {
    name: "Tokyo",
    color: Disease.Red,
    connections: ["Osaka", "San Francisco", "Seoul", "Shanghai"],
  },
];

/**
 * Map of city names to City objects for quick lookup
 */
export const CITY_MAP: ReadonlyMap<string, City> = new Map(CITIES.map((city) => [city.name, city]));

/**
 * Get a city by name
 * @param name - The name of the city
 * @returns The city object, or undefined if not found
 */
export function getCity(name: string): City | undefined {
  return CITY_MAP.get(name);
}

/**
 * Get all cities of a specific color
 * @param color - The disease color
 * @returns Array of cities with that color
 */
export function getCitiesByColor(color: Disease): ReadonlyArray<City> {
  return CITIES.filter((city) => city.color === color);
}
