import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LockedAction } from "./LockedAction";

describe("LockedAction", () => {
  it("is marked unavailable and described by its hint", () => {
    render(<LockedAction label="Look up" hint="Not ready yet." />);
    const button = screen.getByRole("button", { name: "Look up" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription("Not ready yet.");
  });

  it("can be reached by keyboard and does nothing when pressed", async () => {
    render(<LockedAction label="Look up" hint="Not ready yet." />);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Look up" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByText("Not ready yet.")).toBeInTheDocument();
  });
});
