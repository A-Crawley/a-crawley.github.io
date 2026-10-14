import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { BriefChoice } from "./BriefChoice";

const options = [
  { id: "a", label: "Ship it", detail: "Faster." },
  { id: "b", label: "Do it properly", detail: "Slower." },
];

describe("BriefChoice", () => {
  it("shows the question and every option with what it does", () => {
    render(
      <BriefChoice title="Research brief" body="Pick one." options={options} onChoose={() => {}} />,
    );
    expect(screen.getByRole("heading", { name: "Research brief" })).toBeInTheDocument();
    expect(screen.getByText("Pick one.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ship it/ })).toHaveTextContent("Faster.");
    expect(screen.getByRole("button", { name: /Do it properly/ })).toHaveTextContent("Slower.");
  });

  it("reports the option that was pressed", async () => {
    const onChoose = vi.fn();
    render(
      <BriefChoice title="Research brief" body="Pick one." options={options} onChoose={onChoose} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Do it properly/ }));
    expect(onChoose).toHaveBeenCalledExactlyOnceWith("b");
  });
});
