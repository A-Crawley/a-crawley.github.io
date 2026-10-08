import { getDefaultStorage } from "./storage.ts";
import type { StorageLike } from "./storage.ts";

export const DEV_KEY = "look-up:dev";

/**
 * Whether the developer tools are on. Open the game with `?dev=1` to turn them on; the choice is
 * remembered on this device. `?dev=0` turns them off again. Nobody who does not know the address
 * sees them, and they change nothing for anyone else.
 */
export function readDevMode(
  search: string,
  storage: StorageLike | null = getDefaultStorage(),
): boolean {
  const asked = new URLSearchParams(search).get("dev");
  try {
    if (asked === "1") {
      storage?.setItem(DEV_KEY, "1");
      return true;
    }
    if (asked === "0") {
      storage?.removeItem(DEV_KEY);
      return false;
    }
    return storage?.getItem(DEV_KEY) === "1";
  } catch {
    return asked === "1";
  }
}
