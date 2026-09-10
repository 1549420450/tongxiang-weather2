import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateWeather, validateSnapshot, weatherLabel, weatherKind, weatherDate, isStale } from '../lib/weather.ts';
import { projectedWind, stepParticle } from '../lib/weather-physics.ts';
const snapshot=JSON.parse(await readFile(new URL('../public/data/weather.json',import.meta.url),'utf8'));

test('actual provider response passes the required field, unit, and coordinate checks',()=>{
  validateWeather(snapshot.data);
  assert.equal(snapshot.source,'Open-Meteo');
});
test('invalid values are rejected instead of becoming sunny or zero degrees',()=>{
  for(const change of [d=>{d.current.temperature_2m=null;},d=>{d.current.weather_code=4;},d=>{d.latitude=40;},d=>{d.current_units.wind_speed_10m='ms';},d=>{d.hourly.cloud_cover.pop();},d=>{d.daily.sunrise[0]='nonsense';},d=>{d.hourly.precipitation_probability[0]=null;}]) {
    const data=structuredClone(snapshot.data);change(data);assert.throws(()=>validateWeather(data));
  }
  assert.equal(weatherLabel(4),'未知天气');
  assert.equal(weatherKind(71),'snow');assert.equal(weatherKind(66),'rain');assert.equal(weatherKind(48),'fog');
});
test('staleness uses model valid time as well as download time',()=>{
  const copy=structuredClone(snapshot);const now=+weatherDate(copy.data.current.time);
  copy.fetchedAt=new Date(now).toISOString();assert.equal(isStale(copy,now),false);
  assert.equal(isStale(copy,now+46*60000),true);
  copy.fetchedAt=new Date(now+2*3600000).toISOString();assert.equal(isStale(copy,now+2*3600000),true);
  copy.sourceUrl='https://example.com';assert.throws(()=>validateSnapshot(copy));
});
test('wind direction and falling speed obey the intended physical approximation',()=>{
  assert.ok(projectedWind(36,90)<0);assert.ok(projectedWind(36,270)>0);assert.ok(projectedWind(0,0)===0);
  const simulate=(frames,snow)=>{const p={x:0,y:0,vx:0,vy:0,depth:1};for(let i=0;i<frames*10;i++)stepParticle(p,1/frames,4,snow);return p;};
  const a=simulate(60,false),b=simulate(30,false),snow=simulate(60,true);
  assert.ok(Math.abs(a.y-b.y)/a.y<.02);assert.ok(a.vy<=650);assert.ok(a.vy>640);assert.ok(snow.vy<=42);assert.ok(snow.y<a.y);
});
