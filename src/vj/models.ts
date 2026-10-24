// Explicit vector contours retain recognizable silhouettes in the two-colour renderer.
export type V3 = [number, number, number];
export type Segment = [V3, V3];
export const MODELS = ["POLY", "WIRE", "TESSERACT", "KNOT", "STELLA", "SMILEY"];
export const hasSatellites = (model: string) => model === "POLY";

function contour(points: V3[], closed = true): Segment[] {
  return points.slice(0, closed ? points.length : -1).map((p, i) => [p, points[(i + 1) % points.length]]);
}
function ellipse(x: number, y: number, z: number, rx: number, ry: number, start = 0, end = Math.PI * 2): Segment[] {
  return contour(Array.from({ length: 81 }, (_, i) => {
    const a = start + (end - start) * i / 80;
    return [x + Math.cos(a) * rx, y + Math.sin(a) * ry, z];
  }), false);
}

/** Every model uses its own topology, not a shared radial cage. */
export function vectorSegments(model: string, t: number, energy: number): Segment[] {
  if (model === "TESSERACT") {
    const vertices = Array.from({ length: 16 }, (_, i): V3 => {
      let x = i & 1 ? .62 : -.62, y = i & 2 ? .62 : -.62;
      let z = i & 4 ? .62 : -.62, w = i & 8 ? .62 : -.62;
      const a = t * .29 + energy * .7, b = t * .17;
      [x, w] = [x * Math.cos(a) - w * Math.sin(a), x * Math.sin(a) + w * Math.cos(a)];
      [y, z] = [y * Math.cos(b) - z * Math.sin(b), y * Math.sin(b) + z * Math.cos(b)];
      const s = 1.7 / (2.5 - w);
      return [x * s, y * s, z * s];
    });
    return vertices.flatMap((v, i) => [1, 2, 4, 8].filter(bit => (i & bit) === 0).map(bit => [v, vertices[i | bit]] as Segment));
  }
  if (model === "KNOT") {
    // Two continuous boundaries and sparse cross-ribs make a legible twisted ribbon.
    const rings = [0, 1].map(side => Array.from({ length: 241 }, (_, i): V3 => {
      const a = i / 240 * Math.PI * 2, twist = 3 * a + t * .2;
      const r = .63 + .23 * Math.cos(twist), width = side ? .036 : -.036;
      return [(r + width) * Math.cos(2 * a), (r + width) * Math.sin(2 * a), .3 * Math.sin(twist) + width * Math.sin(a * 5)];
    }));
    return [...contour(rings[0], false), ...contour(rings[1], false), ...rings[0].filter((_, i) => i % 8 === 0).map((p, i) => [p, rings[1][i * 8]] as Segment)];
  }
  if (model === "STELLA") {
    const v: V3[] = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(p => p.map(x => x * .52) as V3);
    return [1, -1].flatMap(sign => v.flatMap((p, i) => v.slice(i + 1).map(q => [p.map(x => x * sign) as V3, q.map(x => x * sign) as V3] as Segment)));
  }
  if (model === "SMILEY") {
    const segments = [...ellipse(0, 0, .12, .88, .88), ...ellipse(0, 0, -.12, .88, .88)];
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      segments.push([[.88 * Math.cos(a), .88 * Math.sin(a), -.12], [.88 * Math.cos(a), .88 * Math.sin(a), .12]]);
    }
    for (const x of [-.29, .29]) {
      for (const r of [1, .72, .44]) segments.push(...ellipse(x, .29, .14, .065 * r, .16 * r));
    }
    // A bold, open grin cut from exact arcs, not a shaded recess.
    for (const r of [.55, .57, .59]) segments.push(...ellipse(0, .02, .14, r, r, Math.PI * 1.12, Math.PI * 1.88));
    return segments;
  }
  return [];
}
