import { CONFIG, VILLAGE } from "./config.ts";
import { ratesFor, step, upkeepPerSecond } from "./engine.ts";
import { logLines } from "./log.ts";
import { catchUp } from "./offline.ts";
import {
  nextSeason,
  SEASON_NOTES,
  SEASONS,
  seasonEffects,
  seasonOf,
  secondsToNextSeason,
} from "./seasons.ts";
import { withSettled } from "./settle.ts";
import { createGameState } from "./state.ts";
import type { GameState } from "./state.ts";

const { startAt, seconds, effects } = CONFIG.seasons;
const START = 1_700_000_000_000;
const inSeason = (index: number, into = 1) => startAt + index * seconds + into;

function village(time: number, change: (s: GameState) => void = () => {}): GameState {
  const state = createGameState(START);
  state.time = time;
  state.owned.forager = 20;
  state.owned.woodcutter = 10;
  state.owned.granary = 50;
  state.population = 30;
  state.owned.house = 2;
  state.events.nextAt = Infinity;
  change(state);
  return state;
}

describe("which season it is", () => {
  it("is none before the cycle begins, then follows the cycle in order and repeats", () => {
    expect(seasonOf(0)).toBeNull();
    expect(seasonOf(startAt - 1)).toBeNull();
    expect(SEASONS.map((_, i) => seasonOf(inSeason(i)))).toEqual([
      "spring",
      "summer",
      "autumn",
      "winter",
    ]);
    expect(seasonOf(inSeason(4))).toBe("spring");
    expect(seasonOf(inSeason(9))).toBe("summer");
  });

  it("changes exactly on the boundary", () => {
    expect(seasonOf(startAt + seconds - 0.001)).toBe("spring");
    expect(seasonOf(startAt + seconds)).toBe("summer");
  });
});

describe("the forecast", () => {
  it("counts down to the next season and names it", () => {
    expect(secondsToNextSeason(inSeason(0, 0))).toBe(seconds);
    expect(secondsToNextSeason(inSeason(0, seconds - 90))).toBe(90);
    expect(nextSeason(inSeason(0))).toBe("summer");
    expect(nextSeason(inSeason(3))).toBe("spring");
  });

  it("counts down to the first spring before the cycle", () => {
    expect(secondsToNextSeason(startAt - 30)).toBe(30);
    expect(nextSeason(0)).toBe("spring");
  });

  it("has a note for every season", () => {
    for (const season of SEASONS) expect(SEASON_NOTES[season].length).toBeGreaterThan(5);
  });
});

describe("what a season does", () => {
  it("does nothing before the cycle begins", () => {
    expect(seasonEffects(0)).toEqual({ food: 1, wood: 1, upkeep: 1, arrival: 1 });
  });

  it("makes summer food richer and autumn wood richer", () => {
    const spring = ratesFor(village(inSeason(0)), undefined, false);
    const summer = ratesFor(village(inSeason(1)), undefined, false);
    const autumn = ratesFor(village(inSeason(2)), undefined, false);
    expect(summer.food / spring.food).toBeCloseTo(effects.summer.food, 6);
    expect(summer.wood).toBeCloseTo(spring.wood, 6);
    expect(autumn.wood / spring.wood).toBeCloseTo(effects.autumn.wood, 6);
    expect(autumn.food).toBeCloseTo(spring.food, 6);
  });

  it("makes the villagers eat more in winter, and only in winter", () => {
    const base = upkeepPerSecond(village(inSeason(0)));
    expect(upkeepPerSecond(village(inSeason(3)))).toBeCloseTo(base * effects.winter.upkeep, 6);
    expect(upkeepPerSecond(village(inSeason(1)))).toBeCloseTo(base, 6);
  });

  it("brings villagers in faster in spring and slower in winter", () => {
    function arrivals(time: number): number {
      const state = village(time, (s) => {
        s.population = 5;
        s.owned.house = 5;
        s.owned.hut = 5;
        s.owned.forager = 3;
        s.food = 1000;
        s.arrivalTimer = 0;
      });
      for (let i = 0; i < 60; i++) {
        state.time = time + i;
        step(state, 1, false, false);
      }
      return state.population - 5;
    }
    const spring = arrivals(inSeason(0));
    const summer = arrivals(inSeason(1));
    const winter = arrivals(inSeason(3));
    expect(spring).toBeGreaterThan(summer);
    expect(winter).toBeLessThan(summer);
    expect(winter).toBeGreaterThan(0);
  });

  it("is close to neutral over a whole year", () => {
    let food = 0;
    let wood = 0;
    for (const season of SEASONS) {
      food += effects[season].food;
      wood += effects[season].wood;
    }
    expect(food / 4).toBeLessThan(1.1);
    expect(wood / 4).toBeLessThan(1.1);
  });
});

describe("winter does not starve a village that was fed", () => {
  it("stays fed through a winter when it had a margin", () => {
    const state = village(inSeason(3, 0), (s) => {
      s.food = 300;
      s.owned.forager = 20;
      s.population = 20;
      s.owned.hut = 4;
    });
    for (let i = 0; i < seconds; i++) step(state, 1, false, true);
    expect(state.shortfallSeconds).toBe(0);
    expect(state.population).toBeGreaterThanOrEqual(20);
  });

  it("uses VILLAGE upkeep as its base", () => {
    const state = village(inSeason(0));
    expect(upkeepPerSecond(state)).toBeCloseTo(state.population * VILLAGE.upkeepPerVillager);
  });
});

describe("the log", () => {
  it("notes the start of the seasons, once, and the first winter", () => {
    expect(logLines(withSettled(village(10))).some((l) => l.id === "unlock:seasons")).toBe(false);
    const spring = withSettled(village(inSeason(0)));
    expect(spring.unlocked).toContain("seasons");
    expect(spring.unlocked).not.toContain("firstWinter");
    const winter = withSettled(village(inSeason(3)));
    expect(winter.unlocked).toContain("firstWinter");
    expect(logLines(winter).filter((l) => l.id === "unlock:firstWinter")).toHaveLength(1);
  });
});

describe("away", () => {
  it("lets the seasons turn while the player is away, by the time credited", () => {
    const state = village(0, (s) => (s.food = 100));
    const { state: after } = catchUp(state, START + 2 * 3600 * 1000);
    expect(after.time).toBeCloseTo(2 * 3600 * CONFIG.offlineRate, 3);
    expect(seasonOf(after.time)).not.toBeNull();
  });
});
