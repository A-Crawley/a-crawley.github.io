import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShopItem } from "./ShopItem";
import type { ShopItemProps } from "./ShopItem";

const base: ShopItemProps = {
  name: "Food Acquisition Associate",
  description: "Walks to where the food is.",
  owned: 3,
  actionLabel: "Hire",
  cost: 12,
  currency: "food",
  output: "0.4 food per second",
  affordable: true,
  onBuy: () => {},
};

describe("ShopItem", () => {
  it("shows what it is, how many you have, what it makes and costs", () => {
    render(
      <ul>
        <ShopItem {...base} />
      </ul>,
    );
    expect(screen.getByRole("heading", { name: /Food Acquisition Associate/ })).toHaveTextContent(
      "× 3",
    );
    expect(screen.getByText("Walks to where the food is.")).toBeInTheDocument();
    expect(screen.getByText("Makes 0.4 food per second")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hire Food Acquisition Associate" }),
    ).toHaveTextContent("12 food");
  });

  it("calls onBuy when affordable", async () => {
    const onBuy = vi.fn();
    render(
      <ul>
        <ShopItem {...base} onBuy={onBuy} />
      </ul>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Hire/ }));
    expect(onBuy).toHaveBeenCalledTimes(1);
  });

  it("is disabled and does nothing when unaffordable", async () => {
    const onBuy = vi.fn();
    render(
      <ul>
        <ShopItem {...base} affordable={false} onBuy={onBuy} />
      </ul>,
    );
    const button = screen.getByRole("button", { name: /Hire/ });
    expect(button).toBeDisabled();
    // MUI sets pointer-events: none on disabled buttons; skip that check to prove the click is inert.
    await userEvent.setup({ pointerEventsCheck: 0 }).click(button);
    expect(onBuy).not.toHaveBeenCalled();
  });
});

describe("ShopItem with a bigger purchase", () => {
  it("names the amount on the button and in its accessible name", () => {
    render(
      <ul>
        <ShopItem {...base} count={10} cost={210} />
      </ul>,
    );
    const button = screen.getByRole("button", { name: "Hire 10 × Food Acquisition Associate" });
    expect(button).toHaveTextContent("Hire ×10");
    expect(button).toHaveTextContent("210 food");
  });

  it("uses the verb it is given", () => {
    render(
      <ul>
        <ShopItem {...base} actionLabel="Build" name="Sawmill bot" />
      </ul>,
    );
    expect(screen.getByRole("button", { name: "Build Sawmill bot" })).toBeInTheDocument();
  });
});
