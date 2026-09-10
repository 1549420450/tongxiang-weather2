import { Cloud, Sunrise, Sunset } from 'lucide-react';
import type { CSSProperties } from 'react';
import { glowScore, upcomingGlowEvents, skySample, skyVerdict } from '../lib/sky-outlook';
import type { WeatherData } from '../lib/weather';

const stamp=(time:number)=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(time));
const clock=(time:number)=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(time));
function Layers({sample}:{sample:NonNullable<ReturnType<typeof skySample>>}) {
  return <div className="cloud-layers">{[['低层云',sample.low],['中层云',sample.mid],['高层云',sample.high]].map(([label,value])=><div key={label}><span>{label}</span><meter min={0} max={100} value={Number(value)} aria-label={`${label}覆盖率`}/><b>{value}%</b></div>)}</div>;
}
export default function SkyOutlook({data,now,stale}:{data:WeatherData;now:number;stale:boolean}) {
  const current=skySample(data,now);
  const events=upcomingGlowEvents(data,now);
  return <section className="glass-card sky-outlook" aria-labelledby="sky-title"><div className="section-heading"><div><p className="eyebrow">霞光与云层 · 摄影参考</p><h2 id="sky-title">朝霞晚霞与云况分析</h2></div><span>北京时间 · 规则估计</span></div>
    {stale?<p role="status">天气数据已过期，暂停霞光评价和云况分析，请刷新后查看。</p>:<>
      <div className="glow-grid">{events.map(({kind,event})=>{
        const sample=event?.sample;
        const verdict=sample?skyVerdict(sample):null,grade=sample?glowScore(sample):null,Icon=kind==='sunrise'?Sunrise:Sunset;
        return <article className="glow-item" key={kind}><h3><Icon size={20}/>{kind==='sunrise'?'下一场朝霞':'下一场晚霞'}</h3>{event?<><p className="glow-time">{stamp(event.start)}—{clock(event.end)}</p><small>建议守候窗口 · {kind==='sunrise'?'关注东方地平线':'关注西方地平线'}</small>{sample&&grade?<div className={`glow-score glow-${grade.tone}`} style={{'--glow-color':grade.color} as CSSProperties}><div><span>霞光条件评分</span><strong>{grade.score}<small>/100</small></strong></div><div><span>规则估计参考概率</span><b>{grade.probability}%</b></div></div>:null}<p className="glow-verdict">{grade?grade.name:(verdict?.label??'数据不足，暂不评价')}</p>{sample&&verdict&&grade?<><p>{grade.detail} {verdict.reason}</p><Layers sample={sample}/><p className="cloud-meta">能见度 {(sample.visibility/1000).toFixed(1)} km · 降水概率 {sample.rain}%</p><small>采用最接近日出/日落的逐小时预报：{sample.time.replace('T',' ')}（最多相差 30 分钟）</small></>:<p>所需分层云量或能见度缺失，不使用零值替代。</p>}</>:<p>预报范围内暂无可用日出日落时间。</p>}</article>;
      })}</div>
      <div className="cloud-summary"><h3><Cloud size={20}/>此时附近的云层预报</h3>{current?<><p>对应 {current.time.replace('T',' ')} · {current.low>=70?'低云覆盖较多，可能遮挡远景与上层云。':current.high>=50?'高层云覆盖较多，可能形成云层纹理，但不能据此判定具体云种。':current.mid>=50?'中层云覆盖较多，需留意云层厚度和光线变化。':'各层云量较分散，实际云隙请以现场观察为准。'}</p><Layers sample={current}/></>:<p>当前时段的分层云量或能见度不足，暂不分析。</p>}</div>
    </>}
    <details className="glow-method"><summary>评分、色级与局限</summary><p>守候窗口为日出前 30 分钟至后 20 分钟、日落前 20 分钟至后 30 分钟，是经验安排，不是霞光开始或结束时刻。</p><p>评分由中高层云适中程度（34 分）、低云遮挡（22 分）、能见度（18 分）、降水概率（16 分）构成；雷暴、雾会大幅扣分。色级依评分显示：76—100 火烧云、58—75 橙红霞、40—57 粉紫霞、22—39 金黄天际、0—21 冷灰蓝。</p><p>“规则估计参考概率”是评分 × 0.9 的条件匹配展示，未用历史照片与实际观测进行统计校准，不能解释为真实发生频率或保证；云层覆盖率也不能相加、不能识别卷云等具体云种。远处地平线遮挡、沿途云层、气溶胶与云光学厚度未纳入。</p><p>数据：<a href="https://open-meteo.com/en/docs">Open-Meteo 分层云量与能见度模型预报</a>；原理参考：<a href="https://www.weather.gov.hk/en/education/earth-science/optical-phenomena/00349-colours-of-clouds.html">香港天文台《云的颜色》</a>。参考资料解释光学现象，不为本网站规则背书。</p></details>
  </section>;
}
