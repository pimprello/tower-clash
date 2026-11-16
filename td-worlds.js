// Tower Clash: strange new worlds (Rellz, 2026-11-16: "make cool strange different unique maps and characters like a rainbow, use
// mario worlds as example but dont copy, like a rainbow map a sand one and multiple others ... and then make some characters
// specific to those maps who will be a bit stronger").
//
// Six worlds (their entries in td-data.js TD_MAPS): Rainbow Road (a rainbow over a starry sky), Candy Kingdom (frosting, chocolate
// paths, lollipops and gumdrops), Mushroom Grove (giant spotted mushrooms and drifting spores), Pharaoh's Sands (pyramids, obelisks
// and an oasis), Sky Kingdom (a golden road over the clouds, balloons drifting) and Crystal Caverns (glowing crystal clusters in the
// dark; mystical crystals fall there twice as often). Each has its own floor, path, scenery and moving details, and its own
// natives: troops born there, about 30% tougher, hitting 25% harder and a little faster on home ground, who march in as one or two
// of the waves. A native is an existing troop (so it walks and fights the same) washed in its world's look: rainbow knights, jelly
// gummy brutes, gingerbread soldiers with icing, spotted shroomlings, bandaged mummies, black-and-gold jackal guards, storm birds,
// cloud knights, crystal knights and shard bats.
'use strict';
const RVB = require('./engine.js');
const D = require('./td-data.js');
const { TD, laneAt, PATH_W, ATK } = require('./td.js');
const E = RVB._;
const { AR, COL, TAU, MAP_THEME, clamp, rgba, hash01 } = E;
const INK = COL.ink || '#0B0F1A';
const H01 = (a, b) => hash01((a * 7919) | 0, (b * 104729) | 0);

// ---------- the natives ----------
const NATIVES = {
  prismknight: { name: 'PRISM KNIGHT', base: 'knight', wash: 'rainbow' },
  starsprite: { name: 'STAR SPRITE', base: 'wisp', wash: 'star' },
  gummybrute: { name: 'GUMMY BRUTE', base: 'troll', wash: 'gummy' },
  gingerguard: { name: 'GINGERBREAD GUARD', base: 'soldier', wash: 'ginger' },
  shroomling: { name: 'SHROOMLING', base: 'goblin', wash: 'shroom' },
  sporebrute: { name: 'SPORE BRUTE', base: 'ogre', wash: 'spore' },
  mummy: { name: 'MUMMY', base: 'zombie', wash: 'mummy' },
  jackalguard: { name: 'JACKAL GUARD', base: 'royalguard', wash: 'anubis' },
  scarab: { name: 'SCARAB SWARM', base: 'spiderling', wash: 'scarab' },
  stormbird: { name: 'STORM BIRD', base: 'griffin', wash: 'storm' },
  cloudknight: { name: 'CLOUD KNIGHT', base: 'paladin', wash: 'cloud' },
  gemknight: { name: 'GEM KNIGHT', base: 'mirrorknight', wash: 'gem' },
  shardbat: { name: 'SHARD BAT', base: 'gargoyle', wash: 'shard' },
};
const WORLDS = {
  rainbow: { wave: 'THE PRISM GUARD', natives: ['prismknight', 'starsprite'], hazard: 'storm' },
  sweets: { wave: 'THE CANDY CORPS', natives: ['gingerguard', 'gummybrute'], hazard: 'stampede' },
  shroom: { wave: 'THE SPORE HORDE', natives: ['shroomling', 'sporebrute'], hazard: 'stampede' },
  pyramid: { wave: "THE PHARAOH'S LEGION", natives: ['mummy', 'jackalguard', 'scarab'], hazard: 'sandworm' },
  clouds: { wave: 'THE STORM HOST', natives: ['cloudknight', 'stormbird'], hazard: 'storm' },
  crystal: { wave: 'THE GEM LEGION', natives: ['gemknight', 'shardbat'], hazard: 'meteors' },
};
const NATIVE_K = { hp: 1.3, dmg: 1.25, spd: 1.08 };

// the washes: painted over a native's body (only where the body is), on its own small canvas
const WASH = {
  rainbow(o, S, t) { const g = o.createLinearGradient(0, 0, S, S), ph = (t * 0.25) % 1; ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#3B82F6', '#8B5CF6', '#EF4444'].forEach((c, i) => g.addColorStop(clamp((i / 6 + ph) % 1, 0, 1), c)); o.globalAlpha = 0.55; o.fillStyle = g; o.fillRect(0, 0, S, S); },
  star(o, S) { o.globalAlpha = 0.6; o.fillStyle = '#FDE68A'; o.fillRect(0, 0, S, S); },
  gummy(o, S) { o.globalAlpha = 0.5; o.fillStyle = '#EC4899'; o.fillRect(0, 0, S, S); o.globalAlpha = 0.35; o.fillStyle = '#FFFFFF'; o.beginPath(); o.ellipse(S * 0.38, S * 0.36, S * 0.16, S * 0.08, -0.6, 0, TAU); o.fill(); },
  ginger(o, S) { o.globalAlpha = 0.6; o.fillStyle = '#B45309'; o.fillRect(0, 0, S, S); o.globalAlpha = 0.9; o.strokeStyle = '#FFFFFF'; o.lineWidth = Math.max(1.5, S * 0.025); for (let i = 0; i < 3; i++) { o.beginPath(); for (let x = 0; x <= S; x += S / 12) o.lineTo(x, S * (0.35 + i * 0.15) + (x / (S / 12)) % 2 * S * 0.03); o.stroke(); } },
  shroom(o, S) { o.globalAlpha = 0.45; o.fillStyle = '#DC2626'; o.fillRect(0, 0, S, S); o.globalAlpha = 0.9; o.fillStyle = '#FFFFFF'; for (let i = 0; i < 7; i++) { o.beginPath(); o.arc(S * (0.3 + 0.4 * H01(i, 1)), S * (0.3 + 0.4 * H01(i, 2)), S * 0.035, 0, TAU); o.fill(); } },
  spore(o, S) { o.globalAlpha = 0.45; o.fillStyle = '#65A30D'; o.fillRect(0, 0, S, S); o.globalAlpha = 0.7; o.fillStyle = '#D9F99D'; for (let i = 0; i < 8; i++) { o.beginPath(); o.arc(S * (0.25 + 0.5 * H01(i, 3)), S * (0.25 + 0.5 * H01(i, 4)), S * 0.025, 0, TAU); o.fill(); } },
  mummy(o, S) { o.globalAlpha = 0.65; o.fillStyle = '#E7DCC0'; o.fillRect(0, 0, S, S); o.globalAlpha = 0.5; o.strokeStyle = '#8A7A5A'; o.lineWidth = Math.max(1.2, S * 0.018); for (let i = -4; i < 8; i++) { o.beginPath(); o.moveTo(0, i * S * 0.12); o.lineTo(S, i * S * 0.12 + S * 0.3); o.stroke(); } },
  anubis(o, S) { o.globalAlpha = 0.6; o.fillStyle = '#111827'; o.fillRect(0, 0, S, S); o.globalAlpha = 0.85; o.fillStyle = '#F59E0B'; for (let i = 0; i < 3; i++) o.fillRect(0, S * (0.38 + i * 0.12), S, S * 0.025); },
  scarab(o, S) { const g = o.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#2DD4BF'); g.addColorStop(1, '#B45309'); o.globalAlpha = 0.6; o.fillStyle = g; o.fillRect(0, 0, S, S); },
  storm(o, S, t) { o.globalAlpha = 0.5; o.fillStyle = '#2563EB'; o.fillRect(0, 0, S, S); if (Math.sin(t * 9) > 0.6) { o.globalAlpha = 0.9; o.strokeStyle = '#FEF9C3'; o.lineWidth = Math.max(1.5, S * 0.02); o.beginPath(); o.moveTo(S * 0.4, S * 0.3); o.lineTo(S * 0.52, S * 0.45); o.lineTo(S * 0.44, S * 0.5); o.lineTo(S * 0.58, S * 0.68); o.stroke(); } },
  cloud(o, S) { const g = o.createLinearGradient(0, 0, 0, S); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#93C5FD'); o.globalAlpha = 0.6; o.fillStyle = g; o.fillRect(0, 0, S, S); },
  gem(o, S, t) { const g = o.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#A5F3FC'); g.addColorStop(0.5, '#A78BFA'); g.addColorStop(1, '#6D28D9'); o.globalAlpha = 0.6; o.fillStyle = g; o.fillRect(0, 0, S, S); o.globalAlpha = 0.6; o.strokeStyle = '#FFFFFF'; o.lineWidth = Math.max(1, S * 0.012); const x = ((t * 0.5) % 1) * S; o.beginPath(); o.moveTo(x, 0); o.lineTo(x - S * 0.4, S); o.stroke(); },
  shard(o, S) { o.globalAlpha = 0.55; o.fillStyle = '#C026D3'; o.fillRect(0, 0, S, S); },
};

const W = {
  // a native's type and look; called by spawnAttacker
  nativeOf(type) { return typeof type === 'string' && type.startsWith('n:') ? NATIVES[type.slice(2)] : null; },
  // one or two of the normal waves become the world's natives
  plantNatives(R) {
    const Wd = WORLDS[this.opts.map]; if (!Wd || this.mode === 'bossrush') return;
    const normal = this.plan.filter(w => !w.boss);
    const picks = normal.length >= 5 ? [1, 3] : normal.length >= 3 ? [1] : [];
    for (const i of picks) {
      const w = normal[i], list = [];
      for (const k of Wd.natives) { const b = NATIVES[k].base, sz = E.UNIT[b] ? (E.UNIT[b].hp >= 40 ? 'big' : E.UNIT[b].hp >= 15 ? 'mid' : 'small') : 'small'; const n = sz === 'big' ? 2 + R.int(0, 1) : sz === 'mid' ? 3 + R.int(0, 2) : 6 + R.int(0, 3); for (let j = 0; j < n; j++) list.push('n:' + k); }
      // mixed through each other
      for (let j = list.length - 1; j > 0; j--) { const q = R.int(0, j); [list[j], list[q]] = [list[q], list[j]]; }
      w.list = list; w.name = Wd.wave; w.native = true; w.air = list.every(k => E.UNIT[NATIVES[k.slice(2)].base].flying);
      w.gap = 0.55;
    }
  },
  // ---------- the look of each world ----------
  // the path: painted once, after the plain path
  worldPath(g, stroke, lx, ly) {
    const m = this.opts.map; if (!WORLDS[m]) return;
    const ticks = (step, w, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); for (const L of this.lanes) for (let s = 6; s < L.len; s += step) { const p = laneAt(L, s); g.moveTo(p.x - AR.x - p.nx * w, p.y - AR.y - p.ny * w); g.lineTo(p.x - AR.x + p.nx * w, p.y - AR.y + p.ny * w); } g.stroke(); };
    const dots = (n, cols, size, seed) => { for (let li = 0; li < this.lanes.length; li++) { const L = this.lanes[li]; for (let s = 4, k = 0; s < L.len; s += L.len / n, k++) { const p = laneAt(L, s), lat = (H01(k + li * 99, seed) - 0.5) * (PATH_W - 14); g.save(); g.translate(p.x - AR.x + p.nx * lat, p.y - AR.y + p.ny * lat); g.rotate(H01(k, seed + 1) * 6); g.fillStyle = cols[k % cols.length]; g.fillRect(-size, -size * 0.35, size * 2, size * 0.7); g.restore(); } } };
    if (m === 'rainbow') {
      const C = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#3B82F6', '#8B5CF6'];
      C.forEach((c, i) => stroke(PATH_W - i * (PATH_W / 6), c));
      stroke(4, 'rgba(255,255,255,0.5)');
    } else if (m === 'sweets') {
      stroke(PATH_W - 12, '#A0694A'); ticks(26, PATH_W / 2 - 6, 'rgba(60,30,15,0.45)', 3);
      dots(70, ['#F472B6', '#60A5FA', '#FDE047', '#4ADE80', '#FFFFFF'], 4, 11);
    } else if (m === 'shroom') {
      stroke(PATH_W - 18, '#9C7B52'); dots(50, ['#4D7C0F', '#65A30D'], 5, 13);
    } else if (m === 'pyramid') {
      stroke(PATH_W - 8, '#E2C48A'); ticks(24, PATH_W / 2 - 3, 'rgba(120,90,40,0.5)', 2.5);
      g.lineWidth = 2; g.strokeStyle = 'rgba(120,90,40,0.35)'; for (const L of this.lanes) { g.beginPath(); L.P.forEach((p, i) => (i ? g.lineTo(lx(p), ly(p)) : g.moveTo(lx(p), ly(p)))); g.stroke(); }
    } else if (m === 'clouds') {
      stroke(PATH_W - 8, '#F7D774'); ticks(16, PATH_W / 2 - 3, 'rgba(160,110,20,0.55)', 2.5); stroke(6, 'rgba(255,255,255,0.35)');
    } else if (m === 'crystal') {
      stroke(PATH_W - 10, '#463E62');
      g.strokeStyle = 'rgba(103,232,249,0.55)'; g.lineWidth = 2;
      for (const L of this.lanes) for (let s = 20, k = 0; s < L.len; s += 70, k++) { const p = laneAt(L, s), a = Math.atan2(p.dy, p.dx) + (H01(k, 7) - 0.5) * 1.2, l = 14 + 14 * H01(k, 8); g.beginPath(); g.moveTo(p.x - AR.x, p.y - AR.y); g.lineTo(p.x - AR.x + Math.cos(a) * l, p.y - AR.y + Math.sin(a) * l); g.lineTo(p.x - AR.x + Math.cos(a + 0.6) * l * 1.6, p.y - AR.y + Math.sin(a + 0.6) * l * 1.6); g.stroke(); }
    }
  },
  // scenery: returns true when it drew this prop
  worldProp(g, p, h) {
    const m = this.opts.map; if (!WORLDS[m]) return false;
    const { x, y, r, v } = p, { shadow, blob, shade, rock } = h;
    const glows = this._wglow || (this._wglow = []);
    if (m === 'rainbow') {
      if (v < 0.45) { shadow(x, y, r * 0.8); for (let k = 0; k < 5; k++) { const a = p.a + k * 1.26; blob(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.3, r * 0.48, k % 2 ? '#EEF2FF' : '#FFFFFF', 2); } blob(x, y, r * 0.5, '#FFFFFF', 0); shade(x, y, r * 0.9); }
      else if (v < 0.72) { const s = r * 0.7; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? s * 0.45 : s; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); g.fillStyle = '#FDE047'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke(); glows.push({ x, y, r: s * 1.6, col: '#FDE047' }); }
      else if (v < 0.88) { shadow(x, y, r * 0.7); blob(x, y + r * 0.15, r * 0.62, '#7C6A9A'); blob(x, y - r * 0.08, r * 0.58, '#4ADE80', 2.5); blob(x - r * 0.2, y - r * 0.2, r * 0.18, '#86EFAC', 0); }
      else rock(x, y, r * 0.55, '#8B7FB0');
      return true;
    }
    if (m === 'sweets') {
      if (v < 0.25) { shadow(x, y, r * 0.5); g.lineCap = 'round'; g.lineWidth = 5; g.strokeStyle = '#F5F5F4'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + r * 0.5, y + r * 0.7); g.stroke(); blob(x, y, r * 0.55, ['#F472B6', '#60A5FA', '#FBBF24'][Math.floor(v * 12) % 3], 2.5); g.beginPath(); for (let a = 0; a < 12; a += 0.2) g.lineTo(x + Math.cos(a) * a * r * 0.04, y + Math.sin(a) * a * r * 0.04); g.lineWidth = 2.5; g.strokeStyle = '#FFFFFF'; g.stroke(); }
      else if (v < 0.45) { shadow(x, y, r * 0.4); g.lineCap = 'round'; for (const [w, c] of [[9, INK], [6, '#FFFFFF']]) { g.lineWidth = w; g.strokeStyle = c; g.beginPath(); g.moveTo(x, y + r * 0.6); g.lineTo(x, y - r * 0.3); g.arc(x + r * 0.25, y - r * 0.3, r * 0.25, Math.PI, 0); g.stroke(); } g.setLineDash([5, 5]); g.lineWidth = 6; g.strokeStyle = '#EF4444'; g.beginPath(); g.moveTo(x, y + r * 0.6); g.lineTo(x, y - r * 0.3); g.arc(x + r * 0.25, y - r * 0.3, r * 0.25, Math.PI, 0); g.stroke(); g.setLineDash([]); }
      else if (v < 0.65) { shadow(x, y, r * 0.55); blob(x, y, r * 0.55, ['#4ADE80', '#F472B6', '#A78BFA', '#FB923C'][Math.floor(v * 40) % 4]); shade(x, y, r * 0.55); for (let k = 0; k < 6; k++) blob(x + (H01(k, x | 0) - 0.5) * r * 0.7, y + (H01(y | 0, k) - 0.5) * r * 0.7, 1.6, '#FFFFFF', 0); }
      else if (v < 0.85) { shadow(x, y, r * 0.6); blob(x, y, r * 0.62, '#C2410C'); for (let k = 0; k < 3; k++) blob(x, y - k * 2, r * (0.5 - k * 0.13), k % 2 ? '#FBCFE8' : '#F9A8D4', 2); blob(x, y - 6, r * 0.13, '#DC2626', 2); }
      else { shadow(x, y, r * 0.6); blob(x, y, r * 0.6, '#E8B07A'); blob(x, y, r * 0.48, '#F472B6', 2); blob(x, y, r * 0.18, '#F9C6DA', 2); for (let k = 0; k < 6; k++) { const a = k * 1.05; g.fillStyle = ['#FDE047', '#60A5FA', '#FFFFFF'][k % 3]; g.fillRect(x + Math.cos(a) * r * 0.33 - 2, y + Math.sin(a) * r * 0.33 - 1, 4, 2); } }
      return true;
    }
    if (m === 'shroom') {
      if (v < 0.5) { const R = r * 1.1; shadow(x, y, R); blob(x, y, R, '#DC2626'); for (let k = 0; k < 6; k++) { const a = p.a + k * 1.05, d = R * (0.35 + 0.35 * H01(k, x | 0)); blob(x + Math.cos(a) * d, y + Math.sin(a) * d, R * (0.12 + 0.08 * H01(k, y | 0)), '#FFFFFF', 0); } blob(x, y, R * 0.16, '#FEF2F2', 0); shade(x, y, R); }
      else if (v < 0.7) { shadow(x, y, r * 0.6); for (let k = 0; k < 4; k++) { const a = p.a + k * 1.6; blob(x + Math.cos(a) * r * 0.35, y + Math.sin(a) * r * 0.35, r * 0.3, k % 2 ? '#A16207' : '#CA8A04', 2); } }
      else if (v < 0.85) { shadow(x, y, r * 0.5); for (let k = 0; k < 3; k++) { const a = p.a + k * 2.1, xx = x + Math.cos(a) * r * 0.3, yy = y + Math.sin(a) * r * 0.3; blob(xx, yy, r * 0.28, '#38BDF8', 2); glows.push({ x: xx, y: yy, r: r * 0.7, col: '#67E8F9' }); } }
      else { shadow(x, y, r * 0.7); blob(x, y, r * 0.7, '#3F7A34'); blob(x - r * 0.2, y - r * 0.2, r * 0.4, '#5DA34A', 0); }
      return true;
    }
    if (m === 'pyramid') {
      if (v < 0.25) {
        const s = r * 2; g.beginPath(); g.moveTo(x + s * 0.3, y + s * 0.35); g.lineTo(x + s * 1.4, y + s * 0.5); g.lineTo(x + s * 0.5, y - s * 0.3); g.closePath(); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
        const fc = [['#E9C77B', -1, -1], ['#C9A35A', 1, -1], ['#B18A45', 1, 1], ['#D9B66B', -1, 1]];
        for (const [c, sx, sy] of fc) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + sx * s * 0.5, y + sy * s * 0.5); g.lineTo(sx === sy ? x - sx * s * 0.5 : x + sx * s * 0.5, sx === sy ? y + sy * s * 0.5 : y - sy * s * 0.5); g.closePath(); g.fillStyle = c; g.fill(); }
        g.beginPath(); g.rect(x - s * 0.5, y - s * 0.5, s, s); g.moveTo(x - s * 0.5, y - s * 0.5); g.lineTo(x + s * 0.5, y + s * 0.5); g.moveTo(x + s * 0.5, y - s * 0.5); g.lineTo(x - s * 0.5, y + s * 0.5); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
      } else if (v < 0.42) { g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + r * 1.8, y + r * 0.7); g.lineTo(x + r * 1.8 + 6, y + r * 0.7 - 6); g.lineTo(x + 4, y - 4); g.closePath(); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill(); blob(x, y, r * 0.3, '#D9B66B', 2.5); g.beginPath(); g.moveTo(x - 3, y - 3); g.lineTo(x + 3, y + 3); g.lineWidth = 2; g.strokeStyle = '#8A6A30'; g.stroke(); }
      else if (v < 0.62) { shadow(x, y, r); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + p.a; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.6, r * 0.22, a, 0, TAU); g.fillStyle = k % 2 ? '#3E9A4A' : '#2F7A3A'; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke(); } blob(x, y, r * 0.2, '#8A6A49', 2); }
      else if (v < 0.78) { shadow(x, y, r * 0.5); blob(x, y, r * 0.42, '#E7D3A0'); blob(x, y, r * 0.3, '#CDB27A', 2); shade(x, y, r * 0.42); }
      else rock(x, y, r * 0.6, '#C9A87A');
      return true;
    }
    if (m === 'clouds') {
      if (v < 0.6) { const R = r * 1.2; for (let k = 0; k < 6; k++) { const a = p.a + k * 1.05; blob(x + Math.cos(a) * R * 0.5, y + Math.sin(a) * R * 0.32, R * 0.5, k % 2 ? '#F1F5F9' : '#FFFFFF', 0); } blob(x, y, R * 0.55, '#FFFFFF', 0); g.beginPath(); g.ellipse(x, y + R * 0.3, R * 0.9, R * 0.25, 0, 0, Math.PI); g.fillStyle = 'rgba(148,163,184,0.35)'; g.fill(); }
      else if (v < 0.78) { shadow(x, y, r * 0.6); const R = r * 0.62; blob(x, y, R, '#F87171'); g.save(); g.beginPath(); g.arc(x, y, R, 0, TAU); g.clip(); for (let k = -2; k <= 2; k += 2) { g.fillStyle = '#FDE047'; g.fillRect(x + k * R * 0.3 - R * 0.14, y - R, R * 0.28, R * 2); } g.restore(); g.beginPath(); g.arc(x, y, R, 0, TAU); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke(); shade(x, y, R); g.fillStyle = '#92400E'; g.fillRect(x - 4, y + R + 2, 8, 6); }
      else if (v < 0.9) { g.lineWidth = 5; ['#EF4444', '#FACC15', '#22C55E', '#3B82F6'].forEach((c, i) => { g.beginPath(); g.arc(x, y + r * 0.4, r * (0.85 - i * 0.14), Math.PI, 0); g.strokeStyle = c; g.stroke(); }); }
      else { shadow(x, y, r * 0.7); blob(x, y, r * 0.6, '#A8A29E'); blob(x, y - 3, r * 0.5, '#4ADE80', 2); }
      return true;
    }
    if (m === 'crystal') {
      if (v < 0.55) {
        const cols = [['#67E8F9', '#0E7490'], ['#F0ABFC', '#A21CAF'], ['#C4B5FD', '#6D28D9']][Math.floor(v * 30) % 3];
        glows.push({ x, y, r: r * 1.8, col: cols[0] });
        for (let k = 0; k < 4; k++) {
          const a = p.a + k * 1.4, d = k ? r * 0.45 : 0, cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d, s = r * (k ? 0.5 : 0.72), ang = (k ? a : 0) * 0.5;
          g.save(); g.translate(cx, cy); g.rotate(ang);
          g.beginPath(); g.moveTo(0, -s * 1.2); g.lineTo(s * 0.45, -s * 0.4); g.lineTo(s * 0.35, s * 0.8); g.lineTo(-s * 0.35, s * 0.8); g.lineTo(-s * 0.45, -s * 0.4); g.closePath();
          const gr = g.createLinearGradient(0, -s, 0, s); gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.4, cols[0]); gr.addColorStop(1, cols[1]); g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
          g.restore();
        }
      } else if (v < 0.8) { shadow(x, y, r * 0.6); blob(x, y, r * 0.55, '#3B3552'); blob(x - r * 0.12, y - r * 0.12, r * 0.3, '#4F4670', 0); }
      else { g.beginPath(); g.ellipse(x, y, r * 0.8, r * 0.55, 0, 0, TAU); g.fillStyle = '#0E4F5C'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke(); glows.push({ x, y, r: r, col: '#22D3EE' }); }
      return true;
    }
    return false;
  },
  // moving details over the ground (looks only)
  worldLive(ctx) {
    const m = this.opts.map; if (!WORLDS[m]) return;
    const t = this.t;
    for (const gl of this._wglow || []) {
      const k = 0.5 + 0.5 * Math.sin(t * 2 + gl.x * 0.05), x = gl.x + AR.x, y = gl.y + AR.y;
      const g = ctx.createRadialGradient(x, y, 1, x, y, gl.r); g.addColorStop(0, rgba(gl.col, 0.22 + 0.2 * k)); g.addColorStop(1, rgba(gl.col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, gl.r, 0, TAU); ctx.fill();
    }
    if (m === 'rainbow' || m === 'sweets' || m === 'crystal') {
      for (let i = 0; i < 26; i++) {
        const ph = (t * 0.35 + H01(i, 1)) % 1, a = Math.sin(Math.PI * ph), x = AR.x + H01(i, 2) * AR.w, y = AR.y + H01(i, 3) * AR.h, s = 3 + 5 * a;
        ctx.globalAlpha = a * 0.8; ctx.fillStyle = m === 'crystal' ? '#A5F3FC' : m === 'sweets' ? '#FFFFFF' : '#FEF9C3';
        ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.25, y - s * 0.25); ctx.lineTo(x + s, y); ctx.lineTo(x + s * 0.25, y + s * 0.25); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.25, y + s * 0.25); ctx.lineTo(x - s, y); ctx.lineTo(x - s * 0.25, y - s * 0.25); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (m === 'shroom') {
      for (let i = 0; i < 30; i++) {
        const ph = (t * 0.08 + H01(i, 4)) % 1, x = AR.x + H01(i, 5) * AR.w + Math.sin(t + i) * 12, y = AR.y + AR.h * (1 - ph);
        ctx.globalAlpha = Math.sin(Math.PI * ph) * 0.7; ctx.fillStyle = i % 3 ? '#D9F99D' : '#67E8F9'; ctx.beginPath(); ctx.arc(x, y, 2.5 + (i % 3), 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (m === 'pyramid') {
      ctx.strokeStyle = 'rgba(255,240,200,0.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = 0; i < 16; i++) { const x = AR.x + ((t * 120 + H01(i, 6) * AR.w * 2) % (AR.w + 200)) - 100, y = AR.y + H01(i, 7) * AR.h, l = 30 + 40 * H01(i, 8); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y + 3); ctx.stroke(); }
    } else if (m === 'clouds') {
      for (let i = 0; i < 4; i++) {
        const x = AR.x + ((t * 18 * (1 + i * 0.3) + H01(i, 9) * AR.w * 2) % (AR.w + 400)) - 200, y = AR.y + AR.h * (0.15 + 0.22 * i);
        ctx.fillStyle = 'rgba(30,58,95,0.12)'; ctx.beginPath(); ctx.ellipse(x, y, 160, 60, 0, 0, TAU); ctx.fill();
      }
    }
  },
  // a native's look: its world's wash over its body
  nativeWash(u) { const N = u.native && NATIVES[u.native]; return N ? WASH[N.wash] : null; },
};
Object.assign(TD.prototype, W);

// ---------- the floors (MAP_THEME is the engine's table of map floors) ----------
const stars = (g, S, n, cols) => { for (let i = 0; i < n; i++) { g.beginPath(); g.arc(S.range(0, AR.w), S.range(0, AR.h), S.range(0.6, 2.2), 0, TAU); g.fillStyle = cols[i % cols.length]; g.fill(); } };
const blobs = (g, S, n, rx, ry, cols) => { for (let i = 0; i < n; i++) { g.beginPath(); g.ellipse(S.range(0, AR.w), S.range(0, AR.h), S.range(rx[0], rx[1]), S.range(ry[0], ry[1]), S.range(0, 3), 0, TAU); g.fillStyle = cols[i % cols.length]; g.fill(); } };
const THEMES = {
  rainbow: { floor: '#1B1640', grid: 'rgba(255,255,255,0.03)', mid: 'rgba(160,140,255,0.06)', texture: g => { const S = E.rng(0x5A1B0); for (let i = 0; i < 7; i++) { const x = S.range(0, AR.w), y = S.range(0, AR.h), r = S.range(120, 260), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, ['rgba(139,92,246,0.28)', 'rgba(59,130,246,0.22)', 'rgba(236,72,153,0.2)'][i % 3]); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } stars(g, S, 260, ['#FFFFFF', '#FEF3C7', '#C7D2FE']); } },
  sweets: { floor: '#F7B8CF', grid: 'rgba(255,255,255,0.06)', mid: 'rgba(255,255,255,0.08)', texture: g => { const S = E.rng(0x5EE75); blobs(g, S, 22, [50, 120], [30, 70], ['rgba(255,255,255,0.18)', 'rgba(219,39,119,0.1)']); for (let i = 0; i < 160; i++) { g.save(); g.translate(S.range(0, AR.w), S.range(0, AR.h)); g.rotate(S.range(0, 6)); g.fillStyle = ['#F472B6', '#60A5FA', '#FDE047', '#4ADE80', '#FFFFFF', '#A78BFA'][i % 6]; g.fillRect(-4, -1.3, 8, 2.6); g.restore(); } } },
  shroom: { floor: '#2C5A2A', grid: 'rgba(200,255,200,0.04)', mid: 'rgba(200,255,200,0.06)', texture: g => { const S = E.rng(0x5A700); blobs(g, S, 20, [40, 110], [26, 70], ['rgba(101,163,13,0.16)', 'rgba(0,0,0,0.14)']); for (let i = 0; i < 40; i++) { const x = S.range(0, AR.w), y = S.range(0, AR.h); g.beginPath(); g.arc(x, y, 3.5, 0, TAU); g.fillStyle = S.chance(0.5) ? '#B91C1C' : '#A16207'; g.fill(); g.beginPath(); g.arc(x - 1, y - 1, 1, 0, TAU); g.fillStyle = '#FFFFFF'; g.fill(); } } },
  pyramid: { floor: '#D7AE63', grid: 'rgba(255,255,255,0.04)', mid: 'rgba(255,240,200,0.08)', texture: g => { const S = E.rng(0x9A7A1D); blobs(g, S, 18, [60, 140], [24, 50], ['rgba(255,236,190,0.2)', 'rgba(150,100,40,0.12)']); g.strokeStyle = 'rgba(150,105,45,0.28)'; g.lineWidth = 2.5; for (let i = 0; i < 40; i++) { const x = S.range(0, AR.w), y = S.range(0, AR.h), w = S.range(60, 140); g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(x, y - 14, x + w / 2, y); g.stroke(); } } },
  clouds: { floor: '#6FB8EC', grid: 'rgba(255,255,255,0.05)', mid: 'rgba(255,255,255,0.08)', texture: g => { const S = E.rng(0xC10D5); const gr = g.createLinearGradient(0, 0, 0, AR.h); gr.addColorStop(0, 'rgba(255,255,255,0.15)'); gr.addColorStop(1, 'rgba(30,64,175,0.15)'); g.fillStyle = gr; g.fillRect(0, 0, AR.w, AR.h); for (let i = 0; i < 18; i++) { const x = S.range(0, AR.w), y = S.range(0, AR.h); for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x + S.range(-60, 60), y + S.range(-20, 20), S.range(24, 46), 0, TAU); g.fillStyle = 'rgba(255,255,255,0.32)'; g.fill(); } } } },
  crystal: { floor: '#1A1630', grid: 'rgba(160,140,255,0.04)', mid: 'rgba(120,200,255,0.05)', texture: g => { const S = E.rng(0xC7157A); blobs(g, S, 24, [50, 130], [30, 80], ['rgba(0,0,0,0.25)', 'rgba(76,60,120,0.25)']); stars(g, S, 90, ['rgba(103,232,249,0.7)', 'rgba(240,171,252,0.6)']); } },
};
for (const [k, v] of Object.entries(THEMES)) if (!MAP_THEME[k]) MAP_THEME[k] = v;

module.exports = { WORLDS, NATIVES, NATIVE_K };
