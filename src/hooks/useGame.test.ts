import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { TICK_INTERVAL_MS, useGame } from "./useGame.ts";

const START = new Date("2026-10-08T00:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
});

function clickTimes(result: { current: ReturnType<typeof useGame> }, times: number) {
  for (let i = 0; i < times; i++) act(() => result.current.gatherFood());
}

describe("useGame", () => {
  it("starts a fresh game in stage 1 with nothing gathered", () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.state.stage).toBe(1);
    expect(result.current.state.food).toBe(0);
  });

  it("gathers food when the player clicks", () => {
    const { result } = renderHook(() => useGame());
    clickTimes(result, 3);
    expect(result.current.state.food).toBe(3);
  });

  it("lets the player buy a forager and then earns food over time", () => {
    const { result } = renderHook(() => useGame());
    clickTimes(result, 10);
    act(() => result.current.buyItem("forager"));
    expect(result.current.state.owned.forager).toBe(1);
    expect(result.current.state.food).toBe(0);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.state.food).toBeGreaterThan(3.5);
    expect(result.current.state.food).toBeLessThan(4.5);
  });

  it("refreshes the state on a timer", () => {
    const { result } = renderHook(() => useGame());
    const before = result.current.state;
    act(() => {
      vi.advanceTimersByTime(TICK_INTERVAL_MS);
    });
    expect(result.current.state).not.toBe(before);
  });

  it("catches up on a long gap as soon as a hidden tab becomes visible", () => {
    const { result } = renderHook(() => useGame());
    clickTimes(result, 10);
    act(() => result.current.buyItem("forager"));

    // The tab was in the background for an hour, so no timer ran. Only the clock moved.
    vi.setSystemTime(new Date(START.getTime() + 60 * 60 * 1000));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.state.time).toBeCloseTo(3600, 0);
    expect(result.current.state.food).toBeGreaterThan(1000);
  });

  it("toggles a policy", () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.setPolicy("extendedShifts", true));
    expect(result.current.state.policies.extendedShifts).toBe(true);
  });

  it("stops its timer when the component unmounts", () => {
    const { unmount } = renderHook(() => useGame());
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
