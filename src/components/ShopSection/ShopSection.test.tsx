import { fireEvent, render, screen } from "@testing-library/react";
import { ShopSection } from "./ShopSection";

describe("ShopSection", () => {
  it("is a titled group that shows its contents", () => {
    render(
      <ShopSection title="Jobs">
        <p>Forager</p>
      </ShopSection>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Jobs" })).toBeInTheDocument();
    expect(screen.getByText("Forager")).toBeVisible();
  });

  it("starts folded when collapsible, and opens from its heading", () => {
    render(
      <ShopSection title="Housing" summary="1 you can afford" collapsible>
        <p>Hut</p>
      </ShopSection>,
    );
    const toggle = screen.getByRole("button", { name: /Housing/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveTextContent("1 you can afford");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Hut")).toBeVisible();
  });

  it("can start open", () => {
    render(
      <ShopSection title="Jobs" collapsible defaultExpanded>
        <p>Forager</p>
      </ShopSection>,
    );
    expect(screen.getByRole("button", { name: /Jobs/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("gives every open section its own named region", () => {
    render(
      <>
        <ShopSection title="Jobs" collapsible defaultExpanded>
          <p>Forager</p>
        </ShopSection>
        <ShopSection title="Housing" collapsible defaultExpanded>
          <p>Hut</p>
        </ShopSection>
      </>,
    );
    expect(screen.getByRole("region", { name: "Jobs" })).toHaveTextContent("Forager");
    expect(screen.getByRole("region", { name: "Housing" })).toHaveTextContent("Hut");
  });
});
