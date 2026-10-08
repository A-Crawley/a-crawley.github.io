import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PolicyToggle } from "./PolicyToggle";

const props = {
  label: "Extended Shifts",
  description: "More output. Less morale.",
  checked: false,
};

describe("PolicyToggle", () => {
  it("is a labelled switch showing its state and description", () => {
    const { rerender } = render(<PolicyToggle {...props} onChange={() => {}} />);
    expect(screen.getByRole("switch", { name: "Extended Shifts" })).not.toBeChecked();
    expect(screen.getByText("More output. Less morale.")).toBeInTheDocument();
    rerender(<PolicyToggle {...props} checked onChange={() => {}} />);
    expect(screen.getByRole("switch", { name: "Extended Shifts" })).toBeChecked();
  });

  it("reports the new state when switched", async () => {
    const onChange = vi.fn();
    render(<PolicyToggle {...props} onChange={onChange} />);
    await userEvent.click(screen.getByRole("switch", { name: "Extended Shifts" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("can be switched with the keyboard", async () => {
    const onChange = vi.fn();
    render(<PolicyToggle {...props} checked onChange={onChange} />);
    await userEvent.tab();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
