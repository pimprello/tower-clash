# rules.json

| Rule | What it does |
| --- | --- |
| `schedule.hours` | London-time hours a scheduled run may post at (4 a day: 12, 16, 19, 22). Don't add more without Rellz asking. |
| `quality` | `candidates`: how many battles `pick-seed.js` tries before keeping the most dramatic; `fine`: a finer search for the close finish. |
| `schedule.windowMinutes` | How late after a slot a run may still post (GitHub's timer is often late). |
| `video.scale` | 2 = 4K (2160x3840), 1 = 1080x1920. |
| `video.fightSeconds` / `outroSeconds` | The battle is paced to end near `fightSeconds`; the video ends `outroSeconds` later. |
| `video.pace` | How fast the battle plays (0.85 = a little slower than real time, so the video runs about 70 s). |
| `sound.sfx` | How loud the battle's sounds are under the music (0.7). |
| `thumbnail.on` | Make `out/thumb.jpg` and set it on the video. |
| `cinematic` | The camera director (zooms, slow motion). Looks only. |
| `teamPairs` | Defender and attacker colours, used in turn. |
| `modes` | Chance weights for the battle modes (classic, bossrush, swarm, laststand, escort, lava, night). |
| `balance` | On-the-spot balancing: `tests` quick battles per step, `steps` halvings between `lo` and `hi` attacker strength, aiming at `target` defender wins. |
| `events` | Battle events that can happen (airdrop, airstrike, meteors, hazard). |

Layouts, maps, defender line-ups and attacker line-ups rotate with the number of videos posted (`videos.jsonl`).

## Music (`rules.music`)
Every video has its own original soundtrack, written by code from the seed (`music.js`, identical to Army Clash's). `on` (true), `volume` (0.45, under the effects), `duck` (0.45, how far it dips under loud effects), `pulse` (true: the camera punches in on the beat in the last six seconds of the fight), `loop` (true: the outro's last 0.4 s fades into the cover frame so the replay flows on). It follows the battle: a soft intro, the drop after the first kill, busier when more is happening, a heartbeat, riser and a beat of silence before the end, a huge hit, then a victory fanfare.

## Looks (`rules.ui`)
`humans` (true): person-shaped troops are drawn as little people (`HUMAN`/`drawHuman` in `engine.js`). `blood` (on): blood jets, splatter on the ground, pools and spattered killers instead of sparks (`drops`, `sparks`, `stay`). Looks only.
