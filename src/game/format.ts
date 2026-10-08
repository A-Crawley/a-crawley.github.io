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

/**
 * A per-second rate, rounded to nearest: two decimals below 1 (0.03, 0.25) so slow producers don't
 * show as 0, one decimal below 100, then compact.
 */
export function formatRate(perSecond: number): string {
  if (!Number.isFinite(perSecond) || perSecond <= 0) return "0";
  if (perSecond < 1) return String(Number(perSecond.toFixed(2)));
  if (perSecond < 100) return perSecond.toFixed(1);
  return formatAmount(perSecond);
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/** A length of time in plain words: "less than a minute", "45 minutes", "2 hours 14 minutes". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 60) return "less than a minute";
  const totalMinutes = Math.floor(seconds / 60);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(plural(days, "day"));
  if (hours > 0) parts.push(plural(hours, "hour"));
  // Minutes only matter for short gaps; "3 days 4 hours 12 minutes" is more than anyone wants.
  if (minutes > 0 && days === 0) parts.push(plural(minutes, "minute"));
  return parts.join(" ");
}
