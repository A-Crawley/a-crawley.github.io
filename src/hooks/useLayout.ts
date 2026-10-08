import { useMediaQuery } from "@mui/material";
import { DESKTOP_MIN, TABLET_MIN } from "../theme";

/** Which arrangement of the game screen fits the window: one column, two or a dashboard. */
export type LayoutMode = "phone" | "tablet" | "desktop";

/**
 * The layout for the current window width. Where media queries are unavailable (tests, old
 * browsers) it answers "desktop", the layout that shows everything at once.
 */
export function useLayout(): LayoutMode {
  const options = { noSsr: true, defaultMatches: true };
  const desktop = useMediaQuery(`(min-width:${DESKTOP_MIN}px)`, options);
  const tablet = useMediaQuery(`(min-width:${TABLET_MIN}px)`, options);
  if (desktop) return "desktop";
  return tablet ? "tablet" : "phone";
}
