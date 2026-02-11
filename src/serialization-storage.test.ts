// Tests for StorageBackend interface and implementations
import { describe, expect, it } from "vitest";
import type { StorageBackend } from "./serialization";

describe("StorageBackend interface", () => {
  it("should be implementable by a mock storage backend", async () => {
    // Create a simple in-memory implementation to verify the interface
    const mockBackend: StorageBackend = {
      async save(key: string, data: string): Promise<void> {
        // Mock implementation
        expect(key).toBeDefined();
        expect(data).toBeDefined();
      },
      async load(key: string): Promise<string | null> {
        // Mock implementation
        expect(key).toBeDefined();
        return null;
      },
      async list(): Promise<string[]> {
        // Mock implementation
        return [];
      },
      async delete(key: string): Promise<void> {
        // Mock implementation
        expect(key).toBeDefined();
      },
    };

    // Verify all methods are callable
    await mockBackend.save("test-key", "test-data");
    const result = await mockBackend.load("test-key");
    expect(result).toBeNull();
    const keys = await mockBackend.list();
    expect(keys).toEqual([]);
    await mockBackend.delete("test-key");
  });

  it("should support a functional in-memory implementation", async () => {
    // Create a working in-memory implementation
    const storage = new Map<string, string>();

    const backend: StorageBackend = {
      async save(key: string, data: string): Promise<void> {
        storage.set(key, data);
      },
      async load(key: string): Promise<string | null> {
        return storage.get(key) ?? null;
      },
      async list(): Promise<string[]> {
        return Array.from(storage.keys());
      },
      async delete(key: string): Promise<void> {
        storage.delete(key);
      },
    };

    // Test the implementation
    await backend.save("game1", "data1");
    await backend.save("game2", "data2");

    expect(await backend.load("game1")).toBe("data1");
    expect(await backend.load("game2")).toBe("data2");
    expect(await backend.load("game3")).toBeNull();

    const keys = await backend.list();
    expect(keys).toHaveLength(2);
    expect(keys).toContain("game1");
    expect(keys).toContain("game2");

    await backend.delete("game1");
    expect(await backend.load("game1")).toBeNull();
    expect(await backend.list()).toEqual(["game2"]);
  });
});
