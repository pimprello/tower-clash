// The cliffhanger ending (Rellz, 2026-11-21, all three games: "instead of fully ending and saying game over just end at the cliff
// hanger and say subscribe instead of game over or the end"). The same file in Army Clash, Tower Clash and Territory Clash.
//
// A Short no longer shows who wins. Right before the deciding moment (the final blow, which the game already knows from the copy it
// played through for the thumbnail) the picture freezes with a flash and a jolt, drains of colour and darkens, slowly pushing in;
// WHO WINS?! slams in, SUBSCRIBE TO SEE THE ENDING comes up under it, and a red SUBSCRIBE button pulses until a hand taps it: it
// turns into SUBSCRIBED with a ringing bell. Then the video ends on that.
//
//   const C = new Cliff({ W, H, RS, fps, seed, question, cta, font });
//   C.frame(ctx, j, still)   // j = 0 .. C.n - 1; still = a canvas holding the frozen frame (full size, W*RS x H*RS)
//   C.sounds(synth, at)       // its sounds, at video time `at`
'use strict';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOutBack = t => { const c = 1.7; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; };
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

class Cliff {
  constructor(o) {
    this.W = o.W; this.H = o.H; this.RS = o.RS || 1; this.fps = o.fps || 60;
    this.seconds = o.seconds || 3.4; this.n = Math.round(this.seconds * this.fps);
    this.question = o.question || 'WHO WINS?!';
    this.cta = o.cta || ['SUBSCRIBE', 'TO SEE THE ENDING'];
    this.fontFn = o.font || ((s, w = 800) => `italic ${w} ${s}px "Barlow Condensed", "Arial Black", sans-serif`);
    this.tapAt = o.tapAt || 2.05;
    this.seed = o.seed >>> 0;
  }
  text(ctx, s, x, y, size, fill, stroke, lw) {
    ctx.font = this.fontFn(size); ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.strokeText(s, x, y); ctx.fillStyle = fill; ctx.fillText(s, x, y);
  }
  frame(ctx, j, still) {
    const W = this.W, H = this.H, RS = this.RS, t = j / this.fps, P = W * RS, Q = H * RS;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    // the frozen picture: a jolt, then a slow push in; colour drains and it darkens
    const jolt = Math.exp(-t * 14) * Math.sin(t * 70) * 10 * RS, z = 1 + 0.07 * easeOutCubic(clamp(t / this.seconds, 0, 1)) + 0.03 * Math.exp(-t * 10);
    ctx.fillStyle = '#05070D'; ctx.fillRect(0, 0, P, Q);
    if (still) ctx.drawImage(still, (P - P * z) / 2 + jolt, (Q - Q * z) / 2, P * z, Q * z);
    const drain = clamp(t / 0.5, 0, 1);
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(128,128,128,${0.85 * drain})`; ctx.fillRect(0, 0, P, Q);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(5,7,13,${0.38 * drain})`; ctx.fillRect(0, 0, P, Q);
    const vg = ctx.createRadialGradient(P / 2, Q / 2, Q * 0.2, P / 2, Q / 2, Q * 0.65); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, P, Q);
    // the flash of the freeze
    if (t < 0.25) { ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - t / 0.25) ** 2})`; ctx.fillRect(0, 0, P, Q); }
    ctx.setTransform(RS, 0, 0, RS, 0, 0); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // WHO WINS?! slams in and wobbles a little
    const q = clamp((t - 0.12) / 0.35, 0, 1);
    if (q > 0) {
      const s = easeOutBack(q) * (1 + 0.02 * Math.sin(t * 6)), cy = H * 0.36;
      ctx.save(); ctx.translate(W / 2, cy); ctx.rotate(-0.05 + 0.01 * Math.sin(t * 3)); ctx.scale(s, s); ctx.globalAlpha = Math.min(1, q * 2);
      this.text(ctx, this.question, 0, 0, 170, '#FFD23F', '#0B0F1A', 22);
      ctx.restore();
    }
    // SUBSCRIBE TO SEE THE ENDING
    const c = clamp((t - 0.55) / 0.3, 0, 1);
    if (c > 0) {
      ctx.save(); ctx.globalAlpha = c; ctx.translate(W / 2, H * 0.36 + 150 + (1 - easeOutCubic(c)) * 30);
      this.text(ctx, this.cta[0], 0, 0, 92, '#FFFFFF', '#0B0F1A', 14);
      this.text(ctx, this.cta[1], 0, 84, 64, '#FFFFFF', '#0B0F1A', 12);
      ctx.restore();
    }
    // the button: pulses, a hand comes in and taps it, it turns into SUBSCRIBED and the bell rings
    const b = clamp((t - 0.95) / 0.3, 0, 1);
    if (b > 0) {
      const tapped = t >= this.tapAt, bx = W / 2, by = H * 0.72, bw = 470, bh = 110;
      const press = tapped ? 1 - 0.08 * Math.exp(-(t - this.tapAt) * 10) : 1 + 0.04 * Math.max(0, Math.sin(t * 7));
      ctx.save(); ctx.globalAlpha = b; ctx.translate(bx, by); ctx.scale(easeOutBack(b) * press, easeOutBack(b) * press);
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
      const r = bh / 2; ctx.beginPath(); ctx.moveTo(-bw / 2 + r, -r); ctx.arcTo(bw / 2, -r, bw / 2, r, r); ctx.arcTo(bw / 2, r, -bw / 2, r, r); ctx.arcTo(-bw / 2, r, -bw / 2, -r, r); ctx.arcTo(-bw / 2, -r, bw / 2, -r, r); ctx.closePath();
      ctx.fillStyle = tapped ? '#3F3F46' : '#FF0033'; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.lineWidth = 6; ctx.strokeStyle = '#0B0F1A'; ctx.stroke();
      ctx.font = this.fontFn(60); ctx.fillStyle = '#FFFFFF'; ctx.fillText(tapped ? 'SUBSCRIBED' : 'SUBSCRIBE', tapped ? -26 : 0, 3);
      if (tapped) {
        // the bell, ringing
        const ring = Math.exp(-(t - this.tapAt) * 3) * Math.sin((t - this.tapAt) * 30) * 0.5;
        ctx.save(); ctx.translate(bw / 2 - 62, -2); ctx.rotate(ring);
        ctx.beginPath(); ctx.moveTo(-18, 14); ctx.quadraticCurveTo(-18, -22, 0, -22); ctx.quadraticCurveTo(18, -22, 18, 14); ctx.lineTo(23, 20); ctx.lineTo(-23, 20); ctx.closePath();
        ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.beginPath(); ctx.arc(0, 25, 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        const k = clamp((t - this.tapAt) / 0.5, 0, 1);
        if (k < 1) { ctx.globalAlpha = b * (1 - k); ctx.lineWidth = 5; ctx.strokeStyle = '#FFD23F'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(bw / 2 - 62, -2, 34 + 20 * k, sd < 0 ? Math.PI * 0.75 : -Math.PI * 0.25, sd < 0 ? Math.PI * 1.25 : Math.PI * 0.25); ctx.stroke(); } }
      }
      ctx.restore();
      // the hand: glides in from below right, taps, then rests
      const h0 = this.tapAt - 0.6, hk = clamp((t - h0) / 0.55, 0, 1);
      if (hk > 0) {
        const tx = bx + 120, ty = by + 26, hx = tx + (1 - easeOutCubic(hk)) * 260, hy = ty + (1 - easeOutCubic(hk)) * 300 + (Math.abs(t - this.tapAt) < 0.12 ? 10 : 0);
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(-0.35); ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14, 52); ctx.lineTo(-2, 46); ctx.lineTo(8, 72); ctx.lineTo(20, 67); ctx.lineTo(10, 42); ctx.lineTo(25, 40); ctx.closePath();
        ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#0B0F1A'; ctx.stroke();
        ctx.restore();
        if (Math.abs(t - this.tapAt) < 0.3 && t >= this.tapAt) { ctx.save(); ctx.globalAlpha = 1 - (t - this.tapAt) / 0.3; ctx.lineWidth = 5; ctx.strokeStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(tx, ty, 20 + 60 * (t - this.tapAt), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      }
    }
    ctx.restore();
  }
  // the freeze lands with a boom and a whoosh, the words with a thud, the tap with a pop and a ding
  sounds(synth, at) {
    synth.play({ type: 'whoosh' }, at); synth.play({ type: 'boom' }, at + 0.02);
    synth.play({ type: 'thud' }, at + 0.2);
    synth.play({ type: 'pop' }, at + this.tapAt); synth.play({ type: 'coin' }, at + this.tapAt + 0.05); synth.play({ type: 'bell' }, at + this.tapAt + 0.1);
  }
}
module.exports = { Cliff };
