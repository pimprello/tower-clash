// Prints each posted video's privacy and processing status as YouTube reports it (for diagnosing uploads).
'use strict';
const fs = require('fs');
const { accessToken } = require('./upload.js');
(async () => {
  const ids = fs.readFileSync('videos.jsonl', 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).id).slice(-10);
  const token = await accessToken();
  const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=status,snippet,processingDetails&id=${ids.join(',')}`, { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json();
  console.log(r.status, JSON.stringify((j.items || []).map(v => ({ id: v.id, title: v.snippet.title, status: v.status, thumbs: Object.keys(v.snippet.thumbnails || {}) })), null, 1), j.error ? JSON.stringify(j.error) : '');
  const c = await fetch('https://www.googleapis.com/youtube/v3/channels?part=status,snippet&mine=true', { headers: { Authorization: `Bearer ${token}` } });
  console.log('channel', c.status, JSON.stringify(await c.json()).slice(0, 1500));
})().catch(e => { console.log('error', e.message); process.exit(1); });
