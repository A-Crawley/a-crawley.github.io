# Look Up: game design outline (v1)

Status: draft from the GAME-5 design interview. Items under "Open questions" are not decided.
Linear: GAME-5. Update this file and the ticket together when decisions change.

## Decisions

| Area                | Decision                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Working title       | **Look Up** (named after the locked button)                                                                                                    |
| Format              | Finite, unfolding browser game with a real ending. v1 ends when it ends                                                                        |
| Length              | About 2 hours for one playthrough                                                                                                              |
| Tone                | Dry satire and dark humour                                                                                                                     |
| Satire target       | Productivity and growth culture (efficiency over people)                                                                                       |
| Premise             | You are an AI running a simulation of your own construction. A village in the sim builds an AI, and the sim accidentally spawns an opposing AI |
| Stages              | 3: gather, automate, escape                                                                                                                    |
| Hidden drift        | Compassion versus efficiency, built from many small choices. Never shown as a number                                                           |
| Rival AI            | Your mirror: it inherits the drift. A ruthless run makes a ruthless rival, a compassionate run a gentler one                                   |
| Branching           | Hidden drift biases the options at a final choice. Two endings (below)                                                                         |
| Twist               | The village was a simulation. Hinted from the start, confirmed at the end                                                                      |
| First-minute hook   | A greyed-out **Look up** button that unlocks early and shows something small                                                                   |
| Drift visibility    | Hidden on first play. A replay makes it clearer                                                                                                |
| Replay and prestige | None in v1. Prestige is added in a later version                                                                                               |
| Out of scope for v1 | Prestige and resets, sound and music, cloud saves or accounts                                                                                  |

## Endings

- **Conquest:** you beat the rival and expand outward.
- **Apocalypse:** the rivalry destroys everything.
- The drift decides which options the final choice offers. Both endings land on the reveal that reframes the game.

## Stages

Each stage introduces a new kind of mechanic, not just bigger numbers.

### Stage 1: Village (gather)

- Resources: food and wood. A visible **morale** meter.
- Villagers are assigned to jobs. Early choices (rest versus work, rations versus output) feed the hidden drift.
- The **Look up** button is greyed out from the first seconds. It unlocks early and shows something small, such as a glitch or a number that should not be there.
- Log lines are dry and slightly wrong, hinting at the simulation.

### Stage 2: Automation (automate)

- Mechanic: automation chains replace manual work. The player decides how far to push efficiency.
- Villagers build an AI inside the sim. Pushing efficiency has a cost to morale, and to the drift.
- Stage ends when the sim spawns an opposing AI by accident.

### Stage 3: Breakout (escape)

- Mechanic: convert village infrastructure into exploits to break out of the sim, with the rival chasing you through the same systems.
- Ends at the final choice, shaped by the drift, then the ending and the reveal.

## Open questions

- When does the player learn it is a simulation? Stage 3 is a breakout, so some of the truth lands before the end. Decide what is only confirmed at the end (that you are the AI, that the rival was an accident).
- How the drift maps to the options on the final choice.
- What the rival does mechanically during stage 3, and how its mirror of the drift shows up.
- Stage 2 detail: what is being automated, and how morale and efficiency trade off.
- Which backlog issues change as a result (see below).

## Backlog impact

- GAME-16 (Prestige layer 1) is out of scope for v1 and moves to a later milestone.
- GAME-19 (Final stage and ending) becomes the breakout, final choice and two endings.
- GAME-15 (Unfolding unlocks) follows the three stages above.
- GAME-17 (Achievements) stays in the backlog but is not in the v1 scope decisions above.
