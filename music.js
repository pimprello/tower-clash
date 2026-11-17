// music.js: an original soundtrack for every video, written by code from the video's seed (nothing licensed, nothing sampled).
// Shared by the clash games (Army Clash, Tower Clash, and any future one): keep the copies in every repo identical.
//
// How it follows the video (the cues come from the render loop, see tracker()):
//   intro     soft pad and a ticking pulse under the opening, a reversed swell into the drop
//   the tune  every video has its own two-bar hook on a lead (brass, flute, square or synth by style), eight bars on, four off
//   the sound wide detuned pads that breathe with the kick, strings or an arpeggio, a hall reverb and a ping-pong echo
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
  // (Territory Clash's copy, Rellz 2026-11-16: "the music should sound medieval and there should be a variety") four medieval
  // styles: frame drums and tambourines instead of a kit, a drone under everything, lute plucks, and a recorder, horn, fiddle or
  // chanter on the tune, each in an old mode. Additive: the other styles sound exactly as before.
  crusade: { kick: 0, snare: 0.5, taiko: 1.3, hat: 0.2, pad: 'saw', padLp: 900, arp: 'pluck', arpLp: 3000, bass: 'saw', bassLp: 320 },
  tavern: { kick: 0, snare: 0.4, taiko: 0.8, hat: 0.6, pad: 'tri', padLp: 1600, arp: 'pluck', arpLp: 4200, bass: 'tri', bassLp: 500 },
  court: { kick: 0, snare: 0.35, taiko: 0.7, hat: 0.35, pad: 'saw', padLp: 1300, arp: 'pluck', arpLp: 5000, bass: 'tri', bassLp: 450 },
  highland: { kick: 0, snare: 0.9, taiko: 1, hat: 0.25, pad: 'saw', padLp: 1100, arp: 'pluck', arpLp: 3600, bass: 'saw', bassLp: 380 },
};
// map themes (rules.picks.mapMusic, Rellz 2026-11-16, idea 27): a map's own sound on top of the era's style. The map key picks it
// (no dice) and the notes still come from the seed; only the instruments change, never the loudness (music.levels sets that).
// desert: hand drums and a plucked oud-like lead; snow: sleigh bells and glassy bells over soft pads (festive at Christmas: more bells
// and a bright counter-melody); forest: a breathy flute and plucked strings; synth: a neon lead and arpeggio; war: heavy war drums.
const THEMES = {
  desert: { S: { taiko: 1.1, hat: 0.45, arp: 'pluck', arpLp: 4200, padLp: 1100 }, lead: { wave: 'tri', voices: 2, det: 0.003, lp: 3600, att: 0.008, vib: 0.016, rev: 0.35, dly: 0.2, amp: 0.07 }, ost: false, darbuka: true },
  snow: { S: { kick: 0.7, snare: 0.55, taiko: 0.4, hat: 0.3, padLp: 1700, arp: 'tri', arpLp: 5200 }, lead: { wave: 'tri', voices: 1, lp: 6000, att: 0.004, vib: 0.003, rev: 0.6, dly: 0.3, amp: 0.06 }, bells: true, ost: true },
  forest: { S: { taiko: 0.6, hat: 0.35, arp: 'pluck', arpLp: 3600, padLp: 1200 }, lead: { wave: 'tri', voices: 1, lp: 3000, att: 0.06, vib: 0.013, rev: 0.55, dly: 0.22, amp: 0.075 }, ost: false, breath: true },
  synth: { S: { kick: 1.1, snare: 0.9, taiko: 0.2, hat: 0.7, pad: 'sq', padLp: 2400, arp: 'saw', arpLp: 4200, bass: 'saw', bassLp: 800 }, lead: { wave: 'saw', voices: 3, det: 0.01, lp: 2800, fenv: 1.5, fdec: 0.2, att: 0.01, vib: 0.005, rev: 0.3, dly: 0.35, amp: 0.045 }, ost: false, four: true, pump: 0.6 },
  war: { S: { kick: 1.1, snare: 1, taiko: 1.4, hat: 0.4, padLp: 1100, bassLp: 420 }, ost: true, warDrums: true },
};
// (Army Clash's maps, Tower Clash's (pyramid, shroom, blossom) and Territory Clash's island themes (frostwild, thornvale...))
const MAP_THEME = { dunes: 'desert', snow: 'snow', frozen: 'snow', forest: 'forest', overgrown: 'forest', enchanted: 'forest', swamp: 'forest', neon: 'synth', city: 'synth', furnace: 'war', bombed: 'war',
  pyramid: 'desert', shroom: 'forest', blossom: 'forest', frostwild: 'snow', thornvale: 'forest', duskfen: 'forest', goldmarch: 'desert', saltreach: 'desert', ashen: 'war' };
const MODES = { minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10] };
const PROGS = [[0, 5, 2, 6], [0, 3, 5, 4], [0, 6, 5, 6], [0, 5, 3, 4], [0, 2, 5, 6], [0, 3, 6, 4]];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

// the tempo, key and chords of a video (no rendering): render.js uses it before the video to time the camera's beat punches
function plan(seed, style, opts = {}) {
  const r = rng(seed >>> 0);
  let bpm = 120 + Math.floor(r() * 5) * 5;              // 120..140
  const root = 45 + Math.floor(r() * 8);                    // A2..E3
  const prog = PROGS[Math.floor(r() * PROGS.length)];
  const st = STYLES[style] ? style : 'epic', VX = VOICE[st] || {};
  if (VX.bpm) bpm = VX.bpm[0] + Math.round((bpm - 120) / 20 * (VX.bpm[1] - VX.bpm[0]));   // (same dice, the style's own range)
  const theme = opts.theme || (opts.map && MAP_THEME[opts.map]) || null;
  return { seed: seed >>> 0, style: st, bpm, beat: 60 / bpm, root, prog, r, scale: MODES[VX.mode] || MINOR, theme: THEMES[theme] ? theme : null, festive: !!opts.festive };
}
// the chord of a degree in the key (harmonic minor for the fifth, so it pulls home)
function chord(root, deg, SC = MINOR) {
  const s = i => { const o = Math.floor(i / 7), d = ((i % 7) + 7) % 7; return root + 12 * o + SC[d] + (deg === 4 && d === 6 && SC === MINOR ? 1 : 0); };
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
  constructor(sr, len) {
    this.sr = sr; this.L = new Float32Array(len); this.R = new Float32Array(len); this.len = len;
    // sends: a hall reverb and a stereo echo, worked out at the end (fx()); and the pump (the sidechain from the kick)
    this.vL = new Float32Array(len); this.vR = new Float32Array(len); this.dL = new Float32Array(len); this.dR = new Float32Array(len);
    this.pump = null;
  }
  // one note: one or more detuned voices through a two-pole low-pass (with an optional filter sweep), attack and release,
  // vibrato, panned, with sends to the reverb and the echo, and the sidechain pump on pads and bass
  tone(t, dur, f, amp, o = {}) {
    const sr = this.sr, s0 = Math.floor(t * sr), att = Math.max(1, (o.att || 0.005) * sr), rel = Math.max(1, (o.rel || 0.08) * sr);
    const n = Math.min(Math.floor((dur + (o.rel || 0.08)) * sr), this.len - s0); if (n <= 0 || s0 < 0) return;
    const hold = Math.floor(dur * sr), pan = o.pan || 0, gl = amp * Math.cos((pan + 1) * Math.PI / 4), gr = amp * Math.sin((pan + 1) * Math.PI / 4);
    const lp0 = o.lp || 4000, fe = o.fenv || 0, fd = o.fdec ? Math.exp(-1 / (o.fdec * sr)) : 1;
    const dec = o.dec ? Math.exp(-1 / (o.dec * sr)) : 1, w = o.wave || 'sin';
    const V = o.voices || (o.det ? 2 : 1), det = o.det || 0, ph = [], inc = [], nrm = 1 / Math.sqrt(V);
    for (let v = 0; v < V; v++) { const d = V === 1 ? 0 : (v / (V - 1) - 0.5) * 2 * det; ph.push((v * 0.37) % 1); inc.push(f * (1 + d) / sr); }
    const vib = o.vib || 0, vibD = (o.vibDelay || 0.15) * sr, vr = TAU * 5.4 / sr;
    const rv = o.rev || 0, dl = o.dly || 0, pump = o.pump && this.pump ? o.pump : 0;
    let z1 = 0, z2 = 0, env = 1, fenv = 1;
    for (let i = 0; i < n; i++) {
      const vb = vib && i > vibD ? 1 + vib * Math.sin(vr * i) * Math.min(1, (i - vibD) / (0.3 * sr)) : 1;
      let x = 0;
      for (let v = 0; v < V; v++) {
        ph[v] += inc[v] * vb; if (ph[v] >= 1) ph[v] -= 1;
        const p1 = ph[v];
        x += w === 'saw' ? 2 * p1 - 1 : w === 'sq' ? (p1 < 0.5 ? 1 : -1) : w === 'tri' ? 1 - 4 * Math.abs(p1 - 0.5) : Math.sin(TAU * p1);
      }
      x *= nrm; const cut = Math.min(sr * 0.45, lp0 * (1 + fe * fenv)), a = 1 - Math.exp(-TAU * cut / sr);
      fenv *= fd;
      z1 += (x - z1) * a; z2 += (z1 - z2) * a;
      let e = env; if (i < att) e *= i / att; if (i > hold) e *= Math.max(0, 1 - (i - hold) / rel);
      env *= dec;
      if (pump) e *= 1 - pump * this.pump[s0 + i];
      const L = z2 * e * gl, R = z2 * e * gr;
      this.L[s0 + i] += L; this.R[s0 + i] += R;
      if (rv) { this.vL[s0 + i] += L * rv; this.vR[s0 + i] += R * rv; }
      if (dl) { this.dL[s0 + i] += L * dl; this.dR[s0 + i] += R * dl; }
    }
  }
  // drums and noises
  kick(t, amp, big = 1) {
    const sr = this.sr, s0 = Math.floor(t * sr), n = Math.min(Math.floor(0.5 * big * sr), this.len - s0); if (n <= 0 || s0 < 0) return;
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const x = i / sr, f = 42 + 120 * Math.exp(-x * 30 / big); ph += f / sr;
      const body = Math.sin(TAU * ph) * Math.exp(-x * 6 / big), click = i < 90 ? (1 - i / 90) * 0.35 * Math.sin(TAU * 2600 * x) : 0;
      const v = Math.tanh((body + click) * 1.6) * amp; this.L[s0 + i] += v; this.R[s0 + i] += v;
    }
  }
  noise(t, dur, amp, o, r) {
    const sr = this.sr, s0 = Math.floor(t * sr), n = Math.min(Math.floor(dur * sr), this.len - s0); if (n <= 0 || s0 < 0) return;
    const pan = o.pan || 0, gl = Math.cos((pan + 1) * Math.PI / 4) * 1.41, gr = Math.sin((pan + 1) * Math.PI / 4) * 1.41, rv = o.rev || 0;
    let lp = 0, prev = 0;
    for (let i = 0; i < n; i++) {
      const x = i / n, cut = o.sweep ? o.lp * Math.pow(o.sweep, x) : o.lp || 8000, a = 1 - Math.exp(-TAU * Math.min(cut, sr * 0.45) / sr);
      const w = r() * 2 - 1; lp += (w - lp) * a; let v = o.hp ? lp - prev : lp; prev = lp;
      const e = o.rise ? Math.pow(x, o.rise) : Math.exp(-i / ((o.dec || 0.05) * sr));
      v *= e * amp; this.L[s0 + i] += v * gl; this.R[s0 + i] += v * gr;
      if (rv) { this.vL[s0 + i] += v * gl * rv; this.vR[s0 + i] += v * gr * rv; }
    }
  }
  snare(t, amp, r, rev = 0.22) { this.noise(t, 0.26, amp * 0.85, { lp: 8000, hp: true, dec: 0.085, rev }, r); this.tone(t, 0.07, 185, amp * 0.6, { dec: 0.045, rel: 0.02, lp: 1200 }); this.tone(t, 0.05, 330, amp * 0.25, { dec: 0.03, rel: 0.02 }); }
  clap(t, amp, r) { for (const d of [0, 0.011, 0.022]) this.noise(t + d, d === 0.022 ? 0.2 : 0.02, amp * 0.7, { lp: 4500, hp: true, dec: d === 0.022 ? 0.06 : 0.008, rev: 0.35 }, r); }
  hat(t, amp, r, pan, open) { this.noise(t, open ? 0.25 : 0.06, amp, { lp: 13000, hp: true, dec: open ? 0.08 : 0.016, pan }, r); }
  taiko(t, amp, r, f = 70) { this.tone(t, 0.6, f, amp, { dec: 0.2, rel: 0.05, lp: 700, rev: 0.35 }); this.noise(t, 0.12, amp * 0.6, { lp: 1000, dec: 0.03, rev: 0.3 }, r); }
  crash(t, amp, r) { this.noise(t, 2.6, amp, { lp: 10000, hp: true, dec: 0.75, rev: 0.4 }, r); }
  // the sends: a hall reverb (Freeverb-style: eight damped combs and four all-passes a side) and a ping-pong echo
  fx(beat, wet = 1) {
    const sr = this.sr, k = sr / 44100, len = this.len;
    const rev = (inp, out, spread) => {
      const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(n => ({ b: new Float32Array(Math.floor((n + spread) * k)), i: 0, st: 0 }));
      const aps = [556, 441, 341, 225].map(n => ({ b: new Float32Array(Math.floor((n + spread) * k)), i: 0 }));
      const fb = 0.85, damp = 0.25;
      for (let s = 0; s < len; s++) {
        const x = inp[s] * 0.03; let y = 0;
        for (const c of combs) { const o = c.b[c.i]; c.st = o * (1 - damp) + c.st * damp; c.b[c.i] = x + c.st * fb; if (++c.i >= c.b.length) c.i = 0; y += o; }
        for (const a of aps) { const o = a.b[a.i]; const v = -y + o; a.b[a.i] = y + o * 0.5; if (++a.i >= a.b.length) a.i = 0; y = v; }
        out[s] += y * wet;
      }
    };
    rev(this.vL, this.L, 0); rev(this.vR, this.R, 23);
    // echo: three-sixteenths, bouncing left and right, darker each time
    const D = Math.floor(beat * 0.75 * sr), bl = new Float32Array(D), br = new Float32Array(D); let i = 0, zl = 0, zr = 0;
    for (let s = 0; s < len; s++) {
      const ol = bl[i], or = br[i];
      zl += (or - zl) * 0.35; zr += (ol - zr) * 0.35;
      bl[i] = this.dL[s] + zl * 0.42; br[i] = this.dR[s] * 0.6 + zr * 0.42;
      this.L[s] += ol * 0.6; this.R[s] += or * 0.6;
      if (++i >= D) i = 0;
    }
  }
}

// each style's lead, pad, bass and pulse (Rellz, 2026-11-15: "make it sound better"): a real tune over the top, wide pads
// that breathe with the kick, a reverb hall and an echo
const VOICE = {
  epic: { lead: { wave: 'saw', voices: 3, det: 0.005, lp: 1500, fenv: 1.6, fdec: 0.18, att: 0.03, vib: 0.006, rev: 0.4, dly: 0.12, amp: 0.05 }, double: true, ost: true, pump: 0.35, four: false },
  ancient: { lead: { wave: 'tri', voices: 1, lp: 3800, att: 0.05, vib: 0.011, rev: 0.5, dly: 0.25, amp: 0.075 }, double: false, ost: true, pump: 0.2, four: false },
  modern: { lead: { wave: 'sq', voices: 2, det: 0.004, lp: 2200, fenv: 2.2, fdec: 0.12, att: 0.01, vib: 0.004, rev: 0.25, dly: 0.3, amp: 0.04 }, double: false, ost: false, pump: 0.55, four: true },
  scifi: { lead: { wave: 'saw', voices: 3, det: 0.009, lp: 2600, fenv: 1.4, fdec: 0.2, att: 0.01, vib: 0.005, rev: 0.3, dly: 0.35, amp: 0.045 }, double: false, ost: false, pump: 0.6, four: true },
  // medieval (Territory Clash): war horns over war drums; a tavern recorder and lute; a court fiddle and harp; a highland chanter on a drone
  crusade: { lead: { wave: 'saw', voices: 2, det: 0.004, lp: 1100, fenv: 0.8, fdec: 0.25, att: 0.06, vib: 0.008, rev: 0.6, dly: 0.1, amp: 0.06 }, double: true, ost: false, pump: 0.15, four: false, medieval: true, drone: 0.022, mode: 'phrygian', bpm: [96, 112] },
  tavern: { lead: { wave: 'tri', voices: 1, lp: 3400, att: 0.025, vib: 0.016, vibDelay: 0.08, rev: 0.35, dly: 0.15, amp: 0.085 }, double: false, ost: false, pump: 0.1, four: false, medieval: true, drone: 0.012, mode: 'dorian', bpm: [138, 156], lute: true },
  court: { lead: { wave: 'saw', voices: 2, det: 0.003, lp: 2300, att: 0.06, vib: 0.012, rev: 0.55, dly: 0.2, amp: 0.05 }, double: false, ost: false, pump: 0.1, four: false, medieval: true, drone: 0.014, mode: 'minor', bpm: [104, 120], lute: true },
  highland: { lead: { wave: 'sq', voices: 2, det: 0.002, lp: 2000, att: 0.015, vib: 0.004, rev: 0.4, dly: 0.12, amp: 0.045 }, double: false, ost: false, pump: 0.1, four: false, medieval: true, drone: 0.028, mode: 'mixolydian', bpm: [112, 128], rolls: true },
};
// a two-bar hook: rhythms on a sixteenth grid ([start, length]) and a melodic walk over the key
const RHYTHMS = [
  [[0, 3], [3, 3], [6, 2], [8, 4], [12, 4], [16, 3], [19, 3], [22, 2], [24, 8]],
  [[0, 2], [2, 2], [4, 4], [8, 2], [10, 2], [12, 4], [16, 6], [22, 2], [24, 4], [28, 4]],
  [[0, 4], [4, 2], [6, 2], [8, 6], [14, 2], [16, 4], [20, 4], [24, 8]],
  [[0, 6], [6, 2], [8, 2], [10, 2], [12, 4], [16, 6], [22, 2], [24, 2], [26, 2], [28, 4]],
];
function motif(r) {
  const rh = RHYTHMS[Math.floor(r() * RHYTHMS.length)];
  let d = 4 + Math.floor(r() * 3); const steps = [-2, -1, -1, 1, 1, 2, 3, -3, 0];
  return rh.map(([st, ln], n) => { if (n) d = Math.max(0, Math.min(10, d + steps[Math.floor(r() * steps.length)])); return { st, ln, d }; });
}
const scaleNote = (root, i, SC = MINOR) => { const o = Math.floor(i / 7), d = ((i % 7) + 7) % 7; return root + 12 * o + SC[d]; };

// the whole soundtrack, as long as the video: { L, R } at the given sample rate
function render(p, { sr, dur, cues }) {
  const len = Math.ceil(sr * (dur + 0.05)), B = new Bus(sr, len), r = p.r, beat = p.beat, bar = beat * 4, TM = p.theme ? THEMES[p.theme] : null;
  let S = STYLES[p.style], VX = VOICE[p.style] || VOICE.epic;
  if (TM) {
    S = Object.assign({}, S, TM.S || {});
    VX = Object.assign({}, VX, TM.lead ? { lead: Object.assign({}, VX.lead, TM.lead) } : {}, 'ost' in TM ? { ost: TM.ost } : {}, 'four' in TM ? { four: TM.four } : {}, 'pump' in TM ? { pump: TM.pump } : {}, { double: false });
  }
  const { start, end } = cues, busy = cues.busy;
  const drop = Math.max(start, Math.ceil((cues.first - 0.05) / bar) * bar);               // first downbeat after the first kill
  const fin = Math.max(drop + bar, end);                                                    // the final blow
  const busyAt = t => busy[Math.max(0, Math.min(busy.length - 1, Math.floor(t * 2)))] || 0;
  const SC = p.scale || MINOR, chordAt = t => chord(p.root + 12, p.prog[Math.floor(t / bar) % 4], SC);
  const nBars = Math.ceil(dur / bar) + 1;
  const hook = motif(r), hookB = hook.map((n, k) => (k >= hook.length - 2 ? { ...n, d: k === hook.length - 1 ? 0 : n.d } : n));   // the answer ends on the root
  // the pump: pads and bass dip under every kick and swell back (the sidechain feel)
  B.pump = new Float32Array(len);
  for (let t = drop; t < fin - 0.3; t += VX.four ? beat : beat * 2) {
    const s0 = Math.floor(t * sr), n = Math.min(Math.floor(beat * sr), len - s0);
    for (let i = 0; i < n; i++) B.pump[s0 + i] = Math.max(B.pump[s0 + i], Math.exp(-i / (0.11 * sr)));
  }

  for (let b = 0; b < nBars; b++) {
    const t0 = b * bar; if (t0 > dur) break;
    const outro = t0 >= fin, ch = outro ? null : chordAt(t0), fb = t0 >= drop ? Math.round((t0 - drop) / bar) : -1, sec = fb >= 0 ? fb % 12 : -1;
    if (!outro) {
      // pad: the chord on wide detuned saws, swelling in under the intro, breathing with the kick in the fight
      const pk = t0 < drop ? 0.55 + 0.35 * (t0 / Math.max(drop, 0.1)) : 0.8;
      const padEnd = Math.min(t0 + bar, fin - 0.3);
      if (padEnd > t0) for (const [k, m] of ch.entries()) B.tone(t0, padEnd - t0, mtof(m), 0.026 * pk, { wave: S.pad, voices: 5, det: 0.012, lp: S.padLp, att: 0.3, rel: 0.5, pan: (k - 1) * 0.6, rev: 0.55, pump: VX.pump });
      // (medieval) the drone: root and fifth held under everything, like a hurdy-gurdy or the pipes' drones
      if (VX.drone && padEnd > t0) for (const [k, m] of [p.root, p.root + 7].entries()) B.tone(t0, padEnd - t0 + 0.05, mtof(m), VX.drone, { wave: 'saw', voices: 3, det: 0.004, lp: 650, att: 0.08, rel: 0.12, pan: k ? 0.25 : -0.25, rev: 0.3 });
      // a low choir-like octave under the pad
      if (padEnd > t0) B.tone(t0, padEnd - t0, mtof(ch[0] - 12), 0.03 * pk, { wave: 'tri', lp: 900, att: 0.4, rel: 0.6, rev: 0.4, pump: VX.pump * 0.6 });
    }
    // the hook: eight bars on, four off (arp and drums carry those), so it never wears out; the second two bars answer the first
    if (fb >= 0 && !outro && sec < 8 && t0 + bar <= fin - 0.3) {
      const half = (fb % 2), notes = (sec % 4 < 2 ? hook : hookB).filter(n => (half ? n.st >= 16 : n.st < 16));
      for (const n of notes) {
        const t = drop + (fb - half) * bar + n.st * beat / 4, l = n.ln * beat / 4; if (t >= fin - 0.3) continue;
        const strong = n.st % 8 === 0, ch2 = chordAt(t);
        let m = scaleNote(p.root + 12, n.d, SC);
        if (strong) { m = ch2.map(c => c + 12 * Math.round((m - c) / 12)).reduce((a, c) => (Math.abs(c - m) < Math.abs(a - m) ? c : a)); }
        const L = VX.lead;
        B.tone(t, l * 0.92, mtof(m), L.amp * (0.85 + 0.3 * busyAt(t)), { ...L, rel: 0.12, pan: 0.05 });
        if (VX.double) B.tone(t, l * 0.92, mtof(m - 12), L.amp * 0.45, { wave: 'saw', voices: 2, det: 0.006, lp: 1100, att: 0.05, rel: 0.15, rev: 0.4, pan: -0.15 });
      }
    }
    for (let q = 0; q < 16; q++) {
      const t = t0 + q * beat / 4; if (t >= dur) break;
      if (t >= fin - 0.26 && t < fin + 0.01) continue;      // a beat of silence before the final blow
      if (t >= fin) continue;                                // (the outro is written below)
      const I = busyAt(t), beatN = q / 4, on = q % 4 === 0;
      if (t < drop) {
        // the intro: a ticking pulse, a low drum on each bar, and a riser and roll into the drop
        if (q === 0) B.taiko(t, 0.25 * S.taiko, r, 62);
        if (q % 2 === 0) B.hat(t, 0.025, r, 0.3);
        if (t > drop - bar) { if (q >= 8 && q % 2 === 0) B.snare(t, 0.06 + 0.12 * (q - 8) / 8, r); }
        continue;
      }
      // the fight
      if (VX.medieval) {
        // frame drums (a deep boom on one and three, a lighter one on the and of two), a tambourine's jingle, a field snare
        if (q === 0 || q === 8) B.taiko(t, 0.3 * S.taiko, r, q ? 66 : 58);
        if (q === 6 || (q === 14 && I > 0.4)) B.taiko(t, 0.16 * S.taiko, r, 92);
        if (on && (beatN === 1 || beatN === 3)) B.snare(t, 0.14 * S.snare, r, 0.35);
        if (VX.rolls && b % 2 === 1 && q >= 12) B.snare(t, 0.05 + 0.02 * (q - 12), r, 0.3);
        if (q % 2 === 0 || I > 0.5) { const a = (q % 4 === 2 ? 0.06 : 0.035) * S.hat * (0.6 + 0.6 * I); B.hat(t, a, r, q % 4 ? 0.35 : -0.35, true); B.hat(t + 0.012, a * 0.6, r, q % 4 ? 0.3 : -0.3, false); }
      } else {
      if (on && (VX.four || beatN === 0 || beatN === 2 || (I > 0.6 && q === 10))) B.kick(t, 0.5 * S.kick);
      if (on && (beatN === 1 || beatN === 3)) { B.snare(t, 0.22 * S.snare, r); if (VX.four) B.clap(t, 0.12, r); }
      if (q % 2 === 0 || I > 0.55) B.hat(t, (q % 4 === 2 ? 0.07 : 0.04) * S.hat * (0.6 + 0.6 * I), r, q % 2 ? -0.3 : 0.3, VX.four && q % 4 === 2);
      }
      if (S.taiko > 0.5 && (q === 6 || q === 14) && I > 0.3) B.taiko(t, 0.18 * S.taiko, r, q === 6 ? 82 : 70);
      if (TM) {
        // desert hand drums: a doum on the beat, teks in between; snow sleigh bells on the eighths (all sixteenths when it's busy or
        // festive) and a glassy bell on each bar; forest: a breath of wind on the bar; war: a second, deeper drum line
        if (TM.darbuka) { if (q === 0 || q === 6 || q === 10) B.taiko(t, 0.09, r, 120); else if (q % 2 === 1 && I > 0.35) B.hat(t, 0.035, r, q % 4 === 1 ? 0.4 : -0.4); }
        if (TM.bells) {
          if (q % 2 === 0 || I > 0.6 || p.festive) for (let j = 0; j < 3; j++) B.tone(t + j * 0.006, 0.05, 5200 + j * 730 + (q % 4) * 90, 0.006 * (0.7 + 0.5 * I), { wave: 'sq', lp: 9000, dec: 0.05, rel: 0.02, pan: q % 4 < 2 ? 0.45 : -0.45, rev: 0.25 });
          if (q === 0) { const ch3 = chordAt(t); B.tone(t, bar * 0.9, mtof(ch3[0] + 36), 0.018, { wave: 'tri', lp: 8000, dec: 0.9, rel: 0.4, rev: 0.6, dly: 0.3 }); }
          if (p.festive && (q === 4 || q === 12)) { const ch3 = chordAt(t); B.tone(t, beat * 0.9, mtof(ch3[q === 4 ? 1 : 2] + 24), 0.016, { wave: 'tri', lp: 7000, dec: 0.5, rel: 0.2, rev: 0.5, pan: 0.2 }); }
        }
        if (TM.breath && q === 0 && (b % 2 === 0)) B.noise(t, bar * 0.8, 0.012, { lp: 1800, sweep: 3, rise: 1.5, hp: true, rev: 0.6 }, r);
        if (TM.warDrums && (q === 3 || q === 11 || (I > 0.5 && q === 7))) B.taiko(t, 0.14, r, 48);
      }
      // bass: the root on the eighths, with a filter pluck, breathing with the kick
      if (q % 2 === 0) { const ch2 = chordAt(t), oct = VX.four && q % 4 === 2 ? 12 : 0; B.tone(t, beat / 2 * 0.85, mtof(ch2[0] - 12 + oct), 0.1, { wave: S.bass, voices: 2, det: 0.003, lp: S.bassLp, fenv: 2.5, fdec: 0.06, dec: 0.4, rel: 0.03, pump: VX.pump * 0.7 }); }
      // strings on the sixteenths (epic, ancient) or the arpeggio (modern, sci-fi), louder when the screen is busy
      const ch2 = chordAt(t);
      if (VX.ost) {
        const m = ch2[[0, 0, 1, 0, 2, 0, 1, 0][q % 8]] + (q % 8 === 4 ? 12 : 0);
        B.tone(t, beat / 4 * 0.55, mtof(m), 0.022 + 0.025 * I, { wave: 'saw', voices: 3, det: 0.006, lp: 2400, dec: 0.09, rel: 0.03, rev: 0.3, pan: q % 2 ? 0.35 : -0.35 });
      }
      if (VX.lute && (q % 2 === 0 || I > 0.5)) {
        // the lute: broken chords, plucked, a little brighter on the off-beats
        const m = ch2[[0, 2, 1, 2][(q >> 1) % 4]] + 12 * (q % 8 < 4 ? 0 : 1);
        B.tone(t, beat / 2 * 0.9, mtof(m), 0.03 + 0.02 * I, { wave: 'tri', voices: 2, det: 0.003, lp: S.arpLp, fenv: 2.4, fdec: 0.03, dec: 0.16, rel: 0.05, pan: q % 4 ? 0.4 : -0.2, rev: 0.25 });
      } else if (!VX.ost || sec >= 8 ? I > 0.15 : I > 0.7) {
        const m = ch2[[0, 1, 2, 1][q % 4]] + 12 * (q % 8 < 4 ? 1 : 2);
        B.tone(t, beat / 4 * 0.8, mtof(m), 0.018 + 0.026 * I, { wave: S.arp === 'pluck' ? 'tri' : S.arp, lp: S.arpLp, fenv: 1.5, fdec: 0.05, dec: S.arp === 'pluck' ? 0.12 : 0.22, rel: 0.03, pan: Math.sin(q) * 0.5, dly: 0.25, rev: 0.15 });
      }
      // a fill on the last beat of every fourth bar, toms rolling into each new section
      if (b % 4 === 3 && q >= 12 && I > 0.2) B.snare(t, 0.08 + 0.04 * (q - 12), r);
      if (sec === 11 && q >= 8 && q % 2 === 0) B.taiko(t, 0.12 + 0.02 * (q - 8), r, 95 - q * 2);
    }
    if (t0 === drop || (t0 > drop && t0 < fin && (sec === 0 || sec === 8))) B.crash(t0, t0 === drop ? 0.13 : 0.07, r);
  }
  // the drop: a sub boom under the crash, and a reversed swell into it
  B.noise(Math.max(0, drop - bar), bar, 0.07, { lp: 600, sweep: 16, rise: 3, hp: true, rev: 0.3 }, r);
  B.kick(drop, 0.6, 2.4);
  // the end: a heartbeat in the last eight seconds, a riser into the silence, then the hit
  for (let t = Math.max(drop, fin - 8); t < fin - 3; t += beat * 2) { B.kick(t, 0.3, 1.4); B.kick(t + 0.18, 0.2, 1.4); }
  const rs = Math.max(drop, fin - 3.2);
  B.noise(rs, fin - 0.26 - rs, 0.16, { lp: 300, sweep: 40, rise: 2.2, hp: true, rev: 0.3 }, r);
  for (let t = fin - 2; t < fin - 0.3; t += Math.max(0.05, (fin - 0.3 - t) * 0.12)) B.snare(t, 0.06 + 0.1 * (1 - (fin - 0.3 - t) / 1.7), r);
  B.kick(fin, 0.95, 2.2); B.crash(fin, 0.25, r); B.taiko(fin, 0.5, r, 55);
  // victory: the fanfare on the lead, in the major key, resolving onto the opening chord so the replay flows on
  const maj = p.root + 12 + 3, fan = [[maj, maj + 4, maj + 7], [maj + 5, maj + 9, maj + 12], [maj + 7, maj + 11, maj + 14], chord(p.root + 12, p.prog[0])];
  const step = Math.max(0.5, Math.min(beat * 2, (dur - fin - 0.2) / 4));
  fan.forEach((c, k) => {
    const t = fin + 0.15 + k * step;
    for (const [j, m] of c.entries()) B.tone(t, step * (k === 3 ? 1.6 : 0.95), mtof(m), 0.032, { wave: S.pad, voices: 4, det: 0.008, lp: 2400, att: 0.03, rel: 0.6, pan: (j - 1) * 0.5, rev: 0.6 });
    B.tone(t, step * 0.9, mtof(c[2] + 12), 0.045, { ...VX.lead, att: 0.02, rel: 0.3 });
    if (k < 3) B.taiko(t, 0.2, r, 66);
  });
  B.fx(beat);
  // level: the same loudness whatever the style (about the old soundtrack's), then soft-limited
  let ss = 0, nn = 0; for (let i = Math.floor(drop * sr); i < Math.min(len, Math.floor(fin * sr)); i += 4) { ss += B.L[i] * B.L[i] + B.R[i] * B.R[i]; nn += 2; }
  const g = nn ? Math.min(4, 0.11 / Math.max(1e-4, Math.sqrt(ss / nn))) : 1;
  for (let i = 0; i < len; i++) { B.L[i] = Math.tanh(B.L[i] * g * 1.2) / 1.2; B.R[i] = Math.tanh(B.R[i] * g * 1.2) / 1.2; }
  return { L: B.L, R: B.R, drop, fin };
}

// the beat punches for the camera: how much to zoom in at this moment of the video (render.js turns it on for the climax)
function pulse(p, t, amt = 0.014) { const ph = (t % p.beat) / p.beat; return amt * Math.exp(-ph * 9); }

// music under the effects: the effects (already limited, -1..1) duck the music, then both go through a soft limiter
// loudness of a stereo signal the way ears judge it: RMS over 0.4 s blocks, ignoring the near-silent ones (dB)
function loud(Lc, Rc, sr, scale = 1) {
  const B = Math.round(0.4 * sr), blocks = [];
  for (let s = 0; s + B <= Lc.length; s += B) { let e = 0; for (let i = s; i < s + B; i++) { const l = (Lc[i] || 0) * scale, r = (Rc[i] || 0) * scale; e += l * l + r * r; } blocks.push(e / (2 * B)); }
  const on = blocks.filter(e => e > 1e-6); if (!on.length) return -120;
  return 10 * Math.log10(on.reduce((a, b) => a + b, 0) / on.length);
}
function mix(sfxL, sfxR, mus, { volume = 0.8, duck = 0.45, sr, levels = null } = {}) {
  const n = sfxL.length, L = new Float32Array(n), R = new Float32Array(n);
  // (levels, Rellz 2026-11-16: "make the sfx and music all same levels in all 3 ... the music should be a bit louder but not
  // louder than sfx") every game, every video: the effects are brought to levels.effects and the music to levels.music
  // (both dB, measured as above), so a busy battle and a quiet one, in any of the games, sound the same; the music stays under
  let fxG = 1;
  if (levels) {
    const fx = loud(sfxL, sfxR, sr), mu = loud(mus.L, mus.R, sr);
    fxG = Math.min(4, Math.max(0.25, Math.pow(10, (levels.effects - fx) / 20)));
    volume = Math.min(8, Math.max(0.05, Math.pow(10, (levels.music - mu) / 20)));
  }
  if (process.env.AUDIO_STATS) console.log(`Levels: effects ${loud(sfxL, sfxR, sr, fxG).toFixed(1)} dB, music ${loud(mus.L, mus.R, sr, volume).toFixed(1)} dB`);
  const att = 1 - Math.exp(-1 / (0.004 * sr)), rel = 1 - Math.exp(-1 / (0.18 * sr));
  let env = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.max(Math.abs(sfxL[i]), Math.abs(sfxR[i])) * fxG;
    env += (a - env) * (a > env ? att : rel);
    const g = volume * (1 - duck * Math.min(1, env * 2));
    L[i] = Math.tanh(sfxL[i] * fxG + (mus.L[i] || 0) * g) * 0.98;
    R[i] = Math.tanh(sfxR[i] * fxG + (mus.R[i] || 0) * g) * 0.98;
  }
  return { L, R };
}

module.exports = { plan, tracker, render, pulse, mix, loud, STYLES, THEMES, MAP_THEME };
