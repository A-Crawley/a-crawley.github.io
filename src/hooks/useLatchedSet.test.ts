import { renderHook } from "@testing-library/react";
import { useLatchedSet } from "./useLatchedSet";

describe("useLatchedSet", () => {
  it("starts with what it is given", () => {
    const { result } = renderHook(() => useLatchedSet(["a", "b"]));
    expect([...result.current].sort()).toEqual(["a", "b"]);
  });

  it("keeps values after they stop being given", () => {
    const { result, rerender } = renderHook(({ items }) => useLatchedSet(items), {
      initialProps: { items: ["a"] },
    });
    rerender({ items: ["b"] });
    expect(result.current.has("a")).toBe(true);
    expect(result.current.has("b")).toBe(true);
    rerender({ items: [] });
    expect([...result.current].sort()).toEqual(["a", "b"]);
  });
});
