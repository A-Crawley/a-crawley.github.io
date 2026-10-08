import { bulkCost, maxAffordable, milestoneMultiplier, unitCost } from "./economy.ts";
import { CONFIG, DISPLACED, ITEMS, STORAGE, VILLAGE } from "./config.ts";
import type { Currency, ItemDef, ItemId, Stage } from "./config.ts";

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
  /** Idle villagers retrained to run machines. Never more than the idle pool. */
  operators: number;
  /** Idle villagers moved into jobs, and let go, over the whole run. */
  redeployed: number;
  released: number;
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
  granary: 0,
  woodshed: 0,
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
    operators: 0,
    redeployed: 0,
    released: 0,
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

/** Operators actually at a machine: never more than the villagers machines have displaced. */
export function staffedOperators(state: SimState): number {
  return staffedBy(state.owned, state.operators);
}

function staffedBy(owned: Counts, operators: number): number {
  return Math.min(operators, idleVillagers(owned));
}

/** Villagers without a job: free to be hired, and including those a machine replaced. */
export function unemployed(state: SimState): number {
  const working = jobsHeld(state.owned) - idleVillagers(state.owned);
  return Math.max(0, state.population - working - placedOf(state));
}

/** Displaced villagers doing odd jobs: free to place, but they make far less than a real hire. */
export function oddJobbers(state: SimState): number {
  const spare = idleVillagers(state.owned) - staffedBy(state.owned, state.operators);
  return Math.max(0, Math.min(state.redeployed, spare));
}

/** Displaced villagers who have been given something to do, as operators or on odd jobs. */
function placedOf(state: SimState): number {
  return staffedBy(state.owned, state.operators) + oddJobbers(state);
}

/**
 * Villagers a machine displaced who are still waiting for something to do: not operators, not
 * hired elsewhere, not let go. These are the ones the player can redeploy, retrain or release.
 */
export function idleHands(state: SimState): number {
  const displaced = idleVillagers(state.owned) - placedOf(state);
  return Math.max(0, Math.min(displaced, unemployed(state)));
}

/** Put an idle villager on odd jobs, for free. Returns false when nobody is idle. */
export function redeployOne(state: SimState): boolean {
  if (idleHands(state) === 0) return false;
  state.redeployed += 1;
  state.drift += DISPLACED.redeployDrift;
  return true;
}

/** Turn an idle villager into a machine operator for food. Returns false when it can't be done. */
export function retrainOne(state: SimState): boolean {
  if (idleHands(state) === 0 || state.food < DISPLACED.retrainFood) return false;
  state.food -= DISPLACED.retrainFood;
  state.operators += 1;
  state.drift += DISPLACED.retrainDrift;
  return true;
}

/** Let an idle villager go. Returns false when nobody is idle. */
export function releaseOne(state: SimState): boolean {
  if (idleHands(state) === 0) return false;
  state.population -= 1;
  state.released += 1;
  state.morale = Math.max(0, state.morale - DISPLACED.releaseMorale);
  state.drift += DISPLACED.releaseDrift;
  return true;
}

/** Output multiplier on every machine: operators help, in proportion to how many machines they cover. */
function operatorFactor(owned: Counts, operators: number): number {
  const machines = owned.autoForager + owned.sawmillBot + owned.builderDrone;
  if (machines === 0) return 1;
  const coverage = Math.min(1, staffedBy(owned, operators) / machines);
  return 1 + DISPLACED.operatorBonus * coverage;
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

  const operated = operatorFactor(owned, state.operators);
  const odd = oddJobbers({ ...state, owned }) * DISPLACED.oddJobFood;
  const clicks = includeClicks ? CONFIG.clicksPerSecond * CONFIG.clickValue : 0;
  const food =
    (foragers * output.forager * ms("forager") +
      owned.autoForager * output.autoForager * ms("autoForager") * operated +
      odd +
      clicks) *
    global;
  const wood =
    (woodcutters * output.woodcutter * ms("woodcutter") +
      owned.sawmillBot * output.sawmillBot * ms("sawmillBot") * operated) *
    global;
  const infra =
    (builders * output.builder * ms("builder") +
      owned.builderDrone * output.builderDrone * ms("builderDrone") * operated) *
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

/**
 * The most food or wood the village can hold. Infrastructure has no ceiling. See STORAGE for why
 * the ceiling never drops below what the dearest available purchase costs.
 */
export function capOf(state: SimState, currency: Currency): number {
  if (currency === "infra") return Infinity;
  let built: number = STORAGE.base[currency];
  let dearest = 0;
  for (const def of ITEMS) {
    if (def.stores?.currency === currency) built += def.stores.amount * state.owned[def.id];
    if (def.currency === currency && isAvailable(state, def)) {
      dearest = Math.max(dearest, costOf(state, def));
    }
  }
  return Math.max(built, dearest * STORAGE.priceCover);
}

/** Whether a stock is sitting at its ceiling, so what arrives next is lost. */
export function isFull(state: SimState, currency: Currency): boolean {
  return currency !== "infra" && state[currency] >= capOf(state, currency);
}

/** Throw away whatever does not fit. Returns true when something was thrown away. */
export function clampStocks(state: SimState): boolean {
  let lost = false;
  for (const currency of ["food", "wood"] as const) {
    const cap = capOf(state, currency);
    if (state[currency] > cap) {
      state[currency] = cap;
      lost = true;
    }
  }
  return lost;
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

export type MoraleDriverId =
  "extendedShifts" | "rations" | "hungry" | "idle" | "crowded" | "restless" | "fed" | "room";

/** One thing moving morale right now. Positive `perSecond` lifts it, negative drains it. */
export interface MoraleDriver {
  id: MoraleDriverId;
  perSecond: number;
}

/**
 * Everything pushing morale up or down at this moment, strongest first. The step and the meter's
 * "why" line both read this, so what the player is told is what the engine does. `strain = false`
 * is the player being away: nobody is crowded or overdue a rest day when nobody is watching.
 */
export function moraleDrivers(state: SimState, strain = true): MoraleDriver[] {
  const { morale: m, policies: p } = CONFIG;
  const d = m.drivers;
  const drivers: MoraleDriver[] = [];
  const add = (id: MoraleDriverId, perSecond: number) => {
    if (perSecond !== 0) drivers.push({ id, perSecond });
  };
  if (state.policies.extendedShifts) add("extendedShifts", -p.extendedShifts.moraleDrainPerSecond);
  if (state.policies.rationsOptimisation)
    add("rations", -p.rationsOptimisation.moraleDrainPerSecond);
  if (state.shortfallSeconds > VILLAGE.hunger.graceSeconds) {
    add("hungry", -VILLAGE.hunger.moraleDrainPerSecond);
  }
  if (state.stage >= 2) {
    const idle = Math.min(m.unemployedDrainPerSecond * idleHands(state), m.unemployedDrainCap);
    const odd = Math.min(DISPLACED.oddJobDrain * oddJobbers(state), DISPLACED.oddJobDrainCap);
    add("idle", -Math.min(idle + odd, m.unemployedDrainCap));
  }
  const freeBeds = bedsOf(state.owned) - state.population;
  if (strain && jobsHeld(state.owned) > 0) {
    if (freeBeds <= 0) add("crowded", -d.crowdedDrain);
    const lastRest = state.restDays > 0 ? state.restReadyAt - p.restDay.cooldown : 0;
    if (state.time - lastRest > d.restlessAfterSeconds) add("restless", -d.restlessDrain);
  }
  if (jobsHeld(state.owned) > 0 && state.shortfallSeconds === 0) {
    const gaining = netFoodRate(state) > 0;
    if (gaining && state.food >= upkeepPerSecond(state) * d.fedCoverSeconds) add("fed", d.fedLift);
    if (freeBeds >= d.roomBeds) add("room", d.roomLift);
  }
  return drivers.sort((a, b) => Math.abs(b.perSecond) - Math.abs(a.perSecond));
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

  clampStocks(state);

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
  for (const driver of moraleDrivers(state, hunger)) drain -= driver.perSecond;
  if (state.policies.extendedShifts) state.drift += p.extendedShifts.driftPerSecond * dt;
  if (state.policies.rationsOptimisation) state.drift += p.rationsOptimisation.driftPerSecond * dt;

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
    // Nobody new moves in while people displaced by machines are still waiting for work.
    idleHands(state) === 0 &&
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
