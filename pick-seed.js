// "Top quality" (rules.quality, Rellz 2026-11-14: 4 a day, each one very high): tries several candidate battles headless and keeps
// the most dramatic one (the closest, latest finish, towers falling), then render.js makes that one. Writes out/seed.txt.
'use strict';
const { execFileSync } = require('child_process');
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const rules = require('./rules.json'), Q = rules.quality || {}, OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const n = process.env.SEED ? 1 : Math.max(1, Q.candidates || 1);
let best = null;
for (let i = 0; i < n; i++) {
  const seed = process.env.SEED ? Number(process.env.SEED) >>> 0 : crypto.randomBytes(4).readUInt32LE(0);
  execFileSync('node', [path.join(__dirname, 'render.js')], { env: { ...process.env, SEED: String(seed), SCORE_ONLY: '1' }, stdio: ['ignore', 'inherit', 'inherit'] });
  const r = JSON.parse(fs.readFileSync(path.join(OUT, `score-${seed}.json`), 'utf8'));
  console.log(`candidate ${i + 1}/${n}: seed ${seed}, drama ${r.drama.toFixed(1)}`);
  if (!best || r.drama > best.drama) best = r;
}
fs.writeFileSync(path.join(OUT, 'seed.txt'), String(best.seed));
fs.writeFileSync(path.join(OUT, 'power.txt'), String(best.power));
console.log(`picked seed ${best.seed} (drama ${best.drama.toFixed(1)}, attackers x${best.power.toFixed(3)})`);
