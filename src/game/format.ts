const SUFFIXES = ["", "K", "M", "B", "T"] as const;

/**
 * A whole-number amount for display: exact below 1,000, then compact ("1.2K", "3.4M").
 * Always rounds down, so the display never promises more than the player has.
 * (GAME-8 replaces this with the full notation setting.)
 */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value < 1000) return String(Math.floor(value));
  let tier = Math.min(Math.floor(Math.log10(value) / 3), SUFFIXES.length - 1);
  let scaled = value / 1000 ** tier;
  // Rounding down to one decimal can't carry into the next tier, but floating point can: guard it.
  if (Math.floor(scaled * 10) / 10 >= 1000 && tier < SUFFIXES.length - 1) {
    tier += 1;
    scaled = value / 1000 ** tier;
  }
  const rounded = Math.floor(scaled * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}${SUFFIXES[tier]}`;
}

/** A per-second rate, with one decimal below 100 so small rates stay visible. */
export function formatRate(perSecond: number): string {
  if (!Number.isFinite(perSecond) || perSecond <= 0) return "0";
  if (perSecond < 100) return (Math.floor(perSecond * 10) / 10).toFixed(1);
  return formatAmount(perSecond);
}
