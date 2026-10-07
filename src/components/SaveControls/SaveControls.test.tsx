import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { SaveControls } from "./SaveControls.tsx";
import type { SaveControlsProps } from "./SaveControls.tsx";

function setup(overrides: Partial<SaveControlsProps> = {}) {
  const props: SaveControlsProps = {
    onExport: vi.fn(() => "EXPORTED-SAVE-TEXT"),
    onImport: vi.fn(() => ({ ok: true }) as const),
    onReset: vi.fn(),
    ...overrides,
  };
  const user = userEvent.setup();
  render(<SaveControls {...props} />);
  return { props, user };
}

describe("SaveControls", () => {
  it("shows the export, import and reset controls, with nothing exported yet", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset game" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Your save")).not.toBeInTheDocument();
  });

  describe("export", () => {
    it("shows the save string when asked", async () => {
      const { user } = setup();
      await user.click(screen.getByRole("button", { name: "Export save" }));
      expect(screen.getByLabelText("Your save")).toHaveValue("EXPORTED-SAVE-TEXT");
    });

    it("copies the save to the clipboard", async () => {
      const { user } = setup();
      await user.click(screen.getByRole("button", { name: "Export save" }));
      await user.click(screen.getByRole("button", { name: "Copy save" }));
      expect(await navigator.clipboard.readText()).toBe("EXPORTED-SAVE-TEXT");
      expect(screen.getByRole("status")).toHaveTextContent("Save copied.");
    });

    it("tells the player to copy by hand when the clipboard is not available", async () => {
      const { user } = setup();
      vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
      await user.click(screen.getByRole("button", { name: "Export save" }));
      await user.click(screen.getByRole("button", { name: "Copy save" }));
      expect(screen.getByRole("status")).toHaveTextContent("Select the text and copy it yourself");
    });
  });

  describe("import", () => {
    it("cannot import until something is pasted", async () => {
      const { user } = setup();
      const button = screen.getByRole("button", { name: "Import save" });
      expect(button).toBeDisabled();
      await user.click(screen.getByLabelText("Paste a save to import"));
      await user.paste("   ");
      expect(button).toBeDisabled();
      await user.paste("abc");
      expect(button).toBeEnabled();
    });

    it("imports the pasted text and confirms", async () => {
      const { props, user } = setup();
      await user.click(screen.getByLabelText("Paste a save to import"));
      await user.paste("PASTED-SAVE");
      await user.click(screen.getByRole("button", { name: "Import save" }));
      expect(props.onImport).toHaveBeenCalledWith("PASTED-SAVE");
      expect(screen.getByRole("status")).toHaveTextContent("Save imported.");
      expect(screen.getByLabelText("Paste a save to import")).toHaveValue("");
    });

    it("shows why a save was rejected and keeps what was pasted", async () => {
      const { user } = setup({
        onImport: vi.fn(() => ({ ok: false, error: "The save is damaged (morale)." }) as const),
      });
      await user.click(screen.getByLabelText("Paste a save to import"));
      await user.paste("BAD");
      await user.click(screen.getByRole("button", { name: "Import save" }));
      expect(screen.getByRole("alert")).toHaveTextContent("The save is damaged (morale).");
      expect(screen.getByLabelText("Paste a save to import")).toHaveValue("BAD");
    });

    it("warns that importing replaces the current game", () => {
      setup();
      expect(screen.getByText("Importing replaces your current game.")).toBeInTheDocument();
    });
  });

  describe("reset", () => {
    it("asks for confirmation instead of resetting straight away", async () => {
      const { props, user } = setup();
      await user.click(screen.getByRole("button", { name: "Reset game" }));
      expect(screen.getByRole("dialog", { name: "Reset the game?" })).toBeInTheDocument();
      expect(props.onReset).not.toHaveBeenCalled();
    });

    it("does nothing when the player cancels", async () => {
      const { props, user } = setup();
      await user.click(screen.getByRole("button", { name: "Reset game" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(props.onReset).not.toHaveBeenCalled();
      // The dialog fades out, so it leaves the page a moment after the click.
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("does nothing when the dialog is dismissed with the keyboard", async () => {
      const { props, user } = setup();
      await user.click(screen.getByRole("button", { name: "Reset game" }));
      await user.keyboard("{Escape}");
      expect(props.onReset).not.toHaveBeenCalled();
    });

    it("resets once, after the player confirms", async () => {
      const { props, user } = setup();
      await user.click(screen.getByRole("button", { name: "Reset game" }));
      await user.click(screen.getByRole("button", { name: "Delete my progress" }));
      expect(props.onReset).toHaveBeenCalledTimes(1);
      // The rest of the page is hidden from assistive technology until the dialog has closed.
      expect(await screen.findByRole("status")).toHaveTextContent("Game reset.");
    });

    it("hides an old export after a reset, so a stale save is not left on screen", async () => {
      const { user } = setup();
      await user.click(screen.getByRole("button", { name: "Export save" }));
      await user.click(screen.getByRole("button", { name: "Reset game" }));
      await user.click(screen.getByRole("button", { name: "Delete my progress" }));
      expect(screen.queryByLabelText("Your save")).not.toBeInTheDocument();
    });
  });
});
