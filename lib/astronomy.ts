import { Body, DefineStar, Equator, Horizon, Illumination, MoonPhase, Observer, SearchAltitude, SearchRiseSet } from 'astronomy-engine';

export const observer = new Observer(30.63287, 120.56081, 0);
// Galactic Centre / Sagittarius A*, J2000: NRAO 17:45:40.04, −29:00:28.17.
export const GALACTIC_CENTER = { ra: 17 + 45/60 + 40.04/3600, dec: -(29 + 28.17/3600) };
DefineStar(Body.Star1, GALACTIC_CENTER.ra, GALACTIC_CENTER.dec, 26000);
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
type HorizonPoint = { altitude:number; azimuth:number };
type Vector = { x:number; y:number; z:number };
const dot=(a:Vector,b:Vector)=>a.x*b.x+a.y*b.y+a.z*b.z;
const unit=(value:Vector):Vector|null=>{const length=Math.hypot(value.x,value.y,value.z);return length>1e-10?{x:value.x/length,y:value.y/length,z:value.z/length}:null;};
function horizonVector(point:HorizonPoint):Vector { const altitude=point.altitude*Math.PI/180,azimuth=point.azimuth*Math.PI/180; return {x:Math.cos(altitude)*Math.sin(azimuth),y:Math.cos(altitude)*Math.cos(azimuth),z:Math.sin(altitude)}; }
/** Position angle of the bright limb in the local sky, measured from screen-right toward screen-up. */
export function moonLimbAngle(moon:HorizonPoint,sun:HorizonPoint,fallbackPhase:number) {
  const m=horizonVector(moon),s=horizonVector(sun),towardSun=unit({x:s.x-m.x*dot(s,m),y:s.y-m.y*dot(s,m),z:s.z-m.z*dot(s,m)});
  const up=unit({x:-m.x*m.z,y:-m.y*m.z,z:1-m.z*m.z});
  if (!towardSun || !up) return fallbackPhase<180?0:Math.PI;
  const right={x:up.y*m.z-up.z*m.y,y:up.z*m.x-up.x*m.z,z:up.x*m.y-up.y*m.x};
  return Math.atan2(dot(towardSun,up),dot(towardSun,right));
}
/** Returns whether a visible point on the lunar disc is sunlit in the diagram's local-sky orientation. */
export function moonPointLit(x:number,y:number,illumination:number,limbAngle:number) {
  const radiusSquared=x*x+y*y;if(radiusSquared>1)return false;
  const z=Math.sqrt(1-radiusSquared),sunZ=Math.max(-1,Math.min(1,illumination*2-1));
  const tangent=Math.sqrt(Math.max(0,1-sunZ*sunZ));
  return x*Math.cos(limbAngle)*tangent+y*Math.sin(limbAngle)*tangent+z*sunZ>0;
}
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
  const moonIllumination = Illumination(Body.Moon, now).phase_fraction;
  const sunPosition = position(Body.Sun, now);
  const galaxySamples = timeline.map(slot => ({ ...position(Body.Star1, slot.time), time:slot.time, qualifies:false, sun:slot.sun }));
  for (const sample of galaxySamples) sample.qualifies=sample.altitude>=10 && sample.sun<=-18;
  const galaxyQualified=galaxySamples.filter(sample=>sample.qualifies);
  const galaxyBest=galaxyQualified.reduce<Sample|null>((peak,sample)=>!peak || sample.altitude>peak.altitude?sample:peak,null);
  const galaxyPosition=position(Body.Star1,now);
  return {
    date, computedAt: now, dusk, dawn, darkStart, darkEnd,
    moon: { phase, name: ['新月附近', '娥眉月', '上弦月附近', '盈凸月', '满月附近', '亏凸月', '下弦月附近', '残月'][phaseIndex], illumination: moonIllumination * 100, limbAngle: moonLimbAngle(moonPosition,sunPosition,phase), altitude: moonPosition.altitude, azimuth: moonPosition.azimuth, rise: SearchRiseSet(Body.Moon, observer, 1, midnight, 1)?.date ?? null, set: SearchRiseSet(Body.Moon, observer, -1, midnight, 1)?.date ?? null },
    galaxy: { altitude:galaxyPosition.altitude, azimuth:galaxyPosition.azimuth, windows:windows(galaxySamples), best:galaxyBest },
    moonless: windows(timeline.map(slot => ({ time: slot.time, qualifies: slot.sun <= -18 && slot.moon < -1 }))),
    planets: planetData.sort((a, b) => Number(b.windows.length > 0) - Number(a.windows.length > 0)),
  };
}
