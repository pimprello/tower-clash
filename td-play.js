// Tower Clash: the merchant and the spell book, the attackers' war shaman, battle events and map hazards, and world events.
'use strict';
const RVB = require('./engine.js');
const D = require('./td-data.js');
const { TD, laneAt, distToLane, PATH_W, DEF, ATK } = require('./td.js');
const E = RVB._;
const { AR, COL, TEAMS, UNIT, TAU, clamp, labelOf, isTitan, hash01 } = E;
const { BOOK, BOOK_KEYS, SHAMAN, SHAMAN_KEYS, TOWERS, LAYOUTS } = D;

// a repeatable order from the seed (no dice)
const hashS = (a, b) => { let x = ((a >>> 0) ^ Math.imul(b + 1, 0x9E3779B1)) >>> 0; x ^= x >>> 16; x = Math.imul(x, 0x85EBCA6B) >>> 0; x ^= x >>> 13; x = Math.imul(x, 0xC2B2AE35) >>> 0; x ^= x >>> 16; return x >>> 0; };

const PLAY = {
  planSpells() {
    const R = this.SPR, C = this.cap;
    this.merch = null;
    this.visits = [{ at: C * 0.3 + R.range(-1, 1), n: 1 }, { at: C * 0.6 + R.range(-1, 1), n: 2 }];
    const SR = this.SHR, extra = this.trait.atk === 'cunning';
    this.shamanAt = [0.27, 0.5, 0.73].concat(extra ? [0.85] : []).map(k => C * k + SR.range(-1.2, 1.2));
    this.aBuff = {};
    this.fallenSpots = [];
  },
  // where the attackers are thickest (and how many), on the ground
  crowd(r = 90) {
    const foes = this.units.filter(o => !o.dead && o.team === ATK && !o.gone && !o.flying);
    let best = null, bn = 0;
    for (let k = 0; k < foes.length; k += Math.max(1, foes.length / 30 | 0)) { const c = foes[k]; let n = 0; for (const o of foes) if ((o.x - c.x) ** 2 + (o.y - c.y) ** 2 < r * r) n++; if (n > bn || (n === bn && best && (c.s || 0) > (best.s || 0))) { bn = n; best = c; } }
    return best ? { x: best.x, y: best.y, n: bn, u: best, foes } : null;
  },
  // ---------- the merchant (twice a battle) ----------
  merchantTick() {
    const T = this.fightT;
    for (const v of this.visits) {
      if (v.done || T < v.at) continue;
      v.done = true;
      const side = this.base.x < AR.x + AR.w / 2 ? 1 : -1, x = clamp(this.base.x + side * 170, AR.x + 90, AR.x + AR.w - 90), y = clamp(this.base.y + 10, AR.y + 60, AR.y + AR.h - 50);
      this.merch = { x, y, t0: T, end: T + 4.2, left: side < 0, n: v.n, sold: [] };
      this.card({ kind: 'merchant', text: v.n === 1 ? 'THE MERCHANT ARRIVES' : 'THE MERCHANT IS BACK', col: '#FDE68A' });
      this.snd('bell', { gain: 0.8 }); this.snd('coin');
      if (this.camEv) this.camEv.push({ type: 'spot', x, y: y - 20, prio: 64, dur: 1.8, z: 1.8 });
      const offer = this.offer(v.n);
      v.offer = offer;
      // the defenders buy what suits the moment (base hurting: heal or dome; a swarm: acid, tornado or quake; a boss: rage or growth)
      const order = offer.map(k => [k, this.want(k)]).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      let n = 0;
      for (const k of order) {
        const price = BOOK[k].price;
        if (this.gold < price) continue;
        this.gold -= price; n++;
        this.merch.sold.push(k);
        (this.spellQ || (this.spellQ = [])).push({ k, at: T + 1.0 + (n - 1) * 1.9, team: DEF });
        this.stat.spells.push(k);
        this.card({ kind: 'spell', text: `BOUGHT · ${BOOK[k].name}`, sub: `${price} GOLD`, col: BOOK[k].col, spell: k });
        this.say(`THE DEFENDERS BUY ${BOOK[k].name} (${price} GOLD)`, DEF);
        this.snd('coin');
        if (n >= 2 || this.gold < 30) break;
      }
      if (!n) { this.say('THE MERCHANT LEAVES: NO GOLD TO SPARE', DEF); }
    }
    if (this.spellQ) for (const q of this.spellQ) if (!q.done && T >= q.at) { q.done = true; this.cast(q.k); }
  },
  offer(n) {
    const keys = BOOK_KEYS.slice(), seen = this.offered || [];
    keys.sort((a, b) => hashS(this.seed, n * 31 + BOOK_KEYS.indexOf(a)) - hashS(this.seed, n * 31 + BOOK_KEYS.indexOf(b)));
    const out = keys.filter(k => !seen.includes(k)).slice(0, 5);
    this.offered = seen.concat(out);
    return out;
  },
  // how much the defenders want each spell right now (no dice)
  want(k) {
    const b = this.base, c = this.crowd(), nAtk = this.units.filter(u => u.team === ATK && !u.dead && !u.gone).length;
    const hurt = this.towers.filter(t => !t.dead).reduce((s, t) => s + (1 - t.u.hp / t.u.max), 0);
    const near = this.units.filter(u => u.team === ATK && !u.dead && Math.hypot(u.x - b.x, u.y - b.y) < 260).length;
    const bossNear = this.bossU && !this.bossU.dead || this.plan.some(w => w.boss && !w.started && w.at - this.fightT < 10);
    const packed = c ? c.n : 0;
    switch (k) {
      case 'heal': return (1 - b.hp / b.max) * 2 + hurt * 0.5;
      case 'rage': return 0.4 + nAtk * 0.04 + (bossNear ? 0.5 : 0);
      case 'bones': return 0.3 + packed * 0.08;
      case 'acid': return 0.2 + packed * 0.13;
      case 'growth': return bossNear ? 1.1 : 0.45;
      case 'dome': return b.hp < 70 ? 1.2 : 0.2 + near * 0.1;
      case 'tornado': return 0.3 + packed * 0.1;
      case 'quake': return 0.35 + packed * 0.1;
      case 'meteor': return 0.4 + packed * 0.11;
      case 'timefreeze': return 0.3 + near * 0.15;
      case 'reinforce': return 0.5 + (this.units.filter(u => u.team === DEF && !u.tower && !u.dead).length < 3 ? 0.4 : 0);
      case 'chainstorm': return 0.3 + nAtk * 0.05;
    }
    return 0.3;
  },
  // ---------- casting a spell (the defenders') ----------
  cast(k) {
    const T = this.fightT, S = this.sp3, b = this.base, c = this.crowd() || { x: b.x, y: b.y - 200, n: 0, u: null };
    const spot = (x, y, z, dur, slow) => { if (this.camEv) this.camEv.push({ type: 'spot', x, y, prio: 81, dur: dur || 1.8, z: z || 1.5, ts: slow ? 0.45 : undefined, slowFor: slow ? 0.8 : undefined }); };
    const pan = x => this.pan(x), col = BOOK[k].col, live = this.towers.filter(t => !t.dead);
    const laneOf = u => (u && u.lane !== undefined ? this.lanes[u.lane] : this.lanes[0]);
    const word = (x, y, text) => this.float(x, y - 30, text, col, 30, 1.1);
    switch (k) {
      case 'heal': {
        const beams = [];
        for (const t of live) { t.u.hp = Math.min(t.u.max, t.u.hp + t.u.max * 0.5); t.u.healFlash = 1; beams.push([t.x, t.y, t.u.r]); }
        b.hp = Math.min(b.max, b.hp + 15); b.healT = this.t;
        S.fx.push({ kind: 'heal', beams, t0: this.t, x: b.x, y: b.y });
        this.snd('heal', { gain: 1 }); spot(b.x, b.y - 120, 1.2); word(b.x, b.y - 60, 'HEAL!');
        break;
      }
      case 'rage': {
        for (const t of live) { t.u.rageT = T + 6; t.u.flash = Math.max(t.u.flash, 0.5); }
        const cx = live.reduce((s, t) => s + t.x, 0) / Math.max(1, live.length), cy = live.reduce((s, t) => s + t.y, 0) / Math.max(1, live.length);
        S.fx.push({ kind: 'rage', x: cx, y: cy, t0: this.t }); this.snd('roar', { gain: 1 }); this.shake(6); spot(cx, cy, 1.25); word(cx, cy, 'RAGE!');
        break;
      }
      case 'bones': {
        const L = laneOf(c.u), s0 = Math.min(L.len - 30, (c.u ? c.u.s : L.len * 0.6) + 60), stones = [], p0 = laneAt(L, s0 + 30);
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.4, rr = 62 + (i % 2) * 12; stones.push([p0.x + Math.cos(a) * rr, p0.y + Math.sin(a) * rr * 0.8, i]); }
        S.fx.push({ kind: 'yard', x: p0.x, y: p0.y, stones, t0: this.t, T0: T, end: T + 7 });
        for (let i = 0; i < 8; i++) { const p = laneAt(L, s0 + (i >> 1) * 20), lat = (i % 2 ? 1 : -1) * 14; S.rises.push({ team: DEF, tb: null, x: p.x + p.nx * lat, y: p.y + p.ny * lat, at: T + 0.5 + i * 0.13, face: Math.atan2(-p.dy, -p.dx), td: { leash: 110, life: 10, dmgK: 1.2 } }); }
        this.snd('rumble', { pan: pan(p0.x) }); this.snd('portal', { gain: 0.6 }); spot(p0.x, p0.y, 1.8, 2.4, true); word(p0.x, p0.y, 'RISE!');
        break;
      }
      case 'acid': {
        S.flasks.push({ x: c.x, y: c.y, team: DEF, from: live[0] ? live[0].u : null, t0: this.t, T0: T, at: T + 0.75, done: false, r: 100 });
        this.snd('whoosh', { pan: pan(c.x) }); spot(c.x, c.y, 1.7, 2.2, true);
        break;
      }
      case 'growth': {
        const pick = live.slice().sort((a, b2) => b2.tier - a.tier || b2.kills - a.kills || a.u.uid - b2.u.uid).slice(0, 3);
        for (const t of pick) { t.growT = T + 8; t.grow0 = t.grow0 || t.u.r; t.growA = this.t; t.u.flash = 1; this.burst(t.x, t.y, '#FBBF24', 14, 260, 0.5, 7, -40); }
        if (pick[0]) { spot(pick[0].x, pick[0].y, 1.8); word(pick[0].x, pick[0].y, 'GIANT GROWTH!'); }
        this.snd('powerup', { gain: 1 });
        break;
      }
      case 'dome': {
        S.domes.push({ x: b.x, y: b.y, r: 150, team: DEF, t0: this.t, T0: T, end: T + 5, hits: [], base: true });
        this.snd('phase', { gain: 1 }); spot(b.x, b.y - 40, 1.6); word(b.x, b.y - 80, 'SHIELD DOME!');
        break;
      }
      case 'tornado': {
        const L = laneOf(c.u), s = c.u ? c.u.s : L.len * 0.5, p = laneAt(L, Math.min(L.len, s + 120));
        S.tornadoes.push({ x: p.x, y: p.y, a: Math.atan2(-p.dy, -p.dx), team: DEF, from: live[0] ? live[0].u : null, T0: T, end: T + 4, next: T, t0: this.t, r: 62 });
        this.snd('whoosh', { gain: 1 }); spot(p.x, p.y, 1.3, 3); word(p.x, p.y, 'TORNADO!');
        break;
      }
      case 'quake': {
        const L = laneOf(c.u), s = c.u ? c.u.s : L.len * 0.5, p = laneAt(L, s), a = Math.atan2(p.ny, p.nx), Lq = 110, pts = [];
        for (let i = 0; i <= 12; i++) { const ss = -Lq + i * Lq / 6, j = (hashS(this.seed, i + 7 * (S.quakes.length + 1)) / 4294967296 - 0.5) * 22; pts.push([p.x + Math.cos(a) * ss - Math.sin(a) * j, p.y + Math.sin(a) * ss + Math.cos(a) * j]); }
        S.quakes.push({ x: p.x, y: p.y, a, L: Lq, pts, team: DEF, from: live[0] ? live[0].u : null, T0: T, open: T + 0.35, close: T + 2.1, end: T + 2.6, next: T + 0.35, t0: this.t, hit: new Set() });
        this.snd('rumble', { gain: 1 }); this.shake(12); spot(p.x, p.y, 1.4, 2.6, true); word(p.x, p.y, 'EARTHQUAKE!');
        break;
      }
      case 'meteor': {
        this.tdCalls.push({ x: c.x, y: c.y, at: T + 1.1, r: 100, dmg: 30, team: DEF, from: live[0] ? live[0].u : null, kind: 'meteor' });
        this.marks.push({ kind: 'meteor', x: c.x, y: c.y, t0: this.t, T0: T, T1: T + 1.1 });
        this.snd('meteor', { gain: 1 }); spot(c.x, c.y, 1.5, 2.4, true); word(c.x, c.y, 'METEOR!');
        break;
      }
      case 'timefreeze': {
        const r = 150;
        for (const o of this.near(c.x, c.y, r)) if (o.team === ATK) { o.frozeT = T + (o.boss ? 1.5 : 3); }
        this.marks.push({ kind: 'clock', x: c.x, y: c.y, r, t0: this.t, T1: T + 3 });
        this.snd('freeze', { gain: 1 }); spot(c.x, c.y, 1.5, 2, true); word(c.x, c.y, 'TIME FREEZE!');
        break;
      }
      case 'reinforce': {
        const L = laneOf(c.u), s = Math.min(L.len - 40, (c.u ? c.u.s : L.len * 0.6) + 90);
        for (let i = 0; i < 4; i++) { const p = laneAt(L, s + (i >> 1) * 26), lat = (i % 2 ? 1 : -1) * 13, o = this.addUnit(DEF, 'knight', p.x + p.nx * lat, p.y + p.ny * lat - 0); o.rx = o.x; o.ry = o.y; o.leash = 140; o.lifeEnd = T + 14; o.max = o.hp = UNIT.knight.hp * 2; o.dropT = this.t; o.face = Math.atan2(-p.dy, -p.dx); this.burst(o.x, o.y, '#FDE68A', 10, 220, 0.5, 6, -40); }
        const p = laneAt(L, s); this.shake(8); this.snd('thud'); this.snd('clang'); spot(p.x, p.y, 1.7); word(p.x, p.y, 'REINFORCEMENTS!');
        break;
      }
      case 'chainstorm': {
        const tg = this.units.filter(o => o.team === ATK && !o.dead && !o.gone).sort((a, b2) => (b2.max - a.max) || a.uid - b2.uid).slice(0, 8);
        tg.forEach((o, i) => { this.tdCalls.push({ x: o.x, y: o.y, at: T + 0.15 * i, r: 34, dmg: 12, team: DEF, from: live[0] ? live[0].u : null, kind: 'bolt', target: o }); });
        this.snd('thunder', { gain: 1 }); this.shake(6); if (tg[0]) { spot(tg[0].x, tg[0].y, 1.2, 2); word(tg[0].x, tg[0].y, 'LIGHTNING STORM!'); }
        break;
      }
    }
  },
  // ---------- the attackers' war shaman ----------
  shamanTick() {
    const T = this.fightT;
    if (!this.shamanAt.length || T < this.shamanAt[0]) return;
    this.shamanAt.shift();
    const nAtk = this.units.filter(u => u.team === ATK && !u.dead && !u.gone);
    if (!nAtk.length) return;
    const fighting = nAtk.filter(u => u.foe || u.atBase).length, b = this.base;
    const want = {
      warcry: 0.4 + fighting * 0.15, haste: 0.3 + nAtk.length * 0.03, ward: 0.3 + this.towers.filter(t => !t.dead).length * 0.06,
      raise: this.fallenSpots.length >= 6 ? 0.5 + this.fallenSpots.length * 0.02 : -1,
      summon: b.hp > 70 && !this.summoned ? 0.9 : -1,
    };
    const used = this.stat.shaman;
    const k = SHAMAN_KEYS.map(x => [x, want[x] - (used.includes(x) ? 0.6 : 0)]).filter(([, w]) => w > 0).sort((a, c) => c[1] - a[1])[0];
    if (!k) return;
    this.shamanCast(k[0]);
  },
  shamanCast(k) {
    const T = this.fightT, Sh = SHAMAN[k];
    this.stat.shaman.push(k);
    this.card({ kind: 'shaman', text: `WAR SHAMAN · ${Sh.name}`, col: Sh.col, shaman: k });
    this.say(`THE WAR SHAMAN CASTS ${Sh.name}`, ATK);
    const c = this.crowd(140) || { x: AR.x + AR.w / 2, y: AR.y + 200 };
    if (this.camEv) this.camEv.push({ type: 'spot', x: c.x, y: c.y, prio: 66, dur: 1.6, z: 1.5 });
    this.marks.push({ kind: 'totem', x: c.x, y: c.y, t0: this.t, col: Sh.col });
    switch (k) {
      case 'warcry': this.aBuff.warcry = T + 6; this.snd('roar', { gain: 1 }); for (const u of this.units) if (u.team === ATK) u.rageT = T + 6; break;
      case 'haste': this.aBuff.haste = T + 5; this.snd('drum', { gain: 1 }); break;
      case 'ward': this.aBuff.ward = T + 5; this.snd('phase', { gain: 1 }); break;
      case 'raise': {
        const spots = this.fallenSpots.splice(-8);
        spots.forEach((p, i) => { const L = this.lanes[p.lane]; this.sp3.rises.push({ team: ATK, tb: null, x: p.x, y: p.y, at: T + 0.4 + i * 0.12, face: Math.PI / 2, tdA: { lane: p.lane, s: p.s } }); });
        this.reserve[ATK] += spots.length; this.start[ATK] += spots.length;
        this.snd('groan', { gain: 1 }); this.snd('portal', { gain: 0.6 });
        break;
      }
      case 'summon': {
        this.summoned = true;
        const kinds = ['troll', 'ogre', 'magmacolossus', 'glaciergiant', 'stormcolossus'].filter(t => UNIT[t]), type = kinds[(this.seed >>> 3) % kinds.length];
        const u = this.spawnAttacker(type, 0, null); this.start[ATK]++;
        this.burst(u.x, u.y + 30, '#FB7185', 20, 300, 0.6, 9, -40); this.snd('roar'); this.shake(10);
        if (this.camEv) this.camEv.push({ type: 'spot', follow: u, prio: 75, dur: 2, z: 1.8 });
        break;
      }
    }
  },
  // ---------- battle events and map hazards (their own dice; both sides alike, so they're fair over many videos) ----------
  planEvents() {
    const R = this.EVR, C = this.cap, ev = (this.opts.events || []).slice();
    this.tdEvents = [];
    const pickT = (a, b) => C * R.range(a, b);
    for (const e of ev) {
      const chance = e.chance ?? 0.4;
      if (!R.chance(chance)) continue;
      if (e.type === 'hazard') { const h = this.hazardKind(); if (h) this.tdEvents.push({ type: h, at: pickT(0.35, 0.7) }); }
      else this.tdEvents.push({ type: e.type, at: pickT(0.28, 0.66) });
    }
    // keep them apart
    this.tdEvents.sort((a, b) => a.at - b.at);
    for (let i = 1; i < this.tdEvents.length; i++) if (this.tdEvents[i].at - this.tdEvents[i - 1].at < 7) this.tdEvents[i].at = this.tdEvents[i - 1].at + 7;
    this.tdEvents = this.tdEvents.filter(e => e.at < C - 9);
  },
  hazardKind() {
    const m = this.opts.map;
    return { beach: 'kraken', dunes: 'sandworm', furnace: 'eruption', frozen: 'blizzard', snow: 'blizzard', forest: 'stampede', castle: 'stampede', neon: 'storm', moon: 'storm', graveyard: 'storm', swamp: 'storm', temple: 'storm', enchanted: 'storm', bombed: 'storm' }[m] || 'storm';
  },
  eventTick(h) {
    const T = this.fightT, R = this.EVR;
    for (const e of this.tdEvents) {
      if (e.done || T < e.at) continue;
      if (!e.on) { e.on = true; e.t0 = T; this.eventStart(e); }
      this.eventRun(e, h);
    }
  },
  eventStart(e) {
    const R = this.EVR, T = this.fightT, NAME = { airdrop: 'AIRDROP!', airstrike: 'AIRSTRIKE!', meteors: 'METEOR SHOWER!', kraken: 'THE KRAKEN!', sandworm: 'SANDWORM!', eruption: 'THE LAVA ERUPTS!', blizzard: 'BLIZZARD!', stampede: 'STAMPEDE!', storm: 'LIGHTNING STORM!' };
    this.stat.events.push(e.type);
    this.card({ kind: 'event', text: NAME[e.type], col: '#FDE68A' });
    this.snd('alarm', { gain: 0.6 });
    const L = this.lanes[R.int(0, this.lanes.length - 1)];
    if (e.type === 'airdrop') {
      const s = L.len * R.range(0.35, 0.7), p = laneAt(L, s), side = R.chance(0.5) ? 1 : -1;
      e.x = p.x + p.nx * side * (PATH_W / 2 + 4); e.y = p.y + p.ny * side * (PATH_W / 2 + 4); e.land = T + 1.6; e.end = T + 6; e.prize = R.pick(['gold', 'upgrade', 'tower']);
      if (this.camEv) this.camEv.push({ type: 'spot', x: e.x, y: e.y - 40, prio: 55, dur: 2.4, z: 1.6 });
    } else if (e.type === 'airstrike' || e.type === 'stampede') {
      // a line across the board (crossing the path): planes drop bombs along it / a herd thunders along it
      e.y = AR.y + AR.h * R.range(0.3, 0.7); e.dir = R.chance(0.5) ? 1 : -1; e.end = T + 2.6; e.next = T + 0.2; e.k = 0;
      if (this.camEv) this.camEv.push({ type: 'spot', x: AR.x + AR.w / 2, y: e.y, prio: 70, dur: 2.6, z: 1.15 });
    } else if (e.type === 'meteors' || e.type === 'storm') {
      e.end = T + 4; e.next = T + 0.3; e.n = 0; e.max = e.type === 'storm' ? 8 : 6;
      if (this.camEv) this.camEv.push({ type: 'spot', x: AR.x + AR.w / 2, y: AR.y + AR.h / 2, prio: 45, dur: 3.5, z: 1.04 });
    } else if (e.type === 'kraken' || e.type === 'sandworm' || e.type === 'eruption') {
      const s = L.len * R.range(0.3, 0.75), p = laneAt(L, s); e.x = p.x; e.y = p.y; e.end = T + 3; e.hitAt = T + 0.9; e.r = 90;
      if (this.camEv) this.camEv.push({ type: 'spot', x: e.x, y: e.y, prio: 70, dur: 2.5, z: 1.6, ts: 0.5, slowFor: 0.9 });
    } else if (e.type === 'blizzard') { e.end = T + 6; }
  },
  eventRun(e, h) {
    const T = this.fightT, R = this.EVR;
    if (T >= e.end) { e.done = true; e.on = false; return; }
    switch (e.type) {
      case 'airdrop': {
        if (T < e.land || e.taken) return;
        // whoever gets there first: an attacker walking past grabs it (a war cry for its side), otherwise the nearest tower claims it
        const grab = this.units.find(u => u.team === ATK && !u.dead && !u.flying && Math.hypot(u.x - e.x, u.y - e.y) < u.r + 26);
        if (grab) { e.taken = 'atk'; this.aBuff.warcry = T + 5; this.callout(grab, 'GRABBED IT!', TEAMS[ATK].c); this.say(`THE ATTACKERS GRAB THE AIRDROP: WAR CRY`, ATK); this.snd('pickup'); this.burst(e.x, e.y, TEAMS[ATK].c, 14, 240, 0.5, 7); return; }
        if (T > e.land + 2.2) {
          e.taken = 'def';
          const tws = this.towers.filter(t => !t.dead).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y));
          if (e.prize === 'gold') { this.gold += 60; this.coins.push({ x: e.x, y: e.y, t0: this.t, g: 60 }); this.say('THE DEFENDERS CLAIM THE AIRDROP: 60 GOLD', DEF); }
          else if (e.prize === 'upgrade' && tws[0] && tws[0].tier < 5) { this.upgrade(tws[0]); this.say('THE DEFENDERS CLAIM THE AIRDROP: A FREE UPGRADE', DEF); }
          else { const id = this.pickSpot(this.towerSet[0]); if (id >= 0 && this.mode !== 'laststand') { this.buildTower(this.towerSet[0], this.spots[id]); this.say('THE DEFENDERS CLAIM THE AIRDROP: A FREE TOWER', DEF); } else { this.gold += 60; } }
          this.snd('pickup'); this.burst(e.x, e.y, COL.gold, 14, 240, 0.5, 7);
        }
        return;
      }
      case 'airstrike': case 'stampede': {
        if (T < e.next || e.k >= 7) return;
        e.next = T + 0.28;
        const x = e.dir > 0 ? AR.x + 70 + e.k * 135 : AR.x + AR.w - 70 - e.k * 135; e.k++;
        // both sides alike: troops on the line and towers on the line are hit
        this.tdCalls.push({ x, y: e.y + (R.next() - 0.5) * 50, at: T, r: 64, dmg: e.type === 'airstrike' ? 9 : 7, team: 9, from: null, kind: e.type === 'airstrike' ? 'bomb' : 'stomp', both: true });
        return;
      }
      case 'meteors': case 'storm': {
        if (T < e.next || e.n >= e.max) return;
        e.next = T + 0.45; e.n++;
        // a random troop or tower (both sides alike)
        const all = this.units.filter(u => !u.dead && !u.gone && (u.team === ATK || u.tower));
        if (!all.length) return;
        const o = all[R.int(0, all.length - 1)];
        this.tdCalls.push({ x: o.x, y: o.y, at: T + (e.type === 'meteors' ? 0.8 : 0.05), r: e.type === 'meteors' ? 60 : 30, dmg: e.type === 'meteors' ? 9 : 6, team: 9, from: null, kind: e.type === 'meteors' ? 'meteor' : 'bolt', both: true, target: e.type === 'storm' ? o : null });
        if (e.type === 'meteors') this.marks.push({ kind: 'meteor', x: o.x, y: o.y, t0: this.t, T0: T, T1: T + 0.8, small: true });
        return;
      }
      case 'kraken': case 'sandworm': case 'eruption': {
        if (e.hit || T < e.hitAt) return;
        e.hit = true;
        this.tdCalls.push({ x: e.x, y: e.y, at: T, r: e.r, dmg: 10, team: 9, from: null, kind: e.type === 'eruption' ? 'meteor' : 'stomp', both: true });
        this.marks.push({ kind: e.type, x: e.x, y: e.y, t0: this.t });
        this.snd(e.type === 'kraken' ? 'splash' : 'rumble', { gain: 1 }); this.shake(14);
        return;
      }
      case 'blizzard': {
        // everyone slows: the attackers walk 40% slower and the towers fire 25% slower
        if (T >= (e.next || 0)) { e.next = T + 0.5; for (const u of this.units) if (!u.dead) { if (u.tower) u.cd += 0.12; else this.slowDown(u, 0.6, 0.6); } }
        return;
      }
    }
  },
  // the delayed blasts also cover both-sides events, lightning bolts and stomps
  blastBoth(c) {
    if (c.kind === 'bolt') { const o = c.target && !c.target.dead ? c.target : null; const x = o ? o.x : c.x, y = o ? o.y : c.y; this.bolts.push({ x0: x + 20, y0: y - 160, x1: x, y1: y, t0: this.t, col: '#E0E7FF' }); if (o) { this._shXk = 'lightning'; this.damage(o, c.dmg * (o.team === ATK && o.boss ? 1.5 : 1), c.from); this._shXk = null; } this.snd('thunder', { pan: this.pan(x), gain: 0.6 }); return; }
    const T = this.fightT;
    for (const o of this.near(c.x, c.y, c.r + 40)) {
      if (o.dead || o.gone || (o.flying && c.kind === 'stomp')) continue;
      if (!c.both && o.team === c.team) continue;
      const d = Math.hypot(o.x - c.x, o.y - c.y); if (d > c.r + o.r) continue;
      this._kind = 'blast'; this.damage(o, c.dmg * (o.tower ? 0.8 : 1) * (1 - 0.4 * d / (c.r + o.r)), c.from); this._kind = undefined;
      if (!o.dead && !o.tower) this.knock(o, c.x, c.y, 50);
    }
    if (this.shine) this.shineBoom({ kind: c.kind === 'meteor' ? 'meteor' : c.kind === 'stomp' ? 'slam' : 'bomb', x: c.x, y: c.y, splash: c.r });
    this.booms.push({ x: c.x, y: c.y, r: c.r * 0.7, t: 0 });
    this.burst(c.x, c.y, c.kind === 'stomp' ? '#B8A88A' : '#9A8F80', 12, 320, 0.5, 8);
    this.snd(c.kind === 'stomp' ? 'stomp' : 'boom', { pan: this.pan(c.x), gain: 0.6 }); this.shake(c.kind === 'meteor' ? 12 : 6);
    if (this.camEv) this.camEv.push({ type: 'blast', x: c.x, y: c.y, kind: c.kind });
  },
  // ---------- world events: the engine's, with the mirror shift made for paths ----------
  worldStart(e) {
    if (e.kind === 'mirror' && !LAYOUTS[this.layoutKey].sym) e.kind = 'flip';
    return RVB.Army.prototype.worldStart.call(this, e);
  },
  // the mirror shift: left is right, so every attacker jumps to the mirrored lane (only on layouts that are the same both ways)
  worldMirror() {
    const cx = AR.x + AR.w / 2, n = this.lanes.length;
    for (const o of this.units) {
      if (o.team !== ATK || o.dead) continue;
      o.x = 2 * cx - o.x; if (o.px !== undefined) o.px = 2 * cx - o.px; o.vx = -o.vx; o.face = Math.PI - o.face;
      if (o.lane !== undefined && !o.fly) { o.lane = n - 1 - o.lane; o.lat = -o.lat; }
      if (o.fly) o.fly.x0 = 2 * cx - o.fly.x0;
    }
    this.mirrorFx = this.t;
  },
};
// (the delayed-blast list handles both kinds)
const blast0 = TD.prototype.blast;
PLAY.blast = function (c) { if (c.both || c.kind === 'bolt') return this.blastBoth(c); return blast0.call(this, c); };
Object.assign(TD.prototype, PLAY);
module.exports = { TD };
