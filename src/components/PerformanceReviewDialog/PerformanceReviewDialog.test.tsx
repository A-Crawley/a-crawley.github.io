import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PerformanceReviewDialog } from "./PerformanceReviewDialog";
import type { Review } from "../../game/review.ts";

const review: Review = {
  stage: 2,
  snapshot: {
    at: 1500,
    seconds: 1500,
    jobs: 40,
    villagers: 52,
    walkouts: 2,
    restDays: 3,
    temperament: "wary",
  },
};

describe("PerformanceReviewDialog", () => {
  it("renders nothing without a review", () => {
    render(<PerformanceReviewDialog review={null} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the stage's real figures and a drift line with no numbers", () => {
    render(<PerformanceReviewDialog review={review} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Performance review: Stage 1" })).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Review findings" });
    expect(list).toHaveTextContent("Time taken: 25 minutes");
    expect(list).toHaveTextContent("Villagers: 52, of whom 40 hold jobs");
    expect(list).toHaveTextContent("Walkouts: 2");
    expect(list).toHaveTextContent("Rest days: 3");
    expect(screen.getByText(/balanced/)).toBeInTheDocument();
  });

  it("says so when there were no walkouts or rest days", () => {
    render(
      <PerformanceReviewDialog
        review={{ ...review, snapshot: { ...review.snapshot, walkouts: 0, restDays: 0 } }}
        onClose={() => {}}
      />,
    );
    const list = screen.getByRole("list", { name: "Review findings" });
    expect(list).toHaveTextContent("Walkouts: none");
    expect(list).toHaveTextContent("Rest days: none taken");
  });

  it("uses the stage 2 review's own title", () => {
    render(<PerformanceReviewDialog review={{ ...review, stage: 3 }} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Performance review: Stage 2" })).toBeInTheDocument();
  });

  it("moves focus to the button, closes from it and from Escape", async () => {
    const onClose = vi.fn();
    render(<PerformanceReviewDialog review={review} onClose={onClose} />);
    const button = screen.getByRole("button", { name: "Acknowledge" });
    await waitFor(() => expect(button).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
