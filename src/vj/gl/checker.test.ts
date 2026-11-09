import { describe, expect, it } from "vitest";
import { SPACE_SOURCES } from "./shaders";

// The checkerboard is the one surface palette that used to ignore the plasma underneath it.
const skin = SPACE_SOURCES[0];
const checker = skin.match(/vec3 c = pal == 6 \? vec3\(mod\(floor\((\w+)\.x\*6\.\)\+floor\(\1\.y\*6\.\),2\.\)\)/);
const warp = skin.match(
  /vec2 cst = st;\s*if \(selected != 0\) cst \+= vec2\(sin\(v\*6\.2831853\), cos\(v\*6\.2831853\)\)\*([\d.]+) \+ \(col\.xy - \.5\)\*([\d.]+);/,
);

const [warpWave, warpColor] = warp ? [Number(warp[1]), Number(warp[2])] : [0, 0];

// Mirrors the shader's checker sampling for a single surface point.
function tile(stx: number, sty: number, v: number, col: { x: number; y: number }, selected: number) {
  const x = stx + (selected ? Math.sin(v * 6.2831853) * warpWave + (col.x - .5) * warpColor : 0);
  const y = sty + (selected ? Math.cos(v * 6.2831853) * warpWave + (col.y - .5) * warpColor : 0);
  return (((Math.floor(x * 6) + Math.floor(y * 6)) % 2) + 2) % 2;
}

describe("checkerboard follows the plasma skin", () => {
  it("samples a warped coordinate, never the raw surface point", () => {
    expect(checker?.[1]).toBe("cst");
    expect(warp).not.toBeNull();
  });

  it("pushes tiles far enough to cross a tile edge (tile width = 1/6)", () => {
    expect(warpWave).toBeGreaterThanOrEqual(.1);
    expect(warpColor).toBeGreaterThan(0);
  });

  it("a plasma wave moves a point onto the opposite tile", () => {
    const still = tile(.09, 0, 0, { x: .5, y: .5 }, 0);
    const moving = tile(.09, 0, .25, { x: .5, y: .5 }, 1);
    expect(moving).not.toBe(still);
  });

  it("the plasma colour field drags the tiles too", () => {
    const a = tile(.09, 0, 0, { x: .5, y: .5 }, 1);
    const b = tile(.09, 0, 0, { x: .5 + 2 * warpColor, y: .5 }, 1);
    expect(b).not.toBe(a);
  });

  it("stays a clean straight grid with no plasma skin", () => {
    for (const [x, y] of [[.09, 0], [.5, .5], [.42, .91]]) {
      const raw = (((Math.floor(x * 6) + Math.floor(y * 6)) % 2) + 2) % 2;
      expect(tile(x, y, .25, { x: .1, y: .9 }, 0)).toBe(raw);
    }
  });
});
