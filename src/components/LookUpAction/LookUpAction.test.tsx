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

describe("LookUpAction: pause and wait", () => {
  it("says plainly what a look costs", () => {
    render(<LookUpAction unlocked sighting={null} pauseSeconds={3.5} onLookUp={() => {}} />);
    expect(screen.getByText("Looking up pauses work for 3.5 seconds.")).toBeInTheDocument();
  });

  it("is disabled with the time left while it cools down", async () => {
    const onLookUp = vi.fn();
    render(<LookUpAction unlocked sighting="A number." waitSeconds={12} onLookUp={onLookUp} />);
    const button = screen.getByRole("button", { name: "Look up" });
    expect(button).toBeDisabled();
    expect(screen.getByText("Ready again in 12 seconds.")).toBeInTheDocument();
    await userEvent.setup({ pointerEventsCheck: 0 }).click(button);
    expect(onLookUp).not.toHaveBeenCalled();
  });

  it("uses the singular for one second", () => {
    render(<LookUpAction unlocked sighting={null} waitSeconds={1} onLookUp={() => {}} />);
    expect(screen.getByText("Ready again in 1 second.")).toBeInTheDocument();
  });

  it("announces the sighting to screen readers", () => {
    render(<LookUpAction unlocked sighting="A number hangs." onLookUp={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent("A number hangs.");
  });
  it("keeps the sighting and caption slots in place whatever they say", () => {
    const { rerender } = render(<LookUpAction unlocked sighting={null} onLookUp={() => {}} />);
    const slots = () => ({
      sighting: screen.getByRole("status").className,
      captions: document.querySelectorAll("p").length,
    });
    const before = slots();
    rerender(
      <LookUpAction
        unlocked
        sighting="A thin line has been drawn across the sky, just under the number."
        waitSeconds={12}
        onLookUp={() => {}}
      />,
    );
    expect(slots()).toEqual(before);
    rerender(<LookUpAction unlocked sighting="Short." onLookUp={() => {}} />);
    expect(slots()).toEqual(before);
  });
});
