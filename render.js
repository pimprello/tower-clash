// Renders one Tower Clash Short: 1080x1920 (2160x3840 with rules.video.scale 2), 60 fps, H.264 + AAC sound.
// The battle is paced to end close to rules.video.fightSeconds; the video ends rules.video.outroSeconds after it.
// Output: out/tower-clash.mp4, out/thumb.jpg and out/meta.json (title, description and tags for the upload).
// SEED=<n> picks the battle; SECS=<n> makes a short test clip; SCALE=1 renders at 1080x1920; STILLS=1 writes a few
// still frames to out/ instead of a video.
'use strict';
const { createCanvas, registerFont } = require('canvas');
const { spawn } = require('child_process');
const { once } = require('events');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

registerFont(path.join(__dirname, 'fonts/BarlowCondensed-ExtraBoldItalic.ttf'), { family: 'Barlow Condensed', weight: '800', style: 'italic' });
registerFont(path.join(__dirname, 'fonts/BarlowCondensed-Bold.ttf'), { family: 'Barlow Condensed', weight: '700', style: 'normal' });

const RVB = require('./engine.js');
const Music = require('./music.js');
RVB.makeCanvas = (w, h) => createCanvas(w, h);
const D = require('./td-data.js');
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, 'rules.json'), 'utf8'));
const VID = rules.video || {};
const FPS = 60, W = 1080, H = 1920, SR = 48000, RS = Math.max(1, Math.min(2, Number(process.env.SCALE || VID.scale || 1)));
RVB.RS = RS;
const { TD } = require('./td-game.js');
const { TDCam } = require('./td-cam.js');
const FO = require('./faceoff.js');
const E = RVB._, { DEF, ATK } = require('./td.js');
const OUTRO = VID.outroSeconds || 3, FIGHT = VID.fightSeconds || 60;
const SECS = process.env.SECS ? Number(process.env.SECS) : FIGHT + OUTRO;
// rules.video.pace: the battle plays at this fraction of real speed (0.85: a little slower, so every blow and every fall can be
// seen; Rellz 2026-11-15 "it goes too fast"), so the video is about SECS / PACE long
const PACE = Math.max(0.5, Math.min(1, VID.pace || 1));
const MAXFRAMES = Math.ceil(FPS * (SECS / PACE + 60));   // room for overtime (no time limit: the battle ends when the boss or the base falls)
const OUT = path.join(__dirname, 'out');
const seed = process.env.SEED ? Number(process.env.SEED) >>> 0 : crypto.randomBytes(4).readUInt32LE(0);
const pick = RVB.rng(seed ^ 0x7D3C1A);

// what's been posted so far: line-ups, maps and layouts rotate from the count, and titles avoid repeats
const pastVideos = (() => { try { return fs.readFileSync(path.join(__dirname, 'videos.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean); } catch (e) { return []; } })();
const posted = pastVideos.length;
const slot = posted;

// ----- the battle's set-up -----
const weighted = obj => { const e = Object.entries(obj).filter(([, w]) => w > 0), tot = e.reduce((s, [, w]) => s + w, 0); let r = pick.next() * tot; for (const [k, w] of e) if ((r -= w) <= 0) return k; return e[e.length - 1][0]; };
const layout = process.env.LAYOUT || D.LAYOUT_KEYS[slot % D.LAYOUT_KEYS.length];
// holiday specials (holiday.js, the same file as Army Clash's; Rellz 2026-11-16): on a holiday the map that suits it is used
const Holiday = require('./holiday.js'), HOL = Holiday.of();
const map = process.env.MAP || Holiday.map(HOL, D.MAP_KEYS) || D.MAP_KEYS[(slot * 5 + 3) % D.MAP_KEYS.length];
const era = D.TD_MAPS[map].era;
const defOk = D.DEF_LINEUPS.filter(l => !l.eras || l.eras.includes(era));
const defense = defOk[(slot * 3 + 1) % defOk.length];
const attack = D.ATK_LINEUPS[(slot * 3) % D.ATK_LINEUPS.length];
const mode = process.env.MODE || weighted(rules.modes || { classic: 1 });
const defOrder = D.ORDERS[Math.floor(pick.next() * D.ORDERS.length)];
const atkBand = D.WARBANDS[Math.floor(pick.next() * D.WARBANDS.length)];
const pairs = rules.teamPairs || [['GOLD', 'PURPLE']];
const pair = pairs[slot % pairs.length];
RVB.setTeams(pair[0], pair[1]);
const events = (rules.events || []).map(type => ({ type }));

const optsFor = (power, s) => ({ map, layout, target: FIGHT, fixedLength: FIGHT + OUTRO, outroSecs: OUTRO, ui: 2, art: 2, anim: true, humans: (rules.ui || {}).humans !== false, ...((rules.ui || {}).blood && rules.ui.blood.on ? { blood: rules.ui.blood } : {}), shine: { on: true, gloss: 1, rim: 1, damage: true, screen: 1, density: 1.6 }, remains: true, clean: true, smooth: true, tdPace: PACE,
  tdMode: mode, attack, towers: defense.towers, defOrder, atkBand, events, power, seed: s });

// ----- balance on the spot: quick headless battles with this set-up and other dice, aiming at an even chance -----
function quick(power, s) {
  const g = new TD(s, optsFor(power, s));
  g.fixedTicks = true; g.tickAcc = 0;
  let k = 0; while (g.phase === 'fight' && k < FPS * 110 / PACE) { g.frame(1 / FPS); g.sfx.length = 0; k++; }
  return { def: g.tdWinner === 0, T: g.fightT, hp: g.base.hp, fell: g.stat.fell.length };
}
// a close finish for this very battle: the dice pick which side should win (an even chance), then the attackers' strength
// is chosen so that side wins late and narrowly (the base scraped down, or broken in the last seconds). The battle itself
// is the same with or without the camera, so the headless run predicts the video.
function closeFinish() {
  const want = pick.next() < ((rules.balance || {}).target ?? 0.5) ? 'def' : 'atk';
  const t0 = Date.now(); let best = null;
  for (let p = 0.4; p <= 5.2; p *= ((rules.quality || {}).fine ? 1.07 : 1.12)) {
    const r = quick(p, seed), side = r.def ? 'def' : 'atk';
    // close: a defenders' win with the base scraped down (about 10-35%), or an attackers' win in the last seconds
    const close = r.def ? 60 - Math.abs(r.hp - 20) * 1.2 + Math.min(r.T, 58) * 0.4 : Math.min(r.T, 59.4) * 1.1;
    const sc = close + (side === want ? 40 : 0) - Math.max(0, r.T - 62) * 3;   // a long overtime is a worse video
    if (!best || sc > best.sc) best = { p, sc, r };
  }
  console.log(`close finish: wanted the ${want === 'def' ? 'defenders' : 'attackers'}; x${best.p.toFixed(2)} gives ${best.r.def ? 'defenders' : 'attackers'} at ${best.r.T.toFixed(1)} s, base ${Math.round(best.r.hp)}% (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  // how dramatic this battle can be made (for choosing between candidate battles: pick-seed.js)
  closeFinish.drama = best.sc + (best.r.fell || 0) * 3 + (best.r.T >= 54 ? 10 : 0) - (best.r.T < 48 ? 15 : 0);
  return best.sc > 0 ? best.p : null;
}
function tune() {
  const B = rules.balance || {}, n = B.tests || 12, steps = B.steps || 4, target = B.target ?? 0.5;
  let lo = B.lo || 0.55, hi = B.hi || 1.9, best = 1, bestErr = 9;
  const t0 = Date.now();
  for (let st = 0; st < steps; st++) {
    const mid = (lo + hi) / 2;
    let w = 0; for (let i = 0; i < n; i++) if (quick(mid, (seed ^ ((i + 1) * 0x9E3779B1)) >>> 0).def) w++;
    const rate = w / n, err = Math.abs(rate - target);
    if (err < bestErr) { bestErr = err; best = mid; }
    console.log(`balance: attackers x${mid.toFixed(3)} -> defenders win ${Math.round(rate * 100)}%`);
    if (rate > target) lo = mid; else hi = mid;
  }
  console.log(`balance settled on x${best.toFixed(3)} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  return best;
}

function ffmpeg(args) {
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => { p.on('error', reject); p.on('close', code => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`)))); });
  return { p, done };
}
function writeWav(file, L, R, frames) {
  const buf = Buffer.alloc(44 + frames * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + frames * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(frames * 4, 40);
  for (let i = 0; i < frames; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
}
const tc = s => String(s).toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(Of|The|And)\b/g, w => w.toLowerCase()).replace(/^./, c => c.toUpperCase());

async function main() {
  const t0 = Date.now();
  fs.mkdirSync(OUT, { recursive: true });
  const power = process.env.POWER ? Number(process.env.POWER) : (closeFinish() ?? tune());
  if (process.env.SCORE_ONLY) { fs.writeFileSync(path.join(OUT, `score-${seed}.json`), JSON.stringify({ seed, power, drama: closeFinish.drama ?? 0 })); return; }
  const game = new TD(seed, optsFor(power, seed));
  const director = rules.cinematic !== false ? new TDCam(game, { seed }) : null;
  // (retention, 2026-11-16) a rare golden boss in about one battle in eight (looks only; rules.rare.golden is the chance)
  const golden = (Math.imul(seed ^ 0x60D15, 2654435761) >>> 0) / 4294967296 < ((rules.rare || {}).golden ?? 0.125);
  game.golden = golden;
  const episode = posted + 1;
  if (!director) { game.fixedTicks = true; game.tickAcc = 0; }
  const synth = new RVB.Synth(SR, MAXFRAMES / FPS + 4);
  const canvas = createCanvas(W * RS, H * RS), ctx = canvas.getContext('2d');
  console.log(`seed ${seed} · ${D.LAYOUTS[layout].name} · ${D.TD_MAPS[map].name} · ${mode} · ${defense.name} vs ${attack.name} · ${pair.join(' v ')} · power x${power.toFixed(3)}`);

  const stills = process.env.STILLS === '1';
  const silent = path.join(OUT, 'video-only.mp4');
  const enc = stills ? null : ffmpeg([
    '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', `${W * RS}x${H * RS}`, '-r', String(FPS), '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', RS > 1 ? '19' : '18', '-maxrate', RS > 1 ? '34M' : '12M', '-bufsize', RS > 1 ? '68M' : '24M',
    '-profile:v', 'high', '-level', RS > 1 ? '5.2' : '4.2', '-g', String(FPS * 2), '-fps_mode', 'cfr',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-r', String(FPS), silent,
  ]);
  // ----- the thumbnail, made before the video from a headless copy of the same battle (it plays out identically): the
  // busiest moment of the middle of the battle (many attackers on the board, the base still up) as its background. -----
  let thumbCv = null, nFrames = 0, introInfo = null, finale = null, teaseT = 0;
  const timeline = [];
  if ((rules.thumbnail || {}).on !== false) {
    const tt0 = Date.now(), g2 = new TD(seed, optsFor(power, seed)), cv2 = createCanvas(W * RS, H * RS), c2 = cv2.getContext('2d');
    g2.fixedTicks = true; g2.tickAcc = 0;
    let thumbBg = null, thumbScore = -1, thumbT = 0, k = 0;
    const bossS = [];
    while (!g2.finished && k < FPS * ((FIGHT + OUTRO) / PACE + 60)) {
      // (the cold open: where the boss comes closest to the base while the base still stands)
      if (g2.phase === 'fight' && k % 6 === 0 && g2.bossU && !g2.bossU.dead && g2.base.hp > 0) bossS.push([g2.fightT, Math.hypot(g2.bossU.x - g2.base.x, g2.bossU.y - g2.base.y)]);
      if (g2.phase === 'fight' && k % 30 === 0 && g2.fightT > FIGHT * 0.35 && g2.fightT < FIGHT * 0.85) {
        const atk = g2.units.filter(u => u.team === 1 && !u.dead && !u.gone).length, sc = atk * (1 + (g2.bossU && !g2.bossU.dead ? 1 : 0)) * (g2.base.hp > 0 ? 1 : 0);
        if (sc > thumbScore) { thumbScore = sc; thumbT = g2.fightT; c2.setTransform(RS, 0, 0, RS, 0, 0); const cards = g2.cards; g2.cards = []; g2.draw(c2); g2.cards = cards; thumbBg = thumbBg || createCanvas(W, H); const bc = thumbBg.getContext('2d'); bc.clearRect(0, 0, W, H); bc.drawImage(cv2, 0, 0, W, H); }
      }
      g2.frame(1 / FPS); g2.sfx.length = 0; k++;
    }
    // (retention, 2026-11-16) the finale: this copy has played the battle through, so the camera knows when and where the
    // final blow lands and goes there in slow motion (rules.video.finale: false turns it off)
    { const endT = g2.lastFightT ?? g2.fightT, ld = g2.lastDeath;
      if (VID.finale !== false && g2.phase !== 'fight') finale = { t: endT, how: ld && ld.t >= endT - 0.05 ? 'kill' : 'time', uid: ld ? ld.uid : 0, by: ld ? ld.by : 0, x: ld ? ld.x : g2.base.x, y: ld ? ld.y : g2.base.y };
      const ok = bossS.filter(([t]) => t > 12 && t < endT - 4);
      teaseT = ok.length ? ok.reduce((a, b) => (b[1] < a[1] ? b : a))[0] : (thumbT > 12 && thumbT < endT - 4 ? thumbT : 0); }
    if (!thumbBg) { c2.setTransform(RS, 0, 0, RS, 0, 0); g2.draw(c2); thumbBg = createCanvas(W, H); thumbBg.getContext('2d').drawImage(cv2, 0, 0, W, H); }
    const tcv = createCanvas(W, H), tctx = tcv.getContext('2d');
    const keepRS = RVB.RS; RVB.RS = 1;
    g2.drawThumbTD(tctx, thumbBg);
    { const best = g2.towers.slice().sort((x, y) => (y.tier - x.tier) || (y.kills - x.kills))[0];
      introInfo = { g: g2, towerType: best && best.u.type, towerName: best ? best.def.name : 'THE TOWERS', towers: Math.max(g2.towers.length, g2.stat.built, 1), bossType: g2.bossType, bossName: (D.BOSSES[g2.bossType] || {}).name || E.labelOf(g2.bossType), waves: g2.plan.filter(w => !w.mini).length }; }
    RVB.RS = keepRS;
    fs.writeFileSync(path.join(OUT, 'thumb.jpg'), tcv.toBuffer('image/jpeg', { quality: 0.92 }));
    thumbCv = createCanvas(W * RS, H * RS); thumbCv.getContext('2d').drawImage(tcv, 0, 0, W * RS, H * RS);
    console.log(`thumbnail made in ${((Date.now() - tt0) / 1000).toFixed(0)} s`);
  }
  if (director && finale) { director.fin = finale; game.finalePlan = finale; game.noLate = true; }
  const stillAt = process.env.STILL_AT ? process.env.STILL_AT.split(',').map(Number) : [2, 6, 15, 30, 45, 58];
  // ----- music (rules.music, music.js, shared with Army Clash): an original soundtrack written from the seed, following the
  // battle; the camera punches in on the beat in the last seconds, and the outro fades into the cover frame so the replay loops -----
  const MU = rules.music || {}, muOn = MU.on !== false;
  const mp = muOn ? Music.plan(seed, ['epic', 'ancient', 'modern', 'scifi'][slot % 4])  /* (four songs in turn, one per video: Rellz 2026-11-15) */ : null, mtr = muOn ? Music.tracker() : null;
const clamp01 = x => Math.max(0, Math.min(1, x));
  let firstCv = null;
  // ----- the intro card (rules.intro, Rellz 2026-11-15): the thumbnail's layout (who vs who) for a couple of seconds before the
  // battle, drifting in slowly, then dissolving into the first frame of the fight. Sound and music start under it. -----
  // ----- the cold open (rules.tease, retention 2026-11-16): the first second and a bit is a flash-forward to the scariest
  // moment of this very battle (the boss closest to the base, the base still standing, so the result isn't given away),
  // in slow motion with WAIT FOR IT..., then the face-off and the battle from the start. Played on a third copy (looks only). -----
  let TEASE = 0, ffSecs = 0, ffShot = false;
  const TZ = rules.tease || {};
  if (TZ.on !== false && teaseT && !process.env.SECS) {
    const g3 = new TD(seed, optsFor(power, seed)); g3.golden = golden; g3.fixedTicks = true; g3.tickAcc = 0;
    let k = 0; while (g3.phase === 'fight' && g3.fightT < teaseT - 0.4 && k < FPS * 400) { g3.frame(1 / FPS); g3.sfx.length = 0; k++; }
    if (g3.phase === 'fight') {
      const n = Math.round(FPS * (TZ.seconds || 1.4)), foc = () => (g3.bossU && !g3.bossU.dead ? g3.bossU : g3.base);
      const f0 = foc(), bx = g3.base.x, by = g3.base.y;
      g3.cine = { bars: 1, vig: 0.45 };
      g3.cam = { x: f0.x * 0.75 + bx * 0.25, y: f0.y * 0.75 + by * 0.25, z: 1.55 };
      for (let j = 0; j < n; j++) {
        const f = j / n, fc = foc();
        g3.cam.x += (fc.x * 0.75 + bx * 0.25 - g3.cam.x) * 0.08; g3.cam.y += (fc.y * 0.75 + by * 0.25 - g3.cam.y) * 0.08;
        g3.cam.z = 1.55 + 0.3 * E.easeOutCubic(f);
        g3.cards.length = 0;
        ctx.setTransform(RS, 0, 0, RS, 0, 0); g3.draw(ctx);
        // WAIT FOR IT... (slams in), a COMING UP pill, and a white flash into the face-off
        ctx.setTransform(RS, 0, 0, RS, 0, 0); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const sl = E.easeOutBack(clamp01(f / 0.18)), pa = clamp01(f / 0.12);
        ctx.save(); ctx.globalAlpha = pa; ctx.translate(W / 2, 1735); ctx.rotate(-0.04); ctx.scale(sl * (1 + 0.04 * f), sl * (1 + 0.04 * f));
        ctx.font = E.font(132, 800); E.strokeText(ctx, 'WAIT FOR IT...', 0, 0, '#FFFFFF', '#0B0F1A', 16); ctx.restore();
        ctx.save(); ctx.globalAlpha = pa; ctx.translate(W / 2, 1612); E.roundRect(ctx, -150, -30, 300, 60, 30); ctx.fillStyle = '#FFD23F'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#0B0F1A'; ctx.stroke();
        ctx.font = E.font(36, 800); ctx.fillStyle = '#0B0F1A'; ctx.fillText('COMING UP', 0, 2); ctx.restore();
        const fl = clamp01((f - 0.86) / 0.14); if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${0.9 * fl * fl})`; ctx.fillRect(0, 0, W, H); }
        ctx.textBaseline = 'alphabetic';
        if (j === 0 && muOn && MU.loop !== false) { firstCv = createCanvas(W * RS, H * RS); firstCv.getContext('2d').drawImage(canvas, 0, 0); }
        if (stills) { if ([10, Math.round(n / 2), n - 4].includes(j)) fs.writeFileSync(path.join(OUT, `still-tease-${String(j).padStart(3, '0')}.png`), canvas.toBuffer('image/png')); }
        else { const frame = canvas.toBuffer('raw'); if (!enc.p.stdin.write(frame)) await once(enc.p.stdin, 'drain'); }
        g3.frame((1 / FPS) * (TZ.speed || 0.5));
        for (const ev of g3.sfx) synth.play(ev, (j + 1) / FPS);
        g3.sfx.length = 0;
      }
      synth.play({ type: 'whoosh' }, Math.max(0, n / FPS - 0.25));
      TEASE = n;
      console.log(`cold open: ${(n / FPS).toFixed(1)} s from ${teaseT.toFixed(1)} s into the battle`);
    }
  }
  const TOFF = TEASE / FPS;
  const INTRO = (rules.intro || {}).on !== false && thumbCv && introInfo ? Math.round(FPS * ((rules.intro || {}).seconds || 2.6)) : 0, IOFF = TOFF + INTRO / FPS;
  for (let i = 0; i < MAXFRAMES; i++) {
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
    const z0 = game.cam && game.cam.z, punch = muOn && MU.pulse !== false && game.cam && game.phase === 'fight' && game.fightT > FIGHT - 6 ? Music.pulse(mp, i / FPS + IOFF) : 0;
    if (punch) game.cam.z = z0 * (1 + punch);
    game.draw(ctx);
    if (punch) game.cam.z = z0;
    if (i === 0 && INTRO) {
      // the electric face-off (faceoff.js, shared with Army Clash): the best tower against the boss, then a flash into the fight
      const b0 = createCanvas(W * RS, H * RS); b0.getContext('2d').drawImage(canvas, 0, 0);
      const bg1 = createCanvas(W, H); bg1.getContext('2d').drawImage(canvas, 0, 0, W, H);
      const keepRS = RVB.RS; RVB.RS = 1;
      const pic = (g, type, team) => FO.portraitCanvas((c, r) => { const U = E.UNIT[type] || E.UNIT.soldier, hum = g.opts.humans && E.HUMAN && E.HUMAN[type], sc = (r * (hum ? 0.8 : 0.72)) / U.r;
        if (hum) c.translate(0, r * 0.12); c.scale(sc, sc); if (!hum) c.rotate(-Math.PI / 2); g.drawPortrait(c, type, team); }, 210 * RS, 1);
      const IS = introInfo, sides = [
        { col: E.TEAMS[DEF], name: IS.towerName, sub: game.defOrder[0], count: `${IS.towers} TOWERS`, portrait: IS.towerType ? pic(IS.g, IS.towerType, DEF) : null },
        { col: E.TEAMS[ATK], name: golden ? (/^THE /.test(IS.bossName) ? IS.bossName.replace(/^THE /, 'THE GOLDEN ') : 'GOLDEN ' + IS.bossName) : IS.bossName, sub: game.atkBand[0], count: `${IS.waves} WAVES`, portrait: pic(IS.g, IS.bossType, ATK) },
      ];
      RVB.RS = keepRS;
      const fo = { W, H, RS, seed, dur: INTRO / FPS, title: 'TOWER CLASH', tag: `EPISODE ${episode}`, question: game.hook, sides, bg: bg1, battle0: b0 };
      FO.faceoffSounds(synth, INTRO / FPS, TOFF);
      for (let j = 0; j < INTRO; j++) {
        FO.drawFaceoff(ctx, j / FPS, fo);
        if (j === 0 && muOn && MU.loop !== false && !firstCv) { firstCv = createCanvas(W * RS, H * RS); firstCv.getContext('2d').drawImage(canvas, 0, 0); }
        if (stills) { if ([12, 30, 60, 100, INTRO - 10].includes(j)) fs.writeFileSync(path.join(OUT, `still-intro-${String(j).padStart(3, '0')}.png`), canvas.toBuffer('image/png')); }
        else { const frame = canvas.toBuffer('raw'); if (!enc.p.stdin.write(frame)) await once(enc.p.stdin, 'drain'); }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(b0, 0, 0); ctx.setTransform(RS, 0, 0, RS, 0, 0);
    }
    if (muOn && MU.loop !== false) {
      if (i === 0 && !firstCv) { firstCv = createCanvas(W * RS, H * RS); firstCv.getContext('2d').drawImage(canvas, 0, 0); }
      const left = game.phase === 'outro' && game.outroLen ? game.outroLen - game.outroT : 9;
      if (firstCv && left < 0.45 && !game.holdOutro) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = Math.min(1, (0.45 - left) / 0.4); ctx.drawImage(firstCv, 0, 0); ctx.globalAlpha = 1; }
    }
    // (testing: STILL_MARK=meteor also saves a still while one is coming down)
    if (stills && process.env.STILL_MARK) { const mk = game.marks.find(m => m.kind === process.env.STILL_MARK && m.T1 && (game.fightT - m.T0) / (m.T1 - m.T0) > 0.55 && !m.shot); if (mk) { mk.shot = true; fs.writeFileSync(path.join(OUT, `still-mark-${String(i).padStart(5, '0')}.png`), canvas.toBuffer('image/png')); } }
    // (testing: STILL_AFTER=<battle second> also saves a still every 0.75 s of video from then on, through the finale and the end)
    if (stills && process.env.STILL_AFTER && (game.phase !== 'fight' || game.fightT >= Number(process.env.STILL_AFTER)) && i % 45 === 0) fs.writeFileSync(path.join(OUT, `still-after-${String(i).padStart(5, '0')}.png`), canvas.toBuffer('image/png'));
    if (game.warpK > 1.2) { ffSecs += 1 / FPS; if (stills && game.warpK > 1.6 && !ffShot) { ffShot = true; fs.writeFileSync(path.join(OUT, `still-ff-${String(i).padStart(5, '0')}.png`), canvas.toBuffer('image/png')); } }
    if (stills) { if (stillAt.some(s => Math.abs(i / FPS - s) < 0.5 / FPS)) fs.writeFileSync(path.join(OUT, `still-${String(Math.round(i / FPS)).padStart(2, '0')}.png`), canvas.toBuffer('image/png')); }
    else { const frame = canvas.toBuffer('raw'); if (!enc.p.stdin.write(frame)) await once(enc.p.stdin, 'drain'); }
    nFrames++;
    timeline.push({ f: game.fightT, fight: game.phase === 'fight', hp: game.base.hp, boss: !!(game.bossU && !game.bossU.dead), wave: game.waveNow || 0 });
    if (game.finished || nFrames >= FPS * SECS / PACE + FPS * 55) break;
    if (process.env.SECS && nFrames >= FPS * SECS) break;
    if (director) director.advance(1 / FPS); else game.frame(1 / FPS);
    for (const ev of game.sfx) synth.play(ev, (i + 1) / FPS + IOFF);
    // (the music's drop comes on the first kill: tower kills don't make a knock-out sound, so they're passed on as one)
    if (mtr) { const kills = game.killLog.length + (game.killLogShifted || 0), ko = kills > (mtr.kills || 0); mtr.kills = kills;
      mtr.frame((i + 1) / FPS + IOFF, ko ? { phase: game.phase, sfx: game.sfx.concat({ type: 'ko' }), holdOutro: game.holdOutro, outroLen: game.outroLen, outroT: game.outroT } : game); }
    game.sfx.length = 0;
    if ((i + 1) % (FPS * 6) === 0) console.log(`frame ${i + 1} (${((i + 1) / FPS).toFixed(0)} s of video) after ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  const DUR = (nFrames + INTRO + TEASE) / FPS;
  if (ffSecs) console.log(`fast forward: ${ffSecs.toFixed(1)} s of video`);
  const final = path.join(OUT, 'tower-clash.mp4');
  if (!stills) {
    enc.p.stdin.end(); await enc.done;
    // (the battle's sounds a little under the music: Rellz 2026-11-15 "the sfx is louder than the music a bit too much")
    const frames = Math.round(SR * DUR), gain = (game.audioGain || 1) * ((rules.sound || {}).sfx ?? 0.7);
    const L = new Float32Array(frames), R = new Float32Array(frames);
    for (let i = 0; i < frames; i++) { L[i] = Math.tanh(synth.L[i] * gain); R[i] = Math.tanh(synth.R[i] * gain); }
    let mixed = { L, R };
    if (muOn) {
      const mus = Music.render(mp, { sr: SR, dur: DUR, cues: mtr.cues() });
      mixed = Music.mix(L, R, mus, { sr: SR, volume: MU.volume ?? 0.45, duck: MU.duck ?? 0.45 });
      console.log(`Music: ${mp.style}, ${mp.bpm} bpm, the drop at ${mus.drop.toFixed(1)} s, the final hit at ${mus.fin.toFixed(1)} s`);
    }
    const wav = path.join(OUT, 'sound.wav');
    writeWav(wav, mixed.L, mixed.R, frames);
    await ffmpeg(['-i', silent, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-t', DUR.toFixed(3), '-movflags', '+faststart', final]).done;
    fs.rmSync(silent); fs.rmSync(wav);
  }

  // ----- title, description and tags (the title never gives the result away) -----
  const bossName = tc(((D.BOSSES[game.bossType] || {}).name || RVB.labelOf(game.bossType)).replace(/^THE /, 'The '));
  const nTow = Math.max(game.towers.length, game.stat.built, 1), waves = game.waveN, band = tc(atkBand[0]), order = tc(defOrder[0]);
  const baseName = tc(D.BASE_NAME[game.base.style] || 'The Base');
  const fell = game.stat.fell.length, low = Math.round(game.stat.lowBase);
  const M = D.MODES[mode];
  const recent = new Set(pastVideos.slice(-14).map(v => v.titleKind));
  const cands = [];
  if (mode === 'bossrush') cands.push(['mode', `Boss Rush: Can ${nTow} Towers Survive Every Boss? 🔥`]);
  if (mode === 'swarm') cands.push(['mode', `Endless Swarm vs ${nTow} Towers: Will The Base Hold? 🐜`]);
  if (mode === 'laststand') cands.push(['mode', `No New Towers Allowed... Can They Still Hold? 🏰`]);
  if (mode === 'escort') cands.push(['mode', `Stop The Siege Engine Before It Reaches The Base! 🛡️`]);
  if (mode === 'lava') cands.push(['mode', `The Lava Is Rising... Can The Base Survive? 🌋`]);
  if (mode === 'night') cands.push(['mode', `Tower Defense In The Dark: Will The Base Survive? 🌙`]);
  cands.push(['boss', `Can ${nTow} Towers Stop ${bossName}? 🏰`]);
  cands.push(['versus', `${band} vs ${order}: Will The Base Survive?`]);
  cands.push(['waves', `${waves} Waves. 1 Base. Will It Hold? 🛡️`]);
  cands.push(['bossvs', `${bossName} vs ${nTow} Towers 🔥`]);
  cands.push(['siege', `${band} Attack ${baseName}... Who Wins? ⚔️`]);
  if (fell >= 3) cands.push(['fell', `${fell} Towers Fell... Did The Base Survive? 😱`]);
  if (low > 0 && low <= 30 && game.tdWinner === 0) cands.push(['close', `The Base Was Down To ${low}%... 😳`]);
  if (game.stat.big >= 2) cands.push(['tier', `Tier 5 Towers vs ${bossName} 🔥`]);
  const fresh = cands.filter(c => !recent.has(c[0]));
  let [titleKind, title] = (fresh.length ? fresh : cands)[Math.floor(pick.next() * (fresh.length ? fresh : cands).length)];
  // (retention, 2026-11-16) a golden boss is always in the title; every title carries the episode number, so the posts read as a series
  if (golden) { titleKind = 'rare'; title = `A Rare Golden ${bossName.replace(/^The /, '')} Appeared... 😱`; }
  if (title.length <= 86) title = `${title} (Ep. ${episode})`;

  const towerNames = [...new Set(game.towers.map(t => t.kind))].map(k => tc(D.TOWERS[k].name));
  const related = pastVideos.slice(-24).filter(v => v.id && /^[\w-]{6,}$/.test(v.id)).pop();
  const description = [
    `Episode ${episode}${golden ? ' · a rare golden boss' : ''}.`,
    '',
    `${band} march on ${baseName.toLowerCase().startsWith('the') ? baseName.replace(/^The/, 'the') : baseName}, defended by ${order.replace(/^The/, 'the')}: ${waves} waves and then ${bossName.replace(/^The/, 'the')}. Will the base survive? Call it in the comments before the end!`,
    ...(related ? [`▶ Watch next: ${related.title} https://youtube.com/shorts/${related.id}`] : []),
    '',
    `A ${Math.round(DUR)}-second tower defense simulation on the ${D.TD_MAPS[map].name} map (${tc(D.LAYOUTS[layout].name)}). Every kill earns gold, which the defenders spend on new towers, upgrades up to tier 5 and spells from a travelling merchant; the attackers have a war shaman and a boss.${M && M.line ? ' ' + M.line : ''} The outcome comes from the game's rules and chance, not real footage, and the orders and warbands are made up.`,
    '',
    `Towers in this battle: ${towerNames.join(', ')}.`,
    '',
    'New tower defense battles 4 times a day: subscribe so you don\'t miss the next one.',
    '',
    '#shorts #towerdefense #towerclash #simulation #strategy',
  ].join('\n');
  const tags = [...new Set(['tower defense', 'tower defence', 'tower defense game', 'will the base survive', 'tower clash', 'battle simulation', 'strategy game', 'td',
    bossName.replace(/^The /, '').toLowerCase(), ...towerNames.map(n => n.toLowerCase()), D.TD_MAPS[map].name.toLowerCase(), mode !== 'classic' ? M.name.toLowerCase() : 'boss battle', 'shorts'])];

  const meta = {
    seed, slot, seconds: +DUR.toFixed(2), title: Holiday.title(HOL, title), titleKind, holiday: HOL ? HOL.key : undefined,
    description: HOL ? `${HOL.emoji} ${HOL.line}\n\n${description}`.slice(0, 4900) : description, tags: HOL ? [...new Set([...tags, ...HOL.tags])] : tags,
    layout, map, mode, teams: pair, defense: defense.name, attack: attack.name, order: defOrder[0], warband: atkBand[0], boss: game.bossType,
    power: +power.toFixed(3), winner: game.headline, winTeam: game.tdWinner, detail: game.detail, fight: +game.fightT.toFixed(1),
    episode, golden: golden || undefined, tease: TEASE ? +teaseT.toFixed(1) : undefined, finale: finale ? +finale.t.toFixed(1) : undefined,
    built: game.stat.built, upgrades: game.stat.upgrades, fell, lowBase: low, spells: game.stat.spells, related: related ? related.id : undefined,
  };
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));
  const mb = stills ? 0 : (fs.statSync(final).size / 1048576).toFixed(1);
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(0)} s: ${stills ? 'stills' : final} (${mb} MB, ${DUR.toFixed(1)} s long, battle ended at ${game.fightT.toFixed(1)} s) | ${title} | ${game.headline}, ${game.detail}`);
}

main().catch(err => { console.error(err); process.exit(1); });
