import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkforcePanel } from "./WorkforcePanel";
import type { WorkforcePanelProps } from "./WorkforcePanel";

const base: WorkforcePanelProps = {
  idle: 3,
  operators: 0,
  retrainCost: 250,
  canRetrain: true,
  onRedeploy: () => {},
  onRetrain: () => {},
  onRelease: () => {},
};

describe("WorkforcePanel", () => {
  it("says how many villagers are between opportunities and offers three choices", () => {
    render(<WorkforcePanel {...base} />);
    expect(screen.getByRole("region", { name: "Workforce transition" })).toHaveTextContent(
      "3 villagers are between opportunities",
    );
    expect(screen.getByRole("button", { name: "Redeploy to odd jobs" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Retrain as operator \(250 food\)/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Release" })).toBeEnabled();
  });

  it("says so in the singular", () => {
    render(<WorkforcePanel {...base} idle={1} />);
    expect(screen.getByText(/1 villager is between opportunities/)).toBeInTheDocument();
  });

  it("calls the matching handler for each choice", async () => {
    const user = userEvent.setup();
    const onRedeploy = vi.fn();
    const onRetrain = vi.fn();
    const onRelease = vi.fn();
    render(
      <WorkforcePanel
        {...base}
        onRedeploy={onRedeploy}
        onRetrain={onRetrain}
        onRelease={onRelease}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Redeploy to odd jobs" }));
    await user.click(screen.getByRole("button", { name: /Retrain as operator/ }));
    await user.click(screen.getByRole("button", { name: "Release" }));
    expect(onRedeploy).toHaveBeenCalledTimes(1);
    expect(onRetrain).toHaveBeenCalledTimes(1);
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it("disables retraining when the village can't pay", () => {
    render(<WorkforcePanel {...base} canRetrain={false} />);
    expect(screen.getByRole("button", { name: /Retrain as operator/ })).toBeDisabled();
  });

  it("offers nothing to do when nobody is idle, and mentions operators", () => {
    render(<WorkforcePanel {...base} idle={0} operators={4} />);
    const region = screen.getByRole("region", { name: "Workforce transition" });
    expect(region).toHaveTextContent("Nobody is between opportunities");
    expect(region).toHaveTextContent("4 now run machines");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
