import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotationPicker } from "./NotationPicker";

describe("NotationPicker", () => {
  it("is a labelled group with every notation, and the current one chosen", () => {
    render(<NotationPicker value="scientific" onChange={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: "Number notation" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Short/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /Scientific/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Engineering/ })).not.toBeChecked();
  });

  it("shows an example in the current notation", () => {
    const { rerender } = render(<NotationPicker value="short" onChange={() => {}} />);
    expect(screen.getByText("1,234,567,890 is shown as 1.2B.")).toBeInTheDocument();
    rerender(<NotationPicker value="scientific" onChange={() => {}} />);
    expect(screen.getByText("1,234,567,890 is shown as 1.23e9.")).toBeInTheDocument();
    rerender(<NotationPicker value="engineering" onChange={() => {}} />);
    expect(screen.getByText("1,234,567,890 is shown as 1.23e9.")).toBeInTheDocument();
  });

  it("reports the notation the player picks", async () => {
    const onChange = vi.fn();
    render(<NotationPicker value="short" onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: /Engineering/ }));
    expect(onChange).toHaveBeenCalledWith("engineering");
  });

  it("works from the keyboard", async () => {
    const onChange = vi.fn();
    render(<NotationPicker value="short" onChange={onChange} />);
    await userEvent.tab();
    await userEvent.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenCalledWith("scientific");
  });
});
