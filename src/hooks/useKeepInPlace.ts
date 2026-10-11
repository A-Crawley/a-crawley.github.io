import { useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

interface Anchor {
  el: HTMLElement;
  top: number;
}

/** The first button inside `container` that is on screen, and where it is. */
function pickAnchor(container: HTMLElement): Anchor | null {
  const limit = window.innerHeight;
  for (const el of container.querySelectorAll<HTMLElement>("button")) {
    const { top, bottom, height } = el.getBoundingClientRect();
    if (height > 0 && bottom > 0 && top < limit) return { el, top };
  }
  return null;
}

/**
 * Keeps what the player is looking at where it is when `revealKey` changes, which is when the list
 * grows: a new row or section appearing above a button would otherwise push it away just as it is
 * tapped. Browsers' own scroll anchoring does not do this reliably, so the page is scrolled by the
 * amount the anchor (the first on-screen button in the container) moved.
 *
 * Only the shift caused by a change of `revealKey` is undone; the page scrolling by itself is not.
 */
export function useKeepInPlace(container: RefObject<HTMLElement | null>, revealKey: string): void {
  const anchor = useRef<Anchor | null>(null);
  const lastKey = useRef(revealKey);

  // Remember where the anchor is as the player scrolls, so the position before a change is known.
  useEffect(() => {
    const remember = () => {
      if (container.current) anchor.current = pickAnchor(container.current);
    };
    window.addEventListener("scroll", remember, { passive: true });
    window.addEventListener("resize", remember);
    return () => {
      window.removeEventListener("scroll", remember);
      window.removeEventListener("resize", remember);
    };
  }, [container]);

  // Runs after every update, before paint.
  useLayoutEffect(() => {
    const node = container.current;
    if (!node) return;
    const before = anchor.current;
    if (lastKey.current !== revealKey) {
      lastKey.current = revealKey;
      if (before && before.el.isConnected) {
        const moved = before.el.getBoundingClientRect().top - before.top;
        if (Math.abs(moved) >= 1) window.scrollBy(0, moved);
      }
    }
    anchor.current = pickAnchor(node);
  });
}
