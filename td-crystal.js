// Tower Clash: the mystical crystal (Rellz, 2026-11-16: "add the mystical crystal it has 3 categories you can choose from and you
// can buy from all 3, first category is traps which has land mines spikes ... you can buy them in the marketplace or you can get
// them for free when the mystical crystal falls which is quite often").
//
// Three kinds of crystal magic (td-data.js CRYSTAL): TRAPS on the path ahead of the attackers (land mine, spike strip, bear trap,
// tar pit, flame vent, frost mine), TOTEMS beside the path that help the towers round them (war, frost, gold, healing, storm) and
// SUMMONS, crystal creatures that fight for the defenders (crystal golem, spirit wolves, treant guard, phoenix). The merchant sells
// one of each kind on every visit, and a mystical crystal falls on the board every 12 s or so, cracks open and gives one free,
// the kinds taking turns. Its own dice (CRR), so the rest of the battle's dice are untouched.
'use strict';
const RVB = require('./engine.js');
const D = require('./td-data.js');
const { TD, laneAt, PATH_W, DEF, ATK } = require('./td.js');
const E = RVB._;
const { AR, COL, UNIT, TAU, clamp, rgba, font, strokeText, easeOutBack, easeOutCubic } = E;
const { CRYSTAL, CRYSTAL_KEYS, CRYSTAL_CATS } = D;
const H01 = (a, b) => E.hash01(a, b);
const INK = COL.ink || '#0B0F1A';
const TOTEM_R = { wartotem: 170, frosttotem: 150, goldtotem: 170, healtotem: 170, stormtotem: 210 };
const TOTEM_COL = { wartotem: '#F87171', frosttotem: '#7DD3FC', goldtotem: '#FBBF24', healtotem: '#4ADE80', stormtotem: '#C4B5FD' };

const CRY = {
  planCrystals() {
    const R = this.CRR = E.rng(((this.seed >>> 0) ^ 0xC2757A1) >>> 0), C = this.cap;
    this.crystals = []; this.traps = []; this.totems = []; this.cflights = []; this.phoenixes = [];
    this.stat.crystals = [];
    if (this.opts.crystal === false) return;
    const cats = ['trap', 'totem', 'summon'], off = R.int(0, 2);
    // (in the Crystal Caverns they fall twice as often)
    const every = this.opts.map === 'crystal' ? [5.5, 7.5] : [10.5, 14];
    let t = R.range(9, 12);
    for (let i = 0; t < C - 6; i++) { this.crystals.push({ at: t, cat: cats[(i + off) % 3] }); t += R.range(every[0], every[1]); }
  },
  // the attacker nearest the base on the ground (where crystal magic is most use), or null
  cryLeader() {
    let best = null, bs = -1;
    for (const u of this.units) if (u.team === ATK && !u.dead && !u.gone && !u.flying && u.lane !== undefined) { const k = u.s / this.lanes[u.lane].len; if (k > bs) { bs = k; best = u; } }
    return best;
  },
  // a free spot beside the path, near distance s along lane L (away from towers, pads, totems and other crystals)
  crySide(L, s) {
    const p = laneAt(L, s), R = this.CRR;
    let side = R.chance(0.5) ? 1 : -1;
    for (let tries = 0; tries < 4; tries++) {
      const off = PATH_W / 2 + 26 + (tries >> 1) * 22, x = clamp(p.x + p.nx * side * off, AR.x + 30, AR.x + AR.w - 30), y = clamp(p.y + p.ny * side * off, AR.y + 60, AR.y + AR.h - 30);
      const busy = this.spots.some(o => Math.hypot(o.x - x, o.y - y) < 40) || this.totems.some(o => !o.done && Math.hypot(o.x - x, o.y - y) < 50) || Math.hypot(this.base.x - x, this.base.y - y) < 100
        || this.lanes.some(l => { for (let q = 0; q <= l.len; q += 24) { const r = laneAt(l, q); if (Math.hypot(r.x - x, r.y - y) < PATH_W / 2 + 10) return true; } return false; });
      if (!busy) return { x, y };
      side = -side;
    }
    return { x: clamp(p.x + p.nx * (PATH_W / 2 + 30), AR.x + 30, AR.x + AR.w - 30), y: clamp(p.y + p.ny * (PATH_W / 2 + 30), AR.y + 60, AR.y + AR.h - 30) };
  },
  crystalWant(k, o) {
    if (!o) {
      const b = this.base, c = this.crowd ? this.crowd() : null, nAtk = this.units.filter(u => u.team === ATK && !u.dead && !u.gone).length;
      const near = this.units.filter(u => u.team === ATK && !u.dead && Math.hypot(u.x - b.x, u.y - b.y) < 260).length;
      const hurt = this.towers.filter(t => !t.dead).reduce((s, t) => s + (1 - t.u.hp / t.u.max), 0);
      o = { packed: c ? c.n : 0, near, nAtk, hurt, bossNear: !!(this.bossU && !this.bossU.dead) };
    }
    const { packed, near, nAtk, hurt, bossNear } = o;
    switch (k) {
      case 'landmine': return 0.4 + packed * 0.06;
      case 'spikes': return 0.45 + packed * 0.08;
      case 'beartrap': return 0.35 + (bossNear ? 0.5 : 0);
      case 'tarpit': return 0.35 + near * 0.06;
      case 'firevent': return 0.35 + packed * 0.07;
      case 'frostmine': return 0.3 + packed * 0.08;
      case 'wartotem': return 0.5 + (bossNear ? 0.4 : 0);
      case 'frosttotem': return 0.4 + near * 0.05;
      case 'goldtotem': return this.fightT < this.cap * 0.6 ? 0.65 : 0.2;
      case 'healtotem': return 0.2 + hurt * 0.6;
      case 'stormtotem': return 0.45 + nAtk * 0.02;
      case 'golem': return 0.45 + near * 0.06;
      case 'wolves': return 0.4 + nAtk * 0.02;
      case 'treant': return 0.4 + packed * 0.05;
      case 'phoenix': return 0.4 + packed * 0.08;
    }
    return 0.3;
  },
  crystalPick(cat) {
    const R = this.CRR; let best = null, bs = -1;
    for (const k of CRYSTAL_KEYS) if (CRYSTAL[k].cat === cat) { const v = this.crystalWant(k) * R.range(0.7, 1.3); if (v > bs) { bs = v; best = k; } }
    return best;
  },
  // crystal magic on its way: a glowing orb flies from where it came from (the crystal or the merchant's cart) to where it goes
  crystalGive(k, from, free) {
    const T = this.fightT, C = CRYSTAL[k], lead = this.cryLeader();
    const li = lead ? lead.lane : (this.CRR.int(0, this.lanes.length - 1)), L = this.lanes[li], s0 = lead ? lead.s : L.len * 0.45;
    let to;
    if (C.cat === 'trap') {
      let s = clamp(s0 + 120, 50, L.len - 90);
      for (let i = 0; i < 4 && this.traps.some(t => !t.done && t.lane === li && Math.abs(t.s - s) < 50); i++) s = Math.min(L.len - 90, s + 55);
      const p = laneAt(L, s); to = { x: p.x, y: p.y, lane: li, s, ang: Math.atan2(p.dy, p.dx) };
    } else if (C.cat === 'totem') {
      const q = this.crySide(L, clamp(s0 + 40, 40, L.len - 60)); to = { x: q.x, y: q.y };
    } else {
      const s = k === 'phoenix' ? clamp(s0 + 240, 60, L.len - 20) : clamp(s0 + 80, 40, L.len - 70), p = laneAt(L, s);
      to = { x: p.x, y: p.y, lane: li, s, ang: Math.atan2(p.dy, p.dx) };
    }
    this.cflights.push({ k, x0: from[0], y0: from[1], x1: to.x, y1: to.y, to, t0: this.t, T1: T + 0.55, free });
    this.stat.crystals.push(k);
    this.snd('whoosh', { pan: this.pan(to.x), gain: 0.4 });
  },
  crystalPlace(f) {
    const T = this.fightT, k = f.k, C = CRYSTAL[k], to = f.to, col = CRYSTAL_CATS[C.cat].col;
    this.burst(to.x, to.y, col, 12, 220, 0.45, 5, -30);
    if (this.shRings) this.shRings.push({ x: to.x, y: to.y, r0: 6, r1: 40, t0: this.t, life: 0.35, col: '#E0F2FE', w: 3 });
    this.float(to.x, to.y - 34, C.name, col, 26, 1.0);
    if (C.cat === 'trap') {
      const life = { spikes: 12, tarpit: 10, firevent: 10 }[k] || 22;
      this.traps.push({ k, x: to.x, y: to.y, lane: to.lane, s: to.s, ang: to.ang, t0: this.t, T0: T, end: T + life, armed: T + 0.3, next: 0 });
      this.snd(k === 'tarpit' ? 'splash' : 'clang', { pan: this.pan(to.x), gain: 0.5 });
    } else if (C.cat === 'totem') {
      this.totems.push({ k, x: to.x, y: to.y, t0: this.t, T0: T, end: T + 12, next: 0, paid: 0 });
      this.snd('thud', { pan: this.pan(to.x), gain: 0.6 });
    } else if (k === 'phoenix') {
      const L = this.lanes[to.lane];
      this.phoenixes.push({ lane: to.lane, s0: to.s, s1: Math.max(0, to.s - 380), T0: T, T1: T + 2.4, next: 0, t0: this.t });
      this.snd('roar', { pan: this.pan(to.x), gain: 0.6 }); this.snd('flame', { gain: 0.6 });
      if (L) this.ignite && this.fireG && this.ignite(to.x, to.y, 0.1);
    } else {
      const face = Math.atan2(-Math.sin(to.ang), -Math.cos(to.ang));
      const add = (type, x, y, hpK, leash, life, dmgK) => {
        const o = this.addUnit(DEF, type, x, y); if (!o) return null;
        o.rx = x; o.ry = y; o.leash = leash; o.lifeEnd = T + life; o.max = o.hp = UNIT[type].hp * hpK; o.dmgK = dmgK; o.dropT = this.t; o.face = face; o.crystal = true; o.summoned = true;
        return o;
      };
      if (k === 'golem') add('golem', to.x, to.y, 3, 110, 14, 1.4);
      else if (k === 'treant') { const o = add('treant', to.x, to.y, 2.6, 100, 14, 1.2); if (o) o.roots = true; }
      else if (k === 'wolves') { const L = this.lanes[to.lane]; for (let i = 0; i < 3; i++) { const p = laneAt(L, clamp(to.s + (i - 1) * 24, 0, L.len)), lat = (i - 1) * 12; add('hellhound', p.x + p.nx * lat, p.y + p.ny * lat, 1.5, 220, 12, 1.2); } }
      this.snd('powerup', { pan: this.pan(to.x), gain: 0.5 }); this.shake(4);
    }
  },
  slowO(o, k, dur) { const T = this.fightT; o.slowK = o.slowT > T ? Math.min(o.slowK || 1, k) : k; o.slowT = Math.max(o.slowT || 0, T + dur); },
  // ---------- one tick ----------
  crystalTick(h) {
    if (!this.crystals) return;
    const T = this.fightT, R = this.CRR;
    // the crystals: one falls, lands with a thud and cracks open
    for (const c of this.crystals) {
      if (c.opened) continue;
      if (!c.fall && T >= c.at - 1.2) {
        c.fall = true; c.T0 = T;
        const lead = this.cryLeader(), li = lead ? lead.lane : R.int(0, this.lanes.length - 1), L = this.lanes[li];
        const q = this.crySide(L, clamp((lead ? lead.s : L.len * 0.4) + 90, 60, L.len - 80)); c.x = q.x; c.y = q.y;
        this.snd('whoosh', { pan: this.pan(c.x), gain: 0.6 });
      }
      if (c.fall && !c.landed && T >= c.at) {
        c.landed = true; c.tl = this.t;
        if (this.camEv) this.camEv.push({ type: 'spot', prio: 76, x: c.x, y: c.y - 20, z: 1.75, dur: 2.4 });
        this.shake(5); this.snd('thud', { pan: this.pan(c.x) }); this.snd('bell', { gain: 0.35 });
        this.burst(c.x, c.y, '#A5F3FC', 14, 260, 0.5, 5, -20); this.burst(c.x, c.y, '#8A7A62', 6, 180, 0.4, 5);
        if (this.shRings) this.shRings.push({ x: c.x, y: c.y, r0: 8, r1: 70, t0: this.t, life: 0.4, col: '#A5F3FC', w: 4 });
      }
      if (c.landed && T >= c.at + 0.9) {
        c.opened = true; c.to = this.t;
        const k = c.k = this.crystalPick(c.cat), C = CRYSTAL[k], col = CRYSTAL_CATS[C.cat].col;
        this.card({ kind: 'crystal', crystal: true, text: `MYSTICAL CRYSTAL · ${C.name}`, sub: `A FREE ${CRYSTAL_CATS[C.cat].name}`, col });
        this.say(`THE MYSTICAL CRYSTAL GIVES THE DEFENDERS ${C.name}`, DEF);
        this.burst(c.x, c.y - 24, '#E0F2FE', 16, 300, 0.55, 5, -40); this.burst(c.x, c.y - 24, col, 10, 240, 0.5, 5, -40);
        if (this.shine) this.shSpray(c.x, c.y - 24, -Math.PI / 2, 1.4, 8, 260, 0.6, 5, '#C4F1FF', 420, { shard: true });
        this.snd('powerup', { pan: this.pan(c.x), gain: 0.7 });
        this.crystalGive(k, [c.x, c.y - 30], true);
      }
    }
    // magic on its way
    if (this.cflights.length) { for (const f of this.cflights) if (!f.done && T >= f.T1) { f.done = true; this.crystalPlace(f); } this.cflights = this.cflights.filter(f => !f.done || this.t - f.t0 < 1.2); }
    // traps
    for (const tr of this.traps) {
      if (tr.done) continue;
      if (T > tr.end) { tr.done = true; tr.tEnd = this.t; continue; }
      if (T < tr.armed || tr.used) continue;
      const foes = this.near(tr.x, tr.y, 70).filter(o => o.team === ATK && !o.dead && !o.gone && !o.flying && !o.under);
      switch (tr.k) {
        case 'landmine': case 'frostmine': {
          const o = foes.find(o => Math.hypot(o.x - tr.x, o.y - tr.y) < o.r + 12); if (!o) break;
          tr.done = true; tr.tEnd = this.t; tr.boom = this.t;
          if (tr.k === 'landmine') { this.blast({ x: tr.x, y: tr.y, r: 64, dmg: 16, team: DEF, kind: 'cannonball' }); this.callout(o, 'LAND MINE!', '#FB923C'); this.shake(7); }
          else {
            for (const p of this.near(tr.x, tr.y, 85)) if (p.team === ATK && !p.dead && !p.flying) { p.frozeT = T + (p.boss ? 1 : 2.4); this.damage(p, 4, null); }
            this.burst(tr.x, tr.y, '#DCEFFF', 18, 300, 0.6, 6); if (this.shRings) this.shRings.push({ x: tr.x, y: tr.y, r0: 10, r1: 85, t0: this.t, life: 0.45, col: '#BFE9FF', w: 5 });
            this.snd('freeze', { pan: this.pan(tr.x), gain: 0.8 }); this.callout(o, 'FROZEN!', '#9BE7FF');
          }
          break;
        }
        case 'beartrap': {
          const o = foes.find(o => Math.hypot(o.x - tr.x, o.y - tr.y) < o.r + 10); if (!o) break;
          tr.used = true; tr.snap = this.t; tr.end = T + (o.boss ? 1.2 : 2.6); tr.victim = o;
          o.stunT = Math.max(o.stunT || 0, tr.end); this.damage(o, 9, null);
          this.snd('clang', { pan: this.pan(tr.x), gain: 0.9 }); this.callout(o, 'SNAP!', '#FB923C'); this.burst(tr.x, tr.y, '#9CA3AF', 8, 200, 0.35, 4);
          break;
        }
        case 'spikes': {
          if (T < tr.next) break; tr.next = T + 0.25;
          const dx = Math.cos(tr.ang), dy = Math.sin(tr.ang);
          for (const o of foes) { const rx = o.x - tr.x, ry = o.y - tr.y, along = rx * dx + ry * dy, lat = -rx * dy + ry * dx; if (Math.abs(along) < 12 + o.r * 0.5 && Math.abs(lat) < PATH_W / 2 + 6) { this.damage(o, 1.3, null); this.slowO(o, 0.55, 0.5); tr.hitT = this.t; } }
          break;
        }
        case 'tarpit': for (const o of foes) if (Math.hypot(o.x - tr.x, o.y - tr.y) < 44 + o.r * 0.4) this.slowO(o, 0.4, 0.3); break;
        case 'firevent': {
          if (T < tr.next) break; tr.next = T + 1.1; tr.fireT = this.t;
          let hit = false; for (const o of foes) if (Math.hypot(o.x - tr.x, o.y - tr.y) < 48) { this.burn(o, 3, 2, null); this.damage(o, 2.5, null); hit = true; }
          if (hit) this.snd('flame', { pan: this.pan(tr.x), quiet: true, gain: 0.4 });
          break;
        }
      }
    }
    // totems
    for (const tm of this.totems) {
      if (tm.done) continue;
      if (T > tm.end) { tm.done = true; tm.tEnd = this.t; continue; }
      const r = TOTEM_R[tm.k];
      if (tm.k === 'wartotem') { for (const tw of this.towers) if (!tw.dead && Math.hypot(tw.x - tm.x, tw.y - tm.y) < r) tw.u.rageT = Math.max(tw.u.rageT || 0, T + 0.2); }
      else if (tm.k === 'frosttotem') { if (T >= tm.next) { tm.next = T + 0.2; for (const o of this.near(tm.x, tm.y, r)) if (o.team === ATK && !o.dead) this.slowO(o, 0.6, 0.35); } }
      else if (tm.k === 'healtotem') { for (const tw of this.towers) if (!tw.dead && Math.hypot(tw.x - tm.x, tw.y - tm.y) < r && tw.u.hp < tw.u.max) tw.u.hp = Math.min(tw.u.max, tw.u.hp + tw.u.max * 0.05 * h); }
      else if (tm.k === 'stormtotem') {
        if (T >= tm.next) {
          let best = null, bd = r;
          for (const o of this.near(tm.x, tm.y, r)) if (o.team === ATK && !o.dead && !o.gone) { const d = Math.hypot(o.x - tm.x, o.y - tm.y); if (d < bd) { bd = d; best = o; } }
          if (best) { tm.next = T + 0.8; this.bolts.push({ x0: tm.x, y0: tm.y - 52, x1: best.x, y1: best.y, t0: this.t, col: '#E9D5FF' }); this._shXk = 'lightning'; this.damage(best, 5, null); this._shXk = null; this.snd('zap', { pan: this.pan(tm.x), quiet: true, gain: 0.35 }); tm.zapT = this.t; }
        }
      }
    }
    // the treant's roots: troops right next to it are slowed
    for (const u of this.units) if (u.roots && !u.dead) for (const o of this.near(u.x, u.y, 70)) if (o.team === ATK && !o.dead && !o.flying) this.slowO(o, 0.5, 0.25);
    // the phoenix sweeping down the path
    for (const p of this.phoenixes) {
      if (p.done) continue;
      const k = clamp((T - p.T0) / (p.T1 - p.T0), 0, 1), L = this.lanes[p.lane], q = laneAt(L, p.s0 + (p.s1 - p.s0) * k);
      p.x = q.x; p.y = q.y; p.a = Math.atan2(-q.dy, -q.dx);
      if (T >= p.next) {
        p.next = T + 0.15;
        for (const o of this.near(q.x, q.y, 50)) if (o.team === ATK && !o.dead && !o.gone) { this.burn(o, 3, 2.2, null); this.damage(o, 2, null); }
        if (this.parts.length < 1500) for (let i = 0; i < 3; i++) this.parts.push({ x: q.x + this.FX.range(-14, 14), y: q.y + this.FX.range(-14, 14), vx: this.FX.range(-30, 30), vy: this.FX.range(-60, -20), life: this.FX.range(0.4, 0.7), age: 0, size: this.FX.range(3, 6), color: i ? '#FB923C' : '#FDE047', grav: -40 });
      }
      if (k >= 1) { p.done = true; p.tEnd = this.t; }
    }
  },
  // a kill near a gold totem pays double
  totemKill(u, g) {
    if (!this.totems) return;
    for (const tm of this.totems) if (!tm.done && tm.k === 'goldtotem' && Math.hypot(u.x - tm.x, u.y - tm.y) < TOTEM_R.goldtotem) { this.gold += g; tm.paid += g; this.coins.push({ x: u.x, y: u.y - 8, t0: this.t, g, x1: 0, y1: 0 }); tm.payT = this.t; break; }
  },

  // ---------- drawing (looks only) ----------
  // a crystal: a tall six-sided gem, ice-blue at the top to violet at the foot, with a lit facet and a glow round it
  drawGem(ctx, x, y, s, glow, crack) {
    ctx.save(); ctx.translate(x, y);
    if (glow > 0) { const g = ctx.createRadialGradient(0, 0, 2, 0, 0, s * 2.4); g.addColorStop(0, `rgba(165,243,252,${0.5 * glow})`); g.addColorStop(1, 'rgba(165,243,252,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * 2.4, 0, TAU); ctx.fill(); }
    const P = [[0, -1.3], [0.55, -0.6], [0.5, 0.72], [0, 1.08], [-0.5, 0.72], [-0.55, -0.6]];
    const body = () => { ctx.beginPath(); P.forEach(([a, b], i) => (i ? ctx.lineTo(a * s, b * s) : ctx.moveTo(a * s, b * s))); ctx.closePath(); };
    const g = ctx.createLinearGradient(0, -1.3 * s, 0, 1.08 * s);
    g.addColorStop(0, '#F0FBFF'); g.addColorStop(0.3, '#7DE3F4'); g.addColorStop(0.7, '#A78BFA'); g.addColorStop(1, '#6D28D9');
    body(); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -1.3 * s); ctx.lineTo(-0.55 * s, -0.6 * s); ctx.lineTo(-0.5 * s, 0.72 * s); ctx.lineTo(0, 1.08 * s); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -1.3 * s); ctx.lineTo(0, 1.08 * s); ctx.moveTo(-0.55 * s, -0.6 * s); ctx.lineTo(0, -0.25 * s); ctx.lineTo(0.55 * s, -0.6 * s); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.32 * s, -0.75 * s); ctx.lineTo(-0.2 * s, 0.35 * s); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineCap = 'round'; ctx.stroke();
    if (crack > 0) { ctx.beginPath(); ctx.moveTo(0.05 * s, -0.9 * s); ctx.lineTo(0.22 * s, -0.4 * s); ctx.lineTo(0.02 * s, 0); ctx.lineTo(0.25 * s, 0.4 * s); ctx.moveTo(0.22 * s, -0.4 * s); ctx.lineTo(0.42 * s, -0.25 * s); ctx.lineWidth = 2.2; ctx.strokeStyle = `rgba(255,255,255,${crack})`; ctx.stroke(); }
    body(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
  },
  // on the ground, under everyone: traps, the totems' reach, and the glow under crystal creatures
  drawTraps(ctx) {
    if (!this.traps) return;
    const t = this.t, T = this.fightT;
    for (const tm of this.totems) {
      const a = tm.done ? clamp(1 - (t - tm.tEnd) / 0.5, 0, 1) : clamp((t - tm.t0) / 0.4, 0, 1); if (a <= 0) continue;
      const r = TOTEM_R[tm.k], col = TOTEM_COL[tm.k];
      ctx.save(); ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(tm.x, tm.y, r, 0, TAU); ctx.fillStyle = rgba(col, 0.06); ctx.fill();
      ctx.setLineDash([12, 14]); ctx.lineDashOffset = -t * 30; ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(col, 0.28); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
    for (const u of this.units) if (u.crystal && !u.dead) { ctx.beginPath(); ctx.ellipse(u.x, u.y + u.r * 0.4, u.r * 1.4, u.r * 0.7, 0, 0, TAU); ctx.fillStyle = `rgba(165,243,252,${0.22 + 0.08 * Math.sin(t * 5 + u.uid)})`; ctx.fill(); }
    for (const tr of this.traps) {
      const out = tr.done ? clamp(1 - (t - tr.tEnd) / 0.4, 0, 1) : 1; if (out <= 0 || tr.boom) continue;
      const pop = easeOutBack(clamp((t - tr.t0) / 0.3, 0, 1));
      ctx.save(); ctx.globalAlpha = out; ctx.translate(tr.x, tr.y); ctx.scale(pop, pop);
      switch (tr.k) {
        case 'landmine': case 'frostmine': {
          const ice = tr.k === 'frostmine';
          ctx.beginPath(); ctx.ellipse(0, 0, 16, 13, 0, 0, TAU); ctx.fillStyle = 'rgba(40,30,22,0.45)'; ctx.fill();
          E.disc(ctx, 0, 0, 11, ice ? '#3B5B7A' : '#3F4650', 2.5); E.disc(ctx, 0, 0, 6, ice ? '#5B86AD' : '#59626E', 2);
          const on = Math.sin(t * 8) > 0, lc = ice ? '#7DD3FC' : '#FF3B3B';
          if (on) { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 12); g.addColorStop(0, rgba(lc, 0.7)); g.addColorStop(1, rgba(lc, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill(); }
          ctx.beginPath(); ctx.arc(0, 0, 2.8, 0, TAU); ctx.fillStyle = on ? lc : ice ? '#1E3A5F' : '#7F1D1D'; ctx.fill();
          if (ice) for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17); ctx.lineWidth = 3; ctx.strokeStyle = '#DCEFFF'; ctx.lineCap = 'round'; ctx.stroke(); }
          break;
        }
        case 'spikes': {
          ctx.rotate(tr.ang + Math.PI / 2); const w = PATH_W + 6, hit = t - (tr.hitT ?? -9) < 0.15;
          E.roundRect(ctx, -w / 2, -6, w, 12, 4); ctx.fillStyle = '#5B4632'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
          for (let i = 0; i < 7; i++) { const x = -w / 2 + 6 + i * (w - 12) / 6; ctx.beginPath(); ctx.moveTo(x, -9 - (hit ? 2 : 0)); ctx.lineTo(x + 4, 0); ctx.lineTo(x, 9); ctx.lineTo(x - 4, 0); ctx.closePath(); ctx.fillStyle = hit ? '#F1F5F9' : '#CBD5E1'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke(); }
          break;
        }
        case 'beartrap': {
          const shut = tr.snap !== undefined, k = shut ? clamp((t - tr.snap) / 0.08, 0, 1) : 0, ry = 14 - 10 * k;
          ctx.beginPath(); ctx.ellipse(0, 0, 15, ry, 0, 0, TAU); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 2.6; ctx.strokeStyle = '#9CA3AF'; ctx.stroke();
          ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, r1 = i % 2 ? 1 : 0.62; ctx.lineTo(Math.cos(a) * 15 * r1, Math.sin(a) * ry * r1); } ctx.closePath(); ctx.fillStyle = 'rgba(203,213,225,0.5)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#475569'; ctx.stroke();
          if (!shut) E.disc(ctx, 0, 0, 5, '#6B7280', 1.8);
          break;
        }
        case 'tarpit': {
          ctx.beginPath(); for (let i = 0; i <= 12; i++) { const a = i / 12 * TAU, r = 40 + 7 * H01(i % 12, tr.t0 * 10 | 0); i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.8); } ctx.closePath();
          ctx.fillStyle = 'rgba(18,14,22,0.9)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2D2433'; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(-10, -9, 16, 6, -0.3, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
          for (let i = 0; i < 4; i++) { const ph = (t * 0.8 + i * 0.27) % 1, a = H01(i, 3) * TAU, d = 24 * H01(i, 9); ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d * 0.8, 2 + 5 * ph, 0, TAU); ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(120,100,130,${1 - ph})`; ctx.stroke(); }
          break;
        }
        case 'firevent': {
          ctx.rotate(tr.ang); E.roundRect(ctx, -15, -15, 30, 30, 5); ctx.fillStyle = '#3A3A3A'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
          const hot = 0.4 + 0.3 * Math.sin(t * 6) + (t - (tr.fireT ?? -9) < 0.5 ? 0.4 : 0);
          for (let i = -1; i <= 1; i++) { E.roundRect(ctx, i * 8 - 2.5, -10, 5, 20, 2); ctx.fillStyle = `rgba(255,${120 + 60 * hot},40,${clamp(hot, 0, 1)})`; ctx.fill(); }
          break;
        }
      }
      ctx.restore();
    }
  },
  // over everyone: falling and cracking crystals, magic in flight, totems, flame vents firing, the phoenix
  drawCrystals(ctx) {
    if (!this.crystals) return;
    const t = this.t, T = this.fightT;
    for (const c of this.crystals) {
      if (!c.fall) continue;
      if (c.opened && t - c.to > 0.5) continue;
      if (!c.landed) {
        const k = clamp((T - c.T0) / 1.2, 0, 1), y = c.y - 640 * (1 - k * k);
        const g = ctx.createLinearGradient(c.x, y - 180, c.x, y); g.addColorStop(0, 'rgba(165,243,252,0)'); g.addColorStop(1, 'rgba(165,243,252,0.6)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(c.x - 7, y - 180); ctx.lineTo(c.x + 7, y - 180); ctx.lineTo(c.x + 12, y); ctx.lineTo(c.x - 12, y); ctx.closePath(); ctx.fill();
        // its shadow grows on the ground as it comes down
        ctx.beginPath(); ctx.ellipse(c.x, c.y + 6, 8 + 12 * k, 4 + 5 * k, 0, 0, TAU); ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.2 * k})`; ctx.fill();
        this.drawGem(ctx, c.x, y - 26, 20, 0.8, 0);
        continue;
      }
      const since = t - c.tl, open = c.opened ? clamp((t - c.to) / 0.5, 0, 1) : 0;
      ctx.beginPath(); ctx.ellipse(c.x, c.y + 6, 24, 9, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
      ctx.save(); ctx.globalAlpha = 1 - open; const sq = 1 + 0.12 * Math.exp(-since * 8) * Math.sin(since * 30);
      this.drawGem(ctx, c.x, c.y - 26 - 3 * Math.sin(t * 3), 20 * (1 + open * 0.4) * sq, 0.8 + 0.3 * Math.sin(t * 6), clamp((T - c.at - 0.3) / 0.5, 0, 1));
      ctx.restore();
    }
    for (const f of this.cflights) {
      const k = clamp((t - f.t0) / 0.55, 0, 1); if (f.done && k >= 1) continue;
      const col = CRYSTAL_CATS[CRYSTAL[f.k].cat].col;
      for (let i = 5; i >= 0; i--) {
        const q = clamp(k - i * 0.05, 0, 1), x = f.x0 + (f.x1 - f.x0) * q, y = f.y0 + (f.y1 - f.y0) * q - Math.sin(Math.PI * q) * 90;
        ctx.beginPath(); ctx.arc(x, y, (i ? 7 - i : 10), 0, TAU); ctx.fillStyle = i ? rgba(col, 0.5 - i * 0.07) : '#FFFFFF'; ctx.fill();
        if (!i) { ctx.lineWidth = 4; ctx.strokeStyle = col; ctx.stroke(); }
      }
    }
    for (const tr of this.traps) if (tr.k === 'firevent' && !tr.done && t - (tr.fireT ?? -9) < 0.55) {
      const q = (t - tr.fireT) / 0.55, hgt = 70 * Math.sin(Math.PI * Math.min(1, q * 1.4));
      for (let i = 0; i < 3; i++) {
        const w = 13 - i * 3.5, hh = hgt * (1 - i * 0.22), x = tr.x + Math.sin(t * 20 + i) * 3;
        ctx.beginPath(); ctx.moveTo(x - w, tr.y); ctx.quadraticCurveTo(x - w * 0.6, tr.y - hh * 0.6, x, tr.y - hh); ctx.quadraticCurveTo(x + w * 0.6, tr.y - hh * 0.6, x + w, tr.y); ctx.closePath();
        ctx.fillStyle = ['rgba(249,115,22,0.85)', 'rgba(251,191,36,0.9)', 'rgba(255,247,200,0.95)'][i]; ctx.fill();
      }
    }
    for (const tm of this.totems) {
      const out = tm.done ? clamp(1 - (t - tm.tEnd) / 0.5, 0, 1) : 1; if (out <= 0) continue;
      const rise = easeOutBack(clamp((t - tm.t0) / 0.4, 0, 1)), col = TOTEM_COL[tm.k];
      ctx.save(); ctx.globalAlpha = out; ctx.translate(tm.x, tm.y);
      ctx.beginPath(); ctx.ellipse(0, 2, 16, 7, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
      ctx.scale(1, rise);
      E.roundRect(ctx, -6, -44, 12, 46, 3); ctx.fillStyle = '#7A5230'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      for (const yy of [-30, -16]) { ctx.beginPath(); ctx.moveTo(-6, yy); ctx.lineTo(6, yy); ctx.lineWidth = 2; ctx.strokeStyle = '#4A2F18'; ctx.stroke(); }
      const hy = -56, pulse = 0.5 + 0.5 * Math.sin(t * 4);
      const gl = ctx.createRadialGradient(0, hy, 2, 0, hy, 34); gl.addColorStop(0, rgba(col, 0.45 * (0.6 + 0.4 * pulse))); gl.addColorStop(1, rgba(col, 0)); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, hy, 34, 0, TAU); ctx.fill();
      E.roundRect(ctx, -15, hy - 14, 30, 28, 8); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = '#FFFFFF'; ctx.fillStyle = '#FFFFFF'; ctx.lineCap = 'round';
      if (tm.k === 'wartotem') { ctx.beginPath(); ctx.moveTo(-15, hy - 8); ctx.lineTo(-22, hy - 20); ctx.lineTo(-9, hy - 13); ctx.moveTo(15, hy - 8); ctx.lineTo(22, hy - 20); ctx.lineTo(9, hy - 13); ctx.fill(); ctx.beginPath(); ctx.moveTo(-8, hy - 3); ctx.lineTo(-3, hy); ctx.moveTo(8, hy - 3); ctx.lineTo(3, hy); ctx.moveTo(-5, hy + 7); ctx.lineTo(5, hy + 7); ctx.strokeStyle = INK; ctx.stroke(); }
      else if (tm.k === 'frosttotem') { ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.moveTo(Math.cos(a) * 9, hy + Math.sin(a) * 9); ctx.lineTo(-Math.cos(a) * 9, hy - Math.sin(a) * 9); } ctx.stroke(); }
      else if (tm.k === 'goldtotem') { E.disc(ctx, 0, hy, 9, '#FDE68A', 2.5); ctx.font = font(15, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#92400E'; ctx.fillText('$', 0, hy + 1); if (t - (tm.payT ?? -9) < 0.4) { ctx.beginPath(); ctx.arc(0, hy, 14 + 30 * (t - tm.payT), 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(253,230,138,${1 - (t - tm.payT) / 0.4})`; ctx.stroke(); } }
      else if (tm.k === 'healtotem') { ctx.fillRect(-3, hy - 9, 6, 18); ctx.fillRect(-9, hy - 3, 18, 6); }
      else if (tm.k === 'stormtotem') { ctx.beginPath(); ctx.moveTo(3, hy - 11); ctx.lineTo(-5, hy + 1); ctx.lineTo(1, hy + 1); ctx.lineTo(-3, hy + 11); ctx.lineTo(6, hy - 2); ctx.lineTo(0, hy - 2); ctx.closePath(); ctx.fillStyle = '#FDE047'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke(); }
      ctx.restore();
    }
    for (const p of this.phoenixes) {
      if (p.x === undefined) continue;
      const out = p.done ? clamp(1 - (t - p.tEnd) / 0.4, 0, 1) : clamp((t - p.t0) / 0.25, 0, 1); if (out <= 0) continue;
      ctx.save(); ctx.globalAlpha = out; ctx.translate(p.x, p.y - 30); ctx.rotate(p.a + Math.PI / 2);
      const fl = Math.sin(t * 16), s = 1.4;
      const gw = ctx.createRadialGradient(0, 0, 4, 0, 0, 60); gw.addColorStop(0, 'rgba(253,224,71,0.45)'); gw.addColorStop(1, 'rgba(249,115,22,0)'); ctx.fillStyle = gw; ctx.beginPath(); ctx.arc(0, 0, 60, 0, TAU); ctx.fill();
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-5 + i * 5, 12 * s); ctx.quadraticCurveTo((-8 + i * 8) * s, 30 * s, (-4 + i * 4 + Math.sin(t * 10 + i) * 4) * s, 46 * s); ctx.lineWidth = 6 - i; ctx.strokeStyle = ['#F97316', '#FDE047', '#FB923C'][i]; ctx.lineCap = 'round'; ctx.stroke(); }
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, -2 * s); ctx.quadraticCurveTo(sd * 22 * s, (-14 + fl * 10) * s, sd * 34 * s, (4 + fl * 12) * s); ctx.quadraticCurveTo(sd * 18 * s, 6 * s, 0, 8 * s); ctx.closePath(); ctx.fillStyle = sd < 0 ? '#F97316' : '#FB923C'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(0, 2 * s, 7 * s, 13 * s, 0, 0, TAU); ctx.fillStyle = '#FDBA74'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      E.disc(ctx, 0, -10 * s, 6 * s, '#FDE047', 2.5);
      ctx.beginPath(); ctx.moveTo(-2.5 * s, -15 * s); ctx.lineTo(0, -21 * s); ctx.lineTo(2.5 * s, -15 * s); ctx.closePath(); ctx.fillStyle = '#F59E0B'; ctx.fill();
      ctx.restore();
    }
  },
};
Object.assign(TD.prototype, CRY);
module.exports = CRY;
