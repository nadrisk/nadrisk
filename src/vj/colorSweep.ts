/** The supplied cosine palette, packed for the engine's little-endian ImageData buffer.
 * Light and phase come from each backdrop, not a screen-wide tinted overlay. */
export function cosineColor(u: number, v: number, time: number, light = 1, phase = 0): number {
  const l = Math.max(0, Math.min(1, light));
  const r = Math.round(255 * l * (.5 + .5 * Math.cos(time + u + phase)));
  const g = Math.round(255 * l * (.5 + .5 * Math.cos(time + v + 2 + phase)));
  const b = Math.round(255 * l * (.5 + .5 * Math.cos(time + u + 4 + phase)));
  return (255 << 24 | b << 16 | g << 8 | r) >>> 0;
}

export function colorCss(packed: number) {
  return `rgb(${packed & 255},${(packed >>> 8) & 255},${(packed >>> 16) & 255})`;
}

export const MODEL_COUNT = 6;
export type VisualState = { model: number; size: number; color: boolean; code: boolean };
export const DEFAULT_VISUAL: VisualState = { model: 0, size: 1, color: false, code: false };
export function visualControl(state: VisualState, model: number, size: number): VisualState {
  return { ...state, model: ((state.model + model) % MODEL_COUNT + MODEL_COUNT) % MODEL_COUNT, size: Math.round(Math.max(.4, Math.min(2.2, state.size + size * .1)) * 10) / 10 };
}