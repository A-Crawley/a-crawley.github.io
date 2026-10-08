import { render, screen } from "@testing-library/react";
import { NotationProvider } from "../NotationProvider";
import { ResourceCounter } from "./ResourceCounter";

describe("ResourceCounter", () => {
  it("shows the label and a rounded-down amount", () => {
    render(<ResourceCounter label="Food" value={12.9} />);
    expect(screen.getByRole("region", { name: "Food" })).toHaveTextContent("12");
  });

  it("shows the rate when there is one", () => {
    render(<ResourceCounter label="Food" value={5} perSecond={1.2} />);
    expect(screen.getByText("+1.2 per second")).toBeInTheDocument();
  });

  it("says so when nothing is arriving automatically", () => {
    render(<ResourceCounter label="Food" value={5} perSecond={0} />);
    expect(screen.getByText("Nothing arrives by itself yet")).toBeInTheDocument();
  });

  it("hides the rate line when no rate is given", () => {
    render(<ResourceCounter label="Food" value={5} />);
    expect(screen.queryByText(/per second/)).not.toBeInTheDocument();
  });

  it("works in its small size too", () => {
    render(<ResourceCounter label="Wood" value={42} perSecond={0.5} size="small" />);
    expect(screen.getByRole("region", { name: "Wood" })).toHaveTextContent("42");
    expect(screen.getByText("+0.5 per second")).toBeInTheDocument();
  });

  it("writes the amount and rate in the chosen notation", () => {
    render(
      <NotationProvider notation="scientific">
        <ResourceCounter label="Food" value={1_234_567} perSecond={12_500} />
      </NotationProvider>,
    );
    const region = screen.getByRole("region", { name: "Food" });
    expect(region).toHaveTextContent("1.23e6");
    expect(region).toHaveTextContent("+1.25e4 per second");
  });
});
