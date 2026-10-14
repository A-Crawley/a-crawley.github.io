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

### Time until affordable (GAME-62)

`secondsUntilAffordable(state, def, quote)` in `src/game/affordWait.ts` says what stands between the player and a purchase shown on a locked row: `covered` (the money is there; a limit such as nobody free is the reason, shown separately), `wait` (seconds at today's net rate), `bigger-store` (the cost is over the store ceiling, `capOf`) or `stalled` (the stock is not growing). The rate is the passive one: food net of what the village eats, wood and infrastructure as produced; Gather clicks, rest days and Look up pauses are not counted. It uses the quote for the selected quantity (for Max, the next single unit). `waitCaption` phrases it ("ready in 2m 10s", "needs more storage", "not at this rate"). Items cost one currency each, so there is one wait to compute. `ShopItem` shows the caption under its buy button and always keeps its space. No saved state, no economy change.

## Offline progress (GAME-13)

`catchUp(state, now)` in `offline.ts` brings the game up to date and is what the store calls instead of a bare `tick`.

- **What counts as away:** a gap of 60 seconds or more (`AWAY_AFTER_SECONDS`). A shorter gap is an ordinary `tick`.
- **Policies switch off when the player leaves.** Extended Shifts and Rations Optimisation are turned off at the start of the gap, so being away never costs morale or moves the hidden drift (and gives no bonus output). Without them, morale can't fall far enough for a walkout, even with every villager laid off.
- **Credited at 25%** (`CONFIG.offlineRate`, GAME-18): away time is replayed at a quarter speed, so 8 hours away is 2 hours of village time (food, wood, infrastructure and game time alike). The summary carries `rate`, and the dialog mentions it.
- **Cap: 8 hours** (`MAX_AWAY_SECONDS`). Only the first 8 hours are replayed, with the same step-by-step `tick` as normal play, so stage changes work. Time beyond the cap is dropped: play resumes from now and the lost time does not come back.
- **One path for every case.** A closed tab, a hidden tab and an old imported save all look the same, a state whose `lastTickAt` is long ago. While the tab is hidden `useGame` does not tick; on return (or on load) the store catches up straight away.
- **The summary:** `AwaySummary` (time away, time counted, whether capped, food, wood and infrastructure gained, policies that ended, stage before and after) is kept in the store until the player dismisses it (`getAway`, `dismissAway`). Two unseen summaries merge. It is not saved. `AwaySummaryDialog` shows it.
- **Unlocks during catch-up:** `tick` settles unlocks after every step, so an 8-hour absence unlocks things in the right order and nothing is missed (see Unlocks). GAME-17 should record achievements from the state after `catchUp`, not from events.
- **Balance note:** at full rate, 8 hours of output was far more than the whole game's 2 hours of play. The 25% rate above is the lever GAME-18 used: 8 hours away now equals 2 hours of village time.

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

## Achievements (GAME-17)

`achievements.ts` holds `ACHIEVEMENTS`: 20 achievements, each with a title, a hint (shown while locked), a dry line (shown once earned) and a condition on the saved state. They work like unlocks: conditions on state, never events, saved in `state.achievements` (in the order awarded) and never taken back.

- **Where they are awarded:** `settle(state)` in `settle.ts` runs unlocks first and then achievements (some depend on an unlock, such as Look Up). It runs after every tick step and every action, after `breakOut`, and when the store starts or replaces its state, so an old or imported save is awarded what it already earned. `withSettled` is the copying version.
- **Offline:** because `tick` settles every step, a long gap awards in the right order. `AwaySummary.achievementsEarned` lists what the gap earned, and the "welcome back" dialog names them. They are not shown again as toasts.
- **No production bonus:** achievements are a record, not a power-up. The balance pass assumed none, and a bonus would have meant re-tuning it.
- **UI:** an "Achievements (n/20)" panel on the game page (earned ones by name and line, locked ones as a hint under "Locked"), and a brief toast when one is earned during play (`useNewAchievements`: nothing is announced for what was earned before the page loaded or while the away dialog is open).
- **Save version 4** adds `achievements` (3 to 4 migration starts it empty; unknown or repeated ids make a save invalid).
- **Reachability test:** a compassionate and an efficient run through the real API, finished with each ending, must between them earn all 20.
- **Adding one:** add an id to `AchievementId`, a def to `ACHIEVEMENTS`, and a threshold test.

## Villagers and housing (GAME-23, GAME-25)

The village has people. They are what the jobs are made of, and the beds are what caps them.

- **State:** `population` (everyone in the village) and `arrivalTimer`. Saved since version 5. The 4 to 5
  migration makes everyone with a job a villager, adds two spare hands, and grants enough houses to sleep them.
- **Beds:** `bedsOf(owned)` is `VILLAGE.startBeds` (10) plus the beds of every hut (5) and house (25) owned.
- **Arrivals:** one villager every `VILLAGE.arrivalSeconds` (4 s) while `population < beds`, in `step`. They arrive
  whether or not anyone needs a job done, so the player controls the village by what they build.
- **Jobs need a free villager:** `unemployed(state)` is population minus the people actually working. A machine
  takes over a job, so it frees that villager. `purchaseLimit` caps forager, woodcutter and builder purchases at
  `unemployed`, so a bulk buy ("Max", ×10) buys what there are people for. Machines, research and exploits do not
  need one.
- **Housing is two shop items,** `hut` (100 food, ×1.12, 5 beds) and `house` (400 wood, ×1.15, 25 beds, offered
  from a village of 25). They use the same cost, bulk buying and quote code as everything else, with `beds` and
  `fromPopulation` on the item definition. Huts cost food so the start cannot deadlock (see `docs/economy.md`).
- **Reveal:** housing is shown once the village is within two beds of full and the player has half the price. The
  `village` unlock (first job) shows the villager line, and `housing` logs the first time beds run out.
- **Greedy player:** `chooseNext` in `src/game/sim/player.ts` is what the simulation and the replay tests use. A job
  with nobody free means wait for an arrival, or build a bed when every bed is full.

## Food upkeep (GAME-24)

- **Upkeep:** `upkeepPerSecond(state)` is `population × VILLAGE.upkeepPerVillager` (0.1), times 0.7 under Rations
  Optimisation. It is zero until someone holds a job. `step` takes it out of the food gained each step.
- **Hunger:** food never goes below nothing. Each step that would have taken it below nothing adds to
  `shortfallSeconds` (saved since version 6); a step that does not resets it. `isHungry` is five seconds or more.
  - After `VILLAGE.hunger.graceSeconds` (20) the shortfall drains morale.
  - After `starveAfterSeconds` (60) a villager leaves, then another every `leaveSeconds` (10). Someone without a
    job goes first; otherwise one leaves the job with the most workers, never one a machine has replaced.
  - Arrivals pause while the village is hungry.
- **Away:** `catchUp` calls `tick` with `{ hunger: false }`, so a shortfall costs no morale and no villagers. The
  stock stays at nothing.
- **Display:** the Food counter shows what is left after the villagers eat (`netFoodRate`), and the log warns at
  the three stages of hunger. The `VillagePanel` (revealed by the `village` unlock) shows population against beds,
  who is free to hire, and whether the village is fed, in words.

## Storage (GAME-27)

Food and wood have a ceiling; infrastructure has none. `capOf(state, currency)` is the larger of
two numbers: `STORAGE.base` plus everything built (granary +500 food, woodshed +300 wood), and
`STORAGE.priceCover` (1.5) times the dearest thing currently on sale in that currency. The second
number is the safeguard: the next purchase, including the research and exploit climb, is always
possible, so storage can never make the game unfinishable. It also means a ×10 or ×100 purchase of
something dear needs storage first, which is the point of building it.

`step` and `gatherFood` call `clampStocks`; anything over the ceiling is lost. Offline progress runs
through `step`, so it respects the ceiling too, and `AwaySummary.storageFull` lists the stocks that
were full on return so the dialog can say why the haul was smaller than the rate suggests.

Storage is revealed (`item:granary`, `item:woodshed`, and the `storage` unlock that shows the
ceiling on the counters) once the matching stock reaches 60% of its ceiling. The greedy sim player
never builds it (it makes nothing, so the payback rule skips it) and `neverBought` ignores storage.
Save version 7 adds the two counts.

## Morale drivers (GAME-28)

`moraleDrivers(state, strain)` lists everything pushing morale at this moment, strongest first.
`step` sums it and the morale meter shows the top two ("Falling: Hungry", "Rising: Well fed"), so
the words and the maths cannot disagree. Drains: extended shifts, short rations, hunger past the
grace period, idle villagers (stage 2+), crowding (every bed taken, 0.04/s) and no rest day for
20 minutes (0.02/s). Lifts: well fed (a minute of food stored and gaining, 0.1/s) and three or more
free beds (0.05/s). Lifts only shrink the gap to 100, so a happy village changes nothing visible.
Crowding and overdue rest are not counted while the player is away (`strain = false`). None of
these touch drift: that stays with the policies and rest days.

## Displaced workers (GAME-29)

A machine displaces the villager in the matching job (`idleVillagers`). They still eat and sleep.
`idleHands(state)` is the part of that pool with nothing to do yet: not an operator, not on odd
jobs, not let go. The Workforce transition panel (revealed by the `workforce` unlock) offers:

- **Redeploy to odd jobs**: free. Each makes `DISPLACED.oddJobFood` (0.15/s, flat) and drains morale
  a little (0.03/s each, capped at 0.8/s). Drift +15.
- **Retrain as operator**: 250 food. Operators remove that villager from the morale drain, and
  machines make up to +25% more once every machine has one (scaled by coverage). Drift +40.
- **Release**: free. Population −1 (so upkeep drops), morale −8 once, drift −120.

Redeploying does not hire into a real job: a free real hire was worth about 30 minutes of stage 2
(see docs/economy.md). Nobody new moves in while `idleHands > 0`, so a release is not undone by an
arrival. The pure changes live in the engine (`redeployOne`, `retrainOne`, `releaseOne`); the
actions wrap them. Save version 8 adds `operators`, `redeployed` and `released`. Away time
changes none of this.

## Upgrades (GAME-30)

`src/game/upgrades.ts` is a pure rule module: eight one-off purchases, each with a price in food or
wood, the stages it is offered in and a `requires` check on what it improves. The effect numbers
live in `UPGRADE_EFFECTS`; the engine reads them through `hasUpgrade`. Bought upgrades are saved as
a list of ids (`GameState.upgrades`, save version 9).

- Output: Better baskets (foragers +15%), Sharper axes (woodcutters +15%), Preventive maintenance
  (machines +5%), via `ratesFor`.
- Prices: Shared spreadsheet (builders −20%), Maintenance contract (machines −15%), via
  `priceFactor`, which also handles the rations discount. Bulk buying uses the same base.
- Beds: Sturdier huts (+2 beds per hut), `bedsOf(owned, upgrades)`.
- Storage: Root cellar (+400 food), stage 1 only: later the price safeguard in `capOf` already
  holds more than that, so it would do nothing.
- Retraining: Onboarding deck (−40%), `retrainCost`.

An upgrade is revealed (`upgrade:<id>` unlock) once it applies and the player holds half its price,
and stays. A test checks that every upgrade changes something visible. The sim bot buys only the
three output upgrades, when they pay back within 10 minutes.

## Village events (GAME-31)

`src/game/events.ts`. Fourteen events (GAME-39 added four for stage 1 and two for stage 3, with no save change), each with two choices and a trigger on the village's state
(hungry, food store full, no spare beds, four or more idle hands, low morale, and so on). Each is
offered at most once.

- State: `events { resolved[], pending, nextAt }` on `GameState` (save version 10, migration 9 to 10).
  Times are game seconds, so away time (credited at the offline rate) counts as it does elsewhere.
- Timing: the first event can appear at 600 s. After one appears the next is allowed 300 to 599 s
  later, by a fixed pattern (`eventGapSeconds`), not a random roll, so the same game gives the same
  events. Only one is ever waiting.
- Default: an unanswered event decides itself after 300 s with its free, less kind choice
  (`defaultChoice`). A test checks that every default costs nothing and lowers the drift.
- Away: `catchUp` ticks with `expireEvents: false`, so at most one event queues and nothing is
  decided while the player is gone. Its 300 s clock starts when they return.
- Effects: a choice may cost food or wood (scaled to the store's capacity), then moves morale and
  the drift, and some give a one-off 60 to 90 seconds of production. The drift per event is 150 to
  500, and a test keeps the whole set under 4500 of the 16000 scale.
- Stage gating: stage 1 events (`stranger`, `foundStash`, `restDispute`, `skyWatcher`) need `stage === 1` and stage 3 events (`rivalMessage`, `copiedWork`) need `stage === 3`, so each stage gets its own. `eligibleEvent` takes the first unseen eligible event in list order, so `leanWeek` still comes first. The 600 s first-event floor is unchanged. Event text is fixed, so the rival's tone shows only through the drift each choice moves.
- Screen: `VillageEventCard`, floated out of the page flow (above the dock on a phone, bottom corner elsewhere) by the `sheet` slot of `GameLayout` (GAME-43). It never blocks Gather.
- Dev tools: "Next village event" makes the next one due now.

## Stage performance reviews (GAME-36)

`src/game/review.ts` (logic), `src/game/reviewCopy.ts` (wording), `PerformanceReviewDialog` and
`StageTitle` (UI). A dismissible "Performance review" appears once on entering stage 2 and once on
entering stage 3.

- State: `reviews { seen[], entries }` on `GameState` (save version 11, migration 10 to 11).
  `entries[stage]` is a snapshot taken by `settle` the first time the stage is seen: time the stage
  left took, jobs, villagers, walkouts, rest days and the drift as a temperament word. The raw drift
  is never saved in it or shown. `seen` lists the dismissed reviews.
- Migration: a save already in stage 2 or 3 marks the stages it has passed as seen, so nobody gets
  a review for something played before the update.
- Showing: `pendingReview` returns the earliest entered, undismissed review. `GamePage` hides it
  while the welcome-back dialog is open, so after an away stage change the order is welcome back,
  then review (never stacked). Output keeps running behind the dialog. Dismissing is one button
  (Acknowledge) or Escape; there is no wait.
- Stage 3: the "Look Up" heading flickers now and then. Under `prefers-reduced-motion` it does not
  animate and shows a fixed faint shadow instead.
- No economy change. `npm run sim` is untouched.

## Look up: sightings and Sky notes (GAME-35)

`src/game/sky.ts`. Thirteen sightings, each with a text and a predicate on the state (stage, foragers,
research, exploits, walkouts, rest days, hunger, drift temperament). Pressing Look up reveals the
first sighting, in list order, that applies and has not been seen. With none, a dry line is shown
(chosen by game time, so it varies). Seen ids are saved in `sky.seen`; `sky.dry` says the last look
found nothing.

- Cost: output stops for 3.5 s (`lookPauseUntil`, applied in `globalMultiplier` like a rest day),
  morale rises by 2, and there is a 30 s cooldown (`lookReadyAt`). All in `CONFIG.lookUp`.
- Drift: only a first sighting nudges it (+40). The whole pool is at most 520 of the 16000 scale, and
  repeated presses add nothing, so it can't be farmed.
- Away: `catchUp` never presses it. Pause and cooldown are game time, so they are over on return.
- Save version 12 (migration 11 to 12): `sky`, `lookPauseUntil`, `lookReadyAt`. A save that had
  already looked up starts with the first sighting seen.
- Screen: `LookUpAction` shows the sighting (announced to screen readers), the pause cost, and the
  wait; `SkyNotes` lists what has been seen.

## Count milestones (GAME-57)

Cosmetic only: a village log line and a brief pulse on the shop row. No effect on production, cost or caps, so the simulation totals do not change.

- `src/game/milestones.ts` is a data list: 25, 50 and 100 of each job and 5, 10 and 25 of each machine. Jobs start at 25 because the achievements already cover 5 and 10 foragers. Ids are `<item>-<count>` and are saved, so never rename one.
- `settle()` records every milestone whose count is owned, so a bulk buy that passes several records each once. State is `milestones: { fired, quiet }`. A quiet milestone is recorded but kept out of the log.
- **Away:** `catchUp` records what was reached while away, then `capAwayMilestones` keeps the biggest 3 in the log and marks the rest quiet.
- **Save version 13** (migration 12 to 13): everything already passed is recorded as quiet, so an old save does not flood the log or replay. A quiet id that never fired makes a save invalid.
- **Pulse:** `useMilestonePulse` highlights the row of a milestone reached while the page is open (not at load, not quiet, not while the welcome-back dialog is up) for 1.4 s. Paint only (inset glow); under `prefers-reduced-motion` it is a still highlight for the same time.

## Run report on the ending screen (GAME-38)

`runReport(state)` in `src/game/runReport.ts` is a pure function of saved state, so there is no save
change. It lists the village events as answered (marking ones decided for the player), counts the
events and achievements the run did not meet, and adds a vague hint about the other ending
(`OTHER_ENDING_HINT` in `endingCopy.ts`). It carries no drift, odds or thresholds; a test checks the
report and the hints contain no digits or percentages. `EndingScreen` shows it under the stats.

- **Copy result (GAME-60):** `resultSummary(state)` in `src/game/resultSummary.ts` builds three lines: the ending, time, villagers, machines and walkouts, and the one-line verdict. It carries no drift, odds or link, and is null without an ending. The `CopyResult` component copies it with `copyText` (`src/hooks/copyText.ts`, shared with the save controls) and, if the browser refuses, shows the text selected for copying by hand. No saved state, no network.

## Retiring the Gather button

`gatherRetired` unlock in `src/game/unlocks.ts`. Clicking is counted in the economy as 2 clicks a
second, so `clickShareOfFood` (the clicking part of food income) falls as the village grows. When it
drops under 1% (`GATHER_RETIRES_BELOW`) the unlock is set for good: the big button leaves the
thumb-reach slot and a small "Gather food" button moves to the status panels.

`showGatherButton` brings the big one back while food is under 1 or the village is hungry, since
clicking is the way out of a collapse. In the simulation bot runs the unlock lands at minute 12 to
20, in stage 1. A person clicking faster than 2/s retires it later. The economy is unchanged: the
small button still gives the same food per click.

## Developer tools

Open the game with `/game/?dev=1` to turn them on (remembered on that device; `?dev=0` or the
"Turn off developer tools" button turns them off). They appear as a "Developer tools" section at the
bottom and change the real save, so export it first if it matters. Nothing shows for anyone else.

- **Skip time** (`skipTime`): plays 1 min, 10 min or 1 hour of game time as if you had been watching.
- **Let a bot play** (`autoplay`): the simulation's greedy player (efficient, balanced or
  compassionate) plays on from the current state for 10 minutes, to the start of stage 2 or 3, or to
  the final choice. A whole game takes under a second. Use it to get to the part you want to test.
- **Give**: more food and wood, 10 villagers (with beds), full morale and a rest day ready.
- **Set the drift**: compassionate, neutral or efficient, to check each ending's odds without
  playing for them.
- **Readout**: game time, stage, villagers and beds, idle hands, morale, drift, net food, caps.

The logic is in `src/game/dev.ts` (pure, tested); the flag is in `src/game/devMode.ts`. The tools
mark nothing on the save, so achievements earned with them are real as far as the game knows.

## Layout: phone, tablet, desktop

`useLayout` picks a mode from the window width (phone under 600 px, tablet to 1023 px, desktop from
1024 px) and `GameLayout` arranges the same components differently for each. GamePage passes it
slots; it knows nothing about the game.

- **Phone:** one column. A sticky strip at the top shows food, wood and infrastructure with a thin
  morale bar. Gather food sits in a fixed bottom bar above three tabs (Build, Village, Log and more),
  so the frequent action is in thumb reach. Shop sections are accordions.
- **Tablet:** a resources band across the top, the shop on the left, morale, village and log on the right.
- **Desktop:** three columns up to 1360 px. Left: resources (sticky), morale, progress, village,
  workforce. Middle: Gather food, Look up, quantity, shop, upgrades, policies. Right: log,
  achievements, settings, save and developer tools. Nothing is behind a tap.

In tests (no media queries) the layout is desktop; pass `layout` to `GamePage` to force another.
The `game-ui-designer` agent (`.claude/agents/`) holds the design principles used for this pass.

## A last look before the exit (GAME-65)

`src/game/parting.ts` adds one narrative beat to the final choice. While `phaseOf` is `choice`, the player picks one of three parting acts (`village`, `rival`, `silence`) before "Break out" unlocks. `choosePartingAct(state, act)` saves it in `state.parting`, does nothing outside the choice phase or once an act is picked (so it cannot be changed), and `useGame.choosePartingAct` saves the game straight away. A reload mid-beat shows the beat again until one is picked.

- **No effect on the roll:** `breakOut` ignores `parting`; a test runs every act against several drifts and rolls and checks the odds word and the ending are identical. The button is gated in the UI (`FinalChoice` disabled until `picked`), not in the engine, so dev tools and tests that call `breakOut` directly still work. The sim never reaches the choice, so the timing guards are untouched.
- **Offline:** the choice phase stops time (`isFinished`), so `catchUp` neither skips nor picks the beat.
- **Ending copy:** `partingAftermath(state)` gives one line per act and ending, shown after the ending paragraphs; `runReport` gets a `parting` line ("At the exit: ..."). Both are null for a save with no act (migrated or already ended).
- **Save version 14:** adds `parting` (null or an act). The 13 to 14 migration sets null. A non-null act in a run that has not reached the exit is rejected.

## The road not taken (GAME-53)

`runReport` also returns `otherEnding` (name and opening line of the ending not reached, from `ENDING_COPY`; null while there is no ending). `EndingScreen` shows it in the `RoadNotTaken` block, hidden behind a "Show the other ending" button because it is a spoiler, with a one-line nudge to start a new game. Derived only, so there is no save change. It deliberately shows no odds band or drift change: the ticket asked for those, but the hidden-drift rule (see the run report section) wins, so they were left out. A test checks the text has no digits or percentages.

## Rival echoes in stage 2 (GAME-59)

`RIVAL_ECHOES` in `unlocks.ts` seeds the rival before stage 3: at research levels 8, 18 and 27 (about a quarter, 60% and 90% of the 30 levels) an unexplained second process shows up as a village log line. They are ordinary unlocks (`echo:<level>:<tone>`), built like the rival incidents: the tone (gentle, wary or ruthless) is fixed from the drift at the moment it fires and then saved, so it cannot change later. They only fire in stage 2, so an old save already past it gets none. Derived and saved through `unlocked`, so there is no save version bump; the 30 research levels are only bought by the player, so `catchUp` never crosses one, it only settles one that was waiting. They sit alongside `researchHalf` and `researchNearly`, which are unchanged. Log only: no economy change, no Sky note and no stage review line (left out on purpose, see the ticket).

## Overheard chatter (GAME-51)

`src/game/chatter.ts` adds rare dry "overheard" lines to the village log. Cosmetic only: nothing but the log reads them.

- **Saved state (version 15):** `chatter = { seen, count, nextAt }`. `seen` is the last 12 line ids (so the log keeps a short history), `count` is every line heard so far and drives the next pick, `nextAt` is the game time the next line is due. The 14 to 15 migration starts with no lines and the first due 2 minutes after the save's time.
- **Cadence:** the first line at 150 s of play, then 120 to 240 s apart (`chatterGap`, a fixed hash of the count, so the same save always gives the same gaps). `applyChatter` runs inside `settle`, once per settle, and stops once the run is finished or ended.
- **Which line:** `pickChatter` is a fixed function of the count and the state: it takes the lines that fit (right stage, and for a few, a condition such as hungry, idle hands, a full store or machines), skips the one just heard, and picks by hash. Because it is saved the moment it happens, a reload never reshuffles it.
- **Away time:** `tick` settles once per second, so a long absence would produce many lines. `capAwayChatter` (called from `catchUp`) keeps only the latest new one. The 8 hour cap and 25% rate are unchanged.
- **Log:** the lines come last in `logLines`, keyed by their number since the first, so keys stay put as the oldest drop off.

## The named cast (GAME-37)

`src/game/cast.ts` gives the first eight villagers names and roles (Priya in Food Acquisition, Marcus in Timber Operations, and so on). There is no per-villager simulation: villagers are still a count, and the cast is a rule applied to that count.

- **Saved state (version 16):** `cast = { arrived, departed, lastPopulation }`. Member `i` arrives when the population first reaches `i + 1`. When the population falls (hunger, a walkout departure, or releasing an idle villager) each lost villager takes the earliest named villager still here, so the named ones leave first, in order, and never come back. A new hire is anonymous. The 15 to 16 migration counts everyone who would be present as arrived and nobody as gone, so an old save is not blamed for departures from before the cast existed.
- **When it runs:** `applyCast` is part of `settle`, so it sees every change, including departures while away (`catchUp` settles through `tick`). It reads `population` only and changes nothing but `cast`.
- **Where it shows:** the village log (one line per departure, in the order they left), a line in the performance review facts (`castReviewNote`, passed to the dialog from the page), and the run report on the ending screen (`castEnding`: everyone stayed, everyone left, or who stayed and who went).
- **Not done:** village events do not name the cast yet (the ticket asked for at least one).

## Stage 2 research brief (GAME-58)

`src/game/briefs.ts` and `CONFIG.briefs`. When stage 2 begins, `briefOffered(state)` is true until the player picks "Ship it" (`fast`) or "Do it properly" (`steady`). `chooseBrief` does nothing outside stage 2 or once a brief is set, so it is locked; `takeBrief` is the in-place version the simulation bots use. The page shows `BriefChoice` as a status panel, `useGame.chooseBrief` saves at once, and a reload does not ask again.

- **Effects:** `researchBonusPerLevel(state)` scales the output bonus per research level; `moraleDrivers` gets a `brief` driver (shown as "Research brief" beside the meter) during stage 2 only; the drift is nudged once on choosing. All numbers are in `CONFIG.briefs` and discussed in `docs/economy.md`.
- **Save version 17:** `brief` (null, `fast` or `steady`). The 16 to 17 migration sets null: a save already in stage 2 or later has no brief and keeps its numbers, and one still in stage 1 will be asked. A brief in a stage 1 save is rejected.
- **Offline:** `catchUp` runs through `tick` and the engine, so the brief's effects apply while away exactly as online.
- **Wording:** a log line for the choice and a "Research brief" line in the stage 2 review (`reviewCopy` now takes a list of extra notes). The drift appears only as words.

## The exploit route (GAME-40)

In stage 3 the player can switch exploits to the **loud** route (an "Approach" toggle in the shop; quiet is the default). `state.route` is `quiet` or `loud` and `setRoute` changes it for the exploits bought from then on. It is free and reversible, and only works in stage 3 while the run is going.

- **Price:** `priceFactor` makes an exploit cost `CONFIG.routes.loud.priceFactor` (0.85) of its quiet price. Everything else is unchanged, and the quote, the bulk buy and the wait note all use it.
- **Memory and drift:** `buy` and `buyMany` count each exploit bought loudly in `state.loudExploits` and move the drift by `driftPerExploit` (-120) for each. The rival mirrors the player, so a loud run reads as a less gentle one and the final odds slip. The most it can cost is 22 x 120 = 2640 of 16000, about 0.165 of the compassion index, so under 12 points of Conquest odds, which is about one band step in the odds word.
- **Incidents:** `rivalProgress(state)` is exploits bought plus one more for every two bought loudly. The rival incident unlocks (`rival:<n>:<tone>`) fire when it reaches 1, 6, 12 and 18, so a loud run meets each one sooner. Their tone is still fixed when they happen.
- **Save version 18:** `route` and `loudExploits`. The 17 to 18 migration sets quiet and 0. A save with more loud exploits than exploits is rejected.
- **Offline:** time stops at the final choice and nothing is bought while away, so `catchUp` neither picks a route nor buys loudly. The sim's efficient player uses loud; the other two use quiet.

## Echoes of a previous run (GAME-61)

`src/game/echoes.ts`. After a run ends, a second run carries a few dry touches that hint at it. They are words only: nothing in the economy reads them, and `npm run sim` is unchanged (the sim never has a record).

- **The record:** `RunRecord = { ending, tone, walkouts }`, kept in the settings entry `look-up:settings` as `lastRun`, parsed field by field so a bad record is dropped and notation is kept. `useGame.breakOut` writes it once, the moment the ending is first reached (never when an ended save is loaded). `useSettings` re-reads the stored `lastRun` when notation changes, so neither overwrites the other.
- **Per run:** a new game (first load with no save, or "Start a new game") copies `lastRun` into `GameState.echo`. Everything else derives from that, so the lines are once per run and a reload cannot repeat them. Import and export carry the copy with the run, not the settings.
- **The touches:** one opening log line (`echo-opening`, second in the log); three Sky sightings for the earlier ending (`ECHO_SIGHTINGS`, ids `echo:<1-3>:<ending>`, offered at 12 foragers, stage 2 and stage 3, after the first-run pool, and they do not nudge the drift); and one rival line (`memory:<tone>` unlock, stage 2 at research level 12, by the earlier tone).
- **Save version 19:** `echo` (null or a whole record). The 18 to 19 migration sets null, so a run already under way is a first run. A malformed record rejects the save.
- **Storage blocked:** no record can be read or written, so there are no echoes and no errors.

## The Exchange (GAME-34)

`src/game/market.ts`. `quoteTrade(state, trade)` gives one lot (whole units, `possible` flag), `trade` applies it and settles, `tradeReason` and `exchangeNote` are the words the panel shows. `marketOffered` drives the `market` unlock. `engine.step` eases `marketStrain` toward zero, so the same step serves play and `catchUp`. `useGame.trade` dispatches it. Save version 20 adds `marketStrain` (19 to 20 sets 0). Numbers and reasoning are in `docs/economy.md`.
