import { bulkCost, maxAffordable, milestoneMultiplier, unitCost } from "./economy.ts";
import { CONFIG, ITEMS, VILLAGE } from "./config.ts";
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
  /** Everyone living in the village: workers, the unemployed and machines' former staff. */
  population: number;
  /** Seconds since the last arrival, capped at the arrival interval. */
  arrivalTimer: number;
  /** Consecutive seconds the village has gone without enough food. Zero when it is fed. */
  shortfallSeconds: number;
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
  hut: 0,
  house: 0,
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
    population: VILLAGE.startPopulation,
    arrivalTimer: 0,
    shortfallSeconds: 0,
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

/** Jobs the villagers hold, including those a machine has since taken over. */
export function jobsHeld(owned: Counts): number {
  return owned.forager + owned.woodcutter + owned.builder;
}

/** Beds in the village: the starting beds plus everything built. */
export function bedsOf(owned: Counts): number {
  let beds: number = VILLAGE.startBeds;
  for (const def of ITEMS) beds += (def.beds ?? 0) * owned[def.id];
  return beds;
}

/** Villagers without a job: free to be hired, and including those a machine replaced. */
export function unemployed(state: SimState): number {
  const working = jobsHeld(state.owned) - idleVillagers(state.owned);
  return Math.max(0, state.population - working);
}

/**
 * Food the village eats each second. Nobody eats until the first job is held: before that the
 * village is just the player clicking, and an opening that starves is not an opening.
 */
export function upkeepPerSecond(state: SimState): number {
  if (jobsHeld(state.owned) === 0) return 0;
  const policy = state.policies.rationsOptimisation
    ? CONFIG.policies.rationsOptimisation.upkeepFactor
    : 1;
  return state.population * VILLAGE.upkeepPerVillager * policy;
}

/** How the village is fed: food coming in minus food eaten, per second (clicks excluded). */
export function netFoodRate(state: SimState, includeClicks = false): number {
  return ratesFor(state, state.owned, includeClicks).food - upkeepPerSecond(state);
}

/** Whether the village has gone hungry long enough to notice. */
export function isHungry(state: SimState): boolean {
  return state.shortfallSeconds >= HUNGRY_NOTICE_SECONDS;
}

/** A shortfall shorter than this is a blip, not worth a warning. */
export const HUNGRY_NOTICE_SECONDS = 5;

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

/**
 * Output per second for a given set of owned counts.
 * The simulation models an always-clicking player, so it includes click income. The real game
 * turns that off, because there each click is its own action.
 */
export function ratesFor(
  state: SimState,
  owned: Counts = state.owned,
  includeClicks = true,
): Rates {
  const { output, milestones, milestoneFactor } = CONFIG;
  const ms = (id: ItemId) => milestoneMultiplier(owned[id], milestones, milestoneFactor);
  const global = globalMultiplier({ ...state, owned });

  const foragers = Math.max(0, owned.forager - owned.autoForager);
  const woodcutters = Math.max(0, owned.woodcutter - owned.sawmillBot);
  const builders = Math.max(0, owned.builder - owned.builderDrone);

  const clicks = includeClicks ? CONFIG.clicksPerSecond * CONFIG.clickValue : 0;
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
  if (state.stage < def.firstStage || state.stage > def.lastStage) return false;
  // Housing is offered once the village is big enough, and stays offered once built.
  if (def.fromPopulation !== undefined) {
    return state.population >= def.fromPopulation || state.owned[def.id] > 0;
  }
  return true;
}

const JOB_IDS: readonly ItemId[] = ["forager", "woodcutter", "builder"];

/** Jobs are filled from the village, so they need an unemployed villager each. */
export function isJob(id: ItemId): boolean {
  return JOB_IDS.includes(id);
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

/** How a purchase is sized: an exact number of units, or as many as the player can afford. */
export type BuyQuantity = 1 | 10 | 100 | "max";

export const BUY_QUANTITIES: readonly BuyQuantity[] = [1, 10, 100, "max"];

/** Price of the first unit with the food discount applied: the base the geometric formulas use. */
function effectiveBase(state: SimState, def: ItemDef): number {
  const discounted = def.currency === "food" && state.policies.rationsOptimisation;
  return discounted ? def.base * CONFIG.policies.rationsOptimisation.foodCostFactor : def.base;
}

/**
 * The most units of an item the player may still buy. Research and exploits end their stage at a
 * goal, so buying past it is not allowed; everything else is unlimited.
 */
export function purchaseLimit(state: SimState, def: ItemDef): number {
  const goal =
    def.id === "research"
      ? CONFIG.researchLevels
      : def.id === "exploit"
        ? CONFIG.exploitsGoal
        : null;
  if (goal !== null) return Math.max(0, goal - state.owned[def.id]);
  // A job needs a villager to do it, so the unemployed are the limit.
  return isJob(def.id) ? unemployed(state) : Infinity;
}

/** Total cost of buying `count` more units of an item, using the closed-form sum. */
export function bulkCostOf(state: SimState, def: ItemDef, count: number): number {
  return bulkCost(effectiveBase(state, def), def.growth, state.owned[def.id], count);
}

/** Most units the player can afford right now, up to the item's limit. */
export function maxAffordableOf(state: SimState, def: ItemDef): number {
  const affordable = maxAffordable(
    effectiveBase(state, def),
    def.growth,
    state.owned[def.id],
    state[def.currency],
  );
  return Math.min(affordable, purchaseLimit(state, def));
}

export interface PurchaseQuote {
  /** Units this purchase would buy. For an unaffordable "max" this is 1, so a price can be shown. */
  count: number;
  /** What those units cost. */
  cost: number;
  /** Whether the purchase can go ahead right now. */
  affordable: boolean;
}

/** What a purchase of the given size would buy and cost, and whether it can go ahead. */
export function quotePurchase(state: SimState, def: ItemDef, quantity: BuyQuantity): PurchaseQuote {
  const limit = purchaseLimit(state, def);
  if (quantity === "max") {
    const count = maxAffordableOf(state, def);
    if (count > 0) return { count, cost: bulkCostOf(state, def, count), affordable: true };
    return { count: 1, cost: bulkCostOf(state, def, 1), affordable: false };
  }
  const cost = bulkCostOf(state, def, quantity);
  return { count: quantity, cost, affordable: quantity <= limit && state[def.currency] >= cost };
}

/** Buy `count` units at once, paying the closed-form total. The caller checks it is allowed. */
export function buyMany(state: SimState, def: ItemDef, count: number): void {
  state[def.currency] -= bulkCostOf(state, def, count);
  state.owned[def.id] += count;
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

/** Food from one click on "Gather food", after morale, policies and research. */
export function foodPerClick(state: SimState): number {
  return CONFIG.clickValue * globalMultiplier(state);
}

const WORKER_PAIRS: ReadonlyArray<readonly [ItemId, ItemId]> = [
  ["forager", "autoForager"],
  ["woodcutter", "sawmillBot"],
  ["builder", "builderDrone"],
];

/** A villager leaves: someone without a job first, otherwise from the job with the most workers. */
function loseVillager(state: SimState): void {
  if (state.population <= 0) return;
  if (unemployed(state) === 0) {
    let best: ItemId | null = null;
    let bestWorking = 0;
    for (const [job, machine] of WORKER_PAIRS) {
      const working = state.owned[job] - state.owned[machine];
      if (working > bestWorking) {
        best = job;
        bestWorking = working;
      }
    }
    if (best === null) return;
    state.owned[best] -= 1;
  }
  state.population -= 1;
}

/**
 * Advance by `dt` seconds. Pass `includeClicks = false` when clicks are real actions. Pass
 * `hunger = false` to let a shortfall pass without morale or villagers paying for it (used while
 * the player is away, so being gone never costs the village).
 */
export function step(state: SimState, dt = 1, includeClicks = true, hunger = true): void {
  const rates = ratesFor(state, state.owned, includeClicks);
  state.food += (rates.food - upkeepPerSecond(state)) * dt;
  state.wood += rates.wood * dt;
  state.infra += rates.infra * dt;

  // Food never goes below nothing. Running out for long enough costs morale, then villagers.
  const { hunger: h } = VILLAGE;
  if (state.food < 0) {
    state.food = 0;
    state.shortfallSeconds = hunger ? state.shortfallSeconds + dt : 0;
  } else {
    state.shortfallSeconds = 0;
  }

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
  if (state.shortfallSeconds > h.graceSeconds) drain += h.moraleDrainPerSecond;
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

  if (state.shortfallSeconds >= h.starveAfterSeconds) {
    loseVillager(state);
    state.shortfallSeconds -= h.leaveSeconds;
  }

  // Villagers arrive to fill free beds, one every few seconds.
  state.arrivalTimer = Math.min(state.arrivalTimer + dt, VILLAGE.arrivalSeconds);
  const fed = state.shortfallSeconds < HUNGRY_NOTICE_SECONDS;
  if (
    fed &&
    state.arrivalTimer >= VILLAGE.arrivalSeconds &&
    state.population < bedsOf(state.owned)
  ) {
    state.population += 1;
    state.arrivalTimer = 0;
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
