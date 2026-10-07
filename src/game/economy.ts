/**
 * Cost and production maths for geometric-cost incremental games.
 * Pure functions, no state. Formulas follow Pecorella, "The Math of Idle Games".
 */

/** Cost of the next unit: base × growth^owned. */
export function unitCost(base: number, growth: number, owned: number): number {
  return base * Math.pow(growth, owned);
}

/** Total cost of buying `count` units when `owned` are already owned: b·r^k·(r^n − 1)/(r − 1). */
export function bulkCost(base: number, growth: number, owned: number, count: number): number {
  if (count <= 0) return 0;
  if (growth === 1) return base * count;
  return (base * Math.pow(growth, owned) * (Math.pow(growth, count) - 1)) / (growth - 1);
}

/** Most units affordable with `budget`: floor(log_r(c(r − 1)/(b·r^k) + 1)). */
export function maxAffordable(base: number, growth: number, owned: number, budget: number): number {
  if (budget <= 0) return 0;
  const next = unitCost(base, growth, owned);
  if (growth === 1) return Math.floor(budget / next);
  const n = Math.log((budget * (growth - 1)) / next + 1) / Math.log(growth);
  // Guard against floating point error at the boundary.
  let count = Math.floor(n + 1e-9);
  while (count > 0 && bulkCost(base, growth, owned, count) > budget) count--;
  return count;
}

/** Milestone multiplier: ×`factor` for every threshold in `thresholds` that `owned` has reached. */
export function milestoneMultiplier(
  owned: number,
  thresholds: readonly number[],
  factor: number,
): number {
  let multiplier = 1;
  for (const threshold of thresholds) {
    if (owned >= threshold) multiplier *= factor;
  }
  return multiplier;
}
