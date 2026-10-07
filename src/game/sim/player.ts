import { CONFIG, ITEMS } from "./config.ts";
import type { ItemDef, ItemId, Stage } from "./config.ts";
import {
  advanceStage,
  buy,
  canAfford,
  canRest,
  compassionIndex,
  conquestOdds,
  costOf,
  createState,
  isAvailable,
  isFinished,
  isResting,
  ratesFor,
  startRestDay,
  step,
} from "./engine.ts";
import type { Rates, SimState } from "./engine.ts";

/** Decides policies and rest days each second. */
export interface Strategy {
  name: string;
  describe: string;
  decide(state: SimState): void;
}

export const STRATEGIES: readonly Strategy[] = [
  {
    name: "efficient",
    describe: "Extended shifts and rations optimisation always on, never rests",
    decide(state) {
      state.policies.extendedShifts = true;
      state.policies.rationsOptimisation = true;
    },
  },
  {
    name: "balanced",
    describe: "Shifts on while morale is healthy, rest day when morale drops below 45",
    decide(state) {
      if (state.morale > 65) state.policies.extendedShifts = true;
      else if (state.morale < 50) state.policies.extendedShifts = false;
      state.policies.rationsOptimisation = false;
      if (state.morale < 45 && canRest(state)) startRestDay(state);
    },
  },
  {
    name: "compassionate",
    describe: "No policies, takes a rest day whenever one is available",
    decide(state) {
      state.policies.extendedShifts = false;
      state.policies.rationsOptimisation = false;
      if (canRest(state) && !isResting(state)) startRestDay(state);
    },
  },
];

function weighted(rates: Rates, stage: Stage): number {
  const value = CONFIG.value[stage];
  return rates.food * value.food + rates.wood * value.wood + rates.infra * value.infra;
}

/** Seconds for an item to pay for itself, valuing each currency by CONFIG.value. Infinity if it produces nothing. */
export function paybackSeconds(state: SimState, def: ItemDef): number {
  const now = weighted(ratesFor(state), state.stage);
  const after = weighted(
    ratesFor(state, { ...state.owned, [def.id]: state.owned[def.id] + 1 }),
    state.stage,
  );
  const gain = after - now;
  if (gain <= 0) return Infinity;
  return (costOf(state, def) * CONFIG.value[state.stage][def.currency]) / gain;
}

const REQUIRED: Partial<Record<Stage, ItemId>> = { 2: "research", 3: "exploit" };

/**
 * Greedy player: buy whichever production item pays back fastest, waiting until it is affordable.
 * Once the best item is not worth it (payback over the stage's limit), save for the stage-ending purchase.
 */
export function chooseTarget(state: SimState): ItemDef | null {
  const required = REQUIRED[state.stage];
  const candidates = ITEMS.filter((def) => isAvailable(state, def) && def.id !== required);

  let best: ItemDef | null = null;
  let bestPayback = Infinity;
  for (const def of candidates) {
    const payback = paybackSeconds(state, def);
    if (payback < bestPayback) {
      best = def;
      bestPayback = payback;
    }
  }

  const requiredDef = required ? (ITEMS.find((def) => def.id === required) ?? null) : null;
  if (requiredDef && (best === null || bestPayback > CONFIG.maxPaybackSeconds[state.stage])) {
    return requiredDef;
  }
  return best;
}

export interface Purchase {
  time: number;
  stage: Stage;
  item: ItemId;
}

export interface StageSummary {
  stage: Stage;
  startedAt: number;
  endedAt: number | null;
  purchases: number;
  longestGapSeconds: number;
  /** Output per second when the stage ended. */
  endRates: Rates | null;
}

export interface RunResult {
  strategy: string;
  finished: boolean;
  totalSeconds: number;
  stages: StageSummary[];
  purchases: Purchase[];
  firstPurchase: Partial<Record<ItemId, number>>;
  neverBought: ItemId[];
  walkouts: number;
  restDays: number;
  drift: number;
  compassion: number;
  conquestOdds: number;
  endMorale: number;
}

export function runSimulation(strategy: Strategy): RunResult {
  const state = createState();
  const purchases: Purchase[] = [];
  const firstPurchase: Partial<Record<ItemId, number>> = {};
  const stages: StageSummary[] = [
    { stage: 1, startedAt: 0, endedAt: null, purchases: 0, longestGapSeconds: 0, endRates: null },
  ];
  let lastPurchaseAt = 0;

  while (!isFinished(state) && state.time < CONFIG.maxSeconds) {
    strategy.decide(state);
    step(state);

    // Buy as much as the greedy player can afford this second.
    for (;;) {
      const target = chooseTarget(state);
      if (!target || !canAfford(state, target)) break;
      buy(state, target);
      purchases.push({ time: state.time, stage: state.stage, item: target.id });
      firstPurchase[target.id] ??= state.time;
      const summary = stages[stages.length - 1];
      summary.purchases += 1;
      summary.longestGapSeconds = Math.max(summary.longestGapSeconds, state.time - lastPurchaseAt);
      lastPurchaseAt = state.time;
      const next = advanceStage(state);
      if (next) {
        summary.endedAt = state.time;
        summary.endRates = ratesFor(state);
        stages.push({
          stage: next,
          startedAt: state.time,
          endedAt: null,
          purchases: 0,
          longestGapSeconds: 0,
          endRates: null,
        });
        lastPurchaseAt = state.time;
      }
    }

    // Stage 1 ends on accumulated infrastructure, not on a purchase.
    const next = advanceStage(state);
    if (next) {
      stages[stages.length - 1].endedAt = state.time;
      stages[stages.length - 1].endRates = ratesFor(state);
      stages.push({
        stage: next,
        startedAt: state.time,
        endedAt: null,
        purchases: 0,
        longestGapSeconds: 0,
        endRates: null,
      });
      lastPurchaseAt = state.time;
    }
  }

  const finished = isFinished(state);
  const last = stages[stages.length - 1];
  if (finished) {
    last.endedAt = state.time;
    last.endRates = ratesFor(state);
  }

  const bought = new Set(purchases.map((p) => p.item));
  return {
    strategy: strategy.name,
    finished,
    totalSeconds: state.time,
    stages,
    purchases,
    firstPurchase,
    neverBought: ITEMS.filter((def) => !bought.has(def.id)).map((def) => def.id),
    walkouts: state.walkouts,
    restDays: state.restDays,
    drift: state.drift,
    compassion: compassionIndex(state.drift),
    conquestOdds: conquestOdds(state.drift),
    endMorale: state.morale,
  };
}
