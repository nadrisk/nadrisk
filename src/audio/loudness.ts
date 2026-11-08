/** Fixed per-engine output trims so every instrument lands near the drums' level at default velocity and 75% channel level
 *  (peaks around -4 to -2 dBFS). Only level changes: tone, envelopes and saved channel levels are untouched. */
export const ENGINE_TRIM = { drum: 1, prc: 1, synth: 1.5, bass808: 1, acid: 1.5, reese: 2, sampler: 1, pad: 1.4 } as const;
