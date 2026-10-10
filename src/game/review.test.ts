import { dismissReview, pendingReview, recordReviews } from "./review.ts";
import { reviewCopy } from "./reviewCopy.ts";
import { settle } from "./settle.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";

function inStage(stage: 1 | 2 | 3, time = 1500): GameState {
  const state = createGameState(0);
  state.stage = stage;
  state.time = time;
  state.owned.forager = 20;
  state.owned.woodcutter = 10;
  state.owned.builder = 5;
  state.population = 60;
  return state;
}

describe("stage reviews: recording", () => {
  it("has nothing to show in stage 1", () => {
    const state = inStage(1);
    recordReviews(state);
    expect(pendingReview(state)).toBeNull();
  });

  it("takes a snapshot of the stage just left, from real state", () => {
    const state = inStage(2, 1500);
    state.walkouts = 3;
    state.restDays = 4;
    state.drift = -5000;
    settle(state);
    const review = pendingReview(state);
    expect(review?.stage).toBe(2);
    expect(review?.snapshot).toMatchObject({
      at: 1500,
      seconds: 1500,
      jobs: 35,
      villagers: 60,
      walkouts: 3,
      restDays: 4,
      temperament: "ruthless",
    });
  });

  it("times stage 2 from the moment it began", () => {
    const state = inStage(2, 1500);
    settle(state);
    state.stage = 3;
    state.time = 4000;
    settle(state);
    const next = dismissReview(state, 2);
    expect(next.reviews.entries[3]?.seconds).toBe(2500);
  });

  it("does not take the snapshot twice", () => {
    const state = inStage(2, 1500);
    settle(state);
    state.time = 2000;
    settle(state);
    expect(state.reviews.entries[2]?.at).toBe(1500);
  });
});

describe("stage reviews: showing once", () => {
  it("shows stage 2 first, then stage 3 once both have been entered", () => {
    const state = inStage(3, 3000);
    settle(state);
    expect(pendingReview(state)?.stage).toBe(2);
    const afterFirst = dismissReview(state, 2);
    expect(pendingReview(afterFirst)?.stage).toBe(3);
    const afterSecond = dismissReview(afterFirst, 3);
    expect(pendingReview(afterSecond)).toBeNull();
  });

  it("never shows a dismissed review again, even after settling", () => {
    const state = inStage(2);
    settle(state);
    const next = dismissReview(state, 2);
    settle(next);
    expect(pendingReview(next)).toBeNull();
    expect(next.reviews.seen).toEqual([2]);
  });

  it("does not change the state when there is nothing to dismiss", () => {
    const state = inStage(1);
    expect(dismissReview(state, 2)).toBe(state);
    const settled = inStage(2);
    settle(settled);
    const once = dismissReview(settled, 2);
    expect(dismissReview(once, 2)).toBe(once);
  });

  it("does not change the input when dismissing", () => {
    const state = inStage(2);
    settle(state);
    dismissReview(state, 2);
    expect(state.reviews.seen).toEqual([]);
  });
});

describe("stage reviews: copy", () => {
  function copyFor(change: (s: GameState) => void) {
    const state = inStage(2, 1500);
    change(state);
    settle(state);
    const review = pendingReview(state);
    if (!review) throw new Error("no review");
    return reviewCopy(review);
  }

  it("reports zero walkouts and zero rest days in words", () => {
    const copy = copyFor(() => {});
    expect(copy.facts.join("\n")).toMatch(/Walkouts: none/);
    expect(copy.facts.join("\n")).toMatch(/Rest days: none taken/);
  });

  it("reports counts when there were walkouts and rest days", () => {
    const copy = copyFor((s) => {
      s.walkouts = 1;
      s.restDays = 2;
    });
    expect(copy.facts.join("\n")).toMatch(/Walkouts: 1\./);
    expect(copy.facts.join("\n")).toMatch(/Rest days: 2\./);
  });

  it("describes the drift in words, with no number from it", () => {
    for (const drift of [-5000, 0, 5000]) {
      const copy = copyFor((s) => (s.drift = drift));
      expect(copy.drift).not.toMatch(/\d/);
      expect(copy.drift).not.toContain(String(Math.abs(drift)));
    }
    const kinds = new Set([-5000, 0, 5000].map((drift) => copyFor((s) => (s.drift = drift)).drift));
    expect(kinds.size).toBe(3);
  });

  it("uses a different title for each stage", () => {
    const state = inStage(3, 3000);
    settle(state);
    const second = reviewCopy(pendingReview(state)!);
    const afterFirst = dismissReview(state, 2);
    const third = reviewCopy(pendingReview(afterFirst)!);
    expect(second.title).not.toBe(third.title);
  });
});
