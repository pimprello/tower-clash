// The cold open: the same file in Army Clash, Tower Clash and Territory Clash (Rellz, 2026-11-17: "make an improved intro
// system for all 3 games"). Every Short opens on the best few seconds of its own battle, full screen, with no UI, before the
// electric face-off. Each game plays its battle and draws it (with no UI) into a canvas; this file decides the moment, the
// timing and every effect, and writes its sounds.
//
// The shape of it (fractions of the cold open; rules.coldOpen.seconds long, 3.4 s by default):
//   0.00  PUNCH IN    opens already in the action: a zoom-blur punch in, real speed, the camera pushing in
//   0.10  BUILD       real speed easing into slow motion as the peak nears; a riser builds under it
//   0.40  IMPACT      the peak lands: an impact frame (two inverted black-and-white frames, anime style), a colour split,
//                     a camera jolt, white impact lines round the edges, film bars easing in, and a sub drop
//   0.40  FREEZE      time stops for a moment on the hit (the picture breathes in), with a tape-stop sound
//   0.47  AFTERMATH   super slow motion as it plays out
//   0.56  REWIND      then the whole thing rewinds back to the start, faster and faster (tape tracking lines, scanlines, a
//                     colour split, washed-out colour, a rewind whirr): "how did it come to this?"
//   0.86  INTO IT     the rewind blurs into a zoom tunnel, lightning cracks down and a white flash opens the face-off
// rules.coldOpen.rewind false keeps the old shape instead (slow motion speeds back up into the flash).
// The moment (pick): the busiest stretch of the battle (the game scores every frame: kills, big hits, things falling), with a
// bonus for action that builds into it, never in the first seconds or the last 4 s, and never a moment that would give the
// result away (the game's own spoil test). Looks and sound only: the battle is the same with or without it.
'use strict';
const { createCanvas } = require('canvas');

const TAU = Math.PI * 2;
const clamp01 = x => Math.max(0, Math.min(1, x));
const easeOut = x => 1 - Math.pow(1 - clamp01(x), 3);
const easeIn = x => Math.pow(clamp01(x), 2.2);
const sm = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const hash = (a, b = 0) => { let x = (a * 374761393 + b * 668265263) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

const PEAK = 0.40, FREEZE = 0.47, AFTER = 0.56, EXIT = 0.86;

// ----- the moment -----
// heat: [[battle second, how much happened in that frame], ...]; returns the battle second of the peak, or null
function pick(heat, o = {}) {
  const endT = o.endT ?? Infinity, minT = o.minT ?? 6, tail = o.tail ?? 4, win = o.win ?? 2.2, spoil = o.spoil || (() => false);
  const ok = heat.filter(([t]) => t > minT && t < endT - tail && !spoil(t));
  if (ok.length < 10) return null;
  // smoothed over a quarter of a second each side, so one spike doesn't beat a real fight
  const S = new Float64Array(ok.length);
  for (let i = 0, a = 0, b = 0, s = 0; i < ok.length; i++) {
    while (b < ok.length && ok[b][0] <= ok[i][0] + 0.25) s += ok[b++][1];
    while (ok[a][0] < ok[i][0] - 0.25) s -= ok[a++][1];
    S[i] = s;
  }
  const P = new Float64Array(ok.length + 1); for (let i = 0; i < ok.length; i++) P[i + 1] = P[i] + ok[i][1];
  let best = null;
  for (let i = 0, a = 0, pa = 0; i < ok.length; i++) {
    while (ok[i][0] - ok[a][0] > win) a++;
    // what came in the 1.5 s just before the window (action that builds into the peak beats a bolt from the blue)
    while (pa < a && ok[a][0] - ok[pa][0] > 1.5) pa++;
    const sum = P[i + 1] - P[a], pre = P[a] - P[pa], sc = sum + pre * 0.3;
    if (!best || sc > best.sc) {
      let pk = a; for (let q = a; q <= i; q++) if (S[q] > S[pk]) pk = q;
      best = { sc, t: ok[pk][0] };
    }
  }
  return best && best.sc > 0 ? best.t : null;
}

// ----- the timing -----
function make(cfg = {}) {
  const fps = cfg.fps || 60, n = Math.round(fps * (cfg.seconds || 3.4)), rewind = cfg.rewind !== false;
  // how fast the battle plays at each moment (1 = real speed, 0 = frozen); after the aftermath the rewind takes over
  const speed = f => {
    if (f < 0.30) return 1;
    if (f < PEAK) return 1 - 0.8 * easeOut((f - 0.30) / (PEAK - 0.30));
    if (f < FREEZE) return 0;
    if (f < AFTER) return 0.15;
    if (rewind) return 0;
    if (f < EXIT) return 0.15 + 0.85 * ((f - AFTER) / (EXIT - AFTER)) ** 2;
    return 1;
  };
  const peakJ = Math.round(n * PEAK);
  let lead = 0; for (let j = 0; j < peakJ; j++) lead += speed(j / n) / fps;
  const live = j => !rewind || j / n < AFTER;
  return { n, fps, rewind, speed, lead, peakJ, live, seconds: n / fps };
}

// ----- the picture -----
// one cold open in the making: call frame() for every frame (with the battle drawn into src, or null once the rewind runs)
class ColdOpen {
  constructor(ctx, o) {
    this.ctx = ctx; this.W = ctx.canvas.width; this.H = ctx.canvas.height; this.o = o;
    this.T = make(o); this.seed = o.seed >>> 0;
    this.cache = []; this.cw = Math.round(this.W / 3); this.ch = Math.round(this.H / 3);
    this.tmp = createCanvas(this.W, this.H); this.tint = [0, 1, 2].map(() => createCanvas(this.W, this.H));
    // film grain: one tile of noise, moved about every frame
    const gs = 256; this.grain = createCanvas(gs, gs);
    { const g = this.grain.getContext('2d'), im = g.createImageData(gs, gs); for (let i = 0; i < gs * gs; i++) { const v = Math.floor(hash(i, this.seed) * 255); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); }
    const R = k => hash(k, this.seed ^ 0xC01D);
    this.lines = Array.from({ length: 36 }, (_, k) => [R(k * 3) * TAU, 0.55 + R(k * 3 + 1) * 0.25, 0.006 + R(k * 3 + 2) * 0.014]);
    this.bolts = Array.from({ length: 4 }, (_, b) => { const pts = []; let x = this.W * (0.1 + 0.8 * R(200 + b)), y = 0, q = 0; pts.push([x, y]); while (y < this.H) { x += (R(300 + b * 50 + q) - 0.5) * 120 * (this.W / 1080); y += (40 + 70 * R(400 + b * 50 + q)) * (this.H / 1920); pts.push([x, y]); q++; } return pts; });
  }
  // the zoom on the battle at f (on top of the cover fit)
  zoomAt(f) {
    const peak = Math.exp(-(((f - PEAK) / 0.05) ** 2));
    return 1 + 0.06 * Math.exp(-f * 14) + 0.07 * sm(f / PEAK) + 0.06 * peak + (f > PEAK && f < AFTER ? 0.025 * (f - PEAK) / (AFTER - PEAK) : 0);
  }
  // src: the battle with no UI; crop: { sx, sy, sw, sh } in src pixels (the battlefield)
  frame(j, src, crop) {
    const { ctx, W, H, T } = this, f = j / T.n, peak = Math.exp(-(((f - PEAK) / 0.045) ** 2));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (T.live(j)) {
      ctx.fillStyle = '#05070D'; ctx.fillRect(0, 0, W, H);
      const cover = Math.max(W / crop.sw, H / crop.sh), z = cover * this.zoomAt(f), dw = crop.sw * z, dh = crop.sh * z;
      // a jolt on the impact, settling
      const jt = (j - T.peakJ) / T.fps, jolt = jt >= 0 ? 18 * (W / 1080) * Math.exp(-jt * 9) : 0, jx = Math.sin(j * 2.1) * jolt, jy = Math.cos(j * 1.7) * jolt;
      ctx.drawImage(src, crop.sx, crop.sy, crop.sw, crop.sh, (W - dw) / 2 + jx, (H - dh) / 2 + jy, dw, dh);
      // zoom blur: the punch in, and the impact
      const blur = Math.max(peak * 0.9, Math.exp(-f * 16) * 0.85);
      if (blur > 0.05) for (let q = 1; q <= 3; q++) { const zz = z * (1 + 0.02 * q * blur); ctx.globalAlpha = 0.15 * blur; ctx.drawImage(src, crop.sx, crop.sy, crop.sw, crop.sh, (W - crop.sw * zz) / 2 + jx, (H - crop.sh * zz) / 2 + jy, crop.sw * zz, crop.sh * zz); }
      ctx.globalAlpha = 1;
      this.grade(f);
      // keep a small copy for the rewind (every other frame)
      if (T.rewind && j % 2 === 0) { const c = createCanvas(this.cw, this.ch); c.getContext('2d').drawImage(ctx.canvas, 0, 0, this.cw, this.ch); this.cache.push(c); }
      this.bars(f);
      if (peak > 0.08) this.impactLines(j, peak);
      const after = j - T.peakJ;
      if (after >= 0 && after < 10) this.split(Math.round((14 - after) * (W / 1080)) * (after < 5 ? 1 : 0.5));
      if (after === 0 || after === 2) this.impactFrame(after === 0 ? 1 : 0.55);
      if (after === 1) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(0, 0, W, H); }
      // the freeze breathes in a little
      if (f >= PEAK && f < FREEZE) { ctx.fillStyle = `rgba(210,230,255,${0.06 * Math.sin(Math.PI * (f - PEAK) / (FREEZE - PEAK))})`; ctx.fillRect(0, 0, W, H); }
      if (!T.rewind && f > AFTER) this.exit(f, j);
    } else this.rewindFrame(j, f);
    this.film(j, f);
    ctx.restore();
  }
  grade(f) {
    const { ctx, W, H } = this;
    ctx.globalCompositeOperation = 'soft-light';
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,170,90,0.55)'); g.addColorStop(1, 'rgba(40,120,170,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // slow motion goes a touch cooler and deeper
    const slow = f > 0.32 && f < AFTER ? Math.min(1, (f - 0.32) / 0.08) : 0;
    if (slow > 0) { ctx.fillStyle = `rgba(30,60,120,${0.25 * slow})`; ctx.fillRect(0, 0, W, H); }
    ctx.globalCompositeOperation = 'source-over';
  }
  bars(f) {
    const { ctx, W, H } = this, k = sm((f - 0.30) / 0.1) * (1 - sm((f - AFTER) / 0.06)), h = H * 0.075 * k;
    if (h < 0.5) return;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h);
  }
  impactLines(j, a) {
    const { ctx, W, H } = this, R = Math.hypot(W, H) / 2;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.fillStyle = `rgba(255,255,255,${0.6 * a})`;
    for (const [an, r0, w] of this.lines) { const a1 = an + w + Math.sin(j * 0.9 + an * 5) * 0.003; ctx.beginPath(); ctx.moveTo(Math.cos(an) * R * r0, Math.sin(an) * R * r0); ctx.lineTo(Math.cos(an) * R * 1.2, Math.sin(an) * R * 1.2); ctx.lineTo(Math.cos(a1) * R * 1.2, Math.sin(a1) * R * 1.2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  // a colour split: red one way, blue the other (each channel taken out of the frame and added back, shifted)
  split(d) {
    if (d < 1) return;
    const { ctx, W, H } = this, t = this.tmp.getContext('2d');
    t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'source-over'; t.drawImage(ctx.canvas, 0, 0);
    ['#FF0000', '#00FF00', '#0000FF'].forEach((c, i) => { const g = this.tint[i].getContext('2d'); g.globalCompositeOperation = 'source-over'; g.drawImage(this.tmp, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = c; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; });
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(this.tint[0], d, 0); ctx.drawImage(this.tint[1], 0, 0); ctx.drawImage(this.tint[2], -d, 0);
    ctx.globalCompositeOperation = 'source-over';
  }
  // an impact frame: the picture inverted, in black and white, for a frame
  impactFrame(a) {
    const { ctx, W, H } = this;
    ctx.globalAlpha = a; ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  rewindFrame(j, f) {
    const { ctx, W, H, cache } = this;
    if (!cache.length) { ctx.fillStyle = '#05070D'; ctx.fillRect(0, 0, W, H); return; }
    // from the newest kept frame back to the first, faster and faster, reaching the start a little before the flash
    const u = clamp01((f - AFTER) / (0.97 - AFTER)), pos = (1 - (0.35 * u + 0.65 * easeIn(u))) * (cache.length - 1), i0 = Math.floor(pos), i1 = Math.max(0, i0 - 1);
    const jit = (hash(j, 7) - 0.5) * 6 * (H / 1920) * (0.4 + u);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(cache[i0], 0, jit, W, H);
    // the frame it's heading to, smeared over it (motion on the way back)
    ctx.globalAlpha = 0.35 + 0.3 * u; ctx.drawImage(cache[i1], 0, jit - 4 * (H / 1920), W, H); ctx.globalAlpha = 1;
    // washed-out colour, a cool cast
    ctx.globalAlpha = 0.45; ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.5; ctx.fillStyle = '#4A7FB0'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    this.split(Math.round((5 + 6 * u) * (W / 1080)));
    // tape tracking: bright noisy bands rolling up the screen, and the bottom edge torn
    for (let b = 0; b < 2; b++) {
      const by = ((1 - ((f * (3 + b * 2.3) + b * 0.37) % 1)) * (H * 1.2)) - H * 0.1, bh = H * (0.018 + 0.02 * b);
      ctx.globalAlpha = 0.5; ctx.drawImage(this.grain, (j * 37) % 128, 0, 128, 16, 0, by, W, bh);
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, by + bh * 0.4, W, bh * 0.15);
      ctx.globalAlpha = 1;
      // the band drags the picture sideways (copied out first: a canvas is never drawn onto itself)
      const sh = (hash(j, b + 11) - 0.5) * 30 * (W / 1080), y0 = Math.max(0, Math.round(by - bh)), y1 = Math.min(H, Math.round(by + bh));
      if (y1 - y0 > 2) { const t = this.tmp.getContext('2d'); t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'source-over'; t.globalAlpha = 1; t.clearRect(0, y0, W, y1 - y0); t.drawImage(ctx.canvas, 0, y0, W, y1 - y0, 0, y0, W, y1 - y0); ctx.drawImage(this.tmp, 0, y0, W, y1 - y0, sh, y0, W, y1 - y0); }
    }
    { const th = H * 0.03; ctx.globalAlpha = 0.6; ctx.drawImage(this.grain, (j * 53) % 128, 128, 128, 20, -20, H - th, W + 40, th); ctx.globalAlpha = 1; }
    // scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; const step = Math.max(3, Math.round(H / 480));
    for (let y = (j % 2) * step / 2; y < H; y += step) ctx.fillRect(0, y, W, step / 2);
    if (f > EXIT) this.exit(f, j);
  }
  // the way out: the picture rushes away into a zoom tunnel, lightning cracks down, a white flash into the face-off
  exit(f, j) {
    const { ctx, W, H } = this, out = clamp01((f - EXIT) / (1 - EXIT));
    const t = this.tmp.getContext('2d'); t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'source-over'; t.drawImage(ctx.canvas, 0, 0);
    for (let q = 1; q <= 4; q++) { const z = 1 + out * out * 0.5 * q; ctx.globalAlpha = 0.22 * out; ctx.drawImage(this.tmp, (W - W * z) / 2, (H - H * z) / 2, W * z, H * z); }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    this.bolts.forEach((pts, b) => {
      const on = clamp01(out * 1.6 - b * 0.18); if (on <= 0) return;
      ctx.beginPath(); pts.forEach(([x, y], k) => { const xx = x + (hash(j, b * 31 + k) - 0.5) * 16 * (W / 1080); if (k) ctx.lineTo(xx, y); else ctx.moveTo(xx, y); });
      ctx.lineWidth = 16 * (W / 1080); ctx.strokeStyle = `rgba(150,200,255,${0.35 * on})`; ctx.stroke();
      ctx.lineWidth = 4.5 * (W / 1080); ctx.strokeStyle = `rgba(255,255,255,${0.95 * on})`; ctx.stroke();
    });
    ctx.restore();
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, out * out * 1.15)})`; ctx.fillRect(0, 0, W, H);
  }
  film(j, f) {
    const { ctx, W, H } = this;
    // grain
    ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = 'overlay';
    const gx = -Math.floor(hash(j, 1) * 256), gy = -Math.floor(hash(j, 2) * 256), gs = 256 * Math.max(1, W / 1080);
    for (let y = gy; y < H; y += gs) for (let x = gx; x < W; x += gs) ctx.drawImage(this.grain, x, y, gs, gs);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // vignette (lifts as the white flash comes in)
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.64), peak = Math.exp(-(((f - PEAK) / 0.05) ** 2));
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${(0.55 + 0.15 * peak) * (1 - clamp01((f - 0.93) / 0.07))})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  first() { return this.cache[0] || null; }
}

// ----- the sound: a riser into the impact, a sub drop, a tape stop on the freeze, the rewind whirr, then whoosh, zap, thunder.
// at: where the cold open starts in the video (seconds).
function sounds(synth, at, T) {
  const D = T.seconds, pk = at + D * PEAK;
  // the riser: a rising tone and a swelling hiss from the first second to the hit
  const r0 = at + D * 0.1, rl = pk - r0;
  synth.voice(r0, { dur: rl + 0.02, gain: 0.07, attack: rl * 0.9, partials: [{ f: 180, f2: 1400, glide: rl * 0.9, decay: 3 }, { f: 270, f2: 2100, glide: rl * 0.9, a: 0.4, decay: 3 }] });
  for (let q = 0; q < 10; q++) { const tq = r0 + rl * (q / 10); synth.voice(tq, { dur: rl / 10 + 0.05, gain: 0.02 + 0.06 * (q / 10), noise: { a: 1, decay: 0.12, lp: 0.15 + 0.6 * (q / 10), hp: true } }); }
  // the impact: a boom, a sub drop and a bright crack
  synth.play({ type: 'boom', gain: 1.2 }, pk);
  synth.voice(pk, { dur: 1.1, gain: 0.5, partials: [{ f: 70, f2: 28, glide: 0.5, decay: 0.55 }] });
  synth.voice(pk, { dur: 0.18, gain: 0.25, noise: { a: 1, decay: 0.04, lp: 0.95, hp: true } });
  // the freeze: a tape stop (everything winds down in pitch)
  const fz = at + D * PEAK + 0.04;
  synth.voice(fz, { dur: 0.32, gain: 0.12, partials: [{ f: 520, f2: 40, glide: 0.11, decay: 0.3 }, { f: 780, f2: 60, glide: 0.11, a: 0.5, decay: 0.3 }] });
  if (T.rewind) {
    // the rewind: short chirps sweeping up, closer and closer together, and a hiss
    const w0 = at + D * AFTER, w1 = at + D * 0.97;
    for (let tq = w0, k = 0; tq < w1; k++) { const u = (tq - w0) / (w1 - w0); synth.voice(tq, { dur: 0.09, gain: 0.05 + 0.04 * u, partials: [{ f: 300 + 500 * u, f2: 1200 + 1800 * u, glide: 0.05, decay: 0.07 }] }); tq += Math.max(0.028, 0.12 * (1 - u)); }
    synth.voice(w0, { dur: w1 - w0, gain: 0.05, attack: 0.1, noise: { a: 1, decay: w1 - w0, lp: 0.5, hp: true } });
  }
  synth.play({ type: 'whoosh' }, at + 0.02);
  synth.play({ type: 'whoosh' }, at + D * EXIT - 0.05);
  synth.play({ type: 'zap' }, at + D * 0.9);
  synth.play({ type: 'thunder' }, at + D * 0.93);
}

module.exports = { pick, make, ColdOpen, sounds, PEAK, FREEZE, AFTER, EXIT };
