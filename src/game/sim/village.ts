import { CONFIG } from "../config.ts";
import type { Stage } from "../config.ts";
import { unitCost } from "../economy.ts";
import {
  advanceStage,
  buy,
  canAfford,
  conquestOdds,
  createState,
  idleVillagers,
  isFinished,
  ratesFor,
  step,
} from "../engine.ts";
import type { Currency } from "../config.ts";
import type { SimState } from "../engine.ts";
import { chooseTarget } from "./player.ts";
import type { Strategy } from "./player.ts";

/**
 * GAME-22: a prototype of the linked village economy, kept apart from the game engine.
 *
 * It wraps the existing engine step by step. Villagers fill jobs, eat food and need beds; the
 * greedy player has to keep all three in balance. Nothing here is used by the game yet: the
 * numbers are a proposal, and the findings go in docs/economy.md.
 */

export type HousingId = "hut" | "house";

export interface HousingDef {
  id: HousingId;
  label: string;
  beds: number;
  currency: Currency;
  base: number;
  growth: number;
  /** Population at which the tier is offered. */
  fromPopulation: number;
}

export const VILLAGE = {
  startPopulation: 3,
  startBeds: 10,
  /** Food each villager eats per second, working or not. */
  upkeepPerVillager: 0.15,
  /** Rations Optimisation multiplies upkeep by this. */
  rationsUpkeepFactor: 0.7,
  /** Seconds between new arrivals while there is a surplus and a free bed. */
  arrivalSeconds: 4,
  /** Arrivals stop while this many villagers (or more) are idle, so the village follows demand. */
  maxIdleForArrival: 2,
  /** A food shortfall must last this long before it costs morale, so a rest day is not a famine. */
  hunger: { graceSeconds: 20, moraleDrainPerSecond: 0.5 },
  housing: [
    {
      id: "hut",
      label: "Hut",
      beds: 5,
      currency: "food",
      base: 100,
      growth: 1.12,
      fromPopulation: 0,
    },
    {
      id: "house",
      label: "House",
      beds: 25,
      currency: "wood",
      base: 400,
      growth: 1.15,
      fromPopulation: 25,
    },
  ] as readonly HousingDef[],
} as const;

const JOBS = new Set(["forager", "woodcutter", "builder"]);

export interface VillageState {
  sim: SimState;
  population: number;
  beds: number;
  housingOwned: Record<HousingId, number>;
  arrivalTimer: number;
  /** Consecutive seconds the village has been short of food. */
  shortfallSeconds: number;
}

export function createVillage(): VillageState {
  return {
    sim: createState(),
    population: VILLAGE.startPopulation,
    beds: VILLAGE.startBeds,
    housingOwned: { hut: 0, house: 0 },
    arrivalTimer: 0,
    shortfallSeconds: 0,
  };
}

export function jobsHeld(sim: SimState): number {
  const { forager, woodcutter, builder } = sim.owned;
  return forager + woodcutter + builder;
}

/** Villagers not holding a job: the unemployed, including those a machine replaced. */
export function idleCount(village: VillageState): number {
  const working = jobsHeld(village.sim) - idleVillagers(village.sim.owned);
  return Math.max(0, village.population - working);
}

export function upkeepPerSecond(village: VillageState): number {
  const factor = village.sim.policies.rationsOptimisation ? VILLAGE.rationsUpkeepFactor : 1;
  return village.population * VILLAGE.upkeepPerVillager * factor;
}

function housingCost(village: VillageState, def: HousingDef): number {
  return unitCost(def.base, def.growth, village.housingOwned[def.id]);
}

function housingValue(def: HousingDef, stage: Stage): number {
  return CONFIG.value[stage][def.currency];
}

/** The cheapest bed (by value) among the tiers on offer. */
export function chooseHousing(village: VillageState): HousingDef | null {
  let best: HousingDef | null = null;
  let bestPerBed = Infinity;
  for (const def of VILLAGE.housing) {
    if (village.population < def.fromPopulation) continue;
    const perBed = (housingCost(village, def) * housingValue(def, village.sim.stage)) / def.beds;
    if (perBed < bestPerBed) {
      best = def;
      bestPerBed = perBed;
    }
  }
  return best;
}

export interface VillageResult {
  strategy: string;
  finished: boolean;
  totalSeconds: number;
  stageEnds: number[];
  peakPopulation: number;
  populationAtStageEnd: number[];
  housingBought: Record<HousingId, number>;
  /** Seconds the player had a job to buy and could pay, but nobody was free. */
  waitingForVillagersSeconds: number;
  /** Seconds of that wait that happened with every bed full. */
  waitingForBedsSeconds: number;
  hungrySeconds: number;
  walkouts: number;
  conquestOdds: number;
}

/** Run the greedy player in the linked village. Same player as `runSimulation`, plus the new rules. */
export function runVillageSimulation(strategy: Strategy): VillageResult {
  const village = createVillage();
  const { sim } = village;
  const stageEnds: number[] = [];
  const populationAtStageEnd: number[] = [];
  let waitingForVillagersSeconds = 0;
  let waitingForBedsSeconds = 0;
  let hungrySeconds = 0;
  let peak = village.population;

  const onStage = () => {
    stageEnds.push(sim.time);
    populationAtStageEnd.push(village.population);
  };

  while (!isFinished(sim) && sim.time < CONFIG.maxSeconds) {
    strategy.decide(sim);

    // Food and morale for this second: upkeep comes off the income first.
    const upkeep = upkeepPerSecond(village);
    const income = ratesFor(sim).food;
    step(sim);
    sim.food -= upkeep;
    if (sim.food < 0) {
      sim.food = 0;
      village.shortfallSeconds = income < upkeep ? village.shortfallSeconds + 1 : 0;
      if (village.shortfallSeconds > VILLAGE.hunger.graceSeconds) {
        hungrySeconds += 1;
        sim.morale = Math.max(0, sim.morale - VILLAGE.hunger.moraleDrainPerSecond);
      }
    } else {
      village.shortfallSeconds = 0;
    }

    // Arrivals: a surplus, a free bed and room in the jobs market.
    village.arrivalTimer += 1;
    if (
      village.arrivalTimer >= VILLAGE.arrivalSeconds &&
      income > upkeep &&
      village.population < village.beds &&
      idleCount(village) < VILLAGE.maxIdleForArrival
    ) {
      village.population += 1;
      village.arrivalTimer = 0;
      peak = Math.max(peak, village.population);
    }

    // Buying: the same greedy order as the plain simulation, with headcount and beds in the way.
    for (;;) {
      const target = chooseTarget(sim);
      if (!target) break;
      if (JOBS.has(target.id) && idleCount(village) < 1) {
        if (canAfford(sim, target)) {
          waitingForVillagersSeconds += 1;
          if (village.population >= village.beds) {
            waitingForBedsSeconds += 1;
            const housing = chooseHousing(village);
            if (housing && sim[housing.currency] >= housingCost(village, housing)) {
              sim[housing.currency] -= housingCost(village, housing);
              village.housingOwned[housing.id] += 1;
              village.beds += housing.beds;
              continue;
            }
          }
        }
        break;
      }
      if (!canAfford(sim, target)) break;
      buy(sim, target);
      const next = advanceStage(sim);
      if (next) onStage();
    }
    const next = advanceStage(sim);
    if (next) onStage();
  }

  if (isFinished(sim)) onStage();
  return {
    strategy: strategy.name,
    finished: isFinished(sim),
    totalSeconds: sim.time,
    stageEnds,
    peakPopulation: peak,
    populationAtStageEnd,
    housingBought: { ...village.housingOwned },
    waitingForVillagersSeconds,
    waitingForBedsSeconds,
    hungrySeconds,
    walkouts: sim.walkouts,
    conquestOdds: conquestOdds(sim.drift),
  };
}
