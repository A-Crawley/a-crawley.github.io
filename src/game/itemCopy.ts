import { CONFIG, ITEMS } from "./config.ts";
import type { Currency, ItemId, Stage } from "./config.ts";
import type { Policies } from "./engine.ts";
import { formatRate } from "./format.ts";

export interface ItemCopy {
  /** The button verb. */
  action: string;
  description: string;
  /** What one unit gives the player. */
  output: string;
}

const BEDS = {
  hut: ITEMS.find((def) => def.id === "hut")?.beds ?? 0,
  house: ITEMS.find((def) => def.id === "house")?.beds ?? 0,
};

const CAPACITY = {
  granary: ITEMS.find((def) => def.id === "granary")?.stores?.amount ?? 0,
  woodshed: ITEMS.find((def) => def.id === "woodshed")?.stores?.amount ?? 0,
};

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
  hut: {
    action: "Build",
    description: "Accommodation Solutions, version one. Mostly a roof.",
    output: `room for ${BEDS.hut} more villagers`,
  },
  house: {
    action: "Build",
    description: "Residential Delivery. Has a door, and a form to fill in about the door.",
    output: `room for ${BEDS.house} more villagers`,
  },
  granary: {
    action: "Build",
    description: "Somewhere to put the food that would otherwise go to waste. Has an audit trail.",
    output: `room for ${CAPACITY.granary} more food`,
  },
  woodshed: {
    action: "Build",
    description: "A shed, for wood. The wood had been keeping its own records.",
    output: `room for ${CAPACITY.woodshed} more wood`,
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

/**
 * What the player sees when they look up, by stage. Small and slightly wrong: the village's sky has
 * a number in it that should not be there. It counts the seconds the player has been in the sim.
 */
export function sighting(stage: Stage, seconds: number): string {
  const count = Math.floor(seconds);
  if (stage === 1) {
    return `A number hangs in the sky: ${count}. Nobody else seems to see it. It goes up by one every second.`;
  }
  if (stage === 2) {
    return `The number in the sky reads ${count}. Someone has started calling it a KPI.`;
  }
  return `The number in the sky reads ${count}. It no longer looks like a count. It looks like a countdown.`;
}
