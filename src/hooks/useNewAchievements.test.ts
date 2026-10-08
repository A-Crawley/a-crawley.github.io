import { act, renderHook } from "@testing-library/react";
import type { AchievementId } from "../game/achievements.ts";
import { useNewAchievements } from "./useNewAchievements.ts";

describe("useNewAchievements", () => {
  it("does not announce what was already earned when the page loaded", () => {
    const { result } = renderHook(() => useNewAchievements(["first-hire"], false));
    expect(result.current.current).toBeNull();
  });

  it("announces one earned while the page is open", () => {
    const { result, rerender } = renderHook(
      ({ earned }: { earned: AchievementId[] }) => useNewAchievements(earned, false),
      { initialProps: { earned: ["first-hire"] as AchievementId[] } },
    );
    rerender({ earned: ["first-hire", "five-foragers"] });
    expect(result.current.current).toBe("five-foragers");
  });

  it("announces several one at a time", () => {
    const { result, rerender } = renderHook(
      ({ earned }: { earned: AchievementId[] }) => useNewAchievements(earned, false),
      { initialProps: { earned: [] as AchievementId[] } },
    );
    rerender({ earned: ["first-hire", "five-foragers"] });
    expect(result.current.current).toBe("first-hire");
    act(() => result.current.dismiss());
    expect(result.current.current).toBe("five-foragers");
    act(() => result.current.dismiss());
    expect(result.current.current).toBeNull();
  });

  it("stays quiet while quiet, and does not announce those later", () => {
    const { result, rerender } = renderHook(
      ({ earned, quiet }: { earned: AchievementId[]; quiet: boolean }) =>
        useNewAchievements(earned, quiet),
      { initialProps: { earned: [] as AchievementId[], quiet: true } },
    );
    rerender({ earned: ["first-hire"], quiet: true });
    expect(result.current.current).toBeNull();
    rerender({ earned: ["first-hire"], quiet: false });
    expect(result.current.current).toBeNull();
  });
});
