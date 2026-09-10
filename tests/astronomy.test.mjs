import assert from 'node:assert/strict';
import test from 'node:test';
import { Body } from 'astronomy-engine';
import { calculateSky, localDate, chinaTime, eventTime, position, STEP } from '../lib/astronomy.ts';

test('Beijing date and midnight formatting do not use the device timezone', () => {
  const date = new Date('2026-09-09T16:01:00Z');
  assert.equal(localDate(date), '2026-09-10');
  assert.equal(chinaTime(date), '00:01');
  assert.equal(eventTime(date, '2026-09-09'), '次日 00:01');
});
test('April 2024 new and full moons have the expected illumination', () => {
  assert.ok(calculateSky(new Date('2024-04-08T18:21:00Z')).moon.illumination < 0.1);
  assert.ok(calculateSky(new Date('2024-04-23T23:49:00Z')).moon.illumination > 99.8);
});
test('seasonal windows satisfy night and altitude criteria', () => {
  for (const date of ['2026-03-20', '2026-06-21', '2026-09-09', '2026-12-21']) {
    const sky = calculateSky(new Date(`${date}T12:00:00+08:00`));
    assert.equal(sky.planets.length, 7);
    assert.equal(new Set(sky.planets.map(p => p.body)).size, 7);
    assert.ok(sky.dusk < sky.darkStart && sky.darkStart < sky.darkEnd && sky.darkEnd < sky.dawn);
    for (const event of [sky.moon.rise, sky.moon.set]) if (event) assert.equal(localDate(event), date);
    for (const planet of sky.planets) {
      const limit = [Body.Uranus, Body.Neptune].includes(planet.body) ? -18 : -6;
      for (const window of planet.windows) {
        assert.ok(window.start >= sky.dusk && window.end <= sky.dawn);
        assert.ok(window.end - window.start >= STEP);
        for (let time = +window.start; time <= +window.end; time += STEP) {
          assert.ok(position(planet.body, new Date(time)).altitude >= 10);
          assert.ok(position(Body.Sun, new Date(time), false).altitude <= limit);
        }
      }
      if (planet.windows.length) {
        assert.ok(planet.best.altitude >= 10);
        assert.ok(planet.best.azimuth >= 0 && planet.best.azimuth < 360);
        assert.ok(Number.isFinite(planet.magnitude));
      }
    }
    for (const window of sky.moonless) {
      assert.ok(window.start >= sky.darkStart && window.end <= sky.darkEnd);
      assert.ok(position(Body.Moon, window.start).altitude < -1);
    }
  }
});
test('missing daily moon events are not replaced by tomorrow events', () => {
  let missing = false;
  for (let day = 1; day <= 31; day++) {
    const sky = calculateSky(new Date(`2026-10-${String(day).padStart(2, '0')}T12:00:00+08:00`));
    if (!sky.moon.rise || !sky.moon.set) missing = true;
  }
  assert.ok(missing);
  assert.equal(eventTime(null, '2026-10-01'), '当日无此事件');
});
