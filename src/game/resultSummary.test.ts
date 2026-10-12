import { resultSummary } from "./resultSummary.ts";
import { createGameState } from "./state.ts";
import { VERDICT } from "./endingCopy.ts";

function finished(ending: "conquest" | "apocalypse") {
  const state = createGameState(0);
  state.stage = 3;
  state.owned.exploit = 22;
  state.ending = ending;
  return state;
}

describe("resultSummary", () => {
  it("is null while the run has no ending", () => {
    expect(resultSummary(createGameState(0))).toBeNull();
  });

  it("names each ending", () => {
    expect(resultSummary(finished("conquest"))?.split("\n")[0]).toBe("Look Up: Conquest");
    expect(resultSummary(finished("apocalypse"))?.split("\n")[0]).toBe("Look Up: Apocalypse");
  });

  it("reports time, villagers, machines and walkouts", () => {
    const state = finished("conquest");
    state.time = 118 * 60;
    state.owned.forager = 40;
    state.owned.woodcutter = 30;
    state.owned.builder = 14;
    state.owned.autoForager = 8;
    state.owned.sawmillBot = 4;
    state.walkouts = 3;
    expect(resultSummary(state)?.split("\n")[1]).toBe(
      "1 hour 58 minutes, 84 villagers, 12 machines, 3 walkouts.",
    );
  });

  it("handles none and one", () => {
    const state = finished("apocalypse");
    state.time = 30;
    state.owned.forager = 1;
    state.walkouts = 1;
    expect(resultSummary(state)?.split("\n")[1]).toBe(
      "less than a minute, 1 villager, no machines, 1 walkout.",
    );
    state.owned.forager = 0;
    state.walkouts = 0;
    expect(resultSummary(state)?.split("\n")[1]).toBe(
      "less than a minute, no villagers, no machines, no walkouts.",
    );
  });

  it("ends with the dry line for how the run read, from the drift", () => {
    const gentle = finished("conquest");
    gentle.drift = 100000;
    const ruthless = finished("conquest");
    ruthless.drift = -100000;
    expect(resultSummary(gentle)?.split("\n")[2]).toBe(VERDICT.gentle);
    expect(resultSummary(ruthless)?.split("\n")[2]).toBe(VERDICT.ruthless);
  });

  it("carries no numbers from the hidden economy, and no link", () => {
    const text = resultSummary(finished("conquest")) ?? "";
    expect(text).not.toMatch(/drift|odds|http|\.com/i);
    expect(text.split("\n")).toHaveLength(3);
  });
});
