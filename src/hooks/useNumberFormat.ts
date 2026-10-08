import { createContext, useContext } from "react";
import { DEFAULT_NOTATION, formatAmount, formatRate } from "../game/format.ts";
import type { Notation } from "../game/format.ts";

/** The notation the whole screen writes numbers in. Provided by `NotationProvider`. */
export const NotationContext = createContext<Notation>(DEFAULT_NOTATION);

export interface NumberFormat {
  notation: Notation;
  amount(value: number): string;
  rate(perSecond: number): string;
}

/**
 * The one way components write numbers. It reads the player's chosen notation from context, so
 * no component needs to be told which notation to use. Without a provider it is "short".
 */
export function useNumberFormat(): NumberFormat {
  const notation = useContext(NotationContext);
  return {
    notation,
    amount: (value) => formatAmount(value, notation),
    rate: (perSecond) => formatRate(perSecond, notation),
  };
}
