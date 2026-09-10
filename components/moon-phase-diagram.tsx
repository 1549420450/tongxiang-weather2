'use client';

import { useEffect, useRef } from 'react';
import { moonPointLit } from '../lib/astronomy';

export default function MoonPhaseDiagram({illumination,limbAngle,label}:{illumination:number;limbAngle:number;label:string}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;
    const scale=Math.min(window.devicePixelRatio||1,2),size=132;
    canvas.width=size*scale;canvas.height=size*scale;
    const context=canvas.getContext('2d');if(!context)return;
    const image=context.createImageData(canvas.width,canvas.height),radius=canvas.width*.43,center=canvas.width/2;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
      const nx=(x-center)/radius,ny=(center-y)/radius,distance=nx*nx+ny*ny,index=(y*canvas.width+x)*4;
      if(distance>1){image.data[index+3]=0;continue;}
      const edge=Math.sqrt(Math.max(0,1-distance));
      const lit=moonPointLit(nx,ny,illumination,limbAngle);
      const shade=lit?Math.round(205+30*edge):Math.round(16+19*edge);
      image.data[index]=lit?shade:Math.round(shade*.54);image.data[index+1]=lit?shade:Math.round(shade*.66);image.data[index+2]=lit?Math.min(255,shade+13):shade+10;image.data[index+3]=255;
    }
    context.putImageData(image,0,0);
    context.strokeStyle='rgba(218,233,255,.42)';context.lineWidth=scale;context.beginPath();context.arc(center,center,radius,0,Math.PI*2);context.stroke();
  },[illumination,limbAngle]);
  return <canvas className="moon-phase-diagram" ref={ref} role="img" aria-label={`${label}，月面照亮比例 ${(illumination*100).toFixed(1)}%，亮面朝向依据桐乡当地太阳与月亮位置计算。`}>月相示意图</canvas>;
}
