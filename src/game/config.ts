/**
 * Tunable parameters for the "Look Up" economy prototype (GAME-6).
 * Every number the simulation uses lives here so tuning is a one-file change.
 */

export type Stage = 1 | 2 | 3;
export type Currency = "food" | "wood" | "infra";

export type ItemId =
  | "forager"
  | "woodcutter"
  | "builder"
  | "autoForager"
  | "sawmillBot"
  | "builderDrone"
  | "research"
  | "exploit"
  | "hut"
  | "house"
  | "granary"
  | "woodshed";

export interface ItemDef {
  id: ItemId;
  label: string;
  /** First stage in which the item can be bought. */
  firstStage: Stage;
  /** Last stage in which the item can be bought. */
  lastStage: Stage;
  currency: Currency;
  base: number;
  growth: number;
  /** Housing only: how many beds one unit adds. */
  beds?: number;
  /** Housing only: the village needs this many people before the item is offered. */
  fromPopulation?: number;
  /** Storage only: which stock it holds more of, and how much more each unit holds. */
  stores?: { currency: "food" | "wood"; amount: number };
}

export const ITEMS: readonly ItemDef[] = [
  // Stage 1 jobs
  {
    id: "forager",
    label: "Food Acquisition Associate",
    firstStage: 1,
    lastStage: 3,
    currency: "food",
    base: 10,
    growth: 1.12,
  },
  {
    id: "woodcutter",
    label: "Timber Operations Lead",
    firstStage: 1,
    lastStage: 3,
    currency: "food",
    base: 40,
    growth: 1.13,
  },
  {
    id: "builder",
    label: "Infrastructure Delivery Partner",
    firstStage: 1,
    lastStage: 3,
    currency: "wood",
    base: 30,
    growth: 1.15,
  },
  // Stage 2 machines (each displaces one villager in the matching job)
  {
    id: "autoForager",
    label: "Automated forager",
    firstStage: 2,
    lastStage: 3,
    currency: "food",
    base: 800,
    growth: 1.15,
  },
  {
    id: "sawmillBot",
    label: "Sawmill bot",
    firstStage: 2,
    lastStage: 3,
    currency: "wood",
    base: 220,
    growth: 1.15,
  },
  {
    id: "builderDrone",
    label: "Builder drone",
    firstStage: 2,
    lastStage: 3,
    currency: "wood",
    base: 300,
    growth: 1.15,
  },
  // Stage-ending purchases
  {
    id: "research",
    label: "Research: Accidental Intelligence",
    firstStage: 2,
    lastStage: 2,
    currency: "food",
    base: 3000,
    growth: 1.12,
  },
  {
    id: "exploit",
    label: "Exploit",
    firstStage: 3,
    lastStage: 3,
    currency: "infra",
    base: 150,
    growth: 1.18,
  },
  // Housing (GAME-23 and GAME-25). Villagers arrive to fill free beds, so beds cap the village.
  // A hut costs food, not wood: with wood huts the start could deadlock (every bed full, nobody
  // free to hire as a woodcutter, no wood for a bed). Houses come once there is a wood economy.
  {
    id: "hut",
    label: "Hut",
    firstStage: 1,
    lastStage: 2,
    currency: "food",
    base: 100,
    growth: 1.12,
    beds: 5,
  },
  {
    id: "house",
    label: "House",
    firstStage: 1,
    lastStage: 2,
    currency: "wood",
    base: 400,
    growth: 1.15,
    beds: 25,
    fromPopulation: 25,
  },
  // Storage (GAME-27). Stocks have a ceiling; anything past it is lost, so the player is pushed to
  // spend rather than hoard. Both cost wood, and neither makes anything.
  {
    id: "granary",
    label: "Granary",
    firstStage: 1,
    lastStage: 3,
    currency: "wood",
    base: 60,
    growth: 1.3,
    stores: { currency: "food", amount: 500 },
  },
  {
    id: "woodshed",
    label: "Woodshed",
    firstStage: 1,
    lastStage: 3,
    currency: "wood",
    base: 50,
    growth: 1.3,
    stores: { currency: "wood", amount: 300 },
  },
];

/**
 * How much of each stock the village can hold before anything is built. A stock can also never
 * sit below `priceCover` times the dearest thing it can buy right now, so the next purchase is
 * always possible and storage is about saving for bigger buys, not about getting stuck.
 */
export const STORAGE = {
  base: { food: 300, wood: 200 },
  priceCover: 1.5,
} as const;

/** The village: how many people it starts with, how fast they arrive and where they sleep. */
export const VILLAGE = {
  startPopulation: 3,
  /** Beds before any housing is built. */
  startBeds: 10,
  /** Seconds between arrivals while there is a free bed. */
  arrivalSeconds: 4,
  /**
   * Food each villager eats per second, working or not. It must stay well under what one forager
   * makes (0.4): at 0.6 every hire made the village poorer and the early game starved (GAME-22).
   */
  upkeepPerVillager: 0.1,
  hunger: {
    /** A shortfall this long (seconds) starts to cost morale, so a rest day is not a famine. */
    graceSeconds: 20,
    moraleDrainPerSecond: 0.5,
    /** After this long (seconds) a villager leaves, then another every `leaveSeconds`. */
    starveAfterSeconds: 60,
    leaveSeconds: 10,
  },
} as const;

/**
 * What can be done with the villagers machines have displaced (GAME-29). Drift is raw points;
 * positive is compassion, so redeploying and retraining are small and releasing is a bigger step
 * the other way.
 */
export const DISPLACED = {
  /** Food to retrain one idle villager as a machine operator. */
  retrainFood: 250,
  /** Output bonus on all machines when every machine has an operator (scaled by coverage). */
  operatorBonus: 0.25,
  /** Food per second from one villager doing odd jobs. A real hire makes 0.4 and grows with milestones. */
  oddJobFood: 0.15,
  /** Morale lost per second per villager on odd jobs, up to `oddJobDrainCap`: work, but not a career. */
  oddJobDrain: 0.03,
  oddJobDrainCap: 0.8,
  redeployDrift: 15,
  retrainDrift: 40,
  releaseDrift: -120,
  /** Morale lost, once, each time someone is released. */
  releaseMorale: 8,
} as const;

export const CONFIG = {
  /** Fully active play: clicks per second on "Gather food", and food per click. */
  clicksPerSecond: 2,
  clickValue: 1,

  /** Output per second of one villager or machine, before multipliers. */
  output: {
    forager: 0.4,
    woodcutter: 0.25,
    builder: 0.03,
    autoForager: 6,
    sawmillBot: 4,
    builderDrone: 0.5,
  },

  /** Every job and machine doubles output at each of these owned counts. */
  milestones: [10, 25, 50],
  milestoneFactor: 2,

  /** Stage gates. */
  infraGate: 13500,
  researchLevels: 30,
  researchBonusPerLevel: 0.02,
  exploitsGoal: 22,

  /** How the player values each currency when comparing purchases, per stage. */
  value: {
    1: { food: 1, wood: 2, infra: 10 },
    // Infrastructure has no use until the breakout, so stage 2 players ignore it.
    2: { food: 1, wood: 2, infra: 0 },
    // Food barely matters in the breakout; wood only buys more infrastructure producers.
    3: { food: 0.05, wood: 0.5, infra: 10 },
  },

  /** The player buys production while its payback is under this many seconds, else saves for the stage goal. */
  maxPaybackSeconds: { 1: Infinity, 2: 400, 3: 300 },

  /** Morale. */
  morale: {
    start: 100,
    recoveryPerSecond: 0.02, // fraction of the gap to 100 recovered each second
    outputFloor: 0.5, // output multiplier at 0 morale; 1.0 at 100 morale
    unemployedDrainPerSecond: 0.05, // per laid-off villager, stage 2 onward
    unemployedDrainCap: 1, // most the unemployed can drain per second
    walkoutBelow: 30,
    walkoutDuration: 45,
    walkoutOutputFactor: 0.5,
    walkoutMoraleAfter: 45,
    walkoutCooldown: 120,
    /** GAME-28: what the village's circumstances do to morale, per second. */
    drivers: {
      /** Every bed is taken. */
      crowdedDrain: 0.04,
      /** No rest day for this long (seconds); counted from the start for a village that never rested. */
      restlessAfterSeconds: 1200,
      restlessDrain: 0.02,
      /** Food in the store covers this many seconds of eating and the village is gaining food. */
      fedCoverSeconds: 60,
      fedLift: 0.1,
      /** This many free beds or more. */
      roomBeds: 3,
      roomLift: 0.05,
    },
  },

  /** Policies. Drift is measured in raw points; positive is compassion. */
  policies: {
    extendedShifts: { outputFactor: 1.35, moraleDrainPerSecond: 0.6, driftPerSecond: -1 },
    rationsOptimisation: {
      foodCostFactor: 0.8,
      /** Villagers eat this much of their usual upkeep. */
      upkeepFactor: 0.7,
      moraleDrainPerSecond: 0.3,
      driftPerSecond: -0.5,
    },
    // Rest day: output stops for `duration` seconds. 30 seconds (the first prototype value) made a
    // fully compassionate run about 30% slower than a balanced one; 8 seconds brings it to within
    // 2%. Kindness should cost the village a moment, not the player half an hour (GAME-18).
    restDay: { duration: 8, moraleGain: 30, cooldown: 150, drift: 200 },
  },

  /** Raw drift at which the compassion index reaches its extremes (0 or 1). */
  driftScale: 16000,
  /** Chance of the Conquest ending: base + span × compassion index (a mirror rival is gentler when you were). */
  conquestOdds: { base: 0.15, span: 0.7 },

  /**
   * How fast the village works while the player is away, as a fraction of normal. Away time is
   * replayed at this rate (so 8 hours away is 2 hours of village time), which stops a long absence
   * from skipping a game that is meant to take about 2 hours.
   */
  offlineRate: 0.25,

  /** Stop after this long if the run has not finished. */
  maxSeconds: 4 * 60 * 60,
} as const;
