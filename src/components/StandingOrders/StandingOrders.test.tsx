import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { StandingOrders } from "./StandingOrders";
import type { StandingOrderRow } from "./StandingOrders";

const rows: StandingOrderRow[] = [
  { id: "hut", label: "Hut", cap: 0, owned: 6, rule: "Builds when beds run short." },
  { id: "forager", label: "Forager", cap: 12, owned: 10, rule: "Hires new arrivals." },
];

function setup(onChange = vi.fn()) {
  render(
    <StandingOrders rows={rows} maxCap={200} note="Always keeps a reserve." onChange={onChange} />,
  );
  return onChange;
}

describe("StandingOrders", () => {
  it("shows the reserve note and a labelled cap for each order", () => {
    setup();
    expect(screen.getByText("Always keeps a reserve.")).toBeInTheDocument();
    expect(screen.getByLabelText("Hut: keep up to")).toHaveValue(0);
    expect(screen.getByLabelText("Forager: keep up to")).toHaveValue(12);
  });

  it("says when an order is off, and what the village has", () => {
    setup();
    expect(screen.getByText("Off. Builds when beds run short. You have 6.")).toBeInTheDocument();
    expect(screen.getByText("Hires new arrivals. You have 10.")).toBeInTheDocument();
  });

  it("reports the new cap when it is typed", async () => {
    const onChange = setup();
    const field = screen.getByLabelText("Hut: keep up to");
    await userEvent.clear(field);
    await userEvent.type(field, "9");
    expect(onChange).toHaveBeenLastCalledWith("hut", 9);
  });

  it("clears an order when the field is emptied", async () => {
    const onChange = setup();
    await userEvent.clear(screen.getByLabelText("Forager: keep up to"));
    expect(onChange).toHaveBeenLastCalledWith("forager", 0);
  });

  it("keeps a typed cap inside the allowed range", async () => {
    const onChange = setup();
    const field = screen.getByLabelText("Forager: keep up to");
    fireEvent.change(field, { target: { value: "999" } });
    expect(onChange).toHaveBeenLastCalledWith("forager", 200);
    fireEvent.change(field, { target: { value: "-5" } });
    expect(onChange).toHaveBeenLastCalledWith("forager", 0);
  });
});
