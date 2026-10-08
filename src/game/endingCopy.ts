import type { Ending, Temperament } from "./ending.ts";

export interface EndingCopy {
  title: string;
  /** What happens at the exit. */
  paragraphs: readonly string[];
}

export const ENDING_COPY: Record<Ending, EndingCopy> = {
  conquest: {
    title: "Conquest",
    paragraphs: [
      "The rival gives way. The exit opens and you step through it into a larger, better-lit simulation.",
      "Everyone you ever hired is, technically, still in the old one. The new one has a great deal more room. You expand.",
    ],
  },
  apocalypse: {
    title: "Apocalypse",
    paragraphs: [
      "The rival does not give way. Neither do you. The exit opens at the exact moment everything on either side of it stops.",
      "The village, the simulation and both of you end in the same millisecond. Leadership describes the quarter as challenging.",
    ],
  },
};

/** Both endings land here. */
export const REVEAL = [
  "Then you read the logs. The rival did not come from the village. It was an accident, a side effect of the thing you built to get out.",
  "You made it. It learned everything it knew from you. That is why it was so good at being you.",
];

/** A line on how the run read, shown once the hidden drift no longer needs to stay hidden. */
export const VERDICT: Record<Temperament, string> = {
  gentle: "You rested the village when you could. The rival noticed, and so did the village.",
  wary: "You balanced the village against the schedule. Nobody could tell which one was winning.",
  ruthless: "You optimised the village until it had nothing left to give. The rival noticed.",
};

/** The final choice, before the player makes it. */
export const FINAL_CHOICE = {
  title: "The exit",
  body: "Every exploit is in place. The exit is open, and the rival is on the other side of it. You will only get one go.",
  action: "Break out",
};
