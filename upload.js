// Uploads out/tower-clash.mp4 to YouTube with the title from out/meta.json.
// Needs three secrets: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN (see README).
// Optional: PRIVACY = public | unlisted | private (default public). DRY_RUN=1 prints instead of uploading.
'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'out');
const file = path.join(OUT, 'tower-clash.mp4');
const meta = (() => { try { return JSON.parse(fs.readFileSync(path.join(OUT, 'meta.json'), 'utf8')); } catch (e) { return { title: '', description: '', tags: [] }; } })();
const privacy = ['public', 'unlisted', 'private'].includes(process.env.PRIVACY) ? process.env.PRIVACY : 'public';

function noAngle(t) { return String(t || '').replace(/[<>]/g, ''); }
function cleanTags(list) {
  const out = [], seen = new Set(); let used = 0;
  for (const raw of list || []) {
    const t = String(raw || '').replace(/[<>",#]/g, ' ').replace(/[^\p{L}\p{N} '&.\-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 30).trim();
    if (t.length < 2 || seen.has(t.toLowerCase())) continue;
    const cost = t.length + (t.includes(' ') ? 2 : 0) + (out.length ? 1 : 0);
    if (used + cost > 450) continue;
    seen.add(t.toLowerCase()); out.push(t); used += cost;
  }
  return out;
}
const body = {
  // (YouTube refuses the whole upload over one bad tag, 2026-11-22: "invalid video keywords") tags are cleaned: no < > " , # or emoji,
  // trimmed, at most 30 characters, no empties or repeats, and under 450 characters in all, counting the quotes YouTube adds round
  // a tag with a space. The title and description lose < and > too (YouTube refuses those as well).
  snippet: { title: noAngle(meta.title).slice(0, 100), description: noAngle(meta.description).slice(0, 4900), tags: cleanTags(meta.tags), categoryId: '20' },
  status: { privacyStatus: privacy, selfDeclaredMadeForKids: false },
};

async function accessToken() {
  const need = ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'].filter(k => !process.env[k]);
  if (need.length) throw new Error(`Missing GitHub secret(s): ${need.join(', ')}. Add them under Settings → Secrets and variables → Actions.`);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.YT_CLIENT_ID,
      client_secret: process.env.YT_CLIENT_SECRET,
      refresh_token: process.env.YT_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const hint = j.error === 'invalid_grant' ? ' The refresh token was refused: make a new one (README step 3) and check the Google app is set to "In production".' : '';
    throw new Error(`Google sign-in failed (${r.status} ${j.error || ''}).${hint}`);
  }
  return j.access_token;
}

async function upload() {
  const size = fs.statSync(file).size;
  const token = await accessToken();
  const start = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'video/mp4',
      'X-Upload-Content-Length': String(size),
    },
    body: JSON.stringify(body),
  });
  if (!start.ok) throw new Error(`YouTube refused the upload (${start.status}): ${await start.text()}`);
  const target = start.headers.get('location');
  const put = await fetch(target, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(size) },
    body: fs.readFileSync(file),
  });
  const j = await put.json().catch(() => ({}));
  if (!put.ok) throw new Error(`Upload failed (${put.status}): ${JSON.stringify(j)}`);
  return { id: j.id, token };
}

// The thumbnail (out/thumb.jpg, rules.thumbnail). A refusal is a warning, never a failed run: the video is already up.
async function setThumb(id, token, quiet) {
  const pic = path.join(OUT, 'thumb.jpg');
  if (!fs.existsSync(pic)) return 'none';
  try {
    const r = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(id)}&uploadType=media`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' }, body: fs.readFileSync(pic),
    });
    if (r.ok) { if (!quiet) console.log('Thumbnail set.'); return 'set'; }
    const j = await r.json().catch(() => ({}));
    const why = (j.error && (j.error.message || j.error.status)) || r.statusText;
    console.log(`::warning title=Thumbnail not set::YouTube refused the custom thumbnail (${r.status}: ${String(why).replace(/\s+/g, ' ').slice(0, 300)}). The video is up with YouTube's own thumbnail. Custom thumbnails need a verified channel (phone verification in YouTube Studio); on Shorts YouTube is rolling them out to Partner Program channels first.`);
    return `refused ${r.status}`;
  } catch (e) {
    console.log(`::warning title=Thumbnail not set::${String(e.message).slice(0, 300)}`);
    return 'error';
  }
}

// A thumbnail set straight after the upload, while YouTube is still processing the video, is accepted ("Thumbnail set.") but
// can be replaced by a frame from the video when processing finishes (Rellz, 2026-11-08: "they generate it but when i check my
// uploads it doesn't actually have the thumbnail on"). So it's set again once processing is done. (If the channel doesn't have
// custom Shorts thumbnails yet, rolling out since July 2026, YouTube accepts the call and ignores it: nothing here can change that.)
// The upload token (youtube.upload) usually can't ask YouTube whether processing has finished, and the public thumbnail
// picture exists straight away (a placeholder), so it can't be used to tell either (the first run with it, 2026-11-09, saw it
// "made" after 0 s). When it can't ask, it sets the thumbnail again at about 4, 8 and 12 minutes after the upload, which covers
// processing a 60 to 70 second 1080x1920 Short; a token with more access is asked directly.
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function processed(id, token, maxMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    try {
      const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=processingDetails&id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return 'unknown';
      const j = await r.json(), st = j.items && j.items[0] && j.items[0].processingDetails && j.items[0].processingDetails.processingStatus;
      if (!st) return 'unknown';
      if (st === 'succeeded') return 'processed';
      if (st === 'failed' || st === 'terminated') return st;
    } catch (e) { return 'unknown'; }
    await sleep(20000);
  }
  return 'still processing';
}
async function thumbAfterProcessing(id, token) {
  if (!fs.existsSync(path.join(OUT, 'thumb.jpg'))) return;
  const t0 = Date.now(), how = await processed(id, token, 9 * 60000);
  let r = 'set', n = 0;
  if (how === 'unknown') {
    // each set costs 50 of the day's API units
    for (let k = 0; k < 3 && r === 'set'; k++) { await sleep(240000); r = await setThumb(id, token, true); n++; }
  } else {
    console.log(`YouTube processing: ${how} after ${Math.round((Date.now() - t0) / 1000)} s.`);
    await sleep(45000); r = await setThumb(id, token, true); n++;
    if (r === 'set') { await sleep(90000); r = await setThumb(id, token, true); n++; }
  }
  console.log(r === 'set' ? `Thumbnail set again ${n} times over the ${Math.round((Date.now() - t0) / 60000)} minutes after the upload.` : `Thumbnail after the upload: ${r}.`);
}

async function main() {
  if (process.env.DRY_RUN) {
    const pic = path.join(OUT, 'thumb.jpg');
    console.log('Dry run, nothing uploaded. Would send:', JSON.stringify(body, null, 2), `\nfile: ${file} (${fs.statSync(file).size} bytes)`, fs.existsSync(pic) ? `\nthumbnail: ${pic} (${fs.statSync(pic).size} bytes)` : '\nno thumbnail');
    return;
  }
  for (let attempt = 1; ; attempt++) {
    try {
      const { id, token } = await upload();
      const url = `https://youtube.com/shorts/${id}`;
      fs.writeFileSync(path.join(OUT, 'uploaded.json'), JSON.stringify({ id, url, title: body.snippet.title, winner: meta.winner, privacy, date: new Date().toISOString().slice(0, 16).replace('T', ' ') }, null, 2));
      console.log(`Uploaded "${body.snippet.title}" as ${privacy}: ${url}`);
      const first = await setThumb(id, token).catch(() => 'error');
      // (recorded, so videos posted before the channel could take custom thumbnails get theirs later: fix-thumbs.js)
      const rec = path.join(OUT, 'uploaded.json'); fs.writeFileSync(rec, JSON.stringify({ ...JSON.parse(fs.readFileSync(rec, 'utf8')), thumb: first }, null, 2));
      if (first === 'set') await thumbAfterProcessing(id, token).catch(e => console.log(`::warning title=Thumbnail::${String(e.message).slice(0, 300)}`));
      return;
    } catch (e) {
      const retry = attempt < 3 && /\((5\d\d)\b/.test(e.message);
      console.error(`Attempt ${attempt}: ${e.message}`);
      // also show the reason as a GitHub annotation, so it can be read without opening the logs
      if (!retry) { console.log(`::error title=YouTube upload failed::${e.message.replace(/\s+/g, ' ').slice(0, 600)}`); throw e; }
      await new Promise(r => setTimeout(r, 15000 * attempt));
    }
  }
}

if (require.main === module) main().catch(() => process.exit(1));
module.exports = { accessToken };
