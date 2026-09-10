import { mkdir, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fetchWeather, weatherDate } from '../lib/weather.ts';
import { Body, SearchRiseSet } from 'astronomy-engine';
import { observer } from '../lib/astronomy.ts';

let snapshot;
for (let attempt=1; attempt<=3; attempt++) {
  try { snapshot = await fetchWeather(); break; }
  catch (error) { console.error(`Weather fetch ${attempt}/3: ${error.message}`); if (attempt === 3) throw error; await new Promise(r => setTimeout(r, 2000 * attempt)); }
}
// Independent algorithmic cross-check of the provider's sunrise and sunset.
const date = snapshot.data.daily.time[0];
const start = new Date(`${date}T00:00:00+08:00`);
for (const [key, direction] of [['sunrise',1],['sunset',-1]]) {
  const calculated = SearchRiseSet(Body.Sun, observer, direction, start, 1)?.date;
  const supplied = weatherDate(snapshot.data.daily[key][0]);
  if (!calculated || Math.abs(+calculated - +supplied) > 5 * 60000) throw new Error(`Solar event cross-check failed: ${key}`);
}
const result = { ...snapshot, verification: { schema:'passed', solarCrossCheck:'within 5 minutes', sha256:createHash('sha256').update(JSON.stringify(snapshot.data)).digest('hex') } };
await mkdir('public/data', { recursive:true });
await writeFile('public/data/weather.json.tmp', JSON.stringify(result));
await rename('public/data/weather.json.tmp','public/data/weather.json');
console.log(`Saved verified Open-Meteo snapshot, valid ${snapshot.data.current.time} Asia/Shanghai; fetched ${snapshot.fetchedAt}`);
