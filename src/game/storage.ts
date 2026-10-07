import { parseSave, serializeState } from "./save.ts";
import type { GameState } from "./state.ts";

export const SAVE_KEY = "look-up:save";
/** A save that could not be read is copied here, so a later autosave cannot destroy it. */
export const CORRUPT_SAVE_KEY = "look-up:save-corrupt";

/** The part of the Web Storage API the game uses. */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type LoadResult =
  | { status: "none" }
  | { status: "loaded"; state: GameState }
  | { status: "corrupt"; error: string }
  | { status: "unavailable" };

/**
 * The browser's localStorage, or null when it is blocked. Even looking at `window.localStorage`
 * can throw (private modes, blocked cookies), so this never trusts it.
 */
export function getDefaultStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Read the saved game. Never throws: every outcome is reported in the result. */
export function loadGame(storage: StorageLike | null = getDefaultStorage()): LoadResult {
  if (!storage) return { status: "unavailable" };
  let text: string | null;
  try {
    text = storage.getItem(SAVE_KEY);
  } catch {
    return { status: "unavailable" };
  }
  if (text === null) return { status: "none" };

  const parsed = parseSave(text);
  if (parsed.ok) return { status: "loaded", state: parsed.value };

  try {
    storage.setItem(CORRUPT_SAVE_KEY, text);
  } catch {
    // Keeping a backup is a courtesy; failing to is not worth stopping the game for.
  }
  return { status: "corrupt", error: parsed.error };
}

/** Write the game to storage. Returns whether it worked; never throws. */
export function saveGame(
  state: GameState,
  storage: StorageLike | null = getDefaultStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, serializeState(state));
    return true;
  } catch {
    return false;
  }
}

/** Delete the saved game. Returns whether it worked; never throws. */
export function clearSave(storage: StorageLike | null = getDefaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}
