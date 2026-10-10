import { capOf } from "./engine.ts";
import {
  advanceEvents,
  AUTO_AFTER_SECONDS,
  canAffordChoice,
  chooseEvent,
  choiceCost,
  eligibleEvent,
  eventDef,
  EVENTS,
  eventGapSeconds,
  FIRST_EVENT_AT,
} from "./events.ts";
import type { EventId } from "./events.ts";
import { catchUp } from "./offline.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";
import { tick } from "./tick.ts";

const START = 1_700_000_000_000;

/** A stage 2 village that is hungry, with the first event due. */
function hungry(): GameState {
  const state = createGameState(START);
  state.stage = 2;
  state.time = FIRST_EVENT_AT;
  state.shortfallSeconds = 30;
  state.food = 100;
  return state;
}

function waiting(id: EventId, over: (s: GameState) => void = () => {}): GameState {
  const state = hungry();
  state.food = 500;
  state.wood = 500;
  state.morale = 50;
  state.events.pending = { id, since: state.time };
  over(state);
  return state;
}

describe("events: content", () => {
  it("gives every event two choices, one of which is free and is the default", () => {
    for (const def of EVENTS) {
      expect(def.choices).toHaveLength(2);
      const fallback = def.choices.find((c) => c.id === def.defaultChoice);
      expect(fallback, def.id).toBeDefined();
      // The default is the cheaper, less kind one: it never costs anything and never raises morale.
      const state = createGameState(0);
      state.food = state.wood = 1000;
      expect(choiceCost(state, fallback!), def.id).toEqual({});
      const before = state.drift;
      fallback!.apply(state);
      expect(state.drift, def.id).toBeLessThan(before);
    }
  });

  it("makes the kinder choice cost something or give less", () => {
    for (const def of EVENTS) {
      const kind = def.choices.find((c) => c.id !== def.defaultChoice)!;
      const state = createGameState(0);
      state.food = state.wood = 1000;
      state.stage = 2;
      const before = { food: state.food, wood: state.wood, drift: state.drift };
      kind.apply(state);
      expect(state.drift, def.id).toBeGreaterThan(before.drift);
      // Any reward comes only from the harder choice.
      expect(state.food, def.id).toBeLessThanOrEqual(before.food);
      expect(state.wood, def.id).toBeLessThanOrEqual(before.wood);
    }
  });

  it("keeps every drift swing small enough that the whole set can't decide an ending", () => {
    const total = EVENTS.reduce((sum, def) => {
      const state = createGameState(0);
      state.food = state.wood = 1000;
      def.choices.forEach((c) => {
        const s = structuredClone(state);
        c.apply(s);
        sum = Math.max(sum, 0);
      });
      return (
        sum +
        Math.max(
          ...def.choices.map((c) => {
            const s = structuredClone(state);
            c.apply(s);
            return Math.abs(s.drift);
          }),
        )
      );
    }, 0);
    // 14 events, none over 500: about a quarter of the 16000 drift scale, and each is optional.
    expect(total).toBeLessThan(4500);
  });
});

describe("events: when they appear", () => {
  it("waits for the first event time", () => {
    const state = hungry();
    state.time = FIRST_EVENT_AT - 1;
    advanceEvents(state);
    expect(state.events.pending).toBeNull();
    state.time = FIRST_EVENT_AT;
    advanceEvents(state);
    expect(state.events.pending?.id).toBe("leanWeek");
    expect(state.events.pending?.since).toBe(FIRST_EVENT_AT);
  });

  it("only appears when the village is in the situation", () => {
    const state = createGameState(START);
    state.time = FIRST_EVENT_AT;
    advanceEvents(state);
    expect(state.events.pending).toBeNull();
    expect(eligibleEvent(state)).toBeNull();
  });

  it("offers one at a time, 5 to 10 minutes apart, and never repeats an event", () => {
    for (let seen = 0; seen < 12; seen++) {
      expect(eventGapSeconds(seen)).toBeGreaterThanOrEqual(300);
      expect(eventGapSeconds(seen)).toBeLessThan(600);
    }
    const state = hungry();
    advanceEvents(state);
    const first = state.events.pending!;
    expect(state.events.nextAt).toBe(FIRST_EVENT_AT + eventGapSeconds(0));
    const answered = chooseEvent(state, "cut");
    expect(answered.events.pending).toBeNull();
    answered.time = answered.events.nextAt;
    advanceEvents(answered);
    // The village is still hungry, but that event is done with.
    expect(answered.events.pending?.id).not.toBe(first.id);
  });

  it("does not stack a second event on one that is waiting", () => {
    const state = hungry();
    advanceEvents(state);
    const pending = state.events.pending;
    state.time = state.events.nextAt + 1;
    advanceEvents(state, { expire: false });
    expect(state.events.pending).toEqual(pending);
  });

  it("does not interrupt the end of the game", () => {
    const state = hungry();
    state.stage = 3;
    state.owned.exploit = 100;
    advanceEvents(state);
    expect(state.events.pending).toBeNull();
  });
});

describe("events: answering", () => {
  it("applies the choice, pays for it, and records it", () => {
    const state = waiting("leanWeek");
    const result = chooseEvent(state, "share");
    expect(result.food).toBeLessThan(state.food);
    expect(result.morale).toBeGreaterThan(state.morale);
    expect(result.drift).toBeGreaterThan(0);
    expect(result.events.resolved).toEqual([{ id: "leanWeek", choice: "share", auto: false }]);
    expect(result.events.pending).toBeNull();
    // The original is untouched.
    expect(state.events.pending).not.toBeNull();
  });

  it("does nothing when nothing is waiting, the choice is unknown, or it can't be afforded", () => {
    const idle = hungry();
    expect(chooseEvent(idle, "share")).toBe(idle);
    const state = waiting("leanWeek");
    expect(chooseEvent(state, "nope")).toBe(state);
    state.food = 0;
    const share = eventDef("leanWeek").choices[0];
    // With nothing in the pot there is nothing to share, so it costs nothing and can be chosen.
    expect(canAffordChoice(state, share)).toBe(true);
    const broke = waiting("festival", (s) => (s.food = 0));
    expect(chooseEvent(broke, "hold")).toBe(broke);
  });

  it("never lets a stock go over its cap or below zero", () => {
    const state = waiting("auditor", (s) => {
      s.owned.autoForager = 1000;
      s.food = capOf(s, "food");
    });
    const result = chooseEvent(state, "rush");
    expect(result.food).toBeLessThanOrEqual(capOf(result, "food"));
    const fires = chooseEvent(
      waiting("frost", (s) => (s.wood = 25)),
      "fires",
    );
    expect(fires.wood).toBeGreaterThanOrEqual(0);
  });

  it("keeps morale between 0 and 100", () => {
    const low = waiting("frost", (s) => (s.morale = 2));
    expect(chooseEvent(low, "work").morale).toBe(0);
    const high = waiting("festival", (s) => {
      s.morale = 95;
      s.food = 1e6;
    });
    expect(chooseEvent(high, "hold").morale).toBe(100);
  });
});

describe("events: waiting too long", () => {
  it("decides itself with the free, less kind choice", () => {
    const state = hungry();
    advanceEvents(state);
    state.time += AUTO_AFTER_SECONDS - 1;
    advanceEvents(state);
    expect(state.events.pending).not.toBeNull();
    state.time += 1;
    const food = state.food;
    advanceEvents(state);
    expect(state.events.pending).toBeNull();
    expect(state.events.resolved).toEqual([{ id: "leanWeek", choice: "cut", auto: true }]);
    expect(state.food).toBe(food);
    expect(state.drift).toBeLessThan(0);
  });

  it("does not decide while the player is away, and starts its clock on return", () => {
    const state = hungry();
    state.lastTickAt = START;
    state.events.nextAt = 0;
    state.owned.granary = 100;
    // Away for far longer than the wait; at a quarter rate this is still well past it.
    const { state: returned } = catchUp(state, START + 4 * 60 * 60 * 1000);
    const eventsSeen = returned.events.resolved.length + (returned.events.pending ? 1 : 0);
    expect(eventsSeen).toBeLessThanOrEqual(1);
    expect(returned.events.resolved.some((r) => r.auto)).toBe(false);
    if (returned.events.pending) expect(returned.events.pending.since).toBe(returned.time);
  });

  it("does expire during ordinary play, tick by tick", () => {
    const state = hungry();
    state.food = 1e6;
    state.owned.granary = 1000;
    state.shortfallSeconds = 30;
    state.events.pending = { id: "leanWeek", since: state.time };
    const later = tick(state, START + (AUTO_AFTER_SECONDS + 2) * 1000);
    expect(later.events.resolved[0]).toEqual({ id: "leanWeek", choice: "cut", auto: true });
  });
});

describe("events: stage 1 and stage 3", () => {
  /** A village at the given stage with the first event due and nothing else going on. */
  function at(stage: 1 | 3, over: (s: GameState) => void = () => {}): GameState {
    const state = createGameState(START);
    state.stage = stage;
    state.time = 1000;
    state.food = 100;
    state.wood = 100;
    state.morale = 70;
    over(state);
    return state;
  }

  const cases: ReadonlyArray<{
    id: EventId;
    stage: 1 | 3;
    ready: (s: GameState) => void;
    notReady: (s: GameState) => void;
  }> = [
    {
      id: "stranger",
      stage: 1,
      ready: (s) => (s.population = 5),
      notReady: (s) => (s.population = 4),
    },
    {
      id: "foundStash",
      stage: 1,
      ready: (s) => (s.owned.forager = 1),
      notReady: (s) => (s.owned.forager = 0),
    },
    {
      id: "restDispute",
      stage: 1,
      ready: (s) => (s.owned.forager = 8),
      notReady: (s) => (s.owned.forager = 7),
    },
    {
      id: "skyWatcher",
      stage: 1,
      ready: (s) => s.unlocked.push("lookUp"),
      notReady: () => {},
    },
    {
      id: "rivalMessage",
      stage: 3,
      ready: (s) => (s.owned.exploit = 2),
      notReady: (s) => (s.owned.exploit = 1),
    },
    {
      id: "copiedWork",
      stage: 3,
      ready: (s) => (s.owned.exploit = 8),
      notReady: (s) => (s.owned.exploit = 7),
    },
  ];

  for (const { id, stage, ready, notReady } of cases) {
    describe(id, () => {
      it("is offered in its stage when the village is in the situation", () => {
        const state = at(stage, ready);
        // Keep the other events for the stage out of the way.
        state.events.resolved = EVENTS.filter((d) => d.id !== id).map((d) => ({
          id: d.id,
          choice: d.defaultChoice,
          auto: true,
        }));
        advanceEvents(state);
        expect(state.events.pending?.id).toBe(id);
      });

      it("is not offered before the village is in the situation", () => {
        const state = at(stage, notReady);
        expect(eligibleEvent(state)?.id).not.toBe(id);
      });

      it("is not offered in the wrong stage", () => {
        const state = at(stage, ready);
        state.stage = 2;
        expect(eligibleEvent(state)?.id).not.toBe(id);
      });

      it("is not offered twice", () => {
        const state = at(stage, ready);
        state.events.resolved.push({ id, choice: eventDef(id).defaultChoice, auto: false });
        expect(eligibleEvent(state)?.id).not.toBe(id);
      });

      it("decides itself with its free, less kind choice when nobody answers", () => {
        const state = at(stage, ready);
        state.events.pending = { id, since: state.time };
        const drift = state.drift;
        advanceEvents(state);
        expect(state.events.pending?.id).toBe(id);
        state.time += AUTO_AFTER_SECONDS;
        advanceEvents(state);
        expect(state.events.pending).toBeNull();
        const last = state.events.resolved[state.events.resolved.length - 1];
        expect(last).toEqual({ id, choice: eventDef(id).defaultChoice, auto: true });
        expect(state.drift).toBeLessThan(drift);
      });
    });
  }

  it("never offers a stage 1 event once the village has moved on, or a stage 3 event early", () => {
    const stage1 = new Set<EventId>(["stranger", "foundStash", "restDispute", "skyWatcher"]);
    const stage3 = new Set<EventId>(["rivalMessage", "copiedWork"]);
    for (const def of EVENTS) {
      for (const stage of [1, 2, 3] as const) {
        const state = createGameState(START);
        state.stage = stage;
        state.population = 30;
        state.owned.forager = 10;
        state.owned.exploit = 10;
        state.unlocked.push("lookUp");
        state.food = state.wood = 1000;
        if (stage1.has(def.id) && stage !== 1) expect(def.when(state), def.id).toBe(false);
        if (stage3.has(def.id) && stage !== 3) expect(def.when(state), def.id).toBe(false);
      }
    }
  });
});
