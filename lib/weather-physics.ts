export function projectedWind(speedKmh: number, fromDegrees: number) {
  // View faces north; meteorological direction says where wind comes FROM.
  return -Math.sin(fromDegrees * Math.PI / 180) * speedKmh / 3.6;
}
export function stepParticle(p: { x:number; y:number; vx:number; vy:number; depth:number }, dt:number, wind:number, snow:boolean) {
  const step = Math.min(Math.max(dt,0), .05);
  const terminal = (snow ? 42 : 650) * p.depth;
  const gravity = (snow ? 70 : 1100) * p.depth;
  p.vx += (wind * 18 * p.depth - p.vx) * (1 - Math.exp(-2 * step));
  p.vy = terminal + (p.vy - terminal) * Math.exp(-gravity / terminal * step);
  p.x += p.vx * step; p.y += p.vy * step;
}
