// Tower Clash: the battle itself (waves, marching, towers firing, the economy, spells, events and the ending).
// Every tick is 1/120 s of fight time. Nothing here reads the video clock (this.t) for anything that changes the battle.
'use strict';
const RVB = require('./engine.js');
const D = require('./td-data.js');
const { TD, laneAt, distToLane, walkSpeed, sizeOf, PATH_W, DEF, ATK, BASE_HP } = require('./td.js');
const E = RVB._;
const { AR, COL, TEAMS, UNIT, TAU, clamp, labelOf, isTitan, hash01 } = E;
const { TOWERS, TIER, WAVE_KINDS, BOSSES, SIEGE, RAIDERS, BOOK, BOOK_KEYS, SHAMAN, SHAMAN_KEYS, MODES, ELEM, ELEM_KEYS } = D;

const SIM = {
  // ---------- the waves ----------
  planWaves() {
    const R = this.WVR, o = this.opts, A = o.attack || D.ATK_LINEUPS[0], P = this.power;
    const mode = this.mode;
    let kinds = A.waves.slice();
    // (never fliers first: the defence needs a moment to put up anti-air)
    if (WAVE_KINDS[kinds[0]].air) { const j = kinds.findIndex(k => !WAVE_KINDS[k].air); if (j > 0) [kinds[0], kinds[j]] = [kinds[j], kinds[0]]; }
    if (mode === 'bossrush') kinds = ['giants', 'titans', 'giants', 'titans', 'titans'];
    if (mode === 'swarm') kinds = ['swarm', 'swarm', 'infantry', 'swarm', 'swarm', 'infantry', 'swarm', 'swarm'];
    const nNormal = mode === 'swarm' ? 8 : mode === 'bossrush' ? 4 : 5 + R.int(0, 2);       // 6 to 8 waves with the boss
    const bossAt = this.cap - 24 + R.range(-1, 1);
    const first = 3.2;
    this.plan = [];
    const endless = this.trait.atk === 'endless' ? 1.15 : 1, reckless = this.trait.atk === 'reckless';
    for (let i = 0; i < nNormal; i++) {
      const kind = kinds[i % kinds.length], W = WAVE_KINDS[kind];
      const at = first + (bossAt - 3.5 - first) * (i / Math.max(1, nNormal - 1)) ** 1.05;
      const pool = W.pool.filter(k => UNIT[k]);
      // two or three troop types a wave (the first is the main one)
      const types = [pool[R.int(0, pool.length - 1)]];
      if (pool.length > 1 && R.chance(0.7)) { let k2 = pool[R.int(0, pool.length - 1)]; if (k2 !== types[0]) types.push(k2); }
      const n = Math.round(R.int(W.n[0], W.n[1]) * (0.75 + 0.25 * P) * endless * (mode === 'swarm' ? 1.3 : 1));
      const list = [];
      for (let k = 0; k < n; k++) list.push(types[k % types.length === 0 || types.length === 1 ? 0 : (k % 3 === 2 ? 1 : 0)]);
      // a healer or shaman walks with the bigger waves now and then
      if (kind !== 'swarm' && kind !== 'titans' && R.chance(0.35)) list.splice(Math.floor(list.length / 2), 0, R.chance(0.5) ? 'healer' : 'shaman');
      this.plan.push({ i, kind, name: W.name, at, list, gap: W.gap * (mode === 'swarm' ? 0.75 : 1), next: 0, k: 0, lane: i % this.lanes.length, done: false, boss: false, air: !!W.air });
    }
    // the boss wave: the boss, with an escort
    const bpool = (A.boss || ['magmacolossus']).filter(k => UNIT[k]);
    const boss = o.boss && UNIT[o.boss] ? o.boss : bpool[R.int(0, bpool.length - 1)];
    this.bossType = boss;
    const esc = [];
    for (let k = 0; k < 6; k++) esc.push(['soldier', 'orc', 'skeleton', 'goblin'][R.int(0, 3)]);
    const blist = esc.slice(0, 3).concat([boss]).concat(esc.slice(3));
    if (mode === 'bossrush') { const b2 = bpool.find(k => k !== boss) || 'titan'; this.plan.splice(2, 0, { i: 0, kind: 'boss', name: 'FIRST BOSS', at: this.plan[2] ? this.plan[2].at : 20, list: [b2], gap: 1, next: 0, k: 0, lane: 0, done: false, boss: true, mini: true }); }
    if (mode === 'escort') blist.splice(4, 0, 'livingfortress');
    this.plan.push({ i: this.plan.length, kind: 'boss', name: 'BOSS WAVE', at: bossAt, list: blist, gap: 0.5, next: 0, k: 0, lane: this.lanes.length > 1 ? 1 % this.lanes.length : 0, done: false, boss: true });
    this.plan.sort((a, b) => a.at - b.at);
    this.plan.forEach((w, i) => { w.i = i; });
    this.waveN = this.plan.length; this.waveNow = 0;
    this.start[1] = this.plan.reduce((s, w) => s + w.list.length, 0);
    this.reserve[1] = this.start[1];
    this.hpK = Math.pow(P, 0.9) * (reckless ? 0.9 : 1);
    this.spdK = reckless ? 1.08 : 1;
  },
  spawnTick() {
    const T = this.fightT;
    for (const w of this.plan) {
      if (w.done || T < w.at) continue;
      if (!w.started) {
        w.started = true; this.waveNow = Math.max(this.waveNow, w.i + 1);
        if (w.boss && !w.mini) this.card({ kind: 'wave', text: `WAVE ${w.i + 1} · ${BOSSES[this.bossType] ? BOSSES[this.bossType].name : 'THE BOSS'}`, col: '#FF5A5A', big: true });
        else this.card({ kind: 'wave', text: `WAVE ${w.i + 1} · ${w.name}`, col: COL.gold });
        this.snd(w.boss ? 'roar' : 'alarm', { gain: w.boss ? 1 : 0.6 });
        if (w.boss && !w.mini) { this.chapter('THE BOSS WAVE', '#FF5A5A'); }
        w.next = T;
      }
      while (w.k < w.list.length && T >= w.next) {
        const type = w.list[w.k];
        const lane = this.lanes.length > 1 ? (w.lane + w.k) % this.lanes.length : 0;
        this.spawnAttacker(type, lane, w);
        w.k++; w.next += w.gap;
      }
      if (w.k >= w.list.length) w.done = true;
    }
  },
  spawnAttacker(type, lane, w) {
    const L = this.lanes[lane], U = UNIT[type], R = this.WVR;
    const p = laneAt(L, 0), lat = R.range(-1, 1) * Math.max(0, PATH_W / 2 - U.r - 4);
    const u = this.addUnit(ATK, type, p.x + p.nx * lat, p.y + p.ny * lat);
    this.reserve[ATK]--;
    u.lane = lane; u.s = 0; u.lat = lat; u.face = Math.atan2(p.dy, p.dx);
    const sz = sizeOf(type);
    // small troops have barely any health (one tower shot), knights get hurt, titans and bosses decide it
    const exp = sz === 'small' ? 0.4 : sz === 'mid' ? 0.8 : 1;
    let hp = U.hp * exp * this.hpK * (w && !w.boss ? 1 + 0.12 * w.i : 1);
    if (sz === 'titan') hp *= 1.5;
    u.size = sz;
    if (w && w.boss && type === this.bossType || (w && w.mini && BOSSES[type])) {
      const B = BOSSES[type] || { hp: 3.5, name: labelOf(type) };
      hp = U.hp * B.hp * this.hpK * (w.mini ? 0.55 : 1); u.boss = true; u.bossName = B.name; u.phase = 1; u.size = 'boss';
      if (!w.mini) { this.bossU = u; this.bossAt0 = this.fightT; }
      if (this.camEv) this.camEv.push({ type: 'spot', follow: u, x: u.x, y: u.y + 120, prio: 90, dur: 3.2, z: 1.9, ts: 0.45, slowFor: 1.4 });
      this.bossIntro = this.t;
      this.shake(10);
    }
    if (type === 'livingfortress') { u.escort = true; hp = U.hp * 3.2 * this.hpK; this.escortU = u; this.chapter('THE SIEGE ENGINE ROLLS IN', '#FDBA74'); }
    u.max = hp; u.hp = hp;
    // (every layout takes about as long to walk, short or winding: speeds scale with the lane's length)
    u.vk = walkSpeed(type) * this.spdK * (u.boss ? 0.85 : 1) * (U.flying ? 1 : clamp(L.len / 1900, 0.55, 1.7));
    if (U.flying) { const b = this.base; u.fly = { x0: u.x, y0: AR.y - 30, len: Math.hypot(b.x - u.x, b.y - (AR.y - 30)) }; u.s = 0; }
    return u;
  },

  // ---------- the economy ----------
  bounty(u) { const sz = u.size; return (sz === 'small' ? 7 : sz === 'mid' ? 13 : sz === 'giant' ? 30 : 60) * (this.trait.def === 'bright' ? 1.2 : 1); },
  upCost(tw) { return Math.round(TIER.cost[tw.tier + 1] * (this.trait.def === 'engineers' ? 0.8 : 1)); },
  // the defenders' plan, twice a second (no dice): rebuild a fallen tower, build the next one, or upgrade
  buildTick() {
    const T = this.fightT;
    if (T < (this.buildAt || 4.5) || this.phase !== 'fight') return;
    this.buildAt = T + 0.5;
    const live = this.towers.filter(t => !t.dead);
    const soon = this.plan.filter(w => !w.started).slice(0, 2);
    const airSoon = soon.some(w => w.air || w.list.some(k => UNIT[k].flying)) || this.units.some(u => u.team === ATK && !u.dead && u.flying);
    // 1. a wreck to rebuild (the same tower)
    const wreck = this.spots.find(s => s.wreck && s.was);
    if (wreck && this.mode !== 'laststand') {
      const c = TOWERS[wreck.was].cost; if (this.gold >= c) { this.gold -= c; wreck.wreck = false; this.stat.rebuilt++; const tw = this.buildTower(wreck.was, wreck); this.say(`${TOWERS[wreck.was].name} REBUILT`, DEF); this.card({ kind: 'build', text: `REBUILT · ${TOWERS[wreck.was].name}`, tk: wreck.was, col: TEAMS[DEF].c }); return tw; }
      return;
    }
    // 2. a new tower: up to 4 + one every 7 s (never in Last Tower Standing), countering what's coming
    const want = Math.min(this.spots.length, 3 + Math.floor((T + 3) / 7));
    if (this.mode !== 'laststand' && live.length < want) {
      let kind = this.towerSet[live.length % this.towerSet.length];
      const nAir = live.filter(t => t.def.cls === 'air').length;
      if (airSoon && nAir < 2) kind = this.towerSet.find(k => TOWERS[k].cls === 'air') || 'archer';
      const c = TOWERS[kind].cost;
      if (this.gold >= c) {
        const id = this.pickSpot(kind); if (id < 0) return;
        this.gold -= c;
        const tw = this.buildTower(kind, this.spots[id]);
        this.card({ kind: 'build', text: `NEW TOWER · ${TOWERS[kind].name}`, tk: kind, col: TEAMS[DEF].c });
        return tw;
      }
      if (live.length < 4) return;   // saving up for it
    }
    // 3. an upgrade: the signature tower first (to tier 5), then the lowest tier with the most kills
    const cand = live.filter(t => t.tier < 5).sort((a, b) => (b.kind === this.towerSet[0]) - (a.kind === this.towerSet[0]) || a.tier - b.tier || b.kills - a.kills || a.u.uid - b.u.uid);
    const tw = cand[0];
    if (tw && this.gold >= this.upCost(tw)) { this.gold -= this.upCost(tw); this.upgrade(tw); }
  },
  upgrade(tw, free) {
    tw.tier++; this.applyTier(tw); this.stat.upgrades++;
    const T = TOWERS[tw.kind], k = tw.tier;
    tw.upT = this.t;
    if (k === 4) tw.el = T.el ? { fire: 'fire', ice: 'frost', zap: 'storm', acid: 'acid' }[T.el] || 'holy' : ELEM_KEYS[(tw.u.uid + this.seed) % ELEM_KEYS.length];
    if (k >= 3) {
      // a big upgrade: on the tower itself, with a card, a ring and a burst, and the camera goes there
      this.stat.big++; tw.bigT = this.t;
      const what = k === 3 ? 'TALLER TOWER' : k === 4 ? `${ELEM[tw.el].name} ${T.shot === 'arrow' ? 'ARROWS' : 'POWER'}` : 'AURA OF POWER';
      this.card({ kind: 'up', text: `${T.name} · TIER ${k}`, sub: what, tk: tw.kind, col: k === 4 ? ELEM[tw.el].col : k === 5 ? '#FFD23F' : '#E2E8F0', tier: k });
      this.burst(tw.x, tw.y, k === 4 ? ELEM[tw.el].col : COL.gold, 22, 340, 0.6, 8, -40);
      this.shRings && this.shRings.push({ x: tw.x, y: tw.y, r0: 20, r1: 120, t0: this.t, life: 0.55, col: k === 4 ? ELEM[tw.el].col : '#FFE58A', w: 6 });
      this.snd('evolve', { pan: this.pan(tw.x) });
      if (this.camEv) this.camEv.push({ type: 'spot', x: tw.x, y: tw.y, prio: 62, dur: 1.7, z: 1.9, ts: 0.6, slowFor: 0.6 });
      this.say(`${T.name} REACHES TIER ${k}`, DEF);
    } else { tw.glintT = this.t; this.snd('powerup', { pan: this.pan(tw.x), gain: 0.5 }); }
  },

  // ---------- one tick ----------
  step(h) {
    const T = (this.fightT += h);
    this.hash();
    if (this.wq) this.worldTick(h);
    const frozen = this.frozenT > T;
    this.spawnTick();
    // the treasury: a steady trickle of gold on top of the bounties (kills pay the most)
    if (T > 4 && T >= (this.incAt || 0)) { this.incAt = T + 1; this.gold += 6; }
    this.buildTick();
    this.merchantTick();
    this.shamanTick();
    this.eventTick(h);
    // the final push: in the last 10 s of the fight both sides go all out, so the battle always reaches its ending
    const push = T >= this.pushAt[0];
    if (push && !this.pushed) { this.pushed = true; this.chapter('THE FINAL PUSH', COL.gold); this.snd('alarm'); if (this.camEv) this.camEv.push({ type: 'push', stage: 1 }); }
    this.pushK = push ? 1 + clamp((T - this.pushAt[0]) / 6, 0, 1) * 0.9 : 1;
    for (const u of this.units) {
      if (u.dead) continue;
      if (u.tower) { if (!frozen || u.walkT > T) this.towerAct(u, h); continue; }
      if (frozen && !(u.walkT > T)) continue;
      this.statusTick(u, h); if (u.dead) continue;
      if (u.team === ATK) this.attackerAct(u, h); else this.defenderAct(u, h);
    }
    // shots
    this.shotTick(h);
    // delayed blasts (boulders from the siege golem, meteors)
    if (this.tdCalls.length) { for (const c of this.tdCalls) if (!c.done && T >= c.at) { c.done = true; this.blast(c); } this.tdCalls = this.tdCalls.filter(c => !c.done); }
    // the engine's pools and acid globs, and the spells in progress
    this.cast5Tick(h);
    for (const r of this.sp3.rises) if (!r.done && r.tdA && T >= r.at) {
      // the war shaman's RAISE THE FALLEN: the dead get back up where they fell and march on
      r.done = true; this.reserve[ATK]--;
      const L = this.lanes[r.tdA.lane], o = this.addUnit(ATK, 'skeleton', r.x, r.y);
      o.lane = r.tdA.lane; o.s = r.tdA.s; o.lat = 0; o.size = 'small'; o.vk = walkSpeed('skeleton') * this.spdK; o.max = o.hp = UNIT.skeleton.hp * 0.5 * this.hpK; o.riseT = T; o.riseEnd = T + 0.6; o.summoned = true;
      this.burst(o.x, o.y, '#6B4F35', 6, 140, 0.45, 5, -20);
    }
    for (const r of this.sp3.rises) if (!r.done && r.td && T >= r.at) {
      // a skeleton the lich crypt (or the graveyard spell) raises: it claws out of the path and holds it for a while
      r.done = true;
      const o = this.addUnit(r.team, 'skeleton', r.x, r.y); o.face = r.face; o.summoned = true; o.riseT = T; o.riseEnd = T + 0.6;
      o.rx = r.x; o.ry = r.y; o.leash = r.td.leash; o.lifeEnd = T + r.td.life; o.dmgK = r.td.dmgK || 1; o.max = o.hp = UNIT.skeleton.hp * 1.6;
      this.burst(o.x, o.y, '#6B4F35', 6, 140, 0.45, 5, -20);
    }
    this.sp3Tick(h);
    if (this.fireG) this.fireTick();
    this.zoneTick(h);
    this.bossTick();
    if (this.units.some(u => u.dead)) this.units = this.units.filter(u => !u.dead);
    // coins fly to the gold counter (looks only, but the gold counts when they're paid)
    this.endCheck();
  },
  statusTick(u, h) {
    const T = this.fightT, U = UNIT[u.type];
    if (u.burnT > T) { if (!U.fireproof) this.dot(u, u.burnD * h, u.burnBy, 'fire'); }
    if (u.dead) return;
    if (u.poisT > T) this.dot(u, u.poisD * h, u.poisBy, 'acid');
    if (u.kx !== undefined) {
      u.x += u.kx * h; u.y += u.ky * h; const dk = Math.exp(-7 * h); u.kx *= dk; u.ky *= dk;
      if (Math.abs(u.kx) + Math.abs(u.ky) < 5) { u.kx = undefined; u.ky = undefined; }
    }
  },
  held(u) { const T = this.fightT; return u.frozeT > T || u.riseEnd > T || u.qStunT > T || u.liftT > T || u.stunT > T; },
  speedOf(u) {
    const T = this.fightT;
    let v = u.vk || 80;
    if (u.slowT > T) v *= u.slowK;
    if (this.wNow) v *= this.worldSpd(u);
    if (this.atkBuff('haste')) v *= 1.4;
    if (u.rageT > T) v *= 1.2;
    if (u.affT > T) v *= this.aff ? this.aff.speed : 1;
    if (u.chargeT > T) v *= 2.6;
    v *= this.pushK;
    for (const z of this.zones) if (z.lane && (z.kind === 'ice' || z.kind === 'sand' || z.kind === 'mud') && this.lanes[u.lane] === z.lane && u.s > z.s0 && u.s < z.s1 && !u.flying) v *= z.kind === 'ice' ? 1.3 : 0.7;
    return v;
  },
  atkBuff(k) { return this.aBuff && this.aBuff[k] > this.fightT; },
  // ---------- attackers: march down the path; fight what blocks them; some go for towers ----------
  attackerAct(u, h) {
    const T = this.fightT, U = UNIT[u.type];
    u.cd -= h;
    if (this.held(u)) { u.vx *= 0.85; u.vy *= 0.85; return; }
    let v = this.speedOf(u);
    // charmed by the siren: walks back the way it came
    const back = u.charmT > T;
    // something in the way: a blocker (swordsman, skeleton, knight) or a wall on its lane
    let foe = null;
    if (!u.flying && !back) {
      if (u.foe && !u.foe.dead && Math.hypot(u.foe.x - u.x, u.foe.y - u.y) < u.r + u.foe.r + 14) foe = u.foe;
      else {
        u.foe = null;
        for (const o of this.near(u.x, u.y, u.r + 34)) if (o.team === DEF && !o.tower && !o.drone && !o.dead && !(o.riseEnd > T) && Math.hypot(o.x - u.x, o.y - u.y) < u.r + o.r + 10) { foe = o; break; }
        u.foe = foe;
      }
    }
    let wall = null;
    if (!u.flying && !back && !foe) for (const w of this.walls) if (!w.dead && w.lane === u.lane && u.s < w.s && w.s - u.s < u.r + 16) { wall = w; break; }
    // raiders and sappers go for a tower beside the path
    let tgt = null;
    if (!u.flying && !back && !foe && !wall) {
      if (u.type === 'bomber') { const t = this.nearTower(u, 150); tgt = t ? t.u : null; }
      else if ((RAIDERS.has(u.type) || u.boss) && (u.raids ?? 3) > 0) { const t = this.nearTower(u, u.r + 34); if (t) tgt = t.u; }
    }
    const stop = !!(foe || wall || (tgt && u.type !== 'bomber'));
    // march
    if (u.type === 'bomber' && tgt) {
      // a sapper runs at the tower and blows it up (and himself)
      const dx = tgt.x - u.x, dy = tgt.y - u.y, d = Math.hypot(dx, dy) || 1;
      u.vx = dx / d * v * 1.15; u.vy = dy / d * v * 1.15; u.x += u.vx * h; u.y += u.vy * h; this.turn(u, Math.atan2(dy, dx), h);
      if (d < u.r + tgt.r + 6) {
        this.blast({ x: u.x, y: u.y, r: 54, dmg: 0, team: ATK, from: u, kind: 'bomb' });
        this._kind = 'blast'; this.damage(tgt, tgt.max * 0.42, u); this._kind = undefined;
        this.callout(tgt, 'SAPPED!', '#FF8A1F');
        u.hp = 0; this.damage(u, 1, null);
      }
      return;
    }
    if (!stop) {
      if (u.fly && !u.grounded) {
        u.s += v * h * (back ? -0.6 : 1);
        const k = clamp(u.s / u.fly.len, 0, 1), b = this.base;
        const tx = u.fly.x0 + (b.x - u.fly.x0) * k, ty = u.fly.y0 + (b.y - u.fly.y0) * k;
        const wob = Math.sin(T * 2 + u.gait) * 18;
        const nx = -(b.y - u.fly.y0) / u.fly.len, ny = (b.x - u.fly.x0) / u.fly.len;
        this.steerTo(u, tx + nx * wob, ty + ny * wob, v, h);
        if (k >= 1) this.reachBase(u);
        return;
      }
      if (u.grounded) {
        // a flier pulled down by the gravity well: walks the rest of the way, straight at the base
        const b = this.base, dx = b.x - u.x, dy = b.y - u.y, d = Math.hypot(dx, dy) || 1;
        this.steerTo(u, u.x + dx / d * 40, u.y + dy / d * 40, v * 0.6, h);
        if (d < b.r + u.r) this.reachBase(u);
        return;
      }
      const L = this.lanes[u.lane];
      u.s = clamp(u.s + v * h * (back ? -0.7 : 1), 0, L.len);
      const p = laneAt(L, u.s + 10);
      this.steerTo(u, p.x + p.nx * u.lat, p.y + p.ny * u.lat, v, h, back);
      if (u.s >= L.len - 4) this.reachBase(u);
    } else {
      u.vx *= 0.8; u.vy *= 0.8;
      const t = foe || tgt || wall;
      this.turn(u, Math.atan2(t.y - u.y, t.x - u.x), h);
      if (u.cd <= 0) {
        u.cd = (U.cd || 1) * this.R.range(0.85, 1.15) * (this.wNow ? this.worldCd() : 1);
        u.lunge = 1;
        let dmg = (U.dmg || 1) * 1.6 * (u.boss ? 2.2 : 1) * (this.atkBuff('warcry') ? 1.5 : 1) * this.pushK;
        if (U.sword) { const side = u.swordSide || -1; u.swingFrom = side; u.swordSide = -side; u.swing = 1; u.swingStart = side * 1.05; }
        if (wall) { wall.hp -= dmg * 1.5; wall.hitT = this.t; this.burst(wall.x, wall.y, '#9A7B55', 4, 160, 0.4, 5); this.snd('chop', { pan: this.pan(wall.x), quiet: true }); if (wall.hp <= 0) this.wallFalls(wall, u); }
        else {
          // (a raider smashes at a tower a few times, then marches on)
          if (t.tower) { u.raids = (u.raids ?? 3) - 1; dmg *= 0.8; if (u.raids === 2) this.callout(u, 'SMASH THE TOWER!', '#FF8A3D'); }
          this.damage(t, dmg, u); this.snd(this.hitSfx ? this.hitSfx(u, t) : 'hit', { pan: this.pan(u.x) });
        }
      }
    }
    // ranged attackers shoot at towers they pass (while they keep marching)
    if (U.ranged && !back && u.cd <= 0 && !stop) {
      const tw = this.nearTower(u, Math.min(U.range || 200, 230));
      if (tw) { u.cd = (U.cd || 1.5) * 1.3; this.fire(u, tw.u, { dmg: (U.dmg || 1) * 1.4, kind: U.shot || (U.lob ? 'fireball' : U.bullet ? 'bullet' : null), bolt: !!U.bolt, speed: 620, atk: true }); }
    }
    // healers and shamans
    if ((U.healer || u.type === 'shaman' || u.type === 'druid') && u.cd <= 0) {
      u.cd = 1.6;
      let n = 0;
      for (const o of this.near(u.x, u.y, 120)) if (o.team === ATK && o !== u && o.hp < o.max) { o.hp = Math.min(o.max, o.hp + o.max * 0.12); o.healFlash = 1; n++; }
      if (u.type === 'shaman') for (const o of this.near(u.x, u.y, 140)) if (o.team === ATK) o.rageT = Math.max(o.rageT || 0, T + 2);
      if (n) { u.healFx = 1; this.snd('heal', { pan: this.pan(u.x), quiet: true }); }
    }
    this.titanAct(u, U, h);
  },
  // the titans' and bosses' own moves, aimed at towers (the same moves as in Army Clash, pointed at the defence)
  titanAct(u, U, h) {
    const T = this.fightT;
    if (!(isTitan(u.type) || u.boss) || u.flying) return;
    if (T < (u.abT || (u.abT = T + 2.5 + (u.uid % 5) * 0.4))) return;
    const pan = this.pan(u.x), S = this.sp3, G = this.g5;
    const tw = this.nearTower(u, 360);
    u.abT = T + 4.2;
    switch (u.type) {
      case 'siegegolem': {
        // a boulder at a tower
        if (!tw) { u.abT = T + 1; return; }
        const fl = 0.55 + Math.hypot(tw.x - u.x, tw.y - u.y) / 900; u.lunge = 1; u.face = Math.atan2(tw.y - u.y, tw.x - u.x);
        this.tdCalls.push({ x: tw.x, y: tw.y, at: T + fl, r: 52, dmg: 14, team: ATK, from: u, kind: 'boulder', tower: tw });
        S.fx.push({ kind: 'rock', x0: u.x, y0: u.y, x1: tw.x, y1: tw.y, T0: T, T1: T + fl, t0: this.t });
        this.snd('thunk', { pan, gain: 0.9 }); this.callout(u, 'BOULDER!', '#D6A36A');
        break;
      }
      case 'spiderqueen': {
        // webs a tower: it can't fire for 2.5 s; spiderlings hatch behind her
        if (tw) { tw.u.webT = T + 2.5; S.fx.push({ kind: 'web', x0: u.x, y0: u.y, u: tw.u, t0: this.t }); this.callout(tw.u, 'WEBBED!', '#E5E7EB'); this.snd('whoosh', { pan, gain: 0.5 }); }
        for (let i = 0; i < 3; i++) { const o = this.spawnAttacker('spiderling', u.lane, null); this.reserve[ATK]++; this.start[ATK]++; o.s = Math.max(0, u.s - 20 - i * 12); o.x = u.x - Math.cos(u.face) * (u.r + 6 + i * 6); o.y = u.y - Math.sin(u.face) * (u.r + 6); o.max = o.hp = UNIT.spiderling.hp * 0.5; }
        S.fx.push({ kind: 'hatch', x: u.x, y: u.y, t0: this.t });
        break;
      }
      case 'magmacolossus': {
        // a lava pool under a tower (lava feeds fire troops)
        if (!tw) { u.abT = T + 1; return; }
        this.pool5(tw.x, tw.y, 58, 'fire', ATK, u, 3); this.snd('flame', { pan }); this.callout(u, 'LAVA!', '#FF8A1F'); break;
      }
      case 'acidwyrm': {
        if (!tw) { u.abT = T + 1; return; }
        const dist = Math.hypot(tw.x - u.x, tw.y - u.y);
        G.globs.push({ x0: u.x, y0: u.y, x1: tw.x, y1: tw.y, t0: T, at: T + 0.2 + dist / 1500, team: ATK, from: u, lt: this.t });
        this.snd('splash', { pan, gain: 0.7 }); break;
      }
      case 'glaciergiant': {
        // freezing breath on a tower: frozen for 2 s
        if (!tw || Math.hypot(tw.x - u.x, tw.y - u.y) > 220) { u.abT = T + 1; return; }
        tw.u.frozeT = T + 2; this.burst(tw.x, tw.y, '#DCEFFF', 14, 260, 0.5, 7); this.callout(tw.u, 'FROZEN!', '#9BE7FF'); this.snd('freeze', { pan }); break;
      }
      case 'stormcolossus': {
        if (!tw) { u.abT = T + 1; return; }
        this.bolts.push({ x0: u.x, y0: u.y - u.r, x1: tw.x, y1: tw.y, t0: this.t, col: '#C4B5FD' });
        this._shXk = 'lightning'; this.damage(tw.u, 12, u); this._shXk = null; this.snd('thunder', { pan }); this.shake(6); break;
      }
      case 'ironhorn': case 'minotaur': case 'mammoth': case 'rhino': {
        // a charge down the path, trampling whatever blocks it
        u.chargeT = T + 1.1; this.callout(u, 'CHARGE!', '#FCD34D'); this.snd('roar', { pan, gain: 0.8 }); break;
      }
      default: {
        // other titans and bosses stamp: a shock wave that knocks blockers away and shakes nearby towers
        let hit = 0;
        for (const o of this.near(u.x, u.y, u.r + 70)) if (o.team === DEF) { this._kind = 'blast'; this.damage(o, o.tower ? 6 : 8, u); this._kind = undefined; if (!o.tower && !o.dead) this.knock(o, u.x, u.y, 60); hit++; }
        if (hit) { this.shRings && this.shRings.push({ x: u.x, y: u.y, r0: u.r, r1: u.r + 90, t0: this.t, life: 0.4, col: '#F5E6C8', w: 5 }); this.shake(8); this.snd('stomp', { pan }); } else u.abT = T + 1.2;
      }
    }
  },
  nearTower(u, r) {
    let best = null, bd = r;
    for (const tw of this.towers) { if (tw.dead) continue; const d = Math.hypot(tw.x - u.x, tw.y - u.y) - tw.u.r; if (d < bd) { bd = d; best = tw; } }
    return best;
  },
  steerTo(u, tx, ty, v, h, back) {
    const dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy) || 1;
    const sp = Math.min(v * 1.6, d / h * 0.5);
    const k = Math.min(1, 9 * h);
    u.vx += (dx / d * sp - u.vx) * k; u.vy += (dy / d * sp - u.vy) * k;
    u.x += u.vx * h; u.y += u.vy * h;
    if (Math.hypot(u.vx, u.vy) > 4) this.turn(u, Math.atan2(u.vy, u.vx) + (back ? Math.PI : 0), h);
  },
  reachBase(u) {
    if (u.dead) return;
    const b = this.base, T = this.fightT, sz = u.size || sizeOf(u.type);
    // big troops stay and pound the walls; small ones break in and are gone
    if ((sz === 'titan' || sz === 'boss' || (sz === 'giant' && !u.flying)) && !u.escort) {
      if (!u.atBase) { u.atBase = true; u.cd = 0.3; this.callout(u, 'AT THE GATES!', '#FF5A5A'); if (this.camEv) this.camEv.push({ type: 'spot', x: b.x, y: b.y - 40, prio: 70, dur: 1.8, z: 1.6 }); }
      u.vx = 0; u.vy = 0;
      if (u.cd <= 0) { u.cd = (UNIT[u.type].cd || 1.2) * 1.1; u.lunge = 1; this.hitBase(SIEGE[sz] * 0.5 * this.pushK, u); }
      return;
    }
    if (u.escort) { this.hitBase(this.base.hp + 1, u); return; }
    this.hitBase(SIEGE[sz] || 3, u);
    this.burst(u.x, u.y, TEAMS[ATK].c, 8, 220, 0.4, 6);
    u.hp = 0; u.gone = true; u.dead = true; this.alive[ATK]--;
  },
  hitBase(dmg, u) {
    const b = this.base, T = this.fightT;
    if (b.hp <= 0) return;
    // pacing: before the boss wave has had its say, the gate holds (a leak still hurts, less the lower the base is), so the
    // battle is decided at the end, not in the first half
    const bw = this.plan.find(w => w.boss && !w.mini);
    if (bw && !(u.boss || u.escort) && T < bw.at + 12) dmg *= clamp((b.hp - 18) / 60, 0.12, 1);
    if (this.sp3.domes.some(d => d.base && T < d.end)) { dmg *= 0.3; const dm = this.sp3.domes.find(d => d.base); if (dm && dm.hits.length < 12) dm.hits.push([u.x, u.y, this.t]); }
    b.hp = Math.max(0, b.hp - dmg); b.hitT = this.t; b.shake = 1; this.stat.breaches++;
    this.stat.lowBase = Math.min(this.stat.lowBase, b.hp);
    this.shake(dmg > 6 ? 9 : 4); this.snd(dmg > 6 ? 'boom' : 'thud', { pan: this.pan(b.x), gain: 0.7 });
    this.burst(b.x + (u.x - b.x) * 0.4, b.y + (u.y - b.y) * 0.4, '#B8A88A', 8, 220, 0.5, 8);
    if (b.hp < 25 && !this.lowSaid) { this.lowSaid = true; this.chapter('THE BASE IS BELOW 25%', '#FF5A5A'); this.snd('alarm'); }
    if (b.hp <= 0) {
      // the base falls: this is the final blow (the finale knows where it lands)
      this.lastDeath = { t: T, x: b.x, y: b.y, uid: -1, type: 'base', team: DEF, by: u.uid, byType: u.type, byTeam: ATK };
      this.breaker = u;
    }
  },
  wallFalls(w, by) {
    w.dead = true; w.deadT = this.t;
    this.burst(w.x, w.y, '#9A7B55', 18, 300, 0.6, 9, 200); this.shake(5); this.snd('crush', { pan: this.pan(w.x) });
    this.callout(by, 'WALL DOWN!', '#FDBA74');
    this.say(`${labelOf(by.type).replace(/^THE /, '')} BREAKS THE WALL`, ATK);
  },
  // ---------- defenders on foot (barracks swordsmen, skeletons, reinforcements, drones) ----------
  defenderAct(u, h) {
    const T = this.fightT, U = UNIT[u.type];
    u.cd -= h;
    if (this.held(u)) { u.vx *= 0.85; u.vy *= 0.85; return; }
    if (u.drone) return this.droneAct(u, h);
    if (u.lifeEnd && T > u.lifeEnd) { this.vanish(u); return; }
    // hold the path near the rally point: go for the nearest attacker within reach of it
    let t = u.target && !u.target.dead && !u.target.flying ? u.target : null;
    if (!t || T >= (u.retarget || 0)) {
      u.retarget = T + 0.3; t = null; let bd = (u.leash || 150) ** 2;
      const cx = u.rx ?? u.x, cy = u.ry ?? u.y;
      for (const o of this.units) if (o.team === ATK && !o.dead && !o.flying && !o.gone) { const d = (o.x - cx) ** 2 + (o.y - cy) ** 2; if (d < bd) { bd = d; t = o; } }
      u.target = t;
    }
    const v = (U.speed || 80) * 1.2;
    if (t) {
      const dx = t.x - u.x, dy = t.y - u.y, d = Math.hypot(dx, dy) || 1;
      this.turn(u, Math.atan2(dy, dx), h);
      if (d > u.r + t.r + (U.reach || 5)) { this.steerTo(u, t.x, t.y, v, h); }
      else {
        u.vx *= 0.7; u.vy *= 0.7;
        if (u.cd <= 0) {
          u.cd = (U.cd || 0.8) * this.R.range(0.85, 1.15); u.lunge = 1;
          if (U.sword) { const side = u.swordSide || -1; u.swingFrom = side; u.swordSide = -side; u.swing = 1; u.swingStart = side * 1.05; this.snd('swish', { pan: this.pan(u.x), quiet: true }); }
          this.damage(t, (U.dmg || 1) * 2.2 * (u.dmgK || 1), u);
          this.snd(this.hitSfx ? this.hitSfx(u, t) : 'clang', { pan: this.pan(u.x), quiet: true });
        }
      }
    } else if (u.rx !== undefined) {
      const dx = u.rx - u.x, dy = u.ry - u.y;
      if (Math.hypot(dx, dy) > 8) this.steerTo(u, u.rx, u.ry, v * 0.7, h); else { u.vx *= 0.8; u.vy *= 0.8; }
    }
  },
  droneAct(u, h) {
    // a drone flies at an attacker and blows up on it
    const T = this.fightT;
    let t = u.target && !u.target.dead ? u.target : null;
    if (!t) { let bd = 360 * 360; for (const o of this.units) if (o.team === ATK && !o.dead && !o.gone) { const d = (o.x - u.x) ** 2 + (o.y - u.y) ** 2; if (d < bd) { bd = d; t = o; } } u.target = t; }
    if (!t || T > u.lifeEnd) { this.vanish(u); return; }
    this.steerTo(u, t.x, t.y, 260, h);
    if (Math.hypot(t.x - u.x, t.y - u.y) < u.r + t.r + 4) { this.blast({ x: t.x, y: t.y, r: 46, dmg: u.boom || 8, team: DEF, from: u.owner && !u.owner.dead ? u.owner : u, kind: 'bomb', air: true }); this.vanish(u); }
  },
  // ---------- towers ----------
  towerAct(u, h) {
    const T = this.fightT, tw = u.tw, Df = tw.def;
    if (u.webT > T || u.frozeT > T || u.stunT > T) return;
    u.cd -= h * (this.towerRage(tw) ? 1.5 : 1);
    const range = Df.range * TIER.range[tw.tier] * (this.trait.def === 'hunters' ? 1.08 : 1) * (tw.growT > T ? 1.2 : 1);
    // pick a target: the one closest to the base (the classic tower-defence choice), or the strongest, or a flier for anti-air
    let tgt = null, best = -Infinity;
    if (Df.shot !== 'spawn' || Df.spawn === 'drone') for (const o of this.near(u.x, u.y, range + 20)) {
      if (o.team !== ATK || o.dead || o.gone) continue;
      if (o.flying && !o.grounded && Df.ground) continue;
      const d = Math.hypot(o.x - u.x, o.y - u.y); if (d > range) continue;
      let v = Df.prio === 'strong' ? o.hp : (o.fly ? o.s / o.fly.len : o.s / this.lanes[o.lane].len) * 100;
      if ((Df.cls === 'air' || Df.shot === 'pull') && o.flying && !o.grounded) v += 1000;
      if (o.boss) v += Df.truedmg ? 2000 : 30;
      if (o.escort) v += 3000;
      if (Df.shot === 'charm' && (o.boss || isTitan(o.type) || o.charmT > T)) v -= 5000;
      if (v > best) { best = v; tgt = o; }
    }
    // the character turns smoothly to aim (never snaps), and fires once it's lined up
    if (tgt) { this.turn(u, Math.atan2(tgt.y - u.y, tgt.x - u.x), h); u.target = tgt; }
    if (Df.shot === 'spawn' && Df.spawn === 'swordsman') return this.barracksTick(tw);
    if (!tgt || u.cd > 0) return;
    let df = Math.atan2(tgt.y - u.y, tgt.x - u.x) - u.face; df = Math.atan2(Math.sin(df), Math.cos(df));
    if (Math.abs(df) > 0.45) return;
    u.cd = Df.cd * TIER.cd[tw.tier] * this.R.range(0.94, 1.06) * (this.wNow ? this.worldCd() : 1);
    const dmg = Df.dmg * TIER.dmg[tw.tier] * (u.bigT > T ? 1.8 : 1) * (tw.growT > T ? 1.5 : 1) * (this.pushK > 1 ? 1 + (this.pushK - 1) * 0.8 : 1);
    u.muzzle = 1; u.lunge = 1; tw.shotT = this.t;
    const pan = this.pan(u.x);
    this.snd(Df.sfx || 'volley', { pan, quiet: Df.cd < 0.6 });
    const el = tw.el;
    const fx = { burn: Df.burn || (el === 'fire' ? 1 : 0), slow: Df.slow || (el === 'frost' ? [0.6, 1.5] : null), poison: el === 'acid' ? 1 : 0, zap: el === 'storm', holy: el === 'holy' };
    switch (Df.shot) {
      case 'arrow': this.fire(u, tgt, { dmg, kind: el === 'fire' ? 'firearrow' : null, speed: 900, fx, air: Df.airK }); break;
      case 'bolt': this.fire(u, tgt, { dmg, bolt: true, speed: 1200, fx, pierce: true, line: Df.line || 0, air: Df.airK }); break;
      case 'snipe': this.fire(u, tgt, { dmg, kind: 'sniper', speed: 2400, fx, truedmg: true }); break;
      case 'laser': this.fire(u, tgt, { dmg, kind: 'laser', speed: 1500, fx, air: Df.airK }); break;
      case 'cannonball': case 'mortar': case 'boulder': case 'fireball': case 'frostbolt':
        this.lob(u, tgt, { dmg, kind: Df.shot, splash: Df.splash * (tw.tier >= 3 ? 1.15 : 1), fx, freeze: Df.freeze, speed: Df.shot === 'mortar' ? 420 : 520 });
        if (Df.shot !== 'fireball' && Df.shot !== 'frostbolt') this.shake(Df.shot === 'boulder' ? 4 : 2);
        break;
      case 'chain': this.chain(u, tgt, dmg, Df.chain + (tw.tier >= 4 ? 2 : 0)); break;
      case 'glob': { const dist = Math.hypot(tgt.x - u.x, tgt.y - u.y); this.g5.globs.push({ x0: u.x, y0: u.y - 6, x1: tgt.x, y1: tgt.y, t0: T, at: T + 0.2 + dist / 1300, team: DEF, from: u, lt: this.t }); u.dmgK = TIER.dmg[tw.tier]; break; }
      case 'lava': { this.pool5(tgt.x, tgt.y, 46 + tw.tier * 4, 'fire', DEF, u, 2.6); this.burst(tgt.x, tgt.y, '#FF8A1F', 10, 240, 0.5, 7, -60); this._elK = 'fire'; this.damage(tgt, dmg, u); this._elK = null; break; }
      case 'raise': {
        // skeletons claw out of the path in front of the attackers and block it
        const n = 2 + (tw.tier >= 3 ? 1 : 0) + (tw.tier >= 5 ? 1 : 0), L = this.lanes[tgt.lane || 0], s0 = Math.min(L.len - 20, (tgt.s || 0) + 70);
        for (let i = 0; i < n; i++) { const p = laneAt(L, s0 + i * 18), lat = (i % 2 ? 1 : -1) * 12; this.sp3.rises.push({ team: DEF, tb: null, x: p.x + p.nx * lat, y: p.y + p.ny * lat, at: T + 0.3 + i * 0.15, face: Math.atan2(-p.dy, -p.dx), td: { leash: 120, life: 12, dmgK: TIER.dmg[tw.tier] } }); }
        this.callout(u, 'RISE!', '#E5E7EB'); break;
      }
      case 'charm': {
        tgt.charmT = T + 2.2 + tw.tier * 0.25; this._kind = undefined; this.damage(tgt, dmg, u);
        this.marks.push({ kind: 'heart', u: tgt, t0: this.t }); this.callout(tgt, 'CHARMED!', '#F9A8D4'); break;
      }
      case 'pull': {
        // the gravity well: a flier is pulled down (now ground towers can hit it), and everything near it is slowed
        if (tgt.flying && !tgt.grounded) { tgt.grounded = true; tgt.flying = false; this.callout(tgt, 'PULLED DOWN!', '#A5B4FC'); }
        this.damage(tgt, dmg * (tgt.grounded ? 1.6 : 1), u);
        for (const o of this.near(tgt.x, tgt.y, 70)) if (o.team === ATK) this.slowDown(o, 0.55, 1.6);
        this.marks.push({ kind: 'well', x: tgt.x, y: tgt.y, t0: this.t, x0: u.x, y0: u.y }); break;
      }
      case 'breath': {
        // fire breath in a cone
        for (const o of this.near(u.x, u.y, range)) {
          if (o.team !== ATK || o.dead) continue;
          let da = Math.atan2(o.y - u.y, o.x - u.x) - u.face; da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) < 0.38) { this._elK = 'fire'; this.damage(o, dmg * (o.flying ? Df.airK : 1), u); this._elK = null; if (!o.dead) this.burn(o, 1.2, 2, u); }
        }
        const F = this.FX;
        for (let i = 0; i < 12; i++) { const a = u.face + F.range(-0.35, 0.35), vv = F.range(300, 560); this.parts.push({ x: u.x + Math.cos(u.face) * u.r, y: u.y + Math.sin(u.face) * u.r, vx: Math.cos(a) * vv, vy: Math.sin(a) * vv, life: F.range(0.25, 0.42), age: 0, size: F.range(7, 13), color: F.chance(0.5) ? '#FF9F1C' : '#FFD23F', grav: 0 }); }
        break;
      }
      case 'spawn': {
        // drones: two at a time, at most four in the air
        const mine = tw.minions.filter(o => !o.dead);
        if (mine.length >= 4) { u.cd = 0.5; break; }
        for (let i = 0; i < 2; i++) { const o = this.addUnit(DEF, 'drone', u.x + (i ? 10 : -10), u.y - 8); o.drone = true; o.flying = true; o.lifeEnd = T + 8; o.boom = dmg; o.owner = u; o.max = o.hp = 4; tw.minions.push(o); }
        break;
      }
    }
  },
  towerRage(tw) { return tw.u.rageT > this.fightT; },
  barracksTick(tw) {
    const T = this.fightT, u = tw.u;
    tw.minions = tw.minions.filter(o => !o.dead);
    const want = 3 + (tw.tier >= 4 ? 1 : 0);
    if (tw.minions.length >= want || T < (tw.nextMan || 0)) return;
    tw.nextMan = T + Math.max(1.5, 4.5 - tw.tier * 0.5);
    const L = this.lanes[tw.rally.lane], p = laneAt(L, tw.rally.s), off = (tw.minions.length - 1) * 16;
    const type = tw.tier >= 3 ? 'knight' : 'swordsman';
    const o = this.addUnit(DEF, type, u.x, u.y);
    o.rx = p.x + p.dx * off; o.ry = p.y + p.dy * off; o.leash = 130; o.dmgK = TIER.dmg[tw.tier]; o.max = o.hp = UNIT[type].hp * (1 + tw.tier * 0.3);
    tw.minions.push(o);
    if (this.t > 4.3) this.snd('clang', { pan: this.pan(u.x), quiet: true });
  },
  // ---------- shots ----------
  fire(u, t, o) {
    const dx = t.x - u.x, dy = t.y - u.y, d = Math.hypot(dx, dy) || 1, v = o.speed || 900;
    this.arrows.push({ team: u.team, x: u.x + dx / d * (u.r + 4), y: u.y + dy / d * (u.r + 4), vx: dx / d * v, vy: dy / d * v, v, dmg: o.dmg, kind: o.kind || undefined, bolt: !!o.bolt, from: u, tgt: t, home: true, life: d / v * 2 + 0.4,
      fx: o.fx, truedmg: o.truedmg, pierce: o.pierce, line: o.line || 0, air: o.air || 1, atk: o.atk, tracer: true });
  },
  lob(u, t, o) {
    const v = o.speed || 520, d = Math.hypot(t.x - u.x, t.y - u.y), lead = d / v;
    let tx = t.x, ty = t.y;
    // aim where the target will be (along its path)
    if (t.vx !== undefined) { tx += t.vx * lead * 0.9; ty += t.vy * lead * 0.9; }
    const T = Math.max(0.25, Math.hypot(tx - u.x, ty - u.y) / v);
    this.arrows.push({ team: u.team, kind: o.kind, x: u.x, y: u.y, sx: u.x, sy: u.y, tx, ty, t: 0, T, dmg: o.dmg, splash: o.splash, vx: (tx - u.x) / T, vy: (ty - u.y) / T, from: u, fx: o.fx, freeze: o.freeze, lobbed: true });
  },
  chain(u, t, dmg, n) {
    let x0 = u.x, y0 = u.y - u.r * 0.6, cur = t; const hit = new Set();
    for (let i = 0; i < n && cur; i++) {
      hit.add(cur.uid);
      this.bolts.push({ x0, y0, x1: cur.x, y1: cur.y, t0: this.t, col: '#C4B5FD' });
      this._shXk = 'lightning'; this.damage(cur, dmg * (i ? 0.75 : 1) * (cur.flying ? 1.3 : 1), u); this._shXk = null;
      x0 = cur.x; y0 = cur.y;
      let nx = null, bd = 150 * 150;
      for (const o of this.units) if (o.team === ATK && !o.dead && !hit.has(o.uid)) { const d = (o.x - x0) ** 2 + (o.y - y0) ** 2; if (d < bd) { bd = d; nx = o; } }
      cur = nx;
    }
  },
  shotTick(h) {
    if (!this.arrows.length) return;
    const keep = [];
    for (const a of this.arrows) {
      if (a.lobbed) {
        a.t += h; const p = Math.min(1, a.t / a.T);
        a.x = a.sx + (a.tx - a.sx) * p; a.y = a.sy + (a.ty - a.sy) * p;
        if (p >= 1) this.blast({ x: a.tx, y: a.ty, r: a.splash, dmg: a.dmg, team: a.team, from: a.from, kind: a.kind, fx: a.fx, freeze: a.freeze }); else keep.push(a);
        continue;
      }
      // direct shots home in on their target (towers don't miss; the shot only goes when the target dies first)
      const t = a.tgt;
      if (t && !t.dead && !t.gone) {
        const dx = t.x - a.x, dy = t.y - a.y, d = Math.hypot(dx, dy) || 1;
        a.vx = dx / d * a.v; a.vy = dy / d * a.v;
        if (d < t.r + a.v * h + 2) { this.hitShot(a, t); continue; }
      } else if (a.line) {
        // (a ballista bolt flies on through)
      } else { a.life -= h * 3; }
      a.x += a.vx * h; a.y += a.vy * h; a.life -= h;
      if (a.line) for (const o of this.near(a.x, a.y, 20)) if (o.team !== a.team && !o.dead && o !== t && !(a.hitL || (a.hitL = new Set())).has(o.uid) && !o.flying) { a.hitL.add(o.uid); this.damage(o, a.dmg * 0.7 * Math.max(UNIT[o.type].armor || 1, 0.9), a.from); }
      if (a.life > 0 && a.x > AR.x - 40 && a.x < AR.x + AR.w + 40 && a.y > AR.y - 60 && a.y < AR.y + AR.h + 40) keep.push(a);
    }
    this.arrows = keep;
  },
  armorK(o, a) {
    const arm = UNIT[o.type].armor ?? 1;
    if (a.truedmg) return 1;
    let k = a.pierce ? Math.max(arm, 0.9) : Math.max(arm, 0.4);
    if (o.boss) k *= a.pierce ? 0.85 : 0.6;
    return k;
  },
  hitShot(a, t) {
    if (a.atk) {
      // an attacker's shot at a tower
      this.damage(t, a.dmg, a.from && !a.from.dead ? a.from : null);
      return;
    }
    const k = this.armorK(t, a) * (t.flying && !t.grounded ? a.air || 1 : 1) * (this.atkBuff('ward') ? 0.5 : 1);
    if (a.kind === 'sniper' || a.kind === 'laser') this._shXk = a.kind === 'laser' ? 'laser' : null;
    const before = t.hp;
    this.damage(t, a.dmg * k, a.from && !a.from.dead ? a.from : null);
    this._shXk = null;
    if (a.dmg * k >= 6) this.dmgNum(t, Math.min(before, a.dmg * k), a.truedmg ? '#F472B6' : '#FFFFFF');
    if (!t.dead && a.fx) this.applyFx(t, a.fx, a.from);
    this.snd('thunk', { pan: this.pan(t.x), quiet: true });
  },
  applyFx(o, fx, by) {
    if (fx.burn) this.burn(o, fx.burn, 2.5, by);
    if (fx.poison) this.poison(o, fx.poison, 3, by);
    if (fx.slow) this.slowDown(o, fx.slow[0], fx.slow[1]);
    if (fx.zap && !o.dead) { this.bolts.push({ x0: o.x, y0: o.y - 40, x1: o.x, y1: o.y, t0: this.t, col: '#C4B5FD' }); this.dot(o, 1.5, by, 'zap'); }
    if (fx.holy && !o.dead) this.dot(o, (UNIT[o.type].boss || o.boss ? 3 : 1), by);
  },
  // a blast (cannonballs, mortars, boulders, fireballs, frost bolts, bombs, meteors)
  blast(c) {
    const T = this.fightT;
    const el = c.kind === 'fireball' || c.kind === 'meteor' ? 'fire' : c.kind === 'frostbolt' ? 'ice' : null;
    if (this.affOn) this._elK = el === 'fire' ? 'fire' : null;
    this._shXk = c.kind; this._shBx = c.x; this._shBy = c.y;
    let n = 0;
    if (c.tower && !c.tower.dead) { this._kind = 'blast'; this.damage(c.tower, c.dmg, c.from && !c.from.dead ? c.from : null); this._kind = undefined; }
    else for (const o of this.near(c.x, c.y, c.r + 40)) {
      if (o.team === c.team || o.dead || o.gone) continue;
      if (o.flying && !o.grounded && !c.air) continue;
      if (o.tower && c.team === DEF) continue;
      const d = Math.hypot(o.x - c.x, o.y - c.y), reach = c.r + o.r; if (d > reach) continue;
      this._kind = 'blast';
      this.damage(o, c.dmg * (1 - 0.45 * d / reach) * Math.max(UNIT[o.type].armor ?? 1, 0.5) * (o.boss ? 0.6 : 1), c.from && !c.from.dead ? c.from : null);
      this._kind = undefined;
      if (!o.dead && c.fx) this.applyFx(o, c.fx, c.from);
      if (!o.dead && c.freeze && !o.boss && !isTitan(o.type) && this.EVR.chance(c.freeze)) { o.frozeT = T + 1.4; this.callout(o, 'FROZEN!', '#9BE7FF'); }
      n++;
    }
    this._elK = null; this._shXk = null; this._shBx = undefined;
    if (this.shine) this.shineBoom({ kind: c.kind === 'cannonball' ? 'cannonball' : c.kind === 'mortar' ? 'mortar' : c.kind === 'boulder' ? 'boulder' : c.kind === 'meteor' ? 'meteor' : c.kind === 'bomb' ? 'bomb' : c.kind === 'frostbolt' ? 'frostbolt' : 'fireball', x: c.x, y: c.y, splash: c.r });
    this.booms.push({ x: c.x, y: c.y, r: c.r * 0.7, t: 0, magic: c.kind === 'fireball' && false, zap: c.kind === 'frostbolt' });
    if (c.kind === 'frostbolt') this.burst(c.x, c.y, '#DCEFFF', 12, 300, 0.45, 6);
    else if (c.kind === 'fireball') this.burst(c.x, c.y, '#FF8A1F', 12, 300, 0.45, 7);
    else this.burst(c.x, c.y, '#9A8F80', 10, 320, 0.5, 8);
    this.snd(c.kind === 'frostbolt' ? 'freeze' : c.kind === 'fireball' ? 'flame' : 'boom', { pan: this.pan(c.x), gain: c.r > 60 ? 0.8 : 0.5 });
    if (this.camEv) this.camEv.push({ type: 'blast', x: c.x, y: c.y, kind: c.kind });
    if (this.fireG && el === 'fire') this.ignite(c.x, c.y, 0.25);
    return n;
  },
  zoneTick(h) {
    const T = this.fightT;
    // lava vents beside the path flare every few seconds and burn whoever is close (both sides alike: lava feeds fire troops)
    for (const z of this.zones) {
      if (z.kind !== 'lava') continue;
      const on = Math.sin(T * 1.3 + z.ph) > 0.6;
      z.on = on;
      if (!on || T < (z.next || 0)) continue;
      z.next = T + 0.3;
      for (const o of this.near(z.x, z.y, z.r + 30)) if (!o.flying && Math.hypot(o.x - z.x, o.y - z.y) < z.r + 26 + o.r) { if (o.tower) continue; this.burn(o, 1.2, 1.5, null); }
    }
    // the lava bridge layout: anything knocked off the bridge into the lava burns
    if (this.lavaBand) { const B = this.lavaBand; if (T >= (this.lavaAt || 0)) { this.lavaAt = T + 0.25; for (const o of this.units) if (!o.dead && !o.flying && !o.tower && o.y > B.y && o.y < B.y + B.h && Math.abs(o.x - laneAt(this.lanes[0], distToLane(this.lanes[0], o.x, o.y).s).x) > PATH_W / 2 + 4) this.burn(o, 2, 1.5, null); } }
    // sudden-death lava (mode): it creeps down from the top in the last 20 seconds
    if (this.mode === 'lava' && T > this.cap - 20) {
      const k = clamp((T - (this.cap - 20)) / 18, 0, 1); this.lavaY = AR.y + AR.h * 0.62 * k;
      if (!this.lavaSaid) { this.lavaSaid = true; this.chapter('THE LAVA IS RISING', '#FF6B1A'); this.snd('rumble'); }
      if (T >= (this.lavaT || 0)) { this.lavaT = T + 0.3; for (const o of this.units) if (!o.dead && o.y < this.lavaY && !o.flying) { if (o.tower) this.damage(o, 2.5, null); else this.burn(o, 2.4, 1.5, null); } }
    }
  },
  // ---------- the boss ----------
  bossTick() {
    const b = this.bossU, T = this.fightT;
    if (!b || b.dead) return;
    const f = b.hp / b.max;
    if (b.phase === 1 && f < 0.66) { b.phase = 2; this.bossPhase(b, 'ENRAGED'); b.vk *= 1.25; }
    else if (b.phase === 2 && f < 0.33) { b.phase = 3; this.bossPhase(b, 'LAST STAND'); for (let i = 0; i < 4; i++) { const o = this.spawnAttacker(['skeleton', 'goblin', 'orc', 'skeleton'][i], b.lane, null); this.reserve[ATK]++; this.start[ATK]++; o.s = Math.max(0, b.s - 25 - i * 14); o.x = b.x; o.y = b.y; } }
  },
  bossPhase(b, word) {
    this.card({ kind: 'boss', text: `${b.bossName} · ${word}`, col: '#FF5A5A' });
    this.snd('roar', { gain: 1 }); this.shake(10);
    this.shRings && this.shRings.push({ x: b.x, y: b.y, r0: b.r, r1: b.r + 140, t0: this.t, life: 0.6, col: '#FF5A5A', w: 7 });
    if (this.camEv) this.camEv.push({ type: 'spot', follow: b, prio: 82, dur: 1.8, z: 2, ts: 0.4, slowFor: 0.8 });
  },
  // ---------- the ending ----------
  endCheck() {
    if (this.phase !== 'fight') return;
    const T = this.fightT, b = this.base;
    if (b.hp <= 0) return this.finish(ATK);
    if (this.escortU && this.escortU.dead && !this.escortDone) { this.escortDone = true; for (const u of this.units) if (u.team === ATK && !u.dead && !u.boss) u.charmT = T + 99; this.chapter('THE SIEGE ENGINE IS DOWN', COL.gold); }
    const left = this.units.filter(u => u.team === ATK && !u.dead && !u.gone).length + this.reserve[ATK];
    const allOut = this.plan.every(w => w.done);
    if (allOut && left === 0) return this.finish(DEF);
    // the time limit: whoever is still standing at the bell decides it. In the last second the towers loose a final volley at
    // whatever is left if the base can take the rest, otherwise the attackers charge the gate (either way the video ends on a blow)
    if (T >= this.cap - 1.2 && !this.lastCall) {
      this.lastCall = true; this.ranOut = true;
      const atk = this.units.filter(u => u.team === ATK && !u.dead && !u.gone);
      const threat = atk.reduce((s, u) => s + (SIEGE[u.size || 'small'] || 3) * (u.hp / u.max), 0);
      this.lastVerdict = b.hp > threat ? DEF : ATK;
      this.say(this.lastVerdict === DEF ? 'THE TOWERS LOOSE A FINAL VOLLEY' : 'THE ATTACKERS CHARGE THE GATE', this.lastVerdict);
    }
    if (this.lastCall && T >= this.cap - 0.6) {
      const atk = this.units.filter(u => u.team === ATK && !u.dead && !u.gone).sort((a, c) => (c.s || 0) - (a.s || 0));
      if (this.lastVerdict === DEF) {
        // the volley: each remaining attacker struck down by the nearest tower, the leader last
        const tws = this.towers.filter(t => !t.dead);
        for (const u of atk.reverse()) { const tw = tws.sort((a, c) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(c.x - u.x, c.y - u.y))[0]; this.bolts.push({ x0: (tw || b).x, y0: (tw || b).y, x1: u.x, y1: u.y, t0: this.t, col: '#FFE58A' }); this.damage(u, u.hp + 9999, tw ? tw.u : null); }
        this.reserve[ATK] = 0; for (const w of this.plan) w.done = true;
        return this.finish(DEF);
      }
      const lead = atk[0];
      if (lead) this.hitBase(b.hp + 1, lead); else b.hp = 0;
      return this.finish(ATK);
    }
  },
  finish(w) {
    const b = this.base, tws = this.towers.filter(t => !t.dead).length;
    this.tdWinner = w;
    if (w === DEF) {
      const ld = this.lastDeath;
      this.end(DEF, 'SURVIVED!', `THE BASE HOLDS AT ${Math.max(1, Math.round(b.hp))}% · ${tws} TOWER${tws === 1 ? '' : 'S'} STANDING`);
      if (ld) this.endHow = 'kill';
    } else {
      b.hp = 0; b.fallT = this.t;
      this.end(ATK, 'FALLEN!', `${this.atkName().toUpperCase()} BREAK ${this.baseName()}`);
      this.endHow = 'kill';
      this.burst(b.x, b.y, '#B8A88A', 50, 600, 1, 12, 300); this.shake(24); this.snd('boom', { gain: 1 });
    }
  },
  atkName() { return this.atkBand[0].replace(/^THE /, ''); },
  baseName() { return (D.BASE_NAME[this.base.style] || 'THE BASE'); },
  // kills: gold for the defenders (coins fly to the counter), titles and records; a tower that falls leaves rubble
  damage(u, dmg, from) {
    if (!u || u.dead) return;
    if (u.team === ATK && this.atkBuff('ward') && dmg > 0) dmg *= 0.5;
    if (from && from.team === ATK && this.atkBuff('warcry')) dmg *= 1.0;
    if (u.tower && this.sp3.domes.some(d => d.base && this.fightT < d.end && Math.hypot(u.x - d.x, u.y - d.y) < d.r)) dmg *= 0.3;
    // pacing: the boss is the deciding fight, so it can't be shot down long before the end; it takes less the earlier it is
    // (from about a third of the damage when it arrives to all of it in the last 8 s)
    if (u.boss && u === this.bossU && this.bossAt0 !== undefined) dmg *= clamp(0.35 + 0.65 * (this.fightT - this.bossAt0) / Math.max(1, this.cap - 8 - this.bossAt0), 0.35, 1);
    const was = !u.dead;
    RVB.Army.prototype.damage.call(this, u, dmg, from);
    if (was && u.dead) this.onKill(u, from);
  },
  onKill(u, from) {
    if (u.team === ATK) {
      if (!u.gone && !u.fly && u.lane !== undefined && !u.summoned) { this.fallenSpots.push({ x: u.x, y: u.y, lane: u.lane, s: u.s || 0 }); if (this.fallenSpots.length > 30) this.fallenSpots.shift(); }
      const g = Math.round(this.bounty(u));
      this.coins.push({ x: u.x, y: u.y, t0: this.t, g, x1: 0, y1: 0 });
      this.gold += g;
      // the tower that made the kill
      const tw = from && from.tw ? from.tw : from && from.owner && from.owner.tw ? from.owner.tw : null;
      if (tw) { tw.kills++; if (isTitan(u.type) || u.boss) tw.titanKills++; this.stat.towerKills[tw.kind] = (this.stat.towerKills[tw.kind] || 0) + 1; this.champCheck(tw); }
      if (u.boss && u === this.bossU) { this.chapter(`${u.bossName} FALLS`, COL.gold); this.snd('roar', { gain: 0.8 }); }
      if (isTitan(u.type) && !u.boss) this.say(`${labelOf(u.type).replace(/^THE /, '')} SLAIN`, DEF);
    } else if (u.tower) {
      const tw = u.tw; tw.dead = true; tw.deadT = this.t;
      tw.spot.tower = null; tw.spot.wreck = true; tw.spot.was = tw.kind;
      this.rubble.push({ x: tw.x, y: tw.y, t0: this.t, tier: tw.tier, kind: tw.kind });
      this.stat.fell.push(tw.kind);
      this.burst(tw.x, tw.y, '#9A8F80', 30, 420, 0.8, 10, 200); this.shake(14); this.snd('crush', { pan: this.pan(tw.x) }); this.snd('boom', { gain: 0.6 });
      this.card({ kind: 'fall', text: `${tw.def.name} DESTROYED`, col: TEAMS[ATK].c, tk: tw.kind });
      this.say(`${tw.def.name} DESTROYED`, ATK);
      if (this.camEv) this.camEv.push({ type: 'spot', x: tw.x, y: tw.y, prio: 78, dur: 1.8, z: 2, ts: 0.4, slowFor: 0.7 });
    }
  },
  champCheck(tw) {
    if (tw.title) return;
    for (const [name, ok] of D.CHAMP_TITLES) if (ok(tw)) { tw.title = name; this.card({ kind: 'title', text: `${tw.def.name}: ${name}`, col: COL.gold, tk: tw.kind }); this.say(`${tw.def.name} EARNS "${name}"`, DEF); this.snd('streak', { big: true }); break; }
  },
};
Object.assign(TD.prototype, SIM);
module.exports = { TD };
