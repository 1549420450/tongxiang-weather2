'use client';

import { useEffect, useState } from 'react';
import { calculateSky, chinaTime, direction, eventTime, type Window } from '../lib/astronomy';

export default function AstronomyPanel() {
  const [sky, setSky] = useState<ReturnType<typeof calculateSky> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const update = () => { try { setSky(calculateSky(new Date())); setFailed(false); } catch { setFailed(true); } };
    update();
    const timer = window.setInterval(update, 5 * 60000);
    return () => window.clearInterval(timer);
  }, []);
  if (!sky) return <section className="glass-card" role="status">{failed ? '天文计算暂时失败，请刷新页面重试。' : '正在计算桐乡今晚的星空…'}</section>;
  const time = (value: Date | null) => eventTime(value, sky.date);
  const range = (value: Window) => `${time(value.start)}—${time(value.end)}`;
  const visible = sky.planets.filter(p => p.windows.length > 0).length;

  return <section className="astro-panel" aria-labelledby="astronomy-title">
    <header className="astro-heading"><div><p className="eyebrow">桐乡 · 天文摄影</p><h2 id="astronomy-title">今晚，抬头看什么</h2><p>{sky.date} 傍晚至次日清晨 · 北京时间</p></div><span className="astro-badge">{visible} 颗行星有观测窗口</span></header>
    {failed && <p role="status">更新暂时失败，以下为 {chinaTime(sky.computedAt)} 的计算。</p>}
    <div className="astro-overview">
      <article className="astro-moon"><span className="moon-symbol" role="img" aria-label={sky.moon.name}>{sky.moon.icon}</span><div><p className="eyebrow">此刻月相</p><h3>{sky.moon.name}</h3><p>照亮比例 <strong>{sky.moon.illumination.toFixed(1)}%</strong></p><p className="astro-muted">示意图，非实时照片或实际旋转方向</p></div></article>
      <dl className="astro-facts"><div><dt>今日月出</dt><dd>{time(sky.moon.rise)}</dd></div><div><dt>今日月落</dt><dd>{time(sky.moon.set)}</dd></div><div><dt>月亮当前高度</dt><dd>{sky.moon.altitude.toFixed(0)}° · {sky.moon.altitude < 0 ? '地平线以下' : direction(sky.moon.azimuth)}</dd></div><div><dt>天文黑夜</dt><dd>{sky.darkStart && sky.darkEnd ? `${time(sky.darkStart)}—${time(sky.darkEnd)}` : '本夜无完整天文黑夜'}</dd></div></dl>
    </div>
    <div className="moonless-note"><strong>避开月光拍星空</strong><span>{sky.moonless.length ? sky.moonless.map(range).join('、') : '本夜没有同时满足天文黑夜且月亮落下的时段。'}</span><p>以上时段太阳低于 −18°、月亮低于 −1°；仍需选择云少、远离路灯的机位。</p></div>
    <div className="planet-grid">{sky.planets.map(planet => <article className={`planet-card ${planet.windows.length ? '' : 'planet-unavailable'}`} key={planet.body}>
      <header><h3>{planet.name}</h3><span className="planet-status">{planet.windows.length ? '有观测窗口' : '本夜无推荐窗口'}</span></header>
      {planet.best && planet.windows.length ? <><p className="planet-time">{planet.windows.map(range).join(' / ')}</p><dl><div><dt>窗口内最高位置</dt><dd>{time(planet.best.time)} · 高度 {planet.best.altitude.toFixed(0)}°</dd></div><div><dt>届时方位</dt><dd>{direction(planet.best.azimuth)} · {planet.best.azimuth.toFixed(0)}°</dd></div><div><dt>预测视星等</dt><dd>{planet.magnitude.toFixed(1)}</dd></div></dl></> : <p className="planet-empty">未找到天色够暗且高度 ≥10°、持续至少 5 分钟的时段。</p>}
      <p className="equipment-note">{planet.equipment}</p>
    </article>)}</div>
    <details className="astro-method"><summary>观测条件与计算依据</summary><p>这是几何观测机会，不代表一定能看见。水星至土星要求太阳低于 −6°，天王星和海王星要求低于 −18°，同时行星高度至少 10°。按 5 分钟步长筛选，窗口与最高位置时间约有 5 分钟分辨率。星等越小越亮。</p><p>方位角从正北 0° 顺时针计算，正东 90°、正南 180°。月出月落按今日 00:00—24:00 计算；没有事件时明确标注，月落可能早于月出。低空目标易受建筑、薄雾及光污染影响，适合拍摄的实际时段还需结合云量和视宁度。不要用望远镜或长焦直接搜索太阳附近的目标。</p><p>位置为桐乡市中心 30.63287°N / 120.56081°E，计算海拔 0 米。<a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noreferrer">Astronomy Engine</a> 天文计算 · {chinaTime(sky.computedAt)} 更新 · 每 5 分钟重算。</p></details>
  </section>;
}
