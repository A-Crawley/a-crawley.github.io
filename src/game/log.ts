import { itemDef } from "./engine.ts";
import type { GameState } from "./state.ts";
import { UNLOCKS } from "./unlocks.ts";

export interface LogLine {
  /** Stable, so React keeps each line in place as new ones arrive. */
  id: string;
  text: string;
}

const FORAGER_TITLE = itemDef("forager").label;
const WOODCUTTER_TITLE = itemDef("woodcutter").label;
const BUILDER_TITLE = itemDef("builder").label;

/**
 * The village log, oldest first. It is derived from the state rather than stored, so it never needs
 * saving and always agrees with what the player has. A line appears once its condition is met and
 * stays for as long as it holds.
 */
export function logLines(state: GameState): LogLine[] {
  const { food, owned } = state;
  const foragers = owned.forager;
  const lines: LogLine[] = [
    { id: "day-one", text: "Day 1. The village has no food and a plan to have more." },
  ];
  const add = (when: boolean, id: string, text: string) => {
    if (when) lines.push({ id, text });
  };

  add(
    food >= 1 || foragers > 0,
    "first-food",
    "Food acquired. Leadership calls it a breakthrough and schedules a review.",
  );
  add(
    food >= 3 || foragers > 0,
    "look-up-locked",
    'There is a button marked "Look up". It does not seem to be ready yet.',
  );
  add(
    foragers >= 1,
    "forager-hired",
    `${FORAGER_TITLE} hired. They describe the role as "a lot of walking".`,
  );
  add(
    foragers >= 5,
    "five-foragers",
    "Five foragers now. The village calls this a team and orders a team lunch it cannot afford.",
  );
  add(
    foragers >= 10,
    "ten-foragers",
    "Ten foragers. Output doubles. Nobody is told why, which is considered good management.",
  );
  add(
    owned.woodcutter >= 1,
    "woodcutter-hired",
    `${WOODCUTTER_TITLE} hired. The trees were not consulted.`,
  );
  add(
    owned.builder >= 1,
    "builder-hired",
    `${BUILDER_TITLE} hired. Nobody can say what is being built, only that it is on schedule.`,
  );
  // Reveal lines come last, in the order the player met them.
  for (const id of state.unlocked) {
    const log = UNLOCKS.find((unlock) => unlock.id === id)?.log;
    if (log) lines.push({ id: `unlock:${id}`, text: log });
  }
  return lines;
}
