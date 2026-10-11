---
title: Gather food leaves without shoving the shop
date: 2026-10-11
summary: When the Gather food button is reassigned, the shop stays where it was on screen.
---

When the village grew past needing the Gather food button, it left the Build tab and everything below it jumped up by about 95 pixels in one go. The same happened in reverse if the village ran out of food and the button came back.

Now the page adjusts by the same amount, so the button you were about to tap stays under your thumb.

**Not tested:** on a real phone, and not watched end to end in a browser. I could only check the adjusting in an automated test of the same mechanism used for new shop rows. If you are scrolled right to the top, there is nothing to scroll back, so the shop can still move then.
