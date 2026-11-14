# Tower Clash

Fully automated tower-defence YouTube Shorts for **@TowerClashShorts**. Every video is a new 60-second battle: an invented order of defenders builds and upgrades towers along the path(s) to their base while an invented warband sends wave after wave, then a boss. Will the base survive?

It reuses the Army Clash engine (`engine.js`: the cast, art, shine, blood, camera director and sound) and adds the tower-defence game on top.

## How it runs

- `.github/workflows/post-tower-clash.yml` wakes every 15 minutes. `slot.js` lets the first run after each upload hour (London time) post, so there are **4 top-quality Shorts a day** (12:00, 16:00, 19:00, 22:00); each is the most dramatic of 5 candidate battles (`pick-seed.js`). A manual run (Actions → Post Tower Clash → Run workflow) always posts.
- `render.js` picks the set-up (layout, map, towers, attackers, mode, colours), balances it on the spot with quick headless battles (aiming at an even chance), then renders a 4K 60 fps video with sound, a thumbnail and the title, description and tags.
- `upload.js` uploads it and sets the thumbnail (again after YouTube has processed it). `log-upload.js` records it in `uploads.md` and `videos.jsonl`.
- `stats.js` fetches view counts once a day into `stats/`.

## Files

| File | What it is |
| --- | --- |
| `td-data.js` | All the tables: layouts, maps, towers, tiers, elements, waves, bosses, spells, modes, orders, warbands |
| `td.js` | The board: paths, build spots, the base, towers and walls |
| `td-sim.js` | The battle: waves, the defenders' gold and decisions, shooting, the boss, the ending |
| `td-play.js` | Spells, the merchant, the war shaman, battle events and modes |
| `td-draw.js` | Everything drawn on top of the engine: board, towers, base, screens, thumbnail |
| `render.js` | Makes one video |
| `rules.json` | The dials (schedule, video, colours, mode chances, balance). See `RULES.md` |
| `brand.js` | Channel art for Tower Clash and Army Clash (`node brand.js`) |
| `CHANNEL.md` | The About text for both channels |

## Secrets (Settings → Secrets and variables → Actions)

`YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN` (upload), `YT_API_KEY` (view stats).

## Testing

```
npm ci
SEED=123 SCALE=1 STILLS=1 node render.js     # still frames + thumbnail in out/, no video
SEED=123 SCALE=1 node render.js              # a 1080x1920 video
```
