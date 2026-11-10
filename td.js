// Tower Clash: the tower-defence game, built on the Army Clash engine (engine.js). The engine draws every character (with its
// shine, damage marks, blood, remains and animations), runs the spells, pools, world events, the camera director and the sound;
// this file adds the board (paths, build spots, the base), the towers, the waves, the economy, the merchant and the war shaman,
// battle events, modes and the tower-defence screens (scoreboard, story card, roster strips, cards, panel, outro).
//
// Rules of the road (the same as Army Clash's): the battle moves in fixed 1/120 s ticks (Match.frame + Director); every system
// rolls its own seeded dice (separate streams, so switching one off never moves another's rolls); drawing, the camera and the
// sound never change the battle, and anything that changes the battle uses the fight clock (fightT), never the video clock (t).
'use strict';
const RVB = require('./engine.js');
const D = require('./td-data.js');
const E = RVB._;
const { AR, COL, TEAMS, UNIT, TAU, clamp, lerp, rng, roundRect, strokeText, font, spaced, easeOutCubic, easeOutBack, rgba, disc, ell, labelOf, specOf, classOf, CLASSES, drawEmblem, drawFlag, hasFlag, fmtTime, SAFE, VW, VH, isTitan, hash01 } = E;
const { LAYOUTS, TD_MAPS, TOWERS, TIER, TCLASS, WAVE_KINDS, BOSSES, SIEGE, RAIDERS, BOOK, SHAMAN, MODES } = D;

const PATH_W = 58;          // path width (px)
const DEF = 0, ATK = 1;     // teams: 0 = the defenders (towers, their swordsmen, skeletons), 1 = the attackers
const SPEEDK = 1.55;        // how much faster troops march on a path than they walk in Army Clash
const BASE_HP = 100;

// ---------- path geometry ----------
function mkLane(pts) {
  const P = pts.map(([x, y]) => [AR.x + x, AR.y + y]), cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  return { P, cum, len: cum[cum.length - 1] };
}
// the point at distance s along a lane, the direction there, and the normal
function laneAt(L, s) {
  s = clamp(s, 0, L.len);
  let i = 1; while (i < L.cum.length - 1 && L.cum[i] < s) i++;
  const a = L.P[i - 1], b = L.P[i], seg = L.cum[i] - L.cum[i - 1] || 1, k = (s - L.cum[i - 1]) / seg;
  const dx = (b[0] - a[0]) / seg, dy = (b[1] - a[1]) / seg;
  return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, dx, dy, nx: -dy, ny: dx };
}
function distToLane(L, x, y) {
  let best = Infinity, bs = 0;
  for (let i = 1; i < L.P.length; i++) {
    const a = L.P[i - 1], b = L.P[i], vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1;
    const k = clamp(((x - a[0]) * vx + (y - a[1]) * vy) / l2, 0, 1), px = a[0] + vx * k, py = a[1] + vy * k, d = Math.hypot(x - px, y - py);
    if (d < best) { best = d; bs = L.cum[i - 1] + Math.sqrt(l2) * k; }
  }
  return { d: best, s: bs };
}

// a troop's marching speed on the path (big troops are slow, but not so slow they never arrive)
const walkSpeed = type => (0.5 * (UNIT[type].speed || 60) + 46) * SPEEDK;
const sizeOf = type => {
  const U = UNIT[type];
  if (BOSSES[type] && U.rank === 0) return 'titan';
  if (U.rank === 0) return 'titan';
  if ((U.r || 12) >= 17 || (U.hp || 1) >= 20) return 'giant';
  if ((U.cost || 1) <= 1.6) return 'small';
  return 'mid';
};

// ---------- the game ----------
class TD extends RVB.Army {
  constructor(seed, opts = {}) {
    // the Army constructor sets up the engine's systems (shine, animation, world events, fire...); the armies it makes are
    // thrown away straight after and the tower-defence board is set up in their place
    super(seed, Object.assign({}, opts, { budgetMul: [0.0001, 0.0001], doctrines: ['KNIGHTS', 'KNIGHTS'], events: undefined, tribes: undefined, titans: undefined, spells: undefined, nav: undefined, minds: undefined, classes: undefined, combat: undefined, mode: undefined, skins: undefined, roster: undefined, formations: undefined }));
    const o = this.opts;
    this.key = 'td'; this.title = 'TOWER CLASH'; this.label = 'Tower Clash';
    this.units = []; this.arrows = []; this.alive = [0, 0]; this.reserve = [0, 0]; this.start = [0, 0]; this.waves = [[], []];
    this.alive[9] = 0; this.reserve[9] = 0;
    this.ext = false; this.uidN = 0;
    // dice: one stream per system (td.* streams never touch the engine's own)
    const S = s => rng(((seed >>> 0) ^ s) >>> 0);
    this.WVR = S(0x7A11E5); this.BLD = S(0xB01D5); this.EVR = S(0xE7E275); this.SPR = S(0x5BE11); this.SHR = S(0x5A3A11); this.MKR = S(0x3E8C4);
    this.mode = o.tdMode && MODES[o.tdMode] && o.tdMode !== 'classic' ? o.tdMode : null;
    this.hook = this.mode ? MODES[this.mode].hook : (o.hook || 'WILL THE BASE SURVIVE?');
    // the board
    this.layoutKey = LAYOUTS[o.layout] ? o.layout : 'snake';
    const LY = LAYOUTS[this.layoutKey];
    this.lanes = LY.lanes.map(mkLane);
    this.base = { x: AR.x + LY.base[0], y: AR.y + LY.base[1], hp: BASE_HP, max: BASE_HP, r: 62, hitT: -9, style: (TD_MAPS[o.map] || TD_MAPS.forest).base, shake: 0 };
    this.tdMap = TD_MAPS[o.map] || TD_MAPS.forest;
    this.lavaBand = LY.lava ? { x: AR.x + LY.lava[0], y: AR.y + LY.lava[1], w: LY.lava[2], h: LY.lava[3] } : null;
    this.spots = this.findSpots();
    this.zones = this.groundZones();
    // the sides: the defenders' order and towers, the attackers' warband and waves
    this.defOrder = o.defOrder || D.ORDERS[0];
    this.atkBand = o.atkBand || D.WARBANDS[0];
    this.towerSet = (o.towers || D.DEF_LINEUPS[0].towers).filter(k => TOWERS[k]);
    this.power = o.power || 1;      // attacker strength (tuned on the spot)
    this.gold = 0; this.goldShown = 0; this.mana = 0;
    this.towers = []; this.blockers = []; this.walls = []; this.rubble = []; this.coins = []; this.cards = []; this.ticker = []; this.bolts = []; this.tdCalls = []; this.marks = [];
    this.stat = { built: 0, upgrades: 0, big: 0, spells: [], shaman: [], lowBase: 100, breaches: 0, fell: [], towerKills: {}, leadSwings: 0, events: [], maxStreak: 0, rebuilt: 0, walls: 0 };
    this.facts = { low: [1, 1], falls: [], drops: [] };
    this.best = [null, null];
    // the battle's length: the fight is paced to end close to fightSeconds (cap), with a final push before it
    this.fixed = o.fixedLength || 63;
    this.cap = this.fixed - 3;
    this.pushAt = [this.cap - 10];
    this.hpScale = 1;
    // engine systems the tower-defence game uses
    this.g5 = { pools: [], fx: [], globs: [], graves: [] };
    this.sp3 = { fx: [], domes: [], tornadoes: [], quakes: [], rises: [], flasks: [] };
    this.spellsOn = true;
    this.calls = []; this.fields = []; this.beams = []; this.clouds = []; this.fires = [];
    this.remainsOn = !!o.remains;
    if (o.affinity && o.affinity.on) { const A = o.affinity; this.affOn = true; this.aff = { heal: A.heal ?? 1, boost: A.boost ?? 1.3, speed: A.speed ?? 1.15, seconds: A.seconds ?? 3 }; }
    if (!this.tdMap.fire) this.fireOn = false;
    this.ui2 = true;
    this.cmb = { roster: true, moves: true };   // (the engine's labels and callouts are on)
    this.setupBoard();
    this.planWaves();
    this.planSpells();
    this.planEvents();
    if (this.ground) this.paintGround(this.ground, 1);
    this.mapLayer = null; this._hiL = null;
  }

  // ---------- the board ----------
  // build spots: off the path, close enough to it to matter, spread out, best coverage first (no dice)
  findSpots() {
    const out = [], cand = [];
    for (let y = 70; y <= 900; y += 28) for (let x = 60; x <= 900; x += 28) {
      const X = AR.x + x, Y = AR.y + y;
      let dmin = Infinity; for (const L of this.lanes) dmin = Math.min(dmin, distToLane(L, X, Y).d);
      if (dmin < PATH_W / 2 + 34 || dmin > 150) continue;
      if (Math.hypot(X - this.base.x, Y - this.base.y) < 120) continue;
      if (this.lavaBand && Y > this.lavaBand.y - 30 && Y < this.lavaBand.y + this.lavaBand.h + 30) continue;
      // coverage: how much path (all lanes) is within 200 px, sampled every 20 px
      let cov = 0;
      for (const L of this.lanes) for (let s = 0; s < L.len; s += 20) { const p = laneAt(L, s); if (Math.hypot(p.x - X, p.y - Y) < 200 && p.y > AR.y) cov += 1 + s / L.len; }
      cand.push({ x: X, y: Y, cov });
    }
    cand.sort((a, b) => b.cov - a.cov || a.y - b.y || a.x - b.x);
    for (const c of cand) {
      if (out.every(o => Math.hypot(o.x - c.x, o.y - c.y) >= 104)) out.push({ x: c.x, y: c.y, cov: c.cov, id: out.length, tower: null });
      if (out.length >= 14) break;
    }
    return out;
  }
  // ground patches that do something (ice: slide faster, sand and mud: slower, lava vents: flare and burn); fixed places per layout
  groundZones() {
    const g = this.tdMap.ground, z = [];
    if (!g) return z;
    for (const L of this.lanes) for (let k = 1; k <= 3; k++) {
      const s = L.len * (0.22 + 0.22 * k) % L.len, p = laneAt(L, s);
      if (p.y < AR.y + 40) continue;
      if (g === 'lava') z.push({ kind: 'lava', x: p.x + p.nx * (PATH_W / 2 + 26), y: p.y + p.ny * (PATH_W / 2 + 26), r: 34, ph: k * 1.7 });
      else z.push({ kind: g, x: p.x, y: p.y, r: 52, s0: s - 52, s1: s + 52, lane: L });
    }
    return z;
  }
  setupBoard() {
    const o = this.opts, R = this.BLD;
    // the defenders start with a few towers: the order's first towers on the best spots (Last Tower Standing: three, upgraded)
    const n0 = 3, first = this.towerSet.slice(0, n0);
    // (one of the starting towers can always hit fliers)
    if (!first.some(k => !TOWERS[k].ground)) first[2] = this.towerSet.find(k => !TOWERS[k].ground) || 'archer';
    for (const k of first) { const id = this.pickSpot(k); if (id >= 0) this.buildTower(k, this.spots[id], true); }
    if (this.mode === 'laststand') for (const t of this.towers) { t.tier = 3; this.applyTier(t); }
    this.gold = this.mode === 'laststand' ? 80 : 100;
    // a wall on the path in front of the base, for the barracks to hold (walls are bought too; one to start on some maps)
    if (R.chance(0.5)) this.addWall(0.82);
    // traits
    const dt = this.defOrder[2], at = this.atkBand[2];
    this.trait = { def: dt, atk: at };
    if (dt === 'stubborn') for (const t of this.towers) { t.u.max *= 1.15; t.u.hp = t.u.max; }
    this.start[0] = this.towers.length;
  }
  // the best free spot for a tower kind (no dice): coverage, with ranged-out spots for long-range towers
  pickSpot(kind) {
    const T = TOWERS[kind], free = this.spots.filter(s => !s.tower && !s.wreck);
    if (!free.length) return -1;
    let best = free[0], bv = -Infinity;
    for (const s of free) {
      let v = s.cov;
      // spread out: a little less for spots right next to another tower
      for (const t of this.towers) if (!t.dead) { const d = Math.hypot(t.x - s.x, t.y - s.y); if (d < 180) v -= (180 - d) * 0.05; }
      if (T.cls === 'summon') { let dmin = Infinity; for (const L of this.lanes) dmin = Math.min(dmin, distToLane(L, s.x, s.y).d); v -= dmin * 0.1; }
      if (v > bv) { bv = v; best = s; }
    }
    return best.id;
  }
  addWall(frac, lane = 0) {
    const L = this.lanes[lane % this.lanes.length], s = L.len * frac, p = laneAt(L, s);
    const w = { lane: lane % this.lanes.length, s, x: p.x, y: p.y, a: Math.atan2(p.dy, p.dx), hp: 60, max: 60, t0: this.t, hitT: -9, dead: false };
    this.walls.push(w); this.stat.walls++;
    return w;
  }

  // ---------- units ----------
  // (the engine's own addUnit also runs the Army-only systems; this one makes a plain troop the engine can draw and hurt)
  addUnit(team, type, x, y) {
    const U = UNIT[type]; if (!U) return null;
    const R = this.R, hp = U.hp;
    const pace = 1 + (R.chance(0.5) ? 1 : -1) * R.range(0.03, 0.07);
    const u = { team, type, x, y, flying: !!U.flying, pace, gait: R.range(0, TAU), vx: 0, vy: 0, r: U.r, hp, max: hp, cd: R.range(0, U.cd || 1), retarget: 0, target: null, flash: 0, lunge: 0,
      face: team === DEF ? -Math.PI / 2 : Math.PI / 2, dead: false, m: U.r * U.r, uid: ++this.uidN, born: this.fightT };
    this.units.push(u);
    if (!U.uncounted) this.alive[team]++;
    return u;
  }
  // a tower: the character on top is a troop the engine draws (so it gets its shine and animation); the tower under it is drawn here
  buildTower(kind, spot, quiet) {
    if (!spot || spot.tower) return null;
    const T = TOWERS[kind], ch = T.char, U = UNIT[ch];
    const u = this.addUnit(DEF, ch, spot.x, spot.y);
    u.tower = true; u.tk = kind; u.r = Math.max(9, Math.min(17, U.r * (T.rs || 1)));
    u.max = 60; u.hp = u.max; u.cd = 0.4 + this.BLD.range(0, 0.6); u.face = -Math.PI / 2;
    const tw = { kind, def: T, u, x: spot.x, y: spot.y, spot, tier: 1, el: null, t0: this.t, T0: this.fightT, kills: 0, dead: false, upT: -9, bigT: -9, aimA: -Math.PI / 2, minions: [], webT: 0, titanKills: 0 };
    u.tw = tw; spot.tower = tw; spot.wreck = false;
    this.towers.push(tw);
    if (T.shot === 'spawn' && T.spawn === 'swordsman') tw.rally = this.rallyFor(tw);
    if (this.trait && this.trait.def === 'stubborn') { u.max *= 1.15; u.hp = u.max; }
    if (!quiet) {
      this.stat.built++;
      // it drops in with dust and a thud
      tw.drop = this.t;
      this.burst(spot.x, spot.y, '#B8A88A', 16, 260, 0.6, 9, 60); this.shake(6); this.snd('thud', { pan: this.pan(spot.x) });
      this.say(`${T.name} BUILT`, DEF);
      if (this.camEv) this.camEv.push({ type: 'spot', x: spot.x, y: spot.y, prio: 52, dur: 1.5, z: 1.7 });
    }
    return tw;
  }
  applyTier(tw) {
    const u = tw.u, k = tw.tier, f = u.hp / u.max;
    u.max = 60 * TIER.hp[k] * (this.trait && this.trait.def === 'stubborn' ? 1.15 : 1); u.hp = u.max * Math.max(f, 0.7);
    u.dmgK = TIER.dmg[k];
  }
  rallyFor(tw) {
    let best = null, bd = Infinity;
    for (let li = 0; li < this.lanes.length; li++) { const r = distToLane(this.lanes[li], tw.x, tw.y); if (r.d < bd) { bd = r.d; best = { lane: li, s: r.s }; } }
    return best;
  }
  pan(x) { return (x - AR.x) / AR.w * 1.4 - 0.7; }
  say(text, team) { this.ticker.unshift({ text, team, t: this.t }); if (this.ticker.length > 6) this.ticker.length = 6; }
  // a card (wave, upgrade, spell, merchant): one at a time, queued (looks only)
  card(o) { const q = this.cards, last = q.length ? q[q.length - 1] : null, at = last ? Math.max(this.t, last.t0 + (last.dur || 1.9)) : this.t; q.push(Object.assign({ t0: at, dur: 1.9 }, o)); if (q.length > 8) q.shift(); }
  callout(u, text, col) {
    const T = this.fightT;
    if (T < (u.coAt || 0)) return;
    if (this.t < 4.3) return;
    if (T >= (this.coWin || 0)) { this.coWin = T + 1; this.coN = 0; }
    if (this.coN >= 2 || T < ((this.coTxt || (this.coTxt = {}))[text] || 0)) return;
    this.coN++; u.coAt = T + 1.5; this.coTxt[text] = T + 0.7;
    this.float(u.x, u.y - u.r - 10, text, col, 22, 0.8);
  }
  // damage numbers: at most three a second (looks only)
  dmgNum(u, dmg, col) {
    if (this.t < 4.3 || dmg < 2) return;
    if (this.fightT >= (this.dnWin || 0)) { this.dnWin = this.fightT + 1; this.dnN = 0; }
    if (this.dnN >= 3) return;
    this.dnN++; this.float(u.x + (hash01(u.uid, this.frameNo) - 0.5) * 16, u.y - u.r - 6, String(Math.round(dmg)), col || '#FFFFFF', 20, 0.7);
  }
}

module.exports = { TD, laneAt, distToLane, mkLane, walkSpeed, sizeOf, PATH_W, DEF, ATK, BASE_HP };
