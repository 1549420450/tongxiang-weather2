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

type GlowGrade = {score:number; probability:number; color:string; name:string; detail:string; tone:'ember'|'orange'|'rose'|'gold'|'blue'};
const clamp=(value:number,min=0,max=100)=>Math.min(max,Math.max(min,value));

/**
 * A transparent condition-matching index. "probability" is a rule output,
 * not a calibrated frequency of seeing a particular colour in the real sky.
 */
export function glowScore(sample: NonNullable<ReturnType<typeof skySample>>): GlowGrade {
  const upper=Math.max(sample.mid,sample.high);
  const upperScore=upper>=25&&upper<=75 ? 34 : upper<25 ? upper/25*18 : (100-upper)/25*22;
  const lowScore=sample.low<25 ? 22 : sample.low<55 ? 22-(sample.low-25)*.45 : Math.max(0,8-(sample.low-55)*.4);
  const visibilityScore=clamp((sample.visibility/1000-4)*1.05,0,18);
  const rainScore=clamp(16-sample.rain*.22,0,16);
  const stormPenalty=sample.code>=95 ? 75 : [45,48].includes(sample.code) ? 35 : 0;
  const score=Math.round(clamp(upperScore+lowScore+visibilityScore+rainScore-stormPenalty));
  const probability=Math.round(clamp(score*.9));
  if (score>=76) return {score,probability,color:'#ff6a3d',name:'火烧云级',detail:'云层、通透度与降水条件的匹配度较高，适合提早到场守候。',tone:'ember'};
  if (score>=58) return {score,probability,color:'#ff9d3f',name:'橙红霞级',detail:'存在较好的霞光条件，优先观察太阳方向的云隙。',tone:'orange'};
  if (score>=40) return {score,probability,color:'#de83bb',name:'粉紫霞级',detail:'具备一定色彩层次条件，但云层或通透度仍可能限制表现。',tone:'rose'};
  if (score>=22) return {score,probability,color:'#e7c56b',name:'金黄天际级',detail:'更适合关注日轮、地平线渐变和短暂金色光线。',tone:'gold'};
  return {score,probability,color:'#91b5db',name:'冷灰蓝级',detail:'当前条件与明显霞光的匹配度偏低，可关注蓝调时刻而非色彩霞光。',tone:'blue'};
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
