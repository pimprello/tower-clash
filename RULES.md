# rules.json

| Rule | What it does |
| --- | --- |
| `schedule.hours` | London-time hours a scheduled run may post at (1 a day: 18, the same as Army Clash; Rellz, 2026-11-21). Don't add more without Rellz asking. |
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
Every video has its own original soundtrack, written by code from the seed (`music.js`, identical to Army Clash's). `on` (true), `volume` (0.45, under the effects), `duck` (0.45, how far it dips under loud effects), `pulse` (true: the camera punches in on the beat in the last six seconds of the fight), `loop` (true: the outro's last 0.4 s fades into the cover frame so the replay flows on). Each video has its own two-bar hook on a lead (brass, flute, square lead or synth by style), wide pads breathing with the kick, strings or an arpeggio, a hall reverb and an echo. It follows the battle: a soft intro, the drop after the first kill, busier when more is happening, a heartbeat, riser and a beat of silence before the end, a huge hit, then a victory fanfare.

## Looks (`rules.ui`)
`humans` (true): person-shaped troops are drawn as little people (`HUMAN`/`drawHuman` in `engine.js`). `blood` (on): blood jets, splatter on the ground, pools and spattered killers instead of sparks (`drops`, `sparks`, `stay`). Looks only.

## `intro`

`on` (true), `seconds` (2.6): every video opens with the electric face-off (`faceoff.js`, the same file as Army Clash's): the best tower against the boss, each in a ring on a band of its side's colour, a lightning seam between them, VS, then a flash into the fight. Everything after it (sound, music) is shifted by its length.

## music.levels

How loud the effects and the music are, in dB (Rellz, 2026-11-16: the same levels in all three games, the music a bit louder but never over the effects): `effects` -14, `music` -19. Each video is measured and brought to these, so every video and every game sounds the same. Keep the music below the effects. When set, `music.volume` is not used.

## `picks` (Rellz's 26 picks, 2026-11-17, the same dial names in all three games)

`on` turns them all on or off (off: every old seed plays exactly as before; `PICKS=0` turns them off for one render). One dial per idea, each `true`/`false` unless a number:
- Troops: `golem` (`golemSplit`: health share that splits it, 0.4), `bard`, `plague` (`cloudR`, `cloudSecs` 5, `cloudDps`), `mimic` (`mimicBite` 3), `traitor` (`traitorAt` 0.5), `rats` (8 to a nest), `ram`, `troops` (Army: new troops in invented match-ups).
- Spells: `spells` (the six new ones), `chainJumps` 4, `chainDmg`, `novaR`, `novaSecs` 3, `rainR`, `rainSecs` 6, `rainHeal`, `smokeR`, `smokeSecs` 6, `smokeMiss` 2 (every 2nd shot), `wallLen`, `wallSecs` 6, `vampShare` 0.25, `vampSecs` 8.
- Modes: `modes` (weights added to the mode rotation: tug, siege, boss, hill), `hillScore`, `hillTarget` 25 s, `winFrom` 9 (a mode's win only comes in the last 9 s, so battles keep their length), `wallHp`, `bossHp`, `bossDmg`, `bossArmy`, `lastStand`.
- Looks: `weather`, `weatherChance` 0.4, `dusk`, `duskChance` 0.3, `replay`, `replaySecs` 0.8, `mvp`.
- Sound: `commentator`, `maxCalls` 8, `callGap` 6 s, `voice` 0.62, `crowd`, `crowdBed` 0.075, `mapMusic`.
New looks dice: Army and Tower weather `seed ^ 0x5EA7E2` (dusk with it), particles `^ 0x5EA7E3`, `^ 0x5EA7E4`; commentator lines `^ 0xC0AA7E`; Tower troops in waves `^ 0x91C4A5`; Territory picks `^ 0x91C4A6` (Territory's weather and dusk use hashes of the seed).
