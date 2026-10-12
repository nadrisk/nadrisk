import { describe, expect, it } from "vitest";
import { Px } from "./draw";
import { drawReeseWaves, reeseVisualLevel, type ReeseWaveSettings } from "./reeseWaves";

const home = { detune: 18, drift: .3, width: .6, sub: .6 };
function marks(settings: ReeseWaveSettings, energy = 0, reduced = false) {
  const points: number[][] = [];
  const p = new Px({ fillRect: (x: number, y: number, w: number, h: number) => {
    for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) points.push([x + dx, y + dy]);
  } } as unknown as CanvasRenderingContext2D, "fg", "bg");
  drawReeseWaves(p, settings, energy, reduced);
  return points;
}

describe("REESE interference", () => {
  it("keeps all contours inside the display at combined extremes", () => {
    for (const detune of [0, 18, 50]) for (const drift of [0, .3, 1]) for (const width of [0, .6, 1]) for (const sub of [0, .6, 1]) for (const energy of [0, 1]) {
      const points = marks({ detune, drift, width, sub }, energy);
      expect(points.length).toBeGreaterThan(100);
      expect(points.every(([x, y]) => x > 2 && x < 125 && y > 11 && y < 44)).toBe(true);
    }
  });
  it("responds independently to all four controls", () => {
    for (const key of ["detune", "drift", "width", "sub"] as const) {
      expect(marks({ ...home, [key]: 0 })).not.toEqual(marks({ ...home, [key]: key === "detune" ? 50 : 1 }));
    }
  });
  it("reacts to sound while keeping reduced-motion wave contours stationary", () => {
    expect(marks(home, 1)).not.toEqual(marks(home));
    const waves = (points: number[][]) => points.filter(([, y]) => y < 37);
    expect(waves(marks(home, 1, true))).toEqual(waves(marks(home, 0, true)));
  });
  it("smooths sound and settles to silence without overshoot", () => {
    const b = new Float32Array(512).fill(.2);
    let level = reeseVisualLevel(b, 0);
    expect(level).toBeGreaterThan(.5); expect(level).toBeLessThanOrEqual(1);
    b.fill(0); for (let i = 0; i < 30; i++) level = reeseVisualLevel(b, level);
    expect(level).toBeLessThan(.001);
  });
});