import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { buyItem, gatherFood, setPolicy, takeRestDay } from "../game/actions.ts";
import type { ItemId } from "../game/config.ts";
import type { Policies } from "../game/engine.ts";
import { createGameStore } from "../game/store.ts";
import type { GameStoreOptions } from "../game/store.ts";
import type { GameState } from "../game/state.ts";

/** How often the displayed state refreshes. Time itself comes from timestamps, not from this timer. */
export const TICK_INTERVAL_MS = 250;

export interface UseGame {
  state: GameState;
  gatherFood(): void;
  buyItem(id: ItemId): void;
  setPolicy(policy: keyof Policies, on: boolean): void;
  takeRestDay(): void;
}

/**
 * Runs the game and subscribes the component to it. The state refreshes a few times a second, and
 * immediately when a hidden tab becomes visible again, because browsers throttle timers in the
 * background. Catching up uses elapsed real time, so nothing is lost.
 */
export function useGame(options?: GameStoreOptions): UseGame {
  const [store] = useState(() => createGameStore(options));
  const state = useSyncExternalStore(store.subscribe, store.getState);

  useEffect(() => {
    const interval = setInterval(store.tick, TICK_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") store.tick();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [store]);

  return {
    state,
    gatherFood: useCallback(() => store.dispatch(gatherFood), [store]),
    buyItem: useCallback((id: ItemId) => store.dispatch((s) => buyItem(s, id)), [store]),
    setPolicy: useCallback(
      (policy: keyof Policies, on: boolean) => store.dispatch((s) => setPolicy(s, policy, on)),
      [store],
    ),
    takeRestDay: useCallback(() => store.dispatch(takeRestDay), [store]),
  };
}
