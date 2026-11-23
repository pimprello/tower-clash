# Changelog

## 2026-11-23: One mix for all three channels; a rarer, softer narrator

- Measured the mix of one video from each game. Music as heard: Tower Clash -21.4 dB, Army Clash -22.6, Territory Clash -21.1. Narrator: Tower Clash -21.6 dB, Army Clash -13.4, Territory Clash -10.9 (it rode on the effects' level, so a quiet battle pushed it up), with 7 or 8 lines a video.
- Now all three: the music is set by how loud it is as heard (`music.levels.heard` -21.5, Tower Clash's level) and the narrator from the music (`levels.voice` -1, with a 3 dB dip in the music under it), so the balance is the same on every channel and in every video.
- The narrator is rare: at most 3 lines a video, at least 15 s apart (was 8, 6 s), keeping the biggest moments.
- Blended in: its own bus, faded in and out, rounded off (no rumble or hiss), sent into a hall reverb (wet 0.4) and landed on the beat (`rules.picks.blend`; Army Clash's general uses the same settings).
- `music.js` `mix()` and `commentary.js` are now the same code in all three games; with the new options off, the mix is unchanged (checked sample by sample).

## 2026-11-23: Normal crowd sizes again, defenders win more

- (Rellz: "dont necessarily put that many troops i dont mind if defenders win more it looks satisfying") troop numbers are back to normal (about 90 a battle); towers keep the 1.6x damage, troops stay squishy (hp grows only as power^0.5, power capped at x3), and the close-finish pick now wants the defenders to win 70% of the time (`rules.balance.target` 0.7). On test seeds the towers killed 80-95% of every army.

## 2026-11-23: Towers kill more, faster; the war shaman's totem updated

- (Rellz: "make towers do a bit more damage, i want towers to be killing more people and creatures quicker") `rules.slay`: towers hit 1.6x harder, and when the on-the-spot tuning makes attackers stronger they now come as more troops rather than tougher ones (hp grows as power^0.4, numbers grow with power). Battles stay close, but there is far more to kill: on test seeds the towers killed 1.3x to 2.2x as many troops (up to about 210 in a battle) at 1.6 to 3.4 kills a second. The tuning can now go up to x7.
- (Rellz: "there's still an old un-updated totem") the war shaman's totem was still the old brown post with a ball, drawn on the path over the troops. It now uses the new totem look (stone plinth, banded pole, crowned orb, runes), rises beside the path where no one walks, sinks back down after, and its cast rings and shadow lie on the ground under the troops.

## 2026-11-22: uploads can't be refused over a tag any more

- Tower Clash's 18:00 post on 22 November was refused by YouTube ("invalid video keywords"): the tags added up to more than YouTube's 500 characters once it counts the quotes it puts round every tag with a space. `upload.js` (the same fix in all three games) now cleans the tags before uploading: no < > " , # or emoji, at most 30 characters each, no empties or repeats, under 450 characters in all counting those quotes; the title and description lose < and > too.

## 2026-11-22: Fits on every phone

- Checked every piece of text each game draws, frame by frame, against what phones and YouTube cover (top notch, bottom title and channel line, the like/comment column, side crop on tall 20:9 phones). Fixed: the face-off question (WHO WINS? / WILL THE BASE SURVIVE? / WHO RULES THE MAP?) and the bottom side's name sat under YouTube's title; the face-off is lifted (rings smaller and higher, question at y 1480) for 2, 3 and 4 sides.
- Tower Clash: the combo counter moved from the bottom-right (under the like/comment buttons on every phone) to the bottom-left of the battlefield.

## 2026-11-22: No links in descriptions

- Removed the "Watch the last battle / Watch next" line and its YouTube link from every description (Rellz, 2026-11-22). Other videos are to be linked only through YouTube's related-video link (Shorts) and end screens (long-form, when they start); neither can be set through the upload API.

## 2026-11-22: Franchise consistency + invisible-overlay fix

- **Franchise subscribe CTA** (all 3 channels): every description now ends with "New battle every day on Army Clash · Tower Clash · Territory Clash — subscribe and hit the bell!" so viewers discover the other two channels.
- **Franchise tags**: added `clash game` and `clash universe` tags on every video and `#clashuniverse` to the hashtag line for cross-channel YouTube search.
- **Invisible-overlay fix** (`render.js`): added `ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'` after the main draw call in every game's render loop. Any `globalCompositeOperation` or `globalAlpha` leaked by an internal draw function is now reset before overlays paint — so roster cards, the cliffhanger pill and the subscribe CTA are always visible.

## 2026-11-22: Christmas content ready (switched on 24 to 26 December only)

- On Christmas posts (`holiday.js`, 24 to 26 December) every little person wears a Santa hat, every drop comes as a wrapped present (red or green paper, gold ribbon and bow) and the banner reads GIFT DROP! (`this.xmas` in `engine.js`, looks only, so battles are unchanged). Together with what was already there (snow falling, the snowy map, the festive soundtrack, the holiday title and tags) this is the Christmas special. Built in Army and Tower Clash's engines (the same code in both); Territory Clash already has its Christmas look (the Frostwild island in snow, festive music).

## 2026-11-22: the witch's voice at her own pitch again

- The "a touch lower and slower, more regal" take of 2026-11-21 was meant for Territory Clash, not here (Rellz), so `sfx/make_oracle.py` no longer lowers her and `sfx/oracle/` is remade: the same lines, with the soft echo and the fades, at her normal pitch.

## 2026-11-22 (Rellz, Tower Clash chat): no episodes; troops no longer cut off in the cold open

- Rellz: "there's no episodes, remove episodes from thumbnails and titles". The face-off's EPISODE tag is gone (it shows RARE GOLDEN BOSS on a golden-boss battle, nothing otherwise), the description no longer opens with "Episode N", and "Watch last episode" is now "Watch the last battle". (Titles already had none since 2026-11-21.)
- Rellz (a screenshot of troops sliced off by a straight line): the cold open draws the battle on a 1.5x canvas, but the engine's troop layer was still sized for the normal screen, so everything below two thirds of the big canvas was cut. The engine's scale is set to the big canvas's while it draws again (this fix of 2026-11-17 had been lost in the 1-upload-a-day rewrite).

## 2026-11-21 (Rellz, Tower Clash chat): nothing under the phone's notch

Rellz: "nothing in the UI should be in the top 190 px of the 1080x1920 frame, where the iPhone notch/camera island and YouTube's top bar cover it."

- The scoreboard's logo ("TOWER CLASH") and hook line ("WILL THE BASE SURVIVE?") at the very top are gone; the scoreboard (DEFENDERS / WAVE / ATTACKERS) now starts just under 190 px.
- The face-off no longer draws the TOWER CLASH logo (it sat at 176-268 px); the EPISODE tag sits at 286 px. `faceoff.js` gained `o.titleY` (default unchanged, so Army Clash's face-off looks the same).
- The cold open (full screen, no UI) and the cliffhanger card (WHO WINS?! at 36% of the height) were already clear of it.

## 2026-11-21 (Rellz, for all three games): the cliffhanger ending

Rellz: "instead of fully ending and saying game over just end at the cliff hanger and say subscribe instead of game over or the end or whatever it says currently" (for all three channels; long-form videos come later, once their format is worked out).

- New `cliffhanger.js` (the same file in Army Clash, Tower Clash and Territory Clash; `rules.cliffhanger`). The Short no longer shows who wins: half a second of battle time before the final blow lands (in the slow motion going into it; the thumbnail's copy of the battle already knows when), the picture freezes with a flash and a jolt, drains of colour and darkens while it slowly pushes in; WHO WINS?! slams in, SUBSCRIBE / TO SEE THE ENDING comes up under it, a red SUBSCRIBE button pulses until a hand taps it and it turns into SUBSCRIBED with a ringing bell. 3.4 s, then the video ends; the sound fades away over the last 0.9 s instead of being cut. Sounds: a whoosh and a boom on the freeze, a thud for the words, a pop, a coin and a bell on the tap.
- The result is still worked out (from the full copy of the battle) and kept in `videos.jsonl` (`winner`, `winTeam`, `detail`, `cliffhanger: true`) for the long-form videos later; the outro (SURVIVED!/FALLEN!, the guess payoff, the MVP card) is no longer reached in a Short. Titles were already result-free.

## 2026-11-21 (Rellz's request from the Tower Clash chat): titles, cinematic base moments, voice, map music, layering, pairs, room round everyone, totems

Rellz: "remove episode names from title make more clickbait titles, if the base is getting attacked sometimes make a cinematic zoom to the base and make a cinematic effect, fast forward covers bottom ui that displays characters, make the voice have a little echo and a fade and blend in with the music, also make the music match the theme of the map, fix the layering bigger troops should cover smaller not other way unless if it looks weird, fix all layering and sometimes characters should walk side by side" (and from a message Rellz later said was meant for Territory Clash: "remove black bars and add your own cinematic effect" (kept here, it fits the base moments), the "Mmm..." line read out as letters (kept: the line was wrong here too); the more regal voice from it was taken back out; and: "make them go around the totem not through it, don't let troops go through each other", "improve the totem looks"). Tower Clash only.

- **Put back what the 1-upload-a-day rewrite (3ccf302) had dropped from render.js**: Rellz's picks (`rules.picks`: the new troops, spells, modes, weather and the rest were off in Tower Clash since), the commentator (the fortune-teller witch), the crowd and the map music.
- **Titles**: no episode number in the title any more (it stays in the description). Fifteen new hooks that never give the result away ("Can ANYTHING Stop ...?", "Only 1% Can Predict This Ending", "Wait For The Last Wave...", "The Last 10 Seconds Are INSANE", "This Boss Was NOT Supposed To Get This Far...", "This Tower Turns Troops Into CHICKENS" when the Hex Hut is in it, "A Black Hole Opened On The Battlefield", "... Is NOT What You Think" on the new worlds and more); a kind isn't reused within 20 videos.
- **The base under attack** (td-cam.js): when the base loses 3.5% in a second and a half the camera moves in on it with a short slow motion, at most three times a battle, 16 s apart.
- **Our own cinematic look instead of black bars** (td-draw.js `drawCine`): on the base moments and the final blow, a stronger vignette, a warm/cool film grade, a soft light leak drifting across and a faint grain; on the base a red heartbeat at the edges.
- **FAST FORWARD** sits under the tower panel now, not over it.
- **Voice** (sfx/make_oracle.py, remade): the line Piper read as letters ("Mmm...") is now "Ooh, that will leave a mark."; no more "..." in any line; a soft darkened echo (three repeats, 0.24 s apart); it fades in and fades out with its echo instead of starting and stopping dead, and sits a little lower (`oracleVoice` 0.62) so it blends with the music.
- **Map music** (render.js `MUSIC_MAP`): the map picks the style and the instruments (sands: plucked strings and hand drums; forests, groves, blossom: flute; snow, clouds, sky temple, candy, crystal caves: glassy bells; neon, moon, rainbow: synth arpeggio; furnace, ruins, castle, graveyard: war drums). music.js is unchanged (still identical in every game).
- **Layering** (td-draw.js): troops are drawn in order of where they stand, with a bigger troop counted as further forward, so big ones cover the little ones round them (a small one well in front still comes over); only the drawing order changes.
- **Side by side** (td-sim.js): in two waves out of three, small and middling troops pair up and walk shoulder to shoulder (the one behind catches up, no dice).
- **Room round everyone** (td-sim.js `roomTick`): troops fighting or standing, and attackers pressed against the defenders' troops, ease apart instead of overlapping; nobody walks through a totem or a fallen crystal (they step round them); totems stand a little further from the path.
- **Totems** look better: a carved stone plinth, a tapered wooden pole bound in the totem's colour with two fluttering ribbons, a glowing orb head under a little gold crown, runes circling it.
- Checked: headless battles (no crashes), stills of the base moment, the cinematic look and the totems, and a full render (commentator lines, sci-fi music on Neon City, title "Neon City Is Pure CHAOS 😵").

## 2026-11-17 (Rellz's request from the Tower Clash chat): a fortune-teller witch for the commentator

Rellz: "make the voice clearer and more appropriate, it should be like League of Legends, it should be like a witch girl fortune teller". Tower Clash only (the other games keep the shared sfx/call-*.wav, and commentary.js is unchanged).

- `sfx/make_oracle.py` makes Tower Clash's own lines in `sfx/oracle/` with Piper's en_GB-jenny_dioco-medium (a clear young British woman), for the same cues: "The first soul is claimed.", "The cards foretold this!", "Even giants bow to fate.", "Ooh, I saw that coming!", "Such delicious magic!", "Their fate is sealed.", "Just as the cards foretold!" and 14 more. Clear rather than shouted: no drive, gentle compression, a lift in the air band, a soft shimmer (a quiet copy a few cents up, 12 ms late) and a short airy room, like a game champion's lines.
- render.js uses `sfx/oracle/` when it's there (with the crowd bed copied in), and plays her a little louder than the old commentator (`rules.picks.oracleVoice`, 0.75; was 0.62), so she's clear over the music.

## 2026-11-17 (afternoon, Rellz's request from the Tower Clash chat): nothing cut off, troops down the middle, no replay, no sprinters

Rellz (with a screenshot of the cold open: a tower and two troops cut off by straight edges): "fix what happens here they get cut off and it looks ugly, centre characters like how titan is centred when he walks the path, remove the 2 second at the end where it replays it looks ugly, slow down the fast people it doesn't look nice when they're fast". Tower Clash only.

- **Cut off in the cold open**: the cold open draws the battle at 1.5x on its own canvas, but the shine layers were still sized for the normal screen, so towers and troops were sliced by their edges. The engine's scale (`RVB.RS`) is now set to the cold open's while it draws.
- **Down the middle of the path**: troops start within a quarter of the path's half-width of its centre (was anywhere across it), and when they bump into each other they now queue along the path instead of spreading sideways (sideways push cut to 30%, never more than a third of the way out).
- **No replay at the end**: `rules.picks.replay` is off in Tower Clash (the outro plays straight).
- **No sprinters**: the gap between quick and slow troops is narrower (`walkSpeed` = (0.32 x speed + 60) x 1.55; the middle is unchanged, wolf riders and goblins about 11% slower, the slowest a little quicker); charges are 1.6x (was 2.2x); boosts never take a troop past 1.3x its own pace (1.6x in a charge; was 1.6x and 2.3x); a clock-tower rewind walks back at 1.6x (was 2.6x); fast forward through quiet stretches tops out at 1.5x (1.25x under a notice; was 1.8x and 1.4x).
- Checked: 40 headless battles, no crashes, defenders won 55%; stills of the cold open and of troops walking.

## 2026-11-17 (Rellz's request, all three games): Rellz's 26 picks (`rules.picks`)

Rellz picked 26 of my 30 ideas (1 to 23 and 25 to 27) and asked for them in Army Clash, Tower Clash and Territory Clash, with only game-specific details different. Everything sits behind `rules.picks` (one dial per idea, the same names in every game); with it off, old seeds play exactly as before (checked in all three). Battle logic runs on the battle clock with no dice or with its own dice; the looks have their own. Already-posted videos don't change: the 10:00 post on 17 November is the first with them, in every channel.

**Shared by all three** (identical files): `music.js` (map music themes), `commentary.js` and `sfx/call-*.wav`, `sfx/crowd-bed.wav`, `sfx/make_commentary.py` (the commentator and the crowd), `holiday.js`. Army's and Tower's `engine.js` are back in step (Tower's and Territory's are Army's plus the `api._` line, now also exporting `lumOf`, `PK_SET`, `PK_SPELLS`).

- **25 Commentator:** 21 short lines ("What a hit!", "Titan down!", "Traitor!", "The gate is down!", "What a finish!"...) in a Piper voice that is not the war cry's (en_GB-northern_english_male-medium), made punchy with a little stadium room. The battle raises cues (first kill, a streak, a titan down, a big hit, the last stand, a split, a traitor, a gate, a spell, the finish); `commentary.js` says at most 8 a video, at least 6 s apart, never during the face-off or the charge, picks the line with looks dice, and mixes it into the effects, so the music ducks under the voice. (Fixed while building: the first batch of lines came out 18 s long each; the script's piper call is fixed and they're 0.6 to 1.2 s.)
- **26 Crowd swell:** a murmuring crowd bed under the fight that swells +3 dB on a kill and +6 dB on a titan, a gate, a capital (attack 0.2 s, release 1.5 s). It's part of the effects, measured before the levels are matched, so the mix still lands on effects -14 dB, music -19 dB.
- **27 Map music themes:** the map picks the instruments (desert: hand drums and a plucked oud-like lead; snow: sleigh bells and glassy bells; forest: breathy flute and plucked strings; neon and city: synth lead and arpeggio; furnace and bombed: war drums), on top of the era's style. Tower's Pharaoh's Sands, Mushroom Grove and Blossom and Territory's six island themes have themes too. At Christmas the snow theme goes festive (more bells, a counter-melody). Loudness is unchanged (the levels set it).
- Test renders: Army -12.7 LUFS, Tower -13.9 LUFS, Territory -12.9 LUFS; all within about 1 LU of YouTube's -14.

**Four more ideas of my own for each pick** (rule 7; built ones marked ✓, the rest are in IDEAS.md for later):
1 Stone Golem: ✓ the halves keep half the health each and walk on; ✓ a heavy single hit also splits it; little golems that merge back if they meet; a golem that splits three ways when titan-sized.
2 Bard: ✓ every 9 s the song becomes a war cry (bigger, faster); ✓ notes drifting off; a bard duel when two meet; a lullaby that slows enemies.
3 Plague Doctor: ✓ the cloud is acid, so acid troops are fed by it; ✓ in Tower it chokes towers (fire a third slower); a cure that cleans a cloud; a plague that spreads hold to hold.
4 Mimic Chest: ✓ the lid snaps with teeth when it bites; ✓ in Tower and Army it fights on after the bite; a golden mimic that drops gold; a mimic that eats a spell.
5 Ghost Knight: ✓ translucent while it walks through; ✓ once a battle only; a ghost army event at midnight; ghosts that can't be hit by arrows while phasing.
6 Battering Ram: ✓ gathers speed on a long run (Army); ✓ breaks walls and gates and pounds the base harder; a ram crew that repairs it; a flaming ram for fire tribes.
7 Traitor: ✓ the colour fades from the old army's to the new one's; ✓ Territory: three defectors march off to the attacker; a double agent who switches back; a traitor who steals the enemy's gold.
8 Bomb Rats: ✓ a pack of eight from one nest; ✓ rats never take land (Territory); a rat king that leads them; cheese bait that pulls rats off course.
9 Lightning Chain: ✓ storm troops are fed by it; ✓ ties broken by troop number, no dice; chains that jump further in rain; a chain that jumps to a tower and back.
10 Frost Nova: ✓ never hurts ice troops; ✓ titans freeze for half as long; frozen troops shatter on a big hit; a frost trail behind the nova.
11 Healing Rain: ✓ it falls over the most hurt towers (Tower) and the weakest hold's area (Territory); ✓ rain drawn under the troops; a rainbow when it ends; rain that also douses fires.
12 Smoke Bomb: ✓ a shot counter decides the misses (no dice); ✓ Territory: enemies can't even see the holds inside it; smoke that hides a flank attack; fire turning smoke black.
13 Shield Wall: ✓ shields across the path in Tower stop shots at the towers; ✓ Territory: the hold blocks every other arriving troop; shields that crack and glow as they're hit; a shield wall that walks forward.
14 Vampire Bite: ✓ drain particles from the victim to the killer; ✓ Tower: the base drinks what the towers deal; a vampire bat swarm; a blood moon making it stronger.
15 King of the Hill: ✓ match point when the score is reached early (the battle still runs its length); ✓ a ring that fills as they hold it; a hill that moves halfway through; a crown for the holder.
16 Tug of War: ✓ the losing side pulls harder (Territory grows 15% faster); ✓ a knot riding the rope; a rope snap at the end; both armies' chants.
17 Siege: ✓ a gate in the middle of the wall; ✓ the gate falling is a big moment (banner, shake, commentator); ladders over the wall; boiling oil from the walls.
18 Boss Rush: ✓ the boss is picked by era (no dice); ✓ Territory: three kingdoms ally against a Titan Empire for 30 s; a boss rage phase at half health; a second boss in overtime.
19 Last Stand: ✓ the last troop heals a third and runs 20% faster; ✓ Tower: the base below a fifth enrages every tower; a last stand speech card; allies' ghosts fighting beside it.
20 Weather: ✓ snow always on snowy maps and at Christmas; ✓ no weather during a blackout; puddles after rain; lightning flashes in storms.
21 Dusk to night: ✓ torches, banners and fire troops glow as it gets dark; ✓ Territory's holds light lamps; stars coming out; a full moon rising.
22 Slow-motion replay: ✓ half speed with a slow push in, film bars and a pulsing REPLAY tag; ✓ no extra length (it plays over the start of the outro); replay from another angle; a freeze frame on the killing blow.
23 MVP card: ✓ Army: the troop itself in a ring of its colour; ✓ Tower: the best tower and its title; Territory: the hold that launched the most captures; an MVP streak across videos; the MVP's line in the description.
25 Commentator: ✓ never twice the same line in a video; ✓ reacts 0.15 s after the moment, like a person; a second commentator for banter; lines in Rellz's own voice later.
26 Crowd: ✓ a seamless loop; ✓ bigger swells for titans, gates and capitals; boos when a traitor turns; a hush in the last seconds.
27 Map music: ✓ festive at Christmas; ✓ Territory's island themes too; a theme per holiday; the map's theme in the outro fanfare.

**In Tower Clash** (new `td-picks.js`, hooked in after `td-draw.js`; `render.js`; `test-battles.js` has `PICKS=1`):
- Troops join the attackers' waves (their own dice `seed ^ 0x91C4A5`): Stone Golems split into two halves that walk on down the path (a defenders' crystal golem splits too and both halves hold its spot), Bards speed the march, Plague Doctors throw flasks at towers (the cloud slows defenders and makes towers fire a third slower), Ghost Knights walk through a blocker once, Traitors turn at half health and fight for the base, Bomb Rats run at the nearest tower and blow up on it, the Battering Ram ignores blockers and hits walls, gates and the base 2.5 times as hard. Two Mimic Chests sit beside the path as crates and bite the first attacker that comes close.
- Spells: the merchant offers one of the six new ones on each visit (Lightning Chain, Frost Nova, Healing Rain over the most hurt towers, Smoke Bomb, Shield Wall across the path that stops shots at the towers, Vampire Bite: the base mends a share of what the towers deal).
- Modes: King of the Hill (a hill on the path; attackers holding it score; held 25 s, the base falls in the last seconds), Tug of War (a knot on the path pushed by attackers, pushed back by kills), Siege (a gate and walls across every lane); Boss Rush was already here. Last Stand: the base below 20% enrages every tower for 6 s; an attack down to its last troop goes berserk.
- Looks: weather and dusk come from the shared engine; the replay as in Army; the MVP card is the tower with the most kills (its title and tier). Checked: picks off = the pushed version on 10 battles (identical results); with picks on, 30 battles: no crashes, defenders won 63% at power 1 (the on-the-spot tuning sets the power for each video). Test video 73.8 s, -13.9 LUFS.

## 2026-11-17 (Rellz's request from the Tower Clash chat): a real cold open

Rellz: "fix the 3 sec intro thing, it should be the best 3 second of the vid played at the start and there should be no ui just cool effect to increase view retention then it goes to face off with electricity, improve other stuff too". Tower Clash only.

- **Cold open** (`rules.coldOpen`, render.js): every video now opens on 3 s of the busiest moment of its own battle. The thumbnail's copy scores every frame (kills, hits on the base, towers falling, explosions, a crowd at the walls, the boss close in) and the best 2 s stretch is picked; never the last 4 s, so the result stays a secret. It is played on a third copy, full screen with no scoreboard, panel, cards, numbers or words (`noUi`), drawn at 1.5x and cropped so it stays sharp. The camera is already on the action (a fourth copy finds where the peak happens) and pushes in; it plays at real speed, slows to 0.3x at the peak with a zoom blur and white impact lines round the edges, then speeds up again; a warm/cool film grade and a vignette over it; then a zoom, lightning bolts and a white flash into the electric face-off, with a whoosh, a boom at the peak, a zap and thunder. The video's loop now ends on the cold open's first frame.
- The face-off is a little shorter (2.4 s), so the battle starts sooner after the cold open.
- When a mystical crystal lands, the camera goes in on it for a moment, so it isn't missed.
- `TDCam.front()` can leave out its pull towards the base (the cold open uses it so the action sits in the middle of the picture).
- Test hook: `COLD_ONLY=1` stops after the cold open (with `STILLS=1` it saves its stills).

## 2026-11-16 (night, Rellz's request from the Tower Clash chat): crystal magic, strange new worlds, weird towers

Rellz: "remove this Cold open ... fix the over lay of the mortar hit, try to make it smaller and more realistic, fix camera work so it moves less but also zooms in more to where the action is ... add the mystical crystal it has 3 categories ... fix characters overlay over eachother, make cool strange different unique maps and characters like a rainbow ... make some characters specific to those maps who will be a bit stronger, also make a variety of cooler towers with better abilities and weird cool abilities". Tower Clash only.

- **Cold open removed** (render.js, rules.json).
- **Shell hits** (td-sim.js `shellHit`): mortar shells, cannonballs and boulders now land with a small, earthy hit (a quick flash, a short puff of fire and dust, dirt thrown up, a scorch mark that fades) instead of the engine's big screen-wide explosion with long shrapnel streaks, cracks, colour split and hit-stop.
- **Camera** (td-cam.js): after the opening (the whole board under the story card, the only time it is fully out) it stays close on the action (1.6x to 1.9x, closer the tighter the knot of troops) in one long steady shot with a dead zone, so it only drifts when the action leaves the middle of the picture. No more pull-backs for each new wave; big moments cut in closer (up to 2x).
- **No more overlapping troops** (td-sim.js): walking troops ease apart from any neighbour they overlap, sideways onto a free bit of the path or back into the queue, a few pixels a tick.
- **The mystical crystal** (new td-crystal.js, td-data.js `CRYSTAL`): three kinds of crystal magic. TRAPS go on the path ahead of the attackers (land mine, spike strip, bear trap, tar pit, flame vent, frost mine), TOTEMS stand beside the path and help the towers round them (war totem: faster fire; frost totem: slows; gold totem: double gold from kills; healing totem; storm totem: zaps), SUMMONS fight for the defenders (crystal golem, spirit wolves, treant guard that roots troops, a phoenix that sweeps the path with fire). The merchant now sells one of each kind on every visit (and the defenders can buy three things), and a mystical crystal falls from the sky every 12 s or so (twice as often in the Crystal Caverns), cracks open and sends a free one where it's needed, the kinds taking turns. Its own dice.
- **Six strange new worlds** (new td-worlds.js): Rainbow Road (a rainbow path over a starry sky), Candy Kingdom (frosting, a chocolate path with sprinkles, lollipops, candy canes, gumdrops, cupcakes, doughnuts), Mushroom Grove (giant spotted mushrooms, glowing blue ones, drifting spores), Pharaoh's Sands (pyramids, obelisks, palms, drifting sand), Sky Kingdom (a golden brick road over the clouds, balloons and cloud shadows) and Crystal Caverns (glowing crystal clusters and pools in the dark). Each new world is shown once first, in turn, then joins the usual rotation.
- **Natives**: each new world has its own troops, about 30% tougher, 25% harder-hitting and a little faster on home ground, who march in as one or two of the waves ("NATIVES OF THIS LAND"): prism knights and star sprites, gingerbread guards and see-through gummy brutes, shroomlings and spore brutes, mummies, jackal guards and scarab swarms, cloud knights and storm birds, gem knights and shard bats.
- **Six weird towers** (new td-weird.js): PRISM SPIRE (splits light three ways: burn, slow, stun), VOID ENGINE (a black hole that drags troops in, crushes them and pops), HEX HUT (turns troops into chickens: slow, harmless, take more damage), CLOCK TOWER (winds troops back down the path with afterimages), BEE HIVE (a swarm of bees that chases and stings), SHRINK RAY (shrinks the biggest troop for good). Four new tower line-ups use them (WEIRD SCIENCE, WITCHCRAFT, COSMIC WONDERS, THE STRANGE ONES).
- The description mentions the crystal and the world's natives.
- Checked: 48 headless battles with no crashes (defenders won 56%), still frames of every world, every crystal item and every new tower, and a full render on Rainbow Road.
## 2026-11-16 (Rellz's request, all three games): the same sound levels everywhere

Rellz: "make the sfx and music all same levels in all 3 tower army and territory clash the music should be a bit louder but not louder than sfx, tower clash did it quite nice".

- **`rules.music.levels`** (`{ "effects": -14, "music": -19 }`, the same in every game): the mixer in `music.js` (identical in all the games) measures each video's effects and music the way ears judge loudness (`loud()`: 0.4 s blocks, near-silence ignored) and brings them to these levels before ducking and limiting. The music sits 5 dB under the effects, a little louder than Tower Clash's balance was, never over them.
- Before, on the same test: Army Clash's effects were at -9.8 dB with its music 17 dB under them (hardly heard), Tower Clash's at -17 dB with its music 7.6 dB under. After: both -14 / -19, and the finished videos measure -13.1 (Army) and -13.5 LUFS (Tower), next to YouTube's own -14.
- `AUDIO_STATS=1` prints the levels while rendering. Battles unchanged. Already-posted videos don't change; the next scheduled post has it.

## 2026-11-16 (afternoon, Rellz's request from the Tower Clash chat): viewer retention

Rellz: "Add all the updates you believe is the best for viewer retention don't ask me for anything just build and push". Tower Clash only.

- **Cold open** (`rules.tease`, render.js): the video opens on 1.4 s of the scariest moment of the same battle (the boss closest to the base while it still stands, so the result isn't given away), in slow motion with film bars, a COMING UP pill and WAIT FOR IT..., then a white flash into the face-off. Played on a third headless copy; looks only.
- **Slow-motion final blow** (td-cam.js, render.js): the thumbnail's copy has already played the battle through, so the camera knows when and where the last blow lands and goes there in slow motion (Army Clash's finale: FINAL BLOW and who did it, a short hold, then the result). `rules.video.finale: false` turns it off.
- **Fast forward through quiet stretches** (td-cam.js): when nobody has been killed for a couple of seconds, no boss is on the board and the base isn't being hit, the battle eases up to 1.8x (1.4x while a notice is on screen, never under the guess prompt) with a FAST FORWARD pill, then eases back the moment the action returns. Video time only: the battle still moves in fixed ticks (checked: the battle ends at the same second as the headless copy). Saves about 2 to 5 s a video, mostly the walk-up before the first kills.
- **The guess is answered**: under SURVIVED! / FALLEN!, DID YOU CALL IT? with the right answer ticked and the other crossed out.
- **Episodes**: EPISODE N on the face-off, (Ep. N) at the end of the title (when it fits) and on the description's first line, so the posts read as a series.
- **Rare golden boss** (`rules.rare.golden`, about 1 in 8): the same boss gilded with a glow, sparkles and a moving glint, a RARE GOLDEN ... card when it arrives, THE GOLDEN ... on the face-off and "A Rare Golden ... Appeared... 😱" as the title. Looks only.
- The camera pulse in the last seconds now follows the music's real time (it was ignoring the intro's offset). `smooth` is on (the engine's smoother shake and in-between drawing in slow motion).
- Test hooks: `STILL_AFTER=<battle second>` saves a still every 0.75 s from then on; stills mode also saves the first fast-forward frame and the cold open.

## 2026-11-16 (Rellz's request, both games): no test uploads, holiday specials

Rellz: "for army clash and tower clash don't do test uploads save usage on update and upload on schedule try to make matches balanced but even if one is overpowered it will make for an interesting short (try to make your own cool updates whenever you can to maintain the video evolution process for both channels and also remember to do specific videos for holidays like Christmas Easter etc etc".

- **No more test uploads** after updates: changes go out with the next scheduled post (CLAUDE.md, AUTOPILOT.md).
- **Balance** stays a goal, not a gate; lopsided battles are fine (AUTOPILOT.md).
- **Own updates:** the autopilot keeps adding its own cool updates to keep the videos evolving (AUTOPILOT.md).
- **Holiday specials (`holiday.js`, the same file in both games):** on New Year's Eve and Day, Valentine's, St Patrick's, April Fools, Easter (Good Friday to Easter Monday, worked out each year), Eid (expected UK dates to 2030), midsummer, Halloween, Bonfire Night and Christmas (24 to 26 December), the post's title becomes "🎄 Christmas Special: ...", the description opens with a holiday line, holiday tags are added and a map that suits it is used (snow at Christmas, the graveyard at Halloween...). `HOLIDAY=christmas` forces one for a test. The autopilot builds proper themed content the week before each one (Christmas first).

## 2026-11-16 (later): room for the defenders to win
- With no clock ending, the defenders need the attackers a little weaker to win some battles: the close-finish search now starts from 0.4 times the attackers' strength (was 0.6), since the first test post's candidates often hit that floor.

## 2026-11-16: evolving towers, slow paid rebuilds, no clock ending, better walking, cleaner spells, shots from the gun
Rellz: "make the tower upgrades look visible cooler and different and evolved the same way clash of clans upgrades towers ... when a tower gets destroyed dont rebuild it instantly, make it cost money and slowly rebuild it, make the pathfinding better and the walking animation better, sometimes they do a weird loop ... improve layering logic and visual for spells and shields especially when the marketplace comes, you make the short end too quick so the boss ends up dying even though its on full health, dont make it say tie ... wait until final boss falls or tower is destroyed, sometimes people run too fast, also make sure bullets come from the gun not the waist".
- **Towers evolve tier by tier, Clash of Clans style**: tier 1 a wooden palisade (logs, rope, plank floor), tier 2 stone blocks, tier 3 a taller keep with a lower course, iron bands and rivets, two torches and a banner, tier 4 the same charged with its element (crystals in the battlements, element-coloured torch flames, runes glowing on the floor), tier 5 white marble and gold with four gem-topped spires, gems in the battlements, twin banners and a turning ring of golden runes. Each upgrade flashes as the new look settles.
- **Fallen towers are rebuilt slowly, for gold**: 3 s after it falls, once the defenders can pay its price, builders put up wooden scaffolding on the rubble and lay the stone courses one by one over 7 s (hammer sparks, a gold progress bar, the rubble cleared away); it only fights once finished ("REBUILDING · ..." then "... REBUILT").
- **No time limit**: the final volley / final charge that decided a battle at the bell (and killed a boss on full health) is gone, and so is the countdown. The battle ends only when every attacker is down (the boss included) or the base falls. Past the planned length it goes into OVERTIME, where both sides hit a little harder each second, so it's settled by the fight. Videos can run a bit longer when that happens; the close-finish search prefers battles that end on time.
- **Walking**: the point a troop follows on the path is kept at or just ahead of where it really is, so troops no longer turn round and loop back on straight paths (backwards walking down from 0.21% to 0.03% of steps), and they walk at their own pace instead of sprinting to catch up. Speed boosts can't stack past 1.6 times a troop's pace (2.3 in a charge), and the late push makes them braver, not sprinters. Little people's steps now follow the ground they cover, so slow walkers don't shuffle and fast ones don't skate.
- **Spells and the merchant**: the merchant now stands behind his cart (upright, turban and coat, waving), and each spell he sells rises off the cart as a clear badge (its colour, its full name) over the battle just before it's cast, instead of a cut-off name in a circle under the troops. The shield dome over the base now has a glass skin drawn over everything (tint, sweeping highlight, rim), since the base used to hide the bubble.
- **Shots leave from the gun**: little people's shots (towers and attackers) are drawn starting at the gun's muzzle or the bow at hand height, on the side they face, and the muzzle puff and sparks come from there too.
- Tested: syntax, 40 headless battles (no crashes, all ended, 48-83 s), a backwards-walking count before and after, test frames of every tier and a rebuild, the merchant selling, and a full stills render.

## 2026-11-15 (afternoon): nothing over the opening story card
Rellz (screenshot of "WAVE 1 · CAVALRY CHARGE" sitting on top of the DEFEND vs ATTACK card): "i dont like how this overlays, fix it".
- Notices raised while the opening story card is up (the first wave's, a new tower's) now wait until it has faded out (4.3 s), then come in one at a time below the line-up strip. `STILL_AT=1,3,4.6` picks still times for testing.

## 2026-11-15 (midday): the Clash Autopilot's Tower Clash half, finished (it was cut off this morning)
Today's three ideas: a calm, beautiful new board that looks nothing like the others (cherry blossom in spring, petals drifting over the fighting); a new merchant spell you can see coming from across the board (a red dragon swooping down the path breathing fire); and a battle event that changes how the whole picture looks for a few seconds (a solar eclipse: the board goes dark and only the towers and the base hold back the night).
- **Blossom Valley** (new map): spring grass with drifts of fallen petals, cherry trees in bloom, stone lanterns and mossy rocks, a temple base, and pink petals drifting across the battle all the time. Its hazard is the stampede.
- **Dragon's Breath** (new merchant spell, 50 gold): a red dragon swoops down the path towards the thickest crowd, its shadow below it, pouring a jet of fire onto the path; the stretch it passes burns for a couple of seconds, and attackers caught in it are hit and set alight.
- **Solar Eclipse** (new battle event, 30% of battles): for 6.5 s the board fades to dark, with soft pools of light round every tower, the base and any fire, and a black sun with a burning corona in the corner. Fair to both sides: attackers walk 20% slower and towers fire a little slower. It fades in and out smoothly.
- Tested: syntax, 40 headless battles (no crashes, all ended, defenders 68% at plain strength before the close-finish search), a test frame with all three on screen.

## 2026-11-15 (late morning): electric face-off, Army Clash's shine on towers and base, real meteors, better music, same times as Army Clash
Rellz: "match graphic style and shiny texture to army clash ... fix the meteor in tower clash", "change the music make it sound better add the better intro which is like a face off animated with electricity and do the same for army clash", "both channels always upload at same time same amount of videos a day".
- **Electric face-off intro** (`faceoff.js`, the same file as Army Clash's, 2.6 s): the best tower and the boss each in a big glossy ring on a band of their side's colour; the bands slam in from opposite sides, a lightning seam strikes between them, VS slams onto it, arcs crackle round the rings and sparks fly (whoosh, thunder, zaps), then a white flash into the fight.
- **The shine on everything standing**: the base and the towers' platforms are now drawn on the troops' shine layer (`shineBegin` in `td-draw.js`), so they get Army Clash's rim light, plus shading towards the light, a soft gloss and a hot spot. Their shadows and glows stay on the ground; the base's health bar sits over the shine.
- **Meteors** like Army Clash's: a dark tumbling rock with glowing lava cracks, a white-hot to red fiery tail, a halo and embers, speeding up as it falls; on the ground, under everyone, a target that fills in, the rock's glow growing and its shadow tightening.
- **Better music** (`music.js`, the same in both games): its own two-bar hook on a lead per video, wide pads breathing with the kick, strings or an arpeggio, claps, a hall reverb and an echo, a swell and a sub boom into the drop, the same loudness for every style.
- **Same times as Army Clash**: 10:00, 14:00, 18:00 and 22:00 London, 4 a day (was 12/16/19/22). The About text says so.
- Tested: syntax, stills (intro, fight, a meteor test frame), a full short render with sound for each game.

## 2026-11-15: UI never jumps (Rellz: "no glitch or teleporting ui for both games")
Rellz, from the Army Clash chat about a banner that hopped up when the line-ups left: "i mean that for all ui even in tower clash ... no glitch or teleporting ui for both games!"
- **Cards glide, never jump:** the wave/tower/spell cards sat in one of three spots (under the line-ups, under the boss bar, or at the top) and snapped between them when the line-ups left or the boss arrived or fell. Now they glide there (`glide()` and `rosterK()`, the same helpers as Army Clash's engine).
- **The boss bar fades away** when the boss falls or the battle ends, instead of vanishing in one frame.
- In `engine.js` (the same change as Army Clash's copy): a replaced banner lifts away and fades instead of vanishing; troop names that have to make room fade out and back in instead of blinking.
- Guardrail added to `AUTOPILOT.md` and `CLAUDE.md`: every banner, card, pill, bar, tag and name glides, fades or slides; nothing ever jumps.
- Tested: syntax, a frame-by-frame jump probe over a whole battle (before and after), stills. Battles are unchanged (looks only).
- **Follow-up, same morning:** `glide()` is now a damped spring, so a label that moves sets off gently instead of hopping its first few pixels; the camera's aim is eased in two stages, so a new shot starts moving from rest instead of jolting off at full speed (the camera only; battles unchanged, same result hash with and without drawing, layout check passed, the finale still centres the falling troop as before).
- **Crash fixed:** the ground-ring helper for little people (`ring()`, added 2026-11-14) shared its name with the shrinking-arena event's data (`this.ring`), so a video with that event would crash when drawing. The helper is now `gRing()`, in both games' engines.

## 2026-11-15 (morning): shared engine brought back in step with Army Clash
The daily Clash Autopilot run errored before finishing, and Army Clash's `engine.js` had moved ahead of this copy. Rellz: "fix it".
- `engine.js` is Army Clash's again plus the `api._` line: riders now sit up on their mounts, names stay on screen and don't print across floating words, and the engine's own banners don't repeat or cover the result. Tower Clash's own intro and notice queue are unchanged.
- Tested: syntax, 12 headless battles (0 crashes, all finished), stills of the intro and the fight at 6, 15 and 30 s.

## 2026-11-15: intro card, notices that never stack
From the Clash Autopilot list (Rellz: "the ui layer on top of each other issue").
- **Intro card** (`rules.intro`, 2.2 s): every video opens on the thumbnail's layout (the question, the board, the best tower vs the boss), drifting in slowly, then dissolves into the first frame of the fight. Sound and music start under it; the end still loops back to it.
- **One notice at a time**: wave banners, new-tower/upgrade/spell cards, the engine's chapter banners and the "what's your guess?" prompt all go through one queue, so they never sit on top of each other. Each one fades in and out smoothly (0.3 s in, 0.4 s out). A small notice that would only get its turn more than 2.5 s late is dropped, because by then whatever it's about is already over. Big ones always wait their turn.
- Tested: syntax, 12 headless battles (no crashes), stills of the intro, its dissolve and the fight.

## 2026-11-15: one Clash Autopilot for both games, lighter daily run
- `AUTOPILOT.md` rewritten to match Army Clash's efficiency pass, fitted to Tower Clash: it's now one half of the single daily "Clash Autopilot" run (which covers both games), reads only the last 3 changelog entries and the newest 12 upload rows, adds three unique new things a day from one combined brief, learns from views only when there's enough data and not again within 3 days if nothing crossed a threshold, fixes only what actually looked wrong, and tests only what the day's changes touch.
- The idea backlog and the "already built" list moved to `IDEAS.md`, opened only when picking new things.
- `test-battles.js`: a quick headless battle batch for the scoped tests (no drawing).
- Guardrails unchanged. `engine.js` and `music.js` not touched.

## 2026-11-15 (later): more logic fixes from the shared engine
- Troop names drawn after every troop, so none is drawn across another's name; little people's shots leave from chest height; weapon glints at their hands; floating words move above tactic tags.

## 2026-11-15 (night): smooth walk-up to the base, defender colours rotate
- Troops no longer jump to the base's walls: they walk up and start hitting from where they are. When others are already there, they walk round the walls (and round each other) at their own pace to a free spot, and only hit once they've got one (Rellz: smooth animations always).
- Hits close together on the base add up into one red number instead of a pile of them.
- Defenders rotate through ten colours (teal, blue, green, sky, mint, indigo, cyan, lime, navy, green), each against a clearly different attacker colour, so thumbnails vary from video to video; the thumbnail's background still follows the defenders' colour.

## 2026-11-15 (later): attacks on the base, six damage stages, four songs
- Small attackers no longer vanish into the base: they stand at its walls and hack at it three times (a slash on the wall and a red "-N%" each blow), then they're spent. Nobody stands on top of it.
- The base shows six stages of damage: cracks, scorch marks, chunks knocked out with rubble at the foot of the walls, fires (one, then three, then five) with smoke, the roof caving in and glowing from inside, and finally heavy smoke and embers.
- Four songs in turn, one per video (epic, ancient, modern, sci-fi styles of the shared soundtrack, each with its own tempo, key and chords), instead of two picked by chance.

## 2026-11-15: logic fixes
Rellz: "fix every single logical issue one example is acid shouldn't be displayed over a tree".
- Towers, pads, walls and the base are drawn above acid, lava and frost pools, blood, bones and spell areas (`liveDecorTop`), so nothing on the ground covers them.
- From the shared engine: no blood pool after acid, fire, lightning or a crack; skeletons fall into bones; flying little people hover; health bars, names and callouts sit above heads; ice blocks cover the whole body; risen skeletons never stand inside obstacles.

## 2026-11-14 (late): bones that stay, rings on the ground
Rellz: "make every human become bones when they die and some other troops that makes sense also let the bones last longer".
- Every little person and every flesh-and-blood creature (beasts, riders, trolls, goblins, demons...) is left as a skeleton where it falls (`rules.ui.remains`, now on here too); machines, spirits, stone and titans aren't. The bones lie on a layer of their own that fades over about two minutes, far slower than blood. A torn scrap of the team's colour lies under each pile.
- Rings round a troop (rage, slows, shields, champions...) lie on the ground at a little person's feet instead of circling it.
## 2026-11-15: slower, remains for everyone, cleaner base fights, music over effects
- The battle plays at 0.85 speed (`rules.video.pace`), so blows and falls can be seen; videos are about 70 s. The camera doesn't race to catch up.
- Every fallen attacker leaves something that fits it, then fades: people fall apart to their bones, machines scatter gears, plates and bolts (with sparks), slimes and bugs leave a puddle of sludge with crossed-out eyes, beasts leave a stain and a few bones (`corpse` in td-sim.js, `drawCorpses` in td-draw.js). Army Clash's damage marks, acid/fire/lightning remains and cleaner battlefield are switched on too (`shine.damage`, `remains`, `clean`).
- Nobody stands on top of the base any more: attackers stop at its walls. Hits on the base show as red "-N%" numbers rising off it, and troops breaking in go up in dust with a ring.
- Effects are quieter under the music (`rules.sound.sfx` 0.7, music volume 0.62).

## 2026-11-14 (midnight): hit effects, slower boss
- Every hit now has its own effect (looks only): sparks fly back the way the blow came, with a quick ring; sword and spear blows leave a bright slash arc; arrows and bolts splinter in gold, magic glitters in its element's colour, stone chips fly off towers.
- Every tower shot has a muzzle puff and sparks (cannons and snipers bigger), and the platform gives a little with the recoil.
- The boss walks slower (0.62 of its normal pace, was 0.85), so its march is a longer, tenser stretch. The close-finish search re-balances each battle around it.

## 2026-11-14 (night): cyan defenders, accurate About text
- The defenders are always cyan (TEAL) now, against a rotating attacker colour (red, orange, purple, crimson, magenta, amber, pink, coral, rose, yellow), so viewers always know which side is which.
- The thumbnail's background is one colour taken from the defenders' cyan, turned a little towards deep blue and darkening downwards, so it complements the cyan towers instead of copying them.
- New About text for both channels (CHANNEL.md): accurate schedule (Tower Clash 12/16/19/22, Army Clash 10/14/18/22 UK time), no fixed team colours, says it's a simulation. Tower Clash's is set automatically.

## 2026-11-14 (late): 4 a day, top quality
- Rellz: 4 uploads a day, each very high quality. Posts at 12:00, 16:00, 19:00 and 22:00 London time (was 12 a day).
- Each post is the most dramatic of 5 candidate battles (closest, latest finish, towers falling), with a finer search for the close finish (`pick-seed.js`, `rules.quality`).

## 2026-11-14 (night): music and five things for retention
Rellz: "add background music to both army and tower clash and 5 more cool things you think will increase view retention".
- **Music** (`rules.music`, `music.js`, the same file as in Army Clash): an original soundtrack for every video, written from the seed (epic or ancient style, 120-140 bpm, its own key and chords), ducking under the effects. Nothing licensed or sampled.
- Five things for retention: **the drop** (full drums crash in on the first downbeat after the first kill), **the final blow** (heartbeat, riser, a beat of silence, then a huge hit), **a victory fanfare** over the outro, **beat punches** (the camera punches in on every beat in the last six seconds of the fight), and **a seamless loop** (the outro's last 0.4 s fades into the opening frame and the music resolves onto its opening chord, so YouTube's replay flows straight on).
- **The engine is brought up to date with Army Clash's** (it is Army Clash's `engine.js` plus the `api._` export line): spell circles, domes, webs, the twister and other ground effects are now drawn under the troops (Rellz: "sometimes when there is a circle spell thing, troops are rendered under that please fix that"), smoke stays small, and blood splatter is in (`rules.ui.blood`).
- **Little people instead of circles** (`rules.ui.humans`): the towers' characters and every person-shaped attacker are little people standing up, holding their own weapons, with their own headgear, in their team's colour.
- Sound and looks only: no battle plays out differently.

## 2026-11-14 (later): calmer camera, thumbnail fit
- Thumbnail fits the Shorts shelf: everything sits between y 200 and 1720 (the shelf cuts the top and bottom off).
- Calmer camera (td-cam.js): holds on the front of the attack for about 7 s at a time, pulls back to the whole board for each new wave, and only cuts in for the boss, a fallen tower or the base under heavy attack. No more quick punch-ins, kill-cams or hit-stops.
- Tower shot sounds are capped (each kind at most every 0.45 s) and the ringing frost/storm sounds are softer.
- The music's drop now comes on the first tower kill (about 6-8 s in), not on the first knock-out sound (which towers rarely make).
- Thumbnail: little-people tower characters are drawn standing upright and bigger (they were turned on their side).
- More retention, on top of the five above: a "what's your guess? SURVIVES / FALLS" prompt after the line-ups, a combo counter, kill coins flying to the gold counter, a red heartbeat glow when the base is under 30%, and a big final countdown.

## 2026-11-14
- First version live: 7 layouts, 14 maps, 19 towers with 5 tiers and elements, 7 battle modes, merchant spells, war shaman, bosses, battle events.
- Look: themed scenery off the paths, stone tower platforms with tiers, keep/fortress/temple/reactor/flagship bases, scoreboard with the base's health, roster strips, cards, boss bar, gold-and-towers panel.
- Thumbnail: violet brand background, the question, the battle framed, the best tower vs the boss.
- Close finishes: the dice pick which side should win (50/50), then the attackers' strength is chosen so that side wins late and narrowly (headless runs predict the video exactly). Falls back to on-the-spot balancing.
- Posting: 12 a day on the even hours, London time.
