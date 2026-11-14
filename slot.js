// Upload times (rules.schedule): decides whether a scheduled run should post now.
// Rellz (2026-11-07): 2 a day at 10am and 10pm; (2026-11-08): 4 a day; (2026-11-08, 23:57): "upload every 2 hours a day so
// 00:00 02:00 04:00" -> every even hour, London time (summer time handled).
// GitHub's timer runs in UTC and is often late (30 to 60 minutes), so the workflow wakes every 15 minutes all day and this script
// says "go" for the first run after a slot starts (up to `windowMinutes` later, 110 by default) when nothing has been posted since.
// Prints go or skip (and why) for the workflow.
'use strict';
const fs = require('fs'), path = require('path');
const rules = require('./rules.json');
const S = rules.schedule || {}, tz = S.timeZone || 'Europe/London', hours = S.hours || [10, 22];

// the date, hour and minute in London for a moment
function local(d) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).map(x => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute) };
}

// the start of the most recent slot (an upload hour, on the hour, London time) within the window, or null
function slotStart(now, windowMin) {
  const t0 = Math.floor(now.getTime() / 60000) * 60000;
  for (let m = 0; m <= windowMin; m++) {
    const d = new Date(t0 - m * 60000), l = local(d);
    if (l.minute === 0 && hours.includes(l.hour)) return d;
  }
  return null;
}

function decide(now = new Date()) {
  const win = S.windowMinutes ?? 110, start = slotStart(now, win);
  if (!start) return { go: false, why: `no upload slot started in the last ${win} minutes (slots: ${hours.join(', ')}:00 ${tz})` };
  const s = local(start);
  // the last post (videos.jsonl dates are UTC "YYYY-MM-DD HH:MM")
  let last = null;
  try {
    const lines = fs.readFileSync(path.join(__dirname, 'videos.jsonl'), 'utf8').trim().split('\n');
    const row = JSON.parse(lines[lines.length - 1]);
    last = new Date(row.date.replace(' ', 'T') + ':00Z');
  } catch (e) { /* nothing posted yet */ }
  if (last && last >= start) return { go: false, why: `already posted for the ${s.hour}:00 slot (${s.day})` };
  return { go: true, why: `${s.day} ${s.hour}:00 ${tz} slot` };
}

if (require.main === module) {
  const d = decide();
  console.log(`${d.go ? 'go' : 'skip'}: ${d.why}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `go=${d.go ? 'yes' : 'no'}\n`);
}
module.exports = { decide, local };
