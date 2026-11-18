/** Wavetable position envelope (ADS, no release). LOOP cycles attack→decay forever (decay falls to SUS, attack rises from it), so it doubles as an LFO. */
export type WtEnv = { wA: number; wD: number; wS: number; wSm: number; wDp: number; wLoop: boolean; wBi: boolean };
export const WT_ENV_HOME: WtEnv = { wA: .25, wD: .5, wS: 0, wSm: .3, wDp: 0, wLoop: false, wBi: false };
const ease = (x: number, sm: number) => x + (((1 - Math.cos(Math.PI * x)) / 2) - x) * sm;
/** Envelope level 0..1 at seconds since note-on. SMTH bends straight ramps into S-curves. */
export function wtEnvLevel(e: WtEnv, t: number): number {
  const a = Math.max(.001, e.wA), d = Math.max(.002, e.wD), s = Math.min(1, Math.max(0, e.wS)), sm = Math.min(1, Math.max(0, e.wSm));
  if (t <= 0) return 0;
  if (t < a) return ease(t / a, sm);
  let u = t - a;
  if (!e.wLoop) return u >= d ? s : 1 - (1 - s) * ease(u / d, sm);
  if (u < d) return 1 - (1 - s) * ease(u / d, sm);
  u = (u - d) % (a + d);
  return u < a ? s + (1 - s) * ease(u / a, sm) : 1 - (1 - s) * ease((u - a) / d, sm);
}
/** Position offset in WAVE units (full table = 3): UNI pushes one way, BI swings around the knob. */
export const wtEnvOffset = (e: WtEnv, t: number) => { const l = wtEnvLevel(e, t); return (e.wBi ? l * 2 - 1 : l) * e.wDp * 3; };
