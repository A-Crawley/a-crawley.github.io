/**
 * Prints a timeline for each play strategy. Run with: npm run sim
 * Uses Node's built-in TypeScript support, so imports carry .ts extensions.
 */
import { ITEMS } from "./config.ts";
import { runSimulation, STRATEGIES } from "./player.ts";
import type { RunResult } from "./player.ts";

function minutes(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "n/a";
  const m = seconds / 60;
  return `${m.toFixed(1)} min`;
}

function label(id: string): string {
  return ITEMS.find((item) => item.id === id)?.label ?? id;
}

function print(result: RunResult, describe: string): void {
  console.log(`\n=== ${result.strategy} ===`);
  console.log(describe);
  console.log(
    `${result.finished ? "Finished" : "DID NOT FINISH"} in ${minutes(result.totalSeconds)}. ` +
      `Walkouts: ${result.walkouts}. Rest days: ${result.restDays}. End morale: ${result.endMorale.toFixed(0)}.`,
  );
  console.log(
    `Drift ${result.drift.toFixed(0)} (compassion ${(result.compassion * 100).toFixed(0)}%), ` +
      `Conquest odds ${(result.conquestOdds * 100).toFixed(0)}%.`,
  );
  for (const stage of result.stages) {
    const length = stage.endedAt === null ? null : stage.endedAt - stage.startedAt;
    console.log(
      `  Stage ${stage.stage}: ${minutes(stage.startedAt)} to ${minutes(stage.endedAt)} ` +
        `(${minutes(length)}), ${stage.purchases} purchases, longest gap between purchases ` +
        `${stage.longestGapSeconds.toFixed(0)}s` +
        (stage.endRates
          ? `; end rates food ${stage.endRates.food.toFixed(0)}/s, wood ${stage.endRates.wood.toFixed(0)}/s, infra ${stage.endRates.infra.toFixed(1)}/s`
          : ""),
    );
  }
  const first = Object.entries(result.firstPurchase)
    .map(([id, time]) => `${label(id)} ${minutes(time)}`)
    .join("; ");
  console.log(`  First purchases: ${first}`);
  if (result.neverBought.length > 0) {
    console.log(`  Never bought: ${result.neverBought.map(label).join(", ")}`);
  }
}

for (const strategy of STRATEGIES) {
  print(runSimulation(strategy), strategy.describe);
}
