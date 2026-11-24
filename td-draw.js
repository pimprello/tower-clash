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
// Blossom Valley's ground (a Tower Clash map, so its floor lives here): spring grass with drifts of fallen petals
if (!MAP_THEME.blossom) MAP_THEME.blossom = {
  floor: '#2E4A2C', grid: 'rgba(200,255,210,0.05)', mid: 'rgba(255,230,240,0.08)',
  texture: g => {
    const S = E.rng(0xB10550);
    for (let i = 0; i < 16; i++) { g.beginPath(); g.ellipse(S.range(0, AR.w), S.range(0, AR.h), S.range(40, 100), S.range(26, 60), S.range(0, 3), 0, TAU); g.fillStyle = S.chance(0.5) ? 'rgba(90,160,90,0.12)' : 'rgba(0,0,0,0.12)'; g.fill(); }
    for (let i = 0; i < 26; i++) { const x = S.range(0, AR.w), y = S.range(0, AR.h); for (let k = 0; k < 9; k++) { g.beginPath(); g.ellipse(x + S.range(-30, 30), y + S.range(-20, 20), 3.2, 1.8, S.range(0, 3), 0, TAU); g.fillStyle = S.chance(0.6) ? 'rgba(249,168,212,0.55)' : 'rgba(253,242,248,0.5)'; g.fill(); } }
    g.lineCap = 'round'; g.lineWidth = 2.2; g.strokeStyle = '#3F6A3A';
    for (let i = 0; i < 70; i++) { const x = S.range(10, AR.w - 10), y = S.range(10, AR.h - 10), l = S.range(5, 9); g.beginPath(); for (const a of [-0.5, 0, 0.5]) { g.moveTo(x, y); g.lineTo(x + Math.sin(a) * l, y - Math.cos(a) * l); } g.stroke(); }
  },
};

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
    if (this.worldPath) this.worldPath(g, stroke, lx, ly);
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
    const kind = { forest: 'tree', enchanted: 'magic', castle: 'tree', swamp: 'swamp', snow: 'pine', frozen: 'pine', beach: 'palm', dunes: 'desert', bombed: 'city', moon: 'moon', neon: 'neon', graveyard: 'grave', furnace: 'ember', temple: 'temple', blossom: 'blossom' }[key] || (era === 'scifi' ? 'moon' : 'tree');
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
    this._wglow = [];
    for (const p of placed) {
      if (this.worldProp && this.worldProp(g, p, { shadow, blob, shade, rock, tree })) continue;
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
      } else if (kind === 'blossom') {
        // cherry trees in bloom (pink clouds of blossom over a dark trunk), stone lanterns, mossy rocks
        if (v < 0.55) {
          const r0 = r; { const r = r0 * 1.3;
          shadow(x, y, r * 1.05);
          g.lineCap = 'round'; g.lineWidth = 5; g.strokeStyle = '#4A2E22'; g.beginPath(); g.moveTo(x, y + r * 0.2); g.lineTo(x + Math.cos(p.a) * r * 0.6, y + Math.sin(p.a) * r * 0.6); g.stroke();
          for (let k = 0; k < 5; k++) { const a = p.a + k * 1.257, d = r * 0.42; blob(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, r * 0.5, k % 2 ? '#F9A8D4' : '#F472B6', 2.5); }
          blob(x, y - r * 0.05, r * 0.48, '#FBCFE8', 0); shade(x, y, r * 0.95);
          for (let k = 0; k < 5; k++) blob(x + (hash01(k, Math.round(x)) - 0.5) * r * 1.4, y + (hash01(Math.round(y), k) - 0.5) * r * 1.2, 2.2, '#FFFFFF', 0); }
        } else if (v < 0.75) {
          // a stone lantern
          shadow(x, y, r * 0.5); g.save(); g.translate(x, y);
          g.beginPath(); g.rect(-r * 0.32, -r * 0.32, r * 0.64, r * 0.64); g.fillStyle = '#9CA3AF'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
          g.beginPath(); g.moveTo(-r * 0.5, -r * 0.3); g.lineTo(0, -r * 0.62); g.lineTo(r * 0.5, -r * 0.3); g.closePath(); g.fillStyle = '#6B7280'; g.fill(); g.stroke();
          blob(0, 0, r * 0.14, '#FDE68A', 1.5); g.restore();
        } else rock(x, y, r * 0.6, '#7C8A6E');
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
    if (this.worldLive) this.worldLive(ctx);
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
      // (cleared away bit by bit while the tower is rebuilt)
      const clr = sp && sp.raising ? clamp((T - sp.raising.t0) / 4, 0, 1) : 0; if (clr >= 1) continue;
      ctx.save(); ctx.globalAlpha = 1 - clr;
      for (let i = 0; i < 9; i++) {
        const a = H01(r.x + i, r.y) * TAU, d = 6 + H01(i, r.x) * 22 * (0.6 + 0.4 * k), rr = 5 + H01(r.y, i) * 6;
        ctx.beginPath(); ctx.arc(r.x + Math.cos(a) * d, r.y + Math.sin(a) * d, rr, 0, TAU); ctx.fillStyle = i % 3 ? STONE_D : STONE; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      }
      ctx.restore();
    }
    // towers being rebuilt: scaffolding over the rubble, stone courses rising inside it, builders' hammer sparks, a progress bar
    for (const s of this.spots) if (s.raising) this.drawRaising(ctx, s);
    // (rules.pacing) towers being upgraded between waves, and the builders at work on them and on the rebuilds
    if (this.opts.pacing && this.opts.pacing.on) this.drawBuilders(ctx);
    // walls across the path
    for (const w of this.walls) this.drawWall(ctx, w);
    // where meteors are about to land: on the ground, under everyone
    for (const m of this.marks) if (m.kind === 'meteor' && T <= m.T1) this.drawMeteorGround(ctx, m, T);
    // scorch marks where shells landed: dark at first, fading to a faint smudge
    if (this.scorches) for (const sc of this.scorches) {
      const a = 0.16 + 0.3 * Math.max(0, 1 - (this.t - sc.t0) / 6), g = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, sc.r);
      g.addColorStop(0, `rgba(28,22,18,${a})`); g.addColorStop(0.6, `rgba(28,22,18,${a * 0.6})`); g.addColorStop(1, 'rgba(28,22,18,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sc.x, sc.y, sc.r, sc.r * 0.8, 0, 0, TAU); ctx.fill();
    }
    // what's left of fallen attackers (under everyone)
    this.drawCorpses(ctx);
    // the mystical crystal's traps and totem reach (td-crystal.js)
    if (this.drawTraps) this.drawTraps(ctx);
    if (this.drawWeirdGround) this.drawWeirdGround(ctx);
    // the war shaman's totems: their shadow and the rings of the cast lie on the ground, under the troops (the totem is drawn later)
    for (const m of this.marks) if (m.kind === 'totem') {
      const age = this.t - m.t0; if (age > 2.2 || age < 0) continue;
      const a = clamp(age / 0.15, 0, 1) * Math.min(1, clamp((2.2 - age) / 0.45, 0, 1) * 1.6);
      ctx.save(); ctx.globalAlpha = a;
      ctx.beginPath(); ctx.ellipse(m.x, m.y + 2, 16, 7, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
      for (let i = 0; i < 2; i++) { const q = clamp((age - 0.25 - i * 0.35) / 1.2, 0, 1); if (q <= 0 || q >= 1) continue;
        ctx.beginPath(); ctx.ellipse(m.x, m.y, 30 + 120 * q, (30 + 120 * q) * 0.42, 0, 0, TAU); ctx.lineWidth = 4 * (1 - q) + 1; ctx.strokeStyle = rgba(m.col, 0.55 * (1 - q)); ctx.stroke(); }
      ctx.restore();
    }
    if (this.drawMoreGround) this.drawMoreGround(ctx);
    // the base and the towers (the character on top is drawn by the engine with the troops). With the shine on (Rellz
    // 2026-11-15: "match graphic style and shiny texture to army clash"), only their shadows and glows go on the ground here;
    // their bodies go on the troops' shine layer (shineBegin below), so they get the same gloss and rim light as the troops
    this.tdStanding = !!(this.shine && RVB.makeCanvas);
    if (this.tdStanding) this._pass = 'ground';
    this.drawBase(ctx);
    for (const tw of this.towers) if (!tw.dead) this.drawTowerBase(ctx, tw);
    this._pass = null;
    // the merchant's cart beside the base
    if (this.merch && T < this.merch.end + 0.6) this.drawMerchant(ctx);
  },
  // the base and the towers' bodies on the troops' shine layer: drawn first (so every troop stands on top of them), then
  // shaded like the troops (light on the side facing the light, shade away from it, a soft gloss and a hot spot), and marked
  // so the engine's rim light runs round their outlines too
  shineBegin(m) {
    const lc = RVB.Army.prototype.shineBegin.call(this, m);
    this._shMain = m;
    if (!this.tdStanding) return lc;
    const keep = [lc.fillStyle, lc.strokeStyle, lc.lineWidth, lc.lineCap, lc.lineJoin, lc.font, lc.textAlign, lc.textBaseline];
    this._pass = 'body';
    try {
      this.drawBase(lc);
      for (const tw of this.towers) if (!tw.dead) this.drawTowerBase(lc, tw);
    } finally { this._pass = null; }
    const Lx = this._shLx, Ly = this._shLy, b = this.base, bodies = [];
    if (b) bodies.push([b.x, b.y, b.style === 'ship' ? 92 : 80, b.hp > 0 || b.fallT === undefined]);
    for (const tw of this.towers) if (!tw.dead && tw.R) bodies.push([tw.x, tw.y, tw.R, true]);
    lc.save(); lc.globalCompositeOperation = 'source-atop';
    for (const [x, y, r, solid] of bodies) {
      this.shMark(x, y, r * 1.6 + 26);
      if (!solid) continue;
      // shade: lit side to shadow side across the body
      const g = lc.createLinearGradient(x + Lx * r, y + Ly * r, x - Lx * r, y - Ly * r);
      g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,20,0.30)');
      lc.fillStyle = g; lc.fillRect(x - r - 4, y - r - 4, 2 * r + 8, 2 * r + 8);
      // gloss: a soft oval towards the light, and a small hot spot
      const hx = x + Lx * r * 0.38, hy = y + Ly * r * 0.38, rot = Math.atan2(Ly, Lx) + Math.PI / 2;
      lc.save(); lc.translate(hx, hy); lc.rotate(rot); lc.scale(1, 0.5);
      const sg = lc.createRadialGradient(0, 0, 0, 0, 0, r * 0.5); sg.addColorStop(0, 'rgba(255,255,255,0.42)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      lc.fillStyle = sg; lc.beginPath(); lc.arc(0, 0, r * 0.5, 0, TAU); lc.fill(); lc.restore();
      lc.beginPath(); lc.arc(x + Lx * r * 0.55, y + Ly * r * 0.55, Math.max(2, r * 0.09), 0, TAU); lc.fillStyle = 'rgba(255,255,255,0.75)'; lc.fill();
    }
    lc.restore();
    [lc.fillStyle, lc.strokeStyle, lc.lineWidth, lc.lineCap, lc.lineJoin, lc.font, lc.textAlign, lc.textBaseline] = keep;
    return lc;
  },
  // little people's steps follow how far they've really walked (Rellz 2026-11-16: "make ... the walking animation better"):
  // the engine's walk cycle runs at one fixed cadence, so slow walkers shuffled and fast ones skated. Here the cycle is driven
  // by distance (one step every ~0.7 body widths), so feet match the ground at any speed. Looks only.
  drawHuman(ctx, u, x, y, tm, kit, rr) {
    if (!u || u.tower) return RVB.Army.prototype.drawHuman.call(this, ctx, u, x, y, tm, kit, rr);
    const r = rr || u.r || 9;
    if (u._wx === undefined) { u._wx = u.x; u._wy = u.y; u._wp = u.gait || 0; }
    const d = Math.hypot(u.x - u._wx, u.y - u._wy); u._wx = u.x; u._wy = u.y;
    if (d < 40) u._wp += d / (r * 0.7);
    const g0 = u.gait; u.gait = u._wp - this.fightT * 10;
    try { return RVB.Army.prototype.drawHuman.call(this, ctx, u, x, y, tm, kit, rr); } finally { u.gait = g0; }
  },
  // where a little person's gun (or bow) is, in the world: they're drawn upright facing left or right, aiming up or down, so
  // the muzzle sits out to that side at hand height (drawHuman's geometry: hand at (4.2, -1.5), barrel about 9 long, in units
  // of r / 9.5). Looks only.
  muzzleOf(u) {
    const k = (u.r || 9.5) / 9.5, cs = Math.cos(u.face || 0), sn = Math.sin(u.face || 0), dir = cs >= 0 ? 1 : -1, al = clamp(Math.atan2(sn, Math.abs(cs)), -1.25, 1.25);
    return [u.x + dir * k * (4.2 + 9 * Math.cos(al)), u.y + k * (-1.5 + 9 * Math.sin(al))];
  },
  // (Rellz 2026-11-16: "make sure bullets come from the gun not the waist") shots fired by little people are drawn leaving
  // from the gun's muzzle and blending into their true flight within the first 140 px; the battle's own shots aren't moved
  // (Rellz 2026-11-23: "there shouldn't be UI like health bars and the Star Eater text in the thumbnail, it should be map and
  // troops") the battle drawn as a picture only: no scoreboard, boss bar, cards, banners, combo, floating numbers, names, tier
  // pips or health bars. Everything it hides is put back straight after (looks only).
  drawPicture(ctx) {
    const keep = { noUi: this.noUi, cards: this.cards, floats: this.floats, banners: this.banners, bannerQ: this.bannerQ }, hp = [];
    this.noUi = true; this.picOnly = true; this.cards = []; this.floats = []; if (this.banners) this.banners = []; 
    for (const u of this.units) { hp.push([u, u.hp, u.title, u.champ]); if (!u.dead) u.hp = u.max; u.title = null; u.champ = null; }
    try { this.draw(ctx); } finally {
      Object.assign(this, keep); this.picOnly = false;
      for (const [u, h, ti, ch] of hp) { u.hp = h; u.title = ti; u.champ = ch; }
    }
  },
  draw(ctx) {
    const HU = E.HUMAN, moved = [];
    if (this.humans && HU && this.arrows) for (const a of this.arrows) {
      const o = a.from || a.owner; if (!o || !HU[o.type] || o.dead) continue;
      const d = Math.hypot(a.x - o.x, a.y - o.y), f = clamp(1 - d / 140, 0, 1); if (f <= 0) continue;
      const [mx, my] = this.muzzleOf(o), ox = (mx - o.x) * f, oy = (my - o.y + o.r * 0.32) * f;   // (the engine lifts them r * 0.32 itself)
      a.x += ox; a.y += oy; moved.push([a, ox, oy]);
    }
    // (Rellz 2026-11-21: "bigger troops should cover smaller, not the other way") troops are drawn in order of where they stand,
    // with a bigger troop counted as standing further forward, so it covers the little ones round it (a small one well in front
    // of it still comes over it); only the drawing order changes, never the battle's own list
    const keep = this.units, depth = u => u.y + (u.r || 10) * (u.boss || u.size === 'titan' ? 3.2 : 2.4);
    this.units = keep.map((u, i) => [u, depth(u), i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(a => a[0]);
    try { return RVB.Army.prototype.draw.call(this, ctx); } finally { this.units = keep; for (const [a, ox, oy] of moved) { a.x -= ox; a.y -= oy; } }
  },
  // (Rellz 2026-11-21: "remove black bars and add your own cinematic effect") cinematic moments (the base under attack, the
  // final blow) get a film look instead of black bars: a stronger vignette, a warm-highlights / cool-shadows grade, a soft light
  // leak drifting across, a faint grain, and (on the base) a red pulse at the edges like a heartbeat
  drawCine(ctx) {
    const c = this.cine; if (!c) return;
    const b = clamp(c.bars || 0, 0, 1), k = b * b * (3 - 2 * b), v = Math.max(clamp(c.vig || 0, 0, 1), k * 0.65), t = this.t;
    if (v <= 0.01 && k <= 0.01) return;
    ctx.save(); ctx.beginPath(); ctx.rect(AR.x, AR.y, AR.w, AR.h); ctx.clip();
    const cx = AR.x + AR.w / 2, cy = AR.y + AR.h / 2;
    const vg = ctx.createRadialGradient(cx, cy, AR.w * 0.3, cx, cy, AR.w * 0.78); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.72 * v})`);
    ctx.fillStyle = vg; ctx.fillRect(AR.x, AR.y, AR.w, AR.h);
    if (k > 0.01) {
      ctx.globalCompositeOperation = 'soft-light';
      const gr = ctx.createLinearGradient(0, AR.y, 0, AR.y + AR.h); gr.addColorStop(0, `rgba(255,170,90,${0.5 * k})`); gr.addColorStop(1, `rgba(40,120,170,${0.5 * k})`);
      ctx.fillStyle = gr; ctx.fillRect(AR.x, AR.y, AR.w, AR.h);
      ctx.globalCompositeOperation = 'screen';
      const lx = AR.x + AR.w * (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.35))), ly = AR.y + AR.h * 0.22, lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, AR.w * 0.45);
      lg.addColorStop(0, `rgba(255,190,120,${0.16 * k})`); lg.addColorStop(1, 'rgba(255,190,120,0)'); ctx.fillStyle = lg; ctx.fillRect(AR.x, AR.y, AR.w, AR.h);
      ctx.globalCompositeOperation = 'source-over';
      const fr = Math.floor(t * 24); ctx.fillStyle = `rgba(255,255,255,${0.07 * k})`;
      for (let i = 0; i < 140; i++) ctx.fillRect(AR.x + hash01(fr, i * 2) * AR.w, AR.y + hash01(fr, i * 2 + 1) * AR.h, 2, 2);
      if (this.baseCineT !== undefined && t - this.baseCineT < 3.4) {
        const q = clamp((t - this.baseCineT) / 0.3, 0, 1) * clamp((this.baseCineT + 3.4 - t) / 0.5, 0, 1), beat = Math.pow(Math.max(0, Math.sin(t * 7.5)), 6);
        const rg = ctx.createRadialGradient(cx, cy, AR.w * 0.35, cx, cy, AR.w * 0.8); rg.addColorStop(0, 'rgba(220,30,40,0)'); rg.addColorStop(1, `rgba(220,30,40,${(0.18 + 0.3 * beat) * q * k})`);
        ctx.fillStyle = rg; ctx.fillRect(AR.x, AR.y, AR.w, AR.h);
      }
    }
    ctx.restore();
  },
  // (retention, 2026-11-16) the rare golden boss: the same boss in shining gold, with a warm glow and sparkles round it (looks only)
  drawBody(ctx, u, x, y, tm, swordy) {
    // (2026-11-16) hexed into a chicken, or shrunk (td-weird.js)
    if (this.weirdBody && (u.chickT > this.fightT || u.shrunk) && !this._inWeird) { this._inWeird = true; try { let out; if (this.weirdBody(ctx, u, x, y, () => { out = this.drawBody(ctx, u, x, y, tm, swordy); })) return out; } finally { this._inWeird = false; } }
    // (2026-11-16) a native of one of the new worlds: its body washed in its world's look (td-worlds.js), on its own small canvas
    // at the screen's scale so it stays sharp; the gummy brutes are a little see-through, like jelly
    const wash = u.native && this.nativeWash ? this.nativeWash(u) : null;
    if (wash && tm && !(this.golden && u === this.bossU)) {
      const m = ctx.getTransform(), sc = Math.max(0.5, Math.hypot(m.a, m.b)), half = (u.r || 14) * 3.4, S = Math.min(1400, Math.ceil(half * 2 * sc));
      if (!this._gc || this._gc.width < S) this._gc = RVB.makeCanvas(S, S);
      const oc = this._gc, o = oc.getContext('2d');
      o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1; o.clearRect(0, 0, oc.width, oc.height);
      o.setTransform(sc, 0, 0, sc, half * sc - x * sc, half * sc - y * sc);
      const out = RVB.Army.prototype.drawBody.call(this, o, u, x, y, tm, swordy);
      o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-atop'; o.save(); wash(o, S, this.t); o.restore(); o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1;
      const ka = ctx.globalAlpha; if (u.native === 'gummybrute') ctx.globalAlpha = ka * 0.85;
      ctx.drawImage(oc, 0, 0, S, S, x - half, y - half, S / sc, S / sc); ctx.globalAlpha = ka;
      return out;
    }
    if (this.golden && u === this.bossU && !u.dead && tm) {
      const t = this.t, r = (u.r || 14), R = r * 2.6, pl = 0.85 + 0.15 * Math.sin(t * 4);
      const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, R);
      g.addColorStop(0, `rgba(255,226,120,${0.42 * pl})`); g.addColorStop(1, 'rgba(255,200,60,0)');
      ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
      for (let i = 0; i < 7; i++) {
        const k = (t * 0.7 + i / 7) % 1, a = i * 2.39 + H01(i, 5) * 3, d = r * (0.9 + 1.3 * k), sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d - k * r * 0.8, s2 = (1 - k) * r * 0.22 + 1.5;
        ctx.globalAlpha = Math.sin(Math.PI * k); ctx.fillStyle = '#FFF6C2';
        ctx.beginPath(); ctx.moveTo(sx, sy - s2 * 2); ctx.lineTo(sx + s2 * 0.5, sy); ctx.lineTo(sx, sy + s2 * 2); ctx.lineTo(sx - s2 * 0.5, sy); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(sx - s2 * 2, sy); ctx.lineTo(sx, sy + s2 * 0.5); ctx.lineTo(sx + s2 * 2, sy); ctx.lineTo(sx, sy - s2 * 0.5); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      tm = Object.assign({}, tm, { c: '#FFC928', d: '#9A6A00', l: '#FFF1A8' });
      // the whole body gilded: drawn on its own small canvas at the screen's scale, washed in gold, with a moving glint
      const m = ctx.getTransform(), sc = Math.max(0.5, Math.hypot(m.a, m.b)), half = r * 3.4, S = Math.min(1400, Math.ceil(half * 2 * sc));
      if (!this._gc || this._gc.width < S) this._gc = RVB.makeCanvas(S, S);
      const oc = this._gc, o = oc.getContext('2d');
      o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1; o.clearRect(0, 0, oc.width, oc.height);
      o.setTransform(sc, 0, 0, sc, half * sc - x * sc, half * sc - y * sc);
      const out = RVB.Army.prototype.drawBody.call(this, o, u, x, y, tm, swordy);
      o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-atop';
      o.fillStyle = 'rgba(255,196,40,0.5)'; o.fillRect(0, 0, S, S);
      const gx = ((t * 0.6) % 1.6 - 0.3) * S, gl = o.createLinearGradient(gx - S * 0.25, 0, gx + S * 0.25, S * 0.4);
      gl.addColorStop(0, 'rgba(255,255,230,0)'); gl.addColorStop(0.5, 'rgba(255,255,230,0.55)'); gl.addColorStop(1, 'rgba(255,255,230,0)');
      o.fillStyle = gl; o.fillRect(0, 0, S, S); o.globalCompositeOperation = 'source-over';
      ctx.drawImage(oc, 0, 0, S, S, x - half, y - half, S / sc, S / sc);
      return out;
    }
    return RVB.Army.prototype.drawBody.call(this, ctx, u, x, y, tm, swordy);
  },
  drawMeteorGround(ctx, m, T) {
    const p = clamp((T - m.T0) / (m.T1 - m.T0), 0, 1), R = m.small ? 54 : 96, t = this.t;
    // the light of the rock on the ground, growing as it comes, and its shadow tightening under it
    const lg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, R * (1.4 - 0.3 * p));
    lg.addColorStop(0, `rgba(255,170,60,${0.1 + 0.4 * p * p})`); lg.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.beginPath(); ctx.arc(m.x, m.y, R * 1.4, 0, TAU); ctx.fillStyle = lg; ctx.fill();
    ctx.beginPath(); ctx.ellipse(m.x, m.y, R * 0.35 * (0.4 + 0.6 * p), R * 0.25 * (0.4 + 0.6 * p), 0, 0, TAU); ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.3 * p})`; ctx.fill();
    // the target: a red ring that fills in as the rock comes, with a pulse
    ctx.beginPath(); ctx.arc(m.x, m.y, R, 0, TAU); ctx.fillStyle = `rgba(239,68,68,${0.06 + 0.1 * p})`; ctx.fill();
    ctx.lineWidth = 3.5; ctx.strokeStyle = `rgba(255,90,60,${0.55 + 0.35 * Math.sin(t * 18)})`; ctx.stroke();
    ctx.beginPath(); ctx.arc(m.x, m.y, R * p, 0, TAU); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,200,120,0.7)'; ctx.stroke();
  },
  drawMeteorRock(ctx, m, T) {
    const p = clamp((T - m.T0) / (m.T1 - m.T0), 0, 1), e = p * p * (0.6 + 0.4 * p), big = !m.small, rr = big ? 19 : 11, t = this.t;
    const dx = 0.53, dy = -0.85, L = big ? 560 : 420;                 // it comes in from the upper right
    const fx = m.x + dx * L * (1 - e), fy = m.y + dy * L * (1 - e), tl = (big ? 150 : 95) * (0.6 + 0.6 * p);
    ctx.save(); ctx.lineCap = 'round';
    // embers streaming off behind it
    for (let i = 0; i < (big ? 10 : 6); i++) {
      const k = ((t * 3 + i * 0.137) % 1), j = H01(i, m.x | 0) - 0.5, ex = fx + dx * tl * 1.3 * k + j * 22 * k, ey = fy + dy * tl * 1.3 * k + 30 * k * k;
      ctx.globalAlpha = (1 - k) * 0.9; disc(ctx, ex, ey, (big ? 3 : 2) * (1 - k * 0.6), i % 2 ? '#FFD23F' : '#FF7A1A', 0);
    }
    ctx.globalAlpha = 1;
    // the tail: smoke, then red, orange, gold, white-hot at the rock
    for (const [w, col, len] of [[2.4, 'rgba(60,50,45,0.35)', 1.25], [1.9, 'rgba(220,60,30,0.55)', 1], [1.35, 'rgba(255,140,40,0.8)', 0.8], [0.8, 'rgba(255,220,120,0.95)', 0.55], [0.4, 'rgba(255,255,240,1)', 0.3]]) {
      const n = 6;
      for (let i = 0; i < n; i++) {
        const f0 = i / n * len, f1 = (i + 1) / n * len, wob = Math.sin(t * 30 + i) * 1.5;
        ctx.beginPath(); ctx.moveTo(fx + dx * tl * f0 + wob, fy + dy * tl * f0); ctx.lineTo(fx + dx * tl * f1, fy + dy * tl * f1);
        ctx.lineWidth = rr * w * (1 - i / n); ctx.strokeStyle = col; ctx.stroke();
      }
    }
    // the halo
    const hg = ctx.createRadialGradient(fx, fy, rr * 0.5, fx, fy, rr * 3.2); hg.addColorStop(0, 'rgba(255,190,90,0.55)'); hg.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.beginPath(); ctx.arc(fx, fy, rr * 3.2, 0, TAU); ctx.fillStyle = hg; ctx.fill();
    // the rock: dark, tumbling, cracked with glowing lava, lit on its leading side
    ctx.translate(fx, fy); ctx.rotate(t * 5 + m.x);
    ctx.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, q = rr * (0.82 + 0.25 * H01(k, m.y | 0)); ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath();
    const rg = ctx.createRadialGradient(-rr * 0.3, -rr * 0.3, 1, 0, 0, rr * 1.1); rg.addColorStop(0, '#7A5A48'); rg.addColorStop(1, '#2A1E18');
    ctx.fillStyle = rg; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.strokeStyle = `rgba(255,${150 + 60 * Math.sin(t * 20) | 0},50,0.95)`; ctx.lineWidth = Math.max(1.5, rr * 0.13);
    ctx.beginPath(); ctx.moveTo(-rr * 0.5, -rr * 0.2); ctx.lineTo(-rr * 0.05, rr * 0.05); ctx.lineTo(rr * 0.35, -rr * 0.3); ctx.moveTo(-rr * 0.05, rr * 0.05); ctx.lineTo(rr * 0.1, rr * 0.5); ctx.stroke();
    ctx.rotate(-(t * 5 + m.x));
    ctx.beginPath(); ctx.arc(-dx * rr * 0.35, -dy * rr * 0.35, rr * 0.55, 0, TAU); ctx.fillStyle = 'rgba(255,200,110,0.45)'; ctx.fill();
    ctx.restore();
  },
  // (Rellz 2026-11-23: "we can see the builders upgrading the towers and fixing broken ones, that's visually satisfying")
  // looks only: for every job (a rebuild, an upgrade) two little builders walk out from the base, work at the site with their
  // hammers (sparks and dust on each blow), and walk home once it's done; an upgrade gets a light scaffold and a progress bar
  drawBuilders(ctx) {
    const T = this.fightT, jobs = [];
    for (const s of this.spots) if (s.raising) jobs.push({ x: s.x, y: s.y, t0: s.raising.t0, end: s.raising.end, id: s.id ?? (s.x * 3 + s.y) });
    for (const tw of this.towers) if (tw.upWork) jobs.push({ x: tw.x, y: tw.y, t0: tw.upWork.t0, end: tw.upWork.end, id: tw.u.uid, up: tw.upWork, tw });
    // (and for a moment after a job ends, they walk home)
    this.bHome = (this.bHome || []).filter(h => T - h.end < 1.2 && T >= h.end);
    for (const j of jobs) j.live = true;
    if (!this.bJobs) this.bJobs = new Map();
    for (const [id, j] of this.bJobs) if (!jobs.find(k => k.id === id)) { if (T >= j.end - 0.05 && T - j.end < 1.2) this.bHome.push(j); this.bJobs.delete(id); }
    for (const j of jobs) this.bJobs.set(j.id, j);
    const b = this.base, walkIn = 0.7;
    const crew = (j, home) => {
      for (let k = 0; k < 2; k++) {
        const side = k ? 1 : -1, wx = j.x + side * 38, wy = j.y + 16 - k * 4;
        let x, y, a = 1, work = false;
        if (home) { const q = clamp((T - j.end) / 1.1, 0, 1); x = lerp(wx, b.x + side * 20, q); y = lerp(wy, b.y, q); a = 1 - clamp((q - 0.7) / 0.3, 0, 1); }
        else { const q = easeOutCubic(clamp((T - j.t0) / walkIn, 0, 1)); x = lerp(b.x + side * 20, wx, q); y = lerp(b.y, wy, q); a = clamp((T - j.t0) / 0.2, 0, 1); work = q >= 1; }
        const ph = (T * 2.2 + k * 0.5) % 1, sw = work ? (ph < 0.25 ? ph / 0.25 : 1 - (ph - 0.25) / 0.75) : 0, bob = work ? -2 * (1 - sw) : Math.abs(Math.sin(T * 14 + k)) * -2;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y + bob); ctx.scale(0.9, 0.9);
        try { this.drawPortrait(ctx, 'builder', DEF); } catch (e) { disc(ctx, 0, 0, 12, TEAMS[DEF].c, 3); }
        ctx.restore();
        if (work) {
          // the hammer, swung at the tower, and the sparks of the blow
          const hx = x - side * 15, hy = y - 10;
          ctx.save(); ctx.globalAlpha = a; ctx.translate(hx, hy - 10 * (1 - sw)); ctx.rotate(side * (0.9 - 1.2 * sw));
          ctx.fillStyle = '#8B5A2B'; ctx.fillRect(-1.5, 0, 3, 12); ctx.fillStyle = '#9CA3AF'; ctx.fillRect(-5, -3, 10, 5); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.strokeRect(-5, -3, 10, 5);
          ctx.restore();
          if (ph < 0.16) for (let i = 0; i < 5; i++) { const an = H01(i + k * 9, Math.floor(T * 2.2)) * TAU, d = 3 + ph * 55; ctx.beginPath(); ctx.arc(hx - side * 4 + Math.cos(an) * d, hy + Math.sin(an) * d * 0.6, 1.7, 0, TAU); ctx.fillStyle = i % 2 ? '#FFD23F' : '#FFF4C2'; ctx.fill(); }
        }
      }
    };
    for (const j of jobs) {
      if (j.up) {
        // the upgrade: a light scaffold round the tower, and its progress bar (the next tier's pips)
        const p = clamp((T - j.t0) / (j.end - j.t0), 0, 1), up = easeOutCubic(clamp(p / 0.15, 0, 1)), down = 1 - clamp((p - 0.9) / 0.1, 0, 1), R = 30;
        ctx.save(); ctx.translate(j.x, j.y); ctx.globalAlpha = Math.min(up, down); ctx.lineCap = 'round';
        const P = [[-R, -R - 8], [R, -R - 8], [R, R - 2], [-R, R - 2]].map(([x, y]) => [x * up, y * up]);
        for (let i = 0; i < 4; i++) { const [ax, ay] = P[i], [bx, by] = P[(i + 1) % 4]; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = i % 2 ? '#8B5A2B' : '#5C3A1B'; ctx.stroke(); }
        for (const [x, y] of P) { ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fillStyle = '#8B5A2B'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); }
        const bw = 60, by = R + 10;
        if (!this.picOnly) {
        roundRect(ctx, -bw / 2, by, bw, 9, 4.5); ctx.fillStyle = 'rgba(8,11,20,0.85)'; ctx.fill();
        roundRect(ctx, -bw / 2 + 2, by + 2, (bw - 4) * p, 5, 2.5); ctx.fillStyle = '#7DD3FC'; ctx.fill();
        ctx.font = font(15, 800, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; strokeText(ctx, `TIER ${j.up.tier}`, 0, by + 22, '#E0F2FE', INK, 4);
        }
        ctx.restore();
      }
      crew(j, false);
    }
    for (const h of this.bHome) crew(h, true);
  },
  drawRaising(ctx, s) {
    const T = this.fightT, t = this.t, R0 = s.raising, p = clamp((T - R0.t0) / (R0.end - R0.t0), 0, 1), R = 26, WOOD = '#8B5A2B', WOOD_D = '#5C3A1B';
    ctx.save(); ctx.translate(s.x, s.y);
    ctx.beginPath(); ctx.ellipse(4, 6, R + 6, R * 0.85, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
    // the stone platform rising: its courses laid one by one (a ring for each, then the top)
    const courses = 4, done = p * courses;
    for (let c = 0; c < courses; c++) {
      const k = clamp(done - c, 0, 1); if (k <= 0) break;
      const rr = R - c * 2.2, a1 = -Math.PI / 2 + TAU * k;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, -c * 2, rr, -Math.PI / 2, a1); ctx.closePath();
      ctx.fillStyle = c % 2 ? STONE : STONE_D; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    }
    if (p > 0.85) { const k = (p - 0.85) / 0.15; ctx.globalAlpha = k; ctx.beginPath(); ctx.arc(0, -8, R - 9, 0, TAU); ctx.fillStyle = STONE_L; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); ctx.globalAlpha = 1; }
    // the scaffold: four poles, planks between them, lashed with rope (it comes down at the very end)
    const sa = p < 0.9 ? 1 : 1 - (p - 0.9) / 0.1, up = easeOutCubic(clamp(p / 0.15, 0, 1));
    ctx.globalAlpha = sa;
    const P = [[-R - 4, -R - 4], [R + 4, -R - 4], [R + 4, R + 2], [-R - 4, R + 2]].map(([x, y]) => [x * up, y * up]);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const [ax, ay] = P[i], [bx, by] = P[(i + 1) % 4]; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 3.5; ctx.strokeStyle = i % 2 ? WOOD : WOOD_D; ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo(P[2][0], P[2][1]); ctx.lineWidth = 3; ctx.strokeStyle = WOOD_D; ctx.stroke();
    for (const [x, y] of P) { ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fillStyle = WOOD; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); }
    // a builder's hammer coming down on the newest course, with sparks and dust on every blow (twice a second)
    const ph = (T * 2) % 1, ang = -Math.PI / 2 + TAU * clamp(done % 1, 0.05, 0.95), hx = Math.cos(ang) * (R - 6), hy = Math.sin(ang) * (R - 6) - Math.min(3, Math.floor(done)) * 2;
    if (p < 0.92) {
      const sw = ph < 0.25 ? ph / 0.25 : 1 - (ph - 0.25) / 0.75, lift = 14 * (1 - sw);
      ctx.save(); ctx.translate(hx, hy - lift); ctx.rotate(-0.6 + 0.9 * sw);
      ctx.fillStyle = WOOD; ctx.fillRect(-1.5, 0, 3, 12); ctx.fillStyle = '#9CA3AF'; ctx.fillRect(-5, -3, 10, 5); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.strokeRect(-5, -3, 10, 5); ctx.restore();
      if (ph < 0.18) for (let i = 0; i < 5; i++) { const a = H01(i, Math.floor(T * 2)) * TAU, d = 4 + ph * 60; ctx.beginPath(); ctx.arc(hx + Math.cos(a) * d, hy + Math.sin(a) * d * 0.6, 1.8, 0, TAU); ctx.fillStyle = i % 2 ? '#FFD23F' : '#FFF4C2'; ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    // the progress bar, with what it cost
    const bw = 64, by = R + 14;
    roundRect(ctx, -bw / 2, by, bw, 9, 4.5); ctx.fillStyle = 'rgba(8,11,20,0.85)'; ctx.fill();
    roundRect(ctx, -bw / 2 + 2, by + 2, (bw - 4) * p, 5, 2.5); ctx.fillStyle = COL.gold; ctx.fill();
    ctx.restore();
  },
  drawCorpses(ctx) {
    const L = this.corpses; if (!L || !L.length) return;
    const t = this.t;
    for (const c of L) {
      const age = t - c.t0, life = this.opts.pacing && this.opts.pacing.on ? this.opts.pacing.corpseLife || 16 : 7; if (age > life) continue;
      const a = Math.min(1, (life - age) / 1.5), k = clamp(age / 0.6, 0, 1), r = c.r;
      ctx.save(); ctx.globalAlpha = a;
      if (c.kind === 'bones') {
        // the body falls apart to a skeleton (the engine's own bones)
        try { this.drawSkel(ctx, c.x, c.y, r * 0.9, c.f, k, 1); } catch (e) { /* no skeleton */ }
      } else if (c.kind === 'parts') {
        // gears, plates and bolts scattered round a scorch mark
        ctx.beginPath(); ctx.ellipse(c.x, c.y, r * 1.1, r * 0.8, 0, 0, TAU); ctx.fillStyle = 'rgba(20,20,24,0.45)'; ctx.fill();
        for (let i = 0; i < 7; i++) {
          const an = H01(c.seed, i) * TAU, d = r * (0.3 + 0.9 * H01(i, c.seed)) * (0.4 + 0.6 * k), px = c.x + Math.cos(an) * d, py = c.y + Math.sin(an) * d;
          if (i % 3 === 0) { // a gear
            const gr = r * 0.32; ctx.beginPath(); for (let j = 0; j < 12; j++) { const aa = j / 12 * TAU + an, rr = j % 2 ? gr : gr * 1.3; ctx.lineTo(px + Math.cos(aa) * rr, py + Math.sin(aa) * rr); } ctx.closePath();
            ctx.fillStyle = '#9AA3B2'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = COL.ink; ctx.stroke(); disc(ctx, px, py, gr * 0.35, '#3A3F4A', 1.5);
          } else if (i % 3 === 1) { // a plate
            ctx.save(); ctx.translate(px, py); ctx.rotate(an); ctx.fillStyle = i % 2 ? c.col : '#7C8494'; ctx.fillRect(-r * 0.3, -r * 0.18, r * 0.6, r * 0.36); ctx.lineWidth = 2; ctx.strokeStyle = COL.ink; ctx.strokeRect(-r * 0.3, -r * 0.18, r * 0.6, r * 0.36); ctx.restore();
          } else disc(ctx, px, py, Math.max(2, r * 0.12), '#C9CED8', 1.5); // a bolt
        }
        if (age < 1.2 && Math.sin(age * 40) > 0.6) disc(ctx, c.x + r * 0.3, c.y - r * 0.2, 3, '#FFE58A', 0);
      } else if (c.kind === 'sludge') {
        // a puddle of sludge in its colour that spreads out, with two crossed-out eyes
        const s = 0.6 + 0.5 * easeOutCubic(k);
        ctx.beginPath(); for (let j = 0; j < 14; j++) { const aa = j / 14 * TAU, rr = r * s * (1.1 + 0.25 * Math.sin(j * 2.3 + c.seed)); ctx.lineTo(c.x + Math.cos(aa) * rr, c.y + Math.sin(aa) * rr * 0.75); } ctx.closePath();
        ctx.fillStyle = rgba(c.col, 0.85); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = COL.ink; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(c.x - r * 0.3, c.y - r * 0.25, r * 0.35, r * 0.15, -0.3, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
        ctx.lineWidth = 2.6; ctx.strokeStyle = COL.ink; ctx.lineCap = 'round';
        for (const sx of [-1, 1]) { const ex = c.x + sx * r * 0.32, ey = c.y - r * 0.05, e = r * 0.16; ctx.beginPath(); ctx.moveTo(ex - e, ey - e); ctx.lineTo(ex + e, ey + e); ctx.moveTo(ex + e, ey - e); ctx.lineTo(ex - e, ey + e); ctx.stroke(); }
      } else {
        // beasts: a dark stain and a few bones
        ctx.beginPath(); ctx.ellipse(c.x, c.y, r * 1.0, r * 0.7, c.f, 0, TAU); ctx.fillStyle = 'rgba(60,10,14,0.45)'; ctx.fill();
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const an = H01(c.seed, i + 9) * TAU, px = c.x + Math.cos(an) * r * 0.5, py = c.y + Math.sin(an) * r * 0.5, la = r * 0.35;
          ctx.beginPath(); ctx.moveTo(px - Math.cos(an + 1) * la, py - Math.sin(an + 1) * la); ctx.lineTo(px + Math.cos(an + 1) * la, py + Math.sin(an + 1) * la); ctx.lineWidth = 6; ctx.strokeStyle = COL.ink; ctx.stroke(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#F5F0E1'; ctx.stroke(); }
      }
      ctx.restore();
    }
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
    if (this._pass !== 'body') { ctx.beginPath(); ctx.ellipse(8, 12, 80, 62, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fill(); }
    if (this._pass === 'ground') { ctx.restore(); return; }
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
    // damage in six stages as the health drops (looks only): cracks, scorch marks, chunks knocked out with rubble at the foot of
    // the walls, fires and smoke, a caved-in roof glowing from inside, and in the end heavy smoke and embers
    const st6 = hp < 0.1 ? 6 : hp < 0.25 ? 5 : hp < 0.4 ? 4 : hp < 0.55 ? 3 : hp < 0.7 ? 2 : hp < 0.85 ? 1 : 0;
    const crack = (pts, w) => { ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.lineWidth = w; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); };
    if (st6 >= 1) { crack([[-30, -40], [-20, -26], [-28, -12]], 2.5); crack([[28, 34], [18, 20], [26, 8]], 2.5); }
    if (st6 >= 2) {
      for (const [x, y, r] of [[-22, 18, 22], [26, -24, 18]]) { const g = ctx.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, 'rgba(20,16,12,0.6)'); g.addColorStop(1, 'rgba(20,16,12,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
      crack([[-46, 22], [-30, 30], [-22, 46], [-12, 40]], 3); crack([[40, -46], [32, -28], [40, -16]], 3);
    }
    if (st6 >= 3) {
      // chunks knocked out of the walls (dark gaps), rubble at their foot
      ctx.fillStyle = '#1A1714';
      for (const [x, y, a] of [[-50, -12, 0.3], [44, 26, -0.6], [8, -52, 1.2]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(7, -9); ctx.lineTo(10, 4); ctx.lineTo(-3, 9); ctx.lineTo(-10, 3); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore(); }
      for (let k = 0; k < 9; k++) { const a = H01(k, 77) * TAU, d = 70 + H01(k, 5) * 14; disc(ctx, Math.cos(a) * d, Math.sin(a) * d * 0.9, 4 + H01(k, 9) * 4, k % 2 ? STONE_D : STONE, 2); }
    }
    if (st6 >= 5) {
      // the roof caves in: a dark hole glowing from the fire inside
      const g = ctx.createRadialGradient(4, 2, 2, 4, 2, 26); g.addColorStop(0, `rgba(255,${150 + 40 * Math.sin(t * 9)},60,0.95)`); g.addColorStop(0.6, 'rgba(120,30,10,0.9)'); g.addColorStop(1, 'rgba(20,10,8,0.95)');
      ctx.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, rr = 22 + 6 * H01(k, 31); ctx.lineTo(4 + Math.cos(a) * rr, 2 + Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    }
    // fires: one at stage 3, three at stage 4, five from stage 5
    const nf = st6 >= 5 ? 5 : st6 >= 4 ? 3 : st6 >= 3 ? 1 : 0;
    const FP = [[-30, -30], [28, 20], [4, 40], [-40, 26], [36, -36]];
    for (let i = 0; i < nf; i++) {
      const [fx, fy] = FP[i], f = 0.8 + 0.25 * Math.sin(t * 13 + i * 2.1), h = (st6 >= 5 ? 34 : 26) * f;
      ctx.beginPath(); ctx.moveTo(fx - 10, fy + 6); ctx.quadraticCurveTo(fx - 10, fy - h * 0.5, fx + Math.sin(t * 9 + i) * 3, fy - h); ctx.quadraticCurveTo(fx + 10, fy - h * 0.5, fx + 10, fy + 6); ctx.closePath();
      ctx.fillStyle = '#FF7A1A'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx - 5, fy + 4); ctx.quadraticCurveTo(fx - 5, fy - h * 0.3, fx, fy - h * 0.62); ctx.quadraticCurveTo(fx + 5, fy - h * 0.3, fx + 5, fy + 4); ctx.closePath(); ctx.fillStyle = '#FFD23F'; ctx.fill();
    }
    // smoke rising from stage 4, thick from stage 6; embers at the end
    if (st6 >= 4) {
      const n = st6 >= 6 ? 8 : 4;
      for (let i = 0; i < n; i++) {
        const ph = (t * 0.45 + i / n) % 1, sx = FP[i % 5][0] + Math.sin(t + i) * 6, sy = FP[i % 5][1] - 20 - ph * 110, r = 10 + ph * 26;
        ctx.globalAlpha = (1 - ph) * (st6 >= 6 ? 0.55 : 0.38); disc(ctx, sx + ph * 18, sy, r, '#3B3833', 0); ctx.globalAlpha = 1;
      }
    }
    if (st6 >= 6) for (let i = 0; i < 10; i++) { const ph = (t * 0.8 + i * 0.13) % 1; ctx.globalAlpha = 1 - ph; disc(ctx, Math.sin(i * 7 + t) * 40, 20 - ph * 120, 2.2, i % 2 ? '#FFD23F' : '#FF7A1A', 0); ctx.globalAlpha = 1; }
    // the shield dome glow
    if (b.healT !== undefined && t - b.healT < 0.8) { ctx.beginPath(); ctx.arc(0, 0, 80, 0, TAU); ctx.lineWidth = 6; ctx.strokeStyle = `rgba(124,255,176,${0.8 * (1 - (t - b.healT) / 0.8)})`; ctx.stroke(); }
    // a hit flashes white
    const fl = clamp(1 - (t - b.hitT) / 0.12, 0, 1);
    if (fl > 0) { ctx.beginPath(); ctx.arc(0, 0, 70, 0, TAU); ctx.fillStyle = `rgba(255,255,255,${0.35 * fl})`; ctx.fill(); }
    ctx.restore();
    // health bar under the base (over the shine layer, so it isn't lit like a body)
    const bw = 150, bx = b.x - bw / 2, by = b.y + 76;
    if (this.picOnly) return;
    if (this._pass === 'body' && this._shHP) { const c0 = ctx; this._shHP.push(() => { const m = this._shMain; if (!m) return; const keep = this._pass; this._pass = null; this.drawBaseBar(m, bx, by, bw, hp); this._pass = keep; }); return; }
    this.drawBaseBar(ctx, bx, by, bw, hp);
  },
  drawBaseBar(ctx, bx, by, bw, hp) {
    if (by < AR.y + AR.h - 4) {
      roundRect(ctx, bx - 3, by - 3, bw + 6, 16, 8); ctx.fillStyle = INK; ctx.fill();
      roundRect(ctx, bx, by, bw * clamp(hp, 0, 1), 10, 5); ctx.fillStyle = hp > 0.5 ? '#4ADE80' : hp > 0.25 ? '#FACC15' : '#F43F5E'; ctx.fill();
    }
  },
  // a tower under its character: a round stone platform with battlements (bigger, taller and glowing as it's upgraded)
  drawTowerBase(ctx, tw) {
    const t = this.t, u = tw.u, k = tw.tier, R = Math.max(25, u.r + 11) + (k >= 3 ? 4 : 0) + (k >= 5 ? 3 : 0);
    const drop = tw.drop !== undefined ? clamp((t - tw.drop) / 0.35, 0, 1) : 1, s = lerp(1.5, 1, easeOutCubic(drop));
    // (a shot makes the platform give a little, like a recoil)
    const kk = tw.kick !== undefined ? clamp(1 - (t - tw.kick) / 0.12, 0, 1) : 0, rs = 1 - 0.035 * kk;
    ctx.save(); ctx.translate(tw.x, tw.y); if (drop < 1) { ctx.globalAlpha = drop; ctx.scale(s, s); } else if (kk) ctx.scale(rs, rs);
    tw.R = R;
    if (this._pass !== 'body') {
    // tier 5: a golden aura; tier 4: the element's glow
    if (k >= 5) { const p = 0.5 + 0.5 * Math.sin(t * 3 + tw.x); const rg = ctx.createRadialGradient(0, 0, R * 0.6, 0, 0, R + 26); rg.addColorStop(0, 'rgba(255,210,63,0.45)'); rg.addColorStop(1, 'rgba(255,210,63,0)'); ctx.beginPath(); ctx.arc(0, 0, R + 22 + 4 * p, 0, TAU); ctx.fillStyle = rg; ctx.fill(); }
    if (k >= 4 && tw.el) { const p = 0.5 + 0.5 * Math.sin(t * 4 + tw.y); ctx.beginPath(); ctx.arc(0, 0, R + 6, 0, TAU); ctx.lineWidth = 5; ctx.strokeStyle = rgba(ELEM[tw.el].col, 0.45 + 0.4 * p); ctx.stroke(); }
    // shadow (taller towers cast a longer one)
    const sh = 5 + k * 2;
    ctx.beginPath(); ctx.ellipse(sh, sh + 2, R + 2, R * 0.9, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    }
    if (this._pass === 'ground') { ctx.restore(); return; }
    // the platform evolves with each tier, the way Clash of Clans towers do (Rellz 2026-11-16: "make the tower upgrades look
    // visible cooler and different and evolved"): tier 1 a wooden palisade, tier 2 stone, tier 3 a taller keep with iron bands,
    // torches and a banner, tier 4 the same charged with its element (crystals in the battlements, glowing runes), tier 5
    // white marble and gold with spires, gems, twin banners and a turning ring of golden runes
    const hit = u.flash > 0 ? u.flash : 0, up = tw.upT !== undefined ? clamp((t - tw.upT) / 0.5, 0, 1) : 1;
    const EL = k >= 4 && tw.el ? ELEM[tw.el].col : null;
    const PAL = [null,
      { wall: ['#B07A45', '#6B4423'], mer: '#8B5A2B', floor: '#7A5230', trim: null },
      { wall: [STONE_L, STONE], mer: STONE_L, floor: STONE_D, trim: null },
      { wall: ['#C3CAD8', '#717B8F'], mer: '#D5DBE6', floor: '#4E5669', trim: '#3F4654' },
      { wall: ['#C3CAD8', '#646E84'], mer: '#D5DBE6', floor: '#3E4558', trim: '#3F4654' },
      { wall: ['#FBF6EA', '#CDBF9F'], mer: '#F2C94C', floor: '#B98A2E', trim: '#E3B341' }][k];
    // (tier 3 and up stand taller: a wider lower course under the top)
    if (k >= 3) {
      ctx.beginPath(); ctx.arc(2, 4, R + 3, 0, TAU); ctx.fillStyle = k >= 5 ? '#B5A27A' : '#5C6578'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
      if (k >= 5) { ctx.beginPath(); ctx.arc(2, 4, R + 3, 0.3, Math.PI - 0.3); ctx.lineWidth = 3; ctx.strokeStyle = '#E3B341'; ctx.stroke(); }
    }
    // the wall
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU);
    const g = ctx.createRadialGradient(-R * 0.4, -R * 0.4, 2, 0, 0, R); g.addColorStop(0, PAL.wall[0]); g.addColorStop(1, PAL.wall[1]);
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    if (k === 1) {
      // a palisade: logs all round, lashed with rope
      for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (R - 8), Math.sin(a) * (R - 8)); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(40,20,5,0.55)'; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, R - 4, 0, TAU); ctx.lineWidth = 1.5; ctx.strokeStyle = '#D8B98A'; ctx.setLineDash([3, 5]); ctx.stroke(); ctx.setLineDash([]);
    } else if (k === 2) {
      // stone blocks
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + (i % 2) * 0.1; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (R - 9), Math.sin(a) * (R - 9)); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(20,24,36,0.4)'; ctx.stroke(); }
    } else {
      // iron (or gold) bands with rivets
      ctx.beginPath(); ctx.arc(0, 0, R - 4.5, 0, TAU); ctx.lineWidth = 3.5; ctx.strokeStyle = PAL.trim; ctx.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.arc(Math.cos(a) * (R - 4.5), Math.sin(a) * (R - 4.5), 1.6, 0, TAU); ctx.fillStyle = k >= 5 ? '#FFF4C2' : '#C9CED8'; ctx.fill(); }
    }
    // battlements (log ends on the palisade; stone, iron-capped, crystal-set or gilded above it)
    const n = k === 1 ? 7 : k >= 3 ? 10 : 8;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + 0.2, x = Math.cos(a) * (R - 2), y = Math.sin(a) * (R - 2);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      if (k === 1) { ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fillStyle = '#C08A55'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, TAU); ctx.strokeStyle = '#7A4E25'; ctx.lineWidth = 1.2; ctx.stroke(); }
      else {
        ctx.beginPath(); ctx.rect(-4.5, -6, 9, 12); ctx.fillStyle = PAL.mer; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
        if (k === 3 || k === 4) { ctx.fillStyle = '#4B5563'; ctx.fillRect(2, -6, 2.5, 12); }
        if (k === 4 && EL && i % 2 === 0) { const p = 0.6 + 0.4 * Math.sin(t * 5 + i); ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 5); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fillStyle = EL; ctx.globalAlpha = p; ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = 1.2; ctx.strokeStyle = '#FFFFFF'; ctx.stroke(); }
        if (k >= 5) { ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fillStyle = i % 2 ? '#EF4444' : '#3B82F6'; ctx.fill(); }
      }
      ctx.restore();
    }
    // the floor the character stands on
    ctx.beginPath(); ctx.arc(0, 0, R - 9, 0, TAU); ctx.fillStyle = PAL.floor; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    if (k === 1) { ctx.save(); ctx.clip(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(30,15,5,0.5)'; for (let x = -R; x < R; x += 6) { ctx.beginPath(); ctx.moveTo(x, -R); ctx.lineTo(x, R); ctx.stroke(); } ctx.restore(); }
    if (k === 2) { ctx.save(); ctx.clip(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(-R, 0); ctx.lineTo(R, 0); ctx.moveTo(0, -R); ctx.lineTo(0, R); ctx.stroke(); ctx.restore(); }
    // tier 4: the element's runes glowing on the floor; tier 5: a ring of golden runes turning slowly
    if (k >= 4) {
      const col = k >= 5 ? '#FFD23F' : EL || '#FFD23F', rr = R - 13, rot = t * (k >= 5 ? 0.6 : 0.3);
      ctx.save(); ctx.rotate(rot); ctx.lineWidth = 2; ctx.strokeStyle = rgba(col, 0.75 + 0.2 * Math.sin(t * 4));
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke();
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.save(); ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-2.5, -2.5); ctx.lineTo(2.5, 0); ctx.lineTo(-2.5, 2.5); ctx.stroke(); ctx.restore(); }
      ctx.restore();
    } else {
      // the class colour as a thin ring on the floor
      const C = TCLASS[tw.def.cls]; if (C) { ctx.beginPath(); ctx.arc(0, 0, R - 13, 0, TAU); ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(C.col, 0.7); ctx.stroke(); }
    }
    // tier 3 and 4: two torches on the wall; tier 5: four golden spires topped with gems
    if (k === 3 || k === 4) for (const a of [Math.PI * 0.75, Math.PI * 1.75]) {
      const x = Math.cos(a) * (R + 1), y = Math.sin(a) * (R + 1), f = 1 + 0.25 * Math.sin(t * 17 + a * 5);
      ctx.fillStyle = '#4B3621'; ctx.fillRect(x - 1.5, y - 2, 3, 7);
      ctx.beginPath(); ctx.moveTo(x - 4, y - 1); ctx.quadraticCurveTo(x - 3, y - 9 * f, x, y - 13 * f); ctx.quadraticCurveTo(x + 3, y - 9 * f, x + 4, y - 1); ctx.closePath(); ctx.fillStyle = EL && k === 4 ? EL : '#FF8A1F'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y - 4, 2, 0, TAU); ctx.fillStyle = '#FFF4C2'; ctx.fill();
    }
    if (k >= 5) for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2, x = Math.cos(a) * (R + 2), y = Math.sin(a) * (R + 2);
      ctx.beginPath(); ctx.moveTo(x - 5, y + 3); ctx.lineTo(x, y - 14); ctx.lineTo(x + 5, y + 3); ctx.closePath(); ctx.fillStyle = '#E3B341'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - 13, 2.8, 0, TAU); ctx.fillStyle = ['#EF4444', '#3B82F6', '#22C55E', '#A855F7'][i]; ctx.fill(); ctx.lineWidth = 1.2; ctx.stroke();
    }
    if (hit) { ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fillStyle = `rgba(255,255,255,${hit * 0.5})`; ctx.fill(); }
    // a banner in the defenders' colour from tier 3 (two at tier 5)
    if (k >= 3) for (const sgn of k >= 5 ? [1, -1] : [1]) {
      const fx = R * 0.72 * sgn, fy = -R * 0.72;
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 22); ctx.stroke();
      const w = Math.sin(t * 6 + tw.x + sgn) * 2;
      ctx.beginPath(); ctx.moveTo(fx, fy - 22); ctx.quadraticCurveTo(fx + 9 * sgn, fy - 24 + w, fx + 17 * sgn, fy - 19); ctx.lineTo(fx, fy - 13); ctx.closePath(); ctx.fillStyle = TEAMS[DEF].c; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
      if (k >= 5) { ctx.beginPath(); ctx.arc(fx, fy - 23, 2.2, 0, TAU); ctx.fillStyle = '#FFD23F'; ctx.fill(); }
    }
    // the moment of an upgrade: a bright flash that fades as the new look settles
    if (up < 1) { ctx.beginPath(); ctx.arc(0, 0, R + 4, 0, TAU); ctx.fillStyle = `rgba(255,248,220,${0.7 * (1 - up)})`; ctx.fill(); }
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
    // the merchant himself behind his cart: standing upright, in a turban and a long coat, waving his wares
    ctx.save(); ctx.translate(m.left ? 30 : -30, -48);
    const wave = Math.sin(t * 5) * 0.35;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-11, 22); ctx.lineTo(11, 22); ctx.lineTo(9, 0); ctx.closePath(); ctx.fillStyle = '#7C3AED'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#FDE68A'; ctx.fillRect(-10, 8, 20, 3);
    ctx.save(); ctx.translate(9, 4); ctx.rotate(-0.9 + wave); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -16); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#7C3AED'; ctx.stroke(); disc(ctx, 0, -18, 3.5, '#E0B48A', 1.5); ctx.restore();
    disc(ctx, 0, -8, 8, '#E0B48A', 2.5);
    ctx.beginPath(); ctx.ellipse(0, -14, 9, 5.5, 0, Math.PI, TAU); ctx.fillStyle = '#F4F1E6'; ctx.fill(); ctx.lineWidth = 2; ctx.stroke(); disc(ctx, 0, -17, 2.2, '#E0263C', 1);
    ctx.fillStyle = INK; ctx.fillRect(-3.5, -9, 2, 2.2); ctx.fillRect(1.5, -9, 2, 2.2);
    ctx.restore();
    void t;
    ctx.restore(); ctx.textBaseline = 'alphabetic';
  },

  // ---------- on top of the characters (still in the battlefield's view): tower tiers and health, lightning, marks, coins ----------
  drawMvp(ctx) {
    const t = this.t, T = this.fightT;
    // the mystical crystal: falling crystals, magic in flight, totems, the phoenix (td-crystal.js)
    if (this.drawCrystals) this.drawCrystals(ctx);
    if (this.drawWeird) this.drawWeird(ctx);
    if (this.drawMore) this.drawMore(ctx);
    // webbed and frozen towers
    for (const tw of this.towers) {
      if (tw.dead) continue;
      const u = tw.u, R = Math.max(25, u.r + 11);
      if (u.webT > T) { ctx.save(); ctx.translate(tw.x, tw.y); ctx.strokeStyle = 'rgba(240,240,250,0.85)'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); } for (const rr of [R * 0.4, R * 0.75]) { ctx.moveTo(rr, 0); for (let i = 1; i <= 8; i++) { const a = i / 8 * TAU; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } } ctx.stroke(); ctx.restore(); }
      if (u.frozeT > T) { ctx.beginPath(); ctx.arc(tw.x, tw.y, R, 0, TAU); ctx.fillStyle = 'rgba(190,235,255,0.45)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#DCEFFF'; ctx.stroke(); }
      if (tw.growT > T) { ctx.beginPath(); ctx.arc(tw.x, tw.y, R + 10 + 3 * Math.sin(t * 8), 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(251,191,36,0.8)'; ctx.stroke(); }
      if (u.rageT > T) { ctx.beginPath(); ctx.arc(tw.x, tw.y, R + 4, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(248,113,113,${0.5 + 0.4 * Math.sin(t * 12)})`; ctx.stroke(); }
      // tier pips under the tower, health bar over it when hurt
      const k = this.picOnly ? 0 : tw.tier, py = tw.y + R + 9;
      for (let i = 0; i < k; i++) { const x = tw.x + (i - (k - 1) / 2) * 11; ctx.beginPath(); ctx.moveTo(x, py - 5); ctx.lineTo(x + 5, py); ctx.lineTo(x, py + 5); ctx.lineTo(x - 5, py); ctx.closePath(); ctx.fillStyle = k >= 5 ? COL.gold : k === 4 && tw.el ? ELEM[tw.el].col : '#F4F6FB'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.stroke(); }
      if (u.hp < u.max && !this.picOnly) { const w = R * 1.6, x = tw.x - w / 2, y = tw.y - R - 14; ctx.fillStyle = INK; ctx.fillRect(x - 2, y - 2, w + 4, 8); ctx.fillStyle = u.hp / u.max > 0.5 ? '#4ADE80' : u.hp / u.max > 0.25 ? '#FACC15' : '#F43F5E'; ctx.fillRect(x, y, w * clamp(u.hp / u.max, 0, 1), 4); }
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
        if (m.kind === 'slash') {
          // a melee blow: a bright crescent sweeping across the target, fading in a quarter of a second
          if (age > 0.25) continue; const k = age / 0.25, sw = m.side * (0.9 + 1.2 * k), a0 = m.a + Math.PI / 2 * m.side;
          ctx.save(); ctx.globalAlpha = 1 - k; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r, a0 - sw * 0.5 - 0.6, a0 - sw * 0.5 + 0.6); ctx.lineWidth = 7 * (1 - k * 0.6); ctx.strokeStyle = rgba(m.col, 0.45); ctx.stroke();
          ctx.lineWidth = 2.6 * (1 - k * 0.5); ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
          ctx.restore(); continue;
        }
        if (m.kind === 'heart') {
          const u = m.u; if (!u || u.dead || !(u.charmT > T)) continue;
          const y = u.y - u.r - 16 - 3 * Math.sin(t * 6), x = u.x;
          ctx.beginPath(); ctx.moveTo(x, y + 7); ctx.bezierCurveTo(x - 12, y - 2, x - 6, y - 12, x, y - 5); ctx.bezierCurveTo(x + 6, y - 12, x + 12, y - 2, x, y + 7); ctx.fillStyle = '#F472B6'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
        } else if (m.kind === 'well') {
          if (age > 0.6) continue; const p = age / 0.6;
          ctx.beginPath(); ctx.moveTo(m.x0, m.y0); ctx.lineTo(m.x, m.y); ctx.lineWidth = 4 * (1 - p); ctx.strokeStyle = 'rgba(165,180,252,0.8)'; ctx.stroke();
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(m.x, m.y, 50 * (1 - ((p + i / 3) % 1)), 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(165,180,252,${0.7 * (1 - p)})`; ctx.stroke(); }
        } else if (m.kind === 'meteor') {
          // (the target on the ground is drawn under the troops: drawMeteorGround) the rock coming down, faster and faster,
          // glowing, with a fiery tail, a halo and embers streaming off it, the way Army Clash's meteors fall
          if (T > m.T1) continue; this.drawMeteorRock(ctx, m, T);        } else if (m.kind === 'breath') {
          // DRAGON'S BREATH: a red dragon swoops down the path (a top-down creature, so it turns with its flight), a jet of fire
          // pouring from its jaws onto the ground ahead, and the path left burning behind it
          if (T > m.T1 + 1.6) continue;
          const P = m.pts, n = P.length - 1, p = clamp((T - m.T0) / (m.T1 - m.T0), 0, 1), f = p * n, i0 = Math.min(n - 1, Math.floor(f)), fr = f - i0;
          // the burning trail
          for (let i = 0; i <= Math.min(n, Math.floor(f + 1)); i++) {
            const age = T - (m.T0 + (m.T1 - m.T0) * i / n), a = clamp(1 - age / 2.2, 0, 1); if (age < 0 || a <= 0) continue;
            const [x, y] = P[i];
            for (let j = 0; j < 3; j++) { const fx = x + (H01(i, j) - 0.5) * 50, fy = y + (H01(j, i) - 0.5) * 40, h = (16 + 10 * H01(i + j, 9)) * (0.8 + 0.25 * Math.sin(t * 14 + i + j)) * a;
              ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(fx - 7, fy + 4); ctx.quadraticCurveTo(fx - 7, fy - h * 0.5, fx, fy - h); ctx.quadraticCurveTo(fx + 7, fy - h * 0.5, fx + 7, fy + 4); ctx.closePath(); ctx.fillStyle = '#FF7A1A'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); }
          }
          ctx.globalAlpha = 1;
          if (p >= 1) continue;
          // the dragon flies a little behind the head of the flame, high above the path
          const [ax, ay] = P[i0], [bx, by] = P[i0 + 1], x = lerp(ax, bx, fr), y = lerp(ay, by, fr), dir = Math.atan2(by - ay, bx - ax);
          const dx = x - Math.cos(dir) * 70, dy = y - Math.sin(dir) * 70 - 40, flap = Math.sin(t * 16);
          // fire jet from the jaws to the ground
          const jx = dx + Math.cos(dir) * 34, jy = dy + Math.sin(dir) * 34;
          for (const [w, col] of [[30, 'rgba(255,90,30,0.45)'], [18, 'rgba(255,170,60,0.85)'], [7, 'rgba(255,245,200,0.95)']]) { ctx.beginPath(); ctx.moveTo(jx, jy); ctx.quadraticCurveTo((jx + x) / 2 + Math.sin(t * 30) * 4, (jy + y) / 2 - 10, x, y); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.stroke(); }
          // its shadow on the ground
          ctx.beginPath(); ctx.ellipse(dx + 30, dy + 90, 46, 20, dir, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill();
          ctx.save(); ctx.translate(dx, dy); ctx.rotate(dir);
          // wings
          for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-6, sg * 8); ctx.quadraticCurveTo(-4, sg * (46 + 10 * flap), -34, sg * (58 + 12 * flap)); ctx.quadraticCurveTo(-26, sg * 30, -30, sg * 10); ctx.closePath(); ctx.fillStyle = '#B91C1C'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); }
          // tail, body, head
          ctx.beginPath(); ctx.moveTo(-22, 0); ctx.quadraticCurveTo(-48, Math.sin(t * 8) * 10, -66, 0); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = '#DC2626'; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(-6, 0, 24, 12, 0, 0, TAU); ctx.fillStyle = '#DC2626'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(22, 0, 12, 9, 0, 0, TAU); ctx.fillStyle = '#EF4444'; ctx.fill(); ctx.stroke();
          for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(16, sg * 6); ctx.lineTo(8, sg * 14); ctx.lineWidth = 3; ctx.strokeStyle = '#FDE68A'; ctx.stroke(); }
          ctx.beginPath(); ctx.ellipse(-6, -4, 12, 4, 0, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
          ctx.restore();
        } else if (m.kind === 'clock') {
          if (T > m.T1) continue;
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fillStyle = 'rgba(147,197,253,0.16)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(147,197,253,0.85)'; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x, m.y - m.r * 0.6); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + m.r * 0.4, m.y); ctx.lineWidth = 5; ctx.strokeStyle = '#DBEAFE'; ctx.stroke();
        } else if (m.kind === 'totem') {
          // (Rellz 2026-11-23) the war shaman's totem, in the same look as the crystal's totems: it rises out of the ground beside the
          // path with a ripple of the spell's colour along the ground, pulses its spell out over the troops, then sinks back down
          if (age > 2.2) continue;
          const up = easeOutBack(clamp(age / 0.4, 0, 1)), down = clamp((2.2 - age) / 0.45, 0, 1), h = Math.min(up, 1) * (0.25 + 0.75 * easeOutCubic(down)), a = clamp(age / 0.15, 0, 1) * Math.min(1, down * 1.6);
          ctx.save(); ctx.globalAlpha = a;
          // (its rings and shadow are on the ground, under the troops: drawn before them)
          if (m.cx !== undefined && age > 0.3 && age < 1.1) { const q = (age - 0.3) / 0.8; ctx.beginPath(); ctx.moveTo(m.x, m.y - 58 * h); ctx.lineTo(m.x + (m.cx - m.x) * q, m.y - 58 * h + (m.cy - m.y + 58 * h) * q); ctx.lineWidth = 3; ctx.setLineDash([6, 8]); ctx.strokeStyle = rgba(m.col, 0.7 * (1 - q)); ctx.stroke(); ctx.setLineDash([]); }
          ctx.translate(m.x, m.y);
          ctx.scale(0.9, 0.9 * h);
          this.drawTotemBody(ctx, t, m.col, 'shaman', null);
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
    // the base's damage, as red numbers rising off it
    if (this.base.hits && !this.noUi) for (const h of this.base.hits) {
      const age = t - h.t0; if (age > 1) continue;
      const k = age / 1, y = this.base.y - 70 - 46 * easeOutCubic(k), a = Math.min(1, (1 - k) * 2.5) * Math.min(1, age / 0.08);
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(h.d >= 4 ? 40 : 30, 800);
      strokeText(ctx, `-${h.d >= 1 ? Math.round(h.d) : h.d.toFixed(1)}%`, this.base.x + h.x, y, '#FF5A5A', COL.ink, 7); ctx.restore();
    }
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
    // what the merchant sold: each spell as a badge (its colour, its name) rising off the cart in turn, over the battle,
    // then fading (Rellz 2026-11-16: "improve layering logic and visual for spells ... especially when the marketplace comes")
    if (this.merch && !this.noUi) {
      const m = this.merch;
      m.sold.forEach((k, i) => {
        const at = m.t0 + 0.25 + i * 1.9, q = (T - at) / 1.6; if (q < 0 || q > 1) return;   // (rising just before it is cast)
        const a = clamp(Math.min(q / 0.12, (1 - q) / 0.25), 0, 1), pop = easeOutBack(clamp(q / 0.15, 0, 1)), y = m.y - 92 - 70 * easeOutCubic(q), x = m.x;
        const B = BOOK[k]; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(pop, pop);
        ctx.font = font(24, 800); const w = Math.min(300, ctx.measureText(B.name).width + 62);
        roundRect(ctx, -w / 2, -22, w, 44, 22); ctx.fillStyle = 'rgba(8,11,20,0.92)'; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = B.col; ctx.stroke();
        disc(ctx, -w / 2 + 22, 0, 14, B.col, 2.5); ctx.font = font(18, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText('$', -w / 2 + 22, 1);
        ctx.font = font(24, 800); ctx.textAlign = 'left'; strokeText(ctx, B.name, -w / 2 + 44, 2, COL.white, COL.ink, 5);
        ctx.restore();
      });
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    }
    // the shield dome over the base: the engine draws its bubble on the ground, which the base itself covers, so here it gets
    // a glass skin over everything: a faint tint, a highlight that sweeps round, its rim and a soft hexagon shimmer
    if (this.sp3) for (const dm of this.sp3.domes) if (dm.base) {
      const a0 = t - dm.t0, inK = easeOutBack(clamp(a0 / 0.35, 0, 1)), out = clamp((dm.end - T) / 0.4, 0, 1), R = dm.r * inK;
      if (R <= 2 || out <= 0) continue;
      ctx.save(); ctx.globalAlpha = out;
      const g = ctx.createRadialGradient(dm.x - R * 0.3, dm.y - R * 0.35, R * 0.1, dm.x, dm.y, R);
      g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.75, rgba(TEAMS[dm.team].c, 0.08)); g.addColorStop(1, rgba(TEAMS[dm.team].l, 0.3));
      ctx.beginPath(); ctx.arc(dm.x, dm.y, R, 0, TAU); ctx.fillStyle = g; ctx.fill();
      const sw = t * 1.6;
      ctx.beginPath(); ctx.arc(dm.x, dm.y, R - 6, sw, sw + 0.7); ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(dm.x, dm.y, R - 10, Math.PI * 1.1, Math.PI * 1.45); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.stroke();
      ctx.restore();
    }
    // Blossom Valley: petals drifting across the battle on the breeze (looks only)
    if (this.tdMap && this.tdMap.petals) {
      for (let i = 0; i < 46; i++) {
        const sp = 40 + H01(i, 3) * 50, ph = (t * sp / (AR.w + 80) + H01(i, 1)) % 1, x = AR.x - 40 + ph * (AR.w + 80), y = AR.y + H01(i, 2) * AR.h + Math.sin(t * 1.3 + i) * 18 + ph * 60;
        if (y > AR.y + AR.h) continue;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * (1 + H01(i, 4)) + i); ctx.scale(1, 0.55 + 0.45 * Math.sin(t * 3 + i));
        ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 2.6, 0, 0, TAU); ctx.fillStyle = i % 3 ? 'rgba(249,168,212,0.85)' : 'rgba(253,242,248,0.85)'; ctx.fill(); ctx.restore();
      }
    }
    // the solar eclipse: the board goes dark, lit only round the towers, the base and the fires; fades in and out
    for (const e of this.tdEvents || []) if (e.type === 'eclipse' && e.on && !e.done) {
      const T = this.fightT, k0 = clamp(Math.min((T - e.t0) / 0.9, (e.end - T) / 0.9), 0, 1), k = k0 * k0 * (3 - 2 * k0);
      if (k <= 0) continue;
      const lights = [];
      for (const tw of this.towers) if (!tw.dead) lights.push([tw.x, tw.y, 120 + tw.tier * 10]);
      if (this.base) lights.push([this.base.x, this.base.y, 190]);
      for (const m of this.marks) if (m.kind === 'meteor' || m.kind === 'breath') { const q = m.pts ? m.pts[6] : [m.x, m.y]; lights.push([q[0], q[1], 120]); }
      // (on a layer of its own: the darkness, with each pool of light wiped out of it softly, so pools that overlap just merge)
      const RS = RVB.RS || 1, PW = Math.round(VW * RS), PH = Math.round(VH * RS);
      if (!this._dark || this._dark.width !== PW) this._dark = RVB.makeCanvas(PW, PH);
      const dc = this._dark.getContext('2d');
      dc.setTransform(1, 0, 0, 1, 0, 0); dc.globalCompositeOperation = 'source-over'; dc.clearRect(0, 0, PW, PH);
      dc.setTransform(ctx.getTransform());
      dc.fillStyle = `rgba(6,8,24,${0.66 * k})`; dc.fillRect(AR.x - 400, AR.y - 400, AR.w + 800, AR.h + 800);
      dc.globalCompositeOperation = 'destination-out';
      for (const [x, y, r] of lights) { const g = dc.createRadialGradient(x, y, r * 0.45, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); dc.fillStyle = g; dc.beginPath(); dc.arc(x, y, r, 0, TAU); dc.fill(); }
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this._dark, 0, 0); ctx.restore();
      ctx.save();
      for (const [x, y, r] of lights) { const w = ctx.createRadialGradient(x, y, 0, x, y, r * 0.7); w.addColorStop(0, `rgba(255,200,120,${0.1 * k})`); w.addColorStop(1, 'rgba(255,200,120,0)'); ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, TAU); ctx.fillStyle = w; ctx.fill(); }
      // the eclipsed sun at the top of the board: a black disc with a burning corona
      const sx = AR.x + AR.w - 120, sy = AR.y + 120, cr = 46;
      const cg = ctx.createRadialGradient(sx, sy, cr * 0.9, sx, sy, cr * 2.2); cg.addColorStop(0, `rgba(255,236,190,${0.9 * k})`); cg.addColorStop(0.35, `rgba(255,190,90,${0.4 * k})`); cg.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.beginPath(); ctx.arc(sx, sy, cr * 2.2, 0, TAU); ctx.fillStyle = cg; ctx.fill();
      ctx.globalAlpha = k; disc(ctx, sx, sy, cr, '#05060C', 0); ctx.globalAlpha = 1;
      ctx.restore();
    }
  },

  // ---------- the screens ----------
  // the scoreboard: the logo, the hook, the base's health (left) and the attackers left (right), the wave and the clock
  drawHUD2(ctx) {
    if (this.noUi) return;
    const t = this.t, b = this.base, left = this.units.filter(u => u.team === ATK && !u.dead && !u.gone).length + Math.max(0, this.reserve[ATK]);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
    // (Rellz 2026-11-21: "nothing in the UI should be in the top 190 px of the 1080x1920 frame, where the iPhone notch/camera
    // island and YouTube's top bar cover it") the logo and the hook line that sat up there are gone; the scoreboard starts below
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
    const px = VW / 2, py = 282, pw = 196, ph = 90, urgent = this.phase === 'fight' && !!this.overtime;
    ctx.font = font(26, 800); spaced(ctx, 3); ctx.textAlign = 'center'; ctx.fillStyle = COL.gold;
    ctx.fillText(this.overtime ? 'OVERTIME' : this.waveNow ? `WAVE ${Math.min(this.waveNow, this.waveN)}/${this.waveN}` : 'GET READY', px, 224); spaced(ctx, 0);
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
      for (const w of this.plan) { if (w.boss || seen.has(w.kind)) continue; seen.add(w.kind); const n0 = this.nativeOf ? this.nativeOf(w.list[0]) : null; waves.push({ type: n0 ? n0.base : w.list[0], name: w.name, sub: `${w.list.length} × ${n0 ? n0.name : labelOf(w.list[0]).replace(/^THE /, '')}`, col: COL.gold, team: ATK }); if (waves.length >= 2) break; }
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
    // (smooth UI) the cards make room for the line-ups and the boss bar by gliding, never by jumping
    const rk = this.rosterK();
    for (const c of this.cards) {
      const k = (t - c.t0) / c.dur;
      if (k < 0 || k > 1) continue;
      const inK = easeOutBack(clamp((t - c.t0) / 0.3, 0, 1)), a0 = clamp(Math.min((t - c.t0) / 0.3, (c.t0 + c.dur - t) / 0.4), 0, 1), a = a0 * a0 * (3 - 2 * a0);
      if (c.kind === 'guess') {
        // "what's your guess?": two choices to comment
        const pop = easeOutBack(clamp((t - c.t0) / 0.35, 0, 1));
        ctx.save(); ctx.globalAlpha = a; ctx.translate(VW / 2, AR.y + 92); ctx.scale(pop, pop); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        roundRect(ctx, -330, -58, 660, 136, 20); ctx.fillStyle = 'rgba(8,11,20,0.92)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = COL.gold; ctx.stroke();
        ctx.font = font(34, 800); strokeText(ctx, "WHAT'S YOUR GUESS?", 0, -26, COL.white, COL.ink, 6);
        [['SURVIVES', TEAMS[DEF].c, -150], ['FALLS', TEAMS[ATK].c, 150]].forEach(([w, col, x], n) => {
          const wob = 1 + 0.04 * Math.sin(t * 6 + n * 2);
          ctx.save(); ctx.translate(x, 30); ctx.scale(wob, wob);
          roundRect(ctx, -120, -26, 240, 52, 26); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = COL.ink; ctx.stroke();
          ctx.font = font(30, 800); ctx.fillStyle = COL.white; ctx.fillText(w, 0, 2); ctx.restore();
        });
        ctx.restore();
        if (this.lay && a >= 1) this.lay.push({ kind: 'box', x: VW / 2 - 330, y: AR.y + 34 + (this.layDY || 0), w: 660, h: 136 });
        continue;
      }
      const boss = this.bossU && !this.bossU.dead && this.phase === 'fight';
      const y = this.glide(c, 'gy', AR.y + lerp(boss ? 112 : 70, 14 + 92 + 46, rk), 10);
      const hasIcon = c.tk || c.spell || c.shaman || c.crystal, iconW = hasIcon ? 60 : 0;
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
      } else if (c.crystal && this.drawGem) {
        disc(ctx, ix, 0, 26, rgba(c.col || '#A5F3FC', 0.3), 3); this.drawGem(ctx, ix, 2, 15, 0.6, 0);
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
    if (!b) return;
    // (smooth UI) when the boss falls or the battle ends, the bar fades away instead of vanishing
    const on = !b.dead && this.phase === 'fight', fa = this.glide(this, 'bossBarA', on ? 1 : 0, 9);
    if (fa < 0.02) return;
    const a = clamp((this.t - this.bossIntro) / 0.4, 0, 1) * fa;
    const x0 = AR.x + 40, w = AR.w - 80, y = AR.y + 20;
    ctx.save(); ctx.globalAlpha = a;
    roundRect(ctx, x0, y, w, 52, 14); ctx.fillStyle = 'rgba(8,11,20,0.9)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#FF5A5A'; ctx.stroke();
    this.fitText(ctx, `${b.bossName}${b.phase > 1 ? (b.phase === 2 ? ' · ENRAGED' : ' · LAST STAND') : ''}`, x0 + 18, y + 17, w - 36, 22, 800, true, '#FF8A8A', 'left', 14);
    const f = clamp(b.hp / b.max, 0, 1), bx = x0 + 18, bw = w - 36, by = y + 32;
    roundRect(ctx, bx, by, bw, 12, 6); ctx.fillStyle = '#2A1218'; ctx.fill();
    roundRect(ctx, bx, by, Math.max(6, bw * f), 12, 6); ctx.fillStyle = '#F43F5E'; ctx.fill();
    for (const k of [1 / 3, 2 / 3]) { ctx.fillStyle = INK; ctx.fillRect(bx + bw * k - 1.5, by, 3, 12); }
    if (this.lay && on) this.lay.push({ kind: 'box', x: x0, y: y + (this.layDY || 0), w, h: 52 });
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
      else if (w) {
        // (rules.pacing: a wave that waits for the one before to be wiped out says so, then counts down the breather)
        const PC = this.opts.pacing && this.opts.pacing.on ? this.opts.pacing : null, nm = w.boss && !w.mini ? 'THE BOSS' : w.name;
        if (PC && !w.go && this.clearT !== undefined && T - this.clearT < 0.05) next = `NEXT: ${nm} · CLEAR THIS WAVE`;
        else { const s = Math.max(1, Math.ceil(PC && !w.go && this.clearT !== undefined ? Math.max((PC.cool ?? 3.5) - (T - this.clearT), w.at - (PC.early ?? 4) - T) : w.at - T)); next = `NEXT: ${nm} IN ${s}`; }
      }
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
    if (this.noUi) return;   // (the cold open: the battle and nothing else)
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
    // 2) the combo counter: kills in quick succession
    {
      let n = 0; if (fight) for (let i = this.killLog.length - 1; i >= 0 && t - this.killLog[i] < 2.5; i--) n++;
      // (smooth UI) the counter fades and grows in when a combo starts and fades out when it ends, instead of blinking
      if (n >= 5) this.comboN = n;
      const ca = this.glide(this, 'comboA', n >= 5 ? 1 : 0, 12);
      if (ca > 0.02 && this.comboN) {
        n = this.comboN;
        const last = this.killLog[this.killLog.length - 1] || 0, pop = (1 + 0.25 * clamp(1 - (t - last) / 0.18, 0, 1)) * (0.8 + 0.2 * ca);
        const x = AR.x + 110, y = AR.y + AR.h - 70;   // (2026-11-22) bottom-left: the right side is under YouTube's like/comment buttons on every phone
        ctx.save(); ctx.globalAlpha = ca; ctx.translate(x, y); ctx.rotate(-0.08); ctx.scale(pop, pop);
        ctx.font = font(n >= 12 ? 64 : 54, 800); strokeText(ctx, `x${n}`, 0, -6, n >= 12 ? '#FF7A45' : COL.gold, COL.ink, 9);
        ctx.font = font(22, 800); strokeText(ctx, 'COMBO', 0, 30, COL.white, COL.ink, 5);
        ctx.restore();
      }
    }
    // 4) (retention, 2026-11-16) fast forward: a small pill while a quiet stretch plays faster (td-cam.js), fading in and out
    {
      const fa = this.glide(this, 'ffA', fight && (this.warpK || 1) > 1.2 ? 1 : 0, 6);
      if (fa > 0.02) {
        // (Rellz 2026-11-21: it covered the panel of tower portraits) under the panel, in the empty space, centred
        const w = 238, h = 48, x = VW / 2 - w / 2, y = 1618;
        ctx.save(); ctx.globalAlpha = fa; ctx.translate(x - 30 * (1 - fa), y);
        roundRect(ctx, 0, -h / 2, w, h, h / 2); ctx.fillStyle = 'rgba(8,11,20,0.82)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.stroke();
        const ph = (t * 2.2) % 1;
        for (let i = 0; i < 2; i++) { const ix = 22 + i * 17; ctx.globalAlpha = fa * (0.55 + 0.45 * Math.max(0, Math.sin((ph - i * 0.3) * TAU))); ctx.fillStyle = COL.gold; ctx.beginPath(); ctx.moveTo(ix, -12); ctx.lineTo(ix + 16, 0); ctx.lineTo(ix, 12); ctx.closePath(); ctx.fill(); }
        ctx.globalAlpha = fa; ctx.textAlign = 'left'; ctx.font = font(26, 800); spaced(ctx, 3); ctx.fillStyle = COL.white; ctx.fillText('FAST FORWARD', 66, 1); spaced(ctx, 0);
        ctx.restore(); ctx.textAlign = 'center';
      }
    }
    // 3) the final countdown: the last 10 seconds, big and see-through over the battle
    // (no countdown any more: there is no time limit, the battle ends when the boss or the base falls)
    const left = 99;
    if (false) {
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
    // (retention, 2026-11-16) the guess from the start is answered: the right call ticked, the other crossed out
    const gk = clamp((k - 1.05) / 0.3, 0, 1);
    if (gk > 0) {
      const pop = easeOutBack(gk);
      ctx.save(); ctx.globalAlpha = Math.min(1, gk * 1.5); ctx.translate(VW / 2, cy + 300); ctx.scale(pop, pop); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      roundRect(ctx, -330, -60, 660, 140, 20); ctx.fillStyle = 'rgba(8,11,20,0.92)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = COL.gold; ctx.stroke();
      ctx.font = font(34, 800); strokeText(ctx, 'DID YOU CALL IT?', 0, -28, COL.white, COL.ink, 6);
      [['SURVIVES', TEAMS[DEF].c, -150, this.winner === DEF], ['FALLS', TEAMS[ATK].c, 150, this.winner !== DEF]].forEach(([w, col, x, right]) => {
        ctx.save(); ctx.translate(x, 30); if (right) { const s2 = 1 + 0.06 * Math.max(0, Math.sin((k - 1.2) * 9)) * Math.exp(-(k - 1.2) * 2); ctx.scale(s2, s2); } ctx.globalAlpha *= right ? 1 : 0.45;
        roundRect(ctx, -120, -26, 240, 52, 26); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = right ? '#FFFFFF' : COL.ink; ctx.stroke();
        ctx.font = font(30, 800); ctx.fillStyle = COL.white; ctx.fillText(w, 14, 2);
        ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.strokeStyle = '#FFFFFF'; ctx.beginPath();
        if (right) { ctx.moveTo(-96, 0); ctx.lineTo(-86, 10); ctx.lineTo(-68, -10); } else { ctx.moveTo(-94, -9); ctx.lineTo(-76, 9); ctx.moveTo(-76, -9); ctx.lineTo(-94, 9); }
        ctx.stroke(); ctx.restore();
      });
      ctx.restore();
    }
    ctx.textBaseline = 'alphabetic';
  },

  // ---------- the thumbnail (1080x1920): the brand background, the question, the busiest moment of the battle, and the
  // best tower against the boss ----------
  // (Rellz 2026-11-23: "for the face-off and thumbnail for Tower Clash the defender should be in the tower, otherwise it looks
  // similar to Army Clash") a tower seen from above, at its tier, with its defender standing in it, fitted to a circle of
  // radius r round (0, 0); the little person stays upright
  drawTowerFig(ctx, best, r, tierMin = 3) {
    const type = best.u.type, U = UNIT[type] || UNIT.soldier, tier = Math.max(tierMin, best.tier || 1);
    const tw = { x: 0, y: 0, u: { r: U.r, flash: 0, type, uid: best.u.uid }, tier, el: best.el || null, def: best.def, kills: 0 };
    const R = Math.max(25, U.r + 11) + (tier >= 3 ? 4 : 0) + (tier >= 5 ? 3 : 0), s = (r * 0.92) / (R + 10);
    ctx.save(); ctx.scale(s, s);
    const keep = this._pass; this._pass = null;
    try { this.drawTowerBase(ctx, tw); } catch (e) { /* no tower */ }
    this._pass = keep;
    const hum = this.opts.humans && E.HUMAN && E.HUMAN[type], ps = hum ? 1.0 : 0.95;
    ctx.save(); if (hum) ctx.translate(0, -U.r * 0.25); ctx.scale(ps, ps); if (!hum) ctx.rotate(-Math.PI / 2);
    try { this.drawPortrait(ctx, type, DEF); } catch (e) { /* no portrait */ }
    ctx.restore(); ctx.restore();
  },
  drawThumbTD(ctx, bg) {
    const t = this.t;
    // background: violet with rays (the channel's colours)
    const DT = TEAMS[DEF], mixc = (hex, k) => { const n = parseInt(hex.slice(1), 16); return `rgb(${Math.round((n >> 16) * k)},${Math.round(((n >> 8) & 255) * k)},${Math.round((n & 255) * k)})`; };
    // (the defenders' colour: Tower Clash's defenders are always cyan, Rellz 2026-11-14)
    // one colour, taken from the defenders' cyan but not the same: its hue turned a little towards blue and deepened, so the
    // cyan towers and base stand out against it (Rellz 2026-11-14: "influenced by and complementing the defender colour")
    const hsl = hex => { const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
      let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l]; };
    const [hh, ss] = hsl(DT.c), H = (hh + 22) % 360, S = Math.round(Math.min(0.85, Math.max(0.55, ss)) * 100);
    // (2026-11-23, Tower Clash's own thumbnail look: the siege) a burning danger-red sky over the fortress, embers rising and a
    // fire glow behind the board, so it reads "under attack" at a glance and never looks like Army Clash's poster or Territory
    // Clash's map. (The cyan defenders and the board's white frame stand out against the red.)
    void H; void S;
    // (Rellz 2026-11-24: "use different colour themes, not just red, for thumbnails") the sky, glow, rays and embers come in seven
    // themes: the map's own when it has an obvious one (snow is frost, the swamp toxic, the furnace fire...), else one from the
    // seed. Looks only.
    const TH = {
      inferno: { g: ['#6E1410', '#3A0A0A', '#0C0404'], glow: '255,140,40', glow2: '220,60,20', ray: '#FFB060', e: ['#FFD27A', '#FF7A2A'], sh: 'rgba(255,90,30,0.9)' },
      toxic: { g: ['#16602F', '#0B2E1A', '#03100A'], glow: '150,255,90', glow2: '40,190,70', ray: '#C8FF8A', e: ['#E4FF9A', '#5CFF6B'], sh: 'rgba(120,255,80,0.85)' },
      frost: { g: ['#0E4A7A', '#0A2848', '#030B18'], glow: '140,215,255', glow2: '40,120,220', ray: '#D6F2FF', e: ['#FFFFFF', '#8FD8FF'], sh: 'rgba(120,200,255,0.9)' },
      royal: { g: ['#4C1D95', '#2A0E5A', '#0B0418'], glow: '200,140,255', glow2: '120,60,220', ray: '#E6D2FF', e: ['#FFD86B', '#C084FC'], sh: 'rgba(180,110,255,0.9)' },
      gold: { g: ['#8A4B05', '#4A2603', '#140A01'], glow: '255,205,70', glow2: '230,130,20', ray: '#FFE7A0', e: ['#FFF1B0', '#FFB020'], sh: 'rgba(255,190,50,0.9)' },
      abyss: { g: ['#0F5560', '#082A31', '#02090C'], glow: '70,240,215', glow2: '20,150,160', ray: '#B5FFF2', e: ['#D6FFF8', '#2DE1C2'], sh: 'rgba(60,230,210,0.85)' },
      neon: { g: ['#7A0E5C', '#3D0730', '#10020C'], glow: '255,90,210', glow2: '170,40,200', ray: '#FFC2EE', e: ['#FFE0F6', '#FF4FD1'], sh: 'rgba(255,80,200,0.9)' },
    };
    const byMap = { snow: 'frost', frozen: 'frost', clouds: 'frost', swamp: 'toxic', graveyard: 'toxic', shroom: 'toxic', furnace: 'inferno', bombed: 'inferno', castle: 'gold', temple: 'gold', pyramid: 'gold', dunes: 'gold', beach: 'abyss', moon: 'abyss', neon: 'neon', sweets: 'neon', rainbow: 'neon', crystal: 'royal', enchanted: 'royal', blossom: 'royal' };
    const keys = Object.keys(TH), sd = (this.opts.seed >>> 0) || 1, hv = (((sd ^ 0x7A5E11) * 2654435761) >>> 0) / 4294967296;
    // (the map's theme two times in three; otherwise any theme, so the same map doesn't always look the same)
    const tk = byMap[this.mapKey || this.opts.map] && hv < 0.67 ? byMap[this.mapKey || this.opts.map] : keys[Math.floor((((sd * 40503) >>> 0) % 997) / 997 * keys.length)];
    const P = TH[tk] || TH.inferno; this.thumbTheme = tk;
    const lg = ctx.createLinearGradient(0, 0, 0, VH);
    lg.addColorStop(0, P.g[0]); lg.addColorStop(0.42, P.g[1]); lg.addColorStop(1, P.g[2]);
    ctx.fillStyle = lg; ctx.fillRect(0, 0, VW, VH);
    const glow = ctx.createRadialGradient(VW / 2, 860, 80, VW / 2, 860, 820); glow.addColorStop(0, `rgba(${P.glow},0.55)`); glow.addColorStop(0.5, `rgba(${P.glow2},0.22)`); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.translate(VW / 2, 860); ctx.globalAlpha = 0.07; ctx.fillStyle = P.ray;
    for (let i = 0; i < 20; i++) { ctx.rotate(TAU / 20); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-80, -1500); ctx.lineTo(80, -1500); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // embers / sparks / snow (fixed positions from a hash: the same picture every time for the same battle)
    ctx.save();
    for (let i = 0; i < 70; i++) {
      const hx = ((i * 2654435761) >>> 0) / 4294967296, hy = ((i * 1597334677 + 99) >>> 0) / 4294967296, hz = ((i * 3812015801 + 7) >>> 0) / 4294967296;
      const x = hx * VW, y = 160 + hy * 1500, r = 2 + hz * 6;
      ctx.globalAlpha = 0.35 + hz * 0.5; ctx.fillStyle = hz > 0.6 ? P.e[0] : P.e[1];
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // the battle, framed
    const fw = 740, fh = fw, fx = (VW - fw) / 2, fy = 500, sy = AR.y + UI_DY;
    ctx.save(); ctx.translate(fx + fw / 2, fy + fh / 2); ctx.rotate(-0.025);
    ctx.save(); ctx.shadowColor = P.sh; ctx.shadowBlur = 70;
    roundRect(ctx, -fw / 2 - 10, -fh / 2 - 10, fw + 20, fh + 20, 30); ctx.fillStyle = COL.ink; ctx.fill(); ctx.restore();
    roundRect(ctx, -fw / 2, -fh / 2, fw, fh, 22); ctx.save(); ctx.clip();
    ctx.drawImage(bg, AR.x, sy, AR.w, AR.h, -fw / 2, -fh / 2, fw, fh);
    const vg = ctx.createRadialGradient(0, 0, fw * 0.3, 0, 0, fw * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = vg; ctx.fillRect(-fw / 2, -fh / 2, fw, fh);
    ctx.restore();
    roundRect(ctx, -fw / 2, -fh / 2, fw, fh, 22); ctx.lineWidth = 8; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
    ctx.restore();
    // the logo and the question
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // (2026-11-23) the question on top, the logo small above it; nothing that matters below y 1500 (YouTube's title goes there)
    ctx.font = font(56, 800); spaced(ctx, 6); strokeText(ctx, 'TOWER CLASH', VW / 2, 222, DT.l, COL.ink, 10); spaced(ctx, 0);
    const q = this.mode ? MODES[this.mode].hook : 'WILL THE BASE SURVIVE?';
    const words = q.split(' '), lines = []; let cur = '';
    let fs0 = 118; ctx.font = font(fs0, 800);
    for (const w of words) { const s = cur ? cur + ' ' + w : w; if (ctx.measureText(s).width > 940 && cur) { lines.push(cur); cur = w; } else cur = s; }
    if (cur) lines.push(cur);
    if (lines.length > 2) { fs0 = 92; ctx.font = font(fs0, 800); }
    const ly0 = lines.length > 1 ? (lines.length > 2 ? 300 : 318) : 360;
    lines.forEach((l, i) => { ctx.save(); ctx.translate(VW / 2, ly0 + i * fs0 * 0.95); ctx.rotate(-0.04); strokeText(ctx, l, 0, 0, i === lines.length - 1 ? COL.gold : COL.white, COL.ink, 16); ctx.restore(); });
    // the best tower (bottom left) against the boss (bottom right)
    const best = this.towers.slice().sort((a, b) => (b.tier - a.tier) || (b.kills - a.kills))[0];
    const fig = (type, team, cx, cy, r, col, name, tower) => {
      const U = UNIT[type]; if (!U) return;
      const rg = ctx.createRadialGradient(cx, cy, 10, cx, cy, r * 1.45); rg.addColorStop(0, rgba(col, 0.75)); rg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, r * 1.45, 0, TAU); ctx.fill();
      disc(ctx, cx, cy, r, rgba(col, 0.35), 8);
      if (tower) { ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 4, 0, TAU); ctx.clip(); ctx.translate(cx, cy); this.drawTowerFig(ctx, tower, r); ctx.restore(); }
      else {
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 4, 0, TAU); ctx.clip(); ctx.translate(cx, cy); const hum = this.opts.humans && E.HUMAN && E.HUMAN[type], s = clamp((r * (hum ? 0.66 : 0.55)) / U.r, 0.5, 8); if (hum) ctx.translate(0, r * 0.12); ctx.scale(s, s); if (!hum) ctx.rotate(-Math.PI / 2);
      try { this.drawPortrait(ctx, type, team); } catch (e) { /* no portrait */ }
      ctx.restore();
      }
      ctx.font = font(46, 800); spaced(ctx, 2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let fz = 46; while (fz > 24 && ctx.measureText(name).width > 380) { fz -= 2; ctx.font = font(fz, 800); }
      strokeText(ctx, name, cx, cy + r + 40, COL.white, COL.ink, 9); spaced(ctx, 0);
    };
    // the best tower (bottom left, smaller) and the boss looming bigger over the board's corner (bottom right)
    if (best) fig(best.u.type, DEF, 250, 1290, 115, TEAMS[DEF].c, best.def.name, best);
    fig(this.bossType, ATK, VW - 262, 1268, 158, TEAMS[ATK].c, (BOSSES[this.bossType] || {}).name || labelOf(this.bossType));
    ctx.save(); ctx.translate(VW / 2 - 10, 1330); ctx.rotate(-0.06); ctx.font = font(104, 800); strokeText(ctx, 'VS', 0, 0, COL.gold, COL.ink, 14); ctx.restore();
    void t; ctx.textBaseline = 'alphabetic';
  },
};
Object.assign(TD.prototype, DRAW);
module.exports = { TD };
