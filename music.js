// music.js: an original soundtrack for every video, written by code from the video's seed (nothing licensed, nothing sampled).
// Shared by the clash games (Army Clash, Tower Clash, and any future one): keep the copies in every repo identical.
//
// How it follows the video (the cues come from the render loop, see tracker()):
//   intro     soft pad and a ticking pulse under the opening
//   the drop  full drums crash in on the first downbeat after the first kill
//   the fight drums, bass, an arpeggio and hats, busier the more is happening on screen
//   the end   a heartbeat in the last seconds, a riser, a beat of silence, then a huge hit on the final blow
//   victory   a major-key fanfare over the outro that resolves back to the opening chord, so the loop back to the start is seamless
// Effects stay on top: the music ducks under every loud sound effect.
'use strict';

const TAU = Math.PI * 2;

function rng(seed) {
  let a = (seed ^ 0x6D757321) >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// the instruments of each style: an ancient battle gets war drums, low brass and a harp; a modern one punchy drums and a
// saw synth; a sci-fi one a synthwave arpeggio; the default is "epic" (orchestral drums and strings)
const STYLES = {
  epic: { kick: 1, snare: 0.8, taiko: 0.7, hat: 0.5, pad: 'saw', padLp: 1400, arp: 'tri', arpLp: 3200, bass: 'saw', bassLp: 500 },
  ancient: { kick: 0.7, snare: 0.5, taiko: 1.1, hat: 0.3, pad: 'saw', padLp: 1000, arp: 'pluck', arpLp: 4000, bass: 'saw', bassLp: 380 },
  modern: { kick: 1.1, snare: 1, taiko: 0.4, hat: 0.7, pad: 'saw', padLp: 1800, arp: 'sq', arpLp: 2600, bass: 'sq', bassLp: 600 },
  scifi: { kick: 1, snare: 0.9, taiko: 0.3, hat: 0.6, pad: 'sq', padLp: 2200, arp: 'saw', arpLp: 3800, bass: 'saw', bassLp: 700 },
};
const PROGS = [[0, 5, 2, 6], [0, 3, 5, 4], [0, 6, 5, 6], [0, 5, 3, 4], [0, 2, 5, 6], [0, 3, 6, 4]];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

// the tempo, key and chords of a video (no rendering): render.js uses it before the video to time the camera's beat punches
function plan(seed, style) {
  const r = rng(seed >>> 0);
  const bpm = 120 + Math.floor(r() * 5) * 5;              // 120..140
  const root = 45 + Math.floor(r() * 8);                    // A2..E3
  const prog = PROGS[Math.floor(r() * PROGS.length)];
  return { seed: seed >>> 0, style: STYLES[style] ? style : 'epic', bpm, beat: 60 / bpm, root, prog, r };
}
// the chord of a degree in the key (harmonic minor for the fifth, so it pulls home)
function chord(root, deg) {
  const s = i => { const o = Math.floor(i / 7), d = ((i % 7) + 7) % 7; return root + 12 * o + MINOR[d] + (deg === 4 && d === 6 ? 1 : 0); };
  return [s(deg), s(deg + 2), s(deg + 4)];
}

// records what happens in each frame, then works out the cues: when the fight starts, the first kill, the final blow,
// how busy the screen is
function tracker() {
  const rows = [];
  return {
    frame(t, game) {
      const n = (game.sfx || []).length, ko = (game.sfx || []).some(e => e.type === 'ko' || e.type === 'groan' || e.type === 'crush');
      rows.push({ t, phase: game.phase, n, ko, hold: !!game.holdOutro, left: game.phase === 'outro' && game.outroLen ? game.outroLen - game.outroT : null });
    },
    cues() {
      const st = rows.find(r => r.phase === 'fight'), start = st ? st.t : 1.5;
      const en = rows.find(r => r.t > start && r.phase !== 'fight' && r.phase !== 'intro'), end = en ? en.t : (rows.length ? rows[rows.length - 1].t - 3 : 60);
      const fk = rows.find(r => r.t > start && r.ko), first = Math.min(fk ? fk.t : start + 2.5, start + 4);   // (never a long wait for the drop)
      // busy-ness per half second, smoothed, 0..1
      const N = Math.ceil(((rows.length ? rows[rows.length - 1].t : 63) + 1) * 2), busy = new Float32Array(N);
      for (const r of rows) busy[Math.min(N - 1, Math.floor(r.t * 2))] += r.n;
      let mx = 1; for (let i = 0; i < N; i++) mx = Math.max(mx, busy[i]);
      let s = 0; for (let i = 0; i < N; i++) { s += (busy[i] / mx - s) * 0.35; busy[i] = s; }
      let peak = 0.01; for (let i = 0; i < N; i++) peak = Math.max(peak, busy[i]);
      for (let i = 0; i < N; i++) busy[i] = Math.min(1, busy[i] / peak);
      return { start, first, end, busy };
    },
  };
}

class Bus {
  constructor(sr, len) { this.sr = sr; this.L = new Float32Array(len); this.R = new Float32Array(len); this.len = len; }
  // one note: a waveform through a one-pole low-pass, with attack and release, panned
  tone(t, dur, f, amp, o = {}) {
    const sr = this.sr, s0 = Math.floor(t * sr), att = Math.max(1, (o.att || 0.005) * sr), rel = Math.max(1, (o.rel || 0.08) * sr);
    const n = Math.min(Math.floor((dur + (o.rel || 0.08)) * sr), this.len - s0); if (n <= 0 || s0 < 0) return;
    const hold = Math.floor(dur * sr), pan = o.pan || 0, gl = amp * Math.cos((pan + 1) * Math.PI / 4), gr = amp * Math.sin((pan + 1) * Math.PI / 4);
    const a = 1 - Math.exp(-TAU * (o.lp || 4000) / sr), dec = o.dec ? Math.exp(-1 / (o.dec * sr)) : 1, det = o.det || 0, w = o.wave || 'sin';
    let p1 = 0, p2 = 0.37, lp = 0, env = 1;
    const i1 = f / sr, i2 = f * (1 + det) / sr;
    for (let i = 0; i < n; i++) {
      p1 += i1; p2 += i2; if (p1 >= 1) p1 -= 1; if (p2 >= 1) p2 -= 1;
      let v;
      if (w === 'saw') v = (2 * p1 - 1) + (det ? 2 * p2 - 1 : 0);
      else if (w === 'sq') v = (p1 < 0.5 ? 1 : -1) + (det ? (p2 < 0.5 ? 1 : -1) : 0);
      else if (w === 'tri') v = 1 - 4 * Math.abs(p1 - 0.5);
      else v = Math.sin(TAU * p1);
      if (det && w !== 'tri' && w !== 'sin') v *= 0.5;
      lp += (v - lp) * a;
      let e = env; if (i < att) e *= i / att; if (i > hold) e *= Math.max(0, 1 - (i - hold) / rel);
      env *= dec;
      this.L[s0 + i] += lp * e * gl; this.R[s0 + i] += lp * e * gr;
    }
  }
  // drums and noises
  kick(t, amp, big = 1) {
    const sr = this.sr, s0 = Math.floor(t * sr), n = Math.min(Math.floor(0.45 * big * sr), this.len - s0); if (n <= 0 || s0 < 0) return;
    let ph = 0;
    for (let i = 0; i < n; i++) { const x = i / sr, f = 45 + 110 * Math.exp(-x * 28 / big); ph += f / sr; const v = Math.sin(TAU * ph) * Math.exp(-x * 7 / big) * amp + (i < 60 ? (1 - i / 60) * 0.3 * amp : 0); this.L[s0 + i] += v; this.R[s0 + i] += v; }
  }
  noise(t, dur, amp, o, r) {
    const sr = this.sr, s0 = Math.floor(t * sr), n = Math.min(Math.floor(dur * sr), this.len - s0); if (n <= 0 || s0 < 0) return;
    const pan = o.pan || 0, gl = Math.cos((pan + 1) * Math.PI / 4) * 1.41, gr = Math.sin((pan + 1) * Math.PI / 4) * 1.41;
    let lp = 0, prev = 0;
    for (let i = 0; i < n; i++) {
      const x = i / n, cut = o.sweep ? o.lp * Math.pow(o.sweep, x) : o.lp || 8000, a = 1 - Math.exp(-TAU * Math.min(cut, sr * 0.45) / sr);
      const w = r() * 2 - 1; lp += (w - lp) * a; let v = o.hp ? lp - prev : lp; prev = lp;
      const e = o.rise ? Math.pow(x, o.rise) : Math.exp(-i / ((o.dec || 0.05) * sr));
      v *= e * amp; this.L[s0 + i] += v * gl; this.R[s0 + i] += v * gr;
    }
  }
  snare(t, amp, r) { this.noise(t, 0.22, amp * 0.8, { lp: 7000, hp: true, dec: 0.07 }, r); this.tone(t, 0.06, 190, amp * 0.5, { dec: 0.05, rel: 0.02 }); }
  hat(t, amp, r, pan) { this.noise(t, 0.06, amp, { lp: 12000, hp: true, dec: 0.018, pan }, r); }
  taiko(t, amp, r, f = 70) { this.tone(t, 0.5, f, amp, { dec: 0.16, rel: 0.05, lp: 600 }); this.noise(t, 0.12, amp * 0.6, { lp: 900, dec: 0.03 }, r); }
  crash(t, amp, r) { this.noise(t, 2.2, amp, { lp: 9000, hp: true, dec: 0.6 }, r); }
}

// the whole soundtrack, as long as the video: { L, R } at the given sample rate
function render(p, { sr, dur, cues }) {
  const len = Math.ceil(sr * (dur + 0.05)), B = new Bus(sr, len), S = STYLES[p.style], r = p.r, beat = p.beat, bar = beat * 4;
  const { start, end } = cues, busy = cues.busy;
  const drop = Math.max(start, Math.ceil((cues.first - 0.05) / bar) * bar);               // first downbeat after the first kill
  const fin = Math.max(drop + bar, end);                                                    // the final blow
  const busyAt = t => busy[Math.max(0, Math.min(busy.length - 1, Math.floor(t * 2)))] || 0;
  const chordAt = t => chord(p.root + 12, p.prog[Math.floor(t / bar) % 4]);
  const nBars = Math.ceil(dur / bar) + 1;

  for (let b = 0; b < nBars; b++) {
    const t0 = b * bar; if (t0 > dur) break;
    const outro = t0 >= fin, ch = outro ? null : chordAt(t0);
    if (!outro) {
      // pad: the chord, held, swelling in under the intro
      const pk = t0 < drop ? 0.5 + 0.3 * (t0 / Math.max(drop, 0.1)) : 0.7;
      const padEnd = Math.min(t0 + bar, fin - 0.3);
      if (padEnd > t0) for (const [k, m] of ch.entries()) B.tone(t0, padEnd - t0, mtof(m), 0.028 * pk, { wave: S.pad, lp: S.padLp, det: 0.006, att: 0.25, rel: 0.4, pan: (k - 1) * 0.5 });
    }
    for (let q = 0; q < 16; q++) {
      const t = t0 + q * beat / 4; if (t >= dur) break;
      if (t >= fin - 0.26 && t < fin + 0.01) continue;      // a beat of silence before the final blow
      if (t >= fin) continue;                                // (the outro is written below)
      const I = busyAt(t), beatN = q / 4, on = q % 4 === 0;
      if (t < drop) {
        // the intro: a ticking pulse and a low drum on each bar
        if (q === 0) B.taiko(t, 0.25 * S.taiko, r, 62);
        if (q % 2 === 0) B.hat(t, 0.025, r, 0.3);
        if (t > drop - bar) { if (q >= 8 && q % 2 === 0) B.snare(t, 0.06 + 0.12 * (q - 8) / 8, r); }    // a roll into the drop
        continue;
      }
      // the fight
      if (on && (beatN === 0 || beatN === 2 || (I > 0.6 && q === 10))) B.kick(t, 0.5 * S.kick);
      if (on && (beatN === 1 || beatN === 3)) B.snare(t, 0.22 * S.snare, r);
      if (q % 2 === 0 || I > 0.55) B.hat(t, (q % 4 === 2 ? 0.07 : 0.04) * S.hat * (0.6 + 0.6 * I), r, q % 2 ? -0.3 : 0.3);
      if (S.taiko > 0.5 && (q === 6 || q === 14) && I > 0.3) B.taiko(t, 0.18 * S.taiko, r, q === 6 ? 82 : 70);
      // bass: the root, on the eighths
      if (q % 2 === 0) { const ch2 = chordAt(t); B.tone(t, beat / 2 * 0.9, mtof(ch2[0] - 12), 0.09, { wave: S.bass, lp: S.bassLp, dec: 0.35, rel: 0.03 }); }
      // the arpeggio, louder when the screen is busy
      if (I > 0.25) { const ch2 = chordAt(t), m = ch2[[0, 1, 2, 1][q % 4]] + 12 * (q % 8 < 4 ? 1 : 2); B.tone(t, beat / 4 * 0.8, mtof(m), 0.02 + 0.03 * I, { wave: S.arp === 'pluck' ? 'tri' : S.arp, lp: S.arpLp, dec: S.arp === 'pluck' ? 0.12 : 0.25, rel: 0.03, pan: Math.sin(q) * 0.5 }); }
      // a fill on the last beat of every fourth bar
      if (b % 4 === 3 && q >= 12 && I > 0.2) B.snare(t, 0.08 + 0.04 * (q - 12), r);
    }
    if (t0 === drop || (t0 > drop && t0 < fin && b % 8 === 0)) B.crash(t0, t0 === drop ? 0.12 : 0.06, r);
  }
  // the end: a heartbeat in the last eight seconds, a riser into the silence, then the hit
  for (let t = Math.max(drop, fin - 8); t < fin - 3; t += beat * 2) { B.kick(t, 0.3, 1.4); B.kick(t + 0.18, 0.2, 1.4); }
  const rs = Math.max(drop, fin - 3.2);
  B.noise(rs, fin - 0.26 - rs, 0.16, { lp: 300, sweep: 40, rise: 2.2, hp: true }, r);
  for (let t = fin - 2; t < fin - 0.3; t += Math.max(0.05, (fin - 0.3 - t) * 0.12)) B.snare(t, 0.06 + 0.1 * (1 - (fin - 0.3 - t) / 1.7), r);
  B.kick(fin, 0.95, 2.2); B.crash(fin, 0.25, r); B.taiko(fin, 0.5, r, 55);
  // victory: the fanfare, in the major key, resolving onto the opening chord so the replay flows on
  const maj = p.root + 12 + 3, fan = [[maj, maj + 4, maj + 7], [maj + 5, maj + 9, maj + 12], [maj + 7, maj + 11, maj + 14], chord(p.root + 12, p.prog[0])];
  const step = Math.max(0.5, Math.min(beat * 2, (dur - fin - 0.2) / 4));
  fan.forEach((c, k) => { const t = fin + 0.15 + k * step; for (const [j, m] of c.entries()) B.tone(t, step * (k === 3 ? 1.6 : 0.95), mtof(m), 0.035, { wave: S.pad, lp: 2400, det: 0.004, att: 0.03, rel: 0.5, pan: (j - 1) * 0.4 }); B.tone(t, step * 0.9, mtof(c[2] + 12), 0.02, { wave: 'tri', lp: 3000, att: 0.02, rel: 0.2 }); if (k < 3) B.taiko(t, 0.2, r, 66); });
  return { L: B.L, R: B.R, drop, fin };
}

// the beat punches for the camera: how much to zoom in at this moment of the video (render.js turns it on for the climax)
function pulse(p, t, amt = 0.014) { const ph = (t % p.beat) / p.beat; return amt * Math.exp(-ph * 9); }

// music under the effects: the effects (already limited, -1..1) duck the music, then both go through a soft limiter
function mix(sfxL, sfxR, mus, { volume = 0.8, duck = 0.45, sr } = {}) {
  const n = sfxL.length, L = new Float32Array(n), R = new Float32Array(n);
  const att = 1 - Math.exp(-1 / (0.004 * sr)), rel = 1 - Math.exp(-1 / (0.18 * sr));
  let env = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.max(Math.abs(sfxL[i]), Math.abs(sfxR[i]));
    env += (a - env) * (a > env ? att : rel);
    const g = volume * (1 - duck * Math.min(1, env * 2));
    L[i] = Math.tanh(sfxL[i] + (mus.L[i] || 0) * g) * 0.98;
    R[i] = Math.tanh(sfxR[i] + (mus.R[i] || 0) * g) * 0.98;
  }
  return { L, R };
}

module.exports = { plan, tracker, render, pulse, mix, STYLES };
