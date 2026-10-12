import type { ADSR } from "./voices";

export type LaserParams = {
  wave: "sawtooth" | "square";
  detune: number;
  tone: number;
  amount: number;
  decay: number;
  curve: number;
  env: ADSR;
};

export const defaultLaser = (): LaserParams => ({
  wave: "sawtooth", detune: 24, tone: 8500, amount: 24, decay: .06, curve: 3,
  env: { a: .002, d: .18, s: .15, r: .08 },
});

/** Semitones from the root. Used by the audio scheduler and the pixel graph. */
export const laserPitchAt = (amount: number, progress: number, curve: number) =>
  Math.max(-24, Math.min(24, amount)) * (1 - Math.max(0, Math.min(1, progress))) ** Math.max(.25, Math.min(6, curve));

export function laserParams(p?: Partial<LaserParams>): LaserParams {
  const d = defaultLaser();
  return { ...d, ...p, env: { ...d.env, ...p?.env } };
}