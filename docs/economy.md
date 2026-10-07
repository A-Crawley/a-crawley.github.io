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
- **Policies:** Extended Shifts (×1.35 output, drains morale, drifts to efficiency), Rations Optimisation (food prices ×0.8, drains morale, drifts to efficiency), Rest Day (output stops for 30 seconds, morale +30, drifts to compassion, 150 second cooldown).
- **Stage goals:** stage 1 ends at 13,500 infrastructure. Stage 2 ends after 30 research levels (paid in food). The sim cracks and infrastructure resets to zero. Stage 3 ends after 22 exploits (paid in infrastructure).
- **Drift and odds:** raw drift points (negative is efficiency) become a compassion index from 0 to 1. Conquest odds are 15% plus 70% times that index, so a compassionate run meets a gentler rival.
- **The player:** buys whichever item pays back fastest, waiting until it is affordable. Payback values each currency per stage (infrastructure is worth nothing in stage 2, food barely matters in stage 3). Once the best item pays back slower than 400 seconds (stage 2) or 300 seconds (stage 3), the player saves for the stage-ending purchase instead.

## Results

| Strategy      | Stage 1 | Stage 2 | Stage 3 | Total   | Walkouts | Compassion | Conquest odds |
| ------------- | ------- | ------- | ------- | ------- | -------- | ---------- | ------------- |
| Efficient     | 63 min  | 38 min  | 20 min  | 121 min | 29       | 16%        | 26%           |
| Balanced      | 59 min  | 45 min  | 18 min  | 122 min | 0        | 39%        | 42%           |
| Compassionate | 85 min  | 54 min  | 21 min  | 159 min | 0        | 90%        | 78%           |

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

## Findings for the balance pass (GAME-18)

- **Efficiency is not rewarded.** The efficient run takes as long as the balanced run (121 versus 122 minutes) and
  suffers 29 walkouts. Either efficiency should be clearly faster, or that is the joke: grinding people gets you
  nowhere. Decide which.
- **Compassion is expensive.** It adds about 37 minutes, mostly in stage 1 where rest days pause income. Possibly
  too much of a penalty for the "good" path.
- **Stage 1 is 170+ purchases** and is the longest stage in every run. Check it is not a long stretch of near-identical decisions.
- The greedy player ignores morale. A smarter player (or manual playtesting) may manage morale better than these
  three strategies.
- Rest day behaviour is untested against a real player's attention: the model assumes it is always used at the optimal moment.
