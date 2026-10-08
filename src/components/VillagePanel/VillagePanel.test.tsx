import { render, screen, within } from "@testing-library/react";
import { VillagePanel } from "./VillagePanel";
import type { VillagePanelProps } from "./VillagePanel";

const base: VillagePanelProps = {
  population: 20,
  beds: 30,
  unemployed: 4,
  foodMade: 10,
  foodEaten: 2,
  hungry: false,
};

function row(label: string) {
  const term = screen.getByText(label, { selector: "dt" });
  return term.parentElement as HTMLElement;
}

describe("VillagePanel", () => {
  it("is a labelled section with the headline numbers", () => {
    render(<VillagePanel {...base} />);
    expect(screen.getByRole("region", { name: "Village" })).toBeInTheDocument();
    expect(within(row("Villagers")).getByText("20")).toBeInTheDocument();
    expect(within(row("Beds")).getByText("30")).toBeInTheDocument();
  });

  it("shows how full the beds are, in words as well as a bar", () => {
    render(<VillagePanel {...base} />);
    expect(screen.getByRole("progressbar", { name: "Beds filled" })).toHaveAttribute(
      "aria-valuetext",
      "20 villagers in 30 beds",
    );
    expect(within(row("Beds")).getByText("10 free")).toBeInTheDocument();
  });

  it("says when the beds are full and what to do", () => {
    render(<VillagePanel {...base} population={30} />);
    expect(within(row("Beds")).getByText(/full: build more/)).toBeInTheDocument();
  });

  it("says who is free to hire, or that everyone is working", () => {
    const { rerender } = render(<VillagePanel {...base} />);
    expect(within(row("Without a job")).getByText("free to hire")).toBeInTheDocument();
    rerender(<VillagePanel {...base} unemployed={0} />);
    expect(within(row("Without a job")).getByText("everyone is working")).toBeInTheDocument();
  });

  it("describes a fed village, one with nothing spare, and one eating its stores", () => {
    const { rerender } = render(<VillagePanel {...base} />);
    expect(within(row("Food")).getByText("Fed, with some to spare")).toBeInTheDocument();
    rerender(<VillagePanel {...base} foodMade={2} />);
    expect(within(row("Food")).getByText("Fed, with nothing to spare")).toBeInTheDocument();
    rerender(<VillagePanel {...base} foodMade={1} />);
    expect(within(row("Food")).getByText("Eating into the stores")).toBeInTheDocument();
  });

  it("says Hungry when the village has been short of food for a while", () => {
    render(<VillagePanel {...base} foodMade={0} hungry />);
    expect(within(row("Food")).getByText("Hungry")).toBeInTheDocument();
  });

  it("shows what is made and eaten when anything is eaten", () => {
    render(<VillagePanel {...base} />);
    expect(within(row("Food")).getByText("10.0 made, 2.0 eaten per second")).toBeInTheDocument();
  });

  it("leaves the food detail out before anyone eats", () => {
    render(<VillagePanel {...base} foodEaten={0} foodMade={0} />);
    expect(within(row("Food")).queryByText(/made/)).not.toBeInTheDocument();
  });

  it("copes with a village that has no beds yet", () => {
    render(<VillagePanel {...base} beds={0} population={0} unemployed={0} />);
    expect(screen.getByRole("progressbar", { name: "Beds filled" })).toBeInTheDocument();
  });
});
