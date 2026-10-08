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

  it("shows what is left after the villagers have eaten", () => {
    render(<ResourceCounter label="Food" value={5} perSecond={3} upkeep={1} />);
    expect(screen.getByText("+2.0 per second after villagers eat 1.0")).toBeInTheDocument();
  });

  it("says the stock is falling when the villagers eat more than is made", () => {
    render(<ResourceCounter label="Food" value={5} perSecond={1} upkeep={2.5} />);
    expect(screen.getByText("Falling by 1.5 per second: villagers eat 2.5")).toBeInTheDocument();
  });

  it("says when food made and eaten balance", () => {
    render(<ResourceCounter label="Food" value={5} perSecond={2} upkeep={2} />);
    expect(screen.getByText("Holding steady: villagers eat 2.0")).toBeInTheDocument();
  });

  it("shows how much the store holds, and says when it is full", () => {
    const { rerender } = render(<ResourceCounter label="Food" value={40} capacity={300} />);
    expect(screen.getByText("Store holds up to 300")).toBeInTheDocument();
    rerender(<ResourceCounter label="Food" value={300} capacity={300} />);
    expect(screen.getByText("Store full (300): anything more is lost")).toBeInTheDocument();
  });

  it("shows no store line when there is no ceiling", () => {
    render(<ResourceCounter label="Food" value={40} />);
    expect(screen.queryByText(/Store/)).not.toBeInTheDocument();
  });
});
