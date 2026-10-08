/**
 * How big numbers are written. Player-selectable (see settings.ts).
 * - short: 1.23K, 4.5M, 6B, 7T, then 1aa, 1ab, ... 1az, 1ba, ...
 * - scientific: 1.23e45
 * - engineering: like scientific, but the exponent is a multiple of 3 (123.45e3)
 */
export type Notation = "short" | "scientific" | "engineering";

export const NOTATIONS: readonly Notation[] = ["short", "scientific", "engineering"];

export const DEFAULT_NOTATION: Notation = "short";

export const NOTATION_LABELS: Record<Notation, string> = {
  short: "Short (1.23K)",
  scientific: "Scientific (1.23e3)",
  engineering: "Engineering (1.23e3)",
};

/** Names for the first few thousands-tiers. After these come two-letter names: aa, ab, ... zz. */
const NAMED_TIERS = ["", "K", "M", "B", "T"] as const;
const MAX_TIER = NAMED_TIERS.length - 1 + 26 * 26;

/** Added before rounding down, so 1.15 (stored as 1.1499999...) is not shown as 1.1. */
const EPSILON = 1e-9;

function floorTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.floor(value * factor + EPSILON) / factor;
}

function tierName(tier: number): string {
  if (tier < NAMED_TIERS.length) return NAMED_TIERS[tier];
  const n = tier - NAMED_TIERS.length;
  const letter = (index: number) => String.fromCharCode(97 + index);
  return letter(Math.floor(n / 26) % 26) + letter(n % 26);
}

function formatShort(value: number): string {
  let tier = Math.min(Math.floor(Math.log10(value) / 3), MAX_TIER);
  let scaled = value / 1000 ** tier;
  // Floating point can land just either side of a power of 1,000: step to the right tier.
  if (scaled >= 1000 && tier < MAX_TIER) {
    tier += 1;
    scaled = value / 1000 ** tier;
  } else if (scaled < 1 && tier > 0) {
    tier -= 1;
    scaled = value / 1000 ** tier;
  }
  const rounded = floorTo(scaled, 1);
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}${tierName(tier)}`;
}

/** Mantissa and exponent with the exponent a multiple of `step` (1 for scientific, 3 for engineering). */
function formatExponent(value: number, step: 1 | 3): string {
  let exponent = Math.floor(Math.log10(value));
  let mantissa = value / 10 ** exponent;
  // Same floating point guard as above, for values at an exact power of ten.
  if (mantissa >= 10) {
    exponent += 1;
    mantissa = value / 10 ** exponent;
  } else if (mantissa < 1) {
    exponent -= 1;
    mantissa = value / 10 ** exponent;
  }
  const shift = exponent - Math.floor(exponent / step) * step;
  return `${floorTo(mantissa * 10 ** shift, 2).toFixed(2)}e${exponent - shift}`;
}

/**
 * An amount for display. Exact whole numbers below 1,000 in every notation; from 1,000 up it is
 * written in the chosen notation, with two decimals (one for short). Always rounds down, so the
 * display never promises more than the player has. Handles anything up to Number.MAX_VALUE;
 * Infinity shows as "∞". Zero, negatives and NaN show as "0".
 */
export function formatAmount(value: number, notation: Notation = DEFAULT_NOTATION): string {
  if (value === Number.POSITIVE_INFINITY) return "∞";
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value < 1000) return String(Math.floor(value));
  if (notation === "scientific") return formatExponent(value, 1);
  if (notation === "engineering") return formatExponent(value, 3);
  return formatShort(value);
}

/**
 * A per-second rate, rounded to nearest: "<0.01" for the tiniest, two decimals below 1 (0.03,
 * 0.25) so slow producers don't read as zero, one decimal below 100, then as an amount.
 */
export function formatRate(perSecond: number, notation: Notation = DEFAULT_NOTATION): string {
  if (perSecond === Number.POSITIVE_INFINITY) return "∞";
  if (!Number.isFinite(perSecond) || perSecond <= 0) return "0";
  if (perSecond < 0.01) return "<0.01";
  if (perSecond < 1) return String(Number(perSecond.toFixed(2)));
  if (perSecond < 100) return perSecond.toFixed(1);
  return formatAmount(perSecond, notation);
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
