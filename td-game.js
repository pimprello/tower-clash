// Tower Clash: the whole game (load this one). td.js has the board and units, td-sim.js the battle, td-play.js the merchant,
// shaman, events and world events, td-draw.js the drawing and screens.
'use strict';
require('./td-sim.js');
require('./td-play.js');
try { require('./td-draw.js'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
module.exports = require('./td.js');
