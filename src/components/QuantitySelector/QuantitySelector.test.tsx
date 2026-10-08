import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuantitySelector } from "./QuantitySelector";

const options = [1, 10, 100, "max"] as const;

describe("QuantitySelector", () => {
  it("shows every option and marks the chosen one", () => {
    render(<QuantitySelector value={10} options={options} onChange={() => {}} />);
    expect(screen.getByRole("group", { name: "Buy amount" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "×10" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "×1" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Max" })).toBeInTheDocument();
  });

  it("reports the option the player picks", async () => {
    const onChange = vi.fn();
    render(<QuantitySelector value={1} options={options} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Max" }));
    expect(onChange).toHaveBeenCalledWith("max");
  });

  it("does not let the chosen option be switched off", async () => {
    const onChange = vi.fn();
    render(<QuantitySelector value={1} options={options} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "×1" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is keyboard operable", async () => {
    const onChange = vi.fn();
    render(<QuantitySelector value={1} options={options} onChange={onChange} />);
    await userEvent.tab(); // the group is one tab stop, on the chosen option
    expect(screen.getByRole("button", { name: "×1" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "×10" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(10);
  });
});
