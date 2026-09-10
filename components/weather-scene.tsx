'use client';
import { useEffect, useRef } from 'react';
import { weatherKind, type WeatherData } from '../lib/weather';
import { projectedWind, stepParticle } from '../lib/weather-physics';

export default function WeatherScene({ current, paused }: { current: WeatherData['current']; paused:boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current; if (!element) return;
    const ctx = element.getContext('2d'); if (!ctx) return;
    let width = 1, height = 1, frame = 0, previous = 0, elapsed = 0, disposed = false;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const kind = weatherKind(current.weather_code), snow = kind === 'snow';
    const wind = projectedWind(current.wind_speed_10m, current.wind_direction_10m);
    const photo = new Image(); photo.src = `assets/${current.cloud_cover > 65 || kind === 'rain' || snow ? 'storm' : 'cirrus'}.jpg`;
    type Particle = { x:number; y:number; vx:number; vy:number; depth:number };
    const particles: Particle[] = [], splashes: { x:number;y:number;vx:number;vy:number;life:number }[] = [];
    const reset = (p:Particle, spread = false) => { p.x = Math.random() * (width+400)-200; p.y = spread ? Math.random()*height : -30; p.depth=.35+Math.random()*.65; p.vx = wind*18*p.depth; p.vy=(snow?30:400)*p.depth; };
    const resize = () => {
      width=element.clientWidth; height=element.clientHeight; const dpr=Math.min(devicePixelRatio || 1,1.5);
      element.width=width*dpr; element.height=height*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
      particles.length=0;
      const count=kind === 'rain' || snow ? Math.min(180,Math.round(width/12 + current.precipitation*25)) : 0;
      for(let i=0;i<count;i++){const p={x:0,y:0,vx:0,vy:0,depth:1};reset(p,true);particles.push(p);}
      draw(0);
    };
    function draw(dt:number) {
      if (!ctx) return;
      ctx.fillStyle=current.is_day ? '#345575' : '#101b31'; ctx.fillRect(0,0,width,height);
      if(photo.complete && photo.naturalWidth) {
        const cropHeight = photo.naturalHeight * (photo.src.includes('storm') ? .53 : 1);
        const scale=Math.max(width/photo.naturalWidth,height/cropHeight)*1.1;
        const drift=Math.sin(elapsed/45)*Math.min(30,Math.abs(wind)*3+3);
        ctx.globalAlpha=current.is_day ? .88 : .28;
        ctx.drawImage(photo,0,0,photo.naturalWidth,cropHeight,(width-photo.naturalWidth*scale)/2+drift,(height-cropHeight*scale)/2,photo.naturalWidth*scale,cropHeight*scale);
        ctx.globalAlpha=1;
      }
      const shade=ctx.createLinearGradient(0,0,0,height);
      shade.addColorStop(0,current.is_day?'rgba(9,25,43,.25)':'rgba(6,14,30,.4)'); shade.addColorStop(.5,'rgba(10,25,43,.45)'); shade.addColorStop(1,'#0d1a2b');ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
      if(kind === 'fog') {ctx.fillStyle='rgba(180,194,201,.16)';ctx.fillRect(0,0,width,height);}
      for(const p of particles) {
        if(dt) stepParticle(p,dt,wind,snow);
        if(p.y>height-15) {
          if(!snow && splashes.length<70) for(let j=0;j<2;j++) splashes.push({x:p.x,y:height-15,vx:(j?1:-1)*(25+Math.random()*45),vy:-25-Math.random()*40,life:.3});
          reset(p);
        }
        if(p.x < -200 || p.x > width+200) reset(p);
        ctx.strokeStyle=`rgba(221,238,255,${.15+p.depth*.4})`;ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=p.depth*1.5;
        ctx.beginPath();
        if(snow){ctx.arc(p.x+Math.sin(elapsed+p.depth*20)*8,p.y,1+p.depth*2,0,Math.PI*2);ctx.fill();}
        else {ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.025,p.y-p.vy*.025);ctx.stroke();}
      }
      for(let i=splashes.length-1;i>=0;i--){const s=splashes[i];s.life-=dt;s.vy+=220*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;if(s.life<=0){splashes.splice(i,1);continue;}ctx.fillStyle=`rgba(207,229,249,${s.life})`;ctx.fillRect(s.x,s.y,2,1);}
    }
    const tick = (timestamp:number) => { if(disposed) return; const dt=previous?Math.min((timestamp-previous)/1000,.05):0;previous=timestamp;elapsed+=dt;draw(dt);frame=requestAnimationFrame(tick); };
    const restart = () => { cancelAnimationFrame(frame);previous=0;if(!paused&&!reduced.matches&&!document.hidden) frame=requestAnimationFrame(tick);else draw(0); };
    const observer=new ResizeObserver(resize);observer.observe(element);photo.onload=()=>{draw(0);};
    document.addEventListener('visibilitychange',restart);reduced.addEventListener('change',restart);restart();
    return ()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();photo.onload=null;document.removeEventListener('visibilitychange',restart);reduced.removeEventListener('change',restart);};
  },[current,paused]);
  return <canvas ref={canvas} className="weather-canvas" aria-hidden="true" />;
}
