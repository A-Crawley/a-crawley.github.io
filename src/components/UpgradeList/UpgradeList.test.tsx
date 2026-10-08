import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UpgradeList } from "./UpgradeList";
import type { UpgradeListItem } from "./UpgradeList";

const items: UpgradeListItem[] = [
  {
    id: "betterBaskets",
    name: "Better baskets",
    description: "Baskets with a second handle.",
    effect: "Foragers make 15% more",
    cost: 150,
    currency: "food",
    affordable: true,
  },
  {
    id: "sharperAxes",
    name: "Sharper axes",
    description: "Motivational.",
    effect: "Woodcutters make 15% more",
    cost: 400,
    currency: "food",
    affordable: false,
  },
];

describe("UpgradeList", () => {
  it("shows each upgrade with its effect and price", () => {
    render(<UpgradeList items={items} bought={[]} onBuy={() => {}} />);
    expect(screen.getByRole("heading", { name: "Upgrades" })).toBeInTheDocument();
    expect(screen.getByText("Foragers make 15% more")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy Better baskets" })).toHaveTextContent(
      "150 food",
    );
  });

  it("disables an upgrade that can't be paid for", () => {
    render(<UpgradeList items={items} bought={[]} onBuy={() => {}} />);
    expect(screen.getByRole("button", { name: "Buy Sharper axes" })).toBeDisabled();
  });

  it("reports which upgrade was bought", async () => {
    const user = userEvent.setup();
    const onBuy = vi.fn();
    render(<UpgradeList items={items} bought={[]} onBuy={onBuy} />);
    await user.click(screen.getByRole("button", { name: "Buy Better baskets" }));
    expect(onBuy).toHaveBeenCalledWith("betterBaskets");
  });

  it("lists what has been bought, and says so when nothing is left", () => {
    render(<UpgradeList items={[]} bought={["Better baskets", "Root cellar"]} onBuy={() => {}} />);
    expect(screen.getByText("Nothing to upgrade at the moment.")).toBeInTheDocument();
    expect(screen.getByText("Bought: Better baskets, Root cellar")).toBeInTheDocument();
  });
});
