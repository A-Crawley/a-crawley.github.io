import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AchievementToast } from "./AchievementToast";

describe("AchievementToast", () => {
  it("shows nothing without a title", () => {
    render(<AchievementToast title={null} onClose={() => {}} />);
    expect(screen.queryByText(/Achievement:/)).not.toBeInTheDocument();
  });

  it("announces the achievement", () => {
    render(<AchievementToast title="Headcount" onClose={() => {}} />);
    expect(screen.getByText("Achievement: Headcount")).toBeInTheDocument();
  });

  it("closes itself after a few seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const onClose = vi.fn();
      render(<AchievementToast title="Headcount" onClose={onClose} />);
      await vi.advanceTimersByTimeAsync(4500);
      expect(onClose).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not close when the player clicks elsewhere", async () => {
    const onClose = vi.fn();
    render(
      <div>
        <button>elsewhere</button>
        <AchievementToast title="Headcount" onClose={onClose} />
      </div>,
    );
    await userEvent.click(screen.getByRole("button", { name: "elsewhere" }));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("AchievementToast raised", () => {
  it("still shows the achievement when lifted above a bottom bar", () => {
    render(<AchievementToast title="Headcount" onClose={() => {}} raised />);
    expect(screen.getByText("Achievement: Headcount")).toBeInTheDocument();
  });
});

describe("AchievementToast staying on screen (regression)", () => {
  /** What the game page does: a queue, and a parent that re-renders every few hundred ms. */
  function Harness({ titles }: { titles: string[] }) {
    const [queue, setQueue] = useState(titles);
    const [, setTicks] = useState(0);
    useEffect(() => {
      const id = setInterval(() => setTicks((n) => n + 1), 250);
      return () => clearInterval(id);
    }, []);
    return <AchievementToast title={queue[0] ?? null} onClose={() => setQueue(queue.slice(1))} />;
  }

  it("goes away after a few seconds even while the page keeps re-rendering", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<Harness titles={["Headcount"]} />);
      expect(screen.getByText("Achievement: Headcount")).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
      });
      await waitFor(() => expect(screen.queryByText(/Achievement:/)).not.toBeInTheDocument());
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows each of several queued achievements in turn, and then goes away", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<Harness titles={["First", "Second", "Third"]} />);
      expect(screen.getByText("Achievement: First")).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(await screen.findByText("Achievement: Second")).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(await screen.findByText("Achievement: Third")).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      await waitFor(() => expect(screen.queryByText(/Achievement:/)).not.toBeInTheDocument());
    } finally {
      vi.useRealTimers();
    }
  });
});
