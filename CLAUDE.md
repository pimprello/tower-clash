# Notes for Claude

This repo auto-posts Tower Clash Shorts (@TowerClashShorts) for Rellz. See README.md for how it works.

- Never push to, or change secrets, workflows or the schedule of, `pimprello/army-clash` from work on this project; `engine.js` here is a copy (with `api._` exporting its helpers for the td files).
- The clash games are one family (Rellz, 2026-11-14: "you are a hive mind, you work with tower clash and all future clash games"): a feature Rellz asks for in one game goes into the others too where it fits, each repo following its own CLAUDE.md and getting its own test post. Shared code is kept identical across the repos: `engine.js` is Army Clash's `engine.js` plus the `api._` export line (to update it, copy Army Clash's over and put that line back after `Object.assign(api, ...)`); `music.js` (the original soundtrack written from the seed, `rules.music`; beat punches and the seamless loop fade are in `render.js`).
- 12 posts a day, one every 2 hours on the even hours London time. Never raise it without Rellz asking. A manual run always posts.
- Drawing never changes a battle: the simulation runs in fixed 1/120 s ticks and battle dice are separate from looks dice.
- Test before pushing: `node --check` every file, a batch of headless battles (no crashes, defenders win about 40–60% after on-the-spot balancing), and still frames (`STILLS=1 SCALE=1 node render.js`). Don't send Rellz preview videos; use stills.
- After every change you push (Rellz, 2026-11-14: "upload now for a test, always do that"), start the workflow by hand straight away (REST dispatch works), check it uploads, and give him the link. A manual post in a slot counts as that slot's post.
- Log changes in CHANGELOG.md. The daily autopilot follows AUTOPILOT.md.
