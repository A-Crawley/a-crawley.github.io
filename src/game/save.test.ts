import { CONFIG, ITEMS } from "./config.ts";
import { bedsOf } from "./engine.ts";
import {
  exportSave,
  importSave,
  MAX_SAVE_LENGTH,
  migrateSave,
  parseSave,
  serializeState,
  validateState,
} from "./save.ts";
import { createGameState, STATE_VERSION } from "./state.ts";
import type { GameState } from "./state.ts";

function playedState(): GameState {
  const state = createGameState(1_700_000_000_123);
  state.time = 4321.5;
  state.stage = 2;
  state.food = 1234.56;
  state.wood = 99;
  state.infra = 14000;
  state.morale = 61.25;
  state.drift = -820.5;
  state.owned.forager = 40;
  state.owned.autoForager = 3;
  state.owned.research = 7;
  state.policies.extendedShifts = true;
  state.restUntil = 4300;
  state.walkouts = 2;
  state.restDays = 5;
  return state;
}

/** A save as a plain object, for building damaged variants. */
function raw(): Record<string, unknown> {
  return JSON.parse(serializeState(playedState()));
}

describe("saving and loading", () => {
  it("round-trips a played game exactly, including the timestamp", () => {
    const state = playedState();
    const result = parseSave(serializeState(state));
    expect(result).toEqual({ ok: true, value: state });
  });

  it("round-trips through the Base64 export", () => {
    const state = playedState();
    const result = importSave(exportSave(state));
    expect(result).toEqual({ ok: true, value: state });
  });

  it("round-trips a brand new game", () => {
    const state = createGameState(5);
    expect(importSave(exportSave(state))).toEqual({ ok: true, value: state });
  });

  it("exports plain Base64 text that is safe to paste anywhere", () => {
    expect(exportSave(playedState())).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("ignores spaces and newlines around a pasted save", () => {
    const text = exportSave(playedState());
    expect(importSave(`  \n${text}\n `).ok).toBe(true);
  });
});

describe("version migration", () => {
  it("upgrades an old save one version at a time", () => {
    const old = { version: 1, coins: 5 };
    const migrations = {
      1: (save: Record<string, unknown>) => ({ ...save, version: 2, gold: save.coins }),
      2: (save: Record<string, unknown>) => ({ ...save, version: 3, gold: Number(save.gold) * 10 }),
    };
    const result = migrateSave(old, migrations, 3);
    expect(result).toEqual({ ok: true, value: { version: 3, coins: 5, gold: 50 } });
  });

  it("leaves a save that is already current alone", () => {
    const save = { version: 4, a: 1 };
    expect(migrateSave(save, {}, 4)).toEqual({ ok: true, value: save });
  });

  it("rejects a save from a newer version of the game", () => {
    const result = migrateSave({ version: STATE_VERSION + 1 });
    expect(result.ok).toBe(false);
  });

  it("rejects an old save when there is no migration for it", () => {
    expect(migrateSave({ version: 1 }, {}, 2).ok).toBe(false);
  });

  it("rejects a migration that does not advance the version", () => {
    const result = migrateSave({ version: 1 }, { 1: (save) => save }, 2);
    expect(result.ok).toBe(false);
  });

  it("rejects saves with a missing or silly version", () => {
    for (const version of [undefined, "1", 0, -1, 1.5, null]) {
      expect(migrateSave({ version }).ok).toBe(false);
    }
  });

  it("rejects things that are not objects", () => {
    for (const value of [null, 7, "save", [1, 2]]) {
      expect(migrateSave(value).ok).toBe(false);
    }
  });
});

describe("rejecting corrupt saves", () => {
  it("rejects text that is not Base64", () => {
    expect(importSave("this is not a save!!").ok).toBe(false);
  });

  it("rejects Base64 that is not JSON", () => {
    expect(importSave(btoa("hello there")).ok).toBe(false);
  });

  it("rejects an empty paste", () => {
    expect(importSave("   ")).toEqual({ ok: false, error: "Paste a save first." });
  });

  it("rejects an enormous paste without trying to read it", () => {
    expect(importSave("A".repeat(MAX_SAVE_LENGTH + 1)).ok).toBe(false);
  });

  it("rejects a cut-off save", () => {
    const text = exportSave(playedState());
    expect(importSave(text.slice(0, text.length - 20)).ok).toBe(false);
  });

  it("rejects bytes that are not valid text", () => {
    expect(importSave(btoa(String.fromCharCode(0xff, 0xfe, 0xfd))).ok).toBe(false);
  });

  it("rejects JSON that is not a game save", () => {
    expect(parseSave('{"hello":"world"}').ok).toBe(false);
    expect(parseSave("[]").ok).toBe(false);
    expect(parseSave("null").ok).toBe(false);
  });

  it("rejects each kind of damaged field", () => {
    const damage: Array<[string, (save: Record<string, unknown>) => void]> = [
      ["unknown stage", (s) => (s.stage = 4)],
      ["stage as text", (s) => (s.stage = "2")],
      ["negative food", (s) => (s.food = -1)],
      ["food as text", (s) => (s.food = "lots")],
      ["missing wood", (s) => delete s.wood],
      ["morale over 100", (s) => (s.morale = 101)],
      ["morale below 0", (s) => (s.morale = -5)],
      ["drift as text", (s) => (s.drift = "x")],
      ["missing timestamp", (s) => delete s.lastTickAt],
      ["owned missing", (s) => delete s.owned],
      ["fractional count", (s) => ((s.owned as Record<string, number>).forager = 1.5)],
      ["negative count", (s) => ((s.owned as Record<string, number>).builder = -1)],
      ["missing item", (s) => delete (s.owned as Record<string, number>).research],
      ["policies missing", (s) => delete s.policies],
      ["policy as text", (s) => ((s.policies as Record<string, unknown>).extendedShifts = "yes")],
    ];
    for (const [name, apply] of damage) {
      const save = raw();
      apply(save);
      const result = validateState(save);
      expect(result.ok, name).toBe(false);
    }
  });

  it("rejects numbers JSON cannot carry, which arrive as null", () => {
    const save = raw();
    save.food = null;
    expect(validateState(save).ok).toBe(false);
  });

  it("explains what is wrong in plain words", () => {
    const save = raw();
    save.morale = 500;
    const result = validateState(save);
    expect(result).toEqual({ ok: false, error: "The save is damaged (morale)." });
  });
});

describe("validation", () => {
  it("covers every item the game sells", () => {
    const save = raw();
    const owned = save.owned as Record<string, number>;
    for (const { id } of ITEMS) expect(owned[id]).toBeDefined();
    expect(validateState(save).ok).toBe(true);
  });

  it("drops fields it does not know about", () => {
    const save = raw();
    save.cheat = 1e9;
    const result = validateState(save);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).not.toHaveProperty("cheat");
  });

  it("allows a negative drift, which is the efficient side", () => {
    const save = raw();
    save.drift = -5000;
    expect(validateState(save).ok).toBe(true);
  });
});

describe("unlocks in a save", () => {
  it("round-trips the unlocks, in order", () => {
    const state = playedState();
    state.unlocked = ["item:forager", "morale", "lookUp", "lookedUp"];
    expect(parseSave(serializeState(state))).toEqual({ ok: true, value: state });
  });

  it("upgrades a version 1 save by starting with no unlocks", () => {
    const old: Record<string, unknown> = { ...raw(), version: 1 };
    delete old.unlocked;
    const result = parseSave(JSON.stringify(old));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.version).toBe(STATE_VERSION);
      expect(result.value.unlocked).toEqual([]);
      expect(result.value.owned.forager).toBe(40);
    }
  });

  it("rejects unlocks that are missing, not a list, unknown or repeated", () => {
    for (const unlocked of [undefined, "lookUp", 3, ["nonsense"], ["lookUp", "lookUp"], [1]]) {
      const save = { ...raw(), unlocked };
      expect(validateState(save).ok).toBe(false);
    }
  });
});

describe("the ending in a save", () => {
  function finishedState(): GameState {
    const state = playedState();
    state.stage = 3;
    state.owned.exploit = CONFIG.exploitsGoal;
    return state;
  }

  it("round-trips each ending", () => {
    for (const ending of ["conquest", "apocalypse"] as const) {
      const state = finishedState();
      state.ending = ending;
      expect(parseSave(serializeState(state))).toEqual({ ok: true, value: state });
    }
  });

  it("upgrades a version 2 save by starting with no ending", () => {
    const old: Record<string, unknown> = { ...raw(), version: 2 };
    delete old.ending;
    const result = parseSave(JSON.stringify(old));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.version).toBe(STATE_VERSION);
      expect(result.value.ending).toBeNull();
    }
  });

  it("rejects an ending that is missing, unknown, or from a run that has not finished", () => {
    const early = { ...raw(), ending: "conquest" };
    expect(validateState(early).ok).toBe(false);
    const finishedSave = JSON.parse(serializeState(finishedState())) as Record<string, unknown>;
    for (const ending of [undefined, "victory", 1]) {
      expect(validateState({ ...finishedSave, ending }).ok).toBe(false);
    }
  });
});

describe("achievements in a save", () => {
  it("round-trips them, in order", () => {
    const state = playedState();
    state.achievements = ["first-hire", "ten-foragers", "stage-two"];
    expect(parseSave(serializeState(state))).toEqual({ ok: true, value: state });
  });

  it("upgrades a version 3 save by starting with none", () => {
    const old: Record<string, unknown> = { ...raw(), version: 3 };
    delete old.achievements;
    const result = parseSave(JSON.stringify(old));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.version).toBe(STATE_VERSION);
      expect(result.value.achievements).toEqual([]);
    }
  });

  it("rejects achievements that are missing, not a list, unknown or repeated", () => {
    for (const achievements of [
      undefined,
      "first-hire",
      3,
      ["nope"],
      ["first-hire", "first-hire"],
    ]) {
      expect(validateState({ ...raw(), achievements }).ok).toBe(false);
    }
  });
});

describe("villagers in a save", () => {
  it("round-trips the population", () => {
    const state = playedState();
    state.population = 42;
    state.arrivalTimer = 2.5;
    expect(parseSave(serializeState(state))).toEqual({ ok: true, value: state });
  });

  it("upgrades a version 4 save with room for everyone it already employs", () => {
    const old: Record<string, unknown> = { ...raw(), version: 4 };
    delete old.population;
    delete old.arrivalTimer;
    const owned: Record<string, number> = {
      ...(old.owned as Record<string, number>),
      forager: 60,
      woodcutter: 40,
    };
    delete owned.hut;
    delete owned.house;
    old.owned = owned;
    const result = parseSave(JSON.stringify(old));
    expect(result.ok).toBe(true);
    if (result.ok) {
      const { value } = result;
      expect(value.version).toBe(STATE_VERSION);
      // Everyone with a job is a villager, plus a couple of spare hands.
      expect(value.population).toBeGreaterThanOrEqual(102);
      expect(value.owned.hut).toBe(0);
      expect(bedsOf(value.owned)).toBeGreaterThanOrEqual(value.population);
    }
  });

  it("gives a small old save the starting village", () => {
    const old: Record<string, unknown> = { ...raw(), version: 4 };
    delete old.population;
    delete old.arrivalTimer;
    const owned = { ...(old.owned as Record<string, number>) };
    delete owned.hut;
    delete owned.house;
    old.owned = { ...owned, forager: 0, woodcutter: 0, builder: 0 };
    const result = parseSave(JSON.stringify(old));
    expect(result.ok && result.value.population).toBe(3);
  });

  it("rejects a population that is missing, fractional or negative", () => {
    for (const population of [undefined, 2.5, -1, "3"]) {
      expect(validateState({ ...raw(), population }).ok).toBe(false);
    }
  });
});

describe("hunger in a save", () => {
  it("round-trips how long the village has been hungry", () => {
    const state = playedState();
    state.shortfallSeconds = 17;
    expect(parseSave(serializeState(state))).toEqual({ ok: true, value: state });
  });

  it("upgrades a version 5 save as fed", () => {
    const old: Record<string, unknown> = { ...raw(), version: 5 };
    delete old.shortfallSeconds;
    const result = parseSave(JSON.stringify(old));
    expect(result.ok && result.value.shortfallSeconds).toBe(0);
    expect(result.ok && result.value.version).toBe(STATE_VERSION);
  });

  it("rejects a hunger count that is missing or negative", () => {
    for (const shortfallSeconds of [undefined, -1, "5"]) {
      expect(validateState({ ...raw(), shortfallSeconds }).ok).toBe(false);
    }
  });
});

describe("storage in a save", () => {
  it("upgrades a version 6 save with no storage built", () => {
    const old = { ...raw(), version: 6 } as Record<string, unknown>;
    const owned = { ...(old.owned as Record<string, number>) };
    delete owned.granary;
    delete owned.woodshed;
    old.owned = owned;
    const result = parseSave(JSON.stringify(old));
    expect(result.ok && result.value.owned.granary).toBe(0);
    expect(result.ok && result.value.owned.woodshed).toBe(0);
    expect(result.ok && result.value.version).toBe(STATE_VERSION);
  });
});

describe("displaced workers in a save", () => {
  it("upgrades a version 7 save with nobody retrained, redeployed or released", () => {
    const old: Record<string, unknown> = { ...raw(), version: 7 };
    delete old.operators;
    delete old.redeployed;
    delete old.released;
    const result = parseSave(JSON.stringify(old));
    expect(
      result.ok && [result.value.operators, result.value.redeployed, result.value.released],
    ).toEqual([0, 0, 0]);
  });

  it("round-trips the counts and rejects a negative one", () => {
    const state = playedState();
    state.operators = 3;
    state.redeployed = 5;
    state.released = 2;
    expect(parseSave(serializeState(state))).toEqual({ ok: true, value: state });
    expect(validateState({ ...raw(), operators: -1 }).ok).toBe(false);
  });
});
