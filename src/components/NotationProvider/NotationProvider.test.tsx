import { render, screen } from "@testing-library/react";
import { useNumberFormat } from "../../hooks/useNumberFormat.ts";
import { NotationProvider } from "./NotationProvider";

function Probe() {
  const format = useNumberFormat();
  return (
    <p>
      {format.notation} {format.amount(1_234_567)} {format.rate(12_500)}
    </p>
  );
}

describe("NotationProvider", () => {
  it("defaults to short notation without a provider", () => {
    render(<Probe />);
    expect(screen.getByText("short 1.2M 12.5K")).toBeInTheDocument();
  });

  it("makes numbers below it use the chosen notation", () => {
    render(
      <NotationProvider notation="scientific">
        <Probe />
      </NotationProvider>,
    );
    expect(screen.getByText("scientific 1.23e6 1.25e4")).toBeInTheDocument();
  });

  it("follows a change of notation", () => {
    const { rerender } = render(
      <NotationProvider notation="short">
        <Probe />
      </NotationProvider>,
    );
    rerender(
      <NotationProvider notation="engineering">
        <Probe />
      </NotationProvider>,
    );
    expect(screen.getByText("engineering 1.23e6 12.50e3")).toBeInTheDocument();
  });
});
