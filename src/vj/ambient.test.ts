import { describe, it, expect } from "vitest";
import { tunnelPath, tunnelField } from "./ambient";
describe("jungle tunnel", () => {
  it("path bends smoothly", () => {
    for (let z = 0; z < 50; z += .5) { const a = tunnelPath(z), b = tunnelPath(z + .01); expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeLessThan(.02); }
  });
  it("field stays in 0..1 and the kick lifts it", () => {
    const base = { t: 3, kick: 0, tone: 0, level: .5, size: 1 };
    let quiet = 0, hit = 0;
    for (let y = -.5; y <= .5; y += .1) for (let x = -.8; x <= .8; x += .1) {
      const q = tunnelField(x, y, base), h = tunnelField(x, y, { ...base, kick: 1 });
      expect(q).toBeGreaterThanOrEqual(0); expect(q).toBeLessThanOrEqual(1); quiet += q; hit += h;
    }
    expect(hit).not.toBe(quiet);
  });
});
