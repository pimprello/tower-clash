# Notes for Claude

This repo auto-posts Tower Clash Shorts (@TowerClashShorts) for Rellz. See README.md for how it works.

- Never push to, or change secrets, workflows or the schedule of, `pimprello/army-clash`. It is read-only for this project; `engine.js` here is a copy (with `api._` exporting its helpers for the td files).
- 12 posts a day, one every 2 hours on the even hours London time. Never raise it without Rellz asking. A manual run always posts.
- Drawing never changes a battle: the simulation runs in fixed 1/120 s ticks and battle dice are separate from looks dice.
- Test before pushing: `node --check` every file, a batch of headless battles (no crashes, defenders win about 40–60% after on-the-spot balancing), and still frames (`STILLS=1 SCALE=1 node render.js`). Don't send Rellz preview videos; use stills.
- After a change Rellz asked for, start the workflow by hand (REST dispatch works) and give him the link.
- Log changes in CHANGELOG.md. The daily autopilot follows AUTOPILOT.md.
