import { useState } from "react";
import type { AchievementId } from "../game/achievements.ts";

export interface NewAchievements {
  /** The achievement to announce now, or null. */
  current: AchievementId | null;
  /** Move on to the next one waiting, or clear. */
  dismiss(): void;
}

/**
 * Announces achievements earned while the page is open, one at a time. Whatever was already earned
 * when the page loaded is not announced, and neither is anything while `quiet` is true (the
 * "welcome back" dialog lists those instead).
 */
export function useNewAchievements(
  earned: readonly AchievementId[],
  quiet: boolean,
): NewAchievements {
  const [seen, setSeen] = useState<readonly AchievementId[]>(earned);
  const [queue, setQueue] = useState<readonly AchievementId[]>([]);

  const fresh = earned.filter((id) => !seen.includes(id));
  if (fresh.length > 0) {
    // Updating state while rendering is the supported way to derive state from changing input.
    setSeen(earned);
    if (!quiet) setQueue([...queue, ...fresh]);
  }

  return {
    current: queue[0] ?? null,
    dismiss: () => setQueue(queue.slice(1)),
  };
}
