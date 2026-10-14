import { render, screen } from "@testing-library/react";
import { TargetStatus } from "./TargetStatus";

describe("TargetStatus", () => {
  it("names the goal, where the village is, and the time left", () => {
    render(<TargetStatus goal={16} current={14} secondsLeft={197} />);
    expect(screen.getByRole("heading", { name: "Quarterly target" })).toBeInTheDocument();
    // 197 seconds rounds up to 200, so the line does not flicker.
    expect(screen.getByText(/Reach research level 16 in 3m 20s/)).toBeInTheDocument();
    expect(screen.getByText(/The village is at level 14/)).toBeInTheDocument();
  });

  it("says plainly that missing it costs nothing more", () => {
    render(<TargetStatus goal={16} current={14} secondsLeft={60} />);
    expect(screen.getByText("Missing it costs nothing more.")).toBeInTheDocument();
  });
});
