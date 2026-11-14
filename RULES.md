# rules.json

| Rule | What it does |
| --- | --- |
| `schedule.hours` | London-time hours a scheduled run may post at (12 even hours). Don't add more without Rellz asking. |
| `schedule.windowMinutes` | How late after a slot a run may still post (GitHub's timer is often late). |
| `video.scale` | 2 = 4K (2160x3840), 1 = 1080x1920. |
| `video.fightSeconds` / `outroSeconds` | The battle is paced to end near `fightSeconds`; the video ends `outroSeconds` later. |
| `thumbnail.on` | Make `out/thumb.jpg` and set it on the video. |
| `cinematic` | The camera director (zooms, slow motion). Looks only. |
| `teamPairs` | Defender and attacker colours, used in turn. |
| `modes` | Chance weights for the battle modes (classic, bossrush, swarm, laststand, escort, lava, night). |
| `balance` | On-the-spot balancing: `tests` quick battles per step, `steps` halvings between `lo` and `hi` attacker strength, aiming at `target` defender wins. |
| `events` | Battle events that can happen (airdrop, airstrike, meteors, hazard). |

Layouts, maps, defender line-ups and attacker line-ups rotate with the number of videos posted (`videos.jsonl`).
