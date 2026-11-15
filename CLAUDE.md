# Notes for Claude

This repo auto-posts Tower Clash Shorts (@TowerClashShorts) for Rellz. See README.md for how it works.

- Which game an update is for (Rellz, 2026-11-15): an update asked for in the Tower Clash chat is for Tower Clash only; one asked for in the Army Clash chat is for Army Clash only; one asked for in the Clash Auto Pilot chat (the daily autopilot, renamed "Clash Auto Pilot") goes to both games. `engine.js` here started as Army Clash's `engine.js` plus the `api._` export line, and `music.js` as its copy; they are brought back in step only when an update is meant for both games (to do that, copy Army Clash's over and put the `api._` line back after `Object.assign(api, ...)`).
- Don't change `pimprello/army-clash` unless Rellz asks for a specific change there (2026-11-14 he asked for its thumbnail fit to be fixed from here: done in engine.js `drawThumb`). Never touch its secrets, workflows or schedule. Another Claude session may be working on these repos at the same time: always pull before editing and merge, never overwrite.
- 4 posts a day, top quality (Rellz, 2026-11-14), at 12:00, 16:00, 19:00 and 22:00 London time (`rules.schedule`); each is the most dramatic of 5 candidate battles (`pick-seed.js`, `rules.quality`). Never raise the count without Rellz asking. A manual run always posts.
- Animations are always smooth (Rellz, 2026-11-15): nothing teleports or snaps into place; troops walk to where they need to be, round each other.
- Never draw a character sideways (Rellz, 2026-11-14: "don't make the character sideways"): little people always stand upright, in thumbnails, cards and portraits; only top-down creatures may be turned.
- Drawing never changes a battle: the simulation runs in fixed 1/120 s ticks and battle dice are separate from looks dice.
- Test before pushing: `node --check` every file, a batch of headless battles (no crashes, defenders win about 40–60% after on-the-spot balancing), and still frames (`STILLS=1 SCALE=1 node render.js`). Don't send Rellz preview videos; use stills.
- After every change you push (Rellz, 2026-11-14: "upload now for a test, always do that"), start the workflow by hand straight away (REST dispatch works), check it uploads, and give him the link. A manual post in a slot counts as that slot's post.
- Log changes in CHANGELOG.md. The daily autopilot follows AUTOPILOT.md.
