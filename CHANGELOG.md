# Changelog

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
