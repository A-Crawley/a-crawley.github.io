import { render, screen } from "@testing-library/react";
import { MoraleMeter } from "./MoraleMeter";

describe("MoraleMeter", () => {
  it("is a progress bar with the value and a word for it", () => {
    render(<MoraleMeter morale={72.4} />);
    const bar = screen.getByRole("progressbar", { name: "Morale" });
    expect(bar).toHaveAttribute("aria-valuenow", "72");
    expect(bar).toHaveAttribute("aria-valuetext", "72 out of 100, Holding up");
    expect(screen.getByText("Holding up")).toBeInTheDocument();
  });

  it("uses plain words at each level", () => {
    const { rerender } = render(<MoraleMeter morale={100} />);
    expect(screen.getByText("Thriving")).toBeInTheDocument();
    rerender(<MoraleMeter morale={45} />);
    expect(screen.getByText("Strained")).toBeInTheDocument();
    rerender(<MoraleMeter morale={25} />);
    expect(screen.getByText("Close to a walkout")).toBeInTheDocument();
    rerender(<MoraleMeter morale={0} />);
    expect(screen.getByText("Unrest")).toBeInTheDocument();
  });

  it("clamps out-of-range values", () => {
    render(<MoraleMeter morale={140} />);
    expect(screen.getByRole("progressbar", { name: "Morale" })).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });

  it("explains a rest day and a walkout", () => {
    const { rerender } = render(<MoraleMeter morale={50} status="resting" />);
    expect(screen.getByText(/Rest day/)).toBeInTheDocument();
    rerender(<MoraleMeter morale={50} status="walkout" />);
    expect(screen.getByText(/Walkout/)).toBeInTheDocument();
  });

  it("names the top two reasons morale is moving, falling and rising apart", () => {
    render(
      <MoraleMeter
        morale={70}
        reasons={[
          { label: "Hungry", lifting: false },
          { label: "Well fed", lifting: true },
          { label: "Crowded", lifting: false },
        ]}
      />,
    );
    expect(screen.getByText("Falling: Hungry")).toBeInTheDocument();
    expect(screen.getByText("Rising: Well fed")).toBeInTheDocument();
    expect(screen.queryByText(/Crowded/)).not.toBeInTheDocument();
  });

  it("shows no reasons line when nothing is moving it", () => {
    render(<MoraleMeter morale={100} />);
    expect(screen.queryByText(/Falling|Rising/)).not.toBeInTheDocument();
  });
});

describe("MoraleMeter compact", () => {
  it("is one row: a labelled bar and a word for it", () => {
    render(<MoraleMeter morale={72} compact reasons={[{ label: "Crowded", lifting: false }]} />);
    expect(screen.getByRole("progressbar", { name: "Morale" })).toHaveAttribute(
      "aria-valuenow",
      "72",
    );
    expect(screen.getByText("Holding up")).toBeInTheDocument();
    expect(screen.queryByText(/Falling/)).not.toBeInTheDocument();
  });

  it("still says when there is a rest day or a walkout", () => {
    render(<MoraleMeter morale={50} compact status="walkout" />);
    expect(screen.getByText(/Walkout/)).toBeInTheDocument();
  });

  it("can sit beside the full meter without clashing", () => {
    render(
      <>
        <MoraleMeter morale={50} compact />
        <MoraleMeter morale={50} />
      </>,
    );
    expect(screen.getAllByRole("progressbar", { name: "Morale" })).toHaveLength(2);
  });
});
