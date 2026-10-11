import { useRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { useKeepInPlace } from "./useKeepInPlace.ts";

/** A list whose rows are 100 px tall. `rows` is how many are revealed; new ones appear on top. */
function Shop({ rows, revealKey }: { rows: number; revealKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useKeepInPlace(ref, revealKey);
  return (
    <div ref={ref}>
      {Array.from({ length: rows }, (_, i) => (
        <button key={rows - i} type="button" data-row={rows - i}>
          Row {rows - i}
        </button>
      ))}
    </div>
  );
}

/** jsdom has no layout: place each button by its row number and the page's scroll offset. */
function fakeLayout(rowHeight: number, scroll: { y: number }) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.tagName !== "BUTTON") return new DOMRect(0, 0, 0, 0);
    const buttons = [...(this.parentElement?.children ?? [])];
    const top = buttons.indexOf(this) * rowHeight - scroll.y;
    return new DOMRect(0, top, 300, rowHeight);
  });
}

describe("useKeepInPlace", () => {
  const scroll = { y: 0 };
  let scrollBy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scroll.y = 0;
    scrollBy = vi.fn((_x: number, y: number) => {
      scroll.y += y;
    });
    window.scrollBy = scrollBy as unknown as typeof window.scrollBy;
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    fakeLayout(100, scroll);
  });

  afterEach(() => vi.restoreAllMocks());

  it("scrolls by the height of a row revealed above what the player is looking at", () => {
    // Four rows, scrolled so the second row is at the top of the screen.
    const { rerender } = render(<Shop rows={4} revealKey="4" />);
    scroll.y = 100;
    fireEvent.scroll(window);
    rerender(<Shop rows={5} revealKey="5" />);
    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(scrollBy).toHaveBeenCalledWith(0, 100);
    // The button the player was looking at is back where it was on screen.
    expect(screen.getByRole("button", { name: "Row 3" }).getBoundingClientRect().top).toBe(0);
  });

  it("does nothing when the list has not changed", () => {
    const { rerender } = render(<Shop rows={4} revealKey="4" />);
    scroll.y = 100;
    fireEvent.scroll(window);
    rerender(<Shop rows={4} revealKey="4" />);
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("does nothing when nothing on screen moved", () => {
    const { rerender } = render(<Shop rows={1} revealKey="1" />);
    rerender(<Shop rows={1} revealKey="2" />);
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("does nothing when there is nothing to hold", () => {
    const { rerender } = render(<Shop rows={0} revealKey="0" />);
    rerender(<Shop rows={2} revealKey="2" />);
    expect(scrollBy).not.toHaveBeenCalled();
  });
});
