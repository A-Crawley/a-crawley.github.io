import { briefOffered } from "./briefs.ts";
import { idleHands, isHungry } from "./engine.ts";
import { logLines } from "./log.ts";
import type { GameState } from "./state.ts";

/** What the phone tab bar can flag. The Build tab has nothing to flag: the player is usually on it. */
export type MarkedTab = "village" | "more";

/** What the game says right now. Plain numbers, so it is cheap to compare from one frame to the next. */
export interface TabSignals {
  /** Everything the Log and more tab holds that only ever grows: log lines, Sky notes, achievements. */
  more: number;
  /** The village needs the player: hungry, or villagers idle after machines took their jobs. */
  villageUrgent: boolean;
}

/** What the markers remember between frames. Held in component state only; never saved. */
export interface TabMarkerMemory {
  more: number;
  villageUrgent: boolean;
  marked: Record<MarkedTab, boolean>;
}

/** Reads the signals off the game state. */
export function tabSignals(state: GameState): TabSignals {
  return {
    more: logLines(state).length + state.sky.seen.length + state.achievements.length,
    villageUrgent: isHungry(state) || idleHands(state) > 0 || briefOffered(state),
  };
}

/**
 * The next marker state, given the signals and the tab that is open. Returns `previous` itself when
 * nothing changed, so it can be used to update state while rendering.
 *
 * - The first call (no previous) shows no markers: nothing is new to someone who has just arrived.
 * - Log and more is marked when it holds more than it did, and clears when that tab is opened.
 * - Village is marked when it starts needing the player (hunger or idle hands begins), and clears
 *   when that tab is opened. It does not nag again while the same trouble goes on.
 * - The open tab is never marked.
 */
export function updateTabMarkers(
  previous: TabMarkerMemory | null,
  signals: TabSignals,
  open: string,
): TabMarkerMemory {
  if (previous === null) {
    return {
      more: signals.more,
      villageUrgent: signals.villageUrgent,
      marked: { village: false, more: false },
    };
  }
  const marked = {
    village:
      open !== "village" &&
      (previous.marked.village || (signals.villageUrgent && !previous.villageUrgent)),
    more: open !== "more" && (previous.marked.more || signals.more > previous.more),
  };
  if (
    marked.village === previous.marked.village &&
    marked.more === previous.marked.more &&
    signals.more === previous.more &&
    signals.villageUrgent === previous.villageUrgent
  ) {
    return previous;
  }
  return { more: signals.more, villageUrgent: signals.villageUrgent, marked };
}
