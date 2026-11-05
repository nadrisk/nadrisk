// Seeded 3D simplex noise with fBm, ridged and domain-warp helpers (the usual TouchDesigner Noise SOP / GLSL displacement recipe).
const G = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];

export function makeNoise(seed = 1) {
  const p = new Uint8Array(256).map((_, i) => i);
  let s = seed >>> 0 || 1;
  for (let i = 255; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
  const perm = new Uint8Array(512).map((_, i) => p[i & 255]);
  const F3 = 1 / 3, G3 = 1 / 6;
  function n3(x: number, y: number, z: number) {
    const sk = (x + y + z) * F3, i = Math.floor(x + sk), j = Math.floor(y + sk), k = Math.floor(z + sk);
    const t = (i + j + k) * G3, x0 = x - i + t, y0 = y - j + t, z0 = z - k + t;
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) { if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; } else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; } }
    else { if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; } else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; } else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } }
    const c = [[x0, y0, z0, 0, 0, 0], [x0 - i1 + G3, y0 - j1 + G3, z0 - k1 + G3, i1, j1, k1], [x0 - i2 + 2 * G3, y0 - j2 + 2 * G3, z0 - k2 + 2 * G3, i2, j2, k2], [x0 - 1 + 3 * G3, y0 - 1 + 3 * G3, z0 - 1 + 3 * G3, 1, 1, 1]];
    const ii = i & 255, jj = j & 255, kk = k & 255; let n = 0;
    for (const [a, b, d, oi, oj, ok] of c) {
      let q = .6 - a * a - b * b - d * d; if (q < 0) continue;
      const g = G[perm[ii + oi + perm[jj + oj + perm[kk + ok]]] % 12]; q *= q; n += q * q * (g[0] * a + g[1] * b + g[2] * d);
    }
    return 32 * n; // ~[-1, 1]
  }
  const fbm = (x: number, y: number, z: number, oct = 3) => { let a = .5, f = 1, s2 = 0, n = 0; for (let o = 0; o < oct; o++) { s2 += a * n3(x * f, y * f, z * f); n += a; a *= .5; f *= 2.03; } return s2 / n; };
  const ridged = (x: number, y: number, z: number, oct = 3) => { let a = .5, f = 1, s2 = 0, n = 0; for (let o = 0; o < oct; o++) { const r = 1 - Math.abs(n3(x * f, y * f, z * f)); s2 += a * r * r; n += a; a *= .5; f *= 2.1; } return s2 / n; };
  /** Domain-warped fBm: the input is pushed by its own noise before sampling, giving folded, melted forms. */
  const warped = (x: number, y: number, z: number, w: number) => {
    if (!w) return fbm(x, y, z);
    return fbm(x + w * n3(x + 5.2, y + 1.3, z), y + w * n3(x + 1.7, y + 9.2, z + 3.1), z + w * n3(x, y + 4.4, z + 7.7));
  };
  return { n3, fbm, ridged, warped };
}
export type Noise = ReturnType<typeof makeNoise>;
