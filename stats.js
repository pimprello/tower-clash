// Fetches view, like and comment counts for every posted video and summarises what performs best.
// Runs at most once every 20 hours (from the post workflow). Writes stats/views.json and stats/summary.md.
// Needs YT_API_KEY (a YouTube Data API key) or the upload OAuth secrets; quota cost is 1 unit per 50 videos.
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'stats');
const last = path.join(DIR, 'last-run.txt');
fs.mkdirSync(DIR, { recursive: true });
if (!process.env.FORCE && fs.existsSync(last) && Date.now() - Number(fs.readFileSync(last, 'utf8')) < 20 * 3600 * 1000) {
  console.log('Stats ran less than 20 hours ago; skipping.');
  process.exit(0);
}

// every video: settings from videos.jsonl where we have them, otherwise just the id from uploads.md
const videos = new Map();
const up = fs.existsSync('uploads.md') ? fs.readFileSync('uploads.md', 'utf8') : '';
for (const m of up.matchAll(/^\| ([^|]+) \| (.+?) \| [^|]* \| https:\/\/youtube\.com\/shorts\/([\w-]+) \|$/gm)) videos.set(m[3], { id: m[3], date: m[1].trim(), title: m[2].replace(/\\\|/g, '|') });
if (fs.existsSync('videos.jsonl')) for (const line of fs.readFileSync('videos.jsonl', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  try { const v = JSON.parse(line); if (v.id) videos.set(v.id, { ...(videos.get(v.id) || {}), ...v }); } catch (e) { /* skip bad line */ }
}

async function auth() {
  if (process.env.YT_API_KEY) return { key: process.env.YT_API_KEY };
  if (!process.env.YT_REFRESH_TOKEN) throw new Error('No YT_API_KEY secret and no OAuth secrets.');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.YT_CLIENT_ID, client_secret: process.env.YT_CLIENT_SECRET, refresh_token: process.env.YT_REFRESH_TOKEN, grant_type: 'refresh_token' }) });
  const j = await r.json();
  if (!r.ok) throw new Error('Google sign-in failed: ' + (j.error || r.status));
  return { token: j.access_token };
}

const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
function groupBy(list, keyFn) {
  const g = new Map();
  for (const v of list) { const k = keyFn(v); if (k === undefined || k === null || k === '') continue; if (!g.has(k)) g.set(k, []); g.get(k).push(v.views); }
  return [...g.entries()].map(([k, a]) => ({ k, n: a.length, median: median(a), avg: Math.round(a.reduce((x, y) => x + y, 0) / a.length) }))
    .filter(r => r.n >= 3).sort((a, b) => b.median - a.median);
}

(async () => {
  const a = await auth();
  const ids = [...videos.keys()];
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const q = new URLSearchParams({ part: 'statistics,contentDetails,snippet', id: ids.slice(i, i + 50).join(',') });
    if (a.key) q.set('key', a.key);
    const r = await fetch('https://www.googleapis.com/youtube/v3/videos?' + q, { headers: a.token ? { Authorization: 'Bearer ' + a.token } : {} });
    const j = await r.json();
    if (!r.ok) throw new Error(`YouTube refused the stats request (${r.status}): ${JSON.stringify(j.error && j.error.message)}. ${a.key ? 'The API key was used: check it is a YouTube Data API v3 key with that API enabled.' : 'No API key reached this run: add a repository secret named exactly YT_API_KEY (Settings → Secrets and variables → Actions).'}`);
    for (const it of j.items || []) {
      const v = videos.get(it.id), st = it.statistics || {}, cd = it.contentDetails || {}, sn = it.snippet || {};
      // length in seconds (from the ISO 8601 duration, e.g. PT1M3S) and when it went public
      const dm = /PT(?:(\d+)M)?(?:(\d+)S)?/.exec(cd.duration || '');
      const secs = dm ? Number(dm[1] || 0) * 60 + Number(dm[2] || 0) : v.seconds;
      out.push({ ...v, views: Number(st.viewCount || 0), likes: Number(st.likeCount || 0), comments: Number(st.commentCount || 0), secs, published: sn.publishedAt });
    }
  }
  // only judge videos at least a day old, so new uploads don't drag the numbers down
  const day = 24 * 3600 * 1000, now = Date.now();
  const mature = out.filter(v => v.date && now - Date.parse(v.date.replace(' ', 'T') + 'Z') > day);
  // when it went up (UK time) and how long it is, so the posting times, the number of posts a day and the video length can be tuned
  const ukHour = v => { const d = new Date(v.published || v.date.replace(' ', 'T') + 'Z'); return Number(d.toLocaleString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false })); };
  const ukDay = v => new Date(v.published || v.date.replace(' ', 'T') + 'Z').toLocaleDateString('en-GB', { timeZone: 'Europe/London', weekday: 'short' });
  const lenBucket = v => (v.secs ? (v.secs <= 30 ? '30 s or less' : v.secs <= 45 ? '31-45 s' : v.secs <= 60 ? '46-60 s' : v.secs <= 75 ? '61-75 s' : 'over 75 s') : undefined);
  const perDay = new Map();
  for (const v of mature) { const d = (v.published || v.date).slice(0, 10); if (!perDay.has(d)) perDay.set(d, []); perDay.get(d).push(v.views); }
  const dayRows = [...perDay.entries()].sort().map(([d, a]) => `| ${d} | ${a.length} | ${median(a)} | ${a.reduce((x, y) => x + y, 0)} |`);
  const nation = t => (t && t.some(x => ['UK', 'USA', 'FRANCE', 'GERMANY', 'ITALY', 'BRAZIL', 'ARGENTINA', 'CANADA', 'SPAIN', 'PORTUGAL', 'AUSTRALIA', 'NEWZEALAND', 'NETHERLANDS', 'BELGIUM', 'SWEDEN', 'NORWAY', 'DENMARK', 'FINLAND'].includes(x)) ? 'nations' : 'colours');
  const table = (title, rows, max = 15) => [`### ${title}`, '', '| Group | Videos | Median views | Average views |', '| --- | --- | --- | --- |',
    ...rows.slice(0, max).map(r => `| ${r.k} | ${r.n} | ${r.median} | ${r.avg} |`), ''].join('\n');
  const md = [
    '# View stats', '', `Updated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. ${out.length} videos, ${mature.length} at least a day old (used below). Groups need 3+ videos.`, '',
    `Total views: ${out.reduce((s, v) => s + v.views, 0)}. Median views per video: ${median(mature.map(v => v.views))}.`, '',
    table('By upload hour (UK time)', groupBy(mature, v => `${String(ukHour(v)).padStart(2, '0')}:00`).sort((a, b) => a.k.localeCompare(b.k)), 24),
    table('By weekday (UK time)', groupBy(mature, ukDay)),
    table('By video length', groupBy(mature, lenBucket)),
    '### Posts per day', '', '| Day | Videos | Median views | Total views |', '| --- | --- | --- | --- |', ...dayRows, '',
    table('By layout', groupBy(mature, v => v.layout)),
    table('By map', groupBy(mature, v => v.map)),
    table('By mode', groupBy(mature, v => v.mode || 'classic')),
    table('Result', groupBy(mature, v => v.winner)),
    table('By boss', groupBy(mature, v => v.boss)),
    table('By attackers', groupBy(mature, v => v.attack)),
    table('By defenders', groupBy(mature, v => v.defense)),
    table('By colour pair', groupBy(mature, v => v.teams && v.teams.slice().sort().join(' vs '))),
    table('By title kind', groupBy(mature, v => v.titleKind)),
    '### Top 10 videos', '', '| Views | Likes | Title |', '| --- | --- | --- |',
    ...out.slice().sort((x, y) => y.views - x.views).slice(0, 10).map(v => `| ${v.views} | ${v.likes} | ${v.title} |`), '',
  ].join('\n');
  fs.writeFileSync(path.join(DIR, 'views.json'), JSON.stringify(out, null, 1));
  fs.writeFileSync(path.join(DIR, 'summary.md'), md);
  fs.writeFileSync(last, String(Date.now()));
  if (fs.existsSync(path.join(DIR, 'error.txt'))) fs.rmSync(path.join(DIR, 'error.txt'));
  console.log(`Stats saved for ${out.length} videos.`);
})().catch(e => {
  // record the problem (the autopilot reads it) and wait a day before trying again
  console.error(e.message);
  fs.writeFileSync(path.join(DIR, 'error.txt'), new Date().toISOString() + ' ' + e.message + '\n');
  fs.writeFileSync(last, String(Date.now()));
  process.exit(1);
});
