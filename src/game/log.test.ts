import { logLines } from "./log.ts";
import { withSettled } from "./settle.ts";
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

  it("adds a line for each reveal, in the order they happened", () => {
    const state = createGameState(0);
    state.unlocked = ["morale", "lookUp", "lookedUp"];
    const reveals = logLines(state).filter((line) => line.id.startsWith("unlock:"));
    expect(reveals.map((line) => line.id)).toEqual([
      "unlock:morale",
      "unlock:lookUp",
      "unlock:lookedUp",
    ]);
  });

  it("stays quiet about unlocks that have no line of their own", () => {
    const state = createGameState(0);
    state.unlocked = ["item:forager", "wood"];
    expect(ids(state)).toEqual(["day-one"]);
  });

  it("announces the second and third stage", () => {
    const state = createGameState(0);
    state.unlocked = ["stage2", "policy:extendedShifts", "stage3"];
    const text = logLines(state).map((line) => line.text);
    expect(text.some((t) => t.startsWith("Machines arrive"))).toBe(true);
    expect(text.some((t) => t.includes("seam"))).toBe(true);
  });

  it("warns when the village goes hungry, and again as it gets worse", () => {
    const state = createGameState(0);
    state.shortfallSeconds = 2;
    expect(ids(state)).not.toContain("hungry");
    state.shortfallSeconds = 6;
    expect(ids(state)).toContain("hungry");
    expect(ids(state)).not.toContain("hungry-morale");
    state.shortfallSeconds = 25;
    expect(ids(state)).toContain("hungry-morale");
    expect(ids(state)).not.toContain("hungry-leaving");
    state.shortfallSeconds = 55;
    expect(ids(state)).toContain("hungry-leaving");
  });

  it("stops warning once the village is fed again", () => {
    const state = createGameState(0);
    state.shortfallSeconds = 30;
    state.shortfallSeconds = 0;
    expect(ids(state)).not.toContain("hungry");
  });

  it("explains rations the first time anyone is hired", () => {
    const state = withSettled(createGameState(0));
    expect(logLines(state).some((line) => /eating was voluntary/.test(line.text))).toBe(false);
    state.owned.forager = 1;
    expect(
      logLines(withSettled(state)).some((line) => /eating was voluntary/.test(line.text)),
    ).toBe(true);
  });
});

describe("logLines: village events", () => {
  it("records each answered event in order, saying when nobody answered", () => {
    const state = createGameState(0);
    state.events.resolved = [
      { id: "frost", choice: "fires", auto: false },
      { id: "leanWeek", choice: "cut", auto: true },
    ];
    const lines = logLines(state).filter((line) => line.id.startsWith("event:"));
    expect(lines.map((line) => line.id)).toEqual(["event:frost", "event:leanWeek"]);
    expect(lines[0].text).toContain("shared fires");
    expect(lines[0].text).not.toContain("Nobody answered");
    expect(lines[1].text).toContain("Nobody answered, so it was decided for them.");
  });

  it("says nothing about an event that is still waiting", () => {
    const state = createGameState(0);
    state.events.pending = { id: "frost", since: 0 };
    expect(ids(state).some((id) => id.startsWith("event:"))).toBe(false);
  });
});
