// Built-in wavetables: 4 keyframes each, stored as harmonic magnitudes in sine phase and equal RMS,
// so the BASIC-style native crossfade between neighbours never cancels or dips.
import { FRAME, harmonics, type WtTable } from "./wavetable";

export const NH = 64;
type Amp = (n: number) => number;
const spec = (f: Amp) => { const a = new Float32Array(NH + 1); for (let n = 1; n <= NH; n++) a[n] = Math.max(0, f(n)); return a; };
/** Magnitudes of a time-domain cycle (phase dropped: every keyframe shares sine phase). */
const shape = (g: (t: number) => number) => { const f = new Float32Array(FRAME); for (let i = 0; i < FRAME; i++) f[i] = g(i / FRAME); let dc = 0; f.forEach(x => { dc += x; }); dc /= FRAME; f.forEach((x, i) => { f[i] = x - dc; });
  const h = harmonics(f, NH), a = new Float32Array(NH + 1); for (let n = 1; n <= NH; n++) a[n] = Math.hypot(h.real[n], h.imag[n]); return a; };
const odd = (n: number) => n % 2 === 1;
const saw: Amp = n => 1 / n, sqr: Amp = n => odd(n) ? 1 / n : 0, tri: Amp = n => odd(n) ? 1 / (n * n) : 0;
const pulse = (w: number): Amp => n => Math.abs(Math.sin(n * Math.PI * w)) / n;
const fact = (k: number) => { let r = 1; for (let i = 2; i <= k; i++) r *= i; return r; };
export const besselJ = (k: number, x: number) => { let s = 0; for (let m = 0; m < 30; m++) s += (m % 2 ? -1 : 1) * (x / 2) ** (2 * m + k) / (fact(m) * fact(m + k)); return s; };
/** Two-operator FM, integer ratio r: carrier harmonic c, sidebands c ± k·r weighted by J_k(I). */
const fm = (I: number, r: number, c = 1): Float32Array => { const a = new Float32Array(NH + 1);
  for (let k = -40; k <= 40; k++) { const n = Math.abs(c + k * r), j = Math.abs(besselJ(Math.abs(k), I)); if (n >= 1 && n <= NH) a[n] += j; } return a; };
const formant = (base: Amp, peaks: [number, number, number][]): Amp => n => base(n) * (0.08 + peaks.reduce((s, [c, bw, g]) => s + g * Math.exp(-(((n - c) / bw) ** 2)), 0));
/** Hammond footages mapped to harmonics (16' = fundamental), levels 0-8 at 3 dB per step. */
const DRAW = [1, 3, 2, 4, 6, 8, 10, 12, 16];
const bars = (reg: string): Amp => n => { const i = DRAW.indexOf(n); const l = i < 0 ? 0 : +reg[i]; return l ? 10 ** ((l - 8) * 3 / 20) : 0; };
// Casio CZ phase distortion: cosine read through a bent phase, with a resonant window.
const czSaw = (d: number) => shape(t => { const k = .5 - d * .49, p = t < k ? t / k * .5 : .5 + (t - k) / (1 - k) * .5; return -Math.cos(2 * Math.PI * p); });
const czReso = (r: number, trap = false) => shape(t => { const w = trap ? Math.min(1, Math.max(0, 2 - Math.abs(4 * t - 2) * 1.2)) : 1 - t; return w * Math.cos(2 * Math.PI * r * t) * (trap ? 1 : -1) + (trap ? 0 : 1 - t); });
const fold = (g: number) => shape(t => Math.sin(g * Math.sin(2 * Math.PI * t)));
const crush = (bits: number) => shape(t => { const q = 2 ** (bits - 1), x = Math.sin(2 * Math.PI * t) * .5 + (1 - 2 * t) * .5; return Math.round(x * q) / q; });
const detSaw = (spreads: number[]) => spec(n => spreads.reduce((s, d) => s + Math.abs(Math.cos(n * d)), 0) / spreads.length / n);
const asym = (b: number) => shape(t => { const s = 1 - 2 * t, x = Math.sin(2 * Math.PI * t); return Math.tanh(b * (x + .4)) * (1 - b * .1) + b * .05 * s; });

type Def = [string, string, Float32Array[]];
const s = spec;
// Vowel formants (Hz → harmonic at ~C3 130 Hz): A 800/1150, E 400/1600, I 270/2300, O 450/800, U 325/700.
const vowel = (f1: number, f2: number) => s(formant(saw, [[f1 / 130, 1.5, 1], [f2 / 130, 2.5, .6], [2600 / 130, 3, .25]]));
let defs: Def[] | null = null;
const DEFS = () => defs ??= [
  ["juno-pwm", "JUNO PWM", [s(pulse(.5)), s(pulse(.25)), s(pulse(.1)), s(pulse(.03))]],
  ["acid-303", "ACID 303", [s(n => sqr(n) * (1 / (1 + (n / 24) ** 2))), asym(1.5), asym(3), s(n => saw(n) * (1 / (1 + (n / 40) ** 2)))]],
  ["mini-fat-saw", "MINI FAT SAW", [s(saw), detSaw([0, .05]), detSaw([0, .04, .09]), detSaw([0, .03, .07, .12])]],
  ["prophet-vs", "PROPHET VS", [s(n => saw(n) * Math.exp(-n / 30)), s(n => n % 2 === 0 && n % 4 !== 0 ? 0 : sqr(n) + (n === 2 ? .5 : 0)), s(n => saw(n) * (n > 6 && n < 14 ? 2.5 : 1)), s(n => (n % 3 === 0 ? 1.4 : .6) / Math.sqrt(n))]],
  ["ppg-reso", "PPG RESO", [4, 8, 14, 24].map(c => s(formant(saw, [[c, 1.2, 4]])))],
  ["microwave", "MICROWAVE", [s(n => n === 1 ? 1 : n === 3 ? .3 : n === 5 ? .1 : 0), s(n => (n <= 8 ? 1 : .2) / n), s(n => (odd(n) ? 1 : .3) / Math.sqrt(n) * Math.exp(-n / 40)), s(n => 1 / Math.sqrt(n))]],
  ["cz-reso-saw", "CZ RESO SAW", [czSaw(0), czReso(2), czReso(5), czReso(10)]],
  ["cz-reso-trap", "CZ RESO TRAP", [czReso(1, true), czReso(3, true), czReso(6, true), czReso(11, true)]],
  ["fm-bass", "FM BASS", [fm(0, 1), fm(1, 1), fm(2.5, 1), fm(5, 1)]],
  ["fm-bell", "FM BELL", [fm(.5, 3), fm(1.5, 3), fm(1.5, 7), fm(3, 7)]],
  ["fm-growl", "FM GROWL", [fm(1, 2), fm(3, 2), fm(5, 3, 2), fm(8, 2)]],
  ["buchla-fold", "BUCHLA FOLD", [fold(1), fold(3), fold(6), fold(10)]],
  ["b3-drawbars", "B3 DRAWBARS", [s(bars("888000000")), s(bars("868000000")), s(bars("888800000")), s(bars("888888888"))]],
  ["rhodes-tine", "RHODES TINE", [s(n => n === 1 ? 1 : 0), s(n => n === 1 ? 1 : n === 2 ? .25 : n === 3 ? .1 : 0), s(n => n === 1 ? 1 : n === 2 ? .5 : n === 3 ? .3 : n === 7 ? .15 : 0), s(n => n <= 4 ? 1 / n : n >= 6 && n <= 9 ? .2 : 0)]],
  ["wurly-reed", "WURLY REED", [s(tri), s(n => odd(n) ? 1 / n ** 1.6 : .05 / n), s(n => odd(n) ? 1 / n ** 1.2 : .1 / n), s(n => (odd(n) ? 1 : .3) / n)]],
  ["clavinet", "CLAVINET", [.5, .3, .15, .06].map(p => s(n => Math.abs(Math.sin(n * Math.PI * p)) / n ** .8))],
  ["vowel-talk", "VOWEL TALK", [vowel(800, 1150), vowel(400, 1600), vowel(270, 2300), vowel(325, 700)]],
  ["choir-vox", "CHOIR VOX", [vowel(300, 700), vowel(450, 800), vowel(600, 1000), vowel(800, 1200)]],
  ["glass-harm", "GLASS HARM", [s(n => n === 1 ? 1 : 0), s(n => odd(n) && n <= 5 ? 1 / n : 0), s(n => odd(n) && n <= 11 ? 1 / Math.sqrt(n) : 0), s(n => odd(n) && n <= 21 ? .8 : 0)]],
  ["lofi-8bit", "LO-FI 8BIT", [crush(8), crush(6), crush(4), crush(3)]],
] as Def[];

/** Equal RMS (Σa² = 1), so neighbours crossfade at a constant level. */
const norm = (a: Float32Array) => { let e = 0; a.forEach(x => { e += x * x; }); const g = e > 0 ? 1 / Math.sqrt(e) : 0; return a.map(x => x * g); };
const build = ([slug, name, shapes]: Def): WtTable => {
  const mags = shapes.map(norm), frames = mags.map(a => { const f = new Float32Array(FRAME); for (let n = 1; n <= NH; n++) if (a[n]) for (let i = 0; i < FRAME; i++) f[i] += a[n] * Math.sin(2 * Math.PI * n * i / FRAME); return f; });
  let pk = 0; frames.forEach(f => f.forEach(x => { pk = Math.max(pk, Math.abs(x)); }));
  return { id: `fx:${slug}`, name, frames, real: mags.map(() => new Float32Array(NH + 1)), imag: mags, keys: true,
    view: frames.map(f => Array.from({ length: 48 }, (_, i) => f[Math.floor(i * FRAME / 48)] / (pk || 1))) };
};
export const FACTORY_REFS = ["juno-pwm JUNO PWM","acid-303 ACID 303","mini-fat-saw MINI FAT SAW","prophet-vs PROPHET VS","ppg-reso PPG RESO","microwave MICROWAVE","cz-reso-saw CZ RESO SAW","cz-reso-trap CZ RESO TRAP","fm-bass FM BASS","fm-bell FM BELL","fm-growl FM GROWL","buchla-fold BUCHLA FOLD","b3-drawbars B3 DRAWBARS","rhodes-tine RHODES TINE","wurly-reed WURLY REED","clavinet CLAVINET","vowel-talk VOWEL TALK","choir-vox CHOIR VOX","glass-harm GLASS HARM","lofi-8bit LO-FI 8BIT"].map(x => { const i = x.indexOf(" "); return { id: `fx:${x.slice(0, i)}`, name: x.slice(i + 1) }; });
const cache = new Map<string, WtTable>();
export const factoryTable = (id: string): WtTable | null => { const c = cache.get(id); if (c) return c; const d = DEFS().find(x => `fx:${x[0]}` === id); if (!d) return null; const t = build(d); cache.set(id, t); return t; };
export const isFactory = (id?: string) => !!id && id.startsWith("fx:");
