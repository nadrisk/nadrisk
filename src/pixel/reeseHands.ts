import type { Px } from "./draw";
export type HandSettings = { detune: number; drift: number; width: number; sub: number };
const clamp = (v: number) => Math.max(0, Math.min(1, v));
export function drawReeseHands(p: Px, r: HandSettings, energy = 0, reduced = false) {
  const level = clamp(energy), gap = 1 + Math.round(clamp(r.detune / 50) * 2);
  const origin = 19 - Math.round(clamp(r.width) * 9), kick = reduced ? 0 : Math.round(level * 2);
  for (let hand = 0; hand < 2; hand++) {
    const tilt = hand === 0 ? 0 : Math.round(clamp(r.drift) * 2);
    const point = (x: number, y: number): [number, number] => {
      const xx = origin + x;
      return [hand ? 127 - xx : xx, 16 + y - kick + Math.round(x / 35 * tilt)];
    };
    const line = (x: number, y: number, x2: number, y2: number, on = true) => {
      const a = point(x, y), b = point(x2, y2);
      if (on) p.line(...a, ...b);
      else {
        const n = Math.max(Math.abs(x2 - x), Math.abs(y2 - y));
        for (let i = 0; i <= n; i++) { const q = point(Math.round(x + (x2 - x) * i / (n || 1)), Math.round(y + (y2 - y) * i / (n || 1))); p.dot(...q, false); }
      }
    };
    const outline: [number, number][] = [[0,23],[0,18],[3,15],[3,8],[5,6],[8,6],[8,1],[10,0],[12,1],[13,8],[17,7],[32,2],[35,2],[35,4],[19,10],[20,10+gap],[33,6+gap],[35,6+gap],[35,8+gap],[20,14+gap],[19,18],[15,20],[13,23]];
    for (let y = 0; y <= 23; y++) {
      const xs: number[] = [];
      outline.forEach(([x1,y1], i) => { const [x2,y2] = outline[(i+1)%outline.length]; if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + (y-y1)*(x2-x1)/(y2-y1)); });
      xs.sort((a,b) => a-b);
      for (let i = 0; i+1 < xs.length; i+=2) line(Math.ceil(xs[i]),y,Math.floor(xs[i+1]),y);
    }
    outline.forEach((a,i) => { const b=outline[(i+1)%outline.length]; line(...a,...b); });
    line(2,20,13,20,false);
    line(5,11,8,13,false); line(8,13,8,16,false);
    line(11,12,12,15,false); line(15,12,16,15,false);
    line(10,7,11,9,false);
  }
  const bands = Math.round(clamp(r.sub) * 3), length = 5 + Math.round(level * 7);
  for (let i=0; i<bands; i++) {
    const y=40+i;
    p.line(62-length-i*3,y,59,y,level<.15);
    p.line(68,y,65+length+i*3,y,level<.15);
  }
}
export function reeseVisualLevel(samples: Float32Array, previous: number) {
  let sum=0;
  for (let i=0; i<samples.length; i++) sum+=samples[i]*samples[i];
  const target=clamp(Math.sqrt(sum/samples.length)*4);
  return target>previous ? previous+(target-previous)*.7 : previous*.72+target*.28;
}