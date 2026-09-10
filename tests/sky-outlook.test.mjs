import test from 'node:test';
import assert from 'node:assert/strict';
import {glowScore,skySample,skyVerdict,glowEvent} from '../lib/sky-outlook.ts';
const sample={low:10,mid:40,high:60,visibility:20000,rain:10,code:2};
test('outlook rules handle favorable, blocked, clear and dangerous conditions',()=>{
  assert.equal(skyVerdict(sample).label,'值得留意');
  assert.equal(skyVerdict({...sample,low:80}).label,'条件受限');
  assert.equal(skyVerdict({...sample,mid:0,high:0}).label,'云霞载体偏少');
  assert.equal(skyVerdict({...sample,code:95}).label,'不宜外出拍摄');
});
test('color grades and rule probability remain bounded and transparent',()=>{
  const good=glowScore(sample);assert.equal(good.name,'火烧云级');assert.ok(good.probability<=100 && good.probability>=0);
  assert.equal(glowScore({...sample,low:100,visibility:1000,rain:100,code:95}).name,'冷灰蓝级');
});
const data={hourly:{time:['2026-09-10T06:00','2026-09-10T07:00'],cloud_cover_low:[10,20],cloud_cover_mid:[30,40],cloud_cover_high:[50,60],visibility:[20000,10000],precipitation_probability:[10,20],weather_code:[2,3]},daily:{sunrise:['2026-09-10T06:00','2026-09-11T06:00'],sunset:['2026-09-10T18:00']}};
test('missing and out of range values never become a favorable rating',()=>{
  const now=Date.parse('2026-09-10T06:20:00+08:00');
  assert.equal(skySample(data,now).low,10);
  const missing=structuredClone(data);missing.hourly.visibility[0]=null;
  assert.equal(skySample(missing,now),null);
  assert.equal(skySample(data,now+86400000),null);
});
test('past sunrise advances to next day, and its missing weather stays unavailable',()=>{
  const event=glowEvent(data,'sunrise',Date.parse('2026-09-10T12:00:00+08:00'));
  assert.equal(event.event,'2026-09-11T06:00');assert.equal(event.sample,null);
  assert.equal(event.end-event.start,50*60000);
});
