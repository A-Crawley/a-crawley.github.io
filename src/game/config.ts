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
  | "exploit";

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
];

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
  },

  /** Policies. Drift is measured in raw points; positive is compassion. */
  policies: {
    extendedShifts: { outputFactor: 1.35, moraleDrainPerSecond: 0.6, driftPerSecond: -1 },
    rationsOptimisation: {
      foodCostFactor: 0.8,
      moraleDrainPerSecond: 0.3,
      driftPerSecond: -0.5,
    },
    restDay: { duration: 30, moraleGain: 30, cooldown: 150, drift: 200 },
  },

  /** Raw drift at which the compassion index reaches its extremes (0 or 1). */
  driftScale: 16000,
  /** Chance of the Conquest ending: base + span × compassion index (a mirror rival is gentler when you were). */
  conquestOdds: { base: 0.15, span: 0.7 },

  /** Stop after this long if the run has not finished. */
  maxSeconds: 4 * 60 * 60,
} as const;
