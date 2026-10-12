import { describe, expect, it } from "vitest";
import { Px } from "./draw";
import { drawReeseHands, reeseVisualLevel } from "./reeseHands";

describe("REESE hands", () => {
  it("keeps every mark within the display inset at combined extremes", () => {
    for (const detune of [0,18,50]) for (const drift of [0,.3,1]) for (const width of [0,.6,1]) for (const sub of [0,.6,1]) for (const energy of [0,1]) {
      const points: number[][]=[];
      const p=new Px({ fillRect: (x:number,y:number) => points.push([x,y]) } as unknown as CanvasRenderingContext2D,"fg","bg");
      drawReeseHands(p,{detune,drift,width,sub},energy);
      expect(points.length).toBeGreaterThan(100);
      expect(points.every(([x,y]) => x>2 && x<125 && y>11 && y<44)).toBe(true);
    }
  });
  it("responds to sound and decays to silence without overshoot", () => {
    const b=new Float32Array(512).fill(.2);
    let level=reeseVisualLevel(b,0);
    expect(level).toBeGreaterThan(.5); expect(level).toBeLessThanOrEqual(1);
    b.fill(0); for(let i=0;i<30;i++) level=reeseVisualLevel(b,level);
    expect(level).toBeLessThan(.001);
  });
});