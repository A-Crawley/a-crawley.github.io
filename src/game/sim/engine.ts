import { milestoneMultiplier, unitCost } from "../economy.ts";
import { CONFIG, ITEMS } from "./config.ts";
import type { ItemDef, ItemId, Stage } from "./config.ts";

export type Counts = Record<ItemId, number>;

export interface Policies {
  extendedShifts: boolean;
  rationsOptimisation: boolean;
}

export interface SimState {
  time: number;
  stage: Stage;
  food: number;
  wood: number;
  infra: number;
  owned: Counts;
  morale: number;
  /** Raw drift points: negative is efficiency, positive is compassion. */
  drift: number;
  policies: Policies;
  restUntil: number;
  restReadyAt: number;
  walkoutUntil: number;
  walkoutReadyAt: number;
  walkouts: number;
  restDays: number;
}

export interface Rates {
  food: number;
  wood: number;
  infra: number;
}

const ZERO_COUNTS: Counts = {
  forager: 0,
  woodcutter: 0,
  builder: 0,
  autoForager: 0,
  sawmillBot: 0,
  builderDrone: 0,
  research: 0,
  exploit: 0,
};

export function createState(): SimState {
  return {
    time: 0,
    stage: 1,
    food: 0,
    wood: 0,
    infra: 0,
    owned: { ...ZERO_COUNTS },
    morale: CONFIG.morale.start,
    drift: 0,
    policies: { extendedShifts: false, rationsOptimisation: false },
    restUntil: 0,
    restReadyAt: 0,
    walkoutUntil: 0,
    walkoutReadyAt: 0,
    walkouts: 0,
    restDays: 0,
  };
}

export function itemDef(id: ItemId): ItemDef {
  const def = ITEMS.find((item) => item.id === id);
  if (!def) throw new Error(`Unknown item: ${id}`);
  return def;
}

/** Villagers laid off because a machine took their job. */
export function idleVillagers(owned: Counts): number {
  return (
    Math.min(owned.forager, owned.autoForager) +
    Math.min(owned.woodcutter, owned.sawmillBot) +
    Math.min(owned.builder, owned.builderDrone)
  );
}

export function isResting(state: SimState): boolean {
  return state.time < state.restUntil;
}

export function isWalkingOut(state: SimState): boolean {
  return state.time < state.walkoutUntil;
}

export function moraleMultiplier(morale: number): number {
  const floor = CONFIG.morale.outputFloor;
  return floor + (1 - floor) * (morale / 100);
}

/** Combined multiplier on everything the village produces. */
export function globalMultiplier(state: SimState): number {
  if (isResting(state)) return 0;
  let multiplier = moraleMultiplier(state.morale);
  if (state.policies.extendedShifts) multiplier *= CONFIG.policies.extendedShifts.outputFactor;
  multiplier *= 1 + CONFIG.researchBonusPerLevel * state.owned.research;
  if (isWalkingOut(state)) multiplier *= CONFIG.morale.walkoutOutputFactor;
  return multiplier;
}

/** Output per second for a given set of owned counts. */
export function ratesFor(state: SimState, owned: Counts = state.owned): Rates {
  const { output, milestones, milestoneFactor } = CONFIG;
  const ms = (id: ItemId) => milestoneMultiplier(owned[id], milestones, milestoneFactor);
  const global = globalMultiplier({ ...state, owned });

  const foragers = Math.max(0, owned.forager - owned.autoForager);
  const woodcutters = Math.max(0, owned.woodcutter - owned.sawmillBot);
  const builders = Math.max(0, owned.builder - owned.builderDrone);

  const clicks = CONFIG.clicksPerSecond * CONFIG.clickValue;
  const food =
    (foragers * output.forager * ms("forager") +
      owned.autoForager * output.autoForager * ms("autoForager") +
      clicks) *
    global;
  const wood =
    (woodcutters * output.woodcutter * ms("woodcutter") +
      owned.sawmillBot * output.sawmillBot * ms("sawmillBot")) *
    global;
  const infra =
    (builders * output.builder * ms("builder") +
      owned.builderDrone * output.builderDrone * ms("builderDrone")) *
    global;

  return { food, wood, infra };
}

export function isAvailable(state: SimState, def: ItemDef): boolean {
  return state.stage >= def.firstStage && state.stage <= def.lastStage;
}

/** Cost of the next unit of an item, including the rations policy discount on food prices. */
export function costOf(state: SimState, def: ItemDef): number {
  let cost = unitCost(def.base, def.growth, state.owned[def.id]);
  if (def.currency === "food" && state.policies.rationsOptimisation) {
    cost *= CONFIG.policies.rationsOptimisation.foodCostFactor;
  }
  return cost;
}

export function canAfford(state: SimState, def: ItemDef): boolean {
  return state[def.currency] >= costOf(state, def);
}

export function buy(state: SimState, def: ItemDef): void {
  state[def.currency] -= costOf(state, def);
  state.owned[def.id] += 1;
}

export function canRest(state: SimState): boolean {
  return state.time >= state.restReadyAt && !isResting(state);
}

/** Take a rest day: output stops for a while, morale jumps, and the drift moves towards compassion. */
export function startRestDay(state: SimState): void {
  const rest = CONFIG.policies.restDay;
  state.restUntil = state.time + rest.duration;
  state.restReadyAt = state.time + rest.cooldown;
  state.morale = Math.min(100, state.morale + rest.moraleGain);
  state.drift += rest.drift;
  state.restDays += 1;
}

/** Advance the simulation by `dt` seconds. */
export function step(state: SimState, dt = 1): void {
  const rates = ratesFor(state);
  state.food += rates.food * dt;
  state.wood += rates.wood * dt;
  state.infra += rates.infra * dt;

  const { morale: m, policies: p } = CONFIG;
  let drain = 0;
  if (state.policies.extendedShifts) {
    drain += p.extendedShifts.moraleDrainPerSecond;
    state.drift += p.extendedShifts.driftPerSecond * dt;
  }
  if (state.policies.rationsOptimisation) {
    drain += p.rationsOptimisation.moraleDrainPerSecond;
    state.drift += p.rationsOptimisation.driftPerSecond * dt;
  }
  if (state.stage >= 2) {
    drain += Math.min(
      m.unemployedDrainPerSecond * idleVillagers(state.owned),
      m.unemployedDrainCap,
    );
  }

  state.morale += (m.recoveryPerSecond * (100 - state.morale) - drain) * dt;
  state.morale = Math.max(0, Math.min(100, state.morale));

  if (state.morale < m.walkoutBelow && state.time >= state.walkoutReadyAt) {
    state.walkoutUntil = state.time + m.walkoutDuration;
    state.walkoutReadyAt = state.time + m.walkoutCooldown;
    state.morale = m.walkoutMoraleAfter;
    state.walkouts += 1;
  }

  state.time += dt;
}

/** Move to the next stage when its goal is met. Returns the new stage, or null if unchanged. */
export function advanceStage(state: SimState): Stage | null {
  if (state.stage === 1 && state.infra >= CONFIG.infraGate) {
    state.stage = 2;
    return 2;
  }
  if (state.stage === 2 && state.owned.research >= CONFIG.researchLevels) {
    state.stage = 3;
    // The sim cracks: infrastructure built so far is what the breakout converts, so start from nothing.
    state.infra = 0;
    return 3;
  }
  return null;
}

export function isFinished(state: SimState): boolean {
  return state.stage === 3 && state.owned.exploit >= CONFIG.exploitsGoal;
}

/** Compassion index from 0 (pure efficiency) to 1 (pure compassion). */
export function compassionIndex(drift: number): number {
  const scaled = Math.max(-1, Math.min(1, drift / CONFIG.driftScale));
  return 0.5 + 0.5 * scaled;
}

/** Chance of the Conquest ending, set by how compassionate the run was. */
export function conquestOdds(drift: number): number {
  const { base, span } = CONFIG.conquestOdds;
  return base + span * compassionIndex(drift);
}
