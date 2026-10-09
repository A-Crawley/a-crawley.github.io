import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DevTools } from "./DevTools";
import type { DevToolsProps } from "./DevTools";

function props(over: Partial<DevToolsProps> = {}): DevToolsProps {
  return {
    readout: [{ label: "Stage", value: "2" }],
    bots: ["efficient", "balanced", "compassionate"],
    bot: "balanced",
    onBotChange: () => {},
    onSkip: () => {},
    onPlay: () => {},
    onGrant: () => {},
    onRefresh: () => {},
    onVillagers: () => {},
    onEvent: () => {},
    onDrift: () => {},
    onTurnOff: () => {},
    ...over,
  };
}

describe("DevTools", () => {
  it("shows the readout", () => {
    render(<DevTools {...props()} />);
    expect(screen.getByText("Stage")).toBeInTheDocument();
    expect(screen.getByRole("term")).toBeInTheDocument();
  });

  it("skips time by the amount on the button", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    render(<DevTools {...props({ onSkip })} />);
    await user.click(screen.getByRole("button", { name: "Skip 10 min" }));
    await user.click(screen.getByRole("button", { name: "Skip 1 hour" }));
    expect(onSkip).toHaveBeenNthCalledWith(1, 600);
    expect(onSkip).toHaveBeenNthCalledWith(2, 3600);
  });

  it("asks a bot to play to each goal, and lets the bot be chosen", async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    const onBotChange = vi.fn();
    render(<DevTools {...props({ onPlay, onBotChange })} />);
    await user.click(screen.getByRole("button", { name: "Play To stage 3" }));
    await user.click(screen.getByRole("button", { name: "Play To the final choice" }));
    expect(onPlay).toHaveBeenNthCalledWith(1, "stage-3");
    expect(onPlay).toHaveBeenNthCalledWith(2, "choice");
    await user.click(screen.getByRole("button", { name: "compassionate" }));
    expect(onBotChange).toHaveBeenCalledWith("compassionate");
  });

  it("calls the give, drift and turn-off handlers", async () => {
    const user = userEvent.setup();
    const handlers = {
      onGrant: vi.fn(),
      onVillagers: vi.fn(),
      onEvent: vi.fn(),
      onRefresh: vi.fn(),
      onDrift: vi.fn(),
      onTurnOff: vi.fn(),
    };
    render(<DevTools {...props(handlers)} />);
    await user.click(screen.getByRole("button", { name: "More food and wood" }));
    await user.click(screen.getByRole("button", { name: "10 villagers" }));
    await user.click(screen.getByRole("button", { name: "Next village event" }));
    await user.click(screen.getByRole("button", { name: "Full morale" }));
    await user.click(screen.getByRole("button", { name: "Efficient" }));
    await user.click(screen.getByRole("button", { name: "Turn off developer tools" }));
    expect(handlers.onGrant).toHaveBeenCalled();
    expect(handlers.onVillagers).toHaveBeenCalled();
    expect(handlers.onEvent).toHaveBeenCalled();
    expect(handlers.onRefresh).toHaveBeenCalled();
    expect(handlers.onDrift).toHaveBeenCalledWith("efficient");
    expect(handlers.onTurnOff).toHaveBeenCalled();
  });
});
