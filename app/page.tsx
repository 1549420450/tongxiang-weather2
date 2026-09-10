'use client';

import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Droplets, Gauge, MapPin, Moon, RefreshCw, Sun, Sunrise, Sunset, Umbrella, Wind } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AstronomyPanel from '../components/astronomy-panel';
import WeatherScene from '../components/weather-scene';
import SkyOutlook from '../components/sky-outlook';
import { Switch } from '../components/ui/switch';
import { fetchWeather, isStale, validateSnapshot, weatherDate, weatherKind, weatherLabel, type Snapshot } from '../lib/weather';

const formatTime = (value:string) => new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(weatherDate(value));
const stamp = (value:string) => new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));
function WeatherIcon({code,day=true}:{code:number;day?:boolean}) {
  const kind=weatherKind(code);
  const Icon=code>=95?CloudLightning:kind==='rain'?CloudRain:kind==='snow'?CloudSnow:kind==='fog'?CloudFog:code===3?Cloud:code===0?(day?Sun:Moon):(day?CloudSun:Cloud);
  return <Icon aria-hidden="true" />;
}

export default function Home() {
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const [error,setError]=useState(''); const [loading,setLoading]=useState(true);
  const [paused,setPaused]=useState(false); const [clock,setClock]=useState(0);
  const [delivery,setDelivery]=useState('网站快照');
  const loadWeather=useCallback(async()=>{
    setLoading(true);setError('');let cached:Snapshot|null=null;
    try {
      try {
        const response=await fetch(`data/weather.json?t=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(8000)});
        if(!response.ok) throw new Error('No snapshot');
        const value:unknown=await response.json();validateSnapshot(value);cached=value;
        if(isStale(value)) throw new Error('Snapshot stale');
        setSnapshot(value);setDelivery('网站快照');
      } catch {
        const fresh=await fetchWeather();setSnapshot(fresh);setDelivery('直连接口');
      }
    } catch {
      if(cached){setSnapshot(cached);setDelivery('历史快照');}
      setError('更新失败。已有数据仅供参考，请留意有效时间；可稍后重试。');
    } finally {setLoading(false);setClock(Date.now());}
  },[]);
  useEffect(()=>{void loadWeather();const timer=setInterval(loadWeather,15*60000);return()=>clearInterval(timer);},[loadWeather]);
  useEffect(()=>{setClock(Date.now());const timer=setInterval(()=>setClock(Date.now()),60000);return()=>clearInterval(timer);},[]);
  const data=snapshot?.data;
  const today=new Date((clock||Date.now())+8*3600000).toISOString().slice(0,10);
  const dayIndex=data?.daily.time.indexOf(today)??-1;
  const hourly=useMemo(()=>{
    if(!data)return[];
    const start=data.hourly.time.findIndex(t=>+weatherDate(t)>=Math.floor((clock||Date.now())/3600000)*3600000);
    if(start<0)return[];
    return data.hourly.time.slice(start,start+12).map((time,i)=>({time,temperature:data.hourly.temperature_2m[start+i],rain:data.hourly.precipitation_probability[start+i],code:data.hourly.weather_code[start+i],day:data.hourly.is_day[start+i]===1,cloud:data.hourly.cloud_cover[start+i]}));
  },[data,clock]);
  const stale=snapshot?isStale(snapshot,clock||Date.now()):false;
  const sunrise=data&&dayIndex>=0?data.daily.sunrise[dayIndex]:null;
  const sunset=data&&dayIndex>=0?data.daily.sunset[dayIndex]:null;
  const daylightProgress=sunrise&&sunset?Math.min(100,Math.max(0,((clock-+weatherDate(sunrise))/(+weatherDate(sunset)-+weatherDate(sunrise)))*100)):0;

  return <main className="weather-shell cinematic">
    {data&&!stale&&<WeatherScene current={data.current} paused={paused} />}
    <div className="weather-content">
      <header className="topbar"><div><p className="eyebrow"><MapPin size={15}/>浙江 · 嘉兴</p><h1>桐乡天气</h1></div><div className="header-controls"><label className="motion-control">动态效果<Switch checked={!paused} onCheckedChange={v=>setPaused(!v)} aria-label="动态天气效果" /></label><button className="refresh" onClick={loadWeather} disabled={loading}><RefreshCw size={17} className={loading?'spinning':''}/>{loading?'更新中':'刷新'}</button></div></header>
      {data&&snapshot?<>
        <section className="hero" aria-labelledby="current-weather"><div><p className="update-time">数据有效 {stamp(`${data.current.time}+08:00`)} · 北京时间</p><div className="temperature-row"><strong>{Math.round(data.current.temperature_2m)}°</strong><span className="weather-glyph"><WeatherIcon code={data.current.weather_code} day={data.current.is_day===1}/></span></div><h2 id="current-weather">{weatherLabel(data.current.weather_code)}</h2><p>体感 {Math.round(data.current.apparent_temperature)}°{dayIndex>=0&&<> · 今日 {Math.round(data.daily.temperature_2m_min[dayIndex])}°—{Math.round(data.daily.temperature_2m_max[dayIndex])}°</>}</p><p className="scene-disclosure">实拍云层素材 · 天气驱动的物理近似动画，非桐乡实时影像</p></div><div className="now-stats"><div><Droplets/><span>湿度</span><b>{data.current.relative_humidity_2m}%</b></div><div><Wind/><span>风速 · 来向 {data.current.wind_direction_10m}°</span><b>{data.current.wind_speed_10m.toFixed(1)} km/h</b></div><div><Gauge/><span>云量 / 气压</span><b>{data.current.cloud_cover}% / {Math.round(data.current.surface_pressure)} hPa</b></div><div><Umbrella/><span>前 {data.current.interval/60} 分钟降水量</span><b>{data.current.precipitation} mm</b></div></div></section>
        <div className={`data-status ${stale?'data-stale':''}`} role="status"><span>{stale?'数据已过期 · 动画已停用':'来源：Open-Meteo 天气模型'}</span><span>{delivery} · 抓取 {stamp(snapshot.fetchedAt)}</span></div>
        {error&&<p className="inline-error" role="status">{error}</p>}
        <section className="glass-card sun-card" aria-labelledby="sun-title"><div className="section-heading"><div><p className="eyebrow">今日昼夜</p><h2 id="sun-title">日出与日落</h2></div><span>{sunrise&&sunset?'北京时间':'今日数据尚未更新'}</span></div>{sunrise&&sunset&&<><div className="sun-track"><i style={{left:`${daylightProgress}%`}}/></div><div className="sun-times"><div><Sunrise/><span>日出</span><b>{formatTime(sunrise)}</b></div><div><Sunset/><span>日落</span><b>{formatTime(sunset)}</b></div></div></>}</section>
        <SkyOutlook data={data} now={clock||Date.now()} stale={stale}/>
        <section className="glass-card" aria-labelledby="hourly-title"><div className="section-heading"><div><p className="eyebrow">天气与拍摄条件</p><h2 id="hourly-title">未来 12 小时</h2></div><span>降雨概率 · 云量</span></div><div className="hourly-list">{hourly.map(item=><article className="hour-item" key={item.time}><span>{formatTime(item.time)}</span><WeatherIcon code={item.code} day={item.day}/><b>{Math.round(item.temperature)}°</b><small>雨 {item.rain}%</small><small>云 {item.cloud}%</small></article>)}</div>{!hourly.length&&<p>暂无有效逐小时数据，请刷新。</p>}</section>
        <section className="glass-card" aria-labelledby="daily-title"><div className="section-heading"><div><p className="eyebrow">一周安排</p><h2 id="daily-title">7 日预报</h2></div></div><div className="daily-list">{data.daily.time.map((day,i)=><article className="day-row" key={day}><b>{day===today?'今天':new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric'}).format(new Date(`${day}T12:00:00+08:00`))}</b><span className="day-condition"><WeatherIcon code={data.daily.weather_code[i]}/>{weatherLabel(data.daily.weather_code[i])}</span><span className="rain-chance"><Umbrella size={15}/>{data.daily.precipitation_probability_max[i]}%</span><span><strong>{Math.round(data.daily.temperature_2m_max[i])}°</strong> / {Math.round(data.daily.temperature_2m_min[i])}°</span></article>)}</div></section>
      </>:<section className="loading-card" role="status"><Cloud size={38}/><h2>{loading?'正在获取桐乡天气':'天气数据暂不可用'}</h2><p>{loading?'正在读取真实数据，请稍候。':error}</p><p>下方天文数据独立计算，不受天气接口影响。</p></section>}
      <AstronomyPanel/>
      <details className="source-details"><summary>数据来源、素材与更新说明</summary><p>天气来自 <a href="https://open-meteo.com/en/docs">Open-Meteo</a> 官方接口，属于模型估算与预报，不是本地气象站实测。有效时间表示模型对应时刻，抓取时间表示本网站读取接口的时刻。缺失数值不会用演示数据填充。</p><p>GitHub Actions 配置每 15 分钟抓取并校验数据，成功后发布快照。平台调度可能延迟；抓取超过 45 分钟或当前天气超过 90 分钟会提示过期，页面尝试直连接口。网站的真实部署状态以仓库 Actions 记录为准。</p><p>天空素材：<a href="https://commons.wikimedia.org/wiki/File:Quill-shaped_cirrus_cloud.jpg">W.carter / 羽毛状卷云</a>、<a href="https://commons.wikimedia.org/wiki/File:Storm_clouds_and_clear_sky.jpg">Cristian Butacu / 风暴云</a>，均为 CC0 实拍照片。素材与模拟用于表现天气氛围，不是当地实时影像。画面假定朝北，风向投影仅用于运动示意；地面风不等于高空云层风。</p></details>
      <footer><a href="https://open-meteo.com/">Weather data by Open-Meteo · CC BY 4.0</a><span>桐乡参考坐标 30.63287°N / 120.56081°E</span></footer>
    </div>
  </main>;
}
