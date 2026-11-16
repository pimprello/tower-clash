# Channel text (About pages)

The About description for each channel (YouTube allows 1,000 characters). Tower Clash's is set automatically from this file by `set-channel.js` (run by the "Check videos" workflow). Army Clash's upload key can only upload, so its text is pasted by hand: YouTube Studio → Customisation → Basic info → Description.

Both follow the same layout: what the channel is, what happens in each Short, that it's a simulation, when new ones come out, and the call to comment.

## Tower Clash (@TowerClashShorts)

Channel name: **Tower Clash**

Description:

```
Tower Clash: tower-defence battles, simulated and filmed in 4K.

Every Short is a brand-new 60-second battle. A warband marches on the base in waves, then sends in its boss. The defenders spend the gold from every kill on new towers, upgrades up to tier 5 and spells from a travelling merchant. Will the base survive?

Every battle is played out by the game's own rules and dice, on a different map and path each time, with an original soundtrack made for every video. The orders and warbands are made up.

New battles every day at 10:00, 14:00, 18:00 and 22:00 (UK time).
Guess the result in the comments before the end.

Sister channel: Army Clash.
```

## Army Clash

Channel name: **Army Clash**

Description:

```
Army Clash: huge army battles, simulated and filmed in 4K.

Every Short is a brand-new 60-second battle between two armies, sometimes three: knights, samurai, robots, zombies, titans, dragons and more, on a different map each time. Tribes forge better weapons as they fight, merchants sell spells, and battle events can turn it at any moment. Who wins?

Every battle is played out by the game's own rules and dice, with an original soundtrack made for every video. The tribes and their stories are made up.

New battles every day at 10:00, 14:00, 18:00 and 22:00 (UK time).
Pick your side in the comments before the end.

Sister channel: Tower Clash.
```

## Art

All three channels use the banner and profile picture made by `node brand.js` (files in `out/`): the same ray burst, the same troop placement and the same name font and size. Tower Clash is violet, Army Clash sky blue, Territory Clash mint green (2026-11-16: Rellz asked for the three to match the live Army Clash and Tower Clash pages).

## Channel art for the whole family (2026-11-16)
Rellz asked for one consistent profile picture and banner for Army Clash, Tower Clash and Territory Clash: each its own colour, the same style and theme, no text on the profile picture, only the channel name on the banner. `node channel-art.js` writes them to `out/art/` (`<channel>-pfp.png` 800x800, `<channel>-banner.png` 2560x1440 with the crest and name inside YouTube's 1546x423 safe area). The design: a glossy heraldic shield with a gold rim on a burst of light rays, a faint hex pattern and sparks, with the channel's icon on the shield (Army Clash: crossed swords, red; Tower Clash: a stone tower, blue; Territory Clash: a flag planted on a hex of land, green). The name is in the videos' font, the same size on all three, white over the channel colour, with a gold bar under it. It replaces the `brand.js` art.
