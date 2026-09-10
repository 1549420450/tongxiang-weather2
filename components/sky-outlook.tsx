import { Cloud, Sunrise, Sunset } from 'lucide-react';
import { glowEvent, skySample, skyVerdict } from '../lib/sky-outlook';
import type { WeatherData } from '../lib/weather';

const stamp=(time:number)=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(time));
const clock=(time:number)=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(time));
function Layers({sample}:{sample:NonNullable<ReturnType<typeof skySample>>}) {
  return <div className="cloud-layers">{[['低层云',sample.low],['中层云',sample.mid],['高层云',sample.high]].map(([label,value])=><div key={label}><span>{label}</span><meter min={0} max={100} value={Number(value)} aria-label={`${label}覆盖率`}/><b>{value}%</b></div>)}</div>;
}
export default function SkyOutlook({data,now,stale}:{data:WeatherData;now:number;stale:boolean}) {
  const current=skySample(data,now);
  return <section className="glass-card sky-outlook" aria-labelledby="sky-title"><div className="section-heading"><div><p className="eyebrow">霞光与云层 · 摄影参考</p><h2 id="sky-title">朝霞晚霞与云况分析</h2></div><span>北京时间 · 非出霞概率</span></div>
    {stale?<p role="status">天气数据已过期，暂停霞光评价和云况分析，请刷新后查看。</p>:<>
      <div className="glow-grid">{(['sunrise','sunset'] as const).map(kind=>{
        const event=glowEvent(data,kind,now),sample=event?.sample;
        const verdict=sample?skyVerdict(sample):null,Icon=kind==='sunrise'?Sunrise:Sunset;
        return <article className="glow-item" key={kind}><h3><Icon size={20}/>{kind==='sunrise'?'下一场朝霞':'下一场晚霞'}</h3>{event?<><p className="glow-time">{stamp(event.start)}—{clock(event.end)}</p><small>建议守候窗口 · {kind==='sunrise'?'关注东方地平线':'关注西方地平线'}</small><p className="glow-verdict">{verdict?.label??'数据不足，暂不评价'}</p>{sample&&verdict?<><p>{verdict.reason}</p><Layers sample={sample}/><p className="cloud-meta">能见度 {(sample.visibility/1000).toFixed(1)} km · 降水概率 {sample.rain}%</p><small>采用最接近日出/日落的逐小时预报：{sample.time.replace('T',' ')}（最多相差 30 分钟）</small></>:<p>所需分层云量或能见度缺失，不使用零值替代。</p>}</>:<p>预报范围内暂无可用日出日落时间。</p>}</article>;
      })}</div>
      <div className="cloud-summary"><h3><Cloud size={20}/>此时附近的云层预报</h3>{current?<><p>对应 {current.time.replace('T',' ')} · {current.low>=70?'低云覆盖较多，可能遮挡远景与上层云。':current.high>=50?'高层云覆盖较多，可能形成云层纹理，但不能据此判定具体云种。':current.mid>=50?'中层云覆盖较多，需留意云层厚度和光线变化。':'各层云量较分散，实际云隙请以现场观察为准。'}</p><Layers sample={current}/></>:<p>当前时段的分层云量或能见度不足，暂不分析。</p>}</div>
    </>}
    <details className="glow-method"><summary>计算方法与局限</summary><p>守候窗口为日出前 30 分钟至后 20 分钟、日落前 20 分钟至后 30 分钟，是经验安排，不是霞光开始或结束时刻。评价使用本地未经统计校准的规则，不是官方预报，也不是发生概率。</p><p>规则优先提示雷暴；低云 ≥70%、能见度 &lt;5 km、降水概率 ≥60% 或雾判为条件受限。中高层云最大覆盖率 &lt;20% 判为载体偏少。低云 &lt;30%、能见度 ≥10 km、降水概率 &lt;30%、中高层云最大覆盖率 20%—85% 判为值得留意，其余为有待观察。</p><p>云层覆盖率不可相加，不能据此识别卷云等具体云种、云厚或云底高度。未纳入远处地平线遮挡、沿途云层、气溶胶与云光学厚度；即使条件较好，也可能没有霞光。</p><p>数据：<a href="https://open-meteo.com/en/docs">Open-Meteo 分层云量与能见度模型预报</a>；原理参考：<a href="https://www.weather.gov.hk/en/education/earth-science/optical-phenomena/00349-colours-of-clouds.html">香港天文台《云的颜色》</a>。参考资料解释光学现象，不为本网站规则背书。</p></details>
  </section>;
}
