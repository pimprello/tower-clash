// faceoff.js: the electric face-off intro, shared by Army Clash and Tower Clash (the same file in both repos).
// Rellz (2026-11-15): "add the better intro which is like a face off animated with electricity ... do the same for army clash".
// The two sides slam in from opposite edges (top and bottom halves of the Short, each in its team colour with its hero in a
// big ring), a lightning seam strikes down the split between them, VS slams onto it, arcs crackle round both rings and sparks
// fly off the seam, then a white flash opens onto the battle's first frame. Looks and sound only: it never touches a battle.
// Its own dice (a hash of the seed and the frame), never the battle's.
'use strict';
const { createCanvas } = require('canvas');

const FONT = '"Barlow Condensed", "DejaVu Sans", sans-serif';
const font = (size, weight = 800, italic = true) => `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT}`;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeOutCubic = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeOutBack = t => { t = clamp(t, 0, 1); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const TAU = Math.PI * 2;
function rng(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

function textOut(ctx, s, x, y, fill, stroke, lw, maxW) {
  ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = stroke;
  if (maxW) { ctx.strokeText(s, x, y, maxW); ctx.fillStyle = fill; ctx.fillText(s, x, y, maxW); }
  else { ctx.strokeText(s, x, y); ctx.fillStyle = fill; ctx.fillText(s, x, y); }
}
function fitFont(ctx, s, size, maxW, min = 24) { ctx.font = font(size); while (size > min && ctx.measureText(s).width > maxW) { size -= 2; ctx.font = font(size); } return size; }

// a jagged bolt from (x1,y1) to (x2,y2) by midpoint displacement; returns the points
function boltPts(R, x1, y1, x2, y2, disp, depth) {
  let pts = [[x1, y1], [x2, y2]];
  for (let d = 0; d < depth; d++) {
    const nx = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], len = Math.hypot(bx - ax, by - ay) || 1;
      const off = (R() - 0.5) * disp * len / 220, mx = (ax + bx) / 2 - (by - ay) / len * off, my = (ay + by) / 2 + (bx - ax) / len * off;
      nx.push([mx, my], [bx, by]);
    }
    pts = nx; disp *= 0.55;
  }
  return pts;
}
// three passes: a wide coloured glow, a bright body and a white-hot core
function strokeBolt(ctx, pts, col, w, a = 1) {
  const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); };
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter';
  path(); ctx.strokeStyle = rgba(col, 0.22 * a); ctx.lineWidth = w * 5; ctx.stroke();
  path(); ctx.strokeStyle = rgba(col, 0.55 * a); ctx.lineWidth = w * 2.2; ctx.stroke();
  path(); ctx.strokeStyle = `rgba(255,255,255,${0.95 * a})`; ctx.lineWidth = w * 0.8; ctx.stroke();
  ctx.restore();
}

// draw one hero into a square canvas once (drawing a shiny portrait every frame would be slow)
function portraitCanvas(drawFn, r, RS) {
  const cv = createCanvas(Math.ceil(r * 2 * RS), Math.ceil(r * 2 * RS)), c = cv.getContext('2d');
  c.scale(RS, RS); c.translate(r, r);
  try { drawFn(c, r); } catch (e) { /* no portrait */ }
  return cv;
}

// o: { W, H, RS, seed, dur, title, question, tag, sides: [{ col: {c,l,d}, name, sub, count, portrait (canvas) }, x2],
//      bg (battle's first frame, W x H), battle0 (battle's first frame at full resolution, for the flash into it) }
// ctx has no transform applied (device pixels); t is seconds into the intro
function drawFaceoff(ctx, t, o) {
  const { W, H, RS } = o, dur = o.dur;
  const R = rng((o.seed ^ Math.floor(t * 30) * 2654435761) >>> 0);   // the arcs change every other frame
  const hit = 0.42;                                                    // the seam strikes and VS slams here
  const kIn = easeOutCubic(t / 0.42), shake = t > hit ? Math.max(0, 1 - (t - hit) / 0.5) : 0;
  ctx.save(); ctx.setTransform(RS, 0, 0, RS, 0, 0);
  if (shake) ctx.translate((R() - 0.5) * 26 * shake, (R() - 0.5) * 26 * shake);
  const zoom = 1 + 0.03 * clamp((t - hit) / (dur - hit), 0, 1);
  ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);

  // 1) the battlefield behind, dark
  ctx.fillStyle = '#05070D'; ctx.fillRect(-60, -60, W + 120, H + 120);
  if (o.bg) { ctx.globalAlpha = 0.35; ctx.drawImage(o.bg, 0, 0, W, H); ctx.globalAlpha = 1; }

  // the bands: two sides split by one slanted seam through the middle, or three split by two seams (a 1v1v1)
  const N = o.sides.length >= 3 ? 3 : 2, slant = N === 3 ? 90 : 150;
  const seams = N === 3 ? [595, 1030].map(m => [m - slant / 2, m + slant / 2]) : [[800 - slant / 2, 800 + slant / 2]];
  const BIG = N === 2;
  const lay = N === 2
    ? [{ cx: W * 0.36, cy: 520, r: 175 }, { cx: W * 0.64, cy: 1080, r: 175 }]
    : [{ cx: W * 0.3, cy: 380, r: 132 }, { cx: W * 0.7, cy: 810, r: 132 }, { cx: W * 0.3, cy: 1250, r: 132 }];
  const band = (side, idx, dx) => {
    ctx.save(); ctx.translate(dx, 0);
    const top = idx === 0 ? [[-60, -60], [W + 60, -60]] : [[-60, seams[idx - 1][0]], [W + 60, seams[idx - 1][1]]];
    const bot = idx === N - 1 ? [[W + 60, H + 60], [-60, H + 60]] : [[W + 60, seams[idx][1]], [-60, seams[idx][0]]];
    ctx.beginPath(); [...top, ...bot].forEach(([x, y], n) => (n ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    const y0 = top[0][1], y1 = bot[1][1], up = idx === 0;
    const g = ctx.createLinearGradient(0, up ? Math.max(0, y0) : Math.min(H, y1), 0, up ? y1 : y0);
    g.addColorStop(0, rgba(side.col.d, 0.97)); g.addColorStop(0.7, rgba(side.col.c, 0.93)); g.addColorStop(1, rgba(side.col.l, 0.95));
    ctx.fillStyle = g; ctx.fill();
    // speed lines across the band
    ctx.save(); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    const L = rng(11 + idx * 12), dir = idx % 2 ? -1 : 1;
    for (let i = 0; i < 22; i++) {
      const y = Math.max(-60, y0) + L() * (Math.min(H, y1) - Math.max(-60, y0) + 40), w = 120 + L() * 420, sp = (300 + L() * 900) * dir;
      const x = (((L() * W + sp * t) % (W + w)) + W + w) % (W + w) - w;
      ctx.fillStyle = `rgba(255,255,255,${0.04 + L() * 0.07})`; ctx.fillRect(x, y, w, 3 + L() * 5);
    }
    ctx.restore();
    // the hero in a ring, with a gloss like the troops' shine
    const { cx, cy, r } = lay[idx];
    ctx.save(); ctx.shadowColor = side.col.l; ctx.shadowBlur = r * 0.3; ctx.beginPath(); ctx.arc(cx, cy, r + 14, 0, TAU); ctx.fillStyle = '#0B0F1A'; ctx.fill(); ctx.restore();
    const rg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    rg.addColorStop(0, side.col.l); rg.addColorStop(0.6, side.col.c); rg.addColorStop(1, side.col.d);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = rg; ctx.fill();
    if (side.portrait) { ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 6, 0, TAU); ctx.clip(); ctx.drawImage(side.portrait, cx - r, cy - r, r * 2, r * 2); ctx.restore(); }
    const gl = ctx.createLinearGradient(cx, cy - r, cx, cy);
    gl.addColorStop(0, 'rgba(255,255,255,0.32)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx - r * 0.12, cy - r * 0.5, r * 0.72, r * 0.38, -0.25, 0, TAU); ctx.fillStyle = gl; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.lineWidth = 14; ctx.strokeStyle = '#0B0F1A'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r - 12, 0, TAU); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (BIG) {
      // name above the ring for the top side, below it for the bottom side (both away from the seam); the count beside it
      const ny = up ? cy - r - 92 : cy + r + 70;
      const fz = fitFont(ctx, side.name, 76, W - 140, 36); textOut(ctx, side.name, W / 2, ny, '#FFFFFF', '#0B0F1A', 14);
      if (side.sub) { fitFont(ctx, side.sub, 44, W - 220, 24); textOut(ctx, side.sub, W / 2, ny + fz * 0.8, side.col.l, '#0B0F1A', 9); }
      if (side.count) { const qx = up ? cx + r + 170 : cx - r - 170; fitFont(ctx, side.count, 76, 300, 30); textOut(ctx, side.count, qx, cy + (up ? 40 : -40), '#FFD23F', '#0B0F1A', 13, 310); }
    } else {
      // three sides: name, line and count beside the ring, in the other half of the band
      const tx = cx < W / 2 ? W * 0.69 : W * 0.31, mw = W * 0.5;
      const fz = fitFont(ctx, side.name, 62, mw, 30); textOut(ctx, side.name, tx, cy - 34, '#FFFFFF', '#0B0F1A', 12);
      if (side.sub) { fitFont(ctx, side.sub, 38, mw, 22); textOut(ctx, side.sub, tx, cy - 34 + fz * 0.8, side.col.l, '#0B0F1A', 8); }
      if (side.count) { fitFont(ctx, side.count, 60, mw, 28); textOut(ctx, side.count, tx, cy + 70, '#FFD23F', '#0B0F1A', 11); }
    }
    ctx.restore();
    return { cx: cx + dx, cy, r };
  };
  const rings = o.sides.slice(0, N).map((sd, n) => band(sd, n, (n % 2 ? 1 : -1) * (1 - kIn) * (W + 200)));

  // 2) electricity: the seams, branches, arcs round each ring, sparks
  if (t > hit - 0.04) {
    const k = clamp((t - hit) / 0.08, 0, 1);
    seams.forEach(([yL, yR], si) => {
      const fl = 0.75 + 0.25 * R(), seam = boltPts(R, -40, yL, W + 40, yR, 90, 6);
      strokeBolt(ctx, seam, '#9BE7FF', BIG ? 7 : 5.5, k * fl);
      // a second, thinner seam that flickers
      if (R() < 0.7) strokeBolt(ctx, boltPts(R, -40, yL + (R() - 0.5) * 20, W + 40, yR + (R() - 0.5) * 20, 120, 6), '#C9B6FF', 3, k * 0.8);
      // branches off the seam into the bands either side
      for (let i = 0; i < (BIG ? 4 : 3); i++) {
        const p = seam[1 + Math.floor(R() * (seam.length - 2))], up = R() < 0.5, len = 80 + R() * (BIG ? 220 : 150);
        const ex = p[0] + (R() - 0.5) * len, ey = p[1] + (up ? -1 : 1) * len * (0.6 + R() * 0.6);
        strokeBolt(ctx, boltPts(R, p[0], p[1], ex, ey, 70, 4), (up ? o.sides[si] : o.sides[si + 1]).col.l, 2.6, k * 0.9);
      }
    });
    // arcs crawling round every ring in its team colour
    rings.forEach((rg, n) => {
      for (let i = 0; i < 3; i++) {
        const a0 = R() * TAU, a1 = a0 + 0.5 + R() * 0.9, rr = rg.r + 10;
        const pts = []; for (let s = 0; s <= 10; s++) { const a = a0 + (a1 - a0) * s / 10, j = (R() - 0.5) * 26; pts.push([rg.cx + Math.cos(a) * (rr + j), rg.cy + Math.sin(a) * (rr + j)]); }
        strokeBolt(ctx, pts, o.sides[n].col.l, 2.4, k * (0.6 + 0.4 * R()));
      }
    });
    // the strike's flash
    const fk = 1 - (t - hit) / 0.18;
    if (fk > 0) { ctx.fillStyle = `rgba(230,245,255,${0.7 * fk})`; ctx.fillRect(-60, -60, W + 120, H + 120); }
    // sparks flying off the seams (a fixed set, moving with time, so they fly smoothly)
    const S = rng((o.seed >>> 0) + 97); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 70; i++) {
      const born = hit + S() * (dur - hit), age = t - born, life = 0.35 + S() * 0.4, fx = S() * W, ang = S() * TAU, sp = 250 + S() * 650, si = Math.floor(S() * seams.length), col = S() < 0.5 ? o.sides[si].col.l : '#FFFFFF';
      if (age < 0 || age > life) continue;
      const [yL, yR] = seams[si], fy = yL + (yR - yL) * fx / W, x = fx + Math.cos(ang) * sp * age, y = fy + Math.sin(ang) * sp * age + 500 * age * age, a = 1 - age / life;
      ctx.strokeStyle = rgba(col, a); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * 22 * a, y - (Math.sin(ang) * 22 + 20 * age) * a); ctx.stroke();
    }
    ctx.restore();
  }

  // 3) VS slams onto the seam
  if (t > hit) seams.forEach(([yL, yR], si) => {
    const k = easeOutBack((t - hit - si * 0.1) / 0.32), s = (2.6 - 1.6 * k) * (BIG ? 1 : 0.72);
    if (k <= 0) return;
    ctx.save(); ctx.translate(W / 2, (yL + yR) / 2); ctx.rotate(Math.atan2(yR - yL, W)); ctx.scale(s, s); ctx.globalAlpha = clamp((t - hit) / 0.08, 0, 1);
    ctx.beginPath(); for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, rr = i % 2 ? 92 : 132; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath();
    ctx.fillStyle = '#FFD23F'; ctx.fill(); ctx.lineWidth = 12; ctx.lineJoin = 'miter'; ctx.strokeStyle = '#0B0F1A'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 86, 0, TAU); ctx.fillStyle = '#B91C1C'; ctx.fill(); ctx.lineWidth = 8; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(118); textOut(ctx, 'VS', 0, 6, '#FFFFFF', '#0B0F1A', 16);
    ctx.restore();
  });

  // 4) the logo at the top and the question at the bottom
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (o.title) { const k = easeOutBack((t - 0.15) / 0.35); if (k > 0) { ctx.save(); ctx.translate(W / 2, o.titleY || 222); ctx.scale(k, k); ctx.rotate(-0.03); ctx.font = font(92); textOut(ctx, o.title, 0, 0, '#FFFFFF', '#0B0F1A', 16); ctx.restore(); } }
  if (o.tag) { const k = easeOutBack((t - 0.3) / 0.35); if (k > 0) { ctx.save(); ctx.translate(W / 2, (o.titleY || 222) + 64); ctx.scale(k, k); fitFont(ctx, o.tag, 40, W - 260); textOut(ctx, o.tag, 0, 0, '#FFD23F', '#0B0F1A', 9); ctx.restore(); } }
  if (o.question) { const k = easeOutBack((t - hit - 0.25) / 0.35); if (k > 0) { ctx.save(); ctx.translate(W / 2, 1480); ctx.scale(k, k); ctx.rotate(-0.04); fitFont(ctx, o.question, 84, W - 240); textOut(ctx, o.question, 0, 0, '#FFD23F', '#0B0F1A', 18); ctx.restore(); } }
  ctx.restore();

  // 5) the last 0.35 s: a white flash that opens onto the battle's first frame
  const out = (t - (dur - 0.35)) / 0.35;
  if (out > 0 && o.battle0) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = easeOutCubic(Math.min(1, out)); ctx.drawImage(o.battle0, 0, 0);
    ctx.globalAlpha = Math.max(0, 0.6 * (1 - Math.abs(out - 0.3) / 0.3)); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W * RS, H * RS);
    ctx.restore();
  }
}

// the intro's sounds, on the battle's synth: a whoosh as the sides fly in, thunder and a boom as the seam strikes, crackles after
function faceoffSounds(synth, dur, at = 0) {
  synth.play({ type: 'whoosh' }, at + 0.02);
  synth.play({ type: 'thunder' }, at + 0.40);
  synth.play({ type: 'boom', gain: 0.8 }, at + 0.42);
  for (const s of [0.75, 1.15, 1.6, 2.0]) if (s < dur - 0.4) synth.play({ type: 'zap' }, at + s);
  synth.play({ type: 'whoosh' }, at + Math.max(0, dur - 0.4));
}

module.exports = { drawFaceoff, faceoffSounds, portraitCanvas };
