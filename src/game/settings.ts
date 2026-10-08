import { DEFAULT_NOTATION, NOTATIONS } from "./format.ts";
import type { Notation } from "./format.ts";
import { getDefaultStorage } from "./storage.ts";
import type { StorageLike } from "./storage.ts";

/**
 * Player preferences. Kept apart from the game save on purpose: a preference belongs to the
 * player's device, not to a game, so importing a save or starting over does not touch it.
 */
export interface Settings {
  notation: Notation;
}

export const SETTINGS_KEY = "look-up:settings";

export const DEFAULT_SETTINGS: Settings = { notation: DEFAULT_NOTATION };

/**
 * Read settings from JSON text. Anything missing or unrecognised falls back to its default, field
 * by field, so one bad value (or a setting from a newer version) never loses the rest.
 */
export function parseSettings(text: string | null): Settings {
  if (text === null) return { ...DEFAULT_SETTINGS };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ...DEFAULT_SETTINGS };
  const { notation } = raw as Record<string, unknown>;
  return {
    notation: NOTATIONS.find((candidate) => candidate === notation) ?? DEFAULT_SETTINGS.notation,
  };
}

/** Load settings. Never throws; blocked storage gives the defaults. */
export function loadSettings(storage: StorageLike | null = getDefaultStorage()): Settings {
  if (!storage) return { ...DEFAULT_SETTINGS };
  try {
    return parseSettings(storage.getItem(SETTINGS_KEY));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Save settings. Returns whether it worked; never throws. */
export function saveSettings(
  settings: Settings,
  storage: StorageLike | null = getDefaultStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
