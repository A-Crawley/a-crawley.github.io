import { createGameState } from "./state.ts";
import { tabSignals, updateTabMarkers } from "./tabMarkers.ts";
import type { TabSignals } from "./tabMarkers.ts";

const calm: TabSignals = { more: 3, villageUrgent: false };

describe("tabSignals", () => {
  it("counts log lines, Sky notes and achievements together", () => {
    const state = createGameState(0);
    const before = tabSignals(state).more;
    state.sky.seen = [...state.sky.seen, "first"] as typeof state.sky.seen;
    expect(tabSignals(state).more).toBe(before + 1);
    state.food = 1;
    expect(tabSignals(state).more).toBe(before + 2);
  });

  it("calls the village urgent when it is hungry", () => {
    const state = createGameState(0);
    expect(tabSignals(state).villageUrgent).toBe(false);
    state.shortfallSeconds = 10;
    expect(tabSignals(state).villageUrgent).toBe(true);
  });
});

describe("updateTabMarkers", () => {
  it("shows nothing on first load", () => {
    const first = updateTabMarkers(null, { more: 9, villageUrgent: true }, "build");
    expect(first.marked).toEqual({ village: false, more: false });
  });

  it("returns the same object when nothing changed", () => {
    const first = updateTabMarkers(null, calm, "build");
    expect(updateTabMarkers(first, calm, "build")).toBe(first);
  });

  it("marks Log and more when something new arrives, and keeps it until opened", () => {
    let memory = updateTabMarkers(null, calm, "build");
    memory = updateTabMarkers(memory, { ...calm, more: 4 }, "build");
    expect(memory.marked.more).toBe(true);
    memory = updateTabMarkers(memory, { ...calm, more: 4 }, "village");
    expect(memory.marked.more).toBe(true);
    memory = updateTabMarkers(memory, { ...calm, more: 4 }, "more");
    expect(memory.marked.more).toBe(false);
  });

  it("does not mark a tab that is already open", () => {
    let memory = updateTabMarkers(null, calm, "more");
    memory = updateTabMarkers(memory, { ...calm, more: 5 }, "more");
    expect(memory.marked.more).toBe(false);
  });

  it("marks Village when trouble starts, clears on opening, and does not nag while it goes on", () => {
    const urgent = { ...calm, villageUrgent: true };
    let memory = updateTabMarkers(null, calm, "build");
    memory = updateTabMarkers(memory, urgent, "build");
    expect(memory.marked.village).toBe(true);
    memory = updateTabMarkers(memory, urgent, "village");
    expect(memory.marked.village).toBe(false);
    memory = updateTabMarkers(memory, urgent, "build");
    expect(memory.marked.village).toBe(false);
    memory = updateTabMarkers(memory, calm, "build");
    memory = updateTabMarkers(memory, urgent, "build");
    expect(memory.marked.village).toBe(true);
  });

  it("marks the two tabs independently", () => {
    let memory = updateTabMarkers(null, calm, "build");
    memory = updateTabMarkers(memory, { more: 4, villageUrgent: true }, "build");
    expect(memory.marked).toEqual({ village: true, more: true });
    memory = updateTabMarkers(memory, { more: 4, villageUrgent: true }, "more");
    expect(memory.marked).toEqual({ village: true, more: false });
  });
});
