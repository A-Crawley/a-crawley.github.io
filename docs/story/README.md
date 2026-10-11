# Look Up: companion story

A story that sits next to the game. It shares the game's world, tone and themes, but it is its own
telling. The game takes inspiration from it (images, names, lines, moments); the story does not
follow the player's choices or retell the stages.

Maintained by the `story-writer` agent (`.claude/agents/story-writer.md`). Game design lives in
`docs/game-design.md`. Andrew's decisions for the story are in `brief.md`.

## Shape

The story is told in **epochs**. Epoch 1 is three short stories, one per game stage (gather,
automate, escape), loosely related. The story is told in first person, present tense, and ends in
the Apocalypse. Story 1 follows one person who watches the village grow, and ends just before the
machines start replacing jobs.

## Layout

- `brief.md`: owner decisions. The agent reads it and never edits it.
- `bible/`: canon (`world`, `cast`, `timeline`, `style`, `plan`, `clue-ledger`, `reveal-schedule`
  and `run-log`).
- `epoch-NN-<slug>/story-N-<slug>/chapter-NN-<slug>.md`: one file per chapter.

## Conventions

- Each chapter has a header with `title`, `epoch`, `story`, `chapter`, `status` and `summary`, then
  the prose, then an `## Echoes for the game` section of suggestions the game could borrow.
- `status` is `draft` until Andrew approves it, then `approved`.
- The twist (the village is a simulation, and the rival was an accident) stays hidden until
  `bible/reveal-schedule.md` says it may be hinted at or stated.

## Status

| Epoch                 | Story          | Chapter     | Title           | Status |
| --------------------- | -------------- | ----------- | --------------- | ------ |
| 1: The Long Afternoon | 1: The Counter | 1           | First Count     | draft  |
| 1: The Long Afternoon | 1: The Counter | 2 (planned) | The Spare Notch | none   |
| 1: The Long Afternoon | 1: The Counter | 3 (planned) | Onboarding      | none   |
| 1: The Long Afternoon | 1: The Counter | 4 (planned) | Exact           | none   |

The village's authority is a shaman, Dunstan Fallow, Speaker of the Yield, who speaks the Spirit's
Word aloud from the Stump of Saying (see `brief.md` and `bible/world.md`).

Stories 2 and 3 are proposed in `bible/cast.md` and `bible/plan.md`, awaiting Andrew's approval.

Chapter 1 is at
`epoch-01-the-long-afternoon/story-1-the-counter/chapter-01-first-count.md`. Chapter 2 waits for
Andrew's review of the narrator, voice and plan.
