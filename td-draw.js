// Tower Clash: the drawing (looks only: nothing here changes the battle). The engine draws every character, shot, spell and
// particle; this file draws the board (ground and paths, build pads, the base, the towers under their characters, walls,
// rubble, the merchant), the effects on top (lightning, marks, coins) and the screens (scoreboard, story card, roster strips,
// cards, boss bar, bottom panel, outro) and the thumbnail.
'use strict';
const RVB = require('./engine.js');
const D = require('./td-data.js');
const { TD, laneAt, PATH_W, DEF, ATK } = require('./td.js');
const E = RVB._;
const { AR, COL, TEAMS, UNIT, TAU, VW, VH, SAFE, UI_DY, MAP_THEME, clamp, lerp, roundRect, strokeText, font, spaced, easeOutCubic, easeOutBack, rgba, disc, labelOf, fmtTime, drawEmblem, hash01 } = E;
const { TOWERS, TCLASS, ELEM, BOSSES, BOOK, SHAMAN, WAVE_KINDS, LAYOUTS, MODES } = D;

const STONE = '#8C95A8', STONE_D = '#5A6276', STONE_L = '#C3CAD8', INK = COL.ink;
const H01 = (a, b) => hash01((a * 7919) | 0, (b * 104729) | 0);

const DRAW = {
  // ---------- the ground: the map's floor, the paths, the spawn gates and the ground patches (painted once) ----------
  paintGround(c, S) {
    const g = c.getContext('2d');
    g.setTransform(S, 0, 0, S, 0, 0);
    const th = MAP_THEME[this.opts.map] || MAP_THEME.default, M = this.tdMap || D.TD_MAPS.forest;
    g.fillStyle = th.floor; g.fillRect(0, 0, AR.w, AR.h);
    if (th.texture) { try { th.texture(g); } catch (e) { /* plain floor */ } }
    if (!this.lanes) return;   // (called once by the engine before the board exists)
    const lx = p => p[0] - AR.x, ly = p => p[1] - AR.y;
    // the lava under the bridge
    if (this.lavaBand) {
      const B = this.lavaBand, y0 = B.y - AR.y;
      const lg = g.createLinearGradient(0, y0, 0, y0 + B.h); lg.addColorStop(0, '#7A1608'); lg.addColorStop(0.5, '#FF6B1A'); lg.addColorStop(1, '#7A1608');
      g.fillStyle = lg; g.fillRect(0, y0, AR.w, B.h);
      g.fillStyle = 'rgba(255,214,90,0.55)';
      for (let i = 0; i < 26; i++) { const x = H01(i, 3) * AR.w, y = y0 + 12 + H01(i, 7) * (B.h - 24); g.beginPath(); g.ellipse(x, y, 10 + H01(i, 9) * 22, 4 + H01(i, 11) * 5, 0, 0, TAU); g.fill(); }
      g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(0, y0); g.lineTo(AR.w, y0); g.moveTo(0, y0 + B.h); g.lineTo(AR.w, y0 + B.h); g.stroke();
    }
    // the paths: a dark edge, the path itself, worn stones and a soft centre line
    const stroke = (w, col) => { g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = w; g.strokeStyle = col; for (const L of this.lanes) { g.beginPath(); L.P.forEach((p, i) => (i ? g.lineTo(lx(p), ly(p)) : g.moveTo(lx(p), ly(p)))); g.stroke(); } };
    stroke(PATH_W + 22, 'rgba(0,0,0,0.28)');
    stroke(PATH_W + 12, M.edge);
    stroke(PATH_W, M.path);
    stroke(PATH_W - 22, rgba('#FFFFFF', 0.06));
    // worn stones along each lane (fixed spots, the same every time on this layout)
    for (let li = 0; li < this.lanes.length; li++) {
      const L = this.lanes[li];
      for (let s = 10, k = 0; s < L.len; s += 26, k++) {
        const p = laneAt(L, s), lat = (H01(li * 100 + k, 1) - 0.5) * (PATH_W - 16), r = 3 + H01(k, li + 5) * 4;
        g.beginPath(); g.ellipse(p.x - AR.x + p.nx * lat, p.y - AR.y + p.ny * lat, r * 1.4, r, Math.atan2(p.dy, p.dx), 0, TAU);
        g.fillStyle = rgba('#000000', 0.13); g.fill();
      }
    }
    // the bridge over the lava: planks on the path where it crosses
    if (this.lavaBand) {
      const B = this.lavaBand, L = this.lanes[0];
      for (let s = 0; s < L.len; s += 14) {
        const p = laneAt(L, s); if (p.y < B.y - 6 || p.y > B.y + B.h + 6) continue;
        g.save(); g.translate(p.x - AR.x, p.y - AR.y); g.rotate(Math.atan2(p.dy, p.dx));
        g.fillStyle = '#8A6A49'; g.fillRect(-5, -PATH_W / 2 - 6, 10, PATH_W + 12); g.lineWidth = 2; g.strokeStyle = '#3E2C1C'; g.strokeRect(-5, -PATH_W / 2 - 6, 10, PATH_W + 12);
        g.restore();
      }
    }
    // ground patches that do something
    for (const z of this.zones || []) {
      const x = z.x - AR.x, y = z.y - AR.y;
      if (z.kind === 'lava') {
        g.beginPath(); g.arc(x, y, z.r, 0, TAU); g.fillStyle = '#2A0E06'; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
        g.beginPath(); g.arc(x, y, z.r * 0.6, 0, TAU); g.fillStyle = '#B5300C'; g.fill();
      } else {
        const col = z.kind === 'ice' ? 'rgba(200,240,255,0.55)' : z.kind === 'sand' ? 'rgba(232,206,150,0.55)' : 'rgba(58,42,24,0.55)';
        g.beginPath(); g.ellipse(x, y, z.r, z.r * 0.62, 0.3, 0, TAU); g.fillStyle = col; g.fill();
        if (z.kind === 'ice') { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - z.r * 0.5, y - 6); g.lineTo(x + z.r * 0.3, y + 4); g.moveTo(x - 6, y - z.r * 0.4); g.lineTo(x + 10, y + z.r * 0.3); g.stroke(); }
      }
    }
    this.paintProps(g);
    // the spawn gates: a dark archway where each lane comes in at the top
    const seen = new Set();
    for (const L of this.lanes) {
      const p = laneAt(L, 0), q = laneAt(L, Math.min(L.len, 60)), key = Math.round(p.x) + ',' + Math.round(p.y);
      if (seen.has(key)) continue; seen.add(key);
      let s = 0; while (s < L.len && laneAt(L, s).y < AR.y) s += 4;
      const e = laneAt(L, s), x = e.x - AR.x, y = 0;
      const grd = g.createLinearGradient(0, 0, 0, 90); grd.addColorStop(0, 'rgba(0,0,0,0.75)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(x - PATH_W, y, PATH_W * 2, 90);
      g.fillStyle = STONE_D; g.strokeStyle = INK; g.lineWidth = 4;
      for (const sx of [-1, 1]) { g.beginPath(); g.rect(x + sx * (PATH_W / 2 + 10) - 11, y - 4, 22, 34); g.fill(); g.stroke(); }
      void q;
    }
  },
  // scenery off the paths, in the map's style (fixed spots for each layout and map; looks only)
  paintProps(g) {
    const key = this.opts.map, era = (this.tdMap || {}).era;
    const kind = { forest: 'tree', enchanted: 'magic', castle: 'tree', swamp: 'swamp', snow: 'pine', frozen: 'pine', beach: 'palm', dunes: 'desert', bombed: 'city', moon: 'moon', neon: 'neon', graveyard: 'grave', furnace: 'ember', temple: 'temple' }[key] || (era === 'scifi' ? 'moon' : 'tree');
    const pts = [];
    for (const L of this.lanes) for (let s = 0; s < L.len; s += 12) { const p = laneAt(L, s); pts.push([p.x - AR.x, p.y - AR.y]); }
    const free = (x, y, r) => {
      if (x < r || y < r || x > AR.w - r || y > AR.h - r) return false;
      for (const [px, py] of pts) if ((px - x) ** 2 + (py - y) ** 2 < (PATH_W / 2 + 14 + r) ** 2) return false;
      for (const s of this.spots) if ((s.x - AR.x - x) ** 2 + (s.y - AR.y - y) ** 2 < (34 + r) ** 2) return false;
      const b = this.base; if ((b.x - AR.x - x) ** 2 + (b.y - AR.y - y) ** 2 < (110 + r) ** 2) return false;
      if (this.lavaBand && y + r > this.lavaBand.y - AR.y && y - r < this.lavaBand.y - AR.y + this.lavaBand.h) return false;
      if (this.merch && (this.merch.x - AR.x - x) ** 2 + (this.merch.y - AR.y - y) ** 2 < (70 + r) ** 2) return false;
      for (const z of this.zones || []) if ((z.x - AR.x - x) ** 2 + (z.y - AR.y - y) ** 2 < (z.r + r) ** 2) return false;
      return true;
    };
    const S = E.rng(hash01(this.layoutKey.length * 977, key.length * 131) * 1e9 ^ 0x51A7E);
    const placed = [];
    for (let i = 0; i < 260 && placed.length < 46; i++) {
      const r = S.range(10, 26), x = S.range(0, AR.w), y = S.range(0, AR.h);
      if (!free(x, y, r)) continue;
      if (placed.some(p => (p.x - x) ** 2 + (p.y - y) ** 2 < (p.r + r + 6) ** 2)) continue;
      placed.push({ x, y, r, v: S.next(), a: S.range(0, TAU) });
    }
    placed.sort((a, b) => a.y - b.y);
    const shadow = (x, y, r) => { g.beginPath(); g.ellipse(x + r * 0.35, y + r * 0.45, r * 1.05, r * 0.8, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,0.28)'; g.fill(); };
    const blob = (x, y, r, c, line = 3) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = c; g.fill(); if (line) { g.lineWidth = line; g.strokeStyle = INK; g.stroke(); } };
    const shade = (x, y, r, c) => { const rg = g.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r); rg.addColorStop(0, 'rgba(255,255,255,0.35)'); rg.addColorStop(0.6, 'rgba(255,255,255,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.25)'); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = rg; g.fill(); void c; };
    const rock = (x, y, r, c = '#8E8A80') => { shadow(x, y, r * 0.8); g.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * TAU, rr = r * (0.7 + 0.3 * hash01(k, Math.round(x))); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8); } g.closePath(); g.fillStyle = c; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); shade(x, y, r * 0.8); };
    const tree = (x, y, r, c1, c2) => { shadow(x, y, r); blob(x, y, r, c1); blob(x - r * 0.25, y - r * 0.25, r * 0.6, c2, 0); shade(x, y, r); };
    for (const p of placed) {
      const { x, y, r, v } = p;
      if (kind === 'tree' || kind === 'magic' || kind === 'swamp') {
        if (v < 0.62) tree(x, y, r, kind === 'magic' ? (v < 0.3 ? '#7C4DCC' : '#2F8F7A') : kind === 'swamp' ? '#3F5A2A' : '#2F7A3A', kind === 'magic' ? (v < 0.3 ? '#A88BF0' : '#4FC3A1') : kind === 'swamp' ? '#5E7A3A' : '#46A04E');
        else if (v < 0.85) { shadow(x, y, r * 0.6); for (let k = 0; k < 3; k++) blob(x + (k - 1) * r * 0.45, y + (k === 1 ? -r * 0.2 : 0), r * 0.42, kind === 'swamp' ? '#4E6A32' : '#3E8F48', 2.5); if (kind === 'magic') { blob(x, y - r * 0.1, 4, '#F9A8D4', 1.5); } }
        else rock(x, y, r * 0.7);
      } else if (kind === 'pine') {
        if (v < 0.65) { shadow(x, y, r); for (let k = 0; k < 3; k++) { const rr = r * (1 - k * 0.28); g.beginPath(); for (let j = 0; j < 8; j++) { const a = j / 8 * TAU, q = j % 2 ? rr * 0.7 : rr; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); g.fillStyle = k === 2 ? '#F4FAFF' : k ? '#3E7A62' : '#2E5E4C'; g.fill(); g.lineWidth = k ? 2 : 3; g.strokeStyle = INK; g.stroke(); } }
        else rock(x, y, r * 0.7, '#B9C6D3');
      } else if (kind === 'palm' || kind === 'desert') {
        if (kind === 'palm' && v < 0.5) { shadow(x, y, r); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + p.a; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.6, r * 0.22, a, 0, TAU); g.fillStyle = k % 2 ? '#3E9A4A' : '#2F7A3A'; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke(); } blob(x, y, r * 0.2, '#8A6A49', 2); }
        else if (kind === 'desert' && v < 0.45) { shadow(x, y, r * 0.6); blob(x, y, r * 0.5, '#4E9A52'); blob(x - r * 0.45, y - r * 0.1, r * 0.25, '#4E9A52', 2); blob(x + r * 0.45, y + r * 0.1, r * 0.25, '#4E9A52', 2); }
        else rock(x, y, r * 0.65, '#C9A87A');
      } else if (kind === 'city' || kind === 'moon' || kind === 'neon') {
        if (v < 0.4) { const s = r * 1.3; shadow(x, y, s * 0.6); g.save(); g.translate(x, y); g.rotate(p.a * 0.2); g.fillStyle = kind === 'neon' ? '#2E2A48' : '#8A6A49'; g.fillRect(-s / 2, -s / 2, s, s); g.lineWidth = 3; g.strokeStyle = kind === 'neon' ? '#C084FC' : INK; g.strokeRect(-s / 2, -s / 2, s, s); g.beginPath(); g.moveTo(-s / 2, -s / 2); g.lineTo(s / 2, s / 2); g.moveTo(s / 2, -s / 2); g.lineTo(-s / 2, s / 2); g.lineWidth = 2; g.stroke(); g.restore(); }
        else if (v < 0.75) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fill(); g.beginPath(); g.arc(x - 2, y - 2, r * 0.75, 0, TAU); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(x, y, r, Math.PI * 0.9, Math.PI * 1.7); g.stroke(); }
        else rock(x, y, r * 0.6, kind === 'moon' ? '#9AA0AA' : '#6E7480');
        if (kind === 'neon' && v > 0.9) blob(x, y, 5, '#22D3EE', 2);
      } else if (kind === 'grave') {
        if (v < 0.55) { shadow(x, y, r * 0.6); g.beginPath(); g.moveTo(x - r * 0.45, y + r * 0.5); g.lineTo(x - r * 0.45, y - r * 0.2); g.arc(x, y - r * 0.2, r * 0.45, Math.PI, 0); g.lineTo(x + r * 0.45, y + r * 0.5); g.closePath(); g.fillStyle = '#8C8A96'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); g.beginPath(); g.moveTo(x, y - r * 0.4); g.lineTo(x, y + r * 0.1); g.moveTo(x - r * 0.18, y - r * 0.2); g.lineTo(x + r * 0.18, y - r * 0.2); g.lineWidth = 2; g.stroke(); }
        else if (v < 0.8) { shadow(x, y, r * 0.5); g.lineCap = 'round'; for (let k = 0; k < 5; k++) { const a = p.a + k * 1.26; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#4A3A30'; g.stroke(); } }
        else rock(x, y, r * 0.6, '#6E6A76');
      } else if (kind === 'ember') {
        rock(x, y, r * 0.75, '#3A2A24');
        if (v < 0.5) { g.beginPath(); g.arc(x, y, r * 0.25, 0, TAU); g.fillStyle = '#FF7A1A'; g.fill(); }
      } else if (kind === 'temple') {
        if (v < 0.45) { shadow(x, y, r * 0.7); blob(x, y, r * 0.6, '#E6DCC0'); blob(x, y, r * 0.38, '#CFC2A0', 2); shade(x, y, r * 0.6); }
        else if (v < 0.8) tree(x, y, r * 0.8, '#3E8F48', '#5DB868');
        else rock(x, y, r * 0.6, '#BFB394');
      }
    }
    // a soft vignette so the board reads as one picture
    const vg = g.createRadialGradient(AR.w / 2, AR.h / 2, AR.w * 0.35, AR.w / 2, AR.h / 2, AR.w * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.32)');
    g.fillStyle = vg; g.fillRect(0, 0, AR.w, AR.h);
  },
  // nothing from Army Clash's maps (trees, walls) stands on the board
  paintMap(c, S) { const g = c.getContext('2d'); g.setTransform(S, 0, 0, S, 0, 0); g.clearRect(0, 0, AR.w, AR.h); },

  // ---------- under the characters: build pads, rubble, walls, the base, the towers, the merchant ----------
  drawLiveDecor(ctx) {
    const t = this.t, T = this.fightT;
    // lava glow over the bridge's lava, and the vents flaring
    if (this.lavaBand) { const B = this.lavaBand; ctx.fillStyle = `rgba(255,170,60,${0.1 + 0.08 * Math.sin(t * 2.3)})`; ctx.fillRect(AR.x, B.y, AR.w, B.h); }
    for (const z of this.zones) if (z.kind === 'lava') {
      const k = z.on ? 1 : 0.25 + 0.15 * Math.sin(t * 3 + z.ph);
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 0.6, 0, TAU); ctx.fillStyle = `rgba(255,${120 + 80 * k},40,${0.35 + 0.5 * k})`; ctx.fill();
      if (z.on) for (let i = 0; i < 3; i++) { const h = 30 + 20 * Math.sin(t * 11 + i * 2), x = z.x + (i - 1) * 10; ctx.beginPath(); ctx.moveTo(x - 7, z.y); ctx.quadraticCurveTo(x, z.y - h, x + 7, z.y); ctx.fillStyle = i === 1 ? '#FFD23F' : '#FF7A1A'; ctx.fill(); }
    }
    // build pads
    for (const s of this.spots) {
      if (s.tower) continue;
      if (s.wreck) continue;
      ctx.beginPath(); ctx.arc(s.x, s.y, 20, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill();
      ctx.setLineDash([6, 6]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.stroke(); ctx.setLineDash([]);
    }
    // rubble where a tower fell
    for (const r of this.rubble) {
      const sp = this.spots.find(s => Math.abs(s.x - r.x) < 1 && Math.abs(s.y - r.y) < 1);
      if (sp && sp.tower) continue;
      const k = clamp((t - r.t0) / 0.3, 0, 1);
      for (let i = 0; i < 9; i++) {
        const a = H01(r.x + i, r.y) * TAU, d = 6 + H01(i, r.x) * 22 * (0.6 + 0.4 * k), rr = 5 + H01(r.y, i) * 6;
        ctx.beginPath(); ctx.arc(r.x + Math.cos(a) * d, r.y + Math.sin(a) * d, rr, 0, TAU); ctx.fillStyle = i % 3 ? STONE_D : STONE; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      }
    }
    // walls across the path
    for (const w of this.walls) this.drawWall(ctx, w);
    // the base
    this.drawBase(ctx);
    // the towers (the character on top is drawn by the engine with the troops)
    for (const tw of this.towers) if (!tw.dead) this.drawTowerBase(ctx, tw);
    // the merchant's cart beside the base
    if (this.merch && T < this.merch.end + 0.6) this.drawMerchant(ctx);
  },
  drawWall(ctx, w) {
    const L = PATH_W + 18;
    ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(w.a + Math.PI / 2);
    if (w.dead) {
      const k = clamp((this.t - w.deadT) / 0.4, 0, 1);
      for (let i = -3; i <= 3; i++) { ctx.save(); ctx.translate(i * 10 + i * 6 * k, (i % 2 ? 8 : -6) * k); ctx.rotate(i * 0.4 * k); ctx.fillStyle = COL.wood; ctx.fillRect(-4, -10, 8, 20); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeRect(-4, -10, 8, 20); ctx.restore(); }
      ctx.restore(); return;
    }
    const hit = clamp(1 - (this.t - w.hitT) / 0.15, 0, 1), dmg = 1 - w.hp / w.max;
    ctx.translate(hit * 2 * Math.sin(this.t * 80), 0);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-L / 2 + 4, -5, L, 16);
    for (let i = 0; i < 7; i++) {
      const x = -L / 2 + i * (L / 7) + L / 14;
      ctx.beginPath(); ctx.moveTo(x - 6, 8); ctx.lineTo(x - 6, -10); ctx.lineTo(x, -18); ctx.lineTo(x + 6, -10); ctx.lineTo(x + 6, 8); ctx.closePath();
      ctx.fillStyle = i % 2 ? COL.wood : '#9B7A55'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    }
    ctx.fillStyle = COL.woodD; ctx.fillRect(-L / 2, -4, L, 6); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeRect(-L / 2, -4, L, 6);
    if (dmg > 0.35) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(-2, -2); ctx.lineTo(-10, 6); if (dmg > 0.65) { ctx.moveTo(14, -10); ctx.lineTo(8, 0); ctx.lineTo(16, 6); } ctx.stroke(); }
    ctx.restore();
  },
  // the base: the defenders' keep (or fortress, temple, reactor, flagship) at the end of the path(s)
  drawBase(ctx) {
    const b = this.base, t = this.t, tm = TEAMS[DEF], st = b.style, hp = b.hp / b.max;
    const shake = clamp(1 - (t - b.hitT) / 0.25, 0, 1) * 3;
    ctx.save(); ctx.translate(b.x + Math.sin(t * 70) * shake, b.y);
    const fallen = b.hp <= 0 && b.fallT !== undefined, fk = fallen ? clamp((t - b.fallT) / 0.6, 0, 1) : 0;
    // shadow
    ctx.beginPath(); ctx.ellipse(8, 12, 80, 62, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fill();
    if (fallen) {
      for (let i = 0; i < 22; i++) {
        const a = H01(i, 21) * TAU, d = H01(i, 5) * 70 * (0.5 + 0.5 * fk), rr = 6 + H01(i, 8) * 10;
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d * 0.8, rr, 0, TAU); ctx.fillStyle = i % 4 === 0 ? tm.d : i % 2 ? STONE_D : STONE; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      }
      ctx.restore(); return;
    }
    const wall = st === 'temple' ? '#D9C79A' : st === 'reactor' ? '#5B6576' : st === 'ship' ? '#8A6A49' : st === 'fortress' ? '#6E7484' : STONE;
    const wallD = st === 'temple' ? '#A8925E' : st === 'reactor' ? '#343B48' : st === 'ship' ? '#5B4430' : st === 'fortress' ? '#454A57' : STONE_D;
    if (st === 'ship') {
      // a flagship moored at the end of the path: hull, deck, mast and sail
      ctx.beginPath(); ctx.moveTo(-70, -26); ctx.quadraticCurveTo(-90, 0, -70, 26); ctx.lineTo(60, 30); ctx.quadraticCurveTo(100, 0, 60, -30); ctx.closePath();
      ctx.fillStyle = wall; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-58, -16); ctx.lineTo(54, -18); ctx.lineTo(54, 18); ctx.lineTo(-58, 16); ctx.closePath(); ctx.fillStyle = '#B08A5E'; ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
      for (let x = -48; x < 54; x += 14) { ctx.beginPath(); ctx.moveTo(x, -17); ctx.lineTo(x, 17); ctx.strokeStyle = 'rgba(60,40,20,0.5)'; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(0, -2, 34, 52, 0, 0, TAU); ctx.fillStyle = tm.c; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
      disc(ctx, 0, -2, 8, '#5B4430', 3);
    } else if (st === 'temple' || st === 'reactor') {
      // round: a domed temple, or a reactor with a glowing core
      const n = st === 'reactor' ? 6 : 10, R = 66;
      ctx.beginPath(); for (let i = 0; i < n; i++) { const a = i / n * TAU - Math.PI / 2; ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); } ctx.closePath();
      ctx.fillStyle = wall; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
      for (let i = 0; i < n; i++) { const a = i / n * TAU - Math.PI / 2; disc(ctx, Math.cos(a) * R, Math.sin(a) * R, 11, wallD, 3); }
      if (st === 'reactor') {
        const p = 0.5 + 0.5 * Math.sin(t * 4);
        const rg = ctx.createRadialGradient(0, 0, 4, 0, 0, 46); rg.addColorStop(0, '#FFFFFF'); rg.addColorStop(0.3, tm.l); rg.addColorStop(1, rgba(tm.c, 0));
        ctx.beginPath(); ctx.arc(0, 0, 46 + 4 * p, 0, TAU); ctx.fillStyle = rg; ctx.fill();
        disc(ctx, 0, 0, 22, tm.c, 4);
      } else {
        const rg = ctx.createRadialGradient(-14, -16, 4, 0, 0, 48); rg.addColorStop(0, '#FFF6D0'); rg.addColorStop(0.5, '#F2C14E'); rg.addColorStop(1, '#B07A1E');
        ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fillStyle = rg; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
        disc(ctx, 0, 0, 10, tm.c, 3);
      }
    } else {
      // a square keep with four corner towers and a pointed roof in the defenders' colour
      const R = 54;
      ctx.beginPath(); ctx.rect(-R, -R, R * 2, R * 2); ctx.fillStyle = wall; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.strokeStyle = wallD; ctx.lineWidth = 2;
      for (let y = -R + 14; y < R; y += 14) { ctx.beginPath(); ctx.moveTo(-R, y); ctx.lineTo(R, y); ctx.stroke(); }
      // the roof
      ctx.beginPath(); ctx.moveTo(-R + 12, -R + 12); ctx.lineTo(R - 12, -R + 12); ctx.lineTo(R - 12, R - 12); ctx.lineTo(-R + 12, R - 12); ctx.closePath(); ctx.fillStyle = tm.c; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-R + 12, -R + 12); ctx.lineTo(0, 0); ctx.lineTo(R - 12, -R + 12); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-R + 12, R - 12); ctx.lineTo(0, 0); ctx.lineTo(R - 12, R - 12); ctx.closePath(); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-R + 12, -R + 12); ctx.lineTo(R - 12, R - 12); ctx.moveTo(R - 12, -R + 12); ctx.lineTo(-R + 12, R - 12); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        disc(ctx, sx * R, sy * R, 19, wallD, 4);
        disc(ctx, sx * R, sy * R, 11, tm.d, 3);
      }
    }
    // damage: cracks, then fire
    if (hp < 0.66) {
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(-30, -40); ctx.lineTo(-18, -20); ctx.lineTo(-28, -4); ctx.moveTo(26, 30); ctx.lineTo(14, 16); ctx.lineTo(24, 2);
      if (hp < 0.4) { ctx.moveTo(-44, 26); ctx.lineTo(-26, 34); ctx.lineTo(-16, 50); ctx.moveTo(36, -44); ctx.lineTo(30, -24); }
      ctx.stroke();
    }
    if (hp < 0.4) for (let i = 0; i < 3; i++) {
      const fx = [-30, 28, 4][i], fy = [-30, 20, 40][i], f = 0.8 + 0.25 * Math.sin(t * 13 + i * 2.1), h = 26 * f;
      ctx.beginPath(); ctx.moveTo(fx - 9, fy + 6); ctx.quadraticCurveTo(fx - 9, fy - h * 0.5, fx + Math.sin(t * 9 + i) * 3, fy - h); ctx.quadraticCurveTo(fx + 9, fy - h * 0.5, fx + 9, fy + 6); ctx.closePath();
      ctx.fillStyle = '#FF7A1A'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    }
    // the shield dome glow
    if (b.healT !== undefined && t - b.healT < 0.8) { ctx.beginPath(); ctx.arc(0, 0, 80, 0, TAU); ctx.lineWidth = 6; ctx.strokeStyle = `rgba(124,255,176,${0.8 * (1 - (t - b.healT) / 0.8)})`; ctx.stroke(); }
    // a hit flashes white
    const fl = clamp(1 - (t - b.hitT) / 0.12, 0, 1);
    if (fl > 0) { ctx.beginPath(); ctx.arc(0, 0, 70, 0, TAU); ctx.fillStyle = `rgba(255,255,255,${0.35 * fl})`; ctx.fill(); }
    ctx.restore();
    // health bar under the base
    const bw = 150, bx = b.x - bw / 2, by = b.y + 76;
    if (by < AR.y + AR.h - 4) {
      roundRect(ctx, bx - 3, by - 3, bw + 6, 16, 8); ctx.fillStyle = INK; ctx.fill();
      roundRect(ctx, bx, by, bw * clamp(hp, 0, 1), 10, 5); ctx.fillStyle = hp > 0.5 ? '#4ADE80' : hp > 0.25 ? '#FACC15' : '#F43F5E'; ctx.fill();
    }
  },
  // a tower under its character: a round stone platform with battlements (bigger, taller and glowing as it's upgraded)
  drawTowerBase(ctx, tw) {
    const t = this.t, u = tw.u, k = tw.tier, R = Math.max(25, u.r + 11) + (k >= 3 ? 4 : 0) + (k >= 5 ? 3 : 0);
    const drop = tw.drop !== undefined ? clamp((t - tw.drop) / 0.35, 0, 1) : 1, s = lerp(1.5, 1, easeOutCubic(drop));
    ctx.save(); ctx.translate(tw.x, tw.y); if (drop < 1) { ctx.globalAlpha = drop; ctx.scale(s, s); }
    // tier 5: a golden aura; tier 4: the element's glow
    if (k >= 5) { const p = 0.5 + 0.5 * Math.sin(t * 3 + tw.x); const rg = ctx.createRadialGradient(0, 0, R * 0.6, 0, 0, R + 26); rg.addColorStop(0, 'rgba(255,210,63,0.45)'); rg.addColorStop(1, 'rgba(255,210,63,0)'); ctx.beginPath(); ctx.arc(0, 0, R + 22 + 4 * p, 0, TAU); ctx.fillStyle = rg; ctx.fill(); }
    if (k >= 4 && tw.el) { const p = 0.5 + 0.5 * Math.sin(t * 4 + tw.y); ctx.beginPath(); ctx.arc(0, 0, R + 6, 0, TAU); ctx.lineWidth = 5; ctx.strokeStyle = rgba(ELEM[tw.el].col, 0.45 + 0.4 * p); ctx.stroke(); }
    // shadow (taller towers cast a longer one)
    const sh = 5 + k * 2;
    ctx.beginPath(); ctx.ellipse(sh, sh + 2, R + 2, R * 0.9, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    // the wall
    const hit = u.flash > 0 ? u.flash : 0;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU);
    const g = ctx.createRadialGradient(-R * 0.4, -R * 0.4, 2, 0, 0, R); g.addColorStop(0, k >= 5 ? '#F5E2A0' : STONE_L); g.addColorStop(1, k >= 5 ? '#B8902E' : STONE);
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    // battlements
    const n = k >= 3 ? 10 : 8;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + 0.2, x = Math.cos(a) * (R - 2), y = Math.sin(a) * (R - 2);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.rect(-4, -5.5, 8, 11); ctx.fillStyle = k >= 5 ? '#F5D77A' : STONE_L; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
    }
    // the floor the character stands on
    ctx.beginPath(); ctx.arc(0, 0, R - 9, 0, TAU); ctx.fillStyle = k >= 5 ? '#8A6A1E' : STONE_D; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    // the class colour as a thin ring on the floor
    const C = TCLASS[tw.def.cls]; if (C) { ctx.beginPath(); ctx.arc(0, 0, R - 13, 0, TAU); ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(C.col, 0.7); ctx.stroke(); }
    if (hit) { ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fillStyle = `rgba(255,255,255,${hit * 0.5})`; ctx.fill(); }
    // a banner in the defenders' colour on the bigger towers
    if (k >= 3) {
      const fx = R * 0.72, fy = -R * 0.72;
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 22); ctx.stroke();
      const w = Math.sin(t * 6 + tw.x) * 2;
      ctx.beginPath(); ctx.moveTo(fx, fy - 22); ctx.quadraticCurveTo(fx + 9, fy - 24 + w, fx + 17, fy - 19); ctx.lineTo(fx, fy - 13); ctx.closePath(); ctx.fillStyle = TEAMS[DEF].c; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
  },
  drawMerchant(ctx) {
    const m = this.merch, T = this.fightT, t = this.t;
    const a = clamp((T - m.t0) / 0.4, 0, 1) * clamp((m.end + 0.6 - T) / 0.6, 0, 1);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(m.x, m.y);
    // a covered cart with a striped canopy and a gold sign
    ctx.beginPath(); ctx.ellipse(4, 22, 44, 12, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    for (const wx of [-24, 24]) disc(ctx, wx, 16, 10, '#5B4430', 3);
    roundRect(ctx, -38, -14, 76, 30, 6); ctx.fillStyle = '#9B7A55'; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.save(); roundRect(ctx, -40, -40, 80, 30, 14); ctx.clip();
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#F4F1E6' : '#E0263C'; ctx.fillRect(-40 + i * 14, -40, 14, 30); }
    ctx.restore(); roundRect(ctx, -40, -40, 80, 30, 14); ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.stroke();
    disc(ctx, 0, -2, 11, COL.gold, 3); ctx.font = font(16, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText('$', 0, -1);
    // what was bought pops up above the cart
    m.sold.forEach((k, i) => {
      const at = m.t0 + 1.0 + i * 1.9, p = clamp((T - at + 0.9) / 0.4, 0, 1);
      if (p <= 0) return;
      const y = -64 - 22 * easeOutCubic(p), x = (i - (m.sold.length - 1) / 2) * 56;
      disc(ctx, x, y, 18, BOOK[k].col, 3);
      ctx.font = font(15, 800); ctx.fillStyle = INK; ctx.fillText(BOOK[k].name.split(' ')[0].slice(0, 5), x, y + 1);
    });
    void t;
    ctx.restore(); ctx.textBaseline = 'alphabetic';
  },

  // ---------- on top of the characters (still in the battlefield's view): tower tiers and health, lightning, marks, coins ----------
  drawMvp(ctx) {
    const t = this.t, T = this.fightT;
    // webbed and frozen towers
    for (const tw of this.towers) {
      if (tw.dead) continue;
      const u = tw.u, R = Math.max(25, u.r + 11);
      if (u.webT > T) { ctx.save(); ctx.translate(tw.x, tw.y); ctx.strokeStyle = 'rgba(240,240,250,0.85)'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); } for (const rr of [R * 0.4, R * 0.75]) { ctx.moveTo(rr, 0); for (let i = 1; i <= 8; i++) { const a = i / 8 * TAU; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } } ctx.stroke(); ctx.restore(); }
      if (u.frozeT > T) { ctx.beginPath(); ctx.arc(tw.x, tw.y, R, 0, TAU); ctx.fillStyle = 'rgba(190,235,255,0.45)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#DCEFFF'; ctx.stroke(); }
      if (tw.growT > T) { ctx.beginPath(); ctx.arc(tw.x, tw.y, R + 10 + 3 * Math.sin(t * 8), 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(251,191,36,0.8)'; ctx.stroke(); }
      if (u.rageT > T) { ctx.beginPath(); ctx.arc(tw.x, tw.y, R + 4, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(248,113,113,${0.5 + 0.4 * Math.sin(t * 12)})`; ctx.stroke(); }
      // tier pips under the tower, health bar over it when hurt
      const k = tw.tier, py = tw.y + R + 9;
      for (let i = 0; i < k; i++) { const x = tw.x + (i - (k - 1) / 2) * 11; ctx.beginPath(); ctx.moveTo(x, py - 5); ctx.lineTo(x + 5, py); ctx.lineTo(x, py + 5); ctx.lineTo(x - 5, py); ctx.closePath(); ctx.fillStyle = k >= 5 ? COL.gold : k === 4 && tw.el ? ELEM[tw.el].col : '#F4F6FB'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.stroke(); }
      if (u.hp < u.max) { const w = R * 1.6, x = tw.x - w / 2, y = tw.y - R - 14; ctx.fillStyle = INK; ctx.fillRect(x - 2, y - 2, w + 4, 8); ctx.fillStyle = u.hp / u.max > 0.5 ? '#4ADE80' : u.hp / u.max > 0.25 ? '#FACC15' : '#F43F5E'; ctx.fillRect(x, y, w * clamp(u.hp / u.max, 0, 1), 4); }
      // a big upgrade: a rising ring
      if (t - tw.bigT < 0.7) { const p = (t - tw.bigT) / 0.7; ctx.beginPath(); ctx.arc(tw.x, tw.y, R + 40 * p, 0, TAU); ctx.lineWidth = 6 * (1 - p); ctx.strokeStyle = k === 4 && tw.el ? ELEM[tw.el].col : COL.gold; ctx.stroke(); }
      if (t - (tw.glintT ?? -9) < 0.5) { const p = (t - tw.glintT) / 0.5; ctx.save(); ctx.globalAlpha = 1 - p; ctx.translate(tw.x + R * 0.5, tw.y - R * 0.5); ctx.rotate(p * 2); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? 3 : 10; const a = i / 8 * TAU; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.restore(); }
    }
    // lightning
    if (this.bolts.length) {
      this.bolts = this.bolts.filter(b => t - b.t0 < 0.25);
      for (const b of this.bolts) {
        const a = 1 - (t - b.t0) / 0.25, n = 7, seed = Math.floor(b.t0 * 1000);
        ctx.beginPath(); ctx.moveTo(b.x0, b.y0);
        for (let i = 1; i < n; i++) { const k = i / n, j = (H01(seed, i) - 0.5) * 22; ctx.lineTo(lerp(b.x0, b.x1, k) + j, lerp(b.y0, b.y1, k) + j * 0.5); }
        ctx.lineTo(b.x1, b.y1);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.lineWidth = 8; ctx.strokeStyle = rgba(b.col || '#C4B5FD', 0.35 * a); ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.stroke();
      }
    }
    // marks: hearts, gravity wells, meteor targets, time freezes, totems, and the map's monsters
    if (this.marks.length) {
      this.marks = this.marks.filter(m => t - m.t0 < 4);
      for (const m of this.marks) {
        const age = t - m.t0;
        if (m.kind === 'heart') {
          const u = m.u; if (!u || u.dead || !(u.charmT > T)) continue;
          const y = u.y - u.r - 16 - 3 * Math.sin(t * 6), x = u.x;
          ctx.beginPath(); ctx.moveTo(x, y + 7); ctx.bezierCurveTo(x - 12, y - 2, x - 6, y - 12, x, y - 5); ctx.bezierCurveTo(x + 6, y - 12, x + 12, y - 2, x, y + 7); ctx.fillStyle = '#F472B6'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
        } else if (m.kind === 'well') {
          if (age > 0.6) continue; const p = age / 0.6;
          ctx.beginPath(); ctx.moveTo(m.x0, m.y0); ctx.lineTo(m.x, m.y); ctx.lineWidth = 4 * (1 - p); ctx.strokeStyle = 'rgba(165,180,252,0.8)'; ctx.stroke();
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(m.x, m.y, 50 * (1 - ((p + i / 3) % 1)), 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(165,180,252,${0.7 * (1 - p)})`; ctx.stroke(); }
        } else if (m.kind === 'meteor') {
          if (T > m.T1) continue; const p = clamp((T - m.T0) / (m.T1 - m.T0), 0, 1), r = (m.small ? 50 : 90) * (1.3 - 0.3 * p);
          ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, TAU); ctx.lineWidth = 4; ctx.strokeStyle = `rgba(255,90,60,${0.5 + 0.4 * Math.sin(t * 20)})`; ctx.stroke(); ctx.setLineDash([]);
          // the rock coming down
          const fx = m.x + 260 * (1 - p), fy = m.y - 420 * (1 - p), rr = m.small ? 12 : 22;
          ctx.beginPath(); ctx.moveTo(fx + rr * 3, fy - rr * 5); ctx.lineTo(fx, fy); ctx.lineWidth = rr * 1.2; ctx.strokeStyle = 'rgba(255,150,40,0.5)'; ctx.lineCap = 'round'; ctx.stroke();
          disc(ctx, fx, fy, rr, '#5B4636', 3);
        } else if (m.kind === 'clock') {
          if (T > m.T1) continue;
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fillStyle = 'rgba(147,197,253,0.16)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(147,197,253,0.85)'; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x, m.y - m.r * 0.6); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + m.r * 0.4, m.y); ctx.lineWidth = 5; ctx.strokeStyle = '#DBEAFE'; ctx.stroke();
        } else if (m.kind === 'totem') {
          if (age > 1.6) continue; const a = clamp(age / 0.2, 0, 1) * clamp((1.6 - age) / 0.3, 0, 1);
          ctx.save(); ctx.globalAlpha = a; ctx.translate(m.x, m.y - 30);
          roundRect(ctx, -9, -30, 18, 50, 5); ctx.fillStyle = '#8A6A49'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
          disc(ctx, 0, -30, 13, m.col, 3);
          ctx.beginPath(); ctx.arc(0, -10, 40 + 30 * age, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = rgba(m.col, 0.6 * (1 - age / 1.6)); ctx.stroke();
          ctx.restore();
        } else if (m.kind === 'kraken' || m.kind === 'sandworm' || m.kind === 'eruption') {
          if (age > 1.4) continue; const up = Math.sin(clamp(age / 1.4, 0, 1) * Math.PI);
          const col = m.kind === 'kraken' ? '#7C3AED' : m.kind === 'sandworm' ? '#C9A16A' : '#FF6B1A';
          if (m.kind === 'eruption') { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.35, h = 120 * up; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + Math.cos(a) * h, m.y + Math.sin(a) * h); ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.strokeStyle = i % 2 ? '#FFD23F' : col; ctx.stroke(); } continue; }
          const n = m.kind === 'kraken' ? 5 : 1;
          for (let i = 0; i < n; i++) {
            const a = n === 1 ? -Math.PI / 2 : i / n * TAU, bx = m.x + Math.cos(a) * (n === 1 ? 0 : 50), by = m.y + Math.sin(a) * (n === 1 ? 0 : 40), h = (n === 1 ? 130 : 90) * up;
            ctx.beginPath(); ctx.moveTo(bx - 14, by); ctx.quadraticCurveTo(bx + Math.sin(t * 6 + i) * 30, by - h * 0.6, bx, by - h); ctx.quadraticCurveTo(bx + Math.sin(t * 6 + i) * 30 + 10, by - h * 0.6, bx + 14, by); ctx.closePath();
            ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
          }
        }
      }
    }
    // gold from kills: the coins fly to the treasury (drawn with the panel)
    if (this.coins.length) this.coins = this.coins.filter(c => t - c.t0 < 0.8);
    // the sudden-death lava creeping down from the top
    if (this.lavaY && this.lavaY > AR.y) {
      const h = this.lavaY - AR.y, lg = ctx.createLinearGradient(0, AR.y, 0, this.lavaY);
      lg.addColorStop(0, 'rgba(160,30,8,0.85)'); lg.addColorStop(0.85, 'rgba(255,107,26,0.8)'); lg.addColorStop(1, 'rgba(255,200,80,0.9)');
      ctx.fillStyle = lg; ctx.fillRect(AR.x, AR.y, AR.w, h);
      ctx.beginPath(); ctx.moveTo(AR.x, this.lavaY);
      for (let x = 0; x <= AR.w; x += 40) ctx.lineTo(AR.x + x, this.lavaY + 8 * Math.sin(t * 3 + x * 0.05));
      ctx.lineWidth = 5; ctx.strokeStyle = '#FFD23F'; ctx.stroke();
    }
    // the mirror shift flash
    if (this.mirrorFx !== undefined && t - this.mirrorFx < 0.5) { ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - (t - this.mirrorFx) / 0.5)})`; ctx.fillRect(AR.x, AR.y, AR.w, AR.h); }
  },

  // ---------- the screens ----------
  // the scoreboard: the logo, the hook, the base's health (left) and the attackers left (right), the wave and the clock
  drawHUD2(ctx) {
    const t = this.t, b = this.base, left = this.units.filter(u => u.team === ATK && !u.dead && !u.gone).length + Math.max(0, this.reserve[ATK]);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
    ctx.font = font(64, 800); spaced(ctx, 2); ctx.fillStyle = COL.white; ctx.fillText(this.title, VW / 2, 126);
    ctx.font = font(28, 700, false); spaced(ctx, 6); ctx.fillStyle = COL.gold; ctx.fillText(this.hook, VW / 2, 170, 760);
    this.hudN = this.hudN || [b.hp, left];
    this.hudN = [b.hp, left].map((v, i) => (Math.abs(v - this.hudN[i]) < 0.5 ? v : this.hudN[i] + (v - this.hudN[i]) * 0.3));
    const rows = [['DEFENDERS', `${Math.max(0, Math.round(this.hudN[0]))}%`, `${D.BASE_NAME[b.style] || 'THE BASE'} · ${this.towers.filter(x => !x.dead).length} TOWERS`],
      ['ATTACKERS', String(Math.round(this.hudN[1])), this.atkBand[0].replace(/^THE /, '')]];
    for (let i = 0; i < 2; i++) {
      const tm = TEAMS[i], x = i ? VW - 96 : 96, al = i ? 'right' : 'left';
      ctx.textAlign = al;
      spaced(ctx, 3); ctx.font = font(32, 800); ctx.fillStyle = tm.c; ctx.fillText(rows[i][0], x, 224, 300);
      spaced(ctx, 0); ctx.font = font(104, 800); ctx.fillStyle = i === 0 && b.hp < 25 && this.phase === 'fight' ? (Math.sin(t * 10) > 0 ? '#FF5A5A' : COL.white) : COL.white; ctx.fillText(rows[i][1], x, 324);
      spaced(ctx, 2); ctx.font = font(22, 700, false); ctx.fillStyle = COL.muted; ctx.fillText(rows[i][2], x, 358, 300); spaced(ctx, 0);
    }
    // the wave and the clock
    const px = VW / 2, py = 282, pw = 196, ph = 90, urgent = this.phase === 'fight' && this.cap - this.fightT < 10;
    ctx.font = font(26, 800); spaced(ctx, 3); ctx.textAlign = 'center'; ctx.fillStyle = COL.gold;
    ctx.fillText(this.waveNow ? `WAVE ${Math.min(this.waveNow, this.waveN)}/${this.waveN}` : 'GET READY', px, 224); spaced(ctx, 0);
    roundRect(ctx, px - pw / 2, py - ph / 2, pw, ph, ph / 2); ctx.fillStyle = '#121A2D'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = urgent ? COL.gold : COL.frame; ctx.stroke();
    const pulse = urgent ? 1 + 0.06 * Math.max(0, Math.cos((t % 1) * Math.PI)) : 1;
    ctx.save(); ctx.translate(px, py + 22); ctx.scale(pulse, pulse);
    ctx.font = font(62, 800); ctx.fillStyle = urgent ? COL.gold : COL.white; ctx.fillText(fmtTime(this.fightT), 0, 0);
    ctx.restore();
    // the base's health bar
    const bx = 96, by = 374, bw = VW - 192, bh = 16, f = clamp(this.hudN[0] / 100, 0, 1);
    ctx.save(); roundRect(ctx, bx, by, bw, bh, bh / 2); ctx.clip();
    ctx.fillStyle = rgba(TEAMS[ATK].c, 0.85); ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = TEAMS[DEF].c; ctx.fillRect(bx, by, bw * f, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(bx, by, bw, 4);
    ctx.restore();
    roundRect(ctx, bx, by, bw, bh, bh / 2); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(4,6,11,0.8)'; ctx.stroke();
    roundRect(ctx, bx + bw * f - 3, by - 6, 6, bh + 12, 3); ctx.fillStyle = COL.white; ctx.fill();
  },
  // the opening (arena coordinates): the defenders' order against the attackers' warband, then the hook
  drawIntro(ctx) {
    const t = this.t;
    if (t > 4.2) return;
    const a = Math.min(clamp((t - 0.05) / 0.3, 0, 1), clamp((4.2 - t) / 0.4, 0, 1));
    if (a <= 0) return;
    const top = AR.y + 22, h = 260, x0 = AR.x + 18, w = AR.w - 36;
    ctx.save(); ctx.globalAlpha = a;
    roundRect(ctx, x0, top, w, h, 20); ctx.fillStyle = 'rgba(8,11,20,0.9)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = COL.frame; ctx.stroke();
    const cw = w / 2, slide = 1 - easeOutCubic(clamp((t - 0.05) / 0.5, 0, 1));
    const sides = [[this.defOrder, DEF, 'DEFEND'], [this.atkBand, ATK, 'ATTACK']];
    sides.forEach(([o, team, role], i) => {
      const tm = TEAMS[team], cx = x0 + cw * (i + 0.5) + (i ? 1 : -1) * 120 * slide;
      disc(ctx, cx, top + 66, 40, tm.c, 4);
      try { drawEmblem(ctx, o[1], cx, top + 66, 30); } catch (e) { /* no emblem */ }
      this.fitText(ctx, o[0], cx, top + 132, cw - 40, 30, 800, true, tm.l, 'center', 18);
      ctx.font = font(18, 700, false); spaced(ctx, 4); ctx.textAlign = 'center'; ctx.fillStyle = COL.muted; ctx.fillText(role, cx, top + 166); spaced(ctx, 0);
    });
    ctx.font = font(44, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; strokeText(ctx, 'VS', x0 + w / 2, top + 70, COL.white, COL.ink, 8);
    const LY = LAYOUTS[this.layoutKey], line = t < 2.3 ? this.hook : this.mode ? MODES[this.mode].name : `${LY.name} · ${this.tdMap.name.toUpperCase()}`;
    const k = t < 2.3 ? clamp((t - 0.35) / 0.3, 0, 1) : clamp((t - 2.3) / 0.3, 0, 1);
    ctx.globalAlpha = a * k;
    this.fitText(ctx, line, x0 + w / 2, top + 216 + (1 - k) * 10, w - 40, 46, 800, true, t < 2.3 ? COL.white : COL.gold, 'center', 22);
    ctx.restore(); ctx.textBaseline = 'alphabetic';
  },
  drawStory2() { /* (the opening card is drawIntro's) */ },
  // the line-ups (arena coordinates, 4.2 s to 8.4 s): the defenders' first towers on top, the attackers' first waves below
  drawRosterStrips(ctx) {
    const t = this.t, t0 = 4.2, t1 = 8.4, a = Math.min(clamp((t - t0) / 0.35, 0, 1), clamp((t1 - t) / 0.4, 0, 1));
    if (a <= 0) return;
    if (!this.rInfoTD) {
      const towers = this.towerSet.slice(0, 3).map(k => ({ type: TOWERS[k].char, name: TOWERS[k].name, sub: TOWERS[k].spec, col: (TCLASS[TOWERS[k].cls] || {}).col || COL.gold, team: DEF }));
      const seen = new Set(), waves = [];
      for (const w of this.plan) { if (w.boss || seen.has(w.kind)) continue; seen.add(w.kind); waves.push({ type: w.list[0], name: w.name, sub: `${w.list.length} × ${labelOf(w.list[0]).replace(/^THE /, '')}`, col: COL.gold, team: ATK }); if (waves.length >= 2) break; }
      waves.push({ type: this.bossType, name: 'THE BOSS', sub: (BOSSES[this.bossType] || {}).name || labelOf(this.bossType), col: '#FF5A5A', team: ATK });
      this.rInfoTD = [towers, waves];
    }
    const rh = 92;
    ctx.save(); ctx.globalAlpha = a;
    for (let i = 0; i < 2; i++) {
      const tm = TEAMS[i], x0 = AR.x + 14, low = i === 1, w = low ? SAFE.btnX - x0 : AR.w - 28;
      const y0 = i === 0 ? AR.y + 14 : AR.y + AR.h - 14 - rh;
      const sl = (1 - easeOutCubic(clamp((t - t0) / 0.45, 0, 1))) * (i % 2 ? 1 : -1) * 120;
      ctx.save(); ctx.translate(sl, 0);
      roundRect(ctx, x0, y0, w, rh, 16); ctx.fillStyle = 'rgba(8,11,20,0.92)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = rgba(tm.c, 0.8); ctx.stroke();
      roundRect(ctx, x0, y0, 12, rh, 6); ctx.fillStyle = tm.c; ctx.fill();
      const list = this.rInfoTD[i], cw = (w - 30) / 3, pr = 32;
      list.slice(0, 3).forEach((it, j) => {
        const U = UNIT[it.type]; if (!U) return;
        const cx = x0 + 22 + j * cw, px = cx + pr + 2, py = y0 + rh / 2;
        disc(ctx, px, py, pr, 'rgba(255,255,255,0.08)', 0);
        if (!sl && this.lay) this.lay.push({ kind: 'circle', x: px - pr, y: py - pr + (this.layDY || 0), w: pr * 2, h: pr * 2 });
        const s = clamp(pr * 0.78 / U.r, 0.3, 1.7);
        ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.clip(); ctx.translate(px, py); ctx.scale(s, s);
        try { this.drawPortrait(ctx, it.type, it.team); } catch (e) { disc(ctx, 0, 0, U.r, tm.c, 3); }
        ctx.restore();
        const tx = px + pr + 10, mw = cx + cw - tx - 6;
        this.fitText(ctx, it.name, tx, py - rh * 0.17, mw, 21, 800, true, COL.white, 'left', 14);
        this.fitText(ctx, it.sub, tx, py + rh * 0.18, mw, 18, 700, false, it.col, 'left', 12);
      });
      ctx.restore();
    }
    ctx.restore(); ctx.textBaseline = 'alphabetic';
  },
  // the cards (arena coordinates): a wave, a new tower, an upgrade, a spell, the merchant, the war shaman, an event, a fall
  drawCardsTD(ctx) {
    const t = this.t;
    if (this.phase !== 'fight' && this.outroT > 0.3) return;
    const rosterUp = t > 4.0 && t < 8.6;
    for (const c of this.cards) {
      const k = (t - c.t0) / c.dur;
      if (k < 0 || k > 1) continue;
      const inK = easeOutBack(clamp((t - c.t0) / 0.22, 0, 1)), a = clamp(Math.min(k * 10, (1 - k) * 6), 0, 1);
      const boss = this.bossU && !this.bossU.dead && this.phase === 'fight';
      const y = AR.y + (rosterUp ? 14 + 92 + 46 : boss ? 112 : 70);
      const hasIcon = c.tk || c.spell || c.shaman, iconW = hasIcon ? 60 : 0;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(VW / 2, y); ctx.scale(0.7 + 0.3 * inK, 0.7 + 0.3 * inK);
      ctx.font = font(c.big ? 46 : 38, 800); spaced(ctx, 2);
      const tw = Math.min(ctx.measureText(c.text).width, 760), w = tw + 70 + iconW, hh = c.sub ? 84 : 64;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 14, -hh / 2); ctx.lineTo(w / 2 + 14, -hh / 2); ctx.lineTo(w / 2 - 14, hh / 2); ctx.lineTo(-w / 2 - 14, hh / 2); ctx.closePath();
      ctx.fillStyle = 'rgba(8,11,20,0.94)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = c.col || COL.gold; ctx.stroke();
      if (this.lay && inK >= 1 && a >= 1) this.lay.push({ kind: 'banner', x: VW / 2 - w / 2 - 14, y: y - hh / 2 + (this.layDY || 0), w: w + 28, h: hh, text: c.text });
      const ix = -w / 2 + 22 + iconW / 2;
      if (c.tk && TOWERS[c.tk]) {
        const type = TOWERS[c.tk].char, U = UNIT[type];
        disc(ctx, ix, 0, 26, rgba(c.col || COL.gold, 0.3), 3);
        ctx.save(); ctx.beginPath(); ctx.arc(ix, 0, 25, 0, TAU); ctx.clip(); ctx.translate(ix, 0); const s = clamp(20 / U.r, 0.3, 1.6); ctx.scale(s, s);
        try { this.drawPortrait(ctx, type, c.kind === 'fall' ? DEF : DEF); } catch (e) { /* no portrait */ }
        ctx.restore();
      } else if (c.spell || c.shaman) {
        disc(ctx, ix, 0, 24, c.col, 3);
        ctx.font = font(26, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText(c.spell ? '✦' : '☠', ix, 1);
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(c.big ? 46 : 38, 800);
      ctx.fillStyle = COL.white; ctx.fillText(c.text, iconW / 2, c.sub ? -12 : 2, 760);
      if (c.sub) { ctx.font = font(24, 700, false); spaced(ctx, 3); ctx.fillStyle = COL.gold; ctx.fillText(c.sub, iconW / 2, 22, 700); }
      spaced(ctx, 0);
      ctx.restore();
    }
    ctx.textBaseline = 'alphabetic';
  },
  // the boss's health bar across the top of the battlefield while it's alive
  drawBossBar(ctx) {
    const b = this.bossU;
    if (!b || b.dead || this.phase !== 'fight') return;
    const a = clamp((this.t - this.bossIntro) / 0.4, 0, 1);
    const x0 = AR.x + 40, w = AR.w - 80, y = AR.y + 20;
    ctx.save(); ctx.globalAlpha = a;
    roundRect(ctx, x0, y, w, 52, 14); ctx.fillStyle = 'rgba(8,11,20,0.9)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#FF5A5A'; ctx.stroke();
    this.fitText(ctx, `${b.bossName}${b.phase > 1 ? (b.phase === 2 ? ' · ENRAGED' : ' · LAST STAND') : ''}`, x0 + 18, y + 17, w - 36, 22, 800, true, '#FF8A8A', 'left', 14);
    const f = clamp(b.hp / b.max, 0, 1), bx = x0 + 18, bw = w - 36, by = y + 32;
    roundRect(ctx, bx, by, bw, 12, 6); ctx.fillStyle = '#2A1218'; ctx.fill();
    roundRect(ctx, bx, by, Math.max(6, bw * f), 12, 6); ctx.fillStyle = '#F43F5E'; ctx.fill();
    for (const k of [1 / 3, 2 / 3]) { ctx.fillStyle = INK; ctx.fillRect(bx + bw * k - 1.5, by, 3, 12); }
    if (this.lay) this.lay.push({ kind: 'box', x: x0, y: y + (this.layDY || 0), w, h: 52 });
    ctx.restore(); ctx.textBaseline = 'alphabetic';
  },
  // the panel under the battlefield (screen coordinates): the treasury, the next wave, and the towers with their tiers
  drawPanel(ctx) {
    const t = this.t, T = this.fightT, x0 = SAFE.x0 + 12, x1 = SAFE.btnX - 8, y0 = AR.y + AR.h + UI_DY + 16, y1 = SAFE.bottom - 8;
    if (y1 - y0 < 60) return;
    // the base in danger (under 30%): the edges of the screen pulse red with a heartbeat
    if (this.phase === 'fight' && this.base.hp > 0 && this.base.hp < 30) {
      const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI / 0.85)), 6), a = (0.22 + 0.3 * beat) * (1 - this.base.hp / 30 * 0.5);
      const vg = ctx.createRadialGradient(VW / 2, VH * 0.45, VW * 0.35, VW / 2, VH * 0.45, VH * 0.62);
      vg.addColorStop(0, 'rgba(255,0,30,0)'); vg.addColorStop(1, `rgba(220,0,30,${a})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
    }
    roundRect(ctx, x0, y0, x1 - x0, y1 - y0, 18); ctx.fillStyle = 'rgba(8,11,20,0.82)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = COL.frame; ctx.stroke();
    if (this.lay) this.lay.push({ kind: 'box', x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    // the treasury: every kill's coin flies from where it fell to the counter, which bumps as they land
    this.goldShown += (this.gold - this.goldShown) * 0.25;
    const gy = y0 + 34, cam = this.cam || { x: AR.x + AR.w / 2, y: AR.y + AR.h / 2, z: 1 };
    let landed = 0;
    for (const c of this.coins) {
      const p = (t - c.t0) / 0.7; if (p >= 1) { landed = Math.max(landed, 1 - (t - c.t0 - 0.7) / 0.1); continue; }
      const sx = AR.x + AR.w / 2 + (c.x - cam.x) * cam.z, sy = AR.y + AR.h / 2 + (c.y - cam.y) * cam.z + UI_DY;
      const e = p * p, mx = (sx + x0 + 34) / 2, my = Math.min(sy, gy) - 120;
      const x = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * mx + e * e * (x0 + 34), y = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * my + e * e * gy;
      disc(ctx, x, y, (c.g >= 30 ? 10 : 7) * (1 - 0.35 * p), COL.gold, 2);
    }
    const bump = 1 + 0.22 * clamp(landed, 0, 1);
    ctx.save(); ctx.translate(x0 + 34, gy); ctx.scale(bump, bump); ctx.translate(-(x0 + 34), -gy);
    disc(ctx, x0 + 34, gy, 16, COL.gold, 3); ctx.font = font(18, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText('$', x0 + 34, gy + 1);
    ctx.restore();
    this.fitText(ctx, `${Math.round(this.goldShown)} GOLD`, x0 + 60, gy, 210, 32, 800, true, COL.gold, 'left', 18);
    // what's next
    let next = '';
    if (this.phase === 'fight') {
      const w = this.plan.find(x => !x.started);
      if (this.bossU && !this.bossU.dead) next = 'THE BOSS IS HERE';
      else if (w) { const s = Math.max(0, Math.ceil(w.at - T)); next = `NEXT: ${w.boss && !w.mini ? 'THE BOSS' : w.name} IN ${s}`; }
      else next = this.pushed ? 'THE FINAL PUSH' : 'LAST WAVE';
    } else next = this.tdWinner === DEF ? 'THE BASE HOLDS' : 'THE BASE HAS FALLEN';
    this.fitText(ctx, next, x1 - 20, gy, x1 - x0 - 300, 28, 800, true, COL.white, 'right', 16);
    // the towers standing, with their tier
    const live = this.towers.filter(x => !x.dead).slice(0, 9), cw = Math.min(92, (x1 - x0 - 30) / Math.max(1, live.length)), cy = y0 + 104, pr = Math.min(28, cw / 2 - 6);
    live.forEach((tw, i) => {
      const cx = x0 + 22 + cw * (i + 0.5), U = UNIT[tw.u.type];
      disc(ctx, cx, cy, pr + 3, tw.tier >= 5 ? COL.gold : tw.tier === 4 && tw.el ? ELEM[tw.el].col : STONE, 3);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, pr, 0, TAU); ctx.clip(); ctx.fillStyle = STONE_D; ctx.fillRect(cx - pr, cy - pr, pr * 2, pr * 2); ctx.translate(cx, cy); const s = clamp(pr * 0.8 / U.r, 0.3, 1.6); ctx.scale(s, s);
      try { this.drawPortrait(ctx, tw.u.type, DEF); } catch (e) { /* no portrait */ }
      ctx.restore();
      ctx.font = font(18, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      strokeText(ctx, tw.tier >= 5 ? 'MAX' : `T${tw.tier}`, cx, cy + pr + 12, tw.tier >= 5 ? COL.gold : COL.white, INK, 4);
      if (t - tw.upT < 0.6 || t - (tw.t0 || -9) < 0.6) { ctx.beginPath(); ctx.arc(cx, cy, pr + 7, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255,210,63,${1 - Math.min(t - tw.upT, t - tw.t0) / 0.6})`; ctx.stroke(); }
    });
    ctx.textBaseline = 'alphabetic';
  },
  drawTally(ctx) {
    // the cards and the boss bar are in arena coordinates; the panel is in screen coordinates
    this.drawBossBar(ctx);
    this.drawCardsTD(ctx);
    this.drawHooks(ctx);
    ctx.save(); ctx.translate(0, -(this.layDY || 0)); const dy = this.layDY; this.layDY = 0; this.drawPanel(ctx); this.layDY = dy; ctx.restore();
  },
  drawEvolveCards() {}, drawShopCard() {}, drawCouncil2() {},
  // retention hooks (looks only, arena coordinates): the guess prompt, the combo counter, the final countdown and the danger glow
  drawHooks(ctx) {
    const t = this.t, T = this.fightT, fight = this.phase === 'fight';
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // 1) "what's your guess?" just after the line-ups: two choices to comment
    const g0 = 8.7, g1 = 12.6;
    if (t > g0 && t < g1 && fight) {
      const a = Math.min(clamp((t - g0) / 0.3, 0, 1), clamp((g1 - t) / 0.4, 0, 1)), pop = easeOutBack(clamp((t - g0) / 0.35, 0, 1));
      ctx.globalAlpha = a; ctx.save(); ctx.translate(VW / 2, AR.y + 92); ctx.scale(pop, pop);
      roundRect(ctx, -330, -58, 660, 136, 20); ctx.fillStyle = 'rgba(8,11,20,0.92)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = COL.gold; ctx.stroke();
      ctx.font = font(34, 800); strokeText(ctx, "WHAT'S YOUR GUESS?", 0, -26, COL.white, COL.ink, 6);
      [['SURVIVES', TEAMS[DEF].c, -150], ['FALLS', TEAMS[ATK].c, 150]].forEach(([w, c, x], i) => {
        const wob = 1 + 0.04 * Math.sin(t * 6 + i * 2);
        ctx.save(); ctx.translate(x, 30); ctx.scale(wob, wob);
        roundRect(ctx, -120, -26, 240, 52, 26); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = COL.ink; ctx.stroke();
        ctx.font = font(30, 800); ctx.fillStyle = COL.white; ctx.fillText(w, 0, 2);
        ctx.restore();
      });
      ctx.restore(); ctx.globalAlpha = 1;
      if (this.lay) this.lay.push({ kind: 'box', x: VW / 2 - 330, y: AR.y + 34 + (this.layDY || 0), w: 660, h: 136 });
    }
    // 2) the combo counter: kills in quick succession
    if (fight && this.killLog.length) {
      let n = 0; for (let i = this.killLog.length - 1; i >= 0 && t - this.killLog[i] < 2.5; i--) n++;
      if (n >= 5) {
        const last = this.killLog[this.killLog.length - 1], pop = 1 + 0.25 * clamp(1 - (t - last) / 0.18, 0, 1);
        const x = AR.x + AR.w - 96, y = AR.y + AR.h - 70;
        ctx.save(); ctx.translate(x, y); ctx.rotate(-0.08); ctx.scale(pop, pop);
        ctx.font = font(n >= 12 ? 64 : 54, 800); strokeText(ctx, `x${n}`, 0, -6, n >= 12 ? '#FF7A45' : COL.gold, COL.ink, 9);
        ctx.font = font(22, 800); strokeText(ctx, 'COMBO', 0, 30, COL.white, COL.ink, 5);
        ctx.restore();
      }
    }
    // 3) the final countdown: the last 10 seconds, big and see-through over the battle
    const left = this.cap - T;
    if (fight && left <= 10 && left > 0.2) {
      const n = Math.ceil(left), f = n - left, k = 1 - f;
      ctx.globalAlpha = 0.18 + 0.32 * clamp(k * 1.4 - 0.3, 0, 1);
      ctx.save(); ctx.translate(VW / 2, AR.y + AR.h / 2); const sc = 1.25 - 0.25 * easeOutCubic(clamp(f / 0.25, 0, 1)); ctx.scale(sc, sc);
      ctx.font = font(300, 800); strokeText(ctx, String(n), 0, 0, n <= 3 ? '#FF5A5A' : COL.white, COL.ink, 16);
      ctx.restore(); ctx.globalAlpha = 1;
    }
    ctx.restore(); ctx.textBaseline = 'alphabetic';
  },
  // the ending: a flash, a band in the winner's colour, SURVIVED! or FALLEN!, and how
  drawOutro(ctx) {
    if (this.phase !== 'outro' || this.holdOutro) return;
    const k = this.outroT, tm = TEAMS[this.winner], cy = AR.y + AR.h / 2;
    if (k < 0.25) { ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - k / 0.25)})`; ctx.fillRect(0, 0, VW, VH); }
    ctx.fillStyle = `rgba(4,6,11,${0.55 * clamp(k / 0.4, 0, 1)})`; ctx.fillRect(AR.x - 6, AR.y - 6, AR.w + 12, AR.h + 12);
    const slide = easeOutCubic(clamp((k - 0.15) / 0.35, 0, 1));
    ctx.save(); ctx.translate(lerp(-VW, 0, slide), 0);
    ctx.beginPath(); ctx.moveTo(0, cy - 130); ctx.lineTo(VW, cy - 170); ctx.lineTo(VW, cy + 90); ctx.lineTo(0, cy + 130); ctx.closePath(); ctx.fillStyle = tm.c; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.moveTo(0, cy - 130); ctx.lineTo(VW, cy - 170); ctx.lineTo(VW, cy - 140); ctx.lineTo(0, cy - 100); ctx.closePath(); ctx.fill();
    ctx.restore();
    const pop = easeOutBack(clamp((k - 0.35) / 0.35, 0, 1));
    if (pop > 0) {
      ctx.save(); ctx.translate(VW / 2, cy - 18); ctx.rotate(-0.035); ctx.scale(pop, pop);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(this.headline.length > 11 ? 132 : 158, 800);
      strokeText(ctx, this.headline, 0, 0, COL.white, COL.ink, 14);
      ctx.restore();
    }
    const dk = clamp((k - 0.7) / 0.3, 0, 1);
    if (dk > 0) {
      ctx.save(); ctx.globalAlpha = dk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let s = 46; ctx.font = font(s, 800); while (s > 24 && ctx.measureText(this.detail).width > 900) { s -= 2; ctx.font = font(s, 800); }
      strokeText(ctx, this.detail, VW / 2, cy + 190, COL.gold, COL.ink, 9);
      ctx.restore();
    }
    ctx.textBaseline = 'alphabetic';
  },

  // ---------- the thumbnail (1080x1920): the brand background, the question, the busiest moment of the battle, and the
  // best tower against the boss ----------
  drawThumbTD(ctx, bg) {
    const t = this.t;
    // background: violet with rays (the channel's colours)
    const DT = TEAMS[DEF], mixc = (hex, k) => { const n = parseInt(hex.slice(1), 16); return `rgb(${Math.round((n >> 16) * k)},${Math.round(((n >> 8) & 255) * k)},${Math.round((n & 255) * k)})`; };
    // (the defenders' colour: Tower Clash's defenders are always cyan, Rellz 2026-11-14)
    const lg = ctx.createLinearGradient(0, 0, 0, VH); lg.addColorStop(0, mixc(DT.c, 0.55)); lg.addColorStop(0.5, mixc(DT.c, 0.24)); lg.addColorStop(1, mixc(DT.c, 0.08));
    ctx.fillStyle = lg; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.translate(VW / 2, 960); ctx.globalAlpha = 0.1; ctx.fillStyle = DT.l;
    for (let i = 0; i < 18; i++) { ctx.rotate(TAU / 18); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-90, -1500); ctx.lineTo(90, -1500); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // the battle, framed
    const fw = 780, fh = fw, fx = (VW - fw) / 2, fy = 575, sy = AR.y + UI_DY;
    ctx.save(); ctx.translate(fx + fw / 2, fy + fh / 2); ctx.rotate(-0.025);
    roundRect(ctx, -fw / 2 - 10, -fh / 2 - 10, fw + 20, fh + 20, 30); ctx.fillStyle = COL.ink; ctx.fill();
    roundRect(ctx, -fw / 2, -fh / 2, fw, fh, 22); ctx.save(); ctx.clip();
    ctx.drawImage(bg, AR.x, sy, AR.w, AR.h, -fw / 2, -fh / 2, fw, fh);
    const vg = ctx.createRadialGradient(0, 0, fw * 0.3, 0, 0, fw * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = vg; ctx.fillRect(-fw / 2, -fh / 2, fw, fh);
    ctx.restore();
    roundRect(ctx, -fw / 2, -fh / 2, fw, fh, 22); ctx.lineWidth = 8; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
    ctx.restore();
    // the logo and the question
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = font(60, 800); spaced(ctx, 6); strokeText(ctx, 'TOWER CLASH', VW / 2, 262, DT.l, COL.ink, 10); spaced(ctx, 0);
    const q = this.mode ? MODES[this.mode].hook : 'WILL THE BASE SURVIVE?';
    const words = q.split(' '), lines = []; let cur = '';
    let fs0 = 118; ctx.font = font(fs0, 800);
    for (const w of words) { const s = cur ? cur + ' ' + w : w; if (ctx.measureText(s).width > 940 && cur) { lines.push(cur); cur = w; } else cur = s; }
    if (cur) lines.push(cur);
    if (lines.length > 2) { fs0 = 92; ctx.font = font(fs0, 800); }
    const ly0 = lines.length > 1 ? (lines.length > 2 ? 345 : 370) : 420;
    lines.forEach((l, i) => { ctx.save(); ctx.translate(VW / 2, ly0 + i * fs0 * 0.95); ctx.rotate(-0.04); strokeText(ctx, l, 0, 0, i === lines.length - 1 ? COL.gold : COL.white, COL.ink, 16); ctx.restore(); });
    // the best tower (bottom left) against the boss (bottom right)
    const best = this.towers.slice().sort((a, b) => (b.tier - a.tier) || (b.kills - a.kills))[0];
    const fig = (type, team, cx, cy, r, col, name) => {
      const U = UNIT[type]; if (!U) return;
      const rg = ctx.createRadialGradient(cx, cy, 10, cx, cy, r * 1.45); rg.addColorStop(0, rgba(col, 0.75)); rg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, r * 1.45, 0, TAU); ctx.fill();
      disc(ctx, cx, cy, r, rgba(col, 0.35), 8);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 4, 0, TAU); ctx.clip(); ctx.translate(cx, cy); const hum = this.opts.humans && E.HUMAN && E.HUMAN[type], s = clamp((r * (hum ? 0.66 : 0.55)) / U.r, 0.5, 8); if (hum) ctx.translate(0, r * 0.12); ctx.scale(s, s); if (!hum) ctx.rotate(-Math.PI / 2);
      try { this.drawPortrait(ctx, type, team); } catch (e) { /* no portrait */ }
      ctx.restore();
      ctx.font = font(46, 800); spaced(ctx, 2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let fz = 46; while (fz > 24 && ctx.measureText(name).width > 380) { fz -= 2; ctx.font = font(fz, 800); }
      strokeText(ctx, name, cx, cy + r + 40, COL.white, COL.ink, 9); spaced(ctx, 0);
    };
    if (best) fig(best.u.type, DEF, 280, 1470, 125, TEAMS[DEF].c, best.def.name);
    fig(this.bossType, ATK, VW - 280, 1470, 135, TEAMS[ATK].c, (BOSSES[this.bossType] || {}).name || labelOf(this.bossType));
    ctx.save(); ctx.translate(VW / 2, 1475); ctx.rotate(-0.06); ctx.font = font(104, 800); strokeText(ctx, 'VS', 0, 0, COL.gold, COL.ink, 14); ctx.restore();
    void t; ctx.textBaseline = 'alphabetic';
  },
};
Object.assign(TD.prototype, DRAW);
module.exports = { TD };
