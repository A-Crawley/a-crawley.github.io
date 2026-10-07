import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";
import { tick } from "./tick.ts";

export type GameAction = (state: GameState) => GameState;

/** A tiny external store for the game state, with no React in it. */
export interface GameStore {
  getState(): GameState;
  /** Returns an unsubscribe function. Listeners run after every state change. */
  subscribe(listener: () => void): () => void;
  /** Advance the game to the current time. */
  tick(): void;
  /** Catch up to the current time, then apply a player action. */
  dispatch(action: GameAction): void;
  /** Replace the whole state, for example with an imported save or a fresh game. */
  replace(state: GameState): void;
}

export interface GameStoreOptions {
  /** Clock in ms since the epoch. Defaults to Date.now; tests pass their own. */
  now?: () => number;
  initialState?: GameState;
}

export function createGameStore(options: GameStoreOptions = {}): GameStore {
  const now = options.now ?? Date.now;
  let state = options.initialState ?? createGameState(now());
  const listeners = new Set<() => void>();

  function setState(next: GameState): void {
    if (next === state) return;
    state = next;
    listeners.forEach((listener) => listener());
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    tick() {
      setState(tick(state, now()));
    },
    dispatch(action) {
      // Bring the state up to date first, so the action happens at the moment the player did it.
      setState(action(tick(state, now())));
    },
    replace(next) {
      setState(next);
    },
  };
}
