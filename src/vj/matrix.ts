// MATRIX: a kinetic pin-array of instanced solids. Pure functions so the instancing maths is testable.
import type { VjKind } from "./bus";
import type { Reaction } from "./models";

export const GRID = 8, SPACING = 0.5, WAVE_SPEED = 3.2, MAX_EVENTS = 24;
export type MatrixEvent = { at: number; kind: VjKind; vel: number };
/** Shape weights in SOLIDS order: OCTA, TETRA, CUBE, ICOSA, DODECA, SPHERE. */
export type Cell = { x: number; y: number; z: number; scale: number; stretch: number; spin: number; weights: number[]; wire: boolean };

/** Ring-by-ring wavefront: a hit reaches distance r after r / speed seconds, then decays. Zero before arrival. */
export function wavefront(events: readonly MatrixEvent[], now: number, r: number, match: (k: VjKind) => boolean, decay = 6) {
  let e = 0;
  for (const ev of events) {
    if (!match(ev.kind)) continue;
    const age = now - ev.at - r / WAVE_SPEED;
    if (age >= 0) e += ev.vel * Math.exp(-age * decay);
  }
  return Math.min(1.5, e);
}

const isKick = (k: VjKind) => k === "kick";
const isSnare = (k: VjKind) => k === "snare";
const isTone = (k: VjKind) => k !== "kick" && k !== "snare" && k !== "hat" && k !== "open" && k !== "perc";

export function matrixCells(t: number, events: readonly MatrixEvent[], audio: Reaction, wave: readonly number[]): Cell[] {
  const cells: Cell[] = [], half = (GRID - 1) / 2;
  for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
    const x = (i - half) * SPACING, z = (j - half) * SPACING, r = Math.hypot(x, z);
    const kick = wavefront(events, t, r, isKick, 5);
    const snare = wavefront(events, t, r, isSnare, 7);
    const tone = wavefront(events, t, r, isTone, 2.5);
    const edge = Math.max(Math.abs(i - half), Math.abs(j - half)) >= half - .01;
    const hat = edge ? audio.hat + audio.perc * .6 : 0;
    const odd = (i + j) % 2 === 1;
    // Idle undulation, then the live waveform rolls across rows for synths.
    const w = wave.length ? wave[Math.floor((j / GRID) * wave.length)] ?? 0 : 0;
    let y = Math.sin(x * 1.7 + t * .9) * Math.cos(z * 1.3 - t * .7) * .12 + w * .35 * (.3 + audio.tone + tone * .5);
    y += kick * .55 + (odd ? 0 : -snare * .25);
    const total = .15 + kick + snare + tone + hat;
    // OCTA, TETRA, CUBE, ICOSA, DODECA, SPHERE
    const weights = [kick * .5 / total, snare / total, kick * .5 / total, tone / total, hat / total, .15 / total];
    cells.push({
      x, y, z,
      scale: .12 + kick * .14 + snare * .07 + tone * .06 + hat * .05,
      stretch: 1 + (odd ? snare * 1.4 : 0),
      spin: t * (.4 + hat * 6) + (odd ? audio.snap : 0) + i * .3 + j * .2,
      weights,
      wire: hat > Math.max(kick, snare, tone, .25),
    });
  }
  return cells;
}

export function pushEvent(events: MatrixEvent[], ev: MatrixEvent) {
  events.push(ev);
  while (events.length > MAX_EVENTS || (events.length && ev.at - events[0].at > 3)) events.shift();
}
