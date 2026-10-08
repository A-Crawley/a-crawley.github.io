import { act, renderHook } from "@testing-library/react";
import { loadSettings, SETTINGS_KEY } from "../game/settings.ts";
import type { StorageLike } from "../game/storage.ts";
import { useSettings } from "./useSettings";

function memoryStorage(initial?: string): StorageLike {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(SETTINGS_KEY, initial);
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe("useSettings", () => {
  it("starts with short notation when nothing is saved", () => {
    const { result } = renderHook(() => useSettings(memoryStorage()));
    expect(result.current.settings.notation).toBe("short");
  });

  it("loads a saved choice", () => {
    const storage = memoryStorage('{"notation":"scientific"}');
    const { result } = renderHook(() => useSettings(storage));
    expect(result.current.settings.notation).toBe("scientific");
  });

  it("saves a change straight away, and a new session sees it", () => {
    const storage = memoryStorage();
    const first = renderHook(() => useSettings(storage));
    act(() => first.result.current.setNotation("engineering"));
    expect(first.result.current.settings.notation).toBe("engineering");
    expect(loadSettings(storage).notation).toBe("engineering");
    first.unmount();

    const second = renderHook(() => useSettings(storage));
    expect(second.result.current.settings.notation).toBe("engineering");
  });

  it("still works when storage is blocked or turned off", () => {
    const { result } = renderHook(() => useSettings(null));
    act(() => result.current.setNotation("scientific"));
    expect(result.current.settings.notation).toBe("scientific");
  });
});
