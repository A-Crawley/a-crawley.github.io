import type { Currency, Stage } from "./config.ts";
import type { SimState } from "./engine.ts";

/**
 * Upgrades (GAME-30): one-off purchases that make something better. Each is bought once. The
 * numbers here are the whole effect; the engine reads them through `hasUpgrade` and these
 * constants, so tuning is a one-file change.
 */

export type UpgradeId =
  | "betterBaskets"
  | "sharperAxes"
  | "sharedSpreadsheet"
  | "sturdierHuts"
  | "rootCellar"
  | "maintenanceContract"
  | "preventiveMaintenance"
  | "onboardingDeck";

export const UPGRADE_EFFECTS = {
  /** Forager output multiplier. */
  betterBaskets: 1.15,
  /** Woodcutter output multiplier. */
  sharperAxes: 1.15,
  /** Builder price multiplier. */
  sharedSpreadsheet: 0.8,
  /** Extra beds in each hut. */
  sturdierHuts: 2,
  /** Extra food the stores hold. */
  rootCellar: 400,
  /** Machine price multiplier. */
  maintenanceContract: 0.85,
  /** Machine output multiplier. */
  preventiveMaintenance: 1.05,
  /** Retraining price multiplier. */
  onboardingDeck: 0.6,
} as const;

export interface UpgradeDef {
  id: UpgradeId;
  label: string;
  description: string;
  /** The effect in numbers, as shown to the player. */
  effect: string;
  currency: Exclude<Currency, "infra">;
  cost: number;
  /** First stage in which it is offered. */
  firstStage: Stage;
  /** Last stage in which it is offered. */
  lastStage: Stage;
  /** Whether what the upgrade improves has been met yet. */
  requires: (state: SimState) => boolean;
}

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: "betterBaskets",
    label: "Better baskets",
    description: "Baskets with a second handle. Both are used.",
    effect: "Foragers make 15% more",
    currency: "food",
    cost: 150,
    firstStage: 1,
    lastStage: 2,
    requires: (s) => s.owned.forager >= 3,
  },
  {
    id: "sharperAxes",
    label: "Sharper axes",
    description: "The old ones were described as 'motivational'.",
    effect: "Woodcutters make 15% more",
    currency: "food",
    cost: 400,
    firstStage: 1,
    lastStage: 2,
    requires: (s) => s.owned.woodcutter >= 2,
  },
  {
    id: "sharedSpreadsheet",
    label: "Shared spreadsheet",
    description: "Everyone can see what builders cost. Nobody can edit the column.",
    effect: "Builders cost 20% less",
    currency: "wood",
    cost: 100,
    firstStage: 1,
    lastStage: 2,
    requires: (s) => s.owned.builder >= 1 || s.wood >= 60,
  },
  {
    id: "sturdierHuts",
    label: "Sturdier huts",
    description: "Walls, in addition to the roof.",
    effect: "Each hut sleeps 2 more",
    currency: "wood",
    cost: 150,
    firstStage: 1,
    lastStage: 2,
    requires: (s) => s.owned.hut >= 2,
  },
  {
    id: "rootCellar",
    label: "Root cellar",
    // Past stage 1 the stores already hold more than the dearest purchase, so a cellar would do nothing.
    description: "A hole, but one with a budget.",
    effect: "Stores hold 400 more food",
    currency: "wood",
    cost: 120,
    firstStage: 1,
    lastStage: 1,
    requires: (s) => s.owned.granary >= 1 || s.food >= 200,
  },
  {
    id: "maintenanceContract",
    label: "Maintenance contract",
    description: "The machines are now somebody else's problem, at a discount.",
    effect: "Machines cost 15% less",
    currency: "wood",
    cost: 1500,
    firstStage: 2,
    lastStage: 2,
    requires: (s) => s.owned.autoForager + s.owned.sawmillBot + s.owned.builderDrone >= 1,
  },
  {
    id: "preventiveMaintenance",
    label: "Preventive maintenance",
    description: "Fixes things before they break, which is when it gets the credit.",
    effect: "Machines make 5% more",
    currency: "wood",
    cost: 2500,
    firstStage: 2,
    lastStage: 2,
    requires: (s) => s.owned.autoForager + s.owned.sawmillBot + s.owned.builderDrone >= 3,
  },
  {
    id: "onboardingDeck",
    label: "Onboarding deck",
    description: "Forty slides on the machines. The machines have read them.",
    effect: "Retraining costs 40% less",
    currency: "food",
    cost: 1000,
    firstStage: 2,
    lastStage: 2,
    requires: (s) => s.owned.autoForager + s.owned.sawmillBot + s.owned.builderDrone >= 1,
  },
];

export function upgradeDef(id: UpgradeId): UpgradeDef {
  const def = UPGRADES.find((upgrade) => upgrade.id === id);
  if (!def) throw new Error(`Unknown upgrade: ${id}`);
  return def;
}

const UPGRADE_IDS: ReadonlySet<string> = new Set(UPGRADES.map((upgrade) => upgrade.id));

export function isUpgradeId(value: unknown): value is UpgradeId {
  return typeof value === "string" && UPGRADE_IDS.has(value);
}

export function hasUpgrade(
  state: { readonly upgrades: readonly UpgradeId[] },
  id: UpgradeId,
): boolean {
  return state.upgrades.includes(id);
}

/** Whether the upgrade can be bought now: not owned, in its stage, and what it improves exists. */
export function isUpgradeAvailable(state: SimState, def: UpgradeDef): boolean {
  return (
    !hasUpgrade(state, def.id) &&
    state.stage >= def.firstStage &&
    state.stage <= def.lastStage &&
    def.requires(state)
  );
}
