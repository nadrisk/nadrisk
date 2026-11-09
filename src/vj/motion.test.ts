import { beforeAll, describe, expect, it, vi } from "vitest";
beforeAll(() => { vi.stubGlobal("ImageData", class { data: Uint8ClampedArray; constructor(w: number, h: number) { this.data = new Uint8ClampedArray(w * h * 4); } }); vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null); });
import { VjEngine } from "./engine";
const cv = () => Object.assign(document.createElement("canvas"), {});
const tick = (e: VjEngine, n: number) => { for (let i = 0; i < n; i++) e.frame(cv(), 0, 0, 1 / 60); };

describe("AV kick/snare physics", () => {
  it("kick adds spin speed that decays back", () => {
    const e = new VjEngine(); e.hit("kick", 1); expect(e.spinVel).toBeGreaterThan(2);
    tick(e, 180); expect(e.spinVel).toBeLessThan(.2);
  });
  it("snare pops scale then returns, and tilts the angle", () => {
    const e = new VjEngine(); e.hit("snare", 1); expect(e.pop).toBe(1);
    tick(e, 60); expect(e.pop).toBeLessThan(.01); expect(Math.abs(e.tilt)).toBeGreaterThan(.25);
  });
  it("bass does not move anything", () => {
    const e = new VjEngine(); e.hit("bass", 1); expect(e.spinVel).toBe(0); expect(e.travelVel).toBe(0);
  });
});
