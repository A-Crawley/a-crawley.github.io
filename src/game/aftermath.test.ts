import { AFTERMATH_DELAY, aftermathLines, BEATS, beatsAreValid } from "./aftermath.ts";
import { EVENTS, eventDef } from "./events.ts";
import type { EventId } from "./events.ts";
import { logLines } from "./log.ts";
import { catchUp } from "./offline.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";

const START = 1_700_000_000_000;

/** A state whose answered events are exactly these, in order. */
function answered(...entries: Array<[EventId, string, boolean?]>): GameState {
  const state = createGameState(START);
  state.events.resolved = entries.map(([id, choice, auto]) => ({
    id,
    choice,
    auto: auto ?? false,
  }));
  state.events.nextAt = 1e9;
  return state;
}

/** Two unrelated, answered events: enough to carry a beat past its delay. */
const FILLER: Array<[EventId, string]> = [
  ["skyWatcher", "listen"],
  ["overflowingStore", "feast"],
];

describe("the beats", () => {
  it("number between four and six, each tied to a real event and choice", () => {
    expect(BEATS.length).toBeGreaterThanOrEqual(4);
    expect(BEATS.length).toBeLessThanOrEqual(6);
    expect(beatsAreValid()).toBe(true);
  });

  it("belong to different events, so one answer earns at most one beat", () => {
    expect(new Set(BEATS.map((b) => b.event)).size).toBe(BEATS.length);
    for (const beat of BEATS) expect(EVENTS.some((e) => e.id === beat.event)).toBe(true);
  });

  it("are dry: short, one sentence or two, no exclamation marks", () => {
    for (const beat of BEATS) {
      expect(beat.text.length).toBeLessThan(180);
      expect(beat.text).not.toContain("!");
    }
  });
});

describe("when a beat appears", () => {
  const beat = BEATS[1];

  it("not at once, and not before the delay has passed", () => {
    for (let after = 0; after < AFTERMATH_DELAY; after++) {
      const state = answered([beat.event, beat.choice], ...FILLER.slice(0, after));
      expect(aftermathLines(state)).toEqual([]);
    }
  });

  it("once the delay has passed", () => {
    const state = answered([beat.event, beat.choice], ...FILLER.slice(0, AFTERMATH_DELAY));
    expect(aftermathLines(state)).toEqual([{ id: `aftermath:${beat.event}`, text: beat.text }]);
  });

  it("only for the choice that earned it", () => {
    const other = eventDef(beat.event).choices.find((c) => c.id !== beat.choice);
    expect(other).toBeDefined();
    const state = answered([beat.event, other!.id], ...FILLER);
    expect(aftermathLines(state)).toEqual([]);
  });

  it("never when the event was not answered", () => {
    expect(aftermathLines(answered(...FILLER))).toEqual([]);
    expect(aftermathLines(createGameState(START))).toEqual([]);
  });

  it("also when nobody answered and the choice was made for the village", () => {
    const state = answered([beat.event, beat.choice, true], ...FILLER);
    expect(aftermathLines(state)).toHaveLength(1);
  });

  it("each beat shows once, in the order the events were answered", () => {
    const entries = BEATS.map((b): [EventId, string] => [b.event, b.choice]);
    const state = answered(...entries, ...FILLER);
    const lines = aftermathLines(state);
    // The last beats have fewer than two events after them, apart from the filler.
    expect(lines.map((l) => l.id)).toEqual(BEATS.map((b) => `aftermath:${b.event}`));
    expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
  });
});

describe("in the log", () => {
  it("shows up after the answers, with its own id, and never twice", () => {
    const beat = BEATS[0];
    const state = answered([beat.event, beat.choice], ...FILLER);
    const lines = logLines(state);
    const ids = lines.map((l) => l.id);
    expect(ids).toContain(`aftermath:${beat.event}`);
    expect(ids.indexOf(`aftermath:${beat.event}`)).toBeGreaterThan(
      ids.indexOf(`event:${beat.event}`),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("while away", () => {
  it("a long absence adds no beat twice, and changes nothing a beat depends on", () => {
    const beat = BEATS[2];
    const state = answered([beat.event, beat.choice], ...FILLER);
    const before = aftermathLines(state).map((l) => l.id);
    const { state: after } = catchUp(state, START + 4 * 60 * 60 * 1000);
    const ids = logLines(after).map((l) => l.id);
    expect(before).toEqual([`aftermath:${beat.event}`]);
    expect(ids.filter((id) => id === `aftermath:${beat.event}`)).toHaveLength(1);
    // Events wait while the player is away, so away time cannot answer any for them.
    expect(after.events.resolved.length).toBeLessThanOrEqual(state.events.resolved.length + 1);
  });
});
