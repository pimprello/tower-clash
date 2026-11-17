// Tower Clash's camera (looks only): calm and close. After the opening (the whole board under the story card) it stays in on the
// action in one long, steady shot that only drifts when the action leaves the middle of the picture, and cuts in closer for the
// big moments (the boss arriving, a tower or wall falling, the base taking a heavy hit). No quick punch-ins, kill-cams or hit-stops.
'use strict';
const RVB = require('./engine.js');
const { AR, clamp } = RVB._;

class TDCam extends RVB.Director {
  // (rules.video.pace) the battle runs slower than the video on purpose; that isn't time owed, so the director doesn't race to catch up
  get debt() { return this.t * (this.g.opts.tdPace || 1) - this.g.t; }
  // (Rellz, 2026-11-16: "fix camera work so it moves less but also zooms in more to where the action is and focus more on that
  // but rarely goes fully zoomed out") where the action is: the densest knot of attackers, weighted towards the ones nearest
  // the base and towards bosses and big troops; the tighter the knot, the closer the camera goes
  front(bk = 0.15) {
    const g = this.g, b = g.base;
    const atk = g.units.filter(u => u.team === 1 && !u.dead && !u.gone && u.x > AR.x - 20 && u.y > AR.y - 20 && u.x < AR.x + AR.w + 20 && u.y < AR.y + AR.h + 20);
    if (!atk.length) return { x: b.x * 0.7 + this.cx * 0.3, y: b.y * 0.7 + this.cy * 0.3, z: 1.5 };
    let best = null, bs = -1;
    for (const u of atk) {
      let s = 0, sx = 0, sy = 0, mx = 0;
      for (const v of atk) {
        const d = Math.hypot(v.x - u.x, v.y - u.y); if (d > 165) continue;
        const w = (v.boss ? 4 : 1) * (v.r > 18 ? 1.8 : 1); s += w; sx += v.x * w; sy += v.y * w; mx = Math.max(mx, d);
      }
      const db = Math.hypot(u.x - b.x, u.y - b.y), sc = s * (1 + 300 / (db + 120));
      if (sc > bs) { bs = sc; best = { x: sx / s, y: sy / s, spread: mx }; }
    }
    const x = best.x * (1 - bk) + b.x * bk, y = best.y * (1 - bk) + b.y * bk;
    return { x, y, z: clamp(1.95 - best.spread / 420, 1.6, 1.9) };
  }
  // (retention, 2026-11-16) the quiet stretches (troops still walking up, nobody killed for a couple of seconds, no boss on the
  // board, the base not being hit, nothing being announced) play faster, up to WARP x, easing in and out so it never jumps;
  // looks only: the battle still moves in fixed ticks
  lull() {
    const g = this.g, T = g.fightT;
    if (g.phase !== 'fight' || T < 4.6 || g.overtime || (this.fin && T > this.fin.t - 8)) return false;
    if (g.bossU && !g.bossU.dead) return false;
    if (this.shot && this.shot.prio > 30 && this.shot.kind !== 'open') return false;
    const kl = g.killLog || [], lk = kl.length ? kl[kl.length - 1] : -9;
    if (g.t - lk < 2.2) return false;
    if (g.base && g.base.hitT !== undefined && g.t - g.base.hitT < 2.5) return false;
    // a notice on screen: only a little faster, so it can still be read (and none at all under the guess prompt)
    let k = 1.5;
    for (const c of g.cards || []) if (g.t > c.t0 - 0.6 && g.t < c.t0 + (c.dur || 1.9) + 0.3) { if (c.kind === 'guess') return false; k = 1.25; }
    return k;
  }
  advance(dt) {
    const g = this.g, want = this.lull() || 1, w0 = this.warp || 1;
    this.warp = w0 + (want - w0) * (1 - Math.exp(-(want > w0 ? 1.8 : 5) * dt));
    if (want === 1 && this.warp < 1.004) this.warp = 1;
    g.warpK = this.warp;
    if (this.warp === 1) return super.advance(dt);
    const k = this.warp; g.frame = d => Object.getPrototypeOf(g).frame.call(g, d * k);
    try { return super.advance(dt); } finally { delete g.frame; }
  }
  direct(dt) {
    const g = this.g;
    // (retention, 2026-11-16) the finale: the battle has been played through once already (the thumbnail's copy), so the camera
    // knows when and where the final blow lands and is there for it in slow motion (the engine's finale, as in Army Clash)
    if (this.fin && g.phase === 'fight') {
      if (this.shot && this.shot.kind === 'finale') { g.camEv = []; return; }
      if (g.fightT >= this.fin.t - (this.fin.how === 'kill' ? 1.3 : 1)) { g.camEv = []; this.start('finale', { prio: 200, dur: 99, z: 2.1, bars: 1, vig: 0.5, spd: 4.5, zspd: 2.6, sfx: 'whoosh' }); return; }
    }
    if (!this.started) {
      // the opening: the whole board while the story card plays (the one time the camera is fully out), then in to the action
      this.started = true; g.camEv = []; this.lastWave = g.waveNow || 0;
      this.start('open', { prio: 60, dur: 4.6, x: this.cx, y: this.cy, z: 1, spd: 1, zspd: 1 });
      return;
    }
    if (g.phase !== 'fight') return super.direct(dt);
    const ev = g.camEv; g.camEv = [];
    const want = (p, f) => { if (!this.shot || p > this.shot.prio) f(); };
    this.lastWave = g.waveNow || 0;
    // the big moments (the boss, a tower falling, the base under heavy attack): in close, not too often
    for (const e of ev) {
      if (e.type !== 'spot' || (e.prio || 0) < 75) continue;
      if (this.t < (this.spotNext || 0) && (e.prio || 0) < 82) continue;
      want(e.prio, () => {
        this.spotNext = this.t + 7;
        this.start('spot', { prio: e.prio, dur: Math.max(3, e.dur || 2.5), x: e.x, y: e.y, follow: e.follow, z: clamp((e.z || 1.6) + 0.25, 1.7, 2.05), spd: 1.3, zspd: 1 });
      });
    }
    // otherwise: one long, steady shot on the action. The framing only moves when the action drifts out of the middle of the
    // picture (a dead zone), and then slowly, so the camera moves less but stays close
    if (!this.shot || this.shot.kind === 'open') {
      if (this.shot && this.t - this.shot.t0 < 4.6) return;
      const f = this.front(); this.start('focus', { prio: 10, dur: 99, x: f.x, y: f.y, z: f.z, spd: 0.55, zspd: 0.35, track: false });
    } else if (this.shot.kind === 'focus') {
      const f = this.front(), sh = this.shot, dz = 150 / sh.z, dx = f.x - sh.x, dy = f.y - sh.y, d = Math.hypot(dx, dy);
      if (d > dz) { const k = Math.min(1, dt * 0.55) * (d - dz) / d; sh.x += dx * k; sh.y += dy * k; }
      sh.z += (f.z - sh.z) * Math.min(1, dt * 0.25);
    }
  }
}
module.exports = { TDCam };
