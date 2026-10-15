import { eventChoice, eventDef } from "./events.ts";
import type { EventId } from "./events.ts";
import type { GameState } from "./state.ts";

/**
 * Event aftermath (GAME-64): a few earlier choices come back later as a dry line in the village log.
 * Words only. A beat is derived from `state.events.resolved`: it shows once the village has
 * answered `AFTERMATH_DELAY` more events since the one it follows. Nothing is stored, so a beat can
 * never fire twice or twice over a long time away, and a choice made for the player (because
 * nobody answered) counts the same as one they made.
 */

/** How many events after the one a beat follows must be answered before it appears. */
export const AFTERMATH_DELAY = 2;

export interface Beat {
  /** The event this follows, and the choice that earns it. */
  event: EventId;
  choice: string;
  text: string;
}

export const BEATS: readonly Beat[] = [
  {
    event: "leanWeek",
    choice: "cut",
    text: "Someone has kept the ration card from the lean week. It is framed, and nobody will say where.",
  },
  {
    event: "stranger",
    choice: "welcome",
    text: "The stranger you welcomed has been seen mending a gutter. They have also been seen eating, which is described as a different matter.",
  },
  {
    event: "foundStash",
    choice: "keep",
    text: "The stash you kept has been noticed. No one has mentioned it, in a way that is hard to miss.",
  },
  {
    event: "restDispute",
    choice: "holdLine",
    text: "A second rest dispute has been filed. It cites the first, politely, as precedent.",
  },
  {
    event: "rivalMessage",
    choice: "ignore",
    text: "The rival has sent a second message, asking whether the first one arrived. It did.",
  },
  {
    event: "copiedWork",
    choice: "lockDown",
    text: "The locked door has a new sign on it. The sign is for the people who were already inside.",
  },
];

/** The beats the run has earned so far, in the order the events were answered. */
export function aftermathLines(state: GameState): Array<{ id: string; text: string }> {
  const resolved = state.events.resolved;
  const lines: Array<{ id: string; text: string }> = [];
  resolved.forEach((entry, index) => {
    const beat = BEATS.find((b) => b.event === entry.id && b.choice === entry.choice);
    if (!beat || resolved.length - 1 - index < AFTERMATH_DELAY) return;
    lines.push({ id: `aftermath:${beat.event}`, text: beat.text });
  });
  return lines;
}

/** Whether every beat names a real event and choice. Used by the tests. */
export function beatsAreValid(): boolean {
  return BEATS.every((beat) => eventChoice(eventDef(beat.event), beat.choice) !== undefined);
}
