// Sets the channel's About description from CHANNEL.md (the Tower Clash block), keeping every other channel setting.
'use strict';
const fs = require('fs');
const { accessToken } = require('./upload.js');
(async () => {
  const md = fs.readFileSync('CHANNEL.md', 'utf8');
  const desc = md.split('## Tower Clash')[1].split('```')[1].trim();
  const token = await accessToken(), H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const g = await (await fetch('https://www.googleapis.com/youtube/v3/channels?part=brandingSettings&mine=true', { headers: H })).json();
  const ch = g.items[0];
  ch.brandingSettings.channel.description = desc;
  const r = await fetch('https://www.googleapis.com/youtube/v3/channels?part=brandingSettings', { method: 'PUT', headers: H, body: JSON.stringify({ id: ch.id, brandingSettings: ch.brandingSettings }) });
  console.log('channel description:', r.status, r.ok ? 'set' : (await r.text()).slice(0, 500));
})().catch(e => { console.log('error', e.message); process.exit(1); });
