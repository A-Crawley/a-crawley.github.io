import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { CONFIG } from "../game/config.ts";
import { createGameState } from "../game/state.ts";
import { CORRUPT_SAVE_KEY, loadGame, SAVE_KEY } from "../game/storage.ts";
import type { StorageLike } from "../game/storage.ts";
import { AUTOSAVE_INTERVAL_MS, TICK_INTERVAL_MS, useGame } from "./useGame.ts";

const START = new Date("2026-10-08T00:00:00Z");

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
});

function clickTimes(result: { current: ReturnType<typeof useGame> }, times: number) {
  for (let i = 0; i < times; i++) act(() => result.current.gatherFood());
}

describe("useGame", () => {
  it("starts a fresh game in stage 1 with nothing gathered", () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.state.stage).toBe(1);
    expect(result.current.state.food).toBe(0);
  });

  it("gathers food when the player clicks", () => {
    const { result } = renderHook(() => useGame());
    clickTimes(result, 3);
    expect(result.current.state.food).toBe(3);
  });

  it("lets the player buy a forager and then earns food over time", () => {
    const { result } = renderHook(() => useGame());
    clickTimes(result, 10);
    act(() => result.current.buyItem("forager"));
    expect(result.current.state.owned.forager).toBe(1);
    expect(result.current.state.food).toBe(0);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.state.food).toBeGreaterThan(3.5);
    expect(result.current.state.food).toBeLessThan(4.5);
  });

  it("refreshes the state on a timer", () => {
    const { result } = renderHook(() => useGame());
    const before = result.current.state;
    act(() => {
      vi.advanceTimersByTime(TICK_INTERVAL_MS);
    });
    expect(result.current.state).not.toBe(before);
  });

  it("catches up on a long gap as soon as a hidden tab becomes visible", () => {
    const { result } = renderHook(() => useGame());
    clickTimes(result, 10);
    act(() => result.current.buyItem("forager"));

    // The tab was in the background for an hour, so no timer ran. Only the clock moved.
    vi.setSystemTime(new Date(START.getTime() + 60 * 60 * 1000));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    // An hour away is credited at the offline rate: a quarter of an hour of village time.
    expect(result.current.state.time).toBeCloseTo(3600 * CONFIG.offlineRate, 0);
    expect(result.current.state.food).toBeGreaterThan(250);
  });

  it("toggles a policy", () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.setPolicy("extendedShifts", true));
    expect(result.current.state.policies.extendedShifts).toBe(true);
  });

  it("stops its timer when the component unmounts", () => {
    const { unmount } = renderHook(() => useGame());
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

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

function savedFood(storage: StorageLike): number | null {
  const loaded = loadGame(storage);
  return loaded.status === "loaded" ? loaded.state.food : null;
}

describe("useGame saving", () => {
  it("starts a new game when nothing is saved", () => {
    const { result } = renderHook(() => useGame({ storage: memoryStorage() }));
    expect(result.current.loadStatus).toBe("new");
  });

  it("continues a saved game", () => {
    const storage = memoryStorage();
    const first = renderHook(() => useGame({ storage }));
    clickTimes(first.result, 4);
    act(() => {
      vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS);
    });
    first.unmount();

    const second = renderHook(() => useGame({ storage }));
    expect(second.result.current.loadStatus).toBe("loaded");
    expect(second.result.current.state.food).toBe(4);
  });

  it("autosaves on a timer", () => {
    const storage = memoryStorage();
    const { result } = renderHook(() => useGame({ storage }));
    clickTimes(result, 3);
    expect(savedFood(storage)).toBeNull();
    act(() => {
      vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS);
    });
    expect(savedFood(storage)).toBe(3);
  });

  it("saves when the tab is hidden", () => {
    const storage = memoryStorage();
    const { result } = renderHook(() => useGame({ storage }));
    clickTimes(result, 2);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    try {
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
    } finally {
      Reflect.deleteProperty(document, "visibilityState");
    }
    expect(savedFood(storage)).toBe(2);
  });

  it("saves when the page is closed", () => {
    const storage = memoryStorage();
    const { result } = renderHook(() => useGame({ storage }));
    clickTimes(result, 5);
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(savedFood(storage)).toBe(5);
    clickTimes(result, 1);
    act(() => {
      window.dispatchEvent(new Event("beforeunload"));
    });
    expect(savedFood(storage)).toBe(6);
  });

  it("stops autosaving after unmount", () => {
    const storage = memoryStorage();
    const { unmount } = renderHook(() => useGame({ storage }));
    unmount();
    act(() => {
      vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS * 2);
    });
    expect(storage.data.size).toBe(0);
  });

  it("starts fresh, and keeps a copy, when the saved game is damaged", () => {
    const storage = memoryStorage({ [SAVE_KEY]: '{"version":1,"stage":9}' });
    const { result } = renderHook(() => useGame({ storage }));
    expect(result.current.loadStatus).toBe("corrupt");
    expect(result.current.state.food).toBe(0);
    expect(storage.data.get(CORRUPT_SAVE_KEY)).toBe('{"version":1,"stage":9}');
  });

  it("still plays when storage is blocked", () => {
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
    const { result } = renderHook(() => useGame({ storage: blocked }));
    expect(result.current.loadStatus).toBe("unavailable");
    clickTimes(result, 2);
    act(() => {
      vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS);
    });
    expect(result.current.state.food).toBe(2);
  });

  it("runs without saving when storage is null", () => {
    const { result } = renderHook(() => useGame({ storage: null }));
    clickTimes(result, 1);
    act(() => {
      vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS);
    });
    expect(result.current.state.food).toBe(1);
  });
});

describe("useGame export, import and reset", () => {
  it("moves a game to another browser through an export string", () => {
    const source = renderHook(() => useGame({ storage: memoryStorage() }));
    clickTimes(source.result, 7);
    let text = "";
    act(() => {
      text = source.result.current.exportSave();
    });

    const target = renderHook(() => useGame({ storage: memoryStorage() }));
    let imported = false;
    act(() => {
      imported = target.result.current.importSave(text).ok;
    });
    expect(imported).toBe(true);
    expect(target.result.current.state.food).toBe(7);
  });

  it("saves an imported game straight away", () => {
    const storage = memoryStorage();
    const source = renderHook(() => useGame({ storage: memoryStorage() }));
    clickTimes(source.result, 3);
    let text = "";
    act(() => {
      text = source.result.current.exportSave();
    });
    const target = renderHook(() => useGame({ storage }));
    act(() => {
      target.result.current.importSave(text);
    });
    expect(savedFood(storage)).toBe(3);
  });

  it("rejects a bad import and keeps the current game untouched", () => {
    const storage = memoryStorage();
    const { result } = renderHook(() => useGame({ storage }));
    clickTimes(result, 4);
    let outcome: ReturnType<typeof result.current.importSave> | undefined;
    act(() => {
      outcome = result.current.importSave("definitely not a save");
    });
    expect(outcome?.ok).toBe(false);
    expect(result.current.state.food).toBe(4);
  });

  it("resets to a fresh game and saves it", () => {
    const storage = memoryStorage();
    const { result } = renderHook(() => useGame({ storage }));
    clickTimes(result, 10);
    act(() => result.current.buyItem("forager"));
    act(() => {
      result.current.resetGame();
    });
    expect(result.current.state.owned.forager).toBe(0);
    expect(result.current.state.food).toBe(0);
    expect(result.current.state.lastTickAt).toBe(Date.now());
    expect(loadGame(storage)).toEqual({
      status: "loaded",
      state: createGameState(Date.now()),
    });
  });
});

function setHidden(hidden: boolean) {
  if (hidden) {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  } else {
    Reflect.deleteProperty(document, "visibilityState");
  }
  document.dispatchEvent(new Event("visibilitychange"));
}

const HOUR = 60 * 60 * 1000;

describe("useGame while away", () => {
  afterEach(() => {
    Reflect.deleteProperty(document, "visibilityState");
  });

  it("has no summary on a normal start", () => {
    const { result } = renderHook(() => useGame({ storage: memoryStorage() }));
    expect(result.current.away).toBeNull();
  });

  it("shows a summary straight away when an old save is loaded", () => {
    const storage = memoryStorage();
    const first = renderHook(() => useGame({ storage }));
    clickTimes(first.result, 10);
    act(() => first.result.current.buyItem("forager"));
    act(() => {
      vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS);
    });
    first.unmount();

    vi.setSystemTime(new Date(Date.now() + 3 * HOUR));
    const second = renderHook(() => useGame({ storage }));
    expect(second.result.current.away?.awaySeconds).toBeGreaterThan(3 * 3600 - 40);
    expect(second.result.current.away?.gained.food).toBeGreaterThan(1000);
  });

  it("pauses while the tab is hidden and shows a summary when it returns", () => {
    const { result } = renderHook(() => useGame({ storage: memoryStorage() }));
    clickTimes(result, 10);
    act(() => result.current.buyItem("forager"));
    act(() => result.current.setPolicy("extendedShifts", true));

    act(() => setHidden(true));
    const hiddenAt = result.current.state.time;
    // Timers keep firing in a hidden tab (slowly), but the game does not advance.
    act(() => {
      vi.advanceTimersByTime(TICK_INTERVAL_MS * 20);
    });
    expect(result.current.state.time).toBe(hiddenAt);

    vi.setSystemTime(new Date(Date.now() + 2 * HOUR));
    act(() => setHidden(false));
    expect(result.current.away?.awaySeconds).toBeGreaterThan(2 * 3600 - 10);
    expect(result.current.away?.policiesEnded).toEqual(["extendedShifts"]);
    expect(result.current.state.policies.extendedShifts).toBe(false);
  });

  it("keeps the moment the player left when the page closes while hidden", () => {
    const storage = memoryStorage();
    const { result } = renderHook(() => useGame({ storage }));
    clickTimes(result, 3);
    act(() => setHidden(true));
    const leftAt = loadGame(storage);
    vi.setSystemTime(new Date(Date.now() + HOUR));
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    const after = loadGame(storage);
    expect(leftAt.status).toBe("loaded");
    expect(after.status === "loaded" && after.state.lastTickAt).toBe(
      leftAt.status === "loaded" && leftAt.state.lastTickAt,
    );
  });

  it("does not count a quick tab switch as being away", () => {
    const { result } = renderHook(() => useGame({ storage: memoryStorage() }));
    act(() => setHidden(true));
    vi.setSystemTime(new Date(Date.now() + 20_000));
    act(() => setHidden(false));
    expect(result.current.away).toBeNull();
  });

  it("clears the summary when dismissed", () => {
    const { result } = renderHook(() => useGame({ storage: memoryStorage() }));
    act(() => setHidden(true));
    vi.setSystemTime(new Date(Date.now() + HOUR));
    act(() => setHidden(false));
    expect(result.current.away).not.toBeNull();
    act(() => result.current.dismissAway());
    expect(result.current.away).toBeNull();
  });
});
