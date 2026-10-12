import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotationProvider } from "../NotationProvider";
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

describe("ShopItem notation", () => {
  it("writes the cost and the owned count in the chosen notation", () => {
    render(
      <NotationProvider notation="engineering">
        <ul>
          <ShopItem {...base} owned={2500} cost={1_234_567} />
        </ul>
      </NotationProvider>,
    );
    expect(screen.getByRole("button", { name: /Hire/ })).toHaveTextContent("1.23e6 food");
    expect(screen.getByRole("heading", { name: /Food Acquisition Associate/ })).toHaveTextContent(
      "× 2.50e3",
    );
  });
  it("announces why it is blocked and links the reason to the button", () => {
    render(
      <ul>
        <ShopItem {...base} affordable={false} blockedReason="Nobody is free." reserveReasonSpace />
      </ul>,
    );
    expect(screen.getByRole("button", { name: /Hire/ })).toHaveAccessibleDescription(
      "Nobody is free.",
    );
  });

  it("keeps the same reason element with or without a reason, so the row does not change height", () => {
    const { rerender } = render(
      <ul>
        <ShopItem {...base} reserveReasonSpace />
      </ul>,
    );
    const row = screen.getByRole("listitem");
    const before = row.querySelectorAll("p").length;
    expect(screen.getByRole("button", { name: /Hire/ })).not.toHaveAccessibleDescription();
    rerender(
      <ul>
        <ShopItem {...base} reserveReasonSpace blockedReason="Nobody is free." />
      </ul>,
    );
    expect(screen.getByRole("listitem").querySelectorAll("p").length).toBe(before);
  });

  it("adds no reason line to rows that can't be blocked", () => {
    render(
      <ul>
        <ShopItem {...base} />
      </ul>,
    );
    expect(screen.getByRole("listitem").querySelectorAll("p")).toHaveLength(2);
  });
});

describe("ShopItem button width", () => {
  it("keeps the same button width whatever the cost and quantity", () => {
    const { rerender } = render(
      <NotationProvider notation="short">
        <ShopItem {...base} cost={9} />
      </NotationProvider>,
    );
    const before = getComputedStyle(screen.getByRole("button")).width;
    rerender(
      <NotationProvider notation="short">
        <ShopItem {...base} cost={123456} count={100} />
      </NotationProvider>,
    );
    expect(before).toBe("116px");
    expect(getComputedStyle(screen.getByRole("button")).width).toBe(before);
  });
});

describe("ShopItem pulse", () => {
  it("highlights the row only while pulsing, and never moves it", () => {
    const { rerender } = render(
      <NotationProvider notation="short">
        <ul>
          <ShopItem {...base} />
        </ul>
      </NotationProvider>,
    );
    const row = () => screen.getByRole("listitem");
    const plain = row().className;
    rerender(
      <NotationProvider notation="short">
        <ul>
          <ShopItem {...base} pulse />
        </ul>
      </NotationProvider>,
    );
    expect(row().className).not.toBe(plain);
    expect(getComputedStyle(row()).animationName).not.toBe("");
    // The same controls are still there to use.
    expect(screen.getByRole("button", { name: "Hire Food Acquisition Associate" })).toBeEnabled();
  });
});

describe("ShopItem wait note", () => {
  const wrap = (props: Partial<ShopItemProps>) => (
    <NotationProvider notation="short">
      <ul>
        <ShopItem {...base} {...props} />
      </ul>
    </NotationProvider>
  );

  it("shows how long until it can be bought on a row that cannot be yet", () => {
    render(wrap({ affordable: false, waitNote: "ready in 2m 10s" }));
    expect(screen.getByText("ready in 2m 10s")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hire Food Acquisition Associate" })).toBeDisabled();
  });

  it("shows the bigger-store and not-at-this-rate notes as given", () => {
    const { rerender } = render(wrap({ affordable: false, waitNote: "needs more storage" }));
    expect(screen.getByText("needs more storage")).toBeInTheDocument();
    rerender(wrap({ affordable: false, waitNote: "not at this rate" }));
    expect(screen.getByText("not at this rate")).toBeInTheDocument();
  });

  it("shows no wait text on a row that can be bought", () => {
    render(wrap({ affordable: true }));
    expect(
      screen.queryByText(/ready in|needs more storage|not at this rate/),
    ).not.toBeInTheDocument();
  });

  it("keeps the button the same width with and without a note", () => {
    const { rerender } = render(wrap({ affordable: false, waitNote: "ready in 2m 10s" }));
    const width = getComputedStyle(screen.getByRole("button")).width;
    rerender(wrap({ affordable: true }));
    expect(getComputedStyle(screen.getByRole("button")).width).toBe(width);
    expect(width).toBe("116px");
  });
});
