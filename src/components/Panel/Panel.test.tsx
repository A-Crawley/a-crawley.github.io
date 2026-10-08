import { render, screen } from "@testing-library/react";
import { Panel } from "./Panel";

describe("Panel", () => {
  it("shows what it holds", () => {
    render(
      <Panel>
        <p>Inside</p>
      </Panel>,
    );
    expect(screen.getByText("Inside")).toBeInTheDocument();
  });
});
