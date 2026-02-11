// Tests for StorageBackend interface and implementations
import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorageBackend, type StorageBackend } from "./serialization";

// Mock localStorage for Node.js environment
class MockStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

// Set up global window and localStorage mock
const mockLocalStorage = new MockStorage();

// Define both window and localStorage globally for the tests
(global as typeof globalThis & { window: Window; localStorage: Storage }).window = {
  localStorage: mockLocalStorage,
} as Window;
(global as typeof globalThis & { localStorage: Storage }).localStorage = mockLocalStorage;

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

describe("LocalStorageBackend", () => {
  let backend: LocalStorageBackend;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    backend = new LocalStorageBackend("test-");
  });

  it("should save and load data", async () => {
    await backend.save("game1", "test-data-1");
    const loaded = await backend.load("game1");
    expect(loaded).toBe("test-data-1");
  });

  it("should return null for non-existent keys", async () => {
    const loaded = await backend.load("non-existent");
    expect(loaded).toBeNull();
  });

  it("should list all saved games with the correct prefix", async () => {
    await backend.save("game1", "data1");
    await backend.save("game2", "data2");
    await backend.save("game3", "data3");

    const keys = await backend.list();
    expect(keys).toHaveLength(3);
    expect(keys).toContain("game1");
    expect(keys).toContain("game2");
    expect(keys).toContain("game3");
  });

  it("should not list keys with different prefixes", async () => {
    await backend.save("game1", "data1");
    localStorage.setItem("other-key", "other-data");

    const keys = await backend.list();
    expect(keys).toHaveLength(1);
    expect(keys).toEqual(["game1"]);
  });

  it("should delete saved games", async () => {
    await backend.save("game1", "data1");
    await backend.save("game2", "data2");

    await backend.delete("game1");

    expect(await backend.load("game1")).toBeNull();
    expect(await backend.load("game2")).toBe("data2");
    expect(await backend.list()).toEqual(["game2"]);
  });

  it("should overwrite existing data on save", async () => {
    await backend.save("game1", "original-data");
    await backend.save("game1", "updated-data");

    const loaded = await backend.load("game1");
    expect(loaded).toBe("updated-data");
  });

  it("should use custom prefix", async () => {
    const customBackend = new LocalStorageBackend("custom-prefix-");
    await customBackend.save("game1", "data1");

    // Verify the key is stored with the custom prefix
    expect(localStorage.getItem("custom-prefix-game1")).toBe("data1");

    // Verify the default prefix backend doesn't see it
    const defaultKeys = await backend.list();
    expect(defaultKeys).not.toContain("game1");
  });

  it("should handle empty list when no games are saved", async () => {
    const keys = await backend.list();
    expect(keys).toEqual([]);
  });

  it("should handle deleting non-existent keys gracefully", async () => {
    // Should not throw
    await expect(backend.delete("non-existent")).resolves.toBeUndefined();
  });
});
