import { CONFIG } from "./config.ts";
import type { Currency, ItemId } from "./config.ts";
import type { Policies } from "./engine.ts";
import { formatRate } from "./format.ts";

export interface ItemCopy {
  /** The button verb. */
  action: string;
  description: string;
  /** What one unit gives the player. */
  output: string;
}

/**
 * The words on the shop for each item. The numbers come from CONFIG so they can't drift. Per-unit
 * outputs are all under 100 a second, which every notation writes the same way, so they don't
 * need the player's notation.
 */
export const ITEM_COPY: Record<ItemId, ItemCopy> = {
  forager: {
    action: "Hire",
    description: "Walks to where the food is.",
    output: `${formatRate(CONFIG.output.forager)} food per second`,
  },
  woodcutter: {
    action: "Hire",
    description: "Reports to a tree. The tree has not been consulted.",
    output: `${formatRate(CONFIG.output.woodcutter)} wood per second`,
  },
  builder: {
    action: "Hire",
    description: "Delivers infrastructure. Cannot say what for.",
    output: `${formatRate(CONFIG.output.builder)} infrastructure per second`,
  },
  autoForager: {
    action: "Build",
    description: "Does a forager's job. The forager is not told what happens next.",
    output: `${formatRate(CONFIG.output.autoForager)} food per second`,
  },
  sawmillBot: {
    action: "Build",
    description: "Does a woodcutter's job, without the questions about trees.",
    output: `${formatRate(CONFIG.output.sawmillBot)} wood per second`,
  },
  builderDrone: {
    action: "Build",
    description: "Does a builder's job, and has never asked what it is building.",
    output: `${formatRate(CONFIG.output.builderDrone)} infrastructure per second`,
  },
  research: {
    action: "Fund",
    description: "Accidental Intelligence. Nobody scheduled this.",
    output: `+${Math.round(CONFIG.researchBonusPerLevel * 100)}% output on everything`,
  },
  exploit: {
    action: "Exploit",
    description: "A gap in the simulation. A rather large one.",
    output: "one step closer to the exit",
  },
};

export const CURRENCY_NAME: Record<Currency, string> = {
  food: "food",
  wood: "wood",
  infra: "infrastructure",
};

export const POLICY_LABELS: Record<keyof Policies, string> = {
  extendedShifts: "Extended Shifts",
  rationsOptimisation: "Rations Optimisation",
};
