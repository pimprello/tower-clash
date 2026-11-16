// Tower Clash: weird towers (Rellz, 2026-11-16: "make a variety of cooler towers with better abilities and weird cool abilities").
//
//   PRISM SPIRE   splits a beam of light three ways: red burns, blue slows, gold stuns for a moment
//   VOID ENGINE   opens a little black hole on the path that drags troops into it, crushing them, then pops
//   HEX HUT       a witch turns a troop into a chicken for a few seconds: slow, harmless, and it takes more damage
//                 (bosses and titans shrug it off and are only slowed)
//   CLOCK TOWER   winds a troop back in time: it walks backwards down the path, leaving ghostly afterimages
//   BEE HIVE      lets loose a swarm of angry bees that chases a troop, stinging and slowing it (and finds another if it dies)
//   SHRINK RAY    shrinks the biggest troop it can see for good: less health, smaller, weaker hits
//
// The tower data is in td-data.js TOWERS; the shots are handled here (towerAct hands them over), with their ticks and drawing.
'use strict';
const RVB = require('./engine.js');
const { TD, DEF, ATK } = require('./td.js');
const E = RVB._;
const { COL, TAU, UNIT, clamp, rgba, isTitan, easeOutBack } = E;
const INK = COL.ink || '#0B0F1A';

const WEIRD = {
  weirdShot(u, tgt, tw, dmg, Df) {
    const T = this.fightT, pan = this.pan(u.x);
    this.holes = this.holes || []; this.swarms = this.swarms || []; this.wbeams = this.wbeams || [];
    switch (Df.shot) {
      case 'prism': {
        const near = this.near(tgt.x, tgt.y, 170).filter(o => o !== tgt && o.team === ATK && !o.dead && !o.gone).sort((a, b) => Math.hypot(a.x - tgt.x, a.y - tgt.y) - Math.hypot(b.x - tgt.x, b.y - tgt.y));
        const hits = [tgt].concat(near.slice(0, 1 + (tw.tier >= 3 ? 1 : 0))), cols = ['#F43F5E', '#38BDF8', '#FACC15'], pts = [];
        hits.forEach((o, i) => {
          this.damage(o, dmg, u); pts.push([o.x, o.y, cols[i]]);
          if (o.dead) return;
          if (i === 0) this.burn(o, 2, 2, u); else if (i === 1) this.slowDown(o, 0.6, 1.4); else o.stunT = Math.max(o.stunT || 0, T + 0.4);
        });
        this.wbeams.push({ kind: 'prism', x0: u.x, y0: u.y - 34, pts, t0: this.t });
        return true;
      }
      case 'hole': {
        this.holes.push({ x: tgt.x, y: tgt.y, T0: T, T1: T + 2.2, r: 80 + tw.tier * 6, dps: dmg * 1.6, from: u, t0: this.t, next: T });
        this.snd('phase', { pan, gain: 0.7 }); this.callout(tgt, 'BLACK HOLE!', '#A78BFA');
        return true;
      }
      case 'hex': {
        if (tgt.boss || isTitan(tgt.type) || UNIT[tgt.type].flying) { this.slowDown(tgt, 0.7, 2); this.damage(tgt, dmg, u); this.callout(tgt, 'RESISTED!', '#C084FC'); }
        else { tgt.chickT = T + 2.6 + tw.tier * 0.3; tgt.hexT0 = this.t; this.damage(tgt, dmg, u); this.callout(tgt, 'BAWK!', '#FDE68A'); this.burst(tgt.x, tgt.y, '#C084FC', 12, 200, 0.5, 6, -40); }
        this.wbeams.push({ kind: 'hex', x0: u.x, y0: u.y - 26, pts: [[tgt.x, tgt.y, '#C084FC']], t0: this.t });
        this.snd('phase', { pan, gain: 0.5 });
        return true;
      }
      case 'rewind': {
        const d = tgt.boss ? 0.45 : isTitan(tgt.type) ? 0.7 : 1.3 + tw.tier * 0.1;
        tgt.charmT = Math.max(tgt.charmT || 0, T + d); tgt.rewindT = T + d; tgt.rw = [];
        this.damage(tgt, dmg, u); this.callout(tgt, 'REWIND!', '#7DD3FC');
        this.wbeams.push({ kind: 'clock', x0: u.x, y0: u.y - 30, pts: [[tgt.x, tgt.y, '#7DD3FC']], t0: this.t });
        this.snd('phase', { pan, gain: 0.5 });
        return true;
      }
      case 'bees': {
        this.swarms.push({ u: tgt, T0: T, T1: T + 3.2 + tw.tier * 0.3, next: T + 0.35, dmg, from: u, x0: u.x, y0: u.y - 20, t0: this.t, x: tgt.x, y: tgt.y });
        this.snd('jet', { pan, gain: 0.3, quiet: true });
        return true;
      }
      case 'shrink': {
        if (!tgt.shrunk) {
          const k = tgt.boss ? 0.85 : 0.62;
          tgt.shrunk = k; tgt.shrinkT0 = this.t; tgt.max *= k; tgt.hp = Math.min(tgt.hp, tgt.max); tgt.dmgK = (tgt.dmgK || 1) * k; tgt.r = tgt.r * (0.5 + 0.5 * k);
          this.callout(tgt, 'SHRUNK!', '#86EFAC');
        }
        this.damage(tgt, dmg, u);
        this.wbeams.push({ kind: 'shrink', x0: u.x, y0: u.y - 30, pts: [[tgt.x, tgt.y, '#86EFAC']], t0: this.t });
        this.snd('zap', { pan, gain: 0.4, quiet: true });
        return true;
      }
    }
    return false;
  },
  weirdTick(h) {
    const T = this.fightT;
    if (this.holes) for (const H of this.holes) {
      if (H.done) continue;
      const pull = T < H.T1;
      for (const o of this.near(H.x, H.y, H.r + 20)) {
        if (o.team !== ATK || o.dead || o.gone || o.atBase) continue;
        const dx = H.x - o.x, dy = H.y - o.y, d = Math.hypot(dx, dy); if (d < 2 || d > H.r) continue;
        const k = (o.boss || isTitan(o.type) ? 0.25 : 1) * (0.4 + 0.6 * (1 - d / H.r)), step = Math.min(d - 1, 95 * k * h);
        if (pull) { o.x += dx / d * step; o.y += dy / d * step; }
      }
      if (pull && T >= H.next) { H.next = T + 0.2; for (const o of this.near(H.x, H.y, H.r)) if (o.team === ATK && !o.dead && !o.gone) this.damage(o, H.dps * 0.2 * (1.4 - Math.hypot(o.x - H.x, o.y - H.y) / H.r), H.from && !H.from.dead ? H.from : null); }
      if (!pull) {
        H.done = true; H.popT = this.t;
        for (const o of this.near(H.x, H.y, H.r * 0.6)) if (o.team === ATK && !o.dead && !o.gone) this.damage(o, H.dps * 1.2, H.from && !H.from.dead ? H.from : null);
        this.burst(H.x, H.y, '#A78BFA', 16, 300, 0.5, 6); if (this.shRings) this.shRings.push({ x: H.x, y: H.y, r0: 6, r1: H.r * 0.9, t0: this.t, life: 0.35, col: '#C4B5FD', w: 4 });
        this.snd('boom', { pan: this.pan(H.x), gain: 0.45 });
      }
    }
    if (this.holes && this.holes.length > 6) this.holes = this.holes.filter(H => !H.done || this.t - H.popT < 1);
    if (this.swarms) for (const S of this.swarms) {
      if (S.done) continue;
      if (T > S.T1) { S.done = true; S.tEnd = this.t; continue; }
      if (!S.u || S.u.dead || S.u.gone) {
        let best = null, bd = 140; for (const o of this.near(S.x, S.y, 140)) if (o.team === ATK && !o.dead && !o.gone) { const d = Math.hypot(o.x - S.x, o.y - S.y); if (d < bd) { bd = d; best = o; } }
        if (!best) { S.done = true; S.tEnd = this.t; continue; } S.u = best;
      }
      S.x = S.u.x; S.y = S.u.y;
      if (T >= S.next) { S.next = T + 0.35; this.damage(S.u, S.dmg * 0.6, S.from && !S.from.dead ? S.from : null); if (!S.u.dead) this.slowDown(S.u, 0.75, 0.5); }
    }
    if (this.swarms && this.swarms.length > 10) this.swarms = this.swarms.filter(S => !S.done || this.t - S.tEnd < 1);
    // afterimages of a troop being wound back in time (looks only)
    for (const u of this.units) if (u.rewindT > T && !u.dead) { const rw = u.rw || (u.rw = []); if (!rw.length || this.t - rw[rw.length - 1][2] > 0.06) { rw.push([u.x, u.y, this.t]); if (rw.length > 6) rw.shift(); } }
  },
  // a troop under a spell, drawn differently (called from drawBody): a chicken while hexed; smaller once shrunk
  weirdBody(ctx, u, x, y, draw) {
    const T = this.fightT, t = this.t;
    if (u.chickT > T && !u.dead) {
      const r = (u.r || 12) * 0.95, a = u.face || 0, flap = Math.sin(t * 22) * 0.25, pop = easeOutBack(clamp((t - (u.hexT0 ?? t)) / 0.25, 0, 1));
      ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(-2, r * 0.25, r * 0.95, r * 0.4, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill();
      for (const sd of [-1, 1]) { ctx.save(); ctx.rotate(sd * flap); ctx.beginPath(); ctx.ellipse(-r * 0.15, sd * r * 0.55, r * 0.55, r * 0.28, sd * 0.3, 0, TAU); ctx.fillStyle = '#E5E7EB'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore(); }
      ctx.beginPath(); ctx.moveTo(-r * 0.9, 0); ctx.lineTo(-r * 1.25, -r * 0.3); ctx.lineTo(-r * 1.2, r * 0.3); ctx.closePath(); ctx.fillStyle = '#F3F4F6'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.85, r * 0.62, 0, 0, TAU); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 0.72, 0, r * 0.38, 0, TAU); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.12); ctx.quadraticCurveTo(r * 0.7, -r * 0.4, r * 0.9, -r * 0.1); ctx.lineWidth = 4; ctx.strokeStyle = '#EF4444'; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 1.05, -r * 0.12); ctx.lineTo(r * 1.4, 0); ctx.lineTo(r * 1.05, r * 0.12); ctx.closePath(); ctx.fillStyle = '#F59E0B'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(r * 0.82, sd * r * 0.18, 1.8, 0, TAU); ctx.fillStyle = INK; ctx.fill(); }
      ctx.restore();
      return true;
    }
    if (u.shrunk && u.shrinkT0 !== undefined) {
      const k = 1 - (1 - (0.55 + 0.45 * u.shrunk)) * clamp((t - u.shrinkT0) / 0.4, 0, 1);
      if (k < 0.999) { ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.translate(-x, -y); draw(); ctx.restore(); return true; }
    }
    return false;
  },
  // on the ground: black holes
  drawWeirdGround(ctx) {
    if (!this.holes) return;
    const t = this.t;
    for (const H of this.holes) {
      const a = H.done ? clamp(1 - (t - H.popT) / 0.3, 0, 1) : clamp((t - H.t0) / 0.3, 0, 1); if (a <= 0) continue;
      const R = H.r * (H.done ? 1 + 0.4 * (1 - a) : 1) * (0.6 + 0.4 * a);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(H.x, H.y);
      const g = ctx.createRadialGradient(0, 0, R * 0.08, 0, 0, R);
      g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.3, 'rgba(30,10,60,0.75)'); g.addColorStop(0.7, 'rgba(91,33,182,0.3)'); g.addColorStop(1, 'rgba(91,33,182,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      ctx.rotate(-t * 4);
      for (let i = 0; i < 4; i++) { ctx.beginPath(); for (let k = 0; k <= 20; k++) { const q = k / 20, ang = i * TAU / 4 + q * 3.2, rr = R * (0.95 - q * 0.8); ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } ctx.lineWidth = 3 - i * 0.3; ctx.strokeStyle = i % 2 ? 'rgba(196,181,253,0.55)' : 'rgba(240,171,252,0.45)'; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, R * 0.16, 0, TAU); ctx.fillStyle = '#000000'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#E9D5FF'; ctx.stroke();
      ctx.restore();
    }
  },
  // over everyone: beams and rays, the bees, the rewind afterimages
  drawWeird(ctx) {
    const t = this.t, T = this.fightT;
    if (this.wbeams) {
      this.wbeams = this.wbeams.filter(b => t - b.t0 < 0.45);
      for (const b of this.wbeams) {
        const q = (t - b.t0) / 0.45, a = 1 - q;
        ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
        if (b.kind === 'prism') {
          const sx = b.x0, sy = b.y0 - 14;
          ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(sx, sy); ctx.stroke();
          for (const [x, y, c] of b.pts) { for (const [w, cc] of [[10, rgba(c, 0.35)], [4.5, c], [1.6, '#FFFFFF']]) { ctx.lineWidth = w; ctx.strokeStyle = cc; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(x, y); ctx.stroke(); } }
          ctx.beginPath(); ctx.moveTo(sx, sy - 9); ctx.lineTo(sx + 8, sy + 5); ctx.lineTo(sx - 8, sy + 5); ctx.closePath(); ctx.fillStyle = '#E0F2FE'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
        } else if (b.kind === 'shrink' || b.kind === 'hex' || b.kind === 'clock') {
          const [x, y, c] = b.pts[0], dx = x - b.x0, dy = y - b.y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
          for (const [w, cc] of [[8, rgba(c, 0.35)], [3.5, c]]) {
            ctx.lineWidth = w; ctx.strokeStyle = cc; ctx.beginPath(); ctx.moveTo(b.x0, b.y0);
            for (let k = 1; k <= 14; k++) { const s = k / 14, wob = b.kind === 'hex' ? Math.sin(s * 18 + t * 30) * 7 : b.kind === 'clock' ? Math.sin(s * 9) * 5 : (k % 2 ? 6 : -6); ctx.lineTo(b.x0 + dx * s + nx * wob * (1 - s * 0.6), b.y0 + dy * s + ny * wob * (1 - s * 0.6)); }
            ctx.stroke();
          }
          ctx.beginPath(); ctx.arc(x, y, 10 + 22 * q, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = c; ctx.stroke();
        }
        ctx.restore();
      }
    }
    if (this.swarms) for (const S of this.swarms) {
      const out = S.done ? clamp(1 - (t - S.tEnd) / 0.5, 0, 1) : 1; if (out <= 0) continue;
      const k = clamp((t - S.t0) / 0.4, 0, 1), cx = S.x0 + (S.x - S.x0) * k, cy = S.y0 + (S.y - S.y0) * k - Math.sin(Math.PI * k) * 40;
      ctx.save(); ctx.globalAlpha = out;
      for (let i = 0; i < 9; i++) {
        const ang = t * (5 + i * 0.4) + i * 0.7, rr = 10 + 10 * Math.sin(t * 3 + i), bx = cx + Math.cos(ang) * rr + (S.done ? (t - S.tEnd) * 80 * Math.cos(i) : 0), by = cy + Math.sin(ang) * rr * 0.8 - 6 + (S.done ? (t - S.tEnd) * 80 * Math.sin(i) : 0);
        ctx.beginPath(); ctx.ellipse(bx, by - 2.5, 3, 1.8, ang, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(bx, by, 3.4, 2.4, ang + Math.PI / 2, 0, TAU); ctx.fillStyle = '#FACC15'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx - Math.cos(ang) * 1.2, by - Math.sin(ang) * 1.2); ctx.lineTo(bx + Math.cos(ang) * 1.2, by + Math.sin(ang) * 1.2); ctx.lineWidth = 1.2; ctx.stroke();
      }
      ctx.restore();
    }
    for (const u of this.units) {
      if (!(u.rewindT > T - 0.3) || u.dead || !u.rw) continue;
      const a = clamp((u.rewindT - T) / 0.3 + 1, 0, 1);
      ctx.save();
      u.rw.forEach(([x, y], i) => { ctx.globalAlpha = a * 0.12 * (i + 1); ctx.beginPath(); ctx.arc(x, y, u.r * 0.9, 0, TAU); ctx.fillStyle = '#7DD3FC'; ctx.fill(); });
      ctx.globalAlpha = a; const cx = u.x, cy = u.y - u.r - 22;
      E.disc(ctx, cx, cy, 11, '#E0F2FE', 2.5);
      ctx.lineCap = 'round'; ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(-t * 12) * 7, cy + Math.sin(-t * 12) * 7); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(-t * 3) * 4.5, cy + Math.sin(-t * 3) * 4.5); ctx.stroke();
      ctx.restore();
    }
  },
};
Object.assign(TD.prototype, WEIRD);
module.exports = WEIRD;
