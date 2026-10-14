import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoadNotTaken } from "./RoadNotTaken";

describe("RoadNotTaken", () => {
  it("hides the other ending until asked", async () => {
    render(<RoadNotTaken title="Apocalypse" opening="It does not give way." />);
    const toggle = screen.getByRole("button", { name: "Show the other ending" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/It does not give way/)).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(screen.getByText(/It does not give way/)).toBeInTheDocument();
    expect(screen.getByText("Apocalypse:")).toBeInTheDocument();
    expect(screen.getByText(/Start a new game if you want/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide the other ending" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("can be hidden again", async () => {
    render(<RoadNotTaken title="Apocalypse" opening="It does not give way." />);
    await userEvent.click(screen.getByRole("button", { name: "Show the other ending" }));
    await userEvent.click(screen.getByRole("button", { name: "Hide the other ending" }));
    expect(screen.queryByText(/It does not give way/)).not.toBeInTheDocument();
  });
});
