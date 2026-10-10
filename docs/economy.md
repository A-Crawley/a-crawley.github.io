# Look Up: economy prototype (GAME-6)

A greedy-player simulation of the v1 economy in `src/game/sim/`. Run it with `npm run sim`. The tests in
`src/game/sim/*.test.ts` guard the tuning (every strategy finishes in the 90 to 180 minute window, no dead
tiers, no wait over 6 minutes). All numbers live in `src/game/sim/config.ts`; that file is the source of
truth, this page explains the model and records what it showed.

## Model

- **Cost:** `base × growth^owned`, with closed-form bulk cost and max-affordable in `src/game/economy.ts`.
- **Production:** `output × owned × milestones`, where every job and machine doubles at 10, 25 and 50 owned.
- **Active play:** the player clicks 2 times per second for 1 food. Clicking is the only income at the start.
- **Resources:** food, wood and infrastructure.
- **Jobs (stage 1):** Forager (food, costs food), Woodcutter (wood, costs food), Builder (infrastructure, costs wood).
- **Machines (stage 2):** Automated forager (costs food), Sawmill bot and Builder drone (cost wood). Each takes over one villager's job. The laid-off villager stops producing and drains morale.
- **Morale:** recovers 2% of the gap to 100 per second. Output scales from ×0.5 at 0 morale to ×1 at 100. Below 30, a walkout halves output for 45 seconds and resets morale to 45, with a 120 second cooldown.
- **Policies:** Extended Shifts (×1.35 output, drains morale, drifts to efficiency), Rations Optimisation (food prices ×0.8, drains morale, drifts to efficiency), Rest Day (output stops for 8 seconds, morale +30, drifts to compassion, 150 second cooldown).
- **Stage goals:** stage 1 ends at 13,500 infrastructure. Stage 2 ends after 30 research levels (paid in food). The sim cracks and infrastructure resets to zero. Stage 3 ends after 22 exploits (paid in infrastructure).
- **Drift and odds:** raw drift points (negative is efficiency) become a compassion index from 0 to 1. Conquest odds are 15% plus 70% times that index, so a compassionate run meets a gentler rival.
- **The player:** buys whichever item pays back fastest, waiting until it is affordable. Payback values each currency per stage (infrastructure is worth nothing in stage 2, food barely matters in stage 3). Once the best item pays back slower than 400 seconds (stage 2) or 300 seconds (stage 3), the player saves for the stage-ending purchase instead.

## Results

| Strategy      | Stage 1 | Stage 2 | Stage 3 | Total   | Walkouts | Compassion | Conquest odds |
| ------------- | ------- | ------- | ------- | ------- | -------- | ---------- | ------------- |
| Efficient     | 63 min  | 38 min  | 20 min  | 121 min | 29       | 16%        | 26%           |
| Balanced      | 59 min  | 45 min  | 18 min  | 122 min | 0        | 39%        | 42%           |
| Compassionate | 72 min  | 45 min  | 8 min   | 124 min | 0        | 81%        | 72%           |

Target split was 60 / 40 / 20 minutes. The balanced run lands at 59 / 45 / 18. The longest wait between
purchases is just under 5 minutes (stage 2, compassionate) and under 3.5 minutes in stage 3.

## What the simulation showed

- **Machines must out-produce milestone-boosted villagers.** With villagers at ×8 from milestones, a machine
  at only 5 to 8 times a villager's base output was a net loss and was never bought. Machines now produce
  15 to 17 times a villager's base output.
- **Infrastructure and food need a use in every stage,** or the player rightly ignores them. Research is paid
  in food so food stays useful in stage 2, and infrastructure resets at stage 3 so stage 2 drones are not a
  free head start.
- **Geometric costs create a long last wait.** The final purchase of a stage costs about `(growth − 1) / growth`
  of the stage's spend. A low research growth (1.12 over 30 levels) keeps that wait under 5 minutes.
- **Unemployment needs a cap.** Uncapped, laid-off villagers drove morale to zero in every run. It is capped at
  1 morale per second.

## Balance pass (GAME-18)

Decisions (Andrew), with what changed:

- **Efficiency is not a faster way to play.** Efficient and balanced runs finish within 1% of each other (121.4 and 121.7 minutes). That is deliberate: grinding people gets you walkouts (29 in the efficient run) and the worst odds at the exit (26% Conquest), not a better time. A test keeps the two within 5%.
- **Kindness costs no extra time.** The first prototype made a fully compassionate run 159 minutes against 122 balanced, mostly from 30 second rest days. Rest days now stop output for 8 seconds, giving 124 minutes (+2%), and Conquest odds of 72%. A test keeps compassionate within 5% of balanced.
- **Away time counts at 25%** (`CONFIG.offlineRate`), up to the 8 hour cap. Eight hours away is worth 2 hours of village time, so a long absence helps but cannot skip the game. The "welcome back" dialog says the village worked at reduced speed.
- **Length:** every strategy lands between 121 and 124 minutes; a test keeps all of them between 105 and 140.
- **Pacing:** the longest wait between purchases is 275 seconds (stage 2). A test keeps it under 6 minutes. No tier is dead, and every item is bought in every strategy.

Parameters live in `src/game/config.ts`; the comments there explain the changed values.

### Still open (needs a person at the keyboard)

- **Stage split:** compassionate play spends 72 / 45 / 8 minutes in the three stages, against 59 / 45 / 18 for balanced. Stage 3 is short for kind play. Worth watching in a hand playthrough.
- **Stage 1 is 170+ purchases** and the longest stage in every run. Check by hand that it is not a stretch of near-identical decisions.
- The greedy player ignores morale and always uses rest days at the best moment, so a real player's times will be longer. The ticket's "simulated and hand-played timelines agree" check is not done: nobody has played a full run by hand yet.
- Offline rate and rest day length are tuned against the greedy player. A real player's feel is the test.

## Linked village economy (GAME-22)

A prototype of population, upkeep and housing in `src/game/sim/village.ts`. It wraps the real engine and
changes no game code. Run it with `npm run sim:village`; `village.test.ts` guards it. Parent design:
GAME-21.

### Model

- **Villagers:** the village starts with 3 and 10 beds. A job needs an idle villager. Machines leave the
  villager they replace in the village, idle, still eating and still in a bed.
- **Arrivals:** one new villager every 4 seconds while there is a food surplus (income above upkeep), a free
  bed, and fewer than 2 idle villagers. The last rule makes the village follow demand rather than balloon.
- **Upkeep:** 0.15 food per second per villager, working or not. Rations Optimisation cuts it by 30% (and
  keeps its price discount).
- **Hunger:** food never goes below zero. A shortfall has to last 20 seconds before it costs morale, so a rest
  day is not a famine.
- **Housing:** Hut (+5 beds, 100 food, ×1.12) from the start; House (+25 beds, 400 wood, ×1.15) once the
  village has 25 people. The player buys housing only when blocked, which is the worst case.

### Results

| Strategy      | Without village | With village | Stage ends (with village) | Housing           | Waited for villagers | Of that, every bed full |
| ------------- | --------------- | ------------ | ------------------------- | ----------------- | -------------------- | ----------------------- |
| Efficient     | 121 min         | 128 min      | 67 / 108 / 128            | 10 huts, 5 houses | 454 s                | 193 s                   |
| Balanced      | 122 min         | 129 min      | 63 / 111 / 129            | 10 huts, 5 houses | 365 s                | 156 s                   |
| Compassionate | 124 min         | 134 min      | 77 / 127 / 134            | 10 huts, 5 houses | 363 s                | 176 s                   |

Peak population is 171 to 177, all of it in stage 1. No run goes hungry.

### What it showed

- **Upkeep must stay below what one forager makes.** At 0.6 food per villager the balanced run never finished:
  every hire made the village poorer and the early game starved (a forager makes 0.4 before milestones). At 0.3
  it finishes but 12% slower. 0.15 costs about 4% and is felt for the first half hour. A test keeps upkeep under
  `CONFIG.output.forager`.
- **Upkeep is an early and mid game tax.** Milestones multiply a forager's output up to ×8, so by stage 2
  upkeep is a small share of income. That is fine: it is an early pressure that lets food and wood jobs (which
  make no food) matter. It does not need to bite late.
- **Headcount is a mild second price tag, not a stall.** The player waited 6 to 8 minutes in total for the next
  villager to arrive, and about 3 minutes with every bed full, over a 2 hour run. Housing is 15 purchases. That
  is enough to notice and not enough to annoy. Cheap housing (60 food, 150 wood) cut the bed wait to 2 minutes
  and made housing barely visible, so the dearer values are the proposal.
- **Huts must cost food, not wood.** With wood huts the start can deadlock: all beds full, no idle villager to
  hire as a woodcutter, no wood to build a bed. A food hut can always be bought by clicking. Wood houses come
  once the village has a woodcutter economy.
- **Housing blocks for infrastructure are not worth it.** The village stops growing when stage 2 starts, so a
  third tier would have nothing to house. GAME-25 should ship two tiers; infrastructure keeps its job as the
  stage 1 gate.
- **Total length grows by 6 to 10 minutes.** Stage 1 takes 4 to 5 minutes longer and stage 2 about 3. Both
  stay inside the 105 to 140 minute guard. When the rules reach the engine (GAME-23 to GAME-25), retune with
  the first forager price or arrival time if a hand-played run feels long. Compassionate play is the slowest
  (134 min) because rest days now also stall arrivals' food surplus; watch it.
- **Hunger needs a grace period.** Without one, an 8 second rest day (output stops) counted as a famine in the
  compassionate run.

### Proposed values

`VILLAGE` in `src/game/sim/village.ts`: start 3 villagers and 10 beds; upkeep 0.15; Rations upkeep ×0.7;
arrival every 4 s with fewer than 2 idle; hunger grace 20 s; Hut and House as above.

### Landed in the engine (GAME-23, GAME-25)

Population, arrivals and housing are now in the game itself, not a wrapper, and `npm run sim` includes them.
Arrivals changed from the prototype: villagers now fill every free bed (one per 4 s), rather than following demand,
so bulk buying still works and the player decides the size of the village by building beds. Without upkeep yet
(GAME-24) the three strategies finish in 123 (balanced), 122 (efficient) and 126 (compassionate) minutes, with a
peak population of 185 to 195, 4 to 6 minutes of waiting for villagers and 1 to 3 minutes of waiting with every bed
full. Upkeep will add to these; the prototype put it at about 6 to 8 minutes.

### Food upkeep landed (GAME-24)

Villagers eat 0.1 food a second each, working or not, from the first hire. Rations Optimisation now also cuts
upkeep by 30%. A shortfall of 20 seconds costs morale, 60 seconds starts costing villagers (someone without a
job first, then from the biggest job), one more every 10 seconds. While the player is away none of that
happens: the stock just sits at nothing.

| Strategy      | Total | Stages (min)       | Walkouts | Peak population |
| ------------- | ----- | ------------------ | -------- | --------------- |
| Efficient     | 124.5 | 65.5 / 39.2 / 19.8 | 30       | 195             |
| Balanced      | 127.9 | 62.1 / 48.0 / 17.8 | 0        | 185             |
| Compassionate | 132.1 | 76.0 / 48.6 / 7.5  | 0        | 185             |

- **0.1, not the prototype's 0.15.** At 0.15 compassionate play finished 5.1% slower than balanced, outside the
  5% guard. At 0.1 it is 3.3%. A forager (0.4 before milestones) now feeds four villagers.
- **Stage 2 is about 4 minutes longer** (48 against 45) because research is paid in food, which the villagers now
  also eat. Stage 1 is 2 minutes longer.
- **The longest quiet stretch is now the research middle** (researchHalf to researchNearly, 31 minutes by the
  bot). The unlock gap guard moved from 30 to 35 minutes. GAME-30 (upgrades) and GAME-31 (events) should fill it.
- **The first forager roughly feeds three villagers** and no more (0.4 against 0.3). Arrivals stop while the
  village is hungry, so the village grows as fast as it is fed rather than starving itself in the first minute.
- **A passive player does not collapse the game.** With no jobs there is no upkeep at all, and a village that
  has lost every job to a famine has none either, so the villagers who are left simply recover.

### Open for the later tickets

- Morale effects of crowding and idleness (GAME-28) are not modelled.
- Storage caps (GAME-27) are not modelled and may bind earlier than housing.

## Storage (GAME-27)

Ceiling: 300 food and 200 wood to start, floored at 1.5× the dearest current price. A granary
(60 wood ×1.3) adds 500 food, a woodshed (50 wood ×1.3) adds 300 wood. The greedy sim player never
builds storage and still loses a little to the ceiling: runs went from 124.5 / 127.9 / 132.1 min
(efficient / balanced / compassionate) to 126.7 / 131.6 / 136.0, compassionate 3.3% over balanced
(guard is 5%). A real player who builds storage will land at or under the old numbers. Offline,
a long absence now fills the store and stops: the stores are what you come back to.

## Morale drivers (GAME-28)

First pass at 0.1/s crowding and 0.05/s overdue rest (starting at 15 min) made compassionate 7.5%
slower than balanced and the run 143 min. Lowered to 0.04/s and 0.02/s (from 20 min): run lengths
125.0 / 129.8 / 134.1 min (efficient / balanced / compassionate), compassionate 3.3% over balanced.
The efficient bot still walks out about 30 times, as before: extended shifts dominate its morale.

## Displaced workers (GAME-29)

The idle pool used to drain morale at up to 1/s for the whole of stage 2 and 3, which held a
balanced player near 50 morale with shifts off. Any free cure for it is therefore very strong:
a first version (redeploy into a real job, no drain) made balanced play 99 min and compassionate
123 min (24% over). Two levers fixed it: odd-job work makes 0.15 food/s and still drains 0.03/s
each (cap 0.8), and the sim's efficient strategy only releases people once the breakout starts.
Result: 125.4 / 122.7 / 123.2 min (efficient / balanced / compassionate). Efficient play is no
longer fastest, because releasing people removes free hires: cruelty does not clearly pay, which
suits the story. Bots: efficient releases in stage 3 and uses odd jobs before; balanced uses odd
jobs; compassionate retrains when it has 500 food spare, else odd jobs.

## Upgrades (GAME-30)

With +25% output upgrades the sim ran 101.5 min balanced, under the 105 guard. At +15%/+15%/+5%
(the bot buys only these): 118.1 / 115.7 / 115.8 min (efficient / balanced / compassionate). Runs
are now around 2 minutes under where GAME-29 left them; players who also buy the price and bed
upgrades will be faster still. If runs end up too short, raise the stage 2 costs rather than
shrinking the upgrades: they should feel worth buying.

## Village events (GAME-31)

Events are not in the simulation bot, which ignores them (the default applies after 300 s), so the
three run totals are unchanged. The balance argument is by bounds instead:

- Rewards are one-off (60 to 90 seconds of production), at most about 8 events per run, so a run can
  gain at most a few minutes of production from them, and only by taking the choice that costs morale.
- The kinder choice costs food or wood, or pays nothing, so it is never free of cost.
- Total possible drift from all eight is under 3500 of 16000 (about 0.1 on the compassion index).

### Stage 1 and stage 3 events (GAME-39)

Six more events: four in stage 1 (a stranger asks to stay, a stash in the woods, an argument about
breaks, someone who keeps looking up) and two in stage 3 (a message from the rival, copied methods).
None of them changes population, beds, jobs or any rate. The two that give anything give 45 seconds
of food at most (the stash), as the harder, less kind choice. Drift per event is 200 to 300, and the
guard in `events.test.ts` for the whole set moved from 3500 to 4500 (of 16000, about 0.28 of the
range if every event went one way, which needs every choice to be the same kind). The bot still
ignores events, so the simulation is unchanged: efficient 118.1, balanced 115.7, compassionate 115.8
minutes. With 14 events and one every 5 to 10 minutes, a run sees about 12 to 15 of them at most.

What a hand-played run does with them is not yet measured. Worth checking when playtesting.

## Look up (GAME-35)

The simulation bots never look up, so the three run totals are unchanged. Bounds instead:

- Pausing for 3.5 s every 30 s is the worst case, about 12% of output, and it buys only +2 morale
  per look (0.067 a second at most, less than the +0.1 a second a well-fed village gets). Spamming it
  is a loss, not a trick.
- Drift: 40 per first sighting, 13 sightings, so under 3.5% of the scale in total.
- Not yet measured with a person playing.
