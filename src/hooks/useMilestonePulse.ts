import { useEffect, useState } from "react";
import { milestoneDef } from "../game/milestones.ts";
import type { MilestoneItem, MilestonesState } from "../game/milestones.ts";

/** How long a shop row stays highlighted after a milestone. */
export const PULSE_MS = 1400;

/**
 * Which shop rows to highlight now: the ones whose milestone was reached while the page is open.
 * What was already reached when the page loaded is not pulsed, and neither is anything quiet
 * (passed before milestones existed, or surplus after time away) or while `quiet` is true.
 */
export function useMilestonePulse(
  milestones: MilestonesState,
  quiet: boolean,
): ReadonlySet<MilestoneItem> {
  const [seen, setSeen] = useState<readonly string[]>(milestones.fired);
  const [pulsing, setPulsing] = useState<readonly MilestoneItem[]>([]);

  const fresh = milestones.fired.filter((id) => !seen.includes(id));
  if (fresh.length > 0) {
    // Updating state while rendering is the supported way to derive state from changing input.
    setSeen(milestones.fired);
    const items = fresh
      .filter((id) => !milestones.quiet.includes(id))
      .map((id) => milestoneDef(id).item);
    if (!quiet && items.length > 0) setPulsing(items);
  }

  useEffect(() => {
    if (pulsing.length === 0) return;
    const timer = setTimeout(() => setPulsing([]), PULSE_MS);
    return () => clearTimeout(timer);
  }, [pulsing]);

  return new Set(pulsing);
}
