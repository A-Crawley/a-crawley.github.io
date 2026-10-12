import { act, renderHook } from "@testing-library/react";
import type { MilestonesState } from "../game/milestones.ts";
import { PULSE_MS, useMilestonePulse } from "./useMilestonePulse.ts";

const none: MilestonesState = { fired: [], quiet: [] };

function setup(initial: MilestonesState, quiet = false) {
  return renderHook(({ m, q }: { m: MilestonesState; q: boolean }) => useMilestonePulse(m, q), {
    initialProps: { m: initial, q: quiet },
  });
}

describe("useMilestonePulse", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("does not pulse what was already reached when the page loaded", () => {
    const { result } = setup({ fired: ["forager-25"], quiet: [] });
    expect(result.current.size).toBe(0);
  });

  it("pulses the row of a milestone reached while the page is open, then stops", () => {
    const { result, rerender } = setup(none);
    rerender({ m: { fired: ["forager-25"], quiet: [] }, q: false });
    expect([...result.current]).toEqual(["forager"]);
    act(() => {
      vi.advanceTimersByTime(PULSE_MS + 10);
    });
    expect(result.current.size).toBe(0);
  });

  it("pulses each row once when a bulk purchase passes several milestones", () => {
    const { result, rerender } = setup(none);
    rerender({ m: { fired: ["forager-25", "forager-50", "autoForager-5"], quiet: [] }, q: false });
    expect([...result.current].sort()).toEqual(["autoForager", "forager"]);
  });

  it("does not pulse quiet milestones, or anything while the welcome-back dialog is up", () => {
    const { result, rerender } = setup(none);
    rerender({ m: { fired: ["forager-25"], quiet: ["forager-25"] }, q: false });
    expect(result.current.size).toBe(0);
    rerender({ m: { fired: ["forager-25", "woodcutter-25"], quiet: ["forager-25"] }, q: true });
    expect(result.current.size).toBe(0);
  });
});
