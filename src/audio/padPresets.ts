/** PAD instrument presets: 90s atmospheric DnB / ambient jungle pads (JV/Wavestation/string-machine/choir lineage).
 *  Each preset is a fixed recipe; the four macros and the XY pad move around it. */
export type PadTable = "warm" | "choir" | "str" | "cel" | "saw" | "glass" | "sine" | "epno" | "pno";
export type PadLayer = { table: PadTable; oct: number; gain: number };
export type PadRecipe = {
  name: string; layers: PadLayer[]; detune: number; cutoff: number; res: number; swell: number;
  vowel?: [number, number]; fm?: { ratio: number; amt: number; decay: number }; air: number;
  a: number; d: number; s: number; r: number; verb: { size: number; mix: number; damp: number };
  /** Dedicated keys model instead of the pad stack (procedural, mdaPiano / DX7 E.PIANO style). */ keys?: "grand" | "epiano";
  /** Macro start values (0..1). */ bright: number; motion: number; space: number; age: number;
};
export const PAD_PRESETS: PadRecipe[] = [
  { name: "GLASS STR", layers: [{ table: "str", oct: 0, gain: 1 }, { table: "glass", oct: 1, gain: .35 }], detune: 14, cutoff: 2600, res: 1, swell: .7, air: .05, a: .9, d: 2, s: .8, r: 2.4, verb: { size: 6, mix: .45, damp: 7000 }, bright: 0, motion: 0, space: 0, age: 0 },
  { name: "SPACE VOX", layers: [{ table: "choir", oct: 0, gain: 1 }, { table: "warm", oct: -1, gain: .3 }], detune: 10, cutoff: 4200, res: .7, swell: .3, vowel: [4, 0], air: .08, a: 1.2, d: 2.5, s: .85, r: 2.8, verb: { size: 8, mix: .5, damp: 6000 }, bright: 0, motion: 0, space: 0, age: 0 },
  { name: "DREAM BELL", layers: [{ table: "sine", oct: 1, gain: .8 }, { table: "cel", oct: 0, gain: .6 }], detune: 6, cutoff: 6000, res: .5, swell: 0, fm: { ratio: 3.5, amt: 2.2, decay: 1.2 }, air: 0, a: .004, d: 1.8, s: .35, r: 2.6, verb: { size: 7, mix: .45, damp: 8000 }, bright: 0, motion: 0, space: 0, age: 0 },
  { name: "WARM SOLINA", layers: [{ table: "saw", oct: 0, gain: .8 }, { table: "saw", oct: 1, gain: .4 }], detune: 9, cutoff: 1800, res: .6, swell: .3, air: 0, a: .35, d: 1.5, s: .9, r: 1.6, verb: { size: 4, mix: .35, damp: 5000 }, bright: 0, motion: 0, space: 0, age: 0 },
  { name: "MINOR 9 STAB", layers: [{ table: "warm", oct: 0, gain: 1 }, { table: "str", oct: 1, gain: .3 }], detune: 12, cutoff: 3200, res: 1.4, swell: -.4, air: .03, a: .01, d: .7, s: .25, r: 1.4, verb: { size: 5, mix: .4, damp: 6500 }, bright: 0, motion: 0, space: 0, age: 0 },
  { name: "DUSK AIR", layers: [{ table: "warm", oct: 0, gain: .6 }, { table: "sine", oct: 1, gain: .2 }], detune: 18, cutoff: 1400, res: .8, swell: .5, air: .35, a: 1.6, d: 3, s: .9, r: 3.5, verb: { size: 10, mix: .55, damp: 5000 }, bright: 0, motion: 0, space: 0, age: 0 },
  { name: "OCEAN SWELL", layers: [{ table: "saw", oct: 0, gain: .7 }, { table: "warm", oct: -1, gain: .5 }], detune: 16, cutoff: 900, res: 2.5, swell: 1, air: .1, a: 2.2, d: 3, s: .9, r: 3.2, verb: { size: 9, mix: .5, damp: 4500 }, bright: 0, motion: 0, space: 0, age: 0 },
  { name: "TAPE CHOIR", layers: [{ table: "choir", oct: 0, gain: 1 }], detune: 8, cutoff: 2800, res: .6, swell: .2, vowel: [3, 2], air: .06, a: .8, d: 2, s: .85, r: 2.2, verb: { size: 5, mix: .4, damp: 4000 }, bright: 0, motion: 0, space: 0, age: 0 },
  { name: "CELESTE", layers: [{ table: "cel", oct: 1, gain: .9 }, { table: "glass", oct: 0, gain: .4 }], detune: 7, cutoff: 7000, res: .5, swell: 0, air: .05, a: .02, d: 1.4, s: .55, r: 2.2, verb: { size: 7, mix: .5, damp: 9000 }, bright: 0, motion: 0, space: 0, age: 0 },
  { name: "FAR SAW", layers: [{ table: "saw", oct: 0, gain: .8 }, { table: "saw", oct: -1, gain: .4 }, { table: "saw", oct: 1, gain: .2 }], detune: 24, cutoff: 2000, res: 1, swell: .4, air: .04, a: .6, d: 2, s: .85, r: 2.4, verb: { size: 8, mix: .45, damp: 6000 }, bright: 0, motion: 0, space: 0, age: 0 },
  { name: "FM HAZE", layers: [{ table: "sine", oct: 0, gain: 1 }, { table: "warm", oct: 0, gain: .3 }], detune: 9, cutoff: 3500, res: .6, swell: .2, fm: { ratio: 2, amt: 1.2, decay: 2.5 }, air: .12, a: .7, d: 2.4, s: .7, r: 2.6, verb: { size: 7, mix: .45, damp: 6500 }, bright: 0, motion: 0, space: 0, age: 0 },
  { name: "DUB DRONE", layers: [{ table: "warm", oct: -1, gain: 1 }, { table: "saw", oct: 0, gain: .35 }], detune: 11, cutoff: 700, res: 2, swell: .6, air: .08, a: 1.4, d: 3, s: .95, r: 3, verb: { size: 12, mix: .5, damp: 3500 }, bright: 0, motion: 0, space: 0, age: 0 },
  { name: "MIDI GRAND", keys: "grand", layers: [{ table: "pno", oct: 0, gain: 1 }], detune: 3, cutoff: 5000, res: .5, swell: 0, air: 0, a: .002, d: 6, s: 0, r: .35, verb: { size: 0, mix: 0, damp: 8000 }, bright: 0, motion: 0, space: 0, age: 0 },
  { name: "MIDI E-PNO", keys: "epiano", layers: [{ table: "sine", oct: 0, gain: 1 }], detune: 4, cutoff: 6000, res: .5, swell: 0, air: 0, a: .002, d: 5, s: 0, r: .4, verb: { size: 0, mix: 0, damp: 8000 }, bright: 0, motion: 0, space: 0, age: 0 },
];/** Wavetable partial amplitudes (harmonics 1..32), shaped after classic ROM pad / string / choir spectra. */
export function padPartials(t: PadTable): number[] {
  return Array.from({ length: 32 }, (_, k) => { const n = k + 1;
    switch (t) {
      case "warm": return (n % 2 ? 1 : .45) / n ** 1.4;
      case "str": return 1 / n * (n > 18 ? .4 : 1);
      case "saw": return 1 / n;
      case "choir": return Math.exp(-((n - 3) ** 2) / 8) * .9 + .3 / n;
      case "cel": return n === 1 ? 1 : n === 2 ? .5 : n === 4 ? .35 : n === 8 ? .2 : n === 6 ? .1 : 0;
      case "glass": return n === 1 ? .7 : n % 3 === 0 ? .5 / Math.sqrt(n) : .04 / n;
      case "epno": return n === 1 ? 1 : n === 2 ? .35 : n === 3 ? .12 : n === 4 ? .04 : 0;
      case "pno": return (n % 2 ? 1 : .7) / n ** 1.15 * Math.exp(-n / 14);
      default: return n === 1 ? 1 : 0;
    }
  });
}
/** Vowel formants (Peterson & Barney male averages): A, E, I, O, U → [F1, F2, F3] Hz. */
export const VOWELS: [number, number, number][] = [[730, 1090, 2440], [530, 1840, 2480], [270, 2290, 3010], [570, 840, 2410], [300, 870, 2240]];
/** Formants between two vowels at u (0..1), log-interpolated so the morph sounds even. */
export const vowelAt = (pair: [number, number], u: number): [number, number, number] => {
  const a = VOWELS[pair[0]], b = VOWELS[pair[1]], k = Math.max(0, Math.min(1, u));
  return a.map((f, i) => f * (b[i] / f) ** k) as [number, number, number];
};
