import { useState } from "react";

/**
 * Remembers every value it has ever been given, so something that appears once keeps appearing.
 * Used to keep a shop item on screen after the player spends the money that revealed it.
 * Lasts as long as the component does; a reload recomputes it from the game state.
 */
export function useLatchedSet<T>(current: readonly T[]): ReadonlySet<T> {
  const [seen, setSeen] = useState<ReadonlySet<T>>(() => new Set(current));
  if (current.some((value) => !seen.has(value))) {
    // Updating state while rendering is the supported way to derive state from changing input.
    setSeen(new Set([...seen, ...current]));
  }
  return seen;
}
