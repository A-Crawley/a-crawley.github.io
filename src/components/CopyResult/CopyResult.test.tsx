import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyResult } from "./CopyResult";

const TEXT = "Look Up: Conquest\n1 hour, 5 villagers, no machines, no walkouts.";

// user-event installs its own clipboard when it is set up, so each test sets it up first and
// only then swaps in the clipboard it wants to watch.
describe("CopyResult", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("starts with a Copy result button and nothing said", () => {
    render(<CopyResult text={TEXT} />);
    expect(screen.getByRole("button", { name: "Copy result" })).toBeEnabled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("copies the text and confirms it in a live region", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<CopyResult text={TEXT} />);
    await user.click(screen.getByRole("button", { name: "Copy result" }));
    expect(writeText).toHaveBeenCalledWith(TEXT);
    expect(await screen.findByRole("status")).toHaveTextContent("Result copied.");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows the text to copy by hand when the clipboard refuses", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<CopyResult text={TEXT} />);
    await user.click(screen.getByRole("button", { name: "Copy result" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Could not copy automatically");
    const box = screen.getByRole("textbox", { name: "Your result" });
    expect(box).toHaveValue(TEXT);
    expect(box).toHaveAttribute("readonly");
  });

  it("shows the text to copy by hand when there is no clipboard", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {});
    render(<CopyResult text={TEXT} />);
    await user.click(screen.getByRole("button", { name: "Copy result" }));
    expect(await screen.findByRole("textbox", { name: "Your result" })).toBeInTheDocument();
  });
});
