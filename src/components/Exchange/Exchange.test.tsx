import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { Exchange } from "./Exchange";

const offers = [
  { id: "woodForFood", label: "Sell 20 wood for 14 food", possible: true },
  {
    id: "foodForWood",
    label: "Sell 30 food for 21 wood",
    possible: false,
    reason: "Keep some food.",
  },
];

describe("Exchange", () => {
  it("shows the rate and a button for each direction", () => {
    render(<Exchange offers={offers} rateNote="Rate note." onTrade={() => {}} />);
    expect(screen.getByText("Rate note.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sell 20 wood for 14 food" })).toBeEnabled();
  });

  it("disables a trade that cannot be made and says why", () => {
    render(<Exchange offers={offers} rateNote="" onTrade={() => {}} />);
    expect(screen.getByRole("button", { name: "Sell 30 food for 21 wood" })).toBeDisabled();
    expect(screen.getByText("Keep some food.")).toBeInTheDocument();
  });

  it("does not show a reason for a trade that can be made", () => {
    render(<Exchange offers={[{ ...offers[1], possible: true }]} rateNote="" onTrade={() => {}} />);
    expect(screen.queryByText("Keep some food.")).not.toBeInTheDocument();
  });

  it("reports which trade was pressed", async () => {
    const onTrade = vi.fn();
    render(<Exchange offers={offers} rateNote="" onTrade={onTrade} />);
    await userEvent.click(screen.getByRole("button", { name: "Sell 20 wood for 14 food" }));
    expect(onTrade).toHaveBeenCalledExactlyOnceWith("woodForFood");
  });
});
