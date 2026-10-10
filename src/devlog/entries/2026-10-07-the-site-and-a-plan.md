---
title: The site, and a plan for a game
date: 2026-10-07
summary: Moved the site to Vite and TypeScript, then wrote down what the game is.
---

Before any game, the site itself needed to stop being a 2020 Create React App project. It now builds with Vite, is written in TypeScript, is formatted by Prettier, and checks every change in CI before it deploys.

Then the game got a design outline. The idea is a short idle game where the first stage is about food and the later ones are about what the food was for. It is meant to take about two hours, and it ends on a choice.

- **A prototype of the economy** as a simulation script, so prices and pacing could be tested before any screen existed.
- **A core engine** that is plain data and a clock, with no interface in it.
- **A save system** with autosave, export and import, and versioned saves that upgrade themselves.
- **The first screen:** one Gather button, a counter, and a first job to hire.
