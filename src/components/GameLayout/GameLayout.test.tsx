import { fireEvent, render, screen } from "@testing-library/react";
import { GameLayout } from "./GameLayout";
import type { GameLayoutProps } from "./GameLayout";

function parts(overrides: Partial<GameLayoutProps> = {}): GameLayoutProps {
  return {
    mode: "desktop",
    header: <h1>Look Up</h1>,
    hud: <p>Resources</p>,
    status: <p>Village state</p>,
    actions: <button type="button">Gather food</button>,
    main: <p>Shop</p>,
    side: <p>Log</p>,
    ...overrides,
  };
}

describe("GameLayout", () => {
  it("shows every part at once on a desktop, with no tabs", () => {
    render(<GameLayout {...parts()} />);
    for (const text of ["Resources", "Village state", "Shop", "Log"]) {
      expect(screen.getByText(text)).toBeVisible();
    }
    expect(screen.getByRole("button", { name: "Gather food" })).toBeVisible();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("puts the left rail before the shop and the shop before the log on a desktop", () => {
    render(<GameLayout {...parts()} />);
    const order = ["Resources", "Village state", "Gather food", "Shop", "Log"].map((text) =>
      screen.getByText(text),
    );
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i])).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    }
  });

  it("shows every part on a tablet, with no tabs", () => {
    render(<GameLayout {...parts({ mode: "tablet" })} />);
    for (const text of ["Resources", "Village state", "Shop", "Log"]) {
      expect(screen.getByText(text)).toBeVisible();
    }
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("folds the page into tabs on a phone, starting on Build", () => {
    render(<GameLayout {...parts({ mode: "phone" })} />);
    expect(screen.getByRole("tablist", { name: "Game sections" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Build" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Shop")).toBeVisible();
    expect(screen.getByText("Village state")).not.toBeVisible();
    expect(screen.getByText("Log")).not.toBeVisible();
  });

  it("keeps the resources and the main action in view whichever tab is open", () => {
    render(<GameLayout {...parts({ mode: "phone" })} />);
    fireEvent.click(screen.getByRole("tab", { name: "Village" }));
    expect(screen.getByText("Village state")).toBeVisible();
    expect(screen.getByText("Shop")).not.toBeVisible();
    expect(screen.getByText("Resources")).toBeVisible();
    expect(screen.getByRole("button", { name: "Gather food" })).toBeVisible();
  });

  it("links each tab to its panel", () => {
    render(<GameLayout {...parts({ mode: "phone" })} />);
    fireEvent.click(screen.getByRole("tab", { name: "Log and more" }));
    expect(screen.getByRole("tabpanel", { name: "Log and more" })).toHaveTextContent("Log");
  });

  it("leaves out the Village tab when there is no village state", () => {
    render(<GameLayout {...parts({ mode: "phone", status: null })} />);
    expect(screen.queryByRole("tab", { name: "Village" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  it("does not leave an empty rail on a desktop when there is nothing for it", () => {
    render(<GameLayout {...parts({ hud: null, status: null })} />);
    expect(screen.getByText("Shop")).toBeVisible();
    expect(screen.queryByText("Resources")).not.toBeInTheDocument();
  });
  describe("sheet", () => {
    for (const mode of ["phone", "tablet", "desktop"] as const) {
      it(`shows it on a ${mode} without leaving a gap in the page`, () => {
        const { rerender } = render(<GameLayout {...parts({ mode })} />);
        const shop = screen.getByText("Shop");
        const before = shop.parentElement?.innerHTML;
        rerender(<GameLayout {...parts({ mode, sheet: <p>The village asks</p> })} />);
        expect(screen.getByText("The village asks")).toBeVisible();
        // Out of the flow: the shop's own markup and its surroundings are unchanged.
        expect(screen.getByText("Shop").parentElement?.innerHTML).toBe(before);
        let node: HTMLElement | null = screen.getByText("The village asks");
        while (node && getComputedStyle(node).position !== "fixed") node = node.parentElement;
        expect(node).not.toBeNull();
      });
    }

    it("keeps the main action reachable while it is showing on a phone", () => {
      render(<GameLayout {...parts({ mode: "phone", sheet: <p>The village asks</p> })} />);
      expect(screen.getByRole("button", { name: "Gather food" })).toBeVisible();
      expect(screen.getByRole("tab", { name: "Build" })).toBeVisible();
    });
  });
});
