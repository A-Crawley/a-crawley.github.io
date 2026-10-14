import {
  DEFAULT_SETTINGS,
  loadSettings,
  parseSettings,
  saveSettings,
  SETTINGS_KEY,
} from "./settings.ts";
import type { StorageLike } from "./storage.ts";

function memoryStorage(initial?: string): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(SETTINGS_KEY, initial);
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe("parseSettings", () => {
  it("uses the defaults when nothing is saved", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("reads a valid notation", () => {
    expect(parseSettings('{"notation":"scientific"}')).toEqual({
      ...DEFAULT_SETTINGS,
      notation: "scientific",
    });
    expect(parseSettings('{"notation":"engineering"}')).toEqual({
      ...DEFAULT_SETTINGS,
      notation: "engineering",
    });
  });

  it("falls back to the default for a bad value, and ignores unknown settings", () => {
    expect(parseSettings('{"notation":"roman"}')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"notation":7}')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"theme":"loud"}')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"notation":"scientific","theme":"loud"}')).toEqual({
      ...DEFAULT_SETTINGS,
      notation: "scientific",
    });
  });

  it("falls back to the defaults for text that is not settings", () => {
    for (const text of ["", "nope", "null", "[]", "42", '"short"']) {
      expect(parseSettings(text), text).toEqual(DEFAULT_SETTINGS);
    }
  });

  it("returns a fresh object each time, so callers can't change the defaults", () => {
    const first = parseSettings(null);
    first.notation = "scientific";
    expect(parseSettings(null).notation).toBe("short");
    expect(DEFAULT_SETTINGS.notation).toBe("short");
  });
});

describe("loadSettings and saveSettings", () => {
  it("round-trips through storage", () => {
    const storage = memoryStorage();
    expect(saveSettings({ ...DEFAULT_SETTINGS, notation: "engineering" }, storage)).toBe(true);
    expect(loadSettings(storage)).toEqual({ ...DEFAULT_SETTINGS, notation: "engineering" });
  });

  it("gives the defaults, without throwing, when storage is missing or blocked", () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(saveSettings({ ...DEFAULT_SETTINGS, notation: "scientific" }, null)).toBe(false);
    const blocked: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadSettings(blocked)).toEqual(DEFAULT_SETTINGS);
    expect(saveSettings({ ...DEFAULT_SETTINGS, notation: "scientific" }, blocked)).toBe(false);
  });

  it("does not touch the game save key", () => {
    const storage = memoryStorage();
    saveSettings({ ...DEFAULT_SETTINGS, notation: "scientific" }, storage);
    expect([...storage.data.keys()]).toEqual([SETTINGS_KEY]);
  });
});

describe("the last run record", () => {
  const record = { ending: "apocalypse", tone: "ruthless", walkouts: 3 };

  it("reads a valid record and keeps notation beside it", () => {
    const text = JSON.stringify({ notation: "scientific", lastRun: record });
    expect(parseSettings(text)).toEqual({ notation: "scientific", lastRun: record });
  });

  it("is null when there is none", () => {
    expect(parseSettings('{"notation":"scientific"}').lastRun).toBeNull();
  });

  it("ignores a bad record without losing the notation", () => {
    for (const bad of [
      { ending: "peace", tone: "wary", walkouts: 0 },
      { ending: "conquest", tone: "loud", walkouts: 0 },
      { ending: "conquest", tone: "wary", walkouts: -1 },
      { ending: "conquest", tone: "wary", walkouts: 1.5 },
      { ending: "conquest", tone: "wary" },
      "apocalypse",
      [],
      7,
    ]) {
      const text = JSON.stringify({ notation: "engineering", lastRun: bad });
      expect(parseSettings(text), JSON.stringify(bad)).toEqual({
        ...DEFAULT_SETTINGS,
        notation: "engineering",
      });
    }
  });

  it("copies only the known fields", () => {
    const text = JSON.stringify({ lastRun: { ...record, secret: "x" } });
    expect(parseSettings(text).lastRun).toEqual(record);
  });

  it("round-trips through storage", () => {
    const storage = memoryStorage();
    saveSettings(
      { notation: "short", lastRun: { ending: "conquest", tone: "gentle", walkouts: 0 } },
      storage,
    );
    expect(loadSettings(storage).lastRun).toEqual({
      ending: "conquest",
      tone: "gentle",
      walkouts: 0,
    });
  });
});
