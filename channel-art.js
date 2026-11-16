// Channel art for the Clash family (Rellz, 2026-11-16: "make a consistent pfp and banner for territory clash army clash and
// tower clash ... each should have its own colour but make them similar, no text on pfp but use text on banner and text is
// only channel name, same style and theme just different colours").
// One design for all three: a glossy heraldic shield with a gold rim on a burst of light, the channel's own icon on the shield
// (crossed swords, a tower, a flag on a hex of land), in the videos' flat cartoon style (thick black outlines, Barlow
// Condensed). Only the colour and the icon change. `node channel-art.js` writes out/art/<channel>-pfp.png (800x800) and
// <channel>-banner.png (2560x1440, everything that matters inside YouTube's 1546x423 safe area in the middle).
'use strict';
const fs = require('fs'), path = require('path');
const { createCanvas, registerFont } = require('canvas');
registerFont(path.join(__dirname, 'fonts/BarlowCondensed-ExtraBoldItalic.ttf'), { family: 'Barlow Condensed', weight: '800', style: 'italic' });
const FONT = '"Barlow Condensed", sans-serif', INK = '#06080F', GOLD = '#FFD23F', GOLD_D = '#B8860B', GOLD_L = '#FFF1A8';
const TAU = Math.PI * 2;

const CHANNELS = {
  'army-clash': { name: 'ARMY CLASH', icon: 'swords', c: '#E5383B', l: '#FF8A8C', d: '#7A0E16', bg: '#1A0508' },
  'tower-clash': { name: 'TOWER CLASH', icon: 'tower', c: '#2F7BEA', l: '#8CC0FF', d: '#0B2E6B', bg: '#050B1C' },
  'territory-clash': { name: 'TERRITORY CLASH', icon: 'flag', c: '#1FB36B', l: '#7CEBB0', d: '#085C33', bg: '#03140B' },
};

function rng(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

// the background: the channel colour deepening to near-black, a burst of light rays from (cx, cy), a faint hex pattern and
// sparks, then a vignette
function background(g, W, H, C, cx, cy) {
  const bg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) * 0.6);
  bg.addColorStop(0, C.c); bg.addColorStop(0.45, C.d); bg.addColorStop(1, C.bg);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // rays
  g.save(); g.translate(cx, cy); g.globalCompositeOperation = 'lighter';
  const n = 28, L = Math.hypot(W, H);
  for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = a0 + TAU / n * 0.45; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a0) * L, Math.sin(a0) * L); g.lineTo(Math.cos(a1) * L, Math.sin(a1) * L); g.closePath(); g.fillStyle = rgba(C.l, 0.07); g.fill(); }
  g.restore();
  // hex pattern
  const s = Math.max(W, H) / 22; g.save(); g.lineWidth = Math.max(1.5, s * 0.03); g.strokeStyle = rgba(C.l, 0.07);
  for (let y = -s, r = 0; y < H + s; y += s * 0.866, r++) for (let x = -s + (r % 2) * s * 0.75; x < W + s; x += s * 1.5) {
    g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; g.lineTo(x + Math.cos(a) * s * 0.48, y + Math.sin(a) * s * 0.48); } g.closePath(); g.stroke();
  }
  g.restore();
  // sparks
  const R = rng(7); g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) { const x = R() * W, y = R() * H, r = (0.8 + R() * 2.4) * Math.max(W, H) / 1000; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = R() < 0.5 ? rgba(GOLD, 0.5 * R() + 0.2) : rgba(C.l, 0.5 * R() + 0.2); g.fill(); }
  g.restore();
  // vignette
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
}

// the shield outline, 1 unit = the shield's half width; (0,0) its centre
function shieldPath(g) {
  g.beginPath();
  g.moveTo(-1, -1.05);
  g.quadraticCurveTo(-0.5, -0.88, 0, -1.12); g.quadraticCurveTo(0.5, -0.88, 1, -1.05);
  g.bezierCurveTo(1.02, -0.2, 0.92, 0.55, 0, 1.25);
  g.bezierCurveTo(-0.92, 0.55, -1.02, -0.2, -1, -1.05);
  g.closePath();
}

// the crest: a glow behind, a gold rim, the shield in the channel colour with a bevel and gloss, the icon on it
function crest(g, x, y, S, C) {
  g.save(); g.translate(x, y);
  // glow and drop shadow
  g.save(); g.shadowColor = rgba(C.l, 0.9); g.shadowBlur = S * 0.5; g.scale(S * 1.12, S * 1.12); shieldPath(g); g.fillStyle = INK; g.fill(); g.restore();
  g.save(); g.translate(S * 0.04, S * 0.08); g.scale(S * 1.12, S * 1.12); shieldPath(g); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fill(); g.restore();
  // gold rim
  g.save(); g.scale(S * 1.1, S * 1.1); shieldPath(g); g.restore();
  const gr = g.createLinearGradient(-S, -S, S, S); gr.addColorStop(0, GOLD_L); gr.addColorStop(0.45, GOLD); gr.addColorStop(1, GOLD_D);
  g.fillStyle = gr; g.fill(); g.lineWidth = S * 0.06; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke();
  // the shield face
  g.save(); g.scale(S * 0.96, S * 0.96); shieldPath(g); g.restore();
  const fg = g.createLinearGradient(0, -S, 0, S * 1.2); fg.addColorStop(0, C.l); fg.addColorStop(0.35, C.c); fg.addColorStop(1, C.d);
  g.fillStyle = fg; g.fill(); g.lineWidth = S * 0.045; g.strokeStyle = INK; g.stroke();
  // a darker half (heraldic split) and the gloss
  g.save(); g.scale(S * 0.96, S * 0.96); shieldPath(g); g.restore(); g.save(); g.clip();
  g.beginPath(); g.moveTo(0, -S * 1.3); g.lineTo(S * 1.2, -S * 1.3); g.lineTo(S * 1.2, S * 1.4); g.lineTo(0, S * 1.4); g.closePath(); g.fillStyle = 'rgba(0,0,0,0.16)'; g.fill();
  const gl = g.createLinearGradient(0, -S, 0, -S * 0.1); gl.addColorStop(0, 'rgba(255,255,255,0.45)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  g.beginPath(); g.ellipse(-S * 0.25, -S * 0.75, S * 0.85, S * 0.45, -0.25, 0, TAU); g.fillStyle = gl; g.fill();
  g.restore();
  // studs on the rim
  for (const [sx, sy] of [[-0.82, -0.78], [0.82, -0.78], [0, -0.92], [-0.7, 0.35], [0.7, 0.35]]) { g.beginPath(); g.arc(sx * S * 1.03, sy * S * 1.03 - S * 0.06, S * 0.045, 0, TAU); g.fillStyle = GOLD_L; g.fill(); g.lineWidth = S * 0.015; g.strokeStyle = INK; g.stroke(); }
  // the icon
  g.save(); g.translate(0, S * 0.04); icon(g, C.icon, S * 0.74, C); g.restore();
  g.restore();
}

function icon(g, kind, s, C) {
  const lw = s * 0.07; g.lineJoin = 'round'; g.lineCap = 'round';
  const out = (fill) => { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); };
  if (kind === 'swords') {
    for (const sg of [-1, 1]) {
      g.save(); g.rotate(sg * Math.PI / 4);
      // blade
      g.beginPath(); g.moveTo(-s * 0.09, s * 0.42); g.lineTo(-s * 0.09, -s * 0.85); g.lineTo(0, -s * 1.02); g.lineTo(s * 0.09, -s * 0.85); g.lineTo(s * 0.09, s * 0.42); g.closePath();
      const bl = g.createLinearGradient(-s * 0.1, 0, s * 0.1, 0); bl.addColorStop(0, '#FFFFFF'); bl.addColorStop(0.5, '#DCE3EC'); bl.addColorStop(1, '#9AA6B6'); out(bl);
      g.beginPath(); g.moveTo(0, s * 0.38); g.lineTo(0, -s * 0.86); g.lineWidth = s * 0.02; g.strokeStyle = 'rgba(0,0,0,0.25)'; g.stroke();
      // guard, grip, pommel
      g.beginPath(); g.rect(-s * 0.3, s * 0.42, s * 0.6, s * 0.12); out(GOLD);
      g.beginPath(); g.rect(-s * 0.07, s * 0.54, s * 0.14, s * 0.32); out('#5B3A1E');
      g.beginPath(); g.arc(0, s * 0.92, s * 0.1, 0, TAU); out(GOLD);
      g.restore();
    }
  } else if (kind === 'tower') {
    g.save(); g.translate(0, s * 0.62);
    g.beginPath(); g.moveTo(-s * 0.48, 0); g.lineTo(-s * 0.4, -s * 0.95); g.lineTo(s * 0.4, -s * 0.95); g.lineTo(s * 0.48, 0); g.closePath();
    const st = g.createLinearGradient(-s * 0.5, 0, s * 0.5, 0); st.addColorStop(0, '#D7DDE7'); st.addColorStop(1, '#8C95A8'); out(st);
    g.save(); g.clip(); g.lineWidth = s * 0.025; g.strokeStyle = 'rgba(40,46,60,0.5)';
    for (let r = 1; r < 6; r++) { const yy = -r * s * 0.17; g.beginPath(); g.moveTo(-s * 0.6, yy); g.lineTo(s * 0.6, yy); g.stroke(); for (let c = -2; c <= 2; c++) { const xx = c * s * 0.22 + (r % 2 ? s * 0.11 : 0); g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + s * 0.17); g.stroke(); } }
    g.restore();
    g.beginPath(); g.rect(-s * 0.56, -s * 1.12, s * 1.12, s * 0.2); out('#E3E8EF');
    for (let k = 0; k < 4; k++) { g.beginPath(); g.rect(-s * 0.56 + k * s * 0.32, -s * 1.3, s * 0.16, s * 0.2); out('#E3E8EF'); }
    // gate glowing, arrow slit
    g.beginPath(); g.moveTo(-s * 0.15, 0); g.lineTo(-s * 0.15, -s * 0.24); g.arc(0, -s * 0.24, s * 0.15, Math.PI, 0); g.lineTo(s * 0.15, 0); g.closePath(); out('#FF9A2E');
    g.beginPath(); g.rect(-s * 0.04, -s * 0.72, s * 0.08, s * 0.22); out(INK);
    // flag
    g.beginPath(); g.moveTo(0, -s * 1.3); g.lineTo(0, -s * 1.62); g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.moveTo(0, -s * 1.62); g.quadraticCurveTo(s * 0.2, -s * 1.66, s * 0.36, -s * 1.55); g.lineTo(0, -s * 1.44); g.closePath(); out(GOLD);
    g.restore();
  } else if (kind === 'flag') {
    // a hex of land, split in two territories, with a flag planted in it
    g.save(); g.translate(0, s * 0.45);
    g.scale(1, 0.62);
    g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.PI / 6; g.lineTo(Math.cos(a) * s * 0.78, Math.sin(a) * s * 0.78); } g.closePath();
    out('#7BC86A');
    g.save(); g.clip(); g.beginPath(); g.moveTo(0, -s); g.lineTo(s, -s); g.lineTo(s, s); g.lineTo(-s * 0.2, s); g.closePath(); g.fillStyle = '#4E9E45'; g.fill();
    g.beginPath(); g.moveTo(0, -s); g.lineTo(-s * 0.2, s); g.lineWidth = lw * 0.8; g.setLineDash([s * 0.08, s * 0.07]); g.strokeStyle = INK; g.stroke(); g.setLineDash([]); g.restore();
    g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.PI / 6; g.lineTo(Math.cos(a) * s * 0.78, Math.sin(a) * s * 0.78); } g.closePath(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
    g.restore();
    // the pole and the waving flag
    g.save(); g.translate(-s * 0.05, s * 0.45);
    g.beginPath(); g.rect(-s * 0.045, -s * 1.45, s * 0.09, s * 1.45); out('#6B4423');
    g.beginPath(); g.arc(0, -s * 1.47, s * 0.08, 0, TAU); out(GOLD);
    g.beginPath(); g.moveTo(s * 0.045, -s * 1.38); g.bezierCurveTo(s * 0.35, -s * 1.52, s * 0.5, -s * 1.22, s * 0.8, -s * 1.3); g.lineTo(s * 0.8, -s * 0.84); g.bezierCurveTo(s * 0.5, -s * 0.76, s * 0.35, -s * 1.06, s * 0.045, -s * 0.92); g.closePath();
    out(GOLD);
    g.beginPath(); g.arc(s * 0.42, -s * 1.1, s * 0.11, 0, TAU); g.fillStyle = C.d; g.fill();
    g.restore();
  }
}

function pfp(C) {
  const W = 800, cv = createCanvas(W, W), g = cv.getContext('2d');
  background(g, W, W, C, W / 2, W / 2);
  crest(g, W / 2, W / 2 - 18, 230, C);
  return cv;
}

function banner(C) {
  const W = 2560, H = 1440, cv = createCanvas(W, H), g = cv.getContext('2d');
  const SX = (W - 1546) / 2, SY = (H - 423) / 2;   // YouTube's safe area: 1546 x 423 in the middle
  background(g, W, H, C, W / 2, H / 2);
  // the crest on the left of the safe area, the name beside it
  const S = 150, cx = SX + 170, cy = H / 2 - 8;
  g.font = `italic 800 10px ${FONT}`;
  // name: as big as fits in the rest of the safe area
  const tx0 = cx + S * 1.35, maxW = SX + 1546 - 30 - tx0;
  // (one size for all three channels: the size the longest name fits at)
  const longest = Object.values(CHANNELS).map(c => c.name).sort((a, b) => b.length - a.length)[0];
  let fz = 240; g.font = `italic 800 ${fz}px ${FONT}`; while (g.measureText(longest).width > maxW && fz > 80) { fz -= 4; g.font = `italic 800 ${fz}px ${FONT}`; }
  const tw = g.measureText(C.name).width, ty = H / 2 + fz * 0.34;
  // centre the crest + name group in the safe area
  const groupW = (tx0 - (cx - S * 1.15)) + tw, shift = (1546 - groupW) / 2 - ((cx - S * 1.15) - SX);
  g.save(); g.translate(shift, 0);
  crest(g, cx, cy, S, C);
  g.save(); g.translate(tx0, ty); g.transform(1, 0, -0.0, 1, 0, 0);
  g.lineJoin = 'round'; g.textBaseline = 'alphabetic';
  // a deep 3D edge, the outline, then the face with a light-to-colour gradient
  for (let k = 10; k >= 1; k--) { g.fillStyle = k > 6 ? INK : C.d; g.fillText(C.name, k * 1.6, k * 2.2); }
  g.lineWidth = fz * 0.12; g.strokeStyle = INK; g.strokeText(C.name, 0, 0);
  const tg = g.createLinearGradient(0, -fz * 0.8, 0, 0); tg.addColorStop(0, '#FFFFFF'); tg.addColorStop(0.55, '#FFFFFF'); tg.addColorStop(0.56, C.l); tg.addColorStop(1, C.l);
  g.fillStyle = tg; g.fillText(C.name, 0, 0);
  // a gold bar under the name
  g.beginPath(); g.moveTo(4, fz * 0.16); g.lineTo(tw - 10, fz * 0.16); g.lineTo(tw - 34, fz * 0.3); g.lineTo(-20, fz * 0.3); g.closePath();
  g.fillStyle = GOLD; g.fill(); g.lineWidth = fz * 0.045; g.strokeStyle = INK; g.stroke();
  g.restore(); g.restore();
  return cv;
}

if (require.main === module) {
  const dir = path.join(__dirname, 'out', 'art'); fs.mkdirSync(dir, { recursive: true });
  for (const [key, C] of Object.entries(CHANNELS)) {
    fs.writeFileSync(path.join(dir, `${key}-pfp.png`), pfp(C).toBuffer('image/png'));
    fs.writeFileSync(path.join(dir, `${key}-banner.png`), banner(C).toBuffer('image/png'));
  }
  console.log(`channel art in ${dir}`);
}
module.exports = { CHANNELS, pfp, banner, crest };
