import type { ADSR } from "./voices";

export type LaserParams = {
  wave: "sawtooth" | "square";
  detune: number;
  tone: number;
  amount: number;
  attack?: number;
  decay: number;
  curve: number;
  env: ADSR;
};

export const defaultLaser = (): LaserParams => ({
  wave: "sawtooth", detune: 25, tone: 12000, amount: 24, attack: .01, decay: .75, curve: 4.8,
  env: { a: .001, d: .18, s: 1, r: .3 },
});

/** Semitones from the root. Used by the audio scheduler and the pixel graph. */
export const laserPitchAt = (amount: number, progress: number, curve: number) =>
  progress >= 1 ? 0 : Math.max(-24, Math.min(24, amount)) * (1 - Math.max(0, progress)) ** Math.max(.25, Math.min(6, curve));

/** Root → signed peak → root, in seconds; shared by scheduling and screen. */
export function laserEnvelopeAt(p: LaserParams, seconds: number): number {
  const attack = Math.max(0, Math.min(.1, p.attack ?? 0));
  const amount = Math.max(-24, Math.min(24, p.amount));
  if (attack > 0 && seconds < attack) return seconds <= 0 ? 0 : amount * seconds / attack;
  return laserPitchAt(amount, (seconds - attack) / Math.max(.005, Math.min(2, p.decay)), p.curve);
}

export function laserParams(p?: Partial<LaserParams>): LaserParams {
  const d = defaultLaser();
  return { ...d, ...p, attack: p ? p.attack ?? 0 : d.attack, env: { ...d.env, ...p?.env } };
}