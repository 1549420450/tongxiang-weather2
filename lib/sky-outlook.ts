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

export function glowEvent(data: WeatherData, kind:'sunrise'|'sunset', now:number) {
  const offset=kind==='sunrise'?[-30,20]:[-20,30];
  const event=data.daily[kind].find(t=>+weatherDate(t)+offset[1]*60000>=now);
  if (!event) return null;
  const time=+weatherDate(event);
  return {event,start:time+offset[0]*60000,end:time+offset[1]*60000,sample:skySample(data,time)};
}

export function upcomingGlowEvents(data: WeatherData, now:number) {
  return (['sunrise','sunset'] as const)
    .map(kind=>({kind,event:glowEvent(data,kind,now)}))
    .sort((a,b)=>(a.event?.start ?? Number.POSITIVE_INFINITY)-(b.event?.start ?? Number.POSITIVE_INFINITY));
}
