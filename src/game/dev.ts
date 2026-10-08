import { advanceStage, bedsOf, buy, canAfford, isFinished, itemDef, step } from "./engine.ts";
import { settle } from "./settle.ts";
import { buyUpgrades, chooseNext, STRATEGIES } from "./sim/player.ts";
import type { Stage } from "./config.ts";
import { MAX_STEP_SECONDS, tick } from "./tick.ts";
import type { GameState } from "./state.ts";

/**
 * Developer tools: pure changes to a game state, for testing without playing two hours. None of
 * them are reachable unless dev mode is on (see devMode.ts). Each takes a state and returns a new
 * one, like a player action, so they work with `store.dispatch`.
 */

/** Play `seconds` of game time as if the player had been watching, starting from where the game is. */
export function skipTime(state: GameState, seconds: number): GameState {
  const shifted = { ...state, lastTickAt: state.lastTickAt - seconds * 1000 };
  return tick(shifted, state.lastTickAt);
}

export type BotName = "efficient" | "balanced" | "compassionate";

export const BOT_NAMES: readonly BotName[] = STRATEGIES.map((s) => s.name as BotName);

export type AutoplayGoal =
  { kind: "seconds"; seconds: number } | { kind: "stage"; stage: Stage } | { kind: "choice" };

/** The longest an autoplay will run, so a bot that gets stuck can't hang the page. */
const AUTOPLAY_LIMIT_SECONDS = 4 * 60 * 60;

/**
 * Let a bot play on from the current state until the goal is met: a number of seconds, the start of
 * a stage, or the final choice. It buys what the simulation's greedy player would, with the chosen
 * strategy's policies and rest days, and clicks all the time like the simulation does.
 */
export function autoplay(state: GameState, bot: BotName, goal: AutoplayGoal): GameState {
  const strategy = STRATEGIES.find((s) => s.name === bot) ?? STRATEGIES[1];
  const next = structuredClone(state);
  const startedAt = next.time;
  const reached = () => {
    if (isFinished(next)) return true;
    if (goal.kind === "seconds") return next.time - startedAt >= goal.seconds;
    if (goal.kind === "stage") return next.stage >= goal.stage;
    return false;
  };

  while (!reached() && next.time - startedAt < AUTOPLAY_LIMIT_SECONDS) {
    strategy.decide(next);
    step(next, MAX_STEP_SECONDS);
    buyUpgrades(next);
    for (;;) {
      const choice = chooseNext(next);
      if (!choice.item || !canAfford(next, choice.item)) break;
      buy(next, choice.item);
      advanceStage(next);
    }
    advanceStage(next);
  }
  settle(next);
  return next;
}

/** Ten times what the village has of food and wood, or a thousand of each if it has little. */
export function grantResources(state: GameState): GameState {
  const next = structuredClone(state);
  next.food = Math.max(next.food * 10, 1000);
  next.wood = Math.max(next.wood * 10, 1000);
  settle(next);
  return next;
}

/** Full morale, no walkout, and a rest day ready. */
export function refreshVillage(state: GameState): GameState {
  const next = structuredClone(state);
  next.morale = 100;
  next.walkoutUntil = 0;
  next.restReadyAt = 0;
  next.shortfallSeconds = 0;
  return next;
}

/** Move in villagers (and build the beds for them), so hiring is not held up by headcount. */
export function addVillagers(state: GameState, count: number): GameState {
  const next = structuredClone(state);
  next.population += count;
  const short = next.population - bedsOf(next.owned, next.upgrades);
  if (short > 0) {
    const house = itemDef("house");
    next.owned.house += Math.ceil(short / (house.beds ?? 1));
  }
  settle(next);
  return next;
}

export type DriftKind = "compassionate" | "neutral" | "efficient";

/** Set the hidden drift, to check each ending band without playing for it. */
export function setDriftKind(state: GameState, kind: DriftKind): GameState {
  const next = structuredClone(state);
  next.drift = kind === "neutral" ? 0 : kind === "compassionate" ? 12000 : -12000;
  return next;
}
