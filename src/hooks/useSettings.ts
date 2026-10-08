import { useCallback, useState } from "react";
import type { Notation } from "../game/format.ts";
import { loadSettings, saveSettings } from "../game/settings.ts";
import type { Settings } from "../game/settings.ts";
import { getDefaultStorage } from "../game/storage.ts";
import type { StorageLike } from "../game/storage.ts";

export interface UseSettings {
  settings: Settings;
  /** Change the notation and save it straight away. */
  setNotation(notation: Notation): void;
}

/** The player's preferences, loaded once and saved whenever they change. */
export function useSettings(storage?: StorageLike | null): UseSettings {
  const [{ store, initial }] = useState(() => {
    const resolved = storage === undefined ? getDefaultStorage() : storage;
    return { store: resolved, initial: loadSettings(resolved) };
  });
  const [settings, setSettings] = useState<Settings>(initial);

  const setNotation = useCallback(
    (notation: Notation) => {
      const next: Settings = { ...settings, notation };
      setSettings(next);
      saveSettings(next, store);
    },
    [settings, store],
  );

  return { settings, setNotation };
}
