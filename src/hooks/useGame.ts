import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { buyItem, gatherFood, setPolicy, takeRestDay } from "../game/actions.ts";
import type { ItemId } from "../game/config.ts";
import type { BuyQuantity, Policies } from "../game/engine.ts";
import type { AwaySummary } from "../game/offline.ts";
import { exportSave, importSave } from "../game/save.ts";
import type { SaveResult } from "../game/save.ts";
import { createGameState } from "../game/state.ts";
import type { GameState } from "../game/state.ts";
import { clearSave, getDefaultStorage, loadGame, saveGame } from "../game/storage.ts";
import type { StorageLike } from "../game/storage.ts";
import { createGameStore } from "../game/store.ts";
import type { GameStoreOptions } from "../game/store.ts";

/** How often the displayed state refreshes. Time itself comes from timestamps, not from this timer. */
export const TICK_INTERVAL_MS = 250;

/** How often the game saves itself. It also saves when the tab is hidden or closed. */
export const AUTOSAVE_INTERVAL_MS = 30_000;

/** What happened when the game started: a fresh game, or what became of a saved one. */
export type LoadStatus = "new" | "loaded" | "corrupt" | "unavailable";

export interface UseGameOptions extends GameStoreOptions {
  /** Where to save. Defaults to localStorage; pass `null` to run without saving. */
  storage?: StorageLike | null;
}

export interface UseGame {
  state: GameState;
  loadStatus: LoadStatus;
  /** What happened while the player was away, until they dismiss it. */
  away: AwaySummary | null;
  dismissAway(): void;
  gatherFood(): void;
  /** Buy 1, 10 or 100 units, or as many as can be afforded. Fixed amounts are all or nothing. */
  buyItem(id: ItemId, quantity?: BuyQuantity): void;
  setPolicy(policy: keyof Policies, on: boolean): void;
  takeRestDay(): void;
  /** The current game as a copy-and-paste save string. */
  exportSave(): string;
  /** Replace the game with a pasted save. A bad save is reported and the current game is kept. */
  importSave(text: string): SaveResult<GameState>;
  /** Delete the saved game and start again. The caller is responsible for asking first. */
  resetGame(): void;
}

function start(options: UseGameOptions = {}) {
  const storage = options.storage === undefined ? getDefaultStorage() : options.storage;
  const now = options.now ?? Date.now;
  let initialState = options.initialState;
  let loadStatus: LoadStatus = "new";

  if (!initialState) {
    const loaded = loadGame(storage);
    if (loaded.status === "loaded") {
      initialState = loaded.state;
      loadStatus = "loaded";
    } else if (loaded.status === "corrupt" || loaded.status === "unavailable") {
      loadStatus = loaded.status;
    }
  }

  return { store: createGameStore({ now, initialState }), storage, now, loadStatus };
}

/**
 * Runs the game and subscribes the component to it. The state refreshes a few times a second while
 * the tab is visible. While it is hidden the game pauses, and on return the whole gap is caught up
 * from the clock (see `catchUp`): a hidden tab, a closed tab and an old save all look the same.
 *
 * The game loads from storage when it starts, saves every 30 seconds, and saves again when the tab
 * is hidden or closed. If storage is blocked the game still runs; it just cannot save.
 */
export function useGame(options?: UseGameOptions): UseGame {
  const [{ store, storage, now, loadStatus }] = useState(() => start(options));
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const away = useSyncExternalStore(store.subscribe, store.getAway);

  useEffect(() => {
    const isHidden = () => document.visibilityState === "hidden";
    // While hidden, time is not advanced: the gap is replayed as "away" when the player returns,
    // the same as for a closed tab. Saving while hidden keeps the moment they left.
    const save = () => {
      if (!isHidden()) store.tick();
      saveGame(store.getState(), storage);
    };
    const onVisibilityChange = () => {
      if (isHidden()) {
        store.tick(); // credit the time up to the moment they left
        saveGame(store.getState(), storage);
      } else {
        store.tick();
      }
    };
    const onTimer = () => {
      if (!isHidden()) store.tick();
    };

    // A saved game may be hours old: catch up straight away rather than on the first timer tick.
    store.tick();
    const tickInterval = setInterval(onTimer, TICK_INTERVAL_MS);
    const saveInterval = setInterval(() => {
      if (!isHidden()) save();
    }, AUTOSAVE_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    return () => {
      clearInterval(tickInterval);
      clearInterval(saveInterval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", save);
      window.removeEventListener("beforeunload", save);
    };
  }, [store, storage]);

  return {
    state,
    loadStatus,
    away,
    dismissAway: store.dismissAway,
    gatherFood: useCallback(() => store.dispatch(gatherFood), [store]),
    buyItem: useCallback(
      (id: ItemId, quantity: BuyQuantity = 1) => store.dispatch((s) => buyItem(s, id, quantity)),
      [store],
    ),
    setPolicy: useCallback(
      (policy: keyof Policies, on: boolean) => store.dispatch((s) => setPolicy(s, policy, on)),
      [store],
    ),
    takeRestDay: useCallback(() => store.dispatch(takeRestDay), [store]),
    exportSave: useCallback(() => {
      store.tick();
      return exportSave(store.getState());
    }, [store]),
    importSave: useCallback(
      (text: string) => {
        const result = importSave(text);
        if (result.ok) {
          store.replace(result.value);
          saveGame(result.value, storage);
        }
        return result;
      },
      [store, storage],
    ),
    resetGame: useCallback(() => {
      const fresh = createGameState(now());
      store.replace(fresh);
      clearSave(storage);
      saveGame(fresh, storage);
    }, [store, storage, now]),
  };
}
