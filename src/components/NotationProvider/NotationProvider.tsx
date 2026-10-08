import type { ReactNode } from "react";
import { NotationContext } from "../../hooks/useNumberFormat.ts";
import type { Notation } from "../../game/format.ts";

export interface NotationProviderProps {
  notation: Notation;
  children: ReactNode;
}

/** Makes `notation` the way every number below it is written. */
export function NotationProvider({ notation, children }: NotationProviderProps) {
  return <NotationContext.Provider value={notation}>{children}</NotationContext.Provider>;
}
