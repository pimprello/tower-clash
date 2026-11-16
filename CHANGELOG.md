# Changelog

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
