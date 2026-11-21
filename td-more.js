// Tower Clash: deeper battles (rules.more; Rellz, 2026-11-17: "make updates less based on ui", twenty gameplay updates).
//
//   BOSSES       every boss has a trait: a HEALER (heals the troops round it), a SPLITTER (breaks into two when it falls) or
//                a RAGER (at half health it roars: troops near it rage, and three elite knights march in)
//   ATTACKERS    SHIELD-BEARERS block shots from the front until the shield breaks; TUNNELLERS dig under a stretch of the path
//                (no tower can see them); a SKY RAID flies straight at the base in a flock; MINE-LAYERS drop mines behind them
//                that blow up the defenders' soldiers; ENGINEERS disarm the crystal's traps and patch up machines and titans;
//                when a troop is blocked by a wall for long enough, it takes a SIDE ROUTE round it
//   WAVES        each wave has an ELEMENT (fire, ice, storm), and towers of that element hit it harder; some waves have a
//                MODIFIER: SWIFT, ARMOURED, a RAIN OF FIRE on the towers, or a BLOOD PACT (a fallen troop heals the next one)
//   TOWERS       TESLA COIL (arcs that grow stronger with every jump, and an overcharge nova); RAILGUN (charges, then one shot
//                through everything in a line); MASON'S LODGE (repairs the base's gate and the towers); towers standing in a
//                straight row share power (LINE SYNERGY); the defenders may SACRIFICE a weak tower to double a neighbour
//   THE BOARD    a WHIRLPOOL that drags troops back down the path; a SLEEP MIST where troops that linger fall asleep
//   THE PURSE    unspent gold earns interest every wave (GOLD BANK), and a full bank pays for a GOLDEN VOLLEY
// Its own dice (MOR). Drawing never changes the battle. rules.more.on false: old seeds play as before.
'use strict';
const RVB = require('./engine.js');
const D = require('./td-data.js');
const { TD, laneAt, distToLane, walkSpeed, PATH_W, DEF, ATK } = require('./td.js');
const E = RVB._;
const { COL, TAU, UNIT, clamp, rgba, isTitan, rng } = E;
const RULES = (() => { try { return require('./rules.json'); } catch (e) { return {}; } })();
const INK = COL.ink || '#0B0F1A';
const ELC = { fire: '#FF8A1F', ice: '#7DD3FC', zap: '#C4B5FD' }, ELN = { fire: 'FIRE', ice: 'ICE', zap: 'STORM' };
const elOf = tw => { const e = tw.el || tw.def.el; return e === 'frost' ? 'ice' : e === 'storm' ? 'zap' : e; };

// ----- set-up, after the waves are planned -----
const planWaves0 = TD.prototype.planWaves;
TD.prototype.planWaves = function () {
  planWaves0.call(this);
  this.MORE = (this.opts.more ?? (RULES.more || {}).on) !== false;
  if (this.MORE) this.moreSetup();
};
const MORE = {
  moreSetup() {
    const M0 = this.MOR = rng(((this.seed >>> 0) ^ 0x40FE11) >>> 0), R = () => M0.next(), plan = this.plan;
    const normal = plan.filter(w => !w.boss);
    // waves: an element each (in turn from a dice start), a modifier on some
    const e0 = Math.floor(R() * 3);
    normal.forEach((w, i) => { w.elem = ['fire', 'ice', 'zap'][(e0 + i) % 3]; if (i > 0 && R() < 0.45) w.mod = ['swift', 'armoured', 'firerain', 'blood'][Math.floor(R() * 4)]; });
    // a sky raid instead of one middle wave (a flock that flies straight at the base)
    const mid = normal.filter(w => w.i >= 2 && !w.air && !w.native);
    if (mid.length && R() < 0.45) { const w = mid[Math.floor(R() * mid.length)], K = D.WAVE_KINDS.skyraid, pool = K.pool.filter(k => UNIT[k]);
      const n = 8 + Math.floor(R() * 5), add = n - w.list.length; w.kind = 'skyraid'; w.name = K.name; w.air = true; w.raid = true; w.gap = K.gap; w.list = Array.from({ length: n }, () => pool[Math.floor(R() * pool.length)]); w.mod = null;
      this.start[ATK] += add; this.reserve[ATK] += add; }
    // shield-bearers in the infantry and knights; tunnellers in the small ones; mine-layers and engineers walk with a wave each
    for (const w of normal) {
      if (w.raid) continue;
      if ((w.kind === 'infantry' || w.kind === 'knights') && UNIT.shieldbearer) w.list = w.list.map((k, i) => (i % 4 === 1 ? 'shieldbearer' : k));
      if (w.kind === 'swarm' || w.kind === 'sappers' || w.kind === 'infantry') w.dig = true;
    }
    const ground = normal.filter(w => !w.air && !w.raid && w.kind !== 'titans');
    if (ground.length) { const w = ground[Math.floor(R() * ground.length)]; w.list.splice(Math.floor(w.list.length / 2), 0, 'dwarf', 'dwarf'); w.mines = true; this.start[ATK] += 2; this.reserve[ATK] += 2; }
    if (ground.length > 1) { const w = ground[(Math.floor(R() * ground.length) + 1) % ground.length]; w.list.splice(1, 0, 'engineer'); if (w.list.length > 6) w.list.splice(5, 0, 'engineer'); const n = w.list.filter(k => k === 'engineer').length; w.engineers = true; this.start[ATK] += n; this.reserve[ATK] += n; }
    // the boss's trait
    this.bossTrait = ['healer', 'splitter', 'rager'][Math.floor(R() * 3)];
    // the board: two whirlpools and two sleep mists, at moments the dice pick (placed where the troops are thickest)
    this.hazards = [{ kind: 'whirl', at: 15 + R() * 6 }, { kind: 'mist', at: 23 + R() * 6 }, { kind: 'whirl', at: 33 + R() * 6 }, { kind: 'mist', at: 41 + R() * 6 }].map(h => Object.assign(h, { done: false }));
    this.whirls = []; this.mists = []; this.mines = []; this.lines = []; this.rains = []; this.wisps = []; this.beams2 = [];
    this.sacAt = 30 + R() * 10; this.bankWave = 0; this.volleys = 0;
  },
  // a troop as it arrives
  moreSpawn(u, w) {
    if (!w) return;
    const R = () => this.MOR.next();
    u.wave = w; u.welem = w.elem || null; u.wmod = w.mod || null;
    if (w.mod === 'swift') u.vk *= 1.3;
    if (w.raid && u.fly) { u.vk *= 1.35; const k = w.k % 5, lat = (k - 2) * 30; u.x += lat; u.fly.x0 += lat; const b = this.base; u.fly.len = Math.hypot(b.x - u.fly.x0, b.y - u.fly.y0); }
    if (u.type === 'shieldbearer') { u.shield = 30 * this.hpK; u.shieldMax = u.shield; }
    if (w.dig && !u.boss && !u.flying && (u.size === 'small' || u.size === 'mid') && R() < 0.3) { const L = this.lanes[u.lane]; const s0 = L.len * (0.22 + R() * 0.2); u.dig = { s0, s1: Math.min(L.len - 160, s0 + 260 + R() * 120) }; }
    if (w.mines && u.type === 'dwarf') { u.mineLayer = true; u.mineAt = this.fightT + 1.5; }
    if (w.engineers && u.type === 'engineer') u.engineer = true;
  },
  // ----- damage: elements, armour, shields, synergy, sacrifice, the golden volley -----
  moreDamage(u, dmg, from) {
    if (dmg <= 0) return dmg;
    const T = this.fightT;
    if (u.team === ATK) {
      const tw = from && from.tw ? from.tw : from && from.owner && from.owner.tw ? from.owner.tw : null;
      if (tw) {
        if (u.welem && elOf(tw) === u.welem) dmg *= 1.3;
        if (tw.lineT > T) dmg *= 1.15;
        if (tw.sacK) dmg *= tw.sacK;
        if (tw.volleyT > T) dmg *= 2.5;
      }
      if (u.wmod === 'armoured' && from) dmg *= 0.7;
      if (u.shield > 0 && from) {
        let d = Math.atan2(from.y - u.y, from.x - u.x) - (u.face || 0); d = Math.atan2(Math.sin(d), Math.cos(d));
        if (Math.abs(d) < 1.6) {
          u.shield -= dmg * 0.8; u.shieldHit = this.t; dmg *= 0.2;
          if (u.shield <= 0) { u.shield = 0; u.shieldBroke = this.t; this.callout(u, 'SHIELD BROKEN!', '#E2E8F0'); this.snd('clang', { pan: this.pan(u.x), gain: 0.6 }); this.burst(u.x, u.y, '#CBD5E1', 10, 240, 0.45, 5); }
        }
      }
      if (u.under) dmg = 0;
    }
    return dmg;
  },
  moreKill(u, from) {
    if (u.team !== ATK) return;
    const T = this.fightT;
    // the blood pact: the nearest troop of the same wave drinks its strength
    if (u.wmod === 'blood') {
      let best = null, bd = 220;
      for (const o of this.near(u.x, u.y, 220)) if (o !== u && o.team === ATK && !o.dead && !o.gone && o.wave === u.wave) { const d = Math.hypot(o.x - u.x, o.y - u.y); if (d < bd) { bd = d; best = o; } }
      if (best) { best.hp = Math.min(best.max * 1.25, best.hp + u.max * 0.35); best.max = Math.max(best.max, best.hp); best.healFlash = 1; this.wisps.push({ x0: u.x, y0: u.y, o: best, t0: this.t }); }
    }
    // the splitter: the boss breaks into two smaller ones
    if (u.boss && u === this.bossU && this.bossTrait === 'splitter' && !u.splitDone) {
      u.splitDone = true;
      for (const sd of [-1, 1]) {
        const o = this.spawnAttacker(this.bossType, u.lane, null); this.reserve[ATK]++; this.start[ATK]++;
        o.s = Math.max(0, (u.s || 0) - 8); o.x = u.x + sd * 18; o.y = u.y; o.lat = sd * 10; o.r = u.r * 0.72; o.max = o.hp = u.max * 0.3; o.size = 'giant'; o.split = sd; o.splitT0 = this.t; o.vk = (u.vk || 60) * 1.2; o.face = u.face;
        if (u.fly) { o.fly = u.fly; o.s = u.s; }
      }
      this.card({ kind: 'boss', text: `${u.bossName || 'THE BOSS'} SPLITS IN TWO!`, col: '#FF5A5A', big: true });
      this.snd('roar', { gain: 0.9 }); this.shake(12);
      if (this.shRings) this.shRings.push({ x: u.x, y: u.y, r0: 10, r1: 150, t0: this.t, life: 0.6, col: '#FCA5A5', w: 7 });
      if (this.camEv) this.camEv.push({ type: 'spot', x: u.x, y: u.y, prio: 85, dur: 1.8, z: 2, ts: 0.4, slowFor: 0.7 });
    }
  },
  // ----- new towers' shots -----
  moreShot(u, tgt, tw, dmg, Df) {
    const T = this.fightT, pan = this.pan(u.x);
    switch (Df.shot) {
      case 'tesla': {
        // arcs to three troops, each jump harder than the last, each stunned for a moment; every 8 hits it overcharges
        let x0 = u.x, y0 = u.y - u.r * 0.8, cur = tgt; const hit = new Set();
        for (let i = 0; i < 3 + (tw.tier >= 4 ? 1 : 0) && cur; i++) {
          hit.add(cur.uid); this.bolts.push({ x0, y0, x1: cur.x, y1: cur.y, t0: this.t, col: i ? '#A5F3FC' : '#E0F2FE' });
          this._shXk = 'lightning'; this.damage(cur, dmg * (1 + 0.25 * i) * (cur.flying ? 1.2 : 1), u); this._shXk = null;
          if (!cur.dead && !cur.boss) cur.stunT = Math.max(cur.stunT || 0, T + 0.25);
          tw.over = (tw.over || 0) + 1; x0 = cur.x; y0 = cur.y;
          let nx = null, bd = 150 * 150; for (const o of this.units) if (o.team === ATK && !o.dead && !o.under && !hit.has(o.uid)) { const d = (o.x - x0) ** 2 + (o.y - y0) ** 2; if (d < bd) { bd = d; nx = o; } } cur = nx;
        }
        if (tw.over >= 8) {
          tw.over = 0; tw.novaT = this.t;
          for (const o of this.near(u.x, u.y, 170)) if (o.team === ATK && !o.dead && !o.under) { this.damage(o, dmg * 1.5, u); if (!o.dead && !o.boss) o.stunT = Math.max(o.stunT || 0, T + 0.6); }
          if (this.shRings) this.shRings.push({ x: u.x, y: u.y, r0: 20, r1: 170, t0: this.t, life: 0.45, col: '#A5F3FC', w: 6 });
          this.snd('thunder', { pan, gain: 0.6 }); this.callout(u, 'OVERCHARGE!', '#A5F3FC');
        }
        return true;
      }
      case 'rail': {
        // charging: a laser sight locks on, then one shot through everything in the line
        if (!tw.charge) { tw.charge = { tgt, T1: T + 1.5, t0: this.t, dmg }; this.snd('phase', { pan, gain: 0.35, quiet: true }); }
        return true;
      }
      case 'mason': {
        // a thrown hammer (the lodge's real work is the repairs)
        this.fire(u, tgt, { dmg, speed: 700 });
        return true;
      }
    }
    return false;
  },
  railFire(tw) {
    const C = tw.charge, u = tw.u; tw.charge = null;
    const tg = C.tgt && !C.tgt.dead && !C.tgt.gone ? C.tgt : null; if (!tg && !this.units.some(o => o.team === ATK && !o.dead)) return;
    const ax = tg ? tg.x : u.x + Math.cos(u.face) * 300, ay = tg ? tg.y : u.y + Math.sin(u.face) * 300;
    const a = Math.atan2(ay - u.y, ax - u.x), dx = Math.cos(a), dy = Math.sin(a), L = 1400;
    let n = 0;
    for (const o of this.units) {
      if (o.team !== ATK || o.dead || o.gone || o.under) continue;
      const rx = o.x - u.x, ry = o.y - u.y, along = rx * dx + ry * dy, lat = Math.abs(-rx * dy + ry * dx);
      if (along < 0 || along > L || lat > 16 + o.r) continue;
      this._shXk = 'laser'; this.damage(o, C.dmg * (n ? 0.7 : 1), u); this._shXk = null; n++;
    }
    this.beams2.push({ kind: 'rail', x0: u.x, y0: u.y - 20, x1: u.x + dx * L, y1: u.y - 20 + dy * L, t0: this.t });
    this.snd('snipe', { pan: this.pan(u.x), gain: 0.9 }); this.shake(5);
    if (n >= 3) this.callout(u, `RAILGUN ×${n}!`, '#F472B6');
  },
  // ----- one tick -----
  moreTick(h) {
    const T = this.fightT, t = this.t;
    // the railguns' charges
    for (const tw of this.towers) if (tw.charge && !tw.dead && T >= tw.charge.T1) this.railFire(tw);
    // tunnellers go under and come up again
    for (const u of this.units) {
      if (u.team !== ATK || u.dead) continue;
      if (u.dig) {
        const under = u.s > u.dig.s0 && u.s < u.dig.s1;
        if (under && !u.under) { u.under = true; u.digT = t; this.burst(u.x, u.y, '#8A6A49', 8, 160, 0.4, 5, 80); this.snd('chop', { pan: this.pan(u.x), quiet: true }); }
        if (!under && u.under) { u.under = false; u.upT = t; u.dig = null; this.burst(u.x, u.y, '#8A6A49', 12, 220, 0.5, 6, 80); this.callout(u, 'SURPRISE!', '#D6A36A'); this.snd('thud', { pan: this.pan(u.x), gain: 0.5 }); }
        u.fade = u.under ? Math.max(0, 1 - (t - u.digT) / 0.25) : undefined;
      } else if (u.upT !== undefined) { const k = (t - u.upT) / 0.25; u.fade = k < 1 ? k : undefined; if (k >= 1) u.upT = undefined; }
      // mine-layers drop a mine behind them every few seconds
      if (u.mineLayer && T >= u.mineAt && !u.under && !u.fly) { u.mineAt = T + 2.6; this.mines.push({ x: u.x, y: u.y, T0: T, armed: T + 0.6, end: T + 16, t0: t }); }
      // engineers disarm traps near them and patch up machines and titans
      if (u.engineer && T >= (u.engAt || 0)) {
        u.engAt = T + 0.5;
        if (this.traps) for (const tr of this.traps) if (!tr.done && !tr.used && Math.hypot(tr.x - u.x, tr.y - u.y) < 70) { tr.done = true; tr.tEnd = t; tr.disarmed = t; this.callout(u, 'DISARMED!', '#FBBF24'); this.snd('clang', { pan: this.pan(u.x), quiet: true }); u.fixT = t; }
        for (const o of this.near(u.x, u.y, 110)) if (o.team === ATK && !o.dead && o !== u && (isTitan(o.type) || o.boss || /robot|mech|juggernaut|golem|tank/.test(o.type)) && o.hp < o.max) { o.hp = Math.min(o.max, o.hp + o.max * 0.025); o.healFlash = 0.6; u.fixT = t; }
      }
    }
    // mines: a defender (a soldier, a skeleton, a summoned creature) that steps on one sets it off
    for (const m of this.mines) {
      if (m.done) continue;
      if (T > m.end) { m.done = true; continue; }
      if (T < m.armed) continue;
      const o = this.near(m.x, m.y, 40).find(o => o.team === DEF && !o.tower && !o.dead && !o.flying && Math.hypot(o.x - m.x, o.y - m.y) < o.r + 12);
      if (o) { m.done = true; m.boomT = t; this.blast({ x: m.x, y: m.y, r: 50, dmg: 9, team: ATK, kind: 'bomb' }); this.callout(o, 'MINE!', '#FB923C'); }
    }
    if (this.mines.length > 30) this.mines = this.mines.filter(m => !m.done || t - (m.boomT || 0) < 1);
    // the boss's trait
    const b = this.bossU;
    if (b && !b.dead) {
      if (this.bossTrait === 'healer' && T >= (this.healAt || 0)) {
        this.healAt = T + 0.5; let n = 0;
        for (const o of this.near(b.x, b.y, 170)) if (o.team === ATK && !o.dead && o.hp < o.max) { o.hp = Math.min(o.max, o.hp + o.max * (o === b ? 0.004 : 0.03)); if (o !== b) { o.healFlash = 0.7; n++; } }
        if (n && T >= (this.healSay || 0)) { this.healSay = T + 6; this.snd('heal', { pan: this.pan(b.x), quiet: true }); }
        if (!this.healSaid && T - (this.bossAt0 || T) > 1.5) { this.healSaid = true; this.callout(b, 'IT HEALS ITS ARMY!', '#86EFAC'); }
      }
      if (this.bossTrait === 'rager' && !this.raged && b.hp < b.max * 0.62) {
        this.raged = T;
        for (const o of this.near(b.x, b.y, 260)) if (o.team === ATK && !o.dead) o.rageT = Math.max(o.rageT || 0, T + 5);
        for (let i = 0; i < 3; i++) { const o = this.spawnAttacker(UNIT.knight ? 'knight' : 'soldier', i % this.lanes.length, null); this.reserve[ATK]++; this.start[ATK]++; o.elite = true; o.max *= 1.6; o.hp = o.max; o.s = i * 14; }
        this.card({ kind: 'boss', text: `${b.bossName || 'THE BOSS'} · RAGE!`, sub: 'ELITE KNIGHTS ANSWER THE CALL', col: '#FF5A5A', big: true });
        this.snd('roar', { gain: 1 }); this.shake(14);
        if (this.shRings) this.shRings.push({ x: b.x, y: b.y, r0: b.r, r1: 260, t0: this.t, life: 0.7, col: '#F87171', w: 8 });
        if (this.camEv) this.camEv.push({ type: 'spot', follow: b, prio: 84, dur: 1.8, z: 2, ts: 0.4, slowFor: 0.8 });
      }
    }
    // the board's hazards
    for (const H of this.hazards) {
      if (H.done || T < H.at) continue;
      H.done = true;
      // where the troops are thickest on the path
      let best = null, bv = 0;
      for (const u of this.units) { if (u.team !== ATK || u.dead || u.flying || u.under || u.lane === undefined) continue; let v = 0; for (const o of this.near(u.x, u.y, 110)) if (o.team === ATK && !o.dead && !o.flying) v++; if (v > bv) { bv = v; best = u; } }
      if (!best || bv < 3) continue;
      const L = this.lanes[best.lane], p = laneAt(L, Math.min(L.len - 40, best.s + 30));
      if (H.kind === 'whirl') { this.whirls.push({ x: p.x, y: p.y, lane: best.lane, s: best.s + 30, T0: T, T1: T + 3, t0: t }); this.snd('splash', { pan: this.pan(p.x), gain: 0.7 }); this.callout(best, 'WHIRLPOOL!', '#38BDF8'); }
      else { this.mists.push({ x: p.x, y: p.y, T0: T, T1: T + 4.5, t0: t }); this.snd('phase', { pan: this.pan(p.x), gain: 0.5 }); this.callout(best, 'SLEEP MIST', '#C4B5FD'); }
    }
    for (const W of this.whirls) {
      if (T > W.T1) continue;
      const L = this.lanes[W.lane];
      for (const o of this.near(W.x, W.y, 80)) {
        if (o.team !== ATK || o.dead || o.flying || o.under || o.lane !== W.lane || o.atBase) continue;
        const k = o.boss || isTitan(o.type) ? 0.25 : 1, back = 70 * k * h, p = laneAt(L, Math.max(0, o.s - back));
        o.s = Math.max(0, o.s - back); o.x += (p.x - o.x) * 0.5; o.y += (p.y - o.y) * 0.5; o.face += 6 * h * k;
      }
    }
    for (const M of this.mists) {
      if (T > M.T1) continue;
      for (const o of this.near(M.x, M.y, 80)) {
        if (o.team !== ATK || o.dead || o.flying || o.under) continue;
        if (Math.hypot(o.x - M.x, o.y - M.y) > 78) continue;
        this.slowDown(o, 0.5, 0.2);
        o.mistIn = (o.mistIn || 0) + h;
        if (o.mistIn > 1 && !o.boss && !isTitan(o.type) && !(o.sleepT > T)) { o.sleepT = T + 2.2; o.stunT = Math.max(o.stunT || 0, o.sleepT); o.sleep0 = this.t; }
      }
    }
    // the rain of fire: while a wave with it is coming, burning arrows fall on the towers beside its path
    for (const w of this.plan) if (w.mod === 'firerain' && w.started && T < (w.at + 9) && T >= (w.rainAt || 0)) {
      w.rainAt = T + 1.1;
      const near = this.towers.filter(tw => !tw.dead && distToLane(this.lanes[w.lane], tw.x, tw.y).d < 190);
      if (near.length) { const tw = near[Math.floor(this.MOR.next() * near.length)]; this.rains.push({ x: tw.x, y: tw.y, T1: T + 0.5, t0: t, tw }); }
    }
    for (const r of this.rains) if (!r.done && T >= r.T1) { r.done = true; r.hitT = t; if (!r.tw.dead) { this.damage(r.tw.u, 3.5, null); this.burst(r.x, r.y, '#FF8A1F', 8, 200, 0.4, 5, -30); this.snd('flame', { pan: this.pan(r.x), quiet: true }); } }
    if (this.rains.length > 24) this.rains = this.rains.filter(r => !r.done || t - r.hitT < 1);
    // the mason's lodge: the gate mended, the towers patched
    for (const tw of this.towers) if (!tw.dead && tw.kind === 'mason' && T >= (tw.mendAt || 0)) {
      tw.mendAt = T + 2.5;
      const B = this.base; let did = false;
      if (B.hp > 0 && B.hp < B.max) { B.hp = Math.min(B.max, B.hp + 0.8 + tw.tier * 0.3); did = true; tw.mendB = t; }
      for (const o of this.towers) if (!o.dead && o !== tw && o.u.hp < o.u.max && Math.hypot(o.x - tw.x, o.y - tw.y) < 260) { o.u.hp = Math.min(o.u.max, o.u.hp + o.u.max * 0.06); o.mendT = t; did = true; }
      if (did) this.snd('chop', { pan: this.pan(tw.x), quiet: true });
    }
    // line synergy: three towers standing in a straight row share power (checked once a second)
    if (T >= (this.lineAt || 0)) {
      this.lineAt = T + 1; this.lines = [];
      const live = this.towers.filter(tw => !tw.dead);
      for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) for (let k = j + 1; k < live.length; k++) {
        const P = [live[i], live[j], live[k]].sort((a, b) => a.x - b.x || a.y - b.y), [a, m, c] = P, L = Math.hypot(c.x - a.x, c.y - a.y);
        if (L > 520 || Math.hypot(m.x - a.x, m.y - a.y) > 280 || Math.hypot(c.x - m.x, c.y - m.y) > 280) continue;
        const off = Math.abs((c.x - a.x) * (a.y - m.y) - (a.x - m.x) * (c.y - a.y)) / (L || 1);
        if (off > 18) continue;
        for (const tw of P) tw.lineT = T + 1.1;
        this.lines.push([a, c]);
        if (!this.lineSaid) { this.lineSaid = true; this.callout(m.u, 'LINE SYNERGY!', '#FDE68A'); }
      }
    }
    // the sacrifice: short of gold, the defenders give up their weakest tower to double a neighbour's power (once)
    if (!this.sacDone && T >= this.sacAt && this.mode !== 'laststand') {
      const live = this.towers.filter(tw => !tw.dead);
      if (live.length >= 5 && this.gold < 70 && this.MOR.next() < 0.6) {
        this.sacDone = true;
        const weak = live.filter(tw => tw.tier <= 2 && tw.kind !== this.towerSet[0]).sort((a, b) => a.kills - b.kills || a.u.uid - b.u.uid)[0];
        const near = weak && live.filter(tw => tw !== weak).sort((a, b) => Math.hypot(a.x - weak.x, a.y - weak.y) - Math.hypot(b.x - weak.x, b.y - weak.y)).slice(0, 2).sort((a, b) => b.kills - a.kills)[0];
        if (weak && near) {
          weak.dead = true; weak.sold = true; weak.deadT = t; weak.u.dead = true; weak.u.gone = true; this.alive[DEF]--;
          weak.spot.tower = null; weak.spot.wreck = false;
          near.sacK = (near.sacK || 1) * 2; near.sacT = t;
          this.beams2.push({ kind: 'sac', x0: weak.x, y0: weak.y - 20, x1: near.x, y1: near.y - 20, t0: t });
          this.card({ kind: 'up', text: `SACRIFICE · ${weak.def.name}`, sub: `${near.def.name} · DOUBLE DAMAGE`, tk: near.kind, col: '#F472B6' });
          this.snd('evolve', { pan: this.pan(near.x) }); this.burst(weak.x, weak.y, '#F9A8D4', 24, 300, 0.7, 7, -60);
          if (this.camEv) this.camEv.push({ type: 'spot', x: near.x, y: near.y, prio: 60, dur: 1.6, z: 1.8 });
        }
      } else if (live.length >= 5 && this.gold < 70) this.sacDone = true; else if (T > this.sacAt + 12) this.sacDone = true;
    }
    // the gold bank: interest at every new wave; a full bank buys a golden volley for the best tower
    if (this.waveNow > this.bankWave) {
      this.bankWave = this.waveNow;
      const i = Math.min(30, Math.floor(this.gold * 0.1)); if (i > 0) { this.gold += i; this.bankT = t; this.bankI = i; }
      if (this.gold >= 160 && this.volleys < 2) {
        const live = this.towers.filter(tw => !tw.dead), best = live.sort((a, b) => b.kills - a.kills || b.tier - a.tier)[0];
        if (best) { this.gold -= 100; this.volleys++; best.volleyT = T + 5; best.volley0 = t; this.callout(best.u, 'GOLDEN VOLLEY!', '#FFD23F'); this.snd('coin', { pan: this.pan(best.x) }); this.snd('powerup', { pan: this.pan(best.x), gain: 0.6 }); }
      }
    }
  },
  // the side route: a troop held up at a wall for long enough goes round it, off the path
  moreDetour(u, h) {
    if (u.team !== ATK || u.flying || u.boss || u.fly || u.atBase) return false;
    const T = this.fightT;
    if (u.detour) {
      const D0 = u.detour, wp = D0.pts[D0.k], dx = wp.x - u.x, dy = wp.y - u.y, d = Math.hypot(dx, dy), v = this.speedOf(u) * 0.7;
      if (this.held(u)) return true;
      if (d < 8) { D0.k++; if (D0.k >= D0.pts.length) { u.s = D0.s1; u.detour = null; u.lat = 0; } return true; }
      this.steerTo(u, wp.x, wp.y, v, h);
      return true;
    }
    if (isTitan(u.type) || u.size === 'giant') return false;
    let wall = null;
    for (const w of this.walls) if (!w.dead && w.lane === u.lane && u.s < w.s && w.s - u.s < u.r + 18) { wall = w; break; }
    if (!wall) { u.wallWait = 0; return false; }
    u.wallWait = (u.wallWait || 0) + h;
    if (u.wallWait < 1.4 || wall.hp < wall.max * 0.35 || (wall.detours || 0) >= 6) return false;
    wall.detours = (wall.detours || 0) + 1;
    const L = this.lanes[u.lane], side = (u.lat || 0) >= 0 ? 1 : -1, off = PATH_W * 1.25;
    const p0 = laneAt(L, wall.s - 12), p1 = laneAt(L, wall.s + 46), p2 = laneAt(L, Math.min(L.len, wall.s + 80));
    u.detour = { pts: [{ x: p0.x + p0.nx * off * side, y: p0.y + p0.ny * off * side }, { x: p1.x + p1.nx * off * side, y: p1.y + p1.ny * off * side }, { x: p2.x, y: p2.y }], k: 0, s1: wall.s + 80, t0: this.t };
    if (!wall.routeSaid) { wall.routeSaid = true; this.callout(u, 'SIDE ROUTE!', '#FCD34D'); }
    return true;
  },
};
Object.assign(TD.prototype, MORE);

// ----- wrapping the game's own steps -----
const spawn0 = TD.prototype.spawnAttacker;
TD.prototype.spawnAttacker = function (type, lane, w) { const u = spawn0.call(this, type, lane, w); if (u && this.MORE) this.moreSpawn(u, w); return u; };
const damage0 = TD.prototype.damage;
TD.prototype.damage = function (u, dmg, from) { if (this.MORE && u && !u.dead) dmg = this.moreDamage(u, dmg, from); return damage0.call(this, u, dmg, from); };
const onKill0 = TD.prototype.onKill;
TD.prototype.onKill = function (u, from) { onKill0.call(this, u, from); if (this.MORE) this.moreKill(u, from); };
const weird0 = TD.prototype.weirdShot;
TD.prototype.weirdShot = function (u, tgt, tw, dmg, Df) { if (this.MORE && this.moreShot(u, tgt, tw, dmg, Df)) return true; return weird0 ? weird0.call(this, u, tgt, tw, dmg, Df) : false; };
const atk0 = TD.prototype.attackerAct;
TD.prototype.attackerAct = function (u, h) { if (this.MORE && this.moreDetour(u, h)) return; return atk0.call(this, u, h); };
const speed0 = TD.prototype.speedOf;
TD.prototype.speedOf = function (u) { const v = speed0.call(this, u); return this.MORE && u.under ? v * 1.1 : v; };

module.exports = { MORE, ELC, ELN, elOf };

// ----- drawing (looks only) -----
const DRAW = {
  // on the ground, under the troops
  drawMoreGround(ctx) {
    if (!this.MORE || !this.hazards) return;
    const t = this.t, T = this.fightT;
    ctx.save();
    // line synergy: a band of light between towers standing in a row
    for (const [a, c] of this.lines) { ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 4); ctx.lineCap = 'round'; ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(253,230,138,0.5)'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = '#FFF7D6'; ctx.setLineDash([6, 14]); ctx.lineDashOffset = -t * 40; ctx.stroke(); ctx.setLineDash([]); }
    ctx.globalAlpha = 1;
    // whirlpools: water spinning down
    for (const W of this.whirls) {
      const a = clamp((t - W.t0) / 0.3, 0, 1) * clamp((W.T1 - T) / 0.4, 0, 1); if (a <= 0) continue;
      ctx.save(); ctx.translate(W.x, W.y); ctx.globalAlpha = a; ctx.scale(1, 0.8);
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 82); g.addColorStop(0, 'rgba(8,47,73,0.85)'); g.addColorStop(0.6, 'rgba(14,116,144,0.55)'); g.addColorStop(1, 'rgba(56,189,248,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 82, 0, TAU); ctx.fill();
      ctx.lineWidth = 3; for (let k = 0; k < 4; k++) { ctx.strokeStyle = `rgba(224,242,254,${0.55 - k * 0.1})`; ctx.beginPath(); for (let q = 0; q <= 40; q++) { const an = q / 40 * TAU * 1.4 + k * TAU / 4 + t * 4, r = 8 + q * 1.8; const x = Math.cos(an) * r, y = Math.sin(an) * r; if (q) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); }
      ctx.restore();
    }
    // sleep mist: drifting lilac clouds
    for (const M of this.mists) {
      const a = clamp((t - M.t0) / 0.5, 0, 1) * clamp((M.T1 - T) / 0.6, 0, 1); if (a <= 0) continue;
      for (let q = 0; q < 7; q++) { const an = q * 0.9 + t * 0.3, r = 30 + (q % 3) * 18, x = M.x + Math.cos(an) * r, y = M.y + Math.sin(an) * r * 0.7, g = ctx.createRadialGradient(x, y, 4, x, y, 52);
        g.addColorStop(0, `rgba(216,180,254,${0.5 * a})`); g.addColorStop(1, 'rgba(216,180,254,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 52, 0, TAU); ctx.fill(); }
    }
    // mines: a dark disc with a blinking light once armed
    for (const m of this.mines) {
      if (m.done) { if (m.boomT && t - m.boomT < 0.01) {} continue; }
      ctx.beginPath(); ctx.arc(m.x, m.y, 8, 0, TAU); ctx.fillStyle = '#2B2F38'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      if (T >= m.armed && Math.sin(t * 9 + m.x) > 0) { ctx.beginPath(); ctx.arc(m.x, m.y - 1, 2.6, 0, TAU); ctx.fillStyle = '#F43F5E'; ctx.fill(); }
    }
    // tunnellers: a mound of earth moving under the path
    for (const u of this.units) if (u.under && !u.dead) {
      const wob = Math.sin(t * 16 + u.uid) * 1.5;
      ctx.beginPath(); ctx.ellipse(u.x, u.y + 3, u.r + 4, (u.r + 4) * 0.55, u.face || 0, 0, TAU); ctx.fillStyle = '#6B4F35'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(11,15,26,0.6)'; ctx.stroke();
      for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.arc(u.x + Math.cos(q * 2.1 + t * 3) * (u.r + 2), u.y + wob + Math.sin(q * 2.1) * 4, 2.4, 0, TAU); ctx.fillStyle = '#8A6A49'; ctx.fill(); }
    }
    // the healer boss's green circle; each wave's element as a faint ring under its troops
    const b = this.bossU;
    if (b && !b.dead && this.bossTrait === 'healer') { ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 3); ctx.beginPath(); ctx.arc(b.x, b.y, 170, 0, TAU); ctx.fillStyle = 'rgba(134,239,172,0.2)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#86EFAC'; ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 30; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    for (const u of this.units) if (u.welem && !u.dead && !u.under && !u.flying && u.team === ATK) { ctx.beginPath(); ctx.ellipse(u.x, u.y + u.r * 0.35, u.r + 3, (u.r + 3) * 0.5, 0, 0, TAU); ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(ELC[u.welem], 0.55); ctx.stroke(); }
    // fire rain: a red target ring on the tower it's falling on
    for (const r of this.rains) if (!r.done) { const k = clamp((t - r.t0) / 0.5, 0, 1); ctx.beginPath(); ctx.arc(r.x, r.y, 30 - 10 * k, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(248,113,113,${0.4 + 0.5 * k})`; ctx.stroke(); }
    ctx.restore();
  },
  // over the troops
  drawMore(ctx) {
    if (!this.MORE || !this.hazards) return;
    const t = this.t, T = this.fightT;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const u of this.units) {
      if (u.dead || u.under) continue;
      // a shield-bearer's shield, held to the front, cracking as it takes hits
      if (u.shield > 0 || (u.shieldBroke && t - u.shieldBroke < 0.4)) {
        const broke = !(u.shield > 0), k = broke ? 1 - (t - u.shieldBroke) / 0.4 : 1, hp = broke ? 0 : u.shield / u.shieldMax, a = u.face || 0, r = u.r + 7, hit = u.shieldHit && t - u.shieldHit < 0.15;
        ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(a); ctx.globalAlpha = k;
        ctx.beginPath(); ctx.arc(0, 0, r, -0.95, 0.95); ctx.lineWidth = 9; ctx.strokeStyle = hit ? '#FFFFFF' : '#94A3B8'; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(0, 0, r + 4.5, -0.95, 0.95); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r - 4.5, -0.95, 0.95); ctx.stroke();
        if (hp < 0.66) { ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(Math.cos(0.3) * (r - 4), Math.sin(0.3) * (r - 4)); ctx.lineTo(Math.cos(0.1) * (r + 4), Math.sin(0.1) * (r + 4)); if (hp < 0.33) { ctx.moveTo(Math.cos(-0.5) * (r - 4), Math.sin(-0.5) * (r - 4)); ctx.lineTo(Math.cos(-0.3) * (r + 4), Math.sin(-0.3) * (r + 4)); } ctx.stroke(); }
        ctx.restore();
      }
      // asleep: Zzz
      if (u.sleepT > T) { for (let q = 0; q < 3; q++) { const k = ((t - (u.sleep0 || 0)) * 0.9 + q / 3) % 1; ctx.globalAlpha = Math.sin(k * Math.PI); ctx.font = `italic 800 ${12 + q * 4}px "Barlow Condensed", sans-serif`; ctx.fillStyle = '#E9D5FF'; ctx.strokeStyle = INK; ctx.lineWidth = 3; const x = u.x + 6 + k * 14 + q * 3, y = u.y - u.r - 6 - k * 26; ctx.strokeText('z', x, y); ctx.fillText('z', x, y); } ctx.globalAlpha = 1; }
      // an engineer's sparks as it works
      if (u.engineer && u.fixT && t - u.fixT < 0.5) for (let q = 0; q < 4; q++) { const an = t * 20 + q * 1.6; ctx.fillStyle = '#FDE68A'; ctx.fillRect(u.x + Math.cos(an) * (u.r + 4) - 1.5, u.y + Math.sin(an) * (u.r + 4) - 1.5, 3, 3); }
    }
    // the rager boss's red glow once it has raged
    const b = this.bossU;
    if (b && !b.dead && this.raged) { const g = ctx.createRadialGradient(b.x, b.y, b.r * 0.5, b.x, b.y, b.r * 2.2); g.addColorStop(0, 'rgba(248,113,113,0)'); g.addColorStop(0.6, `rgba(248,113,113,${0.25 + 0.1 * Math.sin(t * 10)})`); g.addColorStop(1, 'rgba(248,113,113,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.2, 0, TAU); ctx.fill(); }
    // towers: the railgun's laser sight while it charges, the sacrifice's glow, the golden volley, the mason's mending
    for (const tw of this.towers) {
      if (tw.dead) continue;
      if (tw.charge) { const C = tw.charge, k = clamp((t - C.t0) / 1.5, 0, 1), tg = C.tgt && !C.tgt.dead ? C.tgt : null; if (tg) { ctx.globalAlpha = 0.3 + 0.6 * k; ctx.lineWidth = 1 + 2 * k; ctx.strokeStyle = '#F43F5E'; ctx.beginPath(); ctx.moveTo(tw.x, tw.y - 20); ctx.lineTo(tg.x, tg.y); ctx.stroke(); ctx.beginPath(); ctx.arc(tg.x, tg.y, 14 - 6 * k, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        const g = ctx.createRadialGradient(tw.x, tw.y - 20, 1, tw.x, tw.y - 20, 8 + 16 * k); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(244,114,182,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tw.x, tw.y - 20, 8 + 16 * k, 0, TAU); ctx.fill(); } }
      if (tw.sacK) { ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 5); ctx.beginPath(); ctx.arc(tw.x, tw.y, 34, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = '#F472B6'; ctx.stroke(); ctx.globalAlpha = 1; }
      if (tw.volleyT > T) { const g = ctx.createRadialGradient(tw.x, tw.y, 10, tw.x, tw.y, 60); g.addColorStop(0, 'rgba(255,210,63,0.5)'); g.addColorStop(1, 'rgba(255,210,63,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tw.x, tw.y, 60, 0, TAU); ctx.fill(); }
      if (tw.mendT && t - tw.mendT < 0.6) { const k = (t - tw.mendT) / 0.6; ctx.globalAlpha = 1 - k; ctx.fillStyle = '#86EFAC'; for (let q = 0; q < 4; q++) ctx.fillRect(tw.x - 14 + q * 9, tw.y - 20 - k * 26 - (q % 2) * 6, 4, 9), ctx.fillRect(tw.x - 16.5 + q * 9, tw.y - 17.5 - k * 26 - (q % 2) * 6, 9, 4); ctx.globalAlpha = 1; }
      // a matching element: the tower glows in the colour of the wave it's strongest against
      const now = this.plan.find(w => w.started && !w.boss && w.elem && this.units.some(u => u.wave === w && !u.dead));
      if (now && elOf(tw) === now.elem) { ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(tw.x, tw.y, 30 + 2 * Math.sin(t * 6), 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = ELC[now.elem]; ctx.stroke(); ctx.globalAlpha = 1; }
    }
    // the base being mended
    if (this.towers.some(tw => tw.mendB && t - tw.mendB < 0.7)) { const B = this.base; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(B.x, B.y, B.r + 10, 0, TAU); ctx.lineWidth = 4; ctx.strokeStyle = '#86EFAC'; ctx.stroke(); ctx.globalAlpha = 1; }
    // beams: the railgun's shot, the sacrifice's light
    for (const B of this.beams2) {
      const age = t - B.t0, life = B.kind === 'rail' ? 0.35 : 1; if (age > life) continue;
      const k = age / life;
      if (B.kind === 'rail') { ctx.globalAlpha = 1 - k; ctx.lineWidth = 16 * (1 - k) + 2; ctx.strokeStyle = 'rgba(244,114,182,0.7)'; ctx.beginPath(); ctx.moveTo(B.x0, B.y0); ctx.lineTo(B.x1, B.y1); ctx.stroke(); ctx.lineWidth = 5 * (1 - k) + 1; ctx.strokeStyle = '#FFFFFF'; ctx.stroke(); }
      else { ctx.globalAlpha = 1 - k; for (let q = 0; q < 8; q++) { const f = ((k * 1.6 + q / 8) % 1), x = B.x0 + (B.x1 - B.x0) * f, y = B.y0 + (B.y1 - B.y0) * f - Math.sin(f * Math.PI) * 40; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fillStyle = '#F9A8D4'; ctx.fill(); } }
      ctx.globalAlpha = 1;
    }
    if (this.beams2.length > 12) this.beams2 = this.beams2.filter(B => t - B.t0 < 1);
    // the blood pact's red wisp flying to the troop it heals
    for (const w of this.wisps) { const k = (t - w.t0) / 0.5; if (k > 1) continue; const x = w.x0 + (w.o.x - w.x0) * k, y = w.y0 + (w.o.y - w.y0) * k - Math.sin(k * Math.PI) * 30; const g = ctx.createRadialGradient(x, y, 1, x, y, 12); g.addColorStop(0, 'rgba(255,200,200,1)'); g.addColorStop(1, 'rgba(220,38,38,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill(); }
    if (this.wisps.length > 20) this.wisps = this.wisps.filter(w => t - w.t0 < 0.6);
    // fire rain: burning arrows coming down on a tower
    for (const r of this.rains) if (!r.done) { const k = clamp((t - r.t0) / 0.5, 0, 1); for (let q = 0; q < 5; q++) { const x = r.x + (q - 2) * 9 - (1 - k) * 60, y = r.y - (1 - k) * 260 + q * 4; ctx.lineWidth = 3; ctx.strokeStyle = '#FB923C'; ctx.beginPath(); ctx.moveTo(x - 10, y - 22); ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 2.5, 0, TAU); ctx.fillStyle = '#FDE68A'; ctx.fill(); } }
    ctx.restore();
  },
};
Object.assign(TD.prototype, DRAW);
