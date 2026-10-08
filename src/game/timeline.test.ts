import { buyItem, gatherFood } from "./actions.ts";
import { CONFIG } from "./config.ts";
import { canAfford } from "./engine.ts";
import { chooseNext, runSimulation, STRATEGIES } from "./sim/player.ts";
import { createGameState } from "./state.ts";
import { tick } from "./tick.ts";

/**
 * The prototype (GAME-6) models a player who clicks CONFIG.clicksPerSecond times a second. This
 * replays the same greedy player through the real game API (`tick`, `gatherFood`, `buyItem`) and
 * checks that the first stage takes the same time, so the real engine and the prototype agree.
 */
describe("first stage timeline", () => {
  const strategy = STRATEGIES.find((s) => s.name === "balanced")!;

  function playFirstStage(): { seconds: number; purchases: number } {
    let now = 1_700_000_000_000;
    let state = createGameState(now);
    let purchases = 0;
    while (state.stage === 1 && state.time < CONFIG.maxSeconds) {
      strategy.decide(state);
      now += 1000;
      state = tick(state, now);
      for (let i = 0; i < CONFIG.clicksPerSecond; i++) state = gatherFood(state);
      for (;;) {
        const target = chooseNext(state).item;
        if (!target || !canAfford(state, target)) break;
        const next = buyItem(state, target.id);
        if (next === state) break;
        state = next;
        purchases += 1;
        if (state.stage !== 1) break; // anything bought after this belongs to stage 2
      }
    }
    return { seconds: state.time, purchases };
  }

  it("ends stage 1 when the prototype does, within 2%", () => {
    const prototype = runSimulation(strategy).stages[0];
    const real = playFirstStage();
    expect(prototype.endedAt).not.toBeNull();
    expect(Math.abs(real.seconds - prototype.endedAt!) / prototype.endedAt!).toBeLessThan(0.02);
  });

  it("makes about as many purchases as the prototype", () => {
    const prototype = runSimulation(strategy).stages[0];
    const real = playFirstStage();
    expect(Math.abs(real.purchases - prototype.purchases)).toBeLessThanOrEqual(
      Math.ceil(prototype.purchases * 0.03),
    );
  });
});
