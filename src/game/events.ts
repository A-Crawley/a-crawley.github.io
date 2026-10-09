import {
  bedsOf,
  capOf,
  clampStocks,
  idleHands,
  isFinished,
  isFull,
  isHungry,
  ratesFor,
} from "./engine.ts";
import type { GameState } from "./state.ts";

/**
 * Village events: now and then something happens and the player is asked a small question. Each
 * event has two choices and is offered at most once. They are a second source of drift beside the
 * policies, and give the middle of the game some rhythm.
 *
 * Events never block anything. An unanswered event decides itself after AUTO_AFTER_SECONDS, always
 * with the choice that costs nothing and is the less kind one. Time spent away neither triggers a
 * second event nor lets one expire (see `advanceEvents`).
 */

export type EventId =
  | "leanWeek"
  | "overflowingStore"
  | "crowdedBeds"
  | "idleHands"
  | "auditor"
  | "festival"
  | "frost"
  | "overtimePush";

/** Seconds of game time before the first event can appear. */
export const FIRST_EVENT_AT = 600;

/** Game seconds an event waits for an answer before it is decided for the player. */
export const AUTO_AFTER_SECONDS = 300;

/** Game seconds from one event appearing to the next being allowed: between 5 and 10 minutes. */
export function eventGapSeconds(eventsSeen: number): number {
  // Not random: the same game gives the same events. The spread comes from a fixed pattern.
  return 300 + ((eventsSeen * 137) % 300);
}

export interface ResolvedEvent {
  id: EventId;
  choice: string;
  /** True when nobody answered and the default was applied. */
  auto: boolean;
}

export interface PendingEvent {
  id: EventId;
  /** Game time (seconds) at which the event appeared, or the player returned to it. */
  since: number;
}

export interface EventsState {
  /** Answered events, oldest first. An event in here is never offered again. */
  resolved: ResolvedEvent[];
  pending: PendingEvent | null;
  /** Game time before which no new event appears. */
  nextAt: number;
}

export function createEventsState(): EventsState {
  return { resolved: [], pending: null, nextAt: FIRST_EVENT_AT };
}

type Cost = Partial<Record<"food" | "wood", number>>;

export interface EventChoice {
  id: string;
  label: string;
  /** What choosing it does, in a sentence. Costs are added by the screen from `cost`. */
  detail: string;
  /** Line for the village log once chosen. */
  log: string;
  cost?: (state: GameState) => Cost;
  apply: (state: GameState) => void;
}

export interface EventDef {
  id: EventId;
  title: string;
  body: string;
  /** Whether the village is in the situation this event is about. */
  when: (state: GameState) => boolean;
  choices: readonly [EventChoice, EventChoice];
  /** The choice applied when nobody answers. It never has a cost. */
  defaultChoice: string;
}

function bump(state: GameState, morale: number, drift: number): void {
  state.morale = Math.max(0, Math.min(100, state.morale + morale));
  state.drift += drift;
}

/** What the village makes in `seconds`, added to a stock (the stock cap still applies). */
function windfall(state: GameState, currency: "food" | "wood", seconds: number): void {
  state[currency] += ratesFor(state, state.owned, false)[currency] * seconds;
  clampStocks(state);
}

/** A share of what a stock can hold, rounded. At least `floor` so the price is never trivial. */
function share(state: GameState, currency: "food" | "wood", fraction: number, floor: number) {
  return Math.max(floor, Math.round(capOf(state, currency) * fraction));
}

export const EVENTS: readonly EventDef[] = [
  {
    id: "leanWeek",
    title: "A lean week",
    body: "The pot is nearly empty and people are counting mouthfuls.",
    when: (s) => isHungry(s),
    defaultChoice: "cut",
    choices: [
      {
        id: "share",
        label: "Share what is left",
        detail: "Morale rises.",
        log: "What food there was got shared out equally. It was not much, and it was noticed.",
        cost: (s) => ({ food: Math.min(s.food, share(s, "food", 0.25, 10)) }),
        apply: (s) => bump(s, 10, 250),
      },
      {
        id: "cut",
        label: "Cut portions",
        detail: "Costs nothing. Morale falls.",
        log: "Portions were cut for the good of the village. The village was not consulted.",
        apply: (s) => bump(s, -8, -250),
      },
    ],
  },
  {
    id: "overflowingStore",
    title: "A full larder",
    body: "The food store is overflowing. Whatever does not fit will spoil.",
    when: (s) => isFull(s, "food") && s.stage >= 2,
    defaultChoice: "sell",
    choices: [
      {
        id: "feast",
        label: "Hold a feast",
        detail: "Uses some of the surplus. Morale rises.",
        log: "A feast was held with the surplus. Several people asked why this had not happened sooner.",
        cost: (s) => ({ food: share(s, "food", 0.4, 40) }),
        apply: (s) => bump(s, 15, 300),
      },
      {
        id: "sell",
        label: "Trade it for timber",
        detail: "Gives wood. Nobody is thanked.",
        log: "The surplus went to passing traders in exchange for timber. Leadership called it synergy.",
        apply: (s) => {
          windfall(s, "wood", 60);
          bump(s, 0, -200);
        },
      },
    ],
  },
  {
    id: "crowdedBeds",
    title: "No spare beds",
    body: "Every bed is taken, and the newest arrivals are sleeping in shifts.",
    when: (s) => s.stage >= 2 && s.population >= bedsOf(s.owned, s.upgrades) && s.population > 8,
    defaultChoice: "rota",
    choices: [
      {
        id: "partition",
        label: "Partition the storeroom",
        detail: "Costs wood. Morale rises.",
        log: "The storeroom was partitioned into rooms. Storage is now described as aspirational.",
        cost: (s) => ({ wood: Math.min(s.wood, share(s, "wood", 0.3, 20)) }),
        apply: (s) => bump(s, 8, 250),
      },
      {
        id: "rota",
        label: "Share beds in shifts",
        detail: "Costs nothing. Morale falls.",
        log: "Beds are now shared in shifts. Leadership calls it hot desking.",
        apply: (s) => bump(s, -6, -200),
      },
    ],
  },
  {
    id: "idleHands",
    title: "Idle hands",
    body: "A group with nothing to do has started to stand where managers can see them.",
    when: (s) => s.stage >= 2 && idleHands(s) >= 4,
    defaultChoice: "busy",
    choices: [
      {
        id: "workshop",
        label: "Open a workshop",
        detail: "Costs food. Morale rises.",
        log: "A workshop was opened for anyone with no work. It taught nothing in particular and was well attended.",
        cost: (s) => ({ food: share(s, "food", 0.15, 15) }),
        apply: (s) => bump(s, 8, 300),
      },
      {
        id: "busy",
        label: "Tell them to look busy",
        detail: "Costs nothing. Morale falls.",
        log: "The unemployed were told to look busy. They did, and it showed.",
        apply: (s) => bump(s, -5, -150),
      },
    ],
  },
  {
    id: "auditor",
    title: "A visiting auditor",
    body: "Someone with a clipboard wants a report, and has not said what it is for.",
    when: (s) => s.stage >= 2 && s.owned.autoForager + s.owned.sawmillBot > 0,
    defaultChoice: "rush",
    choices: [
      {
        id: "refuse",
        label: "Refuse politely",
        detail: "Costs nothing. Morale rises a little.",
        log: "The auditor was shown the door. The village found this oddly satisfying.",
        apply: (s) => bump(s, 4, 200),
      },
      {
        id: "rush",
        label: "Rush the report",
        detail: "Gives food. Morale falls.",
        log: "A report was rushed out overnight. The auditor praised its confidence.",
        apply: (s) => {
          windfall(s, "food", 90);
          bump(s, -8, -400);
        },
      },
    ],
  },
  {
    id: "festival",
    title: "A festival is suggested",
    body: "Someone points out that nobody has had a day off in a long time.",
    when: (s) => s.stage >= 2 && s.morale < 45,
    defaultChoice: "later",
    choices: [
      {
        id: "hold",
        label: "Hold the festival",
        detail: "Costs food. Morale rises a lot.",
        log: "There was a festival. Output dipped. Nobody could remember having had a better week.",
        cost: (s) => ({ food: share(s, "food", 0.25, 30) }),
        apply: (s) => bump(s, 25, 500),
      },
      {
        id: "later",
        label: "Maybe later",
        detail: "Costs nothing. Morale falls a little.",
        log: "The festival was postponed to a date to be confirmed.",
        apply: (s) => bump(s, -3, -200),
      },
    ],
  },
  {
    id: "frost",
    title: "A hard frost",
    body: "It is colder than anyone planned for, and the huts are thin.",
    when: (s) => s.stage >= 2 && s.wood >= 20,
    defaultChoice: "work",
    choices: [
      {
        id: "fires",
        label: "Burn wood for shared fires",
        detail: "Costs wood. Morale rises.",
        log: "Wood was burned for shared fires. People stayed up late, and talked.",
        cost: (s) => ({ wood: Math.min(s.wood, share(s, "wood", 0.3, 20)) }),
        apply: (s) => bump(s, 10, 300),
      },
      {
        id: "work",
        label: "Send everyone back to work",
        detail: "Costs nothing. Morale falls.",
        log: "Everyone was sent back to work to keep warm. It was stated that this helped.",
        apply: (s) => bump(s, -10, -300),
      },
    ],
  },
  {
    id: "overtimePush",
    title: "The foreman asks for a push",
    body: "A short burst of long hours could bring a deadline in. The foreman says it will be fine.",
    when: (s) => s.stage >= 2 && s.owned.builder > 0 && !s.policies.extendedShifts,
    defaultChoice: "approve",
    choices: [
      {
        id: "decline",
        label: "Decline",
        detail: "Costs nothing. Morale rises a little.",
        log: "The push was declined. The foreman wrote it down.",
        apply: (s) => bump(s, 3, 150),
      },
      {
        id: "approve",
        label: "Approve overtime",
        detail: "Gives wood. Morale falls.",
        log: "Overtime was approved. It was called a push, and then a culture.",
        apply: (s) => {
          windfall(s, "wood", 90);
          bump(s, -12, -500);
        },
      },
    ],
  },
];

const BY_ID = new Map(EVENTS.map((def) => [def.id, def]));

export function eventDef(id: EventId): EventDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Unknown event: ${id}`);
  return def;
}

export function isEventId(value: unknown): value is EventId {
  return typeof value === "string" && BY_ID.has(value as EventId);
}

export function eventChoice(def: EventDef, choiceId: string): EventChoice | undefined {
  return def.choices.find((c) => c.id === choiceId);
}

/** What a choice would cost right now. */
export function choiceCost(state: GameState, choice: EventChoice): Cost {
  return choice.cost?.(state) ?? {};
}

export function canAffordChoice(state: GameState, choice: EventChoice): boolean {
  const cost = choiceCost(state, choice);
  return (cost.food ?? 0) <= state.food && (cost.wood ?? 0) <= state.wood;
}

/** The first event not yet seen whose situation the village is in, or null. */
export function eligibleEvent(state: GameState): EventDef | null {
  const seen = new Set(state.events.resolved.map((r) => r.id));
  return EVENTS.find((def) => !seen.has(def.id) && def.when(state)) ?? null;
}

function resolveIn(state: GameState, def: EventDef, choice: EventChoice, auto: boolean): void {
  const cost = choiceCost(state, choice);
  state.food -= cost.food ?? 0;
  state.wood -= cost.wood ?? 0;
  choice.apply(state);
  state.events.resolved.push({ id: def.id, choice: choice.id, auto });
  state.events.pending = null;
}

/**
 * Move events on by one step, in place like the engine's `step`. Shows an event once its time has
 * come and the village is in the right situation (at most one at a time), and decides an event
 * itself when it has waited too long. `expire: false` leaves a waiting event waiting; away time
 * uses it, so nothing is decided while the player is gone.
 */
export function advanceEvents(state: GameState, options: { expire?: boolean } = {}): void {
  if (isFinished(state)) return;
  const { events } = state;
  if (events.pending) {
    if (options.expire === false || state.time - events.pending.since < AUTO_AFTER_SECONDS) return;
    const def = eventDef(events.pending.id);
    const fallback = eventChoice(def, def.defaultChoice);
    if (fallback) resolveIn(state, def, fallback, true);
    return;
  }
  if (state.time < events.nextAt) return;
  const def = eligibleEvent(state);
  if (!def) return;
  events.pending = { id: def.id, since: state.time };
  events.nextAt = state.time + eventGapSeconds(events.resolved.length);
}

/** Answer the waiting event. Returns the same state when there is none or it can't be afforded. */
export function chooseEvent(state: GameState, choiceId: string): GameState {
  if (isFinished(state) || !state.events.pending) return state;
  const def = eventDef(state.events.pending.id);
  const choice = eventChoice(def, choiceId);
  if (!choice || !canAffordChoice(state, choice)) return state;
  const next = structuredClone(state);
  resolveIn(next, def, choice, false);
  return next;
}
