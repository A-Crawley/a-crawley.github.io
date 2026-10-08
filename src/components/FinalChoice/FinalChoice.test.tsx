import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { FinalChoice } from "./FinalChoice";

describe("FinalChoice", () => {
  it("shows the situation and the odds in words", () => {
    render(
      <FinalChoice
        title="The exit"
        body="It is open."
        action="Break out"
        odds="Risky"
        onChoose={() => {}}
      />,
    );
    expect(screen.getByRole("heading", { name: "The exit" })).toBeInTheDocument();
    expect(screen.getByText("It is open.")).toBeInTheDocument();
    expect(screen.getByText(/Odds of getting through/)).toHaveTextContent("Risky");
  });

  it("makes the choice when the button is pressed", async () => {
    const onChoose = vi.fn();
    render(
      <FinalChoice
        title="The exit"
        body="It is open."
        action="Break out"
        odds="Risky"
        onChoose={onChoose}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Break out" }));
    expect(onChoose).toHaveBeenCalledTimes(1);
  });
});
