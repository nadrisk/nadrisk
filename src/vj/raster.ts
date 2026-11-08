import { glyph } from "../pixel/font";

export const BAYER = [[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22], [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]].flat().map(x => (x + .5) / 64);

export function ditherCamera(data: Uint8ClampedArray, buf: Uint32Array, width: number, height: number, fg: number, bg: number, kick = 0, level = 0) {
  const contrast = 1.12 + Math.min(1, Math.max(0, level)) * .45;
  const exposure = Math.min(1, Math.max(0, kick)) * .14;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const luminance = (data[i] * .299 + data[i + 1] * .587 + data[i + 2] * .114) / 255;
    buf[y * width + x] = (luminance - .5) * contrast + .5 + exposure > BAYER[(y & 7) * 8 + (x & 7)] ? fg : bg;
  }
}

export function pixelText(buf: Uint32Array, width: number, height: number, x: number, y: number, text: string, colour: number) {
  for (const c of text.toUpperCase()) {
    const bits = glyph(c);
    for (let row = 0; row < 5; row++) for (let col = 0; col < 3; col++) {
      const px = x + col, py = y + row;
      if (bits[row * 3 + col] === "1" && px >= 0 && py >= 0 && px < width && py < height) buf[py * width + px] = colour;
    }
    x += 4;
  }
}

export function meterDb(value: number) { return Number.isFinite(value) && value > .000001 ? Math.max(-120, 20 * Math.log10(value)) : -120; }
export function noteName(note: number) {
  if (!Number.isFinite(note)) return "--";
  const midi = Math.round(note);
  return ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}
/** Sobel edge magnitude of a luminance field (0..1), border pixels zero. */
export function sobelEdges(lum: Float32Array, out: Float32Array, width: number, height: number, gain = 2.4) {
  out.fill(0);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x, a = lum[i - width - 1], b = lum[i - width], c = lum[i - width + 1], d = lum[i - 1], f = lum[i + 1], g = lum[i + width - 1], h = lum[i + width], k = lum[i + width + 1];
    const gx = c + 2 * f + k - a - 2 * d - g, gy = g + 2 * h + k - a - 2 * b - c;
    out[i] = Math.min(1, Math.hypot(gx, gy) * gain);
  }
}

/** Feedback trails: keep the brighter of the new edge and the decayed old trail, smeared slightly toward the centre. */
export function feedTrail(edge: Float32Array, trail: Float32Array, width: number, height: number, decay: number) {
  const prev = trail.slice(), cx = width / 2, cy = height / 2;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = Math.round(cx + (x - cx) * 1.015), sy = Math.round(cy + (y - cy) * 1.015);
    const old = sx >= 0 && sy >= 0 && sx < width && sy < height ? prev[sy * width + sx] : 0;
    const i = y * width + x; trail[i] = Math.max(edge[i], old * decay);
  }
}
