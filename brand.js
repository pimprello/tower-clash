// Tower Clash branding: the logo, the tower icon and the channel art (profile picture and banner), all drawn in the same flat
// cartoon style as the videos (black outlines, Barlow Condensed). Used by the thumbnails and by `node brand.js` (channel art).
'use strict';
const path = require('path');

const RED = '#E0263C', RED_D = '#8C0F1F', RED_L = '#FFB3BC', GOLD = '#FFD23F', INK = '#04060B', WHITE = '#F4F6FB';
const STONE = '#8C95A8', STONE_D = '#5A6276', STONE_L = '#C3CAD8';
const FONT = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif';
const font = (size, weight = 800, italic = true) => `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT}`;

function outlineText(g, text, x, y, fill, stroke, lw) {
  g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(text, x, y); g.fillStyle = fill; g.fillText(text, x, y);
}

// the tower icon, front view: a stone tower with battlements, a glowing gate, an arrow slit and a red flag. (x, y) = the
// middle of its base; s = scale (1 = about 300 px tall).
function drawTowerIcon(g, x, y, s = 1, o = {}) {
  const flag = o.flag || RED, glow = o.glow || '#FF8A1F', t = o.t || 0;
  g.save(); g.translate(x, y); g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round';
  // ground shadow
  g.beginPath(); g.ellipse(0, 4, 120, 18, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill();
  // body (slightly tapered)
  g.beginPath(); g.moveTo(-82, 0); g.lineTo(-70, -200); g.lineTo(70, -200); g.lineTo(82, 0); g.closePath();
  g.fillStyle = STONE; g.fill();
  // stone courses
  g.save(); g.clip();
  g.strokeStyle = STONE_D; g.lineWidth = 4;
  for (let r = 0; r < 7; r++) {
    const yy = -r * 30; g.beginPath(); g.moveTo(-90, yy); g.lineTo(90, yy); g.stroke();
    for (let c = -3; c <= 3; c++) { const xx = c * 40 + (r % 2 ? 20 : 0); g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy - 30); g.stroke(); }
  }
  // light from the top left
  g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(-90, -210, 46, 220);
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(44, -210, 46, 220);
  g.restore();
  g.beginPath(); g.moveTo(-82, 0); g.lineTo(-70, -200); g.lineTo(70, -200); g.lineTo(82, 0); g.closePath();
  g.lineWidth = 8; g.strokeStyle = INK; g.stroke();
  // parapet and battlements
  g.beginPath(); g.rect(-96, -232, 192, 36); g.fillStyle = STONE_L; g.fill(); g.lineWidth = 8; g.stroke();
  for (let k = 0; k < 4; k++) { const mx = -96 + k * 56; g.beginPath(); g.rect(mx, -270, 24, 40); g.fillStyle = STONE_L; g.fill(); g.lineWidth = 7; g.stroke(); }
  g.beginPath(); g.rect(-96, -232, 192, 8); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
  // arched gate with a warm glow inside
  const gl = g.createRadialGradient(0, -40, 4, 0, -40, 70); gl.addColorStop(0, '#FFF1B8'); gl.addColorStop(0.45, glow); gl.addColorStop(1, '#7A1608');
  g.beginPath(); g.moveTo(-34, 0); g.lineTo(-34, -60); g.arc(0, -60, 34, Math.PI, 0); g.lineTo(34, 0); g.closePath();
  g.fillStyle = gl; g.fill(); g.lineWidth = 7; g.strokeStyle = INK; g.stroke();
  g.strokeStyle = 'rgba(40,10,4,0.55)'; g.lineWidth = 4;
  for (const gx of [-17, 0, 17]) { g.beginPath(); g.moveTo(gx, -2); g.lineTo(gx, gx ? -82 : -92); g.stroke(); }
  // arrow slit
  g.beginPath(); g.rect(-7, -165, 14, 46); g.fillStyle = '#20141A'; g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
  // the flag
  g.lineWidth = 8; g.strokeStyle = INK; g.beginPath(); g.moveTo(40, -270); g.lineTo(40, -370); g.stroke();
  g.lineWidth = 4; g.strokeStyle = '#D9B26F'; g.beginPath(); g.moveTo(40, -272); g.lineTo(40, -368); g.stroke();
  const w = Math.sin(t * 5) * 6;
  g.beginPath(); g.moveTo(42, -366); g.quadraticCurveTo(80, -376 + w, 118, -360); g.lineTo(104, -340); g.lineTo(118, -318); g.quadraticCurveTo(80, -330 - w, 42, -322); g.closePath();
  g.fillStyle = flag; g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.moveTo(46, -360); g.quadraticCurveTo(78, -368 + w, 106, -356); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.45)'; g.stroke();
  g.restore();
}

// the TOWER CLASH word mark: "TOWER" in white over "CLASH" in red with a gold edge. (x, y) = centre; s = scale (1 = 130 px letters)
function drawLogo(g, x, y, s = 1, o = {}) {
  g.save(); g.translate(x, y); g.scale(s, s); g.textAlign = 'center'; g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = '4px';
  const one = o.oneLine;
  g.font = font(130, 800);
  if (one) {
    const a = 'TOWER ', b = 'CLASH', wa = g.measureText(a).width, wb = g.measureText(b).width, x0 = -(wa + wb) / 2;
    g.textAlign = 'left';
    outlineText(g, a, x0, 0, WHITE, INK, 18);
    outlineText(g, b, x0 + wa, 0, o.red || RED, INK, 18);
    g.fillStyle = 'rgba(255,255,255,0.0)';
  } else {
    outlineText(g, 'TOWER', 0, -64, WHITE, INK, 18);
    outlineText(g, 'CLASH', 0, 62, o.red || RED, INK, 18);
    g.lineWidth = 4; g.strokeStyle = GOLD; g.strokeText('CLASH', 0, 62);
  }
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.restore();
}

// soft rays behind an icon
function rays(g, x, y, r, n, col) {
  g.save(); g.translate(x, y); g.fillStyle = col;
  for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, a, a + Math.PI / n * 0.9); g.closePath(); g.fill(); }
  g.restore();
}

// ----- channel art (node brand.js): out/profile.png (1024x1024) and out/banner.png (2560x1440), in the Army Clash style
// (a soft red ray-burst background, troops drawn from above with their shine) -----
async function channelArt(outDir) {
  const { createCanvas, registerFont } = require('canvas');
  registerFont(path.join(__dirname, 'fonts/BarlowCondensed-ExtraBoldItalic.ttf'), { family: 'Barlow Condensed', weight: '800', style: 'italic' });
  registerFont(path.join(__dirname, 'fonts/BarlowCondensed-Bold.ttf'), { family: 'Barlow Condensed', weight: '700', style: 'normal' });
  const RVB = require('./engine.js');
  RVB.makeCanvas = (w, h) => createCanvas(w, h);
  RVB.setTeams('GOLD', 'PURPLE');
  const game = new RVB.Army(7, { map: 'open', target: 30, shine: { on: true, gloss: 1, rim: 1 }, anim: true, art: 2 });
  const fs = require('fs');
  fs.mkdirSync(outDir, { recursive: true });
  // the background: a soft violet gradient with pale rays from the centre (Army Clash uses sky blue; Tower Clash is violet)
  const burst = (g, W, H, cx, cy) => {
    const lg = g.createLinearGradient(0, 0, W * 0.3, H); lg.addColorStop(0, '#8B6CF0'); lg.addColorStop(0.55, '#A58BF5'); lg.addColorStop(1, '#C9B8FB');
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    rays(g, cx, cy, Math.hypot(W, H), 36, 'rgba(255,255,255,0.13)');
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7); rg.addColorStop(0, 'rgba(255,255,255,0.14)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
  };
  // a troop drawn so its body is about `size` px across, whatever its real size
  const portrait = (g, type, team, x, y, size, rot) => { const s = size / 2 / RVB.UNIT[type].r; g.save(); g.translate(x, y); g.scale(s, s); g.rotate(rot || 0); game.drawPortrait(g, type, team); g.restore(); };
  // profile picture: one shiny troop, big, in the middle
  {
    const S = 1024, c = createCanvas(S, S), g = c.getContext('2d');
    burst(g, S, S, S / 2, S / 2);
    portrait(g, 'siegegolem', 1, S / 2, S / 2 + 10, 540, 0.45);
    fs.writeFileSync(path.join(outDir, 'profile.png'), c.toBuffer('image/png'));
  }
  // banner: six Tower Clash troops evenly spaced across, faded, with the name over the middle (as on Army Clash's banner)
  {
    const W = 2560, H = 1440, c = createCanvas(W, H), g = c.getContext('2d');
    burst(g, W, H, W / 2, H / 2);
    const row = [['siegegolem', 0, 0.4, 250], ['longbow', 1, -0.7, 230], ['magmacolossus', 0, -0.5, 250], ['frostwitch', 1, 0.6, 210], ['spiderqueen', 0, 0.5, 240], ['ironhorn', 1, -0.6, 250]];
    const gap = W / row.length;
    row.forEach(([k, tm, r, size], i) => { g.save(); g.globalAlpha = 0.55; portrait(g, k, tm, gap * (i + 0.5), H / 2 - 10, size, r); g.restore(); });
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(190, 800); if ('letterSpacing' in g) g.letterSpacing = '4px';
    g.shadowColor = 'rgba(30,10,60,0.35)'; g.shadowBlur = 30; g.shadowOffsetY = 10;
    outlineText(g, 'TOWER CLASH', W / 2, H / 2, WHITE, INK, 26);
    g.shadowColor = 'transparent';
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    fs.writeFileSync(path.join(outDir, 'banner.png'), c.toBuffer('image/png'));
  }
}

if (require.main === module) channelArt(path.join(__dirname, 'out')).then(() => console.log('Channel art: out/profile.png and out/banner.png'));
module.exports = { drawTowerIcon, drawLogo, rays, RED, RED_D, RED_L, GOLD, INK, WHITE };
