import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { FinalChoice } from "./FinalChoice";

const acts = [
  { id: "a", label: "Say something", detail: "Aloud." },
  { id: "b", label: "Say nothing", detail: "Quietly." },
];

function setup(props: Partial<React.ComponentProps<typeof FinalChoice>> = {}) {
  const onChoose = vi.fn();
  const onPick = vi.fn();
  render(
    <FinalChoice
      title="The exit"
      body="It is open."
      action="Break out"
      odds="Risky"
      onChoose={onChoose}
      onPick={onPick}
      {...props}
    />,
  );
  return { onChoose, onPick };
}

describe("FinalChoice", () => {
  it("shows the situation and the odds in words", () => {
    setup();
    expect(screen.getByRole("heading", { name: "The exit" })).toBeInTheDocument();
    expect(screen.getByText("It is open.")).toBeInTheDocument();
    expect(screen.getByText(/Odds of getting through/)).toHaveTextContent("Risky");
  });

  it("makes the choice when the button is pressed", async () => {
    const { onChoose } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Break out" }));
    expect(onChoose).toHaveBeenCalledTimes(1);
  });

  it("keeps the button disabled until an act is picked", async () => {
    const { onPick, onChoose } = setup({ acts });
    expect(screen.getByRole("group", { name: "Before you go" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Break out" })).toBeDisabled();
    expect(screen.getByText("Pick one to unlock the exit.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /Say nothing/ }));
    expect(onPick).toHaveBeenCalledWith("b");
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("enables the button once an act is picked and locks the other options", () => {
    setup({ acts, picked: "a" });
    expect(screen.getByRole("radio", { name: /Say something/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Say nothing/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Break out" })).toBeEnabled();
    expect(screen.getByText("Done. It cannot be taken back.")).toBeInTheDocument();
  });
});
