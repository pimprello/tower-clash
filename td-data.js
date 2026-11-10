// Tower Clash: the data the game is built from. Path layouts, maps, towers, attacker waves, bosses, spells, modes, skins and
// the invented orders and warbands. Everything here is plain data (no dice), so changing a number never changes the dice.
'use strict';

// ----- path layouts (arena-local coordinates: 0..960 each way; spawn gates above the top edge, the base at the end) -----
// Each lane is a polyline. Every layout was checked by hand: lanes never leave the arena, corners are wide enough for the
// biggest titans, and every lane has build spots within reach (td.js works the spots out and checks it again at start-up).
const LAYOUTS = {
  snake: {
    name: 'THE SNAKE', base: [480, 880], sym: false,
    lanes: [[[160, -40], [160, 170], [800, 170], [800, 410], [160, 410], [160, 650], [800, 650], [800, 790], [560, 790], [480, 880]]],
  },
  twin: {
    name: 'TWIN LANES', base: [480, 880], sym: true,
    lanes: [
      [[170, -40], [170, 260], [360, 380], [360, 560], [480, 660], [480, 880]],
      [[790, -40], [790, 260], [600, 380], [600, 560], [480, 660], [480, 880]],
    ],
  },
  three: {
    name: 'THREE LANES', base: [480, 880], sym: true,
    lanes: [
      [[130, -40], [130, 520], [300, 720], [480, 880]],
      [[480, -40], [480, 200], [400, 360], [560, 520], [480, 680], [480, 880]],
      [[830, -40], [830, 520], [660, 720], [480, 880]],
    ],
  },
  spiral: {
    name: 'THE SPIRAL', base: [480, 500], sym: false,
    lanes: [[[880, -40], [880, 880], [100, 880], [100, 100], [780, 100], [780, 760], [220, 760], [220, 240], [640, 240], [640, 620], [480, 620], [480, 500]]],
  },
  cross: {
    name: 'THE CROSSROADS', base: [480, 880], sym: true,
    lanes: [
      [[160, -40], [160, 200], [800, 560], [800, 740], [480, 880]],
      [[800, -40], [800, 200], [160, 560], [160, 740], [480, 880]],
    ],
  },
  split: {
    name: 'SPLIT AND REJOIN', base: [480, 880], sym: true,
    lanes: [
      [[480, -40], [480, 150], [200, 300], [200, 520], [480, 680], [480, 880]],
      [[480, -40], [480, 150], [760, 300], [760, 520], [480, 680], [480, 880]],
    ],
  },
  bridge: {
    name: 'THE LAVA BRIDGE', base: [480, 880], sym: false, lava: [0, 420, 960, 120],
    lanes: [[[820, -40], [820, 220], [260, 300], [480, 400], [480, 560], [700, 660], [700, 780], [480, 880]]],
  },
};
const LAYOUT_KEYS = Object.keys(LAYOUTS);

// ----- maps (reusing Army Clash's ground themes): the path colour, the base and what the ground does -----
// ground: 'lava' vents beside the path that flare and burn, 'ice' patches on the path that make walkers slide faster,
// 'sand' and 'mud' patches that slow walkers. Simple, uncluttered grounds; the path is always clearly readable.
const TD_MAPS = {
  forest: { name: 'Forest', path: '#6B4E33', edge: '#3E2C1C', base: 'keep', ground: null, fire: true, era: 'fantasy' },
  bombed: { name: 'Bombed City', path: '#4A4D55', edge: '#25272C', base: 'fortress', ground: null, fire: false, era: 'modern' },
  enchanted: { name: 'Fantasy Land', path: '#7A5FA8', edge: '#3C2A5C', base: 'temple', ground: null, fire: false, era: 'fantasy' },
  beach: { name: 'Pirate Beach', path: '#D9B98A', edge: '#9A7A50', base: 'ship', ground: 'sand', fire: false, era: 'pirate' },
  snow: { name: 'Snowy Pass', path: '#C9D6E3', edge: '#7C8FA3', base: 'keep', ground: 'ice', fire: false, era: 'medieval' },
  dunes: { name: 'Dune Sea', path: '#C9A16A', edge: '#8A6A3E', base: 'temple', ground: 'sand', fire: false, era: 'medieval' },
  swamp: { name: 'Murk Swamp', path: '#5A5A3A', edge: '#2E2E1C', base: 'keep', ground: 'mud', fire: false, era: 'horror' },
  neon: { name: 'Neon City', path: '#2C2448', edge: '#C084FC', base: 'reactor', ground: null, fire: false, era: 'scifi' },
  temple: { name: 'Sky Temple', path: '#C8B98F', edge: '#8A7A50', base: 'temple', ground: null, fire: false, era: 'fantasy' },
  graveyard: { name: 'Haunted Graveyard', path: '#4C4A55', edge: '#25232C', base: 'keep', ground: 'mud', fire: false, era: 'horror' },
  moon: { name: 'Moon Base', path: '#6E7480', edge: '#3A3E47', base: 'reactor', ground: null, fire: false, era: 'scifi' },
  furnace: { name: 'World Furnace', path: '#4A2E22', edge: '#1E120C', base: 'fortress', ground: 'lava', fire: false, era: 'fantasy' },
  frozen: { name: 'Frozen End', path: '#B8D4EA', edge: '#5F7E99', base: 'keep', ground: 'ice', fire: false, era: 'fantasy' },
  castle: { name: 'Castle Siege', path: '#7A6A55', edge: '#3E3428', base: 'keep', ground: null, fire: true, era: 'medieval' },
};
const MAP_KEYS = Object.keys(TD_MAPS);
const BASE_NAME = { keep: 'THE KEEP', fortress: 'THE FORTRESS', temple: 'THE TEMPLE', reactor: 'THE REACTOR', ship: 'THE FLAGSHIP' };

// ----- tower classes: what each is good at, and what it beats -----
const TCLASS = {
  splash: { name: 'SPLASH', col: '#FF8A1F', beats: 'SWARMS', glyph: 'burst' },
  pierce: { name: 'PIERCE', col: '#E2E8F0', beats: 'ARMOUR', glyph: 'arrow' },
  slow: { name: 'SLOW', col: '#7DD3FC', beats: 'FAST TROOPS', glyph: 'snow' },
  air: { name: 'ANTI-AIR', col: '#A5B4FC', beats: 'FLIERS', glyph: 'wing' },
  truedmg: { name: 'TRUE DAMAGE', col: '#F472B6', beats: 'BOSSES', glyph: 'star' },
  summon: { name: 'SUMMON', col: '#86EFAC', beats: 'RUSHES', glyph: 'shield' },
  dot: { name: 'BURN', col: '#A3E635', beats: 'GROUPS', glyph: 'drop' },
};

// ----- towers: every one is an Army Clash character on a tower -----
// char: the troop drawn on top (its own art, shine and animation). range in px, dmg per hit, cd seconds between shots.
// shot: how it fires ('arrow', 'bolt', 'snipe', 'cannonball', 'mortar', 'boulder', 'fireball', 'frostbolt', 'chain', 'glob',
// 'lava', 'laser', 'breath', 'raise', 'charm', 'pull', 'spawn'). ground: can't hit fliers. air: hits fliers (x airK).
const TOWERS = {
  archer: { name: 'ARCHER TOWER', char: 'longbow', cls: 'air', range: 230, dmg: 3, cd: 0.8, shot: 'arrow', cost: 50, sfx: 'volley', spec: 'RAINS ARROWS', airK: 1.6 },
  crossbow: { name: 'CROSSBOW NEST', char: 'crossbowman', cls: 'pierce', range: 240, dmg: 6, cd: 1.3, shot: 'bolt', cost: 60, sfx: 'thunk', spec: 'BOLTS PIERCE ARMOUR', pierce: true },
  sniper: { name: 'SNIPER PERCH', char: 'sniper', cls: 'truedmg', range: 380, dmg: 16, cd: 2.6, shot: 'snipe', cost: 75, sfx: 'snipe', spec: 'HUNTS THE BIGGEST', truedmg: true, prio: 'strong' },
  cannon: { name: 'CANNON', char: 'siegegunner', cls: 'splash', range: 210, dmg: 7, cd: 1.9, shot: 'cannonball', splash: 58, cost: 70, sfx: 'cannon', spec: 'BLASTS CROWDS', ground: true },
  mortar: { name: 'MORTAR', char: 'grenadier', cls: 'splash', range: 330, dmg: 6, cd: 2.6, shot: 'mortar', splash: 70, cost: 80, sfx: 'cannon', spec: 'SHELLS FROM AFAR', ground: true },
  catapult: { name: 'CATAPULT', char: 'catapult', cls: 'splash', range: 300, dmg: 11, cd: 3.4, shot: 'boulder', splash: 80, cost: 90, sfx: 'thud', spec: 'HURLS BOULDERS', ground: true, rs: 0.62 },
  ballista: { name: 'BALLISTA', char: 'royalguard', cls: 'pierce', range: 300, dmg: 9, cd: 2.0, shot: 'bolt', cost: 85, sfx: 'thunk', spec: 'SKEWERS A LINE', pierce: true, line: 3 },
  mage: { name: 'MAGE TOWER', char: 'wizard', cls: 'splash', range: 230, dmg: 5, cd: 1.6, shot: 'fireball', splash: 52, cost: 70, sfx: 'flame', spec: 'FIREBALLS BURN', burn: 1.2, el: 'fire' },
  frost: { name: 'FROST SPIRE', char: 'frostwitch', cls: 'slow', range: 220, dmg: 2.5, cd: 1.5, shot: 'frostbolt', splash: 56, cost: 65, sfx: 'freeze', spec: 'SLOWS AND FREEZES', slow: [0.5, 2.2], freeze: 0.12, el: 'ice' },
  storm: { name: 'STORM CALLER', char: 'stormcaller', cls: 'pierce', range: 230, dmg: 5, cd: 1.7, shot: 'chain', chain: 4, cost: 80, sfx: 'zap', spec: 'CHAIN LIGHTNING', el: 'zap', air: true },
  acid: { name: 'ACID PIT', char: 'acidwyrm', cls: 'dot', range: 220, dmg: 3, cd: 2.6, shot: 'glob', cost: 75, sfx: 'splash', spec: 'MELTS TO THE BONE', ground: true, el: 'acid', rs: 0.5 },
  lava: { name: 'LAVA FORGE', char: 'magmacolossus', cls: 'dot', range: 200, dmg: 2, cd: 3.2, shot: 'lava', cost: 85, sfx: 'flame', spec: 'BURNS THE PATH', ground: true, el: 'fire', rs: 0.46 },
  lich: { name: 'LICH CRYPT', char: 'lich', cls: 'summon', range: 210, dmg: 2, cd: 6.5, shot: 'raise', cost: 80, sfx: 'groan', spec: 'RAISES SKELETONS' },
  siren: { name: 'SIREN ROCK', char: 'siren', cls: 'slow', range: 210, dmg: 1.5, cd: 3.4, shot: 'charm', cost: 70, sfx: 'bell', spec: 'CHARMS THEM BACK' },
  gravity: { name: 'GRAVITY WELL', char: 'gravitymonk', cls: 'air', range: 230, dmg: 2.5, cd: 2.2, shot: 'pull', cost: 75, sfx: 'phase', spec: 'PULLS FLIERS DOWN', airK: 2 },
  laser: { name: 'LASER TURRET', char: 'trooper', cls: 'air', range: 240, dmg: 2.2, cd: 0.42, shot: 'laser', cost: 70, sfx: 'shot', spec: 'RAPID LASERS', airK: 1.4 },
  drone: { name: 'DRONE HIVE', char: 'engineer', cls: 'air', range: 280, dmg: 9, cd: 3.4, shot: 'spawn', spawn: 'drone', cost: 80, sfx: 'jet', spec: 'LAUNCHES DRONES', airK: 1.3 },
  dragon: { name: 'DRAGON ROOST', char: 'dragon', cls: 'air', range: 190, dmg: 4, cd: 1.4, shot: 'breath', cost: 110, sfx: 'flame', spec: 'BREATHES FIRE', airK: 1.8, el: 'fire', rs: 0.5 },
  barracks: { name: 'BARRACKS', char: 'swordsman', cls: 'summon', range: 160, dmg: 0, cd: 6, shot: 'spawn', spawn: 'swordsman', cost: 70, sfx: 'clang', spec: 'SENDS SWORDSMEN' },
};
const TOWER_KEYS = Object.keys(TOWERS);
// the eras each tower fits (sci-fi maps get lasers and drones; the rest stay out of fantasy and medieval battles)
const TOWER_ERA = { laser: ['scifi', 'modern'], drone: ['scifi', 'modern'], sniper: ['modern', 'scifi', 'medieval', 'fantasy', 'pirate', 'horror'], mortar: ['modern', 'scifi', 'pirate', 'medieval'] };
// upgrades: tier 1 to 5. Small (2) shows as a badge and a glint; big (3 to 5) changes the tower, with a card, a ring and a burst.
// tier 4 brings an element, tier 5 an aura. Costs are per step up.
const TIER = { dmg: [1, 1, 1.35, 1.85, 2.5, 3.3], cd: [1, 1, 0.94, 0.86, 0.8, 0.72], range: [1, 1, 1.05, 1.12, 1.18, 1.26], hp: [1, 1, 1.25, 1.6, 2, 2.6], cost: [0, 0, 40, 70, 110, 160] };
const ELEM = { fire: { name: 'FIRE', col: '#FF8A1F' }, frost: { name: 'FROST', col: '#7DD3FC' }, storm: { name: 'STORM', col: '#C4B5FD' }, acid: { name: 'ACID', col: '#A3E635' }, holy: { name: 'HOLY', col: '#FDE68A' } };
const ELEM_KEYS = Object.keys(ELEM);

// ----- defender line-ups: the towers an order builds with (the first is its signature tower) -----
const DEF_LINEUPS = [
  { name: 'ARCHERS AND CANNONS', towers: ['archer', 'cannon', 'frost', 'crossbow', 'mage', 'barracks'] },
  { name: 'FROST AND STORM', towers: ['frost', 'storm', 'archer', 'cannon', 'sniper', 'gravity'] },
  { name: 'SIEGE ENGINES', towers: ['catapult', 'ballista', 'archer', 'mortar', 'frost', 'barracks'] },
  { name: 'DARK ARTS', towers: ['lich', 'acid', 'archer', 'siren', 'mage', 'storm'] },
  { name: 'FIRE AND ACID', towers: ['lava', 'acid', 'archer', 'frost', 'cannon', 'sniper'] },
  { name: 'THE DRAGON KEEP', towers: ['dragon', 'archer', 'cannon', 'frost', 'barracks', 'ballista'] },
  { name: 'SNIPERS AND WALLS', towers: ['sniper', 'barracks', 'archer', 'mortar', 'siren', 'storm'] },
  { name: 'SCI-FI DEFENCE', towers: ['laser', 'drone', 'storm', 'mortar', 'sniper', 'gravity'], eras: ['scifi', 'modern'] },
];

// ----- attackers: the Army Clash cast, grouped into wave kinds -----
// small troops come as swarms (one tower shot each), knights get hurt, titans and bosses decide the fight
const WAVE_KINDS = {
  swarm: { name: 'THE SWARM', pool: ['skeleton', 'goblin', 'spiderling', 'bonelet', 'imp'], n: [14, 20], gap: 0.22 },
  infantry: { name: 'INFANTRY', pool: ['soldier', 'orc', 'pirate', 'zombie', 'hollow'], n: [10, 14], gap: 0.32 },
  knights: { name: 'KNIGHTS', pool: ['knight', 'royalguard', 'samurai', 'paladin', 'orbitknight', 'mirrorknight'], n: [5, 7], gap: 0.55 },
  cavalry: { name: 'CAVALRY CHARGE', pool: ['wolfrider', 'boarrider', 'lancer', 'hellhound', 'rhino'], n: [6, 9], gap: 0.4 },
  mages: { name: 'WAR MAGES', pool: ['wizard', 'warlock', 'necromancer', 'frostwitch', 'shaman', 'healer'], n: [6, 8], gap: 0.5, ranged: true },
  fliers: { name: 'FROM THE SKY', pool: ['gargoyle', 'griffin', 'wisp', 'imp', 'valkyrie'], n: [6, 9], gap: 0.45, air: true },
  machines: { name: 'WAR MACHINES', pool: ['robot', 'juggernaut', 'bomber', 'mech'], n: [4, 7], gap: 0.6 },
  giants: { name: 'THE GIANTS', pool: ['troll', 'ogre', 'yeti', 'minotaur', 'goliath'], n: [3, 4], gap: 1.1 },
  sappers: { name: 'SAPPERS', pool: ['bomber', 'goblin', 'berserker'], n: [6, 9], gap: 0.4 },
  titans: { name: 'TITANS', pool: ['magmacolossus', 'glaciergiant', 'stormcolossus', 'acidwyrm', 'ironhorn', 'siegegolem', 'spiderqueen'], n: [1, 2], gap: 3 },
};
// bosses for the last wave: health bar, phases, an entrance shot
const BOSSES = {
  magmacolossus: { name: 'THE MAGMA COLOSSUS', hp: 4.2 }, glaciergiant: { name: 'THE GLACIER BEHEMOTH', hp: 4.2 },
  stormcolossus: { name: 'THE STORM COLOSSUS', hp: 4 }, acidwyrm: { name: 'THE ACID LEVIATHAN', hp: 4 }, ironhorn: { name: 'THE IRONHORN', hp: 4 },
  siegegolem: { name: 'THE SIEGE GOLEM', hp: 4.2 }, spiderqueen: { name: 'THE SPIDER QUEEN', hp: 3.8 }, gravitytyrant: { name: 'THE GRAVITY TYRANT', hp: 4.2 },
  deathknight: { name: 'THE DREAD KNIGHT', hp: 5.2 }, stareater: { name: 'THE STAR EATER', hp: 3.4 }, titan: { name: 'THE TITAN', hp: 3.4 },
  bonecolossus: { name: 'THE BONE COLOSSUS', hp: 3.6 }, hydra: { name: 'THE HYDRA', hp: 4 }, mammoth: { name: 'THE WAR MAMMOTH', hp: 3.8 },
};
const BOSS_KEYS = Object.keys(BOSSES);
// what a troop that reaches the base does to it (out of 100)
const SIEGE = { small: 2.5, mid: 5, giant: 9, titan: 14, boss: 9 };
// troops that go for towers, not just the base
const RAIDERS = new Set(['troll', 'ogre', 'goliath', 'juggernaut', 'minotaur', 'berserker', 'deathknight', 'rhino']);

// ----- attacker warband line-ups (the waves an army brings, then its boss) -----
const ATK_LINEUPS = [
  { name: 'THE HORDE', waves: ['swarm', 'infantry', 'cavalry', 'giants', 'infantry', 'fliers', 'titans'], boss: ['magmacolossus', 'ironhorn'] },
  { name: 'THE IRON LEGION', waves: ['infantry', 'knights', 'machines', 'cavalry', 'sappers', 'knights', 'titans'], boss: ['siegegolem', 'deathknight'] },
  { name: 'THE BONE TIDE', waves: ['swarm', 'swarm', 'mages', 'infantry', 'giants', 'fliers', 'swarm'], boss: ['bonecolossus', 'deathknight'] },
  { name: 'THE WILD HUNT', waves: ['cavalry', 'fliers', 'swarm', 'cavalry', 'giants', 'fliers', 'titans'], boss: ['ironhorn', 'hydra'] },
  { name: 'THE SKY RAIDERS', waves: ['fliers', 'infantry', 'fliers', 'mages', 'fliers', 'knights', 'titans'], boss: ['stareater', 'stormcolossus'] },
  { name: 'THE TITAN MARCH', waves: ['infantry', 'giants', 'titans', 'cavalry', 'giants', 'titans', 'knights'], boss: ['titan', 'glaciergiant', 'mammoth'] },
  { name: 'THE SAPPER GANG', waves: ['sappers', 'infantry', 'sappers', 'machines', 'cavalry', 'sappers', 'giants'], boss: ['siegegolem', 'spiderqueen'] },
  { name: 'THE WITCH COVEN', waves: ['mages', 'swarm', 'mages', 'fliers', 'knights', 'mages', 'titans'], boss: ['gravitytyrant', 'acidwyrm'] },
];

// ----- the spell book -----
// the defender buys from the merchant (8 from Army Clash, 4 new); the attackers' war shaman has a smaller list of his own
const BOOK = {
  heal: { name: 'HEAL', price: 30, col: '#4ADE80', say: 'repairs every tower and the base' },
  rage: { name: 'RAGE', price: 35, col: '#F87171', say: 'towers fire 50% faster for 6 s' },
  bones: { name: 'SKELETON GRAVEYARD', price: 35, col: '#E5E7EB', say: 'skeletons claw out of the path and block it' },
  acid: { name: 'ACID FLASK', price: 45, col: '#A3E635', say: 'everything in the splash melts to the bone' },
  growth: { name: 'GIANT GROWTH', price: 40, col: '#FBBF24', say: 'three towers grow huge' },
  dome: { name: 'SHIELD DOME', price: 35, col: '#7DD3FC', say: 'the base takes 70% less damage for 5 s' },
  tornado: { name: 'TORNADO', price: 40, col: '#CBD5E1', say: 'tears down the path, flinging small troops' },
  quake: { name: 'EARTHQUAKE', price: 45, col: '#D6A36A', say: 'the path splits: small troops fall in, big ones are stunned' },
  meteor: { name: 'METEOR', price: 50, col: '#FB923C', say: 'a meteor lands on the thickest crowd' },
  timefreeze: { name: 'TIME FREEZE', price: 45, col: '#93C5FD', say: 'one stretch of the path stops in time for 3 s' },
  reinforce: { name: 'REINFORCEMENTS', price: 40, col: '#FDE68A', say: 'four knights drop onto the path' },
  chainstorm: { name: 'LIGHTNING STORM', price: 45, col: '#C4B5FD', say: 'lightning strikes eight attackers' },
};
const BOOK_KEYS = Object.keys(BOOK);
const SHAMAN = {
  warcry: { name: 'WAR CRY', col: '#F87171', say: 'attackers hit 50% harder for 6 s' },
  haste: { name: 'HASTE', col: '#FDE047', say: 'attackers march 40% faster for 5 s' },
  ward: { name: 'SPIRIT WARD', col: '#A78BFA', say: 'attackers take 50% less damage for 5 s' },
  raise: { name: 'RAISE THE FALLEN', col: '#86EFAC', say: 'the fallen rise and march again' },
  summon: { name: 'SUMMON A TITAN', col: '#FB7185', say: 'a titan steps out of the gate' },
};
const SHAMAN_KEYS = Object.keys(SHAMAN);

// ----- battle modes (classic stays the most common) -----
const MODES = {
  classic: { name: 'CLASSIC', hook: 'WILL THE BASE SURVIVE?', line: '' },
  bossrush: { name: 'BOSS RUSH', hook: 'BOSS RUSH!', line: 'Boss Rush: titans and bosses only, wave after wave.' },
  swarm: { name: 'ENDLESS SWARM', hook: 'ENDLESS SWARM!', line: 'Endless Swarm: wave after wave of small troops with no break between them.' },
  laststand: { name: 'LAST TOWER STANDING', hook: 'NO NEW TOWERS!', line: 'Last Tower Standing: the defenders can only upgrade the towers they start with, never build new ones.' },
  escort: { name: 'ESCORT', hook: 'STOP THE SIEGE ENGINE!', line: 'Escort: the attackers escort a siege engine. If it reaches the base, the base falls; kill it and the attack breaks.' },
  night: { name: 'NIGHT DEFENCE', hook: 'DEFEND IN THE DARK', line: 'Night Defence: the whole battle is fought in the dark, lit only by the towers, their shots and the fires.' },
  lava: { name: 'SUDDEN-DEATH LAVA', hook: 'THE LAVA IS RISING', line: 'Sudden-Death Lava: lava floods the field from the top in the last 20 seconds, burning everything it reaches.' },
};
const MODE_KEYS = Object.keys(MODES);

// ----- skins (looks only) -----
const SKINS = { royal: 'ROYAL', neon: 'NEON', shadow: 'SHADOW', frost: 'FROST', lava: 'LAVA', ghost: 'GHOST', toxic: 'TOXIC', golden: 'GOLDEN' };

// ----- the invented orders (defenders) and warbands (attackers): [name, emblem, trait] -----
// Names are invented: no real clans, religions, regiments or insignia. The description says the stories are made up.
const ORDERS = [
  ['ORDER OF THE IRON GATE', 'tower', 'stubborn'], ['WARDENS OF THE SILVER KEEP', 'star', 'bright'], ['THE STONEWATCH', 'tower', 'stubborn'],
  ['KEEPERS OF THE LAST LIGHT', 'flame', 'bright'], ['THE BRASS BASTION', 'gear', 'engineers'], ['SENTINELS OF THE NORTH TOWER', 'moon', 'hunters'],
  ['THE GLASS CITADEL', 'crane', 'bright'], ['WARDENS OF THE DEEP MOAT', 'serpent', 'engineers'], ['THE ASHEN WATCH', 'raven', 'hunters'],
  ['HOUSE OF THE EMBER WALL', 'flame', 'stubborn'], ['THE OAKSHIELD GARRISON', 'oak', 'stubborn'], ['ORDER OF THE WHITE STAG', 'stag', 'bright'],
  ['THE COPPER RAMPART', 'gear', 'engineers'], ['WARDENS OF THE GREY PASS', 'wolf', 'hunters'], ['THE LANTERN GUARD', 'star', 'bright'],
  ['THE ANCHOR HOLD', 'anchor', 'stubborn'],
];
const WARBANDS = [
  ['THE ASHEN HORDE', 'flame', 'reckless'], ['THE BONE TIDE', 'skull', 'endless'], ['RED MAW WARBAND', 'fang', 'reckless'], ['THE IRON SWARM', 'gear', 'endless'],
  ['GRAVEROT LEGION', 'skull', 'endless'], ['THE HOWLING DUNE', 'wolf', 'cunning'], ['FROSTFANG RAIDERS', 'fang', 'cunning'], ['THE MIRE KIN', 'serpent', 'cunning'],
  ['THE STORMBREAKERS', 'star', 'reckless'], ['THE NIGHT TIDE', 'moon', 'cunning'], ['CINDERCLAW HORDE', 'flame', 'reckless'], ['THE BLACK BOAR BAND', 'boar', 'reckless'],
  ['THE HOLLOW CROWN RAIDERS', 'raven', 'cunning'], ['THE RUSTED HAMMER', 'gear', 'endless'], ['THE GREYSCALE BROOD', 'serpent', 'endless'], ['THE BLOODMOON PACK', 'moon', 'reckless'],
];
const TRAITS = {
  stubborn: { say: 'towers 15% tougher', name: 'STUBBORN' }, bright: { say: 'more gold per kill', name: 'BRIGHT' }, engineers: { say: 'upgrades cost less', name: 'ENGINEERS' }, hunters: { say: 'towers reach further', name: 'HUNTERS' },
  reckless: { say: 'faster, but fragile', name: 'RECKLESS' }, endless: { say: 'more troops', name: 'ENDLESS' }, cunning: { say: 'more spells', name: 'CUNNING' },
};
// champion titles for the defenders' best towers (earned in the battle)
const CHAMP_TITLES = [['TITAN SLAYER', u => u.titanKills >= 1], ['WALL OF IRON', u => u.kills >= 25], ['THE REAPER', u => u.kills >= 15], ['SHARPSHOOTER', u => u.kills >= 10]];

// ----- friendly nation rivalries (real flags, drawn by the engine) -----
// friendly rivalries only: never countries at war or with a painful wartime history, no leaders or insignia
const NATION_PAIRS = [['UK', 'USA'], ['BRAZIL', 'ARGENTINA'], ['NORWAY', 'SWEDEN'], ['SPAIN', 'PORTUGAL'], ['AUSTRALIA', 'NEWZEALAND'], ['CANADA', 'USA'], ['NETHERLANDS', 'BELGIUM'], ['DENMARK', 'FINLAND'], ['ITALY', 'FRANCE']];

module.exports = { LAYOUTS, LAYOUT_KEYS, TD_MAPS, MAP_KEYS, BASE_NAME, TCLASS, TOWERS, TOWER_KEYS, TOWER_ERA, TIER, ELEM, ELEM_KEYS, DEF_LINEUPS, WAVE_KINDS, BOSSES, BOSS_KEYS, SIEGE, RAIDERS, ATK_LINEUPS, BOOK, BOOK_KEYS, SHAMAN, SHAMAN_KEYS, MODES, MODE_KEYS, SKINS, ORDERS, WARBANDS, TRAITS, CHAMP_TITLES, NATION_PAIRS };
