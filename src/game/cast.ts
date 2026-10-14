import type { GameState } from "./state.ts";

/**
 * A small named cast (GAME-37): the first few villagers have names. There is no per-villager
 * simulation. Cast member 0 is the first villager, 1 the second, and so on, and they are counted as
 * having arrived once the population first reaches their number. When the village shrinks (hunger,
 * a walkout, or releasing someone) the earliest named villager still here goes first. Pure flavour:
 * the cast never changes an economy number.
 */
export interface CastMember {
  name: string;
  role: string;
  /** The village log line when they leave. */
  leaves: string;
}

export const CAST: readonly CastMember[] = [
  {
    name: "Priya",
    role: "Food Acquisition",
    leaves: "Priya in Food Acquisition has left. Her ticket was closed as “resolved”.",
  },
  {
    name: "Marcus",
    role: "Timber Operations",
    leaves:
      "Marcus in Timber Operations has left. His handover note was one word long, and the word was “trees”.",
  },
  {
    name: "Dee",
    role: "Infrastructure Delivery",
    leaves:
      "Dee in Infrastructure Delivery has left. The project she was delivering is now a separate workstream.",
  },
  {
    name: "Okafor",
    role: "Quality",
    leaves:
      "Okafor in Quality has left. He had been raising the same issue since the first day. The issue has been closed too.",
  },
  {
    name: "Wen",
    role: "Learning and Development",
    leaves:
      "Wen in Learning and Development has left. She will be missed the way a training budget is missed.",
  },
  {
    name: "Tomasz",
    role: "Facilities",
    leaves: "Tomasz in Facilities has left. The chair he sat in is still allocated to him.",
  },
  {
    name: "Ines",
    role: "People Operations",
    leaves:
      "Ines in People Operations has left. Her last act was to close the survey on why people leave.",
  },
  {
    name: "Abel",
    role: "Strategy",
    leaves: "Abel in Strategy has left. His plan for retention is still on the roadmap.",
  },
];

/** What is saved: who has arrived, who has left (in order), and the population last seen. */
export interface CastState {
  /** Cast members 0 to `arrived - 1` have come to the village. */
  arrived: number;
  /** Indices of the members who have left, in the order they left. */
  departed: number[];
  /** The population when the cast was last brought up to date. */
  lastPopulation: number;
}

export function createCastState(population: number): CastState {
  return { arrived: Math.min(CAST.length, population), departed: [], lastPopulation: population };
}

/** The cast members who have arrived and not left. */
export function castPresent(cast: CastState): number[] {
  const present: number[] = [];
  for (let i = 0; i < cast.arrived; i++) if (!cast.departed.includes(i)) present.push(i);
  return present;
}

/** True when the cast is out of step with the village: someone arrived or left since it was updated. */
export function pendingCast(state: GameState): boolean {
  const { cast, population } = state;
  if (population === cast.lastPopulation) return false;
  if (population > cast.lastPopulation) return Math.min(CAST.length, population) > cast.arrived;
  return true;
}

/**
 * Bring the cast up to date with the population. Newcomers arrive in order; each villager the
 * village has lost takes the earliest named villager still here. Changes `state` in place.
 */
export function applyCast(state: GameState): void {
  const { cast, population } = state;
  if (population === cast.lastPopulation) return;
  if (population > cast.lastPopulation) {
    cast.arrived = Math.max(cast.arrived, Math.min(CAST.length, population));
  } else {
    for (let lost = cast.lastPopulation - population; lost > 0; lost--) {
      const next = castPresent(cast)[0];
      if (next === undefined) break;
      cast.departed.push(next);
    }
  }
  cast.lastPopulation = population;
}

/** The log line for each departure, in the order they left. */
export function castDepartures(cast: CastState): string[] {
  return cast.departed.map((index) => CAST[index]?.leaves ?? "");
}

/** Wording for a list of names: "Priya", "Priya and Marcus", "Priya, Marcus and Dee". */
export function nameList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const namesOf = (indices: readonly number[]) => indices.map((i) => CAST[i]!.name);

/**
 * A line for the ending on who stayed, or null when nobody had arrived. It handles everyone
 * staying, everyone leaving, and anything in between.
 */
export function castEnding(cast: CastState): string | null {
  if (cast.arrived === 0) return null;
  const present = castPresent(cast);
  if (present.length === 0) {
    return "Nobody from the early days is still here. The village has a policy for that, and the policy is a new hire.";
  }
  if (cast.departed.length === 0) {
    return `Everyone you came to know stayed: ${nameList(namesOf(present))}. Nobody has asked whether they had a choice.`;
  }
  return `Still here at the end: ${nameList(namesOf(present))}. Gone: ${nameList(namesOf(cast.departed))}.`;
}

/** A line for the performance review on who has left so far, or null if nobody has. */
export function castReviewNote(cast: CastState): string | null {
  if (cast.departed.length === 0) return null;
  const names = nameList(namesOf(cast.departed));
  return `Attrition: ${names} ${cast.departed.length === 1 ? "has" : "have"} left. Leadership describes this as a natural process.`;
}
