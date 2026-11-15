// Tower Clash's camera (looks only): calmer than Army Clash's. It holds on the front of the attack for long stretches (about 7 s
// per shot, moving slowly), pulls back to the whole board when a new wave comes in, and only cuts in for the big moments (the
// boss arriving, a tower or wall falling, the base taking a heavy hit). No quick punch-ins, kill-cams or hit-stops.
'use strict';
const RVB = require('./engine.js');
const { AR, clamp } = RVB._;

class TDCam extends RVB.Director {
  // (rules.video.pace) the battle runs slower than the video on purpose; that isn't time owed, so the director doesn't race to catch up
  get debt() { return this.t * (this.g.opts.tdPace || 1) - this.g.t; }
  // the front of the attack: the attackers closest to the base, and the base itself pulls the framing a little
  front() {
    const g = this.g, b = g.base;
    const atk = g.units.filter(u => u.team === 1 && !u.dead && !u.gone && u.x > AR.x - 20 && u.y > AR.y - 20);
    if (!atk.length) return { x: this.cx, y: this.cy, z: 1 };
    atk.sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y));
    const lead = atk.slice(0, 6);
    let x = lead.reduce((s, u) => s + u.x, 0) / lead.length, y = lead.reduce((s, u) => s + u.y, 0) / lead.length;
    x = x * 0.8 + b.x * 0.2; y = y * 0.8 + b.y * 0.2;
    return { x, y, z: 1.35 };
  }
  direct(dt) {
    const g = this.g;
    if (!this.started) {
      // the opening: the whole board while the story card plays
      this.started = true; g.camEv = []; this.lastWave = g.waveNow || 0;
      this.start('open', { prio: 60, dur: 8.6, x: this.cx, y: this.cy, z: 1, spd: 1, zspd: 1 });
      return;
    }
    if (g.phase !== 'fight') return super.direct(dt);
    const ev = g.camEv; g.camEv = [];
    const want = (p, f) => { if (!this.shot || p > this.shot.prio) f(); };
    // a new wave: pull back to the whole board so it can be seen coming in
    if ((g.waveNow || 0) !== this.lastWave) {
      this.lastWave = g.waveNow || 0;
      if (this.lastWave > 1) want(30, () => this.start('wave', { prio: 30, dur: 3, x: this.cx, y: this.cy, z: 1, spd: 1.3, zspd: 1.2 }));
    }
    // the big moments only (the boss, a tower falling, the base under heavy attack)
    for (const e of ev) {
      if (e.type !== 'spot' || (e.prio || 0) < 75) continue;
      if (this.t < (this.spotNext || 0) && (e.prio || 0) < 82) continue;
      want(e.prio, () => {
        this.spotNext = this.t + 6;
        this.start('spot', { prio: e.prio, dur: Math.max(3, e.dur || 2.5), x: e.x, y: e.y, follow: e.follow, z: clamp(e.z || 1.6, 1.3, 1.65), spd: 1.8, zspd: 1.4 });
      });
    }
    // otherwise: hold on the front of the attack, a long, slow shot at a time
    if (!this.shot) { const f = this.front(); this.start('focus', { prio: 10, dur: 7, x: f.x, y: f.y, z: f.z, spd: 0.6, zspd: 0.5, track: false }); }
    else if (this.shot.kind === 'focus' && this.t - this.shot.t0 > 3.5) {
      // drift with the front, slowly, so the action never leaves the picture
      const f = this.front(); this.shot.x += (f.x - this.shot.x) * Math.min(1, dt * 0.4); this.shot.y += (f.y - this.shot.y) * Math.min(1, dt * 0.4);
    }
  }
}
module.exports = { TDCam };
