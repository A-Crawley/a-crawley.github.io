/**
 * Prints a timeline for each play strategy in the linked village model (GAME-22).
 * Run with: npm run sim:village
 */
import { STRATEGIES } from "./player.ts";
import { runVillageSimulation } from "./village.ts";

function minutes(seconds: number): string {
  return `${(seconds / 60).toFixed(1)} min`;
}

for (const strategy of STRATEGIES) {
  const r = runVillageSimulation(strategy);
  console.log(`\n=== ${r.strategy} (with a village) ===`);
  console.log(
    `${r.finished ? "Finished" : "DID NOT FINISH"} in ${minutes(r.totalSeconds)}; stages end at ` +
      `${r.stageEnds.map(minutes).join(", ")}. Peak population ${r.peakPopulation}.`,
  );
  console.log(
    `  Housing bought: ${r.housingBought.hut} huts, ${r.housingBought.house} houses. ` +
      `Waited for villagers ${r.waitingForVillagersSeconds}s (${r.waitingForBedsSeconds}s with every bed full). ` +
      `Hungry ${r.hungrySeconds}s. Walkouts ${r.walkouts}. Conquest odds ${(r.conquestOdds * 100).toFixed(0)}%.`,
  );
}
