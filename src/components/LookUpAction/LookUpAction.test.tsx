import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { LookUpAction } from "./LookUpAction";

describe("LookUpAction", () => {
  it("is greyed out and does nothing while locked", async () => {
    const onLookUp = vi.fn();
    render(<LookUpAction unlocked={false} sighting={null} onLookUp={onLookUp} />);
    const button = screen.getByRole("button", { name: "Look up" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(button);
    expect(onLookUp).not.toHaveBeenCalled();
  });

  it("is active once unlocked and invites a first look", async () => {
    const onLookUp = vi.fn();
    render(<LookUpAction unlocked sighting={null} onLookUp={onLookUp} />);
    const button = screen.getByRole("button", { name: "Look up" });
    expect(button).not.toHaveAttribute("aria-disabled");
    expect(screen.getByText("Something is different about the sky.")).toBeInTheDocument();
    await userEvent.click(button);
    expect(onLookUp).toHaveBeenCalledTimes(1);
  });

  it("shows what the player saw", () => {
    render(<LookUpAction unlocked sighting="A number hangs in the sky." onLookUp={() => {}} />);
    expect(screen.getByText("A number hangs in the sky.")).toBeInTheDocument();
  });
});
