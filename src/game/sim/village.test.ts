import { CONFIG } from "../config.ts";
import { STRATEGIES } from "./player.ts";
import {
  chooseHousing,
  createVillage,
  idleCount,
  runVillageSimulation,
  VILLAGE,
} from "./village.ts";
import type { VillageResult } from "./village.ts";

describe("village model", () => {
  it("starts with a few idle villagers and room to grow", () => {
    const village = createVillage();
    expect(village.population).toBe(VILLAGE.startPopulation);
    expect(idleCount(village)).toBe(VILLAGE.startPopulation);
    expect(village.beds).toBeGreaterThan(village.population);
  });

  it("offers huts first, and houses only once the village is big enough", () => {
    const village = createVillage();
    expect(chooseHousing(village)?.id).toBe("hut");
    village.population = 200;
    village.housingOwned.hut = 20;
    expect(chooseHousing(village)?.id).toBe("house");
  });

  // If a villager ate more than a forager grows, every hire would make the village poorer and the
  // early game would starve to a halt (found by raising upkeep to 0.6 in the simulation).
  it("keeps upkeep below what one forager produces", () => {
    expect(VILLAGE.upkeepPerVillager).toBeLessThan(CONFIG.output.forager);
  });
});

describe("full playthrough with a village", () => {
  const results: Record<string, VillageResult> = {};

  beforeAll(() => {
    for (const strategy of STRATEGIES) results[strategy.name] = runVillageSimulation(strategy);
  });

  it("finishes every strategy close to the 2 hour target", () => {
    for (const result of Object.values(results)) {
      expect(result.finished).toBe(true);
      expect(result.totalSeconds / 60).toBeGreaterThan(105);
      expect(result.totalSeconds / 60).toBeLessThan(140);
    }
  });

  it("never lets a healthy village go hungry", () => {
    for (const result of Object.values(results)) expect(result.hungrySeconds).toBe(0);
  });

  it("reaches a village of a few hundred in stage 1 and stops growing after", () => {
    for (const result of Object.values(results)) {
      expect(result.peakPopulation).toBeGreaterThan(100);
      expect(result.peakPopulation).toBeLessThan(300);
      expect(result.populationAtStageEnd[0]).toBe(result.peakPopulation);
    }
  });

  it("builds housing in both tiers", () => {
    for (const result of Object.values(results)) {
      expect(result.housingBought.hut).toBeGreaterThan(0);
      expect(result.housingBought.house).toBeGreaterThan(0);
    }
  });

  // The cap should be felt without turning into a stall: a few minutes of waiting over a whole run.
  it("keeps time spent waiting for villagers or beds modest", () => {
    for (const result of Object.values(results)) {
      expect(result.waitingForVillagersSeconds).toBeLessThan(10 * 60);
      expect(result.waitingForBedsSeconds).toBeGreaterThan(0);
      expect(result.waitingForBedsSeconds).toBeLessThan(5 * 60);
    }
  });

  it("keeps compassion rewarded and efficiency costly", () => {
    expect(results.compassionate.conquestOdds).toBeGreaterThan(results.balanced.conquestOdds);
    expect(results.balanced.conquestOdds).toBeGreaterThan(results.efficient.conquestOdds);
    expect(results.efficient.walkouts).toBeGreaterThan(0);
  });
});
