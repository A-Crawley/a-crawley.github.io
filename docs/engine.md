# Look Up: engine overview (GAME-9)

The game core lives in `src/game/` as pure TypeScript with no React or DOM imports. React only
touches it through `src/hooks/useGame.ts`.

| Module       | Responsibility                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| `config.ts`  | Every tunable number and the item list (shared with the simulation)                                               |
| `economy.ts` | Cost and bulk-buy maths                                                                                           |
| `engine.ts`  | Rules: production, morale, policies, drift, stages. Mutates the state it is given, so it is only called on copies |
| `state.ts`   | `GameState`: plain serialisable data plus `version` and `lastTickAt`                                              |
| `tick.ts`    | `tick(state, now)`: advance to a wall-clock time and return a new state                                           |
| `actions.ts` | `gatherFood`, `buyItem`, `setPolicy`, `takeRestDay`: each returns a new state, or the same object for a no-op     |
| `store.ts`   | A small external store: `getState`, `subscribe`, `tick`, `dispatch`                                               |
| `sim/`       | The greedy-player simulation and `npm run sim` (GAME-6)                                                           |

## How time works

- `tick` takes elapsed time from timestamp deltas, never from counting timer calls, because browsers throttle
  timers in background tabs.
- A gap is replayed in steps of at most one second, because morale, walkouts and rest days are not linear. A
  two-hour gap is 7,200 steps and takes milliseconds.
- One long tick matches many one-second ticks exactly. Uneven splits agree within a fraction of a percent.
- A clock that goes backwards adds no time. One tick replays at most 7 days.
- `useGame` refreshes every 250 ms and also ticks the moment a hidden tab becomes visible.
- Clicks are real actions in the game. The simulation instead assumes two clicks a second.

## Saving (GAME-10)

| Module                    | Responsibility                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `save.ts`                 | Pure: serialise, Base64 export and import, version migration, strict validation                                      |
| `storage.ts`              | `loadGame`, `saveGame`, `clearSave` over localStorage. They never throw                                              |
| `useGame`                 | Loads on start, autosaves every 30 seconds and when the tab is hidden or closed, and offers export, import and reset |
| `components/SaveControls` | Export (with copy), import (with error messages) and a confirmed reset                                               |

- **Format:** the stored save is the `GameState` as JSON. The export is the same JSON, Base64 encoded, so it is safe to paste anywhere. The timestamp (`lastTickAt`) round-trips.
- **Versions:** every save carries `version`. To change the state shape, bump `STATE_VERSION` in `state.ts` and add `MIGRATIONS[oldVersion]` in `save.ts`, returning the save in the new shape. Migrations run one version at a time. A save from a newer game is rejected, never guessed at.
- **Validation:** a save must have exactly the right fields and ranges (known stage, non-negative counts, morale 0 to 100, every item present). Unknown fields are dropped. Anything else is rejected with a plain-words reason, and the current game is not touched.
- **Corrupt saves:** a stored save that cannot be read is copied to `look-up:save-corrupt` before the game starts fresh, so an autosave cannot destroy it.
- **Blocked storage:** every read and write is wrapped. The game still runs and `loadStatus` reports `"unavailable"`.
- **Loading is offline progress:** loading or importing a save and then ticking replays the time since `lastTickAt`, as described under Offline progress below.

## Bulk buying (GAME-12)

`buyItem(state, id, quantity)` takes `1`, `10`, `100` or `"max"` (`BuyQuantity`, default 1).

- A fixed amount is all or nothing: if the player can't pay for every unit, nothing is bought and the same state object comes back.
- `"max"` buys as many as affordable, and does nothing if that is zero.
- Prices use the closed-form sums in `economy.ts` (`bulkCost`, `maxAffordable`), with the Rations Optimisation discount applied to food prices. `bulkCostOf`, `maxAffordableOf` and `quotePurchase` in `engine.ts` expose them to the UI; `quotePurchase` says how many units, what they cost and whether the purchase can go ahead.
- Research and exploits stop at their stage goals (`purchaseLimit`), so a bulk buy can't overshoot a stage.
- Tests check bulk results against buying one unit at a time, and `timeline.test.ts` replays the prototype's greedy player through `tick`, `gatherFood` and `buyItem`: stage 1 ends at the same time as in the prototype.

## Offline progress (GAME-13)

`catchUp(state, now)` in `offline.ts` brings the game up to date and is what the store calls instead of a bare `tick`.

- **What counts as away:** a gap of 60 seconds or more (`AWAY_AFTER_SECONDS`). A shorter gap is an ordinary `tick`.
- **Policies switch off when the player leaves.** Extended Shifts and Rations Optimisation are turned off at the start of the gap, so being away never costs morale or moves the hidden drift (and gives no bonus output). Without them, morale can't fall far enough for a walkout, even with every villager laid off.
- **Cap: 8 hours** (`MAX_AWAY_SECONDS`). Only the first 8 hours are replayed, with the same step-by-step `tick` as normal play, so stage changes work. Time beyond the cap is dropped: play resumes from now and the lost time does not come back.
- **One path for every case.** A closed tab, a hidden tab and an old imported save all look the same, a state whose `lastTickAt` is long ago. While the tab is hidden `useGame` does not tick; on return (or on load) the store catches up straight away.
- **The summary:** `AwaySummary` (time away, time counted, whether capped, food, wood and infrastructure gained, policies that ended, stage before and after) is kept in the store until the player dismisses it (`getAway`, `dismissAway`). Two unseen summaries merge. It is not saved. `AwaySummaryDialog` shows it.
- **Unlocks during catch-up:** `tick` settles unlocks after every step, so an 8-hour absence unlocks things in the right order and nothing is missed (see Unlocks). GAME-17 should record achievements from the state after `catchUp`, not from events.
- **Balance note:** 8 hours of output is far more than the whole game's 2 hours of play, so a long absence can fund a lot on return. Flagged for GAME-18; an offline efficiency multiplier is the usual lever.

## Number formatting (GAME-8)

`formatAmount(value, notation)` and `formatRate(perSecond, notation)` in `format.ts` are the only places numbers are turned into text for resources. Components get them through `useNumberFormat()`, which reads the player's notation from context (`NotationProvider`), so no component needs to be told which notation to use.

- **Notations:** `short` (1.2K, 3.4M, 5B, 6T, then 1aa, 1ab ... 1az, 1ba ...), `scientific` (1.23e45) and `engineering` (123.45e3).
- Below 1,000 every notation shows the plain whole number. Amounts always round down, so the display never promises more than the player has. Scientific and engineering use two decimals, short uses one.
- Rates round to nearest: `<0.01` for the tiniest, two decimals below 1 (0.03), one decimal below 100, then as an amount.
- Handles everything up to `Number.MAX_VALUE`; `Infinity` shows as "∞"; zero, negatives and NaN show as "0".
- The choice is saved separately from the game, under `look-up:settings` (`settings.ts`, `useSettings`), so importing a save or resetting the game does not change it. A bad or unknown value falls back to the default, field by field.
- Not routed through it, on purpose: durations (`formatDuration`), percentages, the morale value and the per-unit output text in the shop (all under 100 a second, which every notation writes the same way).

## Unlocks (GAME-15)

The interface is the progression system. `unlocks.ts` holds `UNLOCKS`, a list of `{ id, when(state), log? }`. When `when` is true the id is added to `state.unlocked` (saved, in the order it happened) and never removed, so spending the resource that revealed something does not hide it again.

- **Where they are settled:** `applyUnlocks` runs after every `tick` step and every action, and `withUnlocks` runs when the store starts or replaces its state (a loaded or imported save). One long gap therefore unlocks in the right order.
- **UI:** `GamePage` shows a panel only when `isUnlocked(state, id)`. Shop items are greyed (disabled) as soon as they unlock and active once affordable.
- **Pacing:** `unlocks.test.ts` replays the greedy prototype player through stages 1 and 2 and checks the order, that the Look up button wakes and Project Horizon appears within the first minutes, and that no gap between unlocks passes 30 minutes. A person plays slower than the bot, so the real gaps are longer.
- **Log:** an unlock with a `log` line adds it to the village log after the count-based lines, in unlock order.
- **Action-driven unlocks:** `lookedUp` has no threshold; the `lookUp` action sets it (`unlock(state, id)`).
- **Save version 2:** adds `unlocked`. The 1 to 2 migration starts it empty and the store settles what the player has already earned. An unknown or repeated id makes the save invalid.
- **Adding one:** add an id to `UnlockId`, a def to `UNLOCKS` (keep it in expected order), gate the UI on it, add a threshold test. No save change is needed while the shape stays the same.

| Unlock                                              | Threshold                                                                        |
| --------------------------------------------------- | -------------------------------------------------------------------------------- |
| `item:<id>`                                         | Item is on sale this stage and the player owns one or holds half its first price |
| `wood`, `infra`                                     | First wood or infrastructure, or the job that makes it                           |
| `morale`                                            | First hire                                                                       |
| `lookUp`                                            | 5 foragers                                                                       |
| `lookedUp`                                          | The first press of Look up                                                       |
| `policy:rationsOptimisation`, `policy:restDay`      | 10 jobs                                                                          |
| `bulkBuying`                                        | 10 of any one item                                                               |
| `horizon`, `horizonHalf`, `rumours`                 | Stage 1 infrastructure at 2%, 50%, 85% of the goal                               |
| `stage2`, `policy:extendedShifts`                   | Stage 2 starts                                                                   |
| `researchStarted`, `researchHalf`, `researchNearly` | 1, half, all but 2 research levels                                               |
| `stage3`                                            | Stage 3 starts                                                                   |

## The ending (GAME-19)

`ending.ts` holds the last stretch of the game. `phaseOf(state)` gives one of three phases:

- `playing`: the normal game.
- `choice`: stage 3 with every exploit bought. `isFinished` is true, so time stops and actions do nothing, and `catchUp` reports no "away" summary. The page shows the final choice instead of the shop.
- `ended`: `state.ending` is set. The page shows the end screen.

- **The choice:** one button, "Break out". `breakOut(state, roll)` is Conquest when `roll < conquestOdds(drift)`, otherwise Apocalypse. The caller supplies the roll (`useGame` uses `Math.random`, and its `random` option lets tests fix it), so the function stays pure. It does nothing unless the choice is waiting, so the ending cannot be re-rolled. The result is saved at once.
- **Odds in words:** `oddsWord` maps the odds to Unlikely, Risky, Even, Promising or Likely. Percentages are never shown.
- **Rival incidents:** events only, no simulated opponent. Four incidents (at 1, 6, 12 and 18 exploits) are unlocks named `rival:<exploits>:<tone>`. The tone (gentle, wary or ruthless, `temperamentOf(drift)`) is fixed when the incident happens and then saved, so a later change of drift cannot rewrite it.
- **End screen:** the ending, the reveal both endings share, one line on how the run read (the hidden drift put into words), and stats (`endStats`: time played, villagers, machines, rest days, walkouts, research, exploits). "Start a new game" asks first, then calls `resetGame`. The shop and counters are hidden once ended.
- **Save version 3:** adds `ending` (null, `conquest` or `apocalypse`). The 2 to 3 migration sets null. A save with an ending but an unfinished run is rejected.
- **Copy:** all ending text lives in `endingCopy.ts`; rival lines are in `unlocks.ts`.
