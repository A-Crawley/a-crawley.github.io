import { serializeState } from "./save.ts";
import { createGameState } from "./state.ts";
import { clearSave, CORRUPT_SAVE_KEY, loadGame, SAVE_KEY, saveGame } from "./storage.ts";
import type { StorageLike } from "./storage.ts";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

/** Storage that refuses everything, like a browser with storage blocked or full. */
const blocked: StorageLike = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked or full");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

describe("loadGame", () => {
  it("reports no save on a first visit", () => {
    expect(loadGame(memoryStorage())).toEqual({ status: "none" });
  });

  it("loads a saved game", () => {
    const state = createGameState(42);
    state.food = 77;
    const storage = memoryStorage({ [SAVE_KEY]: serializeState(state) });
    expect(loadGame(storage)).toEqual({ status: "loaded", state });
  });

  it("reports a corrupt save and keeps a copy of it", () => {
    const storage = memoryStorage({ [SAVE_KEY]: '{"version":1,"stage":"nope"}' });
    const result = loadGame(storage);
    expect(result.status).toBe("corrupt");
    expect(storage.data.get(CORRUPT_SAVE_KEY)).toBe('{"version":1,"stage":"nope"}');
  });

  it("reports a save that is not even JSON as corrupt", () => {
    expect(loadGame(memoryStorage({ [SAVE_KEY]: "garbage" })).status).toBe("corrupt");
  });

  it("still reports corrupt if the backup cannot be written", () => {
    const storage: StorageLike = {
      getItem: () => "garbage",
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => undefined,
    };
    expect(loadGame(storage).status).toBe("corrupt");
  });

  it("reports unavailable when storage is blocked or missing", () => {
    expect(loadGame(blocked)).toEqual({ status: "unavailable" });
    expect(loadGame(null)).toEqual({ status: "unavailable" });
  });
});

describe("saveGame", () => {
  it("writes the game so loadGame can read it back", () => {
    const storage = memoryStorage();
    const state = createGameState(99);
    state.owned.forager = 12;
    expect(saveGame(state, storage)).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state });
  });

  it("reports failure instead of throwing when storage is blocked or full", () => {
    expect(saveGame(createGameState(1), blocked)).toBe(false);
    expect(saveGame(createGameState(1), null)).toBe(false);
  });
});

describe("clearSave", () => {
  it("removes the saved game", () => {
    const storage = memoryStorage();
    saveGame(createGameState(1), storage);
    expect(clearSave(storage)).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "none" });
  });

  it("keeps the backup of a corrupt save", () => {
    const storage = memoryStorage({ [SAVE_KEY]: "garbage" });
    loadGame(storage);
    clearSave(storage);
    expect(storage.data.get(CORRUPT_SAVE_KEY)).toBe("garbage");
  });

  it("reports failure instead of throwing when storage is blocked", () => {
    expect(clearSave(blocked)).toBe(false);
    expect(clearSave(null)).toBe(false);
  });
});

describe("the default storage", () => {
  it("is used when none is given, and survives a throwing localStorage", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError");
      },
    });
    try {
      expect(loadGame()).toEqual({ status: "unavailable" });
      expect(saveGame(createGameState(1))).toBe(false);
      expect(clearSave()).toBe(false);
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
    }
  });
});
