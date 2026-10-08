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
- **Achievements and unlocks** during catch-up: there are none yet. What the shop reveals is derived from state, so it just appears. GAME-17 should record achievements from the state after `catchUp`, not from events.
- **Balance note:** 8 hours of output is far more than the whole game's 2 hours of play, so a long absence can fund a lot on return. Flagged for GAME-18; an offline efficiency multiplier is the usual lever.
