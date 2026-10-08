import { logLines } from "./log.ts";
import { createGameState } from "./state.ts";

const ids = (state: ReturnType<typeof createGameState>) => logLines(state).map((line) => line.id);

describe("logLines", () => {
  it("starts a new game with just the first day", () => {
    expect(ids(createGameState(0))).toEqual(["day-one"]);
  });

  it("adds lines as the village grows", () => {
    const state = createGameState(0);
    state.food = 1;
    expect(ids(state)).toEqual(["day-one", "first-food"]);
    state.food = 3;
    expect(ids(state)).toContain("look-up-locked");
    state.owned.forager = 1;
    expect(ids(state)).toContain("forager-hired");
  });

  it("names the forager by their corporate title", () => {
    const state = createGameState(0);
    state.owned.forager = 1;
    const hired = logLines(state).find((line) => line.id === "forager-hired");
    expect(hired?.text).toContain("Food Acquisition Associate");
  });

  it("keeps lines in order and never repeats one", () => {
    const state = createGameState(0);
    state.owned.forager = 12;
    const all = ids(state);
    expect(all).toEqual([
      "day-one",
      "first-food",
      "look-up-locked",
      "forager-hired",
      "five-foragers",
      "ten-foragers",
    ]);
    expect(new Set(all).size).toBe(all.length);
  });

  it("notes the first woodcutter and builder", () => {
    const state = createGameState(0);
    state.owned.woodcutter = 1;
    state.owned.builder = 1;
    const all = ids(state);
    expect(all).toContain("woodcutter-hired");
    expect(all).toContain("builder-hired");
    const text = logLines(state).map((line) => line.text);
    expect(text.some((t) => t.includes("Timber Operations Lead"))).toBe(true);
    expect(text.some((t) => t.includes("Infrastructure Delivery Partner"))).toBe(true);
  });
});
