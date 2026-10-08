import { renderHook } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { useLayout } from "./useLayout";

function setWidth(width: number) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const min = Number(/min-width:(\d+)px/.exec(query)?.[1] ?? 0);
    return {
      matches: width >= min,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    };
  });
}

afterEach(() => {
  // @ts-expect-error jsdom has no matchMedia; remove what the test added.
  delete window.matchMedia;
});

describe("useLayout", () => {
  it("answers desktop where media queries are unavailable", () => {
    expect(renderHook(() => useLayout()).result.current).toBe("desktop");
  });

  it("is a phone below 600 px", () => {
    setWidth(390);
    expect(renderHook(() => useLayout()).result.current).toBe("phone");
  });

  it("is a tablet from 600 px up to 1023 px", () => {
    setWidth(768);
    expect(renderHook(() => useLayout()).result.current).toBe("tablet");
  });

  it("is a desktop from 1024 px", () => {
    setWidth(1024);
    expect(renderHook(() => useLayout()).result.current).toBe("desktop");
  });
});
