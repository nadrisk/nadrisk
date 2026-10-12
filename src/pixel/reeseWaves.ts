import type { Px } from "./draw";

export type ReeseWaveSettings = { detune: number; drift: number; width: number; sub: number };
const clamp = (v: number) => Math.max(0, Math.min(1, v));

// Stylised, single-cycle bass contours, not an oscilloscope of the audio output.
export function drawReeseWaves(p: Px, r: ReeseWaveSettings, energy = 0, reduced = false) {
  const level = clamp(energy), detune = clamp(r.detune / 50), drift = clamp(r.drift);
  const spread = clamp(r.width) * 3;
  const amplitude = 7 + (reduced ? 0 : level * 2);
  const phase = .12 + detune * 1.8;
  for (let voice = 0; voice < 2; voice++) {
    let previous: [number, number] | undefined;
    for (let x = 6; x <= 121; x++) {
      const t = (x - 6) / 115 * Math.PI * 2;
      const angle = t + (voice ? phase : 0);
      const contour = Math.sin(angle) * .8 + Math.sin(angle * 2 + (voice ? drift * 1.4 : 0)) * .2;
      const y = Math.round(26 + (voice ? spread : -spread) + amplitude * contour);
      if (previous) {
        p.line(previous[0], previous[1], x, y);
        p.line(previous[0], previous[1] + 1, x, y + 1);
      }
      previous = [x, y];
    }
  }
  const sub = clamp(r.sub);
  if (sub > 0) {
    const halfWidth = 16 + Math.round(sub * 34), thickness = 1 + Math.round(sub * 2);
    for (let x = 64 - halfWidth; x <= 64 + halfWidth; x++) {
      const t = (x - (64 - halfWidth)) / (halfWidth * 2);
      const y = 40 - Math.round(Math.sin(t * Math.PI * 2) * sub * 1.5);
      p.rect(x, y, 1, thickness);
    }
  }
  // A small central pressure tick also conveys level with reduced motion enabled.
  if (level > .08) p.line(64 - Math.round(level * 9), 37, 64 + Math.round(level * 9), 37);
}

export function reeseVisualLevel(samples: Float32Array, previous: number) {
  if (!samples.length) return previous * .72;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  const target = clamp(Math.sqrt(sum / samples.length) * 4);
  return target > previous ? previous + (target - previous) * .7 : previous * .72 + target * .28;
}