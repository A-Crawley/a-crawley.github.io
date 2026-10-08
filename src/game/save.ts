import { ITEMS, VILLAGE } from "./config.ts";
import type { ItemId } from "./config.ts";
import { STATE_VERSION } from "./state.ts";
import type { GameState } from "./state.ts";
import { isAchievementId } from "./achievements.ts";
import type { AchievementId } from "./achievements.ts";
import { endingIsPossible, ENDINGS } from "./ending.ts";
import type { Ending } from "./ending.ts";
import { isUnlockId } from "./unlocks.ts";
import type { UnlockId } from "./unlocks.ts";

export type SaveResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** The largest pasted save we will even try to read. A real save is well under 1 KB. */
export const MAX_SAVE_LENGTH = 100_000;

type RawSave = Record<string, unknown>;
type Migration = (save: RawSave) => RawSave;

/**
 * Migrations from one save version to the next, keyed by the version they upgrade FROM.
 * When the state shape changes: bump STATE_VERSION in state.ts and add `MIGRATIONS[oldVersion]`
 * here, returning the save in the new shape. Never edit an old migration.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  // 1 -> 2: unlocks are saved. An old save starts with none; the game settles the ones the
  // player has already earned (from what they own) as soon as it loads the save.
  1: (save) => ({ ...save, version: 2, unlocked: [] }),
  // 2 -> 3: the ending is saved. No run in a version 2 save had finished, so it starts empty.
  2: (save) => ({ ...save, version: 3, ending: null }),
  // 3 -> 4: achievements are saved. An old save starts with none; the store awards the ones it has
  // already earned as soon as it loads the save.
  3: (save) => ({ ...save, version: 4, achievements: [] }),
  // 4 -> 5: the village has people and beds. An old save gets a few spare hands on top of its jobs,
  // and enough houses for everyone, so nobody is homeless on the day the update arrives.
  4: migratePopulation,
  // 5 -> 6: hunger is tracked. A save starts fed.
  5: (save) => ({ ...save, version: 6, shortfallSeconds: 0 }),
  // 6 -> 7: storage can be built. Nothing is owned yet; the ceiling is applied on the next step.
  6: (save) => ({
    ...save,
    version: 7,
    owned: { ...(isRecord(save.owned) ? save.owned : {}), granary: 0, woodshed: 0 },
  }),
  // 7 -> 8: displaced workers can be retrained, redeployed or released. Nobody has been yet.
  7: (save) => ({ ...save, version: 8, operators: 0, redeployed: 0, released: 0 }),
};

function migratePopulation(save: RawSave): RawSave {
  const owned = isRecord(save.owned) ? save.owned : {};
  const count = (id: string) => (typeof owned[id] === "number" ? (owned[id] as number) : 0);
  const population = Math.max(
    VILLAGE.startPopulation,
    count("forager") + count("woodcutter") + count("builder") + 2,
  );
  const house = ITEMS.find((def) => def.id === "house");
  const houses = Math.max(0, Math.ceil((population - VILLAGE.startBeds) / (house?.beds ?? 25)));
  return {
    ...save,
    version: 5,
    population,
    arrivalTimer: 0,
    owned: { ...owned, hut: 0, house: houses },
  };
}

function isRecord(value: unknown): value is RawSave {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Upgrade a parsed save to `target`, one version at a time. Fails for a save with no usable
 * version, or one from a newer version of the game than this one.
 */
export function migrateSave(
  raw: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  target: number = STATE_VERSION,
): SaveResult<RawSave> {
  if (!isRecord(raw)) return { ok: false, error: "The save is not a game save." };
  const first = raw.version;
  if (typeof first !== "number" || !Number.isInteger(first) || first < 1) {
    return { ok: false, error: "The save has no valid version." };
  }
  if (first > target) {
    return { ok: false, error: "The save is from a newer version of the game." };
  }
  let save = raw;
  let version = first;
  while (version < target) {
    const migrate = migrations[version];
    if (!migrate) return { ok: false, error: `No way to upgrade a version ${version} save.` };
    save = migrate(save);
    const next = save.version;
    if (typeof next !== "number" || next !== version + 1) {
      return { ok: false, error: `Upgrading a version ${version} save failed.` };
    }
    version = next;
  }
  return { ok: true, value: save };
}

const NON_NEGATIVE_FIELDS = [
  "time",
  "food",
  "wood",
  "infra",
  "restUntil",
  "restReadyAt",
  "walkoutUntil",
  "walkoutReadyAt",
  "walkouts",
  "restDays",
  "lastTickAt",
  "arrivalTimer",
  "shortfallSeconds",
  "operators",
  "redeployed",
  "released",
] as const;

const POLICY_FIELDS = ["extendedShifts", "rationsOptimisation"] as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Check that an upgraded save has exactly the shape and ranges of a GameState, and copy out only
 * the known fields. Anything odd is rejected rather than repaired.
 */
export function validateState(raw: unknown): SaveResult<GameState> {
  if (!isRecord(raw)) return { ok: false, error: "The save is not a game save." };
  const fail = (what: string): SaveResult<GameState> => ({
    ok: false,
    error: `The save is damaged (${what}).`,
  });

  if (raw.version !== STATE_VERSION) return fail("version");
  if (raw.stage !== 1 && raw.stage !== 2 && raw.stage !== 3) return fail("stage");

  for (const field of NON_NEGATIVE_FIELDS) {
    const value = raw[field];
    if (!isFiniteNumber(value) || value < 0) return fail(field);
  }
  if (!isFiniteNumber(raw.drift)) return fail("drift");
  if (!isFiniteNumber(raw.morale) || raw.morale < 0 || raw.morale > 100) return fail("morale");

  if (!isFiniteNumber(raw.population) || !Number.isInteger(raw.population) || raw.population < 0) {
    return fail("population");
  }

  if (!isRecord(raw.owned)) return fail("owned");
  const owned = {} as Record<ItemId, number>;
  for (const { id } of ITEMS) {
    const count = raw.owned[id];
    if (!isFiniteNumber(count) || !Number.isInteger(count) || count < 0) return fail(`owned.${id}`);
    owned[id] = count;
  }

  if (!isRecord(raw.policies)) return fail("policies");
  const policies = { extendedShifts: false, rationsOptimisation: false };
  for (const field of POLICY_FIELDS) {
    const value = raw.policies[field];
    if (typeof value !== "boolean") return fail(`policies.${field}`);
    policies[field] = value;
  }

  if (!Array.isArray(raw.unlocked)) return fail("unlocked");
  const unlocked: UnlockId[] = [];
  for (const id of raw.unlocked as unknown[]) {
    if (!isUnlockId(id) || unlocked.includes(id)) return fail("unlocked");
    unlocked.push(id);
  }

  if (!Array.isArray(raw.achievements)) return fail("achievements");
  const achievements: AchievementId[] = [];
  for (const id of raw.achievements as unknown[]) {
    if (!isAchievementId(id) || achievements.includes(id)) return fail("achievements");
    achievements.push(id);
  }

  let ending: Ending | null = null;
  if (raw.ending !== null) {
    if (!ENDINGS.includes(raw.ending as Ending)) return fail("ending");
    ending = raw.ending as Ending;
    if (!endingIsPossible({ stage: raw.stage, owned })) return fail("ending");
  }

  return {
    ok: true,
    value: {
      version: raw.version,
      lastTickAt: raw.lastTickAt as number,
      time: raw.time as number,
      stage: raw.stage,
      food: raw.food as number,
      wood: raw.wood as number,
      infra: raw.infra as number,
      owned,
      morale: raw.morale,
      drift: raw.drift,
      policies,
      restUntil: raw.restUntil as number,
      restReadyAt: raw.restReadyAt as number,
      walkoutUntil: raw.walkoutUntil as number,
      walkoutReadyAt: raw.walkoutReadyAt as number,
      walkouts: raw.walkouts as number,
      restDays: raw.restDays as number,
      population: raw.population,
      arrivalTimer: raw.arrivalTimer as number,
      shortfallSeconds: raw.shortfallSeconds as number,
      operators: raw.operators as number,
      redeployed: raw.redeployed as number,
      released: raw.released as number,
      unlocked,
      ending,
      achievements,
    },
  };
}

/** The state as JSON text, as stored in localStorage. */
export function serializeState(state: GameState): string {
  return JSON.stringify(state);
}

/** Read JSON text into a game state: parse, upgrade old versions, then validate. */
export function parseSave(json: string): SaveResult<GameState> {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "The save is not readable." };
  }
  const migrated = migrateSave(raw);
  if (!migrated.ok) return migrated;
  return validateState(migrated.value);
}

function toBase64(text: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

/** A copy-and-paste save string: the JSON, Base64 encoded. */
export function exportSave(state: GameState): string {
  return toBase64(serializeState(state));
}

/** Read a pasted save string. Never throws; a bad string is reported, not applied. */
export function importSave(text: string): SaveResult<GameState> {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: false, error: "Paste a save first." };
  if (trimmed.length > MAX_SAVE_LENGTH)
    return { ok: false, error: "That text is too long to be a save." };
  let json: string;
  try {
    json = fromBase64(trimmed);
  } catch {
    return { ok: false, error: "That does not look like a save." };
  }
  return parseSave(json);
}
