---
title: Developer tools, a new layout and a toast that would not leave
date: 2026-10-08
summary: Skip ahead for testing, separate phone and desktop layouts, and an achievement bug.
---

Testing a two-hour game by playing it for two hours does not scale. Adding `?dev=1` to the game's address now shows tools to skip time, let a bot play to a goal, hand out resources and set how kind the village has been. The setting is remembered, and `?dev=0` turns it off.

The screen was redesigned with three layouts. A phone gets sticky resources and the main button within thumb reach. A tablet gets resources across the top. A desktop gets a dashboard with a rail on the left, the shop in the middle and the log on the right.

- **A bug fix:** when two achievements arrived together, the second toast stayed on screen forever. Each toast now gets its own timer, and a test covers it.
- **Not yet checked:** the layouts have not been tried on a real phone.
