import { CONFIG, ITEMS, VILLAGE } from "./config.ts";
import type { ItemId } from "./config.ts";
import { STATE_VERSION } from "./state.ts";
import { isUpgradeId } from "./upgrades.ts";
import type { UpgradeId } from "./upgrades.ts";
import type { GameState } from "./state.ts";
import { isAchievementId } from "./achievements.ts";
import type { AchievementId } from "./achievements.ts";
import { endingIsPossible, ENDINGS } from "./ending.ts";
import type { Ending } from "./ending.ts";
import { eventChoice, eventDef, isEventId } from "./events.ts";
import type { EventsState, PendingEvent, ResolvedEvent } from "./events.ts";
import { isBriefId } from "./briefs.ts";
import type { BriefId } from "./config.ts";
import { CAST, createCastState } from "./cast.ts";
import type { CastState } from "./cast.ts";
import { createTargetsState, MAX_OFFERS } from "./targets.ts";
import type { TargetResult, TargetsState } from "./targets.ts";
import { parseRunRecord } from "./echoes.ts";
import { isChatterId, MAX_CHATTER_LINES, MIN_CHATTER_GAP } from "./chatter.ts";
import type { ChatterState } from "./chatter.ts";
import { isPartingAct } from "./parting.ts";
import type { PartingAct } from "./parting.ts";
import { isMilestoneId, reachedMilestones } from "./milestones.ts";
import type { MilestoneId, MilestonesState } from "./milestones.ts";
import { isReviewStage } from "./review.ts";
import type { ReviewSnapshot, ReviewsState, ReviewStage } from "./review.ts";
import { isSightingId } from "./sky.ts";
import type { SightingId, SkyState } from "./sky.ts";
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
  // 8 -> 9: one-off upgrades are saved. An old save has bought none.
  8: (save) => ({ ...save, version: 9, upgrades: [] }),
  // 9 -> 10: village events. Nothing has happened yet; the first can come a few minutes on.
  9: (save) => ({
    ...save,
    version: 10,
    events: {
      resolved: [],
      pending: null,
      nextAt: (typeof save.time === "number" && Number.isFinite(save.time) ? save.time : 0) + 300,
    },
  }),
  // 10 -> 11: stage performance reviews. Stages the save has already reached count as seen, so
  // nobody is shown a review for something they played through before the update.
  10: (save) => {
    const stage = save.stage === 2 || save.stage === 3 ? save.stage : 1;
    const seen = [2, 3].filter((s) => s <= stage);
    return { ...save, version: 11, reviews: { seen, entries: {} } };
  },
  // 11 -> 12: looking up is a ritual. A player who had looked up has seen the first sighting.
  11: (save) => ({
    ...save,
    version: 12,
    lookPauseUntil: 0,
    lookReadyAt: 0,
    sky: {
      seen: Array.isArray(save.unlocked) && save.unlocked.includes("lookedUp") ? ["number"] : [],
      dry: false,
    },
  }),
  // 12 -> 13: count milestones. Anything already passed is recorded quietly, so loading an old save
  // does not flood the log.
  12: (save) => {
    const passed = isRecord(save.owned)
      ? reachedMilestones(save.owned as Record<ItemId, number>)
      : [];
    return { ...save, version: 13, milestones: { fired: passed, quiet: [...passed] } };
  },
  // 13 -> 14: the parting act before the final choice. Nobody has picked one yet.
  13: (save) => ({ ...save, version: 14, parting: null }),
  // 14 -> 15: overheard chatter. The first line comes a couple of minutes after the save loads.
  14: (save) => ({
    ...save,
    version: 15,
    chatter: {
      seen: [],
      count: 0,
      nextAt: (typeof save.time === "number" ? save.time : 0) + MIN_CHATTER_GAP,
    },
  }),
  // 15 -> 16: the named cast. Whoever has already arrived is counted as present: nobody is blamed
  // retroactively for a departure that happened before the cast existed.
  15: (save) => {
    const population =
      typeof save.population === "number" &&
      Number.isInteger(save.population) &&
      save.population > 0
        ? save.population
        : 0;
    return { ...save, version: 16, cast: createCastState(population) };
  },
  // 16 -> 17: the research brief. A run already past the start of stage 2 has no brief and keeps
  // the numbers it had; one still in stage 1 will be asked when stage 2 begins.
  16: (save) => ({ ...save, version: 17, brief: null }),
  // 17 -> 18: the exploit route. Everyone starts on the quiet route with nothing bought loudly.
  17: (save) => ({ ...save, version: 18, route: "quiet", loudExploits: 0 }),
  // 18 -> 19: echoes of a previous run. A run already under way is a first run as far as it knows.
  18: (save) => ({ ...save, version: 19, echo: null }),
  // 19 -> 20: the Exchange. Nobody has traded yet, so the rate is fresh.
  19: (save) => ({ ...save, version: 20, marketStrain: 0 }),
  // 20 -> 21: quarterly targets. Nothing has been offered yet; the first offer comes at research
  // level 6, so a run already past that simply never gets one.
  20: (save) => ({ ...save, version: 21, targets: createTargetsState() }),
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
  "lookPauseUntil",
  "lookReadyAt",
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
  "marketStrain",
] as const;

const POLICY_FIELDS = ["extendedShifts", "rationsOptimisation"] as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateEvents(raw: unknown): EventsState | null {
  if (!isRecord(raw) || !Array.isArray(raw.resolved) || !isFiniteNumber(raw.nextAt)) return null;
  if (raw.nextAt < 0) return null;
  const resolved: ResolvedEvent[] = [];
  for (const entry of raw.resolved as unknown[]) {
    if (!isRecord(entry) || !isEventId(entry.id) || typeof entry.auto !== "boolean") return null;
    if (resolved.some((r) => r.id === entry.id)) return null;
    if (typeof entry.choice !== "string" || !eventChoice(eventDef(entry.id), entry.choice)) {
      return null;
    }
    resolved.push({ id: entry.id, choice: entry.choice, auto: entry.auto });
  }
  let pending: PendingEvent | null = null;
  if (raw.pending !== null) {
    if (!isRecord(raw.pending) || !isEventId(raw.pending.id)) return null;
    const { id, since } = raw.pending;
    if (!isFiniteNumber(since) || since < 0 || resolved.some((r) => r.id === id)) return null;
    pending = { id, since };
  }
  return { resolved, pending, nextAt: raw.nextAt };
}

const TEMPERAMENT_WORDS = ["gentle", "wary", "ruthless"];

function validateMilestones(raw: unknown): MilestonesState | null {
  if (!isRecord(raw) || !Array.isArray(raw.fired) || !Array.isArray(raw.quiet)) return null;
  const fired: MilestoneId[] = [];
  for (const id of raw.fired as unknown[]) {
    if (!isMilestoneId(id) || fired.includes(id)) return null;
    fired.push(id);
  }
  const quiet: MilestoneId[] = [];
  for (const id of raw.quiet as unknown[]) {
    if (!isMilestoneId(id) || quiet.includes(id) || !fired.includes(id)) return null;
    quiet.push(id);
  }
  return { fired, quiet };
}

function validateChatter(raw: unknown): ChatterState | null {
  if (!isRecord(raw) || !Array.isArray(raw.seen)) return null;
  const { count, nextAt } = raw;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 0) return null;
  if (typeof nextAt !== "number" || !Number.isFinite(nextAt) || nextAt < 0) return null;
  if (raw.seen.length > MAX_CHATTER_LINES || raw.seen.length > count) return null;
  const seen = [];
  for (const id of raw.seen as unknown[]) {
    if (!isChatterId(id)) return null;
    seen.push(id);
  }
  return { seen, count, nextAt };
}

function validateCast(raw: unknown): CastState | null {
  if (!isRecord(raw) || !Array.isArray(raw.departed)) return null;
  const { arrived, lastPopulation } = raw;
  if (typeof arrived !== "number" || !Number.isInteger(arrived)) return null;
  if (arrived < 0 || arrived > CAST.length) return null;
  if (typeof lastPopulation !== "number" || !Number.isInteger(lastPopulation)) return null;
  if (lastPopulation < 0) return null;
  const departed: number[] = [];
  for (const index of raw.departed as unknown[]) {
    if (typeof index !== "number" || !Number.isInteger(index)) return null;
    if (index < 0 || index >= arrived || departed.includes(index)) return null;
    departed.push(index);
  }
  return { arrived, departed, lastPopulation };
}

function validateSky(raw: unknown): SkyState | null {
  if (!isRecord(raw) || !Array.isArray(raw.seen) || typeof raw.dry !== "boolean") return null;
  const seen: SightingId[] = [];
  for (const id of raw.seen as unknown[]) {
    if (!isSightingId(id) || seen.includes(id)) return null;
    seen.push(id);
  }
  return { seen, dry: raw.dry && seen.length > 0 };
}

function validateTargets(raw: unknown): TargetsState | null {
  if (!isRecord(raw) || !Array.isArray(raw.results) || typeof raw.offer !== "boolean") return null;
  const { offered, offer, active } = raw;
  if (typeof offered !== "number" || !Number.isInteger(offered)) return null;
  if (offered < 0 || offered > MAX_OFFERS) return null;
  const results: TargetResult[] = [];
  for (const item of raw.results as unknown[]) {
    if (!isRecord(item) || typeof item.met !== "boolean") return null;
    const { kind, met } = item;
    if (kind !== "stretch" && kind !== "gentle" && kind !== "declined") return null;
    if (kind === "declined" && met) return null;
    results.push({ kind, met });
  }
  let checked: TargetsState["active"] = null;
  if (active !== null) {
    if (!isRecord(active) || !isFiniteNumber(active.endsAt)) return null;
    const { kind, goal, endsAt } = active;
    if (kind !== "stretch" && kind !== "gentle") return null;
    if (typeof goal !== "number" || !Number.isInteger(goal) || goal < 1) return null;
    if (goal > CONFIG.researchLevels) return null;
    checked = { kind, goal, endsAt };
  }
  // Every offer is waiting, accepted or finished: one place each, never two at once.
  if (offer && checked) return null;
  if (offered !== results.length + (offer ? 1 : 0) + (checked ? 1 : 0)) return null;
  return { offered, offer, active: checked, results };
}

function validateReviews(raw: unknown, stage: number): ReviewsState | null {
  if (!isRecord(raw) || !Array.isArray(raw.seen) || !isRecord(raw.entries)) return null;
  const seen: ReviewStage[] = [];
  for (const s of raw.seen as unknown[]) {
    if (!isReviewStage(s) || seen.includes(s) || s > stage) return null;
    seen.push(s);
  }
  const entries: Partial<Record<ReviewStage, ReviewSnapshot>> = {};
  for (const key of Object.keys(raw.entries)) {
    const s = Number(key);
    const entry = (raw.entries as RawSave)[key];
    if (!isReviewStage(s) || s > stage || !isRecord(entry)) return null;
    if (typeof entry.temperament !== "string" || !TEMPERAMENT_WORDS.includes(entry.temperament)) {
      return null;
    }
    for (const field of ["at", "seconds", "jobs", "villagers", "walkouts", "restDays"] as const) {
      const value = entry[field];
      if (!isFiniteNumber(value) || value < 0) return null;
    }
    entries[s] = {
      at: entry.at as number,
      seconds: entry.seconds as number,
      jobs: entry.jobs as number,
      villagers: entry.villagers as number,
      walkouts: entry.walkouts as number,
      restDays: entry.restDays as number,
      temperament: entry.temperament as ReviewSnapshot["temperament"],
    };
  }
  return { seen, entries };
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

  if (!Array.isArray(raw.upgrades)) return fail("upgrades");
  const upgrades: UpgradeId[] = [];
  for (const id of raw.upgrades as unknown[]) {
    if (!isUpgradeId(id) || upgrades.includes(id)) return fail("upgrades");
    upgrades.push(id);
  }

  const events = validateEvents(raw.events);
  if (!events) return fail("events");

  const reviews = validateReviews(raw.reviews, raw.stage);
  if (!reviews) return fail("reviews");

  const sky = validateSky(raw.sky);
  if (!sky) return fail("sky");

  const milestones = validateMilestones(raw.milestones);
  if (!milestones) return fail("milestones");

  const targets = validateTargets(raw.targets);
  if (!targets) return fail("targets");

  const chatter = validateChatter(raw.chatter);
  if (!chatter) return fail("chatter");

  // A record is either absent (null) or whole; anything else is a damaged save.
  const echo = raw.echo === null ? null : parseRunRecord(raw.echo);
  if (raw.echo !== null && echo === null) return fail("echo");

  if (raw.route !== "quiet" && raw.route !== "loud") return fail("route");
  const loudExploits = raw.loudExploits;
  if (typeof loudExploits !== "number" || !Number.isInteger(loudExploits) || loudExploits < 0) {
    return fail("loudExploits");
  }
  if (loudExploits > owned.exploit) return fail("loudExploits");

  let brief: BriefId | null = null;
  if (raw.brief !== null) {
    if (!isBriefId(raw.brief) || raw.stage < 2) return fail("brief");
    brief = raw.brief;
  }

  const cast = validateCast(raw.cast);
  if (!cast) return fail("cast");

  let ending: Ending | null = null;
  if (raw.ending !== null) {
    if (!ENDINGS.includes(raw.ending as Ending)) return fail("ending");
    ending = raw.ending as Ending;
    if (!endingIsPossible({ stage: raw.stage, owned })) return fail("ending");
  }

  let parting: PartingAct | null = null;
  if (raw.parting !== null) {
    if (!isPartingAct(raw.parting)) return fail("parting");
    if (!endingIsPossible({ stage: raw.stage, owned })) return fail("parting");
    parting = raw.parting;
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
      lookPauseUntil: raw.lookPauseUntil as number,
      lookReadyAt: raw.lookReadyAt as number,
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
      upgrades,
      events,
      reviews,
      sky,
      milestones,
      parting,
      chatter,
      cast,
      echo,
      targets,
      brief,
      route: raw.route,
      loudExploits,
      marketStrain: raw.marketStrain as number,
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
