# Daily autopilot

Once a day:

1. **Health check.** Look at the last day's runs of "Post Tower Clash" (`gh run list -R pimprello/tower-clash`). Every slot should have posted; if runs failed, read the annotations/logs and fix the cause. Check `uploads.md` grew by about 12.
2. **Learn.** Read `stats/summary.md` (once there are videos a day old): which layouts, maps, modes, bosses and title kinds do best. Lean the rotation or mode weights in `rules.json` towards what works, gently.
3. **Add one new thing** in the spirit of the game (a tower, a boss, a spell, a map style, a mode, a title kind, a visual touch). Test it (crash batch, balance, stills) before pushing.
4. **Log it** in `CHANGELOG.md`.

Guardrails: never change the number of posts a day; never touch `pimprello/army-clash`; never spend the YouTube quota on anything but the scheduled posts and stats; keep titles free of spoilers and of real people, groups or insignia.
