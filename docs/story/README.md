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

| Epoch      | Story | Chapter | Title | Status |
| ---------- | ----- | ------- | ----- | ------ |
| (none yet) |       |         |       |        |

The story starts when the agent first runs: it writes the bible, the plan for story 1 and chapter 1,
then waits for review before continuing.
