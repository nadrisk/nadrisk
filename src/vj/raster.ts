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