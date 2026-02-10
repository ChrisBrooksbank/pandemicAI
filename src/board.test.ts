// Tests for board data and city connections
import { describe, it, expect } from "vitest";
import { CITIES, CITY_MAP, getCity, getCitiesByColor } from "./board";
import { Disease } from "./types";

describe("Board Data", () => {
  describe("CITIES", () => {
    it("should contain exactly 48 cities", () => {
      expect(CITIES).toHaveLength(48);
    });

    it("should have 12 cities per color", () => {
      const blueCities = CITIES.filter((city) => city.color === Disease.Blue);
      const yellowCities = CITIES.filter((city) => city.color === Disease.Yellow);
      const blackCities = CITIES.filter((city) => city.color === Disease.Black);
      const redCities = CITIES.filter((city) => city.color === Disease.Red);

      expect(blueCities).toHaveLength(12);
      expect(yellowCities).toHaveLength(12);
      expect(blackCities).toHaveLength(12);
      expect(redCities).toHaveLength(12);
    });

    it("should have all cities with unique names", () => {
      const names = CITIES.map((city) => city.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(48);
    });

    it("should have Atlanta as a blue city", () => {
      const atlanta = CITIES.find((city) => city.name === "Atlanta");
      expect(atlanta).toBeDefined();
      expect(atlanta?.color).toBe(Disease.Blue);
    });
  });

  describe("City Connections", () => {
    it("should have symmetric connections (if A connects to B, B connects to A)", () => {
      for (const city of CITIES) {
        for (const connectionName of city.connections) {
          const connectedCity = CITIES.find((c) => c.name === connectionName);
          expect(connectedCity).toBeDefined();
          expect(connectedCity?.connections).toContain(city.name);
        }
      }
    });

    it("should have Hong Kong with 6 connections (most connected)", () => {
      const hongKong = CITIES.find((city) => city.name === "Hong Kong");
      expect(hongKong?.connections).toHaveLength(6);
    });

    it("should have Istanbul with 6 connections (most connected)", () => {
      const istanbul = CITIES.find((city) => city.name === "Istanbul");
      expect(istanbul?.connections).toHaveLength(6);
    });

    it("should have Santiago with 1 connection (least connected)", () => {
      const santiago = CITIES.find((city) => city.name === "Santiago");
      expect(santiago?.connections).toHaveLength(1);
      expect(santiago?.connections).toContain("Lima");
    });

    it("should have Pacific connections (San Francisco-Tokyo)", () => {
      const sanFrancisco = CITIES.find((city) => city.name === "San Francisco");
      const tokyo = CITIES.find((city) => city.name === "Tokyo");

      expect(sanFrancisco?.connections).toContain("Tokyo");
      expect(tokyo?.connections).toContain("San Francisco");
    });

    it("should have Pacific connections (San Francisco-Manila)", () => {
      const sanFrancisco = CITIES.find((city) => city.name === "San Francisco");
      const manila = CITIES.find((city) => city.name === "Manila");

      expect(sanFrancisco?.connections).toContain("Manila");
      expect(manila?.connections).toContain("San Francisco");
    });

    it("should have Pacific connections (Los Angeles-Sydney)", () => {
      const losAngeles = CITIES.find((city) => city.name === "Los Angeles");
      const sydney = CITIES.find((city) => city.name === "Sydney");

      expect(losAngeles?.connections).toContain("Sydney");
      expect(sydney?.connections).toContain("Los Angeles");
    });

    it("should not have any city connecting to itself", () => {
      for (const city of CITIES) {
        expect(city.connections).not.toContain(city.name);
      }
    });

    it("should only have connections to valid city names", () => {
      const allCityNames = new Set(CITIES.map((city) => city.name));
      for (const city of CITIES) {
        for (const connection of city.connections) {
          expect(allCityNames.has(connection)).toBe(true);
        }
      }
    });
  });

  describe("CITY_MAP", () => {
    it("should contain all 48 cities", () => {
      expect(CITY_MAP.size).toBe(48);
    });

    it("should allow lookup by city name", () => {
      const atlanta = CITY_MAP.get("Atlanta");
      expect(atlanta).toBeDefined();
      expect(atlanta?.name).toBe("Atlanta");
      expect(atlanta?.color).toBe(Disease.Blue);
    });

    it("should return undefined for non-existent cities", () => {
      const fake = CITY_MAP.get("Atlantis");
      expect(fake).toBeUndefined();
    });
  });

  describe("getCity", () => {
    it("should return a city by name", () => {
      const atlanta = getCity("Atlanta");
      expect(atlanta).toBeDefined();
      expect(atlanta?.name).toBe("Atlanta");
    });

    it("should return undefined for non-existent city", () => {
      const fake = getCity("Atlantis");
      expect(fake).toBeUndefined();
    });
  });

  describe("getCitiesByColor", () => {
    it("should return all blue cities", () => {
      const blueCities = getCitiesByColor(Disease.Blue);
      expect(blueCities).toHaveLength(12);
      expect(blueCities.every((city) => city.color === Disease.Blue)).toBe(true);
    });

    it("should return all yellow cities", () => {
      const yellowCities = getCitiesByColor(Disease.Yellow);
      expect(yellowCities).toHaveLength(12);
      expect(yellowCities.every((city) => city.color === Disease.Yellow)).toBe(true);
    });

    it("should return all black cities", () => {
      const blackCities = getCitiesByColor(Disease.Black);
      expect(blackCities).toHaveLength(12);
      expect(blackCities.every((city) => city.color === Disease.Black)).toBe(true);
    });

    it("should return all red cities", () => {
      const redCities = getCitiesByColor(Disease.Red);
      expect(redCities).toHaveLength(12);
      expect(redCities.every((city) => city.color === Disease.Red)).toBe(true);
    });

    it("should include Atlanta in blue cities", () => {
      const blueCities = getCitiesByColor(Disease.Blue);
      expect(blueCities.some((city) => city.name === "Atlanta")).toBe(true);
    });
  });

  describe("Specific City Validations", () => {
    it("should have correct connections for Atlanta", () => {
      const atlanta = getCity("Atlanta");
      expect(atlanta?.connections).toEqual(
        expect.arrayContaining(["Chicago", "Miami", "Washington"]),
      );
      expect(atlanta?.connections).toHaveLength(3);
    });

    it("should have correct connections for Paris", () => {
      const paris = getCity("Paris");
      expect(paris?.connections).toEqual(
        expect.arrayContaining(["Algiers", "Essen", "London", "Madrid", "Milan"]),
      );
      expect(paris?.connections).toHaveLength(5);
    });

    it("should have correct color assignments", () => {
      expect(getCity("Atlanta")?.color).toBe(Disease.Blue);
      expect(getCity("Lima")?.color).toBe(Disease.Yellow);
      expect(getCity("Cairo")?.color).toBe(Disease.Black);
      expect(getCity("Tokyo")?.color).toBe(Disease.Red);
    });
  });
});
