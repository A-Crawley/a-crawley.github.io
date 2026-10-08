import { render, screen } from "@testing-library/react";
import { ProjectProgress } from "./ProjectProgress";

describe("ProjectProgress", () => {
  it("shows the name, the percentage and the caption", () => {
    render(<ProjectProgress label="Project Horizon" fraction={0.426} caption="On schedule." />);
    expect(screen.getByRole("heading", { name: "Project Horizon" })).toBeInTheDocument();
    expect(screen.getByText("42% complete")).toBeInTheDocument();
    expect(screen.getByText("On schedule.")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Project Horizon progress" })).toHaveAttribute(
      "aria-valuenow",
      "42",
    );
  });

  it("works without a caption", () => {
    render(<ProjectProgress label="Research" fraction={0} />);
    expect(screen.getByText("0% complete")).toBeInTheDocument();
  });

  it("keeps the bar between 0 and 100", () => {
    const { rerender } = render(<ProjectProgress label="Research" fraction={3} />);
    expect(screen.getByText("100% complete")).toBeInTheDocument();
    rerender(<ProjectProgress label="Research" fraction={-1} />);
    expect(screen.getByText("0% complete")).toBeInTheDocument();
    rerender(<ProjectProgress label="Research" fraction={Number.NaN} />);
    expect(screen.getByText("0% complete")).toBeInTheDocument();
  });
});
