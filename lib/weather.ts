export const LATITUDE = 30.63287;
export const LONGITUDE = 120.56081;
export const API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover,is_day&hourly=temperature_2m,precipitation_probability,weather_code,is_day,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=Asia%2FShanghai&forecast_days=7&wind_speed_unit=kmh`;
export const labels: Record<number, string> = { 0:'晴朗',1:'晴间少云',2:'局部多云',3:'阴天',45:'雾',48:'雾凇',51:'轻毛毛雨',53:'毛毛雨',55:'强毛毛雨',56:'轻冻毛毛雨',57:'强冻毛毛雨',61:'小雨',63:'中雨',65:'大雨',66:'轻冻雨',67:'强冻雨',71:'小雪',73:'中雪',75:'大雪',77:'雪粒',80:'小阵雨',81:'中阵雨',82:'强阵雨',85:'小阵雪',86:'强阵雪',95:'雷暴',96:'雷暴伴小冰雹',99:'雷暴伴大冰雹' };
export const weatherDate = (value: string) => new Date(`${value}+08:00`);
export const weatherLabel = (code: number) => labels[code] ?? '未知天气';
export const weatherKind = (code: number) => [71,73,75,77,85,86].includes(code) ? 'snow' : [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code) ? 'rain' : [45,48].includes(code) ? 'fog' : code === 0 ? 'clear' : 'cloud';
export type WeatherData = {
  latitude: number; longitude: number; timezone: string;
  current: { time: string; interval: number; temperature_2m: number; relative_humidity_2m: number; apparent_temperature: number; precipitation: number; weather_code: number; surface_pressure: number; wind_speed_10m: number; wind_direction_10m: number; cloud_cover: number; is_day: number };
  current_units: Record<string, string>;
  hourly: { time: string[]; temperature_2m: number[]; precipitation_probability: number[]; weather_code: number[]; is_day: number[]; cloud_cover: number[]; cloud_cover_low?: (number|null)[]; cloud_cover_mid?: (number|null)[]; cloud_cover_high?: (number|null)[]; visibility?: (number|null)[] };
  hourly_units?: Record<string,string>;
  daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; sunrise: string[]; sunset: string[] };
};
export type Snapshot = { fetchedAt: string; source: 'Open-Meteo'; sourceUrl: string; data: WeatherData };
function check(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function number(value: unknown, min: number, max: number) { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max; }
export function validateWeather(input: unknown): asserts input is WeatherData {
  check(input && typeof input === 'object', 'Missing weather response');
  const data = input as WeatherData;
  check(number(data.latitude, LATITUDE - .3, LATITUDE + .3) && number(data.longitude, LONGITUDE - .3, LONGITUDE + .3), 'Wrong forecast grid location');
  check(data.timezone === 'Asia/Shanghai', 'Wrong timezone');
  check(data.current && data.hourly && data.daily, 'Missing weather sections');
  const c = data.current;
  check(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(c.time) && Number.isFinite(+weatherDate(c.time)), 'Invalid valid time');
  const ranges = { temperature_2m:[-90,65], apparent_temperature:[-120,90], relative_humidity_2m:[0,100], precipitation:[0,500], surface_pressure:[700,1100], wind_speed_10m:[0,500], wind_direction_10m:[0,360], cloud_cover:[0,100], interval:[1,3600] };
  for (const [key, [min,max]] of Object.entries(ranges)) check(number(c[key as keyof typeof c], min, max), `Missing or invalid ${key}`);
  check((c.is_day === 0 || c.is_day === 1) && Object.hasOwn(labels, c.weather_code), 'Invalid weather code or daylight flag');
  check(data.current_units?.temperature_2m === '°C' && data.current_units?.wind_speed_10m === 'km/h' && data.current_units?.precipitation === 'mm' && data.current_units?.surface_pressure === 'hPa', 'Unexpected units');
  check(Array.isArray(data.hourly.time) && data.hourly.time.length >= 24, 'Missing hourly data');
  for (const key of ['temperature_2m','precipitation_probability','weather_code','is_day','cloud_cover'] as const) {
    const values = data.hourly[key];
    check(Array.isArray(values) && values.length === data.hourly.time.length && values.every(v => typeof v === 'number' && Number.isFinite(v)), `Invalid hourly ${key}`);
  }
  check(data.hourly.precipitation_probability.every(v => number(v,0,100)) && data.hourly.cloud_cover.every(v => number(v,0,100)) && data.hourly.weather_code.every(v => Object.hasOwn(labels,v)) && data.hourly.is_day.every(v => v === 0 || v === 1), 'Invalid hourly conditions');
  check(Array.isArray(data.daily.time) && data.daily.time.length === 7, 'Expected seven daily forecasts');
  for (const key of ['cloud_cover_low','cloud_cover_mid','cloud_cover_high','visibility'] as const) {
    const values = data.hourly[key];
    if (values !== undefined) {
      check(Array.isArray(values) && values.length === data.hourly.time.length && values.every(v => v === null || number(v,0,key === 'visibility' ? 1000000 : 100)), `Invalid hourly ${key}`);
      check(data.hourly_units?.[key] === (key === 'visibility' ? 'm' : '%'), `Unexpected ${key} units`);
    }
  }
  for (const key of ['temperature_2m_max','temperature_2m_min','precipitation_probability_max','weather_code','sunrise','sunset'] as const) check(Array.isArray(data.daily[key]) && data.daily[key].length === 7, `Missing daily ${key}`);
  for (let i = 0; i < 7; i++) {
    check(number(data.daily.temperature_2m_min[i],-90,65) && number(data.daily.temperature_2m_max[i],data.daily.temperature_2m_min[i],65), 'Invalid daily temperatures');
    check(Object.hasOwn(labels,data.daily.weather_code[i]) && number(data.daily.precipitation_probability_max[i],0,100), 'Invalid daily conditions');
    check(Number.isFinite(+weatherDate(data.daily.sunrise[i])) && weatherDate(data.daily.sunrise[i]) < weatherDate(data.daily.sunset[i]), 'Invalid solar events');
  }
  check(data.hourly.time.every((t,i,a) => Number.isFinite(+weatherDate(t)) && (i === 0 || +weatherDate(t) - +weatherDate(a[i-1]) === 3600000)), 'Invalid hourly timeline');
}
export const isStale = (snapshot: Snapshot, now = Date.now()) => now - +new Date(snapshot.fetchedAt) > 45 * 60000 || now - +weatherDate(snapshot.data.current.time) > 90 * 60000;
export function validateSnapshot(input: unknown): asserts input is Snapshot {
  const value = input as Snapshot;
  check(value?.source === 'Open-Meteo' && value.sourceUrl === API_URL && Number.isFinite(+new Date(value.fetchedAt)), 'Invalid source metadata');
  check(+new Date(value.fetchedAt) <= Date.now() + 5 * 60000, 'Snapshot timestamp in the future');
  validateWeather(value.data);
}
export async function fetchWeather(): Promise<Snapshot> {
  const response = await fetch(API_URL, { signal: AbortSignal.timeout(20000), cache:'no-store' });
  check(response.ok, `Weather HTTP ${response.status}`);
  const data: unknown = await response.json(); validateWeather(data);
  const age = Date.now() - +weatherDate(data.current.time);
  check(age >= -30 * 60000 && age <= 3 * 3600000, 'Upstream current conditions are stale or in the future');
  return { fetchedAt: new Date().toISOString(), source:'Open-Meteo', sourceUrl:API_URL, data };
}
