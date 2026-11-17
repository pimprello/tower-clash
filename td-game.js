// Tower Clash: the whole game (load this one). td.js has the board and units, td-sim.js the battle, td-play.js the merchant,
// shaman, events and world events, td-draw.js the drawing and screens.
'use strict';
require('./td-sim.js');
require('./td-play.js');
require('./td-crystal.js');
require('./td-worlds.js');
require('./td-weird.js');
try { require('./td-draw.js'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
require('./td-picks.js');   // (rules.picks, 2026-11-16: after the drawing, which it hooks into)
module.exports = require('./td.js');
