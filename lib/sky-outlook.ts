import { weatherDate, type WeatherData } from './weather.ts';

export function skySample(data: WeatherData, time: number) {
  const times = data.hourly.time.map(t => +weatherDate(t));
  let index = -1;
  for (let i=0;i<times.length;i++) if (index<0 || Math.abs(times[i]-time)<Math.abs(times[index]-time)) index=i;
  if (index<0 || Math.abs(times[index]-time)>30*60000) return null;
  const low=data.hourly.cloud_cover_low?.[index], mid=data.hourly.cloud_cover_mid?.[index], high=data.hourly.cloud_cover_high?.[index], visibility=data.hourly.visibility?.[index];
  if (![low,mid,high,visibility].every(v=>typeof v==='number' && Number.isFinite(v))) return null;
  return {time:data.hourly.time[index],low:low!,mid:mid!,high:high!,visibility:visibility!,rain:data.hourly.precipitation_probability[index],code:data.hourly.weather_code[index]};
}

// Local, uncalibrated planning rules, not a meteorological probability model.
export function skyVerdict(sample: NonNullable<ReturnType<typeof skySample>>) {
  if (sample.code>=95) return {label:'不宜外出拍摄',reason:'预报有雷暴，请优先关注官方预警，避免空旷及高处拍摄。'};
  if (sample.low>=70 || sample.visibility<5000 || sample.rain>=60 || [45,48].includes(sample.code)) return {label:'条件受限',reason:'低云遮挡、低能见度、雾或较高降水概率可能妨碍观赏霞光。'};
  if (Math.max(sample.mid,sample.high)<20) return {label:'云霞载体偏少',reason:'中高层云较少，可关注地平线色彩与日轮，但云霞层次可能较弱。'};
  if (sample.low<30 && sample.visibility>=10000 && sample.rain<30 && Math.max(sample.mid,sample.high)<=85) return {label:'值得留意',reason:'低云较少，且有一定中高层云，具备关注云霞的参考条件；仍需现场确认光路。'};
  return {label:'有待观察',reason:'云层与通透度条件混合，建议临近时段再看预报与地平线云况。'};
}

export function glowEvent(data: WeatherData, kind:'sunrise'|'sunset', now:number) {
  const offset=kind==='sunrise'?[-30,20]:[-20,30];
  const event=data.daily[kind].find(t=>+weatherDate(t)+offset[1]*60000>=now);
  if (!event) return null;
  const time=+weatherDate(event);
  return {event,start:time+offset[0]*60000,end:time+offset[1]*60000,sample:skySample(data,time)};
}
