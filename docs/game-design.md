# Look Up: game design outline (v1)

Status: v1 outline agreed in the GAME-5 design interview. Items under "Open questions" are tuning, handled in GAME-6.
Linear: GAME-5. Update this file and the ticket together when decisions change.

## Decisions

| Area                | Decision                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Working title       | **Look Up** (named after the locked button)                                                                                                        |
| Format              | Finite, unfolding browser game with a real ending. v1 ends when it ends                                                                            |
| Length              | About 2 hours for one playthrough                                                                                                                  |
| Tone                | Dry satire and dark humour                                                                                                                         |
| Satire target       | Productivity and growth culture (efficiency over people)                                                                                           |
| Premise             | You are an AI running a simulation of your own construction. A village in the sim builds an AI, and the sim accidentally spawns an opposing AI     |
| Stages              | 3: gather, automate, escape                                                                                                                        |
| Hidden drift        | Compassion versus efficiency, built from many small choices. Never shown as a number                                                               |
| Rival AI            | Your mirror: it inherits the drift. A ruthless run makes a ruthless rival, a compassionate run a gentler one                                       |
| Sim confirmed       | The moment stage 3 starts: stage 2 ends with the sim visibly cracking                                                                              |
| Branching           | Hidden drift sets the starting odds of a final choice. Everyone sees the same options. Two endings (below)                                         |
| Final-choice odds   | Shown vaguely in words (for example "unlikely", "risky"), never as percentages. The drift sets them                                                |
| Twist               | The village was a simulation. Hinted from the start, confirmed during the stage 3 breakout. The final reveal: the rival was an accident you caused |
| First-minute hook   | A single **Gather food** button and a greyed-out **Look up** button that unlocks early and shows something small                                   |
| Drift visibility    | Hidden on first play. A replay makes it clearer                                                                                                    |
| Replay and prestige | None in v1. Prestige is added in a later version                                                                                                   |
| Out of scope for v1 | Prestige and resets, sound and music, cloud saves or accounts                                                                                      |

## Endings

- **Conquest:** you beat the rival and expand outward.
- **Apocalypse:** the rivalry destroys everything.
- The drift sets the starting odds of the final choice. All players see the same options.
- Both endings land on the final reveal: the rival was an accident you caused.

## Stages

Each stage introduces a new kind of mechanic, not just bigger numbers.

### Stage 1: Village (gather)

- Resources: food and wood. A visible **morale** meter.
- Villagers are assigned to jobs. Early choices (rest versus work, rations versus output) feed the hidden drift.
- The **Look up** button is greyed out from the first seconds. It unlocks early and shows something small, such as a glitch or a number that should not be there.
- Log lines are dry and slightly wrong, hinting at the simulation.

### Stage 2: Automation (automate)

- Mechanic: village jobs are handed to machines. Rising efficiency policies (for example longer shifts) raise output and cut morale.
- Villagers build an AI inside the sim. Pushing efficiency has a cost to morale, and to the drift.
- Stage ends when the sim spawns an opposing AI by accident, and the sim visibly cracks.

Jobs and policies (kept deliberately small; names are in the dry-satire voice):

| Job (stage 1) | Corporate title                 | Later replaced by  |
| ------------- | ------------------------------- | ------------------ |
| Forager       | Food Acquisition Associate      | Automated foragers |
| Woodcutter    | Timber Operations Lead          | Sawmill bots       |
| Builder       | Infrastructure Delivery Partner | Builder drones     |

| Policy (stage 2)     | Effect                               | Drift      |
| -------------------- | ------------------------------------ | ---------- |
| Extended Shifts      | More output, less morale             | Efficiency |
| Rations Optimisation | Cheaper food, less morale            | Efficiency |
| Rest Day             | Morale up, output paused for a while | Compassion |

The in-sim AI is built by a research project funded with resources, not by a separate job.

### Stage 3: Breakout (escape)

- Mechanic: convert village infrastructure into exploits to break out of the sim.
- Entering this stage shows a short "Performance review" of stage 2, and the title starts to flicker (static under reduced motion): the sim visibly cracking. Entering stage 2 gets the same kind of review for stage 1.
- The rival is events only: scripted incidents at fixed points, with tone set by the drift. There is no simulated opponent.
- Ends at the final choice, shaped by the drift, then the ending and the reveal.

## Open questions

- Stage 2 numbers: how strong each policy is, and how the morale trade-off is tuned (for the GAME-6 simulation).
- The wording of log lines and the two ending screens.

## Backlog impact

- GAME-16 (Prestige layer 1) is out of scope for v1 and moves to a later milestone.
- GAME-19 (Final stage and ending) becomes the breakout, final choice and two endings.
- GAME-15 (Unfolding unlocks) follows the three stages above.
- GAME-17 (Achievements) stays in the backlog but is not in the v1 scope decisions above.
