import { Body, Equator, Horizon, Illumination, MoonPhase, Observer, SearchAltitude, SearchRiseSet } from 'astronomy-engine';

export const observer = new Observer(30.63287, 120.56081, 0);
const DAY = 86400000;
export const STEP = 5 * 60000;
export const localDate = (date: Date) => new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 10);
export const chinaTime = (date: Date) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
export function eventTime(date: Date | null, base: string) {
  if (!date) return '当日无此事件';
  return `${localDate(date) > base ? '次日 ' : localDate(date) < base ? '前日 ' : ''}${chinaTime(date)}`;
}
export function position(body: Body, date: Date, apparent = true) {
  const equator = Equator(body, date, observer, true, true);
  return Horizon(date, observer, equator.ra, equator.dec, apparent ? 'normal' : undefined);
}
export const direction = (azimuth: number) => ['北', '东北', '东', '东南', '南', '西南', '西', '西北'][Math.round(azimuth / 45) % 8];
type Sample = { time: Date; altitude: number; azimuth: number };
export type Window = { start: Date; end: Date };
function windows(samples: { time: Date; qualifies: boolean }[]) {
  const result: Window[] = [];
  let start: Date | null = null;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].qualifies && !start) start = samples[i].time;
    if (start && (!samples[i].qualifies || i === samples.length - 1)) {
      // Keep boundaries inside qualifying samples, rather than overstating visibility.
      const end = samples[samples[i].qualifies ? i : i - 1].time;
      if (end > start) result.push({ start, end });
      start = null;
    }
  }
  return result;
}
const planets = [
  { body: Body.Mercury, name: '水星', equipment: '低空目标，长焦辅助定位' },
  { body: Body.Venus, name: '金星', equipment: '可尝试肉眼；长焦拍摄相位' },
  { body: Body.Mars, name: '火星', equipment: '可尝试肉眼；细节需望远镜' },
  { body: Body.Jupiter, name: '木星', equipment: '可尝试肉眼；长焦或望远镜拍摄' },
  { body: Body.Saturn, name: '土星', equipment: '可尝试肉眼；拍摄光环需望远镜' },
  { body: Body.Uranus, name: '天王星', equipment: '建议望远镜与星图定位' },
  { body: Body.Neptune, name: '海王星', equipment: '需望远镜与星图定位' },
];

export function calculateSky(now: Date) {
  const date = localDate(now);
  const midnight = new Date(`${date}T00:00:00+08:00`);
  const noon = new Date(midnight.getTime() + DAY / 2);
  // A night is today's evening through tomorrow's dawn, regardless of device timezone.
  const dusk = SearchAltitude(Body.Sun, observer, -1, noon, 1, -6)?.date ?? null;
  const dawn = dusk ? SearchAltitude(Body.Sun, observer, 1, dusk, 1, -6)?.date ?? null : null;
  const darkStart = SearchAltitude(Body.Sun, observer, -1, noon, 1, -18)?.date ?? null;
  const darkEnd = darkStart ? SearchAltitude(Body.Sun, observer, 1, darkStart, 1, -18)?.date ?? null : null;
  const timeline: { time: Date; sun: number; moon: number }[] = [];
  if (dusk && dawn) for (let time = dusk.getTime(); time <= dawn.getTime(); time += STEP) {
    const instant = new Date(time);
    timeline.push({ time: instant, sun: position(Body.Sun, instant, false).altitude, moon: position(Body.Moon, instant).altitude });
  }
  const planetData = planets.map(planet => {
    // Fainter outer planets require astronomical darkness; brighter ones allow twilight.
    const sunLimit = planet.body === Body.Uranus || planet.body === Body.Neptune ? -18 : -6;
    const samples = timeline.map(slot => ({ ...position(planet.body, slot.time), time: slot.time, qualifies: false, sun: slot.sun }));
    for (const sample of samples) sample.qualifies = sample.altitude >= 10 && sample.sun <= sunLimit;
    const qualified = samples.filter(s => s.qualifies);
    const best: Sample | null = qualified.reduce<Sample | null>((peak, sample) => !peak || sample.altitude > peak.altitude ? sample : peak, null);
    return { ...planet, windows: windows(samples), best, magnitude: Illumination(planet.body, best?.time ?? now).mag };
  });
  const phase = MoonPhase(now);
  const phaseIndex = Math.floor((phase + 22.5) / 45) % 8;
  const moonPosition = position(Body.Moon, now);
  return {
    date, computedAt: now, dusk, dawn, darkStart, darkEnd,
    moon: { phase, name: ['新月附近', '娥眉月', '上弦月附近', '盈凸月', '满月附近', '亏凸月', '下弦月附近', '残月'][phaseIndex], icon: ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'][phaseIndex], illumination: Illumination(Body.Moon, now).phase_fraction * 100, altitude: moonPosition.altitude, azimuth: moonPosition.azimuth, rise: SearchRiseSet(Body.Moon, observer, 1, midnight, 1)?.date ?? null, set: SearchRiseSet(Body.Moon, observer, -1, midnight, 1)?.date ?? null },
    moonless: windows(timeline.map(slot => ({ time: slot.time, qualifies: slot.sun <= -18 && slot.moon < -1 }))),
    planets: planetData.sort((a, b) => Number(b.windows.length > 0) - Number(a.windows.length > 0)),
  };
}
