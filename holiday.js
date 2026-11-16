// Holiday specials (Rellz, 2026-11-16: "remember to do specific videos for holidays like Christmas Easter etc"), the same file in
// Army Clash and Tower Clash. holiday.of(date) says which holiday a post falls on (by the London date), or null. render.js then
// picks a fitting map, puts the holiday in the title, description and tags. Looks and words only: it never changes a battle's dice.
// Bigger themed content for a holiday (skins, decorations, a special troop) is added by hand or by the autopilot the week before.
'use strict';

// Western Easter Sunday (the anonymous Gregorian algorithm), as [month 1-12, day]
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return [mo, da];
}
// Eid follows the moon; these are the expected UK dates (may shift by a day), first day of each
const EID = { 2027: { fitr: [3, 10], adha: [5, 17] }, 2028: { fitr: [2, 27], adha: [5, 5] }, 2029: { fitr: [2, 15], adha: [4, 24] }, 2030: { fitr: [2, 5], adha: [4, 13] } };

// each holiday: name, the days it runs (London dates), an emoji, maps that suit it (first one found in the game is used),
// a short line for the description, and tags
const LIST = y => {
  const [em, ed] = easter(y), E = new Date(Date.UTC(y, em - 1, ed)), off = n => { const d = new Date(E); d.setUTCDate(d.getUTCDate() + n); return [d.getUTCMonth() + 1, d.getUTCDate()]; };
  const eid = EID[y] || {};
  return [
    { key: 'newyear', name: 'New Year', emoji: '🎆', days: [[1, 1]], maps: ['neon', 'city'], line: 'Happy New Year! The first battle of the year.', tags: ['new year', 'happy new year', 'new years battle'] },
    { key: 'newyearseve', name: "New Year's Eve", emoji: '🎆', days: [[12, 31]], maps: ['neon', 'city'], line: "The last battle of the year: who ends it on top?", tags: ['new years eve', 'nye', 'countdown battle'] },
    { key: 'valentine', name: "Valentine's", emoji: '💘', days: [[2, 14]], maps: ['enchanted', 'temple', 'castle'], line: "A Valentine's Day battle: no love lost on this field.", tags: ['valentines day', 'valentines special'] },
    { key: 'stpatrick', name: "St Patrick's Day", emoji: '☘️', days: [[3, 17]], maps: ['overgrown', 'forest', 'swamp'], line: "Happy St Patrick's Day! Whose luck holds?", tags: ['st patricks day', 'st paddys day'] },
    { key: 'aprilfools', name: 'April Fools', emoji: '🤡', days: [[4, 1]], maps: ['mirror', 'godboard'], line: 'April Fools! Nothing in this battle is quite what it seems.', tags: ['april fools', 'april fools day'] },
    { key: 'easter', name: 'Easter', emoji: '🐣', days: [off(-2), off(-1), off(0), off(1)], maps: ['enchanted', 'overgrown', 'forest', 'temple'], line: 'Happy Easter! An Easter special battle.', tags: ['easter', 'easter special', 'happy easter', 'easter battle'] },
    ...(eid.fitr ? [{ key: 'eidfitr', name: 'Eid', emoji: '🌙', days: [eid.fitr, [eid.fitr[0], eid.fitr[1] + 1]], maps: ['dunes', 'temple'], line: 'Eid Mubarak! An Eid special battle.', tags: ['eid mubarak', 'eid al fitr', 'eid special'] }] : []),
    ...(eid.adha ? [{ key: 'eidadha', name: 'Eid', emoji: '🌙', days: [eid.adha, [eid.adha[0], eid.adha[1] + 1]], maps: ['dunes', 'temple'], line: 'Eid Mubarak! An Eid al-Adha special battle.', tags: ['eid mubarak', 'eid al adha', 'eid special'] }] : []),
    { key: 'summer', name: 'Summer', emoji: '☀️', days: [[6, 21]], maps: ['beach', 'dunes'], line: 'The longest day of the year: a summer special.', tags: ['summer', 'summer special'] },
    { key: 'halloween', name: 'Halloween', emoji: '🎃', days: [[10, 30], [10, 31]], maps: ['graveyard', 'grave', 'swamp'], line: 'Happy Halloween! A spooky special battle.', tags: ['halloween', 'halloween special', 'spooky', 'halloween battle'] },
    { key: 'bonfire', name: 'Bonfire Night', emoji: '🎇', days: [[11, 5]], maps: ['furnace', 'bombed', 'city'], line: 'Remember, remember the fifth of November: a Bonfire Night special.', tags: ['bonfire night', 'guy fawkes', 'fireworks'] },
    { key: 'christmas', name: 'Christmas', emoji: '🎄', days: [[12, 24], [12, 25], [12, 26]], maps: ['snow', 'frozen'], line: 'Merry Christmas! A Christmas special battle.', tags: ['christmas', 'christmas special', 'merry christmas', 'christmas battle', 'xmas'] },
  ];
};

// the London calendar date of a moment (no time-zone library: London is UTC in winter, UTC+1 from the last Sunday of March to the last of October)
function london(d = new Date()) {
  const y = d.getUTCFullYear(), lastSun = mo => { const t = new Date(Date.UTC(y, mo, 0)); t.setUTCDate(t.getUTCDate() - t.getUTCDay()); return t; };
  const bst0 = lastSun(3), bst1 = lastSun(10); bst0.setUTCHours(1); bst1.setUTCHours(1);
  const t = new Date(d.getTime() + (d >= bst0 && d < bst1 ? 3600e3 : 0));
  return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()];
}

// HOLIDAY=christmas (or any key) forces one for a test; HOLIDAY=none turns them off
function of(date = new Date(), env = process.env) {
  const [y, m, d] = london(date), all = LIST(y);
  if (env && env.HOLIDAY) return env.HOLIDAY === 'none' ? null : all.find(h => h.key === env.HOLIDAY) || null;
  return all.find(h => h.days.some(([mm, dd]) => mm === m && dd === d)) || null;
}
// "Title" -> "🎄 Christmas Special: Title", kept within YouTube's 100 characters
function title(h, t) { if (!h) return t; const p = `${h.emoji} ${h.name} Special: `; return (p + t).length <= 100 ? p + t : `${h.emoji} ${t}`.slice(0, 100); }
function map(h, avail) { if (!h) return null; const set = new Set(avail); return h.maps.find(k => set.has(k)) || null; }

module.exports = { of, title, map, easter, london, LIST };
