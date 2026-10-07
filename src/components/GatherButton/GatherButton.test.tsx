import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GatherButton } from "./GatherButton";

describe("GatherButton", () => {
  it("calls onGather once per click", async () => {
    const onGather = vi.fn();
    render(<GatherButton label="Gather food" gain={1} onGather={onGather} />);
    const button = screen.getByRole("button", { name: "Gather food" });
    await userEvent.click(button);
    await userEvent.click(button);
    expect(onGather).toHaveBeenCalledTimes(2);
  });

  it("works from the keyboard", async () => {
    const onGather = vi.fn();
    render(<GatherButton label="Gather food" gain={1} onGather={onGather} />);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onGather).toHaveBeenCalledTimes(2);
  });

  it("floats a +N pop-up that screen readers do not hear, and keeps the button name clean", async () => {
    render(<GatherButton label="Gather food" gain={2} onGather={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Gather food" }));
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("+2").closest("[aria-hidden]")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /\+2/ })).not.toBeInTheDocument();
  });

  it("caps how many pop-ups exist at once", async () => {
    render(<GatherButton label="Gather food" gain={1} onGather={() => {}} />);
    const button = screen.getByRole("button", { name: "Gather food" });
    for (let i = 0; i < 20; i++) await userEvent.click(button);
    expect(screen.getAllByText("+1")).toHaveLength(6);
  });
});
