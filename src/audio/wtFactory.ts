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
const detSaw = (spreads: number[]) => spec(n => spreads.reduce((s, d) => s + Math.abs(Math.cos(n * d)), 0) / spreads.length / n);
const asym = (b: number) => shape(t => { const s = 1 - 2 * t, x = Math.sin(2 * Math.PI * t); return Math.tanh(b * (x + .4)) * (1 - b * .1) + b * .05 * s; });

const isPrime = (n: number) => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
const FIB = [1, 2, 3, 5, 8, 13, 21, 34, 55];
/** Walsh function wal(k,t): product of Rademacher signs for each set bit of the Gray code of k. */
const walsh = (k: number, t: number) => { const g = k ^ (k >> 1); let v = 1; for (let b = 0; b < 6; b++) if (g >> b & 1) v *= Math.sin(2 * Math.PI * 2 ** b * (t + 1e-6)) >= 0 ? 1 : -1; return v; };
type Def = [string, string, Float32Array[]];
const TAU = 2 * Math.PI;
const triFold = (g: number) => shape(t => 2 / Math.PI * Math.asin(Math.sin(Math.PI / 2 * g * Math.sin(TAU * t))));
const asymFold = (g: number) => shape(t => Math.sin(g * (Math.sin(TAU * t) + .35)));
const lockhart = (g: number) => shape(t => Math.tanh(1.5 * Math.sin(g * Math.sin(TAU * t))));
const chebFold = (m: number) => shape(t => { const th = Math.acos(Math.sin(TAU * t)); let y = 0; for (let k = 1; k <= m; k++) y += Math.cos(k * th) / k; return y; });
const curvePwm = (a: number, th: number) => shape(t => Math.tanh(6 * (Math.sin(TAU * t ** a) - th)));
const dirichlet = (N: number) => spec(n => n <= N ? 1 : 0);
const logistic = (r: number) => { let x = .4; for (let i = 0; i < 200; i++) x = r * x * (1 - x); const xs = Array.from({ length: 8 }, () => (x = r * x * (1 - x)));
  return shape(t => Math.sin(TAU * t + 1.6 * xs[Math.min(7, Math.floor(t * 8))])); };
const chirp = (b: number) => shape(t => Math.sin(TAU * (Math.exp(b * t) - 1) / (Math.exp(b) - 1)));
const hermite = (k: number) => shape(t => { const u = (t - .5) * 7; let h0 = 1, h1 = 2 * u; for (let i = 1; i < k; i++) [h0, h1] = [h1, 2 * u * h1 - 2 * i * h0]; return (k ? h1 : h0) * Math.exp(-u * u / 2); });
// Metallic FM: sine carrier phase-modulated by a sine/square/its own output (sine phase kept per keyframe).
const sqrFm = (I: number, r: number) => shape(t => Math.sin(TAU * t + I * Math.tanh(6 * Math.sin(TAU * r * t))));
/** Real feedback loop: carrier ⇄ 2× modulator cross-modulate through one-sample delays (modulator also feeds itself), run to a steady limit cycle. */
const fbFm = (b: number) => { const C = 12, x = new Float32Array(FRAME); let px = 0, py = 0;
  for (let i = 0; i < FRAME * C; i++) { const t = i / FRAME, ny = Math.sin(TAU * 2 * t + b * (.7 * px + .5 * py)), nx = Math.sin(TAU * t + b * py); px = nx; py = ny; if (i >= FRAME * (C - 1)) x[i - FRAME * (C - 1)] = nx; }
  return shape(t => x[Math.min(FRAME - 1, Math.round(t * FRAME))]); };
const s = spec;
// Vowel formants (Hz → harmonic at ~C3 130 Hz): A 800/1150, E 400/1600, I 270/2300, O 450/800, U 325/700.
const vowel = (f1: number, f2: number) => s(formant(saw, [[f1 / 130, 1.5, 1], [f2 / 130, 2.5, .6], [2600 / 130, 3, .25]]));
let defs: Def[] | null = null;
const DEFS = () => defs ??= [
  ["juno-pwm", "THIN PULSE", [s(pulse(.5)), s(pulse(.25)), s(pulse(.1)), s(pulse(.03))]],
  ["acid-303", "RUBBER SQUARE", [s(n => sqr(n) * (1 / (1 + (n / 24) ** 2))), asym(1.5), asym(3), s(n => saw(n) * (1 / (1 + (n / 40) ** 2)))]],
  ["mini-fat-saw", "FAT SAW", [s(saw), detSaw([0, .05]), detSaw([0, .04, .09]), detSaw([0, .03, .07, .12])]],
  ["prophet-vs", "MORPH SAW", [s(n => saw(n) * Math.exp(-n / 30)), s(n => n % 2 === 0 && n % 4 !== 0 ? 0 : sqr(n) + (n === 2 ? .5 : 0)), s(n => saw(n) * (n > 6 && n < 14 ? 2.5 : 1)), s(n => (n % 3 === 0 ? 1.4 : .6) / Math.sqrt(n))]],
  ["ppg-reso", "GLASS PEAKS", [4, 8, 14, 24].map(c => s(formant(saw, [[c, 1.2, 4]])))],
  ["microwave", "FROST EDGE", [s(n => n === 1 ? 1 : n === 3 ? .3 : n === 5 ? .1 : 0), s(n => (n <= 8 ? 1 : .2) / n), s(n => (odd(n) ? 1 : .3) / Math.sqrt(n) * Math.exp(-n / 40)), s(n => 1 / Math.sqrt(n))]],
  ["cz-reso-saw", "WARP SAW", [czSaw(0), czReso(2), czReso(5), czReso(10)]],
  ["cz-reso-trap", "KNEE SLOPE", [czReso(1, true), czReso(3, true), czReso(6, true), czReso(11, true)]],
  ["fm-bass", "METAL PUNCH", [fm(0, 1), fm(1, 1), fm(2.5, 1), fm(5, 1)]],
  ["fm-bell", "CRYSTAL BELL", [fm(.5, 3), fm(1.5, 3), fm(1.5, 7), fm(3, 7)]],
  ["fm-growl", "GROWL", [fm(1, 2), fm(3, 2), fm(5, 3, 2), fm(8, 2)]],
  ["buchla-fold", "SINE FOLD", [fold(1), fold(3), fold(6), fold(10)]],
  ["b3-drawbars", "WARM BARS", [s(bars("888000000")), s(bars("868000000")), s(bars("888800000")), s(bars("888888888"))]],
  ["rhodes-tine", "SOFT TINE", [s(n => n === 1 ? 1 : 0), s(n => n === 1 ? 1 : n === 2 ? .25 : n === 3 ? .1 : 0), s(n => n === 1 ? 1 : n === 2 ? .5 : n === 3 ? .3 : n === 7 ? .15 : 0), s(n => n <= 4 ? 1 / n : n >= 6 && n <= 9 ? .2 : 0)]],
  ["wurly-reed", "HOLLOW REED", [s(tri), s(n => odd(n) ? 1 / n ** 1.6 : .05 / n), s(n => odd(n) ? 1 / n ** 1.2 : .1 / n), s(n => (odd(n) ? 1 : .3) / n)]],
  ["clavinet", "TWANG", [.5, .3, .15, .06].map(p => s(n => Math.abs(Math.sin(n * Math.PI * p)) / n ** .8))],
  ["vowel-talk", "VOWEL GLIDE", [vowel(800, 1150), vowel(400, 1600), vowel(270, 2300), vowel(325, 700)]],
  ["choir-vox", "AIR CHOIR", [vowel(300, 700), vowel(450, 800), vowel(600, 1000), vowel(800, 1200)]],
  ["glass-harm", "ODD GLASS", [s(n => n === 1 ? 1 : 0), s(n => odd(n) && n <= 5 ? 1 / n : 0), s(n => odd(n) && n <= 11 ? 1 / Math.sqrt(n) : 0), s(n => odd(n) && n <= 21 ? .8 : 0)]],
  ["lofi-8bit", "BRIGHT AIR", [s(n => Math.exp(-n / 6) / n), s(n => Math.exp(-n / 14) / Math.sqrt(n)), s(n => Math.exp(-n / 28) / Math.sqrt(n)), s(n => 1 / n ** .6)]],
  ["math-cheby", "CHEBYSHEV", [s(n => n === 1 ? 1 : 0), s(n => n === 1 ? 1 : n === 2 ? .7 : 0), s(n => n <= 3 ? 1 / n ** .5 : 0), s(n => n <= 5 ? 1 / n ** .3 : 0)]],
  ["math-primes", "PRIMES", [5, 13, 31, 61].map(m => s(n => isPrime(n) && n <= m || n === 1 ? 1 / n ** .7 : 0))],
  ["math-fractal", "FRACTAL", [.3, .5, .65, .8].map(a => s(n => { const k = Math.log2(n); return Number.isInteger(k) ? a ** k : 0; }))],
  ["math-walsh", "WALSH", [1, 3, 5, 6].map(k => shape(t => walsh(k, t)))],
  ["math-zeta", "ZETA TILT", [2, 1.4, 1, .6].map(e => s(n => 1 / n ** e))],
  ["math-fib", "FIBONACCI", [8, 21, 34, 55].map(m => s(n => FIB.includes(n) && n <= m ? 1 / Math.sqrt(n) : 0))],
  ["fold-tri", "TRI FOLD", [triFold(1), triFold(2), triFold(4), triFold(7)]],
  ["fold-asym", "ASYM FOLD", [asymFold(1), asymFold(2.5), asymFold(5), asymFold(8)]],
  ["fold-lockhart", "LOCKHART", [lockhart(1.2), lockhart(2.5), lockhart(4), lockhart(6)]],
  ["fold-cheby", "CHEBY FOLD", [chebFold(1), chebFold(3), chebFold(6), chebFold(10)]],
  ["mod-curve-pwm", "CURVE PWM", [curvePwm(1, 0), curvePwm(1.5, .3), curvePwm(2.2, .55), curvePwm(3, .8)]],
  ["math-dirichlet", "DIRICHLET", [1, 4, 10, 24].map(dirichlet)],
  ["chaos-logistic", "LOGISTIC", [2.8, 3.2, 3.56, 3.9].map(logistic)],
  ["chaos-chirp", "CHIRP", [.01, 1.5, 3.5, 6].map(chirp)],
  ["math-hermite", "HERMITE", [0, 1, 2, 4].map(hermite)],
  ["fm-steel", "STEEL RATIO", [fm(1.5, 2), fm(2, 3), fm(2.5, 5), fm(3, 7)]],
  ["fm-chrome", "CHROME RING", [fm(1, 4, 3), fm(3, 4, 3), fm(5, 5, 3), fm(8, 6)]],
  ["fm-square", "SQUARE SCREAM", [sqrFm(1, 2), sqrFm(2.5, 2), sqrFm(4, 3), sqrFm(6, 4)]],
  ["fm-iron", "IRON FEEDBACK", [.6, 1.4, 2.2, 3.2].map(fbFm)],
] as Def[];

/** Equal RMS (Σa² = 1), so neighbours crossfade at a constant level. */
const norm = (a: Float32Array) => { let e = 0; a.forEach(x => { e += x * x; }); const g = e > 0 ? 1 / Math.sqrt(e) : 0; return a.map(x => x * g); };
const build = ([slug, name, shapes]: Def): WtTable => {
  const mags = shapes.map(norm), frames = mags.map(a => { const f = new Float32Array(FRAME); for (let n = 1; n <= NH; n++) if (a[n]) for (let i = 0; i < FRAME; i++) f[i] += a[n] * Math.sin(2 * Math.PI * n * i / FRAME); return f; });
  let pk = 0; frames.forEach(f => f.forEach(x => { pk = Math.max(pk, Math.abs(x)); }));
  return { id: `fx:${slug}`, name, frames, real: mags.map(() => new Float32Array(NH + 1)), imag: mags, keys: true,
    view: frames.map(f => Array.from({ length: 48 }, (_, i) => f[Math.floor(i * FRAME / 48)] / (pk || 1))) };
};
/** Library order: grouped by wave type, simple to complex. Ids never change, so saved sets keep working. */
const ORDER: [string, string[]][] = [
  ["PLS", ["juno-pwm", "mod-curve-pwm", "acid-303"]],
  ["SAW", ["mini-fat-saw", "prophet-vs", "cz-reso-saw", "cz-reso-trap"]],
  ["ADD", ["b3-drawbars", "rhodes-tine", "wurly-reed", "clavinet", "glass-harm", "lofi-8bit", "microwave"]],
  ["FMT", ["ppg-reso", "vowel-talk", "choir-vox"]],
  ["FM", ["fm-bass", "fm-bell", "fm-growl", "fm-steel", "fm-chrome", "fm-square", "fm-iron"]],
  ["FLD", ["buchla-fold", "fold-tri", "fold-asym", "fold-lockhart", "fold-cheby"]],
  ["MTH", ["math-zeta", "math-cheby", "math-fib", "math-primes", "math-fractal", "math-walsh", "math-dirichlet", "math-hermite"]],
  ["CHS", ["chaos-chirp", "chaos-logistic"]],
];
let refs: { id: string; name: string; group: string }[] | undefined;
export const factoryRefs = () => refs ??= ORDER.flatMap(([group, slugs]) => slugs.map(slug => ({ id: `fx:${slug}`, name: DEFS().find(d => d[0] === slug)![1], group })));
const cache = new Map<string, WtTable>();
export const factoryTable = (id: string): WtTable | null => { const c = cache.get(id); if (c) return c; const d = DEFS().find(x => `fx:${x[0]}` === id); if (!d) return null; const t = build(d); cache.set(id, t); return t; };
export const isFactory = (id?: string) => !!id && id.startsWith("fx:");
/** Truly random factory/user pick that never repeats the current table. */
export const randomPick = <T extends { id: string }>(all: T[], cur?: string): T | undefined => {
  const pool = all.filter(a => a.id !== cur); if (!pool.length) return all[0];
  const u = new Uint32Array(1); crypto.getRandomValues(u); return pool[u[0] % pool.length]; };
