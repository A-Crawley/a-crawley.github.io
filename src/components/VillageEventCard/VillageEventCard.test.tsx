import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VillageEventCard } from "./VillageEventCard";
import type { VillageEventChoice } from "./VillageEventCard";

const choices: VillageEventChoice[] = [
  {
    id: "share",
    label: "Share what is left",
    detail: "Morale rises.",
    cost: "40 food",
    disabled: false,
  },
  { id: "cut", label: "Cut portions", detail: "Morale falls.", cost: null, disabled: false },
];

function setup(overrides: { choices?: VillageEventChoice[]; secondsLeft?: number } = {}) {
  const onChoose = vi.fn();
  render(
    <VillageEventCard
      title="A lean week"
      body="The pot is nearly empty."
      choices={overrides.choices ?? choices}
      secondsLeft={overrides.secondsLeft ?? 272}
      onChoose={onChoose}
    />,
  );
  return onChoose;
}

describe("VillageEventCard", () => {
  it("shows the event, each choice with its price, and when it decides itself", () => {
    setup();
    expect(screen.getByRole("region", { name: "A lean week" })).toBeInTheDocument();
    expect(screen.getByText("The pot is nearly empty.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Share what is left/ })).toHaveTextContent(
      "Costs 40 food.",
    );
    expect(screen.getByRole("button", { name: /Cut portions/ })).not.toHaveTextContent("Costs");
    expect(screen.getByText(/decided for you in 4:32/)).toBeInTheDocument();
  });

  it("reports which choice was picked", async () => {
    const user = userEvent.setup();
    const onChoose = setup();
    await user.click(screen.getByRole("button", { name: /Cut portions/ }));
    expect(onChoose).toHaveBeenCalledWith("cut");
  });

  it("can be answered from the keyboard", async () => {
    const user = userEvent.setup();
    const onChoose = setup();
    await user.tab();
    await user.keyboard("{Enter}");
    expect(onChoose).toHaveBeenCalledWith("share");
  });

  it("disables a choice that can't be paid for", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChoose = setup({ choices: [{ ...choices[0], disabled: true }, choices[1]] });
    const share = screen.getByRole("button", { name: /Share what is left/ });
    expect(share).toBeDisabled();
    await user.click(share);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("never shows a negative countdown", () => {
    setup({ secondsLeft: -3 });
    expect(screen.getByText(/decided for you in 0:00/)).toBeInTheDocument();
  });
});
