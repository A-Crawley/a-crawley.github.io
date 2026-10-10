import { render, screen } from "@testing-library/react";
import { StageTitle } from "./StageTitle";

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  }));
}

afterEach(() => {
  // @ts-expect-error jsdom has no matchMedia; remove what the test added.
  delete window.matchMedia;
});

describe("StageTitle", () => {
  it("is a plain heading before stage 3", () => {
    mockReducedMotion(false);
    for (const stage of [1, 2] as const) {
      const { unmount } = render(<StageTitle stage={stage}>Look Up</StageTitle>);
      expect(screen.getByRole("heading", { name: "Look Up" })).toHaveAttribute(
        "data-effect",
        "none",
      );
      unmount();
    }
  });

  it("flickers from stage 3", () => {
    mockReducedMotion(false);
    render(<StageTitle stage={3}>Look Up</StageTitle>);
    const heading = screen.getByRole("heading", { name: "Look Up" });
    expect(heading).toHaveAttribute("data-effect", "flicker");
    expect(heading).toHaveStyle({ textShadow: "1px 0 rgba(180, 0, 60, 0.35)" });
  });

  it("holds still, with a static change, under reduced motion", () => {
    mockReducedMotion(true);
    render(<StageTitle stage={3}>Look Up</StageTitle>);
    const heading = screen.getByRole("heading", { name: "Look Up" });
    expect(heading).toHaveAttribute("data-effect", "static");
    expect(heading).toHaveStyle({ textShadow: "2px 0 rgba(180, 0, 60, 0.35)" });
  });
});
