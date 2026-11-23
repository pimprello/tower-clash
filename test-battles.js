// Headless test batch for the autopilot (no drawing): `node test-battles.js [battles=40] [strength=1]`. Rotates layouts, maps, modes
// and line-ups like the posts do, and reports crashes, battles that never end, the defenders' win rate and how long battles last.
'use strict';
const { TD } = require('./td-game.js');
const D = require('./td-data.js');
const N = Number(process.argv[2] || 40), power = Number(process.argv[3] || 1);
// PICKS=1: with Rellz's picks (rules.picks) on, and their new modes in the rotation; HASH=1 prints each battle's end state
const PK = process.env.PICKS === '1' ? require('./rules.json').picks : null, MODES = PK ? D.MODE_KEYS.concat(['hill', 'tug', 'siege']) : D.MODE_KEYS;
let fails = 0, unfinished = 0, def = 0; const Ts = [];
for (let i = 0; i < N; i++) {
  const L = D.LAYOUT_KEYS[i % D.LAYOUT_KEYS.length], M = D.MAP_KEYS[(i * 5 + 3) % D.MAP_KEYS.length], mode = MODES[i % MODES.length];
  const era = D.TD_MAPS[M].era, ok = D.DEF_LINEUPS.filter(l => !l.eras || l.eras.includes(era)), dl = ok[(i * 3 + 1) % ok.length];
  try {
    const g = new TD(i * 31337 + 7, { map: M, layout: L, target: 60, fixedLength: 63, outroSecs: 3, ui: 2, tdMode: mode, attack: D.ATK_LINEUPS[(i * 3) % D.ATK_LINEUPS.length], towers: dl.towers,
      defOrder: D.ORDERS[i % D.ORDERS.length], atkBand: D.WARBANDS[i % D.WARBANDS.length], slay: process.env.SLAY === '0' ? null : require('./rules.json').slay, events: [{ type: 'airdrop' }, { type: 'airstrike' }, { type: 'meteors' }, { type: 'hazard' }], power, ...(PK ? { picks: Object.assign({}, PK, { on: true }) } : {}) });
    g.fixedTicks = true; g.tickAcc = 0;
    let k = 0; while (!g.finished && k < 60 * 120) { g.frame(1 / 60); g.sfx.length = 0; k++; }
    if (!g.finished) { unfinished++; console.log(`never ended: battle ${i} (${L}, ${M}, ${mode})`); }
    if (g.tdWinner === 0) def++; Ts.push(g.fightT);
    if (process.env.HASH) console.log(`battle ${i} ${mode}: winner ${g.tdWinner} at ${g.fightT.toFixed(3)} base ${g.base.hp.toFixed(2)} towers ${g.towers.filter(t => !t.dead).length}`);
  } catch (e) { fails++; if (fails <= 5) console.log(`crash: battle ${i} (${L}, ${M}, ${mode}): ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}
Ts.sort((a, b) => a - b);
console.log(`${N} battles: ${fails} crashes, ${unfinished} never ended, defenders won ${Math.round(def / Math.max(1, N - fails) * 100)}%, battle length ${Ts[0]?.toFixed(1)}–${Ts[Ts.length - 1]?.toFixed(1)} s (median ${Ts[Ts.length >> 1]?.toFixed(1)})`);
process.exit(fails || unfinished ? 1 : 0);
