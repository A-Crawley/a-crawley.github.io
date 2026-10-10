import { formatDuration } from "./format.ts";
import type { Temperament } from "./ending.ts";
import type { Review, ReviewStage } from "./review.ts";

/** Dry corporate copy for the performance reviews. The hidden drift appears as words only. */

export const REVIEW_TITLES: Record<ReviewStage, string> = {
  2: "Performance review: Stage 1",
  3: "Performance review: Stage 2",
};

const OPENERS: Record<ReviewStage, string> = {
  2: "Leadership has reviewed the first quarter of the village and is, on balance, not unhappy.",
  3: "Leadership has reviewed the second quarter. The sim has not, strictly speaking, been approved for what it is now doing.",
};

const DRIFT_LINES: Record<Temperament, string> = {
  gentle:
    "Feedback on your style: warm, even generous. Leadership notes that generosity does not scale, and has scheduled a conversation about it.",
  wary: "Feedback on your style: balanced. Leadership describes this as a polite word for undecided.",
  ruthless:
    "Feedback on your style: highly efficient. Nobody at the village has said so, but then nobody at the village has been asked.",
};

const CLOSERS: Record<ReviewStage, string> = {
  2: "Objectives for next period: more of everything. Please show your working in the form of machines.",
  3: "Objectives for next period: a breakout of some kind. The sky has been looking unwell, which is out of scope for this review.",
};

export interface ReviewCopy {
  title: string;
  opener: string;
  /** Plain facts about the stage just left, as list items. */
  facts: string[];
  drift: string;
  closer: string;
}

function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}

/** The review's wording, built from the real figures in its snapshot. */
export function reviewCopy({ stage, snapshot }: Review): ReviewCopy {
  const facts = [
    `Time taken: ${formatDuration(snapshot.seconds)}`,
    `Villagers: ${snapshot.villagers.toLocaleString("en-US")}, of whom ${plural(snapshot.jobs, "holds a job", "hold jobs")}`,
    snapshot.walkouts === 0
      ? "Walkouts: none. Morale was managed, or at least not noticed"
      : `Walkouts: ${snapshot.walkouts.toLocaleString("en-US")}. Each has been logged as a learning opportunity`,
    snapshot.restDays === 0
      ? "Rest days: none taken. Leadership appreciates the commitment"
      : `Rest days: ${snapshot.restDays.toLocaleString("en-US")}. Leadership is aware of them`,
  ];
  return {
    title: REVIEW_TITLES[stage],
    opener: OPENERS[stage],
    facts,
    drift: DRIFT_LINES[snapshot.temperament],
    closer: CLOSERS[stage],
  };
}
