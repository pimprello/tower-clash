// Tower Clash: Rellz's picks (rules.picks, 2026-11-16: 26 updates for all three Clash games), fitted to tower defence.
//
//   troops      Stone Golems (split in two when hit hard), Bards (their war song speeds the march), Plague Doctors (poison
//               flasks: the cloud slows defenders and chokes the towers inside it), Ghost Knights (walk straight through a blocker,
//               once), Traitors (at half health they change sides and fight for the base), Bomb Rats (a pack of eight that runs at
//               the nearest tower and blows up on it) and the Battering Ram (goes straight for walls and the gate, ignoring blockers)
//               join the waves; Mimic Chests sit beside the path as crates until an attacker comes close, then bite and fight
//   spells      the merchant also sells Lightning Chain, Frost Nova, Healing Rain (towers and defenders under it mend), Smoke Bomb
//               (attackers shooting from inside it miss every other shot), Shield Wall (a line of shields across the path that stops
//               the attackers' shots at the towers) and Vampire Bite (for 8 s the base mends a share of what the towers deal)
//   modes       King of the Hill (attackers holding the hill on the path score; held long enough, the base falls), Tug of War (a knot
//               on the path that attackers push towards the base and kills push back), Siege (a castle gate and walls in front of
//               the base); Boss Rush was already here. Last Stand: the base below a fifth fights back (every tower enraged), and an
//               attack down to its last troop goes berserk
//   looks       weather, dusk, the commentator's cues and the crowd come from the shared engine and commentary.js; the MVP card is
//               the best tower
//
// Everything is off unless rules.picks is on (old seeds play as before). Battle logic runs on fightT with its own dice
// (seed ^ 0x91C4A5); the looks have their own dice.
'use strict';
const RVB = require('./engine.js');
const D = require('./td-data.js');
const { TD, laneAt, distToLane, walkSpeed, sizeOf, PATH_W, DEF, ATK } = require('./td.js');
const E = RVB._;
const { AR, COL, TEAMS, UNIT, TAU, clamp, labelOf, isTitan, rng, roundRect, font, strokeText, easeOutCubic, easeOutBack, VW } = E;

// the six new spells for the merchant (the engine knows them as chain, nova, rain, smoke, shieldwall, vamp)
const PK_BOOK = {
  pkchain: { name: 'LIGHTNING CHAIN', price: 40, col: '#C4B5FD', say: 'a bolt that jumps from troop to troop' },
  pknova: { name: 'FROST NOVA', price: 45, col: '#9BE7FF', say: 'everything round the busiest tower freezes for 3 s' },
  pkrain: { name: 'HEALING RAIN', price: 35, col: '#86EFAC', say: 'towers and defenders under the cloud mend' },
  pksmoke: { name: 'SMOKE BOMB', price: 30, col: '#CBD5E1', say: 'attackers shooting from the smoke miss every other shot' },
  pkwall: { name: 'SHIELD WALL', price: 35, col: '#93C5FD', say: 'shields across the path stop shots at the towers' },
  pkvamp: { name: 'VAMPIRE BITE', price: 40, col: '#F87171', say: 'the base mends a share of what the towers deal' },
};
const PK_KEYS = Object.keys(PK_BOOK);
Object.assign(D.BOOK, PK_BOOK);   // (names and colours for the cards; only offered with picks on)
// the new troops: which waves they join (one or two a wave, by the picks' own dice)
const JOIN = { infantry: ['traitor', 'bard'], knights: ['ghostknight', 'bard'], mages: ['plaguedoctor'], giants: ['golem'], machines: ['ram'], sappers: ['bombrats', 'ram'], swarm: ['bombrats'], cavalry: ['traitor'] };
const PKMODES = {
  hill: { name: 'KING OF THE HILL', hook: 'HOLD THE HILL!', line: 'King of the Hill: a hill on the path; while the attackers hold it they score, and if they hold it long enough the base falls.' },
  tug: { name: 'TUG OF WAR', hook: 'TUG OF WAR!', line: 'Tug of War: a knot on the path that the attackers push towards the base and every kill pushes back; if it reaches the walls, the base falls.' },
  siege: { name: 'SIEGE', hook: 'BREAK THE GATE!', line: 'Siege: a castle gate and walls stand in front of the base; the attackers have to break through them.' },
};
Object.assign(D.MODES, PKMODES);

const wrap = (name, fn) => { const orig = TD.prototype[name]; if (!orig) return; TD.prototype[name] = function (...a) { return fn.call(this, orig, ...a); }; };

const PICKS = {
  // the board's extras, once the board is up
  tpkInit() {
    const P = this.pk;
    this.tpk = true; this.PKR = rng(((this.seed >>> 0) ^ 0x91C4A5) >>> 0);
    this.tpS = { hill: null, tug: null, mimics: [], ls: false, lsA: false, vampT: 0, sAt: 0 };
    const L0 = this.lanes[0];
    if (this.mode === 'hill') { const p = laneAt(L0, L0.len * 0.55); this.tpS.hill = { lane: 0, s: L0.len * 0.55, x: p.x, y: p.y, r: 92, score: 0, goal: P.hillTarget ?? 25, held: false, mp: false }; }
    if (this.mode === 'tug') this.tpS.tug = { k: 0.5, mp: false };
    if (this.mode === 'siege') {
      // the gate and walls: a heavy gate across every lane near the base, a wall further out
      for (let l = 0; l < this.lanes.length; l++) {
        const g = this.addWall(0.84, l); g.gate = true; g.max = g.hp = 60 * 3.2 * (P.wallHp ?? 1);
        const w = this.addWall(0.62, l); w.max = w.hp = 60 * 1.6 * (P.wallHp ?? 1);
      }
      this.stat.walls = 0;
    }
    // mimic chests: two crates beside the path, a little way down it
    if (P.mimic !== false) for (const f of [0.34, 0.68]) {
      const L = this.lanes[Math.round(f * 7) % this.lanes.length], p = laneAt(L, L.len * f), side = this.PKR.chance(0.5) ? 1 : -1, off = PATH_W / 2 + 20;
      const m = this.addUnit(DEF, 'mimic', p.x + p.nx * off * side, p.y + p.ny * off * side);
      if (!m) continue;
      m.disguised = true; m.riseEnd = 1e9; m.pkMimic = true; m.rx = m.x; m.ry = m.y; m.leash = 120; m.face = Math.atan2(-p.ny * side, -p.nx * side); m.max = m.hp = UNIT.mimic.hp * 3;
      this.tpS.mimics.push(m);
    }
  },
  // the new troops join the waves (their own dice)
  tpkWaves() {
    const R = this.PKR;
    for (const w of this.plan) {
      if (w.boss) { if (this.mode === 'siege' && UNIT.ram) w.list.splice(1, 0, 'ram'); continue; }
      const pool = (JOIN[w.kind] || []).filter(k => k === 'bombrats' ? UNIT.bombrat : UNIT[k]);
      if (!pool.length || !R.chance(0.75)) continue;
      const k = pool[R.int(0, pool.length - 1)];
      if (k === 'bombrats') { const at = Math.floor(w.list.length * 0.4); w.list.splice(at, 0, ...Array(this.pk.rats || 8).fill('bombrat')); }
      else { const n = k === 'golem' || k === 'ram' ? 1 : R.int(1, 2); for (let i = 0; i < n; i++) w.list.splice(Math.floor(w.list.length * (0.3 + 0.4 * i)), 0, k); }
    }
    this.start[ATK] = this.plan.reduce((s, w) => s + w.list.length, 0);
    this.reserve[ATK] = this.start[ATK];
  },
  // the attackers' new moves (true when the troop's tick is done)
  tpkAct(u, h) {
    const T = this.fightT, U = UNIT[u.type];
    if (this.held(u)) return false;
    if (u.type === 'bombrat') {
      // a bomb rat runs at the nearest tower beside the path and blows up on it
      const t = this.nearTower(u, 170);
      if (!t) return false;
      const tg = t.u, dx = tg.x - u.x, dy = tg.y - u.y, d = Math.hypot(dx, dy) || 1, v = this.speedOf(u) * 1.2;
      u.vx = dx / d * v; u.vy = dy / d * v; u.x += u.vx * h; u.y += u.vy * h; this.turn(u, Math.atan2(dy, dx), h);
      if (d < u.r + tg.r + 6) {
        this.blast({ x: u.x, y: u.y, r: 44, dmg: 0, team: ATK, from: u, kind: 'bomb' });
        this._kind = 'blast'; this.damage(tg, tg.max * 0.12, u); this._kind = undefined;
        if (T >= (this.tpS.ratSay || 0)) { this.tpS.ratSay = T + 3; this.callout(tg, 'RAT BOMB!', '#FF8A1F'); }
        u.hp = 0; this.damage(u, 1, null);
      }
      return true;
    }
    if (u.type === 'plaguedoctor' && T >= (u.pkAt ?? (u.pkAt = T + 2 + (u.uid % 5) * 0.4))) {
      // a flask at the nearest tower or the thickest knot of defenders: the cloud lingers, slows them and chokes the towers
      const t = this.nearTower(u, 240);
      if (t) {
        u.pkAt = T + (U.plague || 6); u.lunge = 1;
        this.pkS.flasks.push({ x0: u.x, y0: u.y, x: t.u.x, y: t.u.y, T0: T, at: T + 0.55, team: ATK, from: u, t0: this.t });
        this.snd('swish', { pan: this.pan(u.x) }); this.callout(u, 'PLAGUE!', '#A3E635');
      } else u.pkAt = T + 1;
    }
    if (u.type === 'ghostknight' && !u.phaseUsed && u.foe && !u.foe.dead) {
      // held up by a blocker: once a battle it walks straight through for two seconds
      u.stuckT = (u.stuckT || 0) + h;
      if (u.stuckT > 0.45) { u.phaseUsed = true; u.phaseEnd = T + (U.phaseWalk || 2); u.ghost = true; this.callout(u, 'GHOST WALK!', '#E2E8F0'); this.snd('portal', { pan: this.pan(u.x) }); this.pkCue('spell', u); }
    } else if (u.type === 'ghostknight') u.stuckT = 0;
    return false;
  },
  // the war song, the clouds, the rain, the hill, the knot, the last stands and the mimics (every tick)
  tpkStep(h) {
    const T = this.fightT, S = this.pkS, P = this.pk, Q = this.tpS;
    for (const f of S.flasks) if (!f.done && T >= f.at) {
      f.done = true;
      S.clouds.push({ x: f.x, y: f.y, r: P.cloudR ?? 72, T0: T, end: T + (P.cloudSecs ?? 5), team: f.team, from: f.from, t0: this.t });
      this.snd('splash', { pan: this.pan(f.x) }); this.burst(f.x, f.y, '#A3E635', 12, 220, 0.5, 6);
    }
    if (T >= Q.sAt) {
      Q.sAt = T + 0.1;
      for (const c of S.clouds) if (T < c.end) for (const o of this.near(c.x, c.y, c.r)) {
        if (o.dead || o.team === c.team) continue;
        if (o.tower) o.smogT = T + 0.25; else o.pkSlowT = T + 0.25;
      }
      for (const r of S.rains) if (T < r.end) for (const o of this.near(r.x, r.y, r.r)) if (!o.dead && o.team === r.team && o.hp < o.max) { o.hp = Math.min(o.max, o.hp + o.max * (P.rainHeal ?? 0.06) / 10); if (this.FX.chance(0.08)) o.healFlash = 0.6; }
      S.clouds = S.clouds.filter(c => T < c.end); S.rains = S.rains.filter(c => T < c.end); S.smokes = S.smokes.filter(c => T < c.end + 0.8); S.walls = S.walls.filter(c => T < c.end + 0.6);
      S.flasks = S.flasks.filter(f => !f.done);
      // the bards' war song: attackers near a bard march faster; every 9 s it bursts into a war cry
      if (P.bard !== false) for (const b of this.units) {
        if (b.dead || b.type !== 'bard' || b.team !== ATK) continue;
        const big = T >= (b.cryAt ?? (b.cryAt = T + 4 + (b.uid % 5)));
        if (big) { b.cryAt = T + 9; b.cryT = T + 3; this.callout(b, 'WAR SONG!', '#86EFAC'); this.snd('drum', {}); }
        for (const o of this.near(b.x, b.y, big ? 200 : 160)) if (o.team === ATK && !o.dead) { o.songT = T + 0.6; if (b.cryT > T) o.songBig = b.cryT; }
      }
      // mimics: an attacker comes close, and the crate bites
      for (const m of Q.mimics) {
        if (m.dead || !m.disguised) continue;
        const o = this.units.find(x => x.team === ATK && !x.dead && !x.gone && !x.flying && Math.hypot(x.x - m.x, x.y - m.y) < m.r + x.r + 40);
        if (!o) continue;
        m.disguised = false; m.riseEnd = 0; m.lunge = 1; m.flash = 1;
        const sz = o.size || sizeOf(o.type);
        this.damage(o, sz === 'small' ? o.max : sz === 'mid' ? o.max * 0.45 : UNIT.mimic.dmg * (P.mimicBite ?? 3), m);
        this.callout(m, 'MIMIC!', '#FBBF24'); this.snd('chomp', { pan: this.pan(m.x) }); this.shake(5);
        if (this.camEv) this.camEv.push({ type: 'spot', x: m.x, y: m.y, prio: 66, dur: 1.3, z: 2 });
        this.pkCue('bighit', m);
      }
    }
    // the hill: attackers on it (more of them than defenders) score; a score reached early is match point, the base falls in the
    // last seconds if they still hold it
    const H = Q.hill;
    if (H && this.phase === 'fight') {
      let a = 0, d = 0;
      for (const o of this.near(H.x, H.y, H.r)) if (!o.dead && !o.gone && !o.flying && !o.tower) { if (o.team === ATK) a++; else d++; }
      const held = a > d && a > 0;
      if (held !== H.held) { H.held = held; if (held) { this.chapter('THE ATTACKERS TAKE THE HILL', TEAMS[ATK].c); this.snd('bell'); } }
      if (held) H.score += h;
      if (H.score >= H.goal && !H.mp) { H.mp = true; this.card({ text: 'MATCH POINT: THE HILL!', col: TEAMS[ATK].c, big: true, dur: 2 }); this.snd('alarm'); }
      if (H.score >= H.goal && held && T >= this.cap - (P.winFrom ?? 9)) { this.base.hp = 0; this.lastDeath = { t: T, x: this.base.x, y: this.base.y, uid: -1, type: 'base', team: DEF }; return this.finish(ATK); }
    }
    // the knot: pushed towards the base by attackers past it, back by kills near it
    const G = Q.tug;
    if (G && this.phase === 'fight' && T >= (G.at || 0)) {
      G.at = T + 0.05;
      const L = this.lanes[0], ks = L.len * G.k, p = laneAt(L, ks);
      let a = 0; for (const o of this.near(p.x, p.y, 110)) if (o.team === ATK && !o.dead && !o.gone && !o.flying) a++;
      const kills = this.killLog.length + (this.killLogShifted || 0), dk = kills - (G.kills ?? kills); G.kills = kills;
      G.k = clamp(G.k + a * 0.0009 - dk * 0.012, 0.15, 0.95);
      G.x = p.x; G.y = p.y;
      if (G.k >= 0.95 && !G.mp) { G.mp = true; this.card({ text: 'THE KNOT IS AT THE WALLS!', col: TEAMS[ATK].c, big: true, dur: 2 }); this.snd('alarm'); }
      if (G.k >= 0.95 && T >= this.cap - (P.winFrom ?? 9)) { this.base.hp = 0; this.lastDeath = { t: T, x: this.base.x, y: this.base.y, uid: -1, type: 'base', team: DEF }; return this.finish(ATK); }
    }
    // the last stands: the base below a fifth enrages every tower for 6 s; an attack down to its last troop goes berserk
    if (P.lastStand !== false && this.phase === 'fight') {
      const b = this.base;
      if (!Q.ls && b.hp > 0 && b.hp < 20 && T > 15) {
        Q.ls = true;
        for (const t of this.towers) if (!t.dead) { t.u.rageT = T + 6; t.u.flash = 1; }
        this.card({ text: "THE BASE'S LAST STAND!", col: TEAMS[DEF].c, big: true, dur: 2 }); this.snd('roar', { gain: 1 });
        if (this.camEv) this.camEv.push({ type: 'spot', x: b.x, y: b.y - 60, prio: 88, dur: 2, z: 1.7, ts: 0.45, slowFor: 0.9 });
        this.pkCue('last', null);
      }
      if (!Q.lsA && this.plan.every(w => w.done) && this.reserve[ATK] === 0) {
        const left = this.units.filter(u => u.team === ATK && !u.dead && !u.gone);
        if (left.length === 1 && T > 15) {
          Q.lsA = true; const u = left[0];
          u.rageT = T + 8; u.lsT = T + 8; u.hp = Math.min(u.max, u.hp + u.max * 0.35); u.flash = 1;
          this.card({ text: 'ONE LEFT: LAST STAND!', col: TEAMS[ATK].c, big: true, dur: 1.8 }); this.snd('roar', { gain: 1 });
          if (this.camEv) this.camEv.push({ type: 'spot', follow: u, x: u.x, y: u.y, prio: 89, dur: 2.2, z: 2.1, ts: 0.45, slowFor: 1 });
          this.pkCue('last', u);
        }
      }
    }
  },
  // the golem's two halves walk on down the same path
  pkSplit(u) {
    u.split = true;
    const half = Math.max(4, u.hp * 0.5);
    for (const sd of [-1, 1]) {
      const o = this.addUnit(u.team, 'golemling', u.x + Math.cos(u.face + Math.PI / 2) * sd * 20, u.y + Math.sin(u.face + Math.PI / 2) * sd * 20);
      if (!o) continue;
      if (u.team === ATK) { o.lane = u.lane; o.s = Math.max(0, (u.s || 0) - 6); o.lat = clamp((u.lat || 0) + sd * 14, -PATH_W / 2 + 18, PATH_W / 2 - 18); o.size = 'mid'; o.vk = walkSpeed('golemling') * this.spdK; }
      // (a defenders' golem, from the crystal: its halves hold the same spot)
      else { o.rx = (u.rx ?? u.x) + sd * 20; o.ry = u.ry ?? u.y; o.leash = u.leash || 120; o.lifeEnd = u.lifeEnd; o.summoned = u.summoned; }
      o.max = Math.max(half, u.max * 0.45); o.hp = half; o.split = true; o.face = u.face; o.growT0 = this.t; o.summoned = true;
    }
    u.hp = 0; u.gone = true; u.dead = true; this.alive[u.team]--;
    this.burst(u.x, u.y, '#9CA3AF', 22, 380, 0.7, 9, 200); this.shake(9); this.snd('stomp', { gain: 1 });
    this.card({ text: 'THE STONE GOLEM SPLITS IN TWO!', col: TEAMS[u.team].c, dur: 1.6 });
    if (this.camEv) this.camEv.push({ type: 'spot', x: u.x, y: u.y, prio: 64, dur: 1.4, z: 1.9 });
    this.pkCue('split', u);
  },
  // a traitor at half health: it turns round and fights for the base
  pkTurn(u) {
    if (u.team !== ATK || u.boss) return;
    u.turned = true; u.turnFrom = ATK; u.turnT0 = this.t;
    u.team = DEF; this.alive[ATK]--; this.alive[DEF]++;
    u.rx = u.x; u.ry = u.y; u.leash = 170; u.foe = null; u.target = null; u.atBase = false; u.fly = null;
    u.hp = Math.min(u.max, u.hp + u.max * 0.2);
    this.burst(u.x, u.y, TEAMS[DEF].c, 14, 220, 0.5, 6);
    this.callout(u, 'TRAITOR!', TEAMS[DEF].c); this.snd('alarm', {});
    this.card({ text: 'A TRAITOR JOINS THE DEFENCE!', col: TEAMS[DEF].c, dur: 1.6 });
    if (this.camEv) this.camEv.push({ type: 'spot', follow: u, x: u.x, y: u.y, prio: 62, dur: 1.4, z: 2 });
    this.pkCue('traitor', u);
  },
  // the new spells
  tpkWant(k) {
    const c = this.crowd(), packed = c ? c.n : 0, b = this.base;
    const shooters = this.units.filter(u => u.team === ATK && !u.dead && UNIT[u.type].ranged).length;
    const hurt = this.towers.filter(t => !t.dead).reduce((s, t) => s + (1 - t.u.hp / t.u.max), 0);
    switch (k) {
      case 'pkchain': return 0.35 + packed * 0.08;
      case 'pknova': return 0.3 + packed * 0.1;
      case 'pkrain': return 0.2 + hurt * 0.6 + (1 - b.hp / b.max) * 0.6;
      case 'pksmoke': return shooters * 0.18;
      case 'pkwall': return 0.15 + shooters * 0.16;
      case 'pkvamp': return 0.25 + (1 - b.hp / b.max) * 1.2;
    }
    return 0.3;
  },
  tpkCast(k) {
    const T = this.fightT, S = this.pkS, P = this.pk, b = this.base, c = this.crowd() || { x: b.x, y: b.y - 200, n: 0, u: null, foes: [] };
    const col = PK_BOOK[k].col, live = this.towers.filter(t => !t.dead);
    const spot = (x, y, z) => { if (this.camEv) this.camEv.push({ type: 'spot', x, y, prio: 81, dur: 1.8, z: z || 1.5 }); };
    const word = (x, y, text) => this.float(x, y - 30, text, col, 30, 1.1);
    const foes = this.units.filter(o => !o.dead && !o.gone && o.team === ATK);
    // the tower nearest the crowd (the busiest one)
    const busy = live.length ? live.reduce((a, t) => (Math.hypot(t.x - c.x, t.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? t : a)) : null;
    switch (k) {
      case 'pkchain': {
        if (!foes.length) break;
        let cur = c.u || foes[0]; const hit = new Set(), pts = [[c.x, c.y - 260]]; let dmg = (P.chainDmg ?? 5) * 2;
        for (let i = 0; i < (P.chainJumps ?? 4) + 1 && cur; i++) {
          hit.add(cur); pts.push([cur.x, cur.y]);
          if (this.affOn) this._elK = 'zap';
          this._kind = 'blast'; this.damage(cur, dmg, busy ? busy.u : null); this._kind = undefined; cur.zapT = T + 0.4;
          if (this.affOn) this._elK = null;
          dmg *= 0.85;
          let nx = null, nd = 170 * 170;
          for (const o of foes) { if (hit.has(o) || o.dead) continue; const dd = (o.x - cur.x) ** 2 + (o.y - cur.y) ** 2; if (dd < nd || (dd === nd && nx && o.uid < nx.uid)) { nd = dd; nx = o; } }
          cur = nx;
        }
        S.fx.push({ kind: 'chain', pts, t0: this.t });
        this.snd('zap', { gain: 1 }); this.shake(6); spot(c.x, c.y); word(c.x, c.y, 'LIGHTNING CHAIN!'); this.pkCue('spell', null);
        break;
      }
      case 'pknova': {
        const p = busy ? { x: (busy.x + c.x) / 2, y: (busy.y + c.y) / 2 } : c, R = P.novaR ?? 160, sec = P.novaSecs ?? 3;
        for (const o of this.near(p.x, p.y, R)) {
          if (o.dead || o.team !== ATK) continue;
          if (this.affOn && this.affOf && this.affOf(o) === 'ice') { this.affFeed(o, o.max * 0.1, 'ice'); continue; }
          const kk = isTitan(o.type) || o.boss ? 0.5 : 1;
          o.frozeT = Math.max(o.frozeT || 0, T + sec * kk);
          this._kind = 'blast'; this.damage(o, 1.2, busy ? busy.u : null); this._kind = undefined;
        }
        S.fx.push({ kind: 'nova', x: p.x, y: p.y, r: R, t0: this.t });
        this.snd('freeze', { gain: 1 }); this.shake(7); spot(p.x, p.y, 1.45); word(p.x, p.y, 'FROST NOVA!'); this.pkCue('spell', null);
        break;
      }
      case 'pkrain': {
        // over the towers that are hurt the most
        const hurt = live.slice().sort((a, b2) => a.u.hp / a.u.max - b2.u.hp / b2.u.max)[0] || { x: b.x, y: b.y };
        S.rains.push({ x: hurt.x, y: hurt.y, r: P.rainR ?? 150, T0: T, end: T + (P.rainSecs ?? 6), team: DEF, t0: this.t });
        this.snd('heal', { gain: 1 }); spot(hurt.x, hurt.y, 1.35); word(hurt.x, hurt.y, 'HEALING RAIN!');
        break;
      }
      case 'pksmoke': {
        const sh = foes.filter(o => UNIT[o.type].ranged), k2 = sh.length ? sh.reduce((a, o) => ({ x: a.x + o.x / sh.length, y: a.y + o.y / sh.length }), { x: 0, y: 0 }) : c;
        S.smokes.push({ x: k2.x, y: k2.y, r: P.smokeR ?? 120, T0: T, end: T + (P.smokeSecs ?? 6), team: DEF, t0: this.t });
        this.snd('whoosh', { gain: 1 }); spot(k2.x, k2.y, 1.4); word(k2.x, k2.y, 'SMOKE BOMB!');
        break;
      }
      case 'pkwall': {
        // across the path, in front of the busiest tower, square to the path
        const u0 = c.u, L = u0 && u0.lane !== undefined ? this.lanes[u0.lane] : this.lanes[0], s0 = u0 ? Math.min(L.len - 20, (u0.s || 0) + 70) : L.len * 0.6, p = laneAt(L, s0);
        S.walls.push({ x: p.x, y: p.y, a: Math.atan2(p.dy, p.dx) + Math.PI / 2, len: P.wallLen ?? 120, team: DEF, T0: T, end: T + (P.wallSecs ?? 6), t0: this.t });
        this.snd('clang', { gain: 1 }); spot(p.x, p.y, 1.4); word(p.x, p.y, 'SHIELD WALL!');
        break;
      }
      case 'pkvamp': {
        this.tpS.vampT = T + (P.vampSecs ?? 8);
        S.fx.push({ kind: 'vamp', x: b.x, y: b.y, t0: this.t });
        this.snd('roar', { gain: 0.8 }); spot(b.x, b.y - 80, 1.3); word(b.x, b.y - 40, 'VAMPIRE BITE!');
        break;
      }
    }
  },
  // a shot at a tower that meets a shield wall stops there
  tpkBlocked(a, t) {
    const T = this.fightT;
    for (const w of this.pkS.walls) {
      if (T >= w.end || w.team === a.team) continue;
      const ux = Math.cos(w.a), uy = Math.sin(w.a), sx = a.from ? a.from.x : a.x, sy = a.from ? a.from.y : a.y;
      // does the line from the shooter to the tower cross the wall's segment?
      const dx = t.x - sx, dy = t.y - sy, den = dx * uy - dy * ux; if (Math.abs(den) < 1e-6) continue;
      const qx = w.x - sx, qy = w.y - sy, k = (qx * uy - qy * ux) / den, m = (qx * dy - qy * dx) / den;
      if (k > 0 && k < 1 && Math.abs(m) < w.len / 2) { this.burst(sx + dx * k, sy + dy * k, '#93C5FD', 6, 180, 0.3, 4); if (T >= (this.tpS.wSay || 0)) { this.tpS.wSay = T + 2; this.float(sx + dx * k, sy + dy * k - 20, 'BLOCKED', '#93C5FD', 22, 0.6); } return true; }
    }
    return false;
  },
  // ----- drawing (looks only) -----
  // the hill and the knot on the path, under the troops
  tpkGround(ctx) {
    const Q = this.tpS, t = this.t;
    if (Q.hill) {
      const H = Q.hill, k = clamp(H.score / H.goal, 0, 1);
      ctx.save();
      ctx.beginPath(); ctx.ellipse(H.x, H.y, H.r, H.r * 0.8, 0, 0, TAU); ctx.fillStyle = H.held ? 'rgba(255,90,90,0.16)' : 'rgba(255,255,255,0.1)'; ctx.fill();
      ctx.lineWidth = 4; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 30; ctx.strokeStyle = H.held ? TEAMS[ATK].c : 'rgba(255,255,255,0.6)'; ctx.stroke(); ctx.setLineDash([]);
      // the score: a ring that fills as they hold it
      ctx.beginPath(); ctx.ellipse(H.x, H.y, H.r + 10, (H.r + 10) * 0.8, 0, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.lineWidth = 7; ctx.strokeStyle = TEAMS[ATK].c; ctx.stroke();
      // the flag
      ctx.fillStyle = '#5B4636'; ctx.fillRect(H.x - 2, H.y - 58, 4, 58);
      ctx.beginPath(); ctx.moveTo(H.x + 2, H.y - 58); ctx.lineTo(H.x + 36 + Math.sin(t * 6) * 3, H.y - 48); ctx.lineTo(H.x + 2, H.y - 38); ctx.closePath(); ctx.fillStyle = H.held ? TEAMS[ATK].c : '#E5E7EB'; ctx.fill();
      ctx.restore();
    }
    if (Q.tug && Q.tug.x !== undefined) {
      const G = Q.tug, L = this.lanes[0];
      ctx.save(); ctx.lineCap = 'round';
      // the rope along the path, the knot where it is now, a mark at the walls
      ctx.beginPath(); let first = true;
      for (let s = L.len * 0.15; s <= L.len * 0.95; s += 24) { const p = laneAt(L, s); if (first) { ctx.moveTo(p.x, p.y); first = false; } else ctx.lineTo(p.x, p.y); }
      ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(120,84,50,0.75)'; ctx.stroke(); ctx.lineWidth = 3; ctx.setLineDash([6, 8]); ctx.strokeStyle = 'rgba(214,180,130,0.8)'; ctx.stroke(); ctx.setLineDash([]);
      const kx = G.sx ?? G.x, ky = G.sy ?? G.y; G.sx = kx + (G.x - kx) * 0.2; G.sy = ky + (G.y - ky) * 0.2;
      ctx.beginPath(); ctx.arc(G.sx, G.sy, 17, 0, TAU); ctx.fillStyle = '#7C2D12'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = G.k > 0.8 ? TEAMS[ATK].c : '#FDE68A'; ctx.stroke();
      ctx.restore();
    }
  },
  // the MVP card in the outro: the tower with the most kills (then the higher tier, then the first built; no dice)
  tpkMvp(ctx) {
    if (this.phase !== 'outro' || this.holdOutro || !this.towers.length) return;
    const k = this.outroT, a = clamp((k - 1.0) / 0.35, 0, 1); if (a <= 0) return;
    if (this.tpS.mvp === undefined) {
      let best = null; for (const tw of this.towers) if (tw.kills > 0 && (!best || tw.kills > best.kills || (tw.kills === best.kills && tw.tier > best.tier))) best = tw;
      this.tpS.mvp = best;
    }
    const m = this.tpS.mvp; if (!m) return;
    const e = easeOutCubic(a), cy = AR.y + AR.h / 2 - 340 - (1 - e) * 24, w = 640, h = 130, x0 = VW / 2 - w / 2, tm = TEAMS[DEF];
    ctx.save(); ctx.globalAlpha = a;
    roundRect(ctx, x0, cy - h / 2, w, h, 22); ctx.fillStyle = 'rgba(8,11,20,0.86)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = COL.gold; ctx.stroke();
    const px = x0 + 72, py = cy;
    ctx.beginPath(); ctx.arc(px, py, 48, 0, TAU); ctx.fillStyle = tm.d; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = tm.c; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(px, py, 44, 0, TAU); ctx.clip();
    try { const U = UNIT[m.u.type] || UNIT.soldier, hum = this.opts.humans && E.HUMAN && E.HUMAN[m.u.type], sc = 40 * (hum ? 0.8 : 0.72) / (U.r || 14); ctx.translate(px, py + (hum ? 8 : 0)); ctx.scale(sc, sc); if (!hum) ctx.rotate(-Math.PI / 2); this.drawPortrait(ctx, m.u.type, DEF); } catch (err) { /* no portrait */ }
    ctx.restore();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = font(28, 800); strokeText(ctx, 'MVP', x0 + 140, cy - 36, COL.gold, COL.ink, 6);
    this.fitTextO(ctx, `${m.def.name}${m.title ? ' · ' + m.title : ''}`, x0 + 140, cy + 2, w - 165, 40, 800, true, COL.white, 'left', 24);
    ctx.font = font(30, 800); strokeText(ctx, `${m.kills} KILLS · TIER ${m.tier + 1}`, x0 + 140, cy + 40, tm.c, COL.ink, 6);
    ctx.restore(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
  },
};
Object.assign(TD.prototype, PICKS);

// ----- the hooks into the game (each does nothing with picks off) -----
wrap('planWaves', function (orig) { const r = orig.call(this); if (this.pk) { if (!this.tpk) this.tpkInit(); this.tpkWaves(); } return r; });
wrap('attackerAct', function (orig, u, h) {
  if (this.tpk) {
    if (this.tpkAct(u, h)) return;
    // the battering ram and a ghost walking through: blockers don't stop them (walls still do the ram, and it hits them hard)
    if ((u.type === 'ram' || u.phaseEnd > this.fightT) && u.foe) u.foe = null;
    if (u.type === 'ram' || u.phaseEnd > this.fightT) {
      const keep = this.near, own = Object.prototype.hasOwnProperty.call(this, 'near');
      this.near = function (x, y, r) { return keep.call(this, x, y, r).filter(o => o.team !== DEF || o.tower); };
      try { return orig.call(this, u, h); } finally { if (own) this.near = keep; else delete this.near; }
    }
  }
  return orig.call(this, u, h);
});
wrap('speedOf', function (orig, u) {
  let v = orig.call(this, u);
  if (this.tpk) { const T = this.fightT; if (u.pkSlowT > T && !(this.affOn && this.affOf && this.affOf(u) === 'acid')) v *= 0.6; if (u.songT > T) v *= u.songBig > T ? 1.3 : 1.15; if (u.lsT > T) v *= 1.2; }
  return v;
});
// a tower inside a plague cloud fires a third slower
wrap('towerAct', function (orig, u, h) { return orig.call(this, u, this.tpk && u.smogT > this.fightT ? h * 0.66 : h); });
wrap('step', function (orig, h) { const r = orig.call(this, h); if (this.tpk && this.phase === 'fight') this.tpkStep(h); return r; });
// the battering ram breaks walls and gates three times as fast, and pounds the base harder
wrap('hitBase', function (orig, dmg, u) { return orig.call(this, this.tpk && u && u.type === 'ram' ? dmg * 2 : dmg, u); });
wrap('wallFalls', function (orig, w, by) {
  const r = orig.call(this, w, by);
  if (this.tpk && w.gate) { this.card({ text: 'THE GATE FALLS!', col: TEAMS[ATK].c, big: true, dur: 1.8 }); this.shake(14); this.snd('boom', { gain: 0.8 }); this.pkCue('gate', by); }
  return r;
});
wrap('damage', function (orig, u, dmg, from) {
  if (this.tpk && u && !u.dead) {
    // vampire bite: what the towers deal mends the base
    if (from && from.tower && this.tpS.vampT > this.fightT && dmg > 0 && this.base.hp > 0) { const b = this.base; b.hp = Math.min(b.max, b.hp + dmg * (this.pk.vampShare ?? 0.25) * 0.05); b.healT = this.t; }
  }
  return orig.call(this, u, dmg, from);
});
// the ram hits hard (2.5 times a troop of its size): it only ever hits walls, the gate, the base and towers in its way
wrap('spawnAttacker', function (orig, type, lane, w) { const u = orig.call(this, type, lane, w); if (this.tpk && u && u.type === 'ram') u.dmgK = (u.dmgK || 1) * 2.5; return u; });
wrap('hitShot', function (orig, a, t) { if (this.tpk && a.atk && t && t.tower && this.pkS.walls.length && this.tpkBlocked(a, t)) return; return orig.call(this, a, t); });
wrap('want', function (orig, k) { return this.tpk && PK_BOOK[k] ? this.tpkWant(k) : orig.call(this, k); });
wrap('cast', function (orig, k) { return this.tpk && PK_BOOK[k] ? this.tpkCast(k) : orig.call(this, k); });
wrap('offer', function (orig, n) {
  const out = orig.call(this, n);
  if (!this.tpk || this.pk.spells === false) return out;
  // one of the new spells joins each visit's offer (in a fixed order from the seed)
  const seen = this.offered || [], left = PK_KEYS.filter(k => !seen.includes(k));
  if (left.length) { const k = left[(this.seed >>> 0) % left.length]; out.splice(1, 0, k); this.offered = seen.concat([k]); }
  return out;
});
// drawing hooks
wrap('drawCorpses', function (orig, ctx) { const r = orig.call(this, ctx); if (this.tpk) this.tpkGround(ctx); return r; });
wrap('drawOutro', function (orig, ctx) { const r = orig.call(this, ctx); if (this.tpk && this.pk.mvp !== false) this.tpkMvp(ctx); return r; });

module.exports = { PK_BOOK, PKMODES };
