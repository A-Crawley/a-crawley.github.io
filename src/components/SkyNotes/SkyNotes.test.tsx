import { render, screen } from "@testing-library/react";
import { SkyNotes } from "./SkyNotes";

describe("SkyNotes", () => {
  it("lists what has been seen, in order", () => {
    render(<SkyNotes notes={["A number.", "A shadow."]} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(["A number.", "A shadow."]);
  });

  it("invites a look when nothing has been seen", () => {
    render(<SkyNotes notes={[]} />);
    expect(screen.getByText("Nothing seen yet. Try looking up.")).toBeInTheDocument();
  });
});
