// Sets the saved thumbnails (thumbs/<video id>.jpg) on videos posted while YouTube was refusing custom thumbnails (before the
// channel was phone-verified). Runs after each upload; does nothing until a new upload's thumbnail is accepted, then sets up
// to 8 older ones per run (50 API units each) and removes their saved pictures.
'use strict';
const fs = require('fs'), path = require('path');
const { accessToken } = require('./upload.js');
const dir = path.join(__dirname, 'thumbs');
(async () => {
  let now = {};
  try { now = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'uploaded.json'), 'utf8')); } catch (e) { /* no upload */ }
  if (now.thumb !== 'set' && !process.env.FORCE) { console.log('Custom thumbnails not accepted yet; saved thumbnails kept for later.'); return; }
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).slice(0, 8);
  if (!files.length) return;
  const token = await accessToken();
  for (const f of files) {
    const id = f.slice(0, -4);
    const r = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(id)}&uploadType=media`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' }, body: fs.readFileSync(path.join(dir, f)) });
    if (r.ok) { fs.rmSync(path.join(dir, f)); console.log(`Thumbnail set on older video ${id}.`); }
    else if (r.status === 404) { fs.rmSync(path.join(dir, f)); console.log(`YouTube won't take a thumbnail for ${id} (posted before the channel was verified); given up on it.`); }
    else console.log(`::warning title=Older thumbnail not set::${id}: ${r.status} ${(await r.text()).replace(/\s+/g, ' ').slice(0, 200)}`);
  }
})().catch(e => console.log(`::warning title=fix-thumbs::${String(e.message).slice(0, 300)}`));
