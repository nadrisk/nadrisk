import type { Slot } from "@/hooks/useGroovebox";
import { cleanOf } from "./clean";
import { idmParams } from "./idm";
import { reeseParams } from "./reese";
import { acidParams } from "./acid";
import type { ADSR } from "./voices";

/** Instrument XY: X = tight (-1) .. open (+1), Y = dark (-1) .. bright (+1). The centre is the patch exactly as saved.
 *  Each engine moves only its own sound controls; the result is never stored until COMMIT. */
export type XY = { x: number; y: number; hold?: boolean };
export const XY_CENTER: XY = { x: 0, y: 0 };
const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const oct = (v: number, n: number, lo: number, hi: number) => cl(v * 2 ** n, lo, hi);
const envXY = (e: ADSR, x: number): ADSR => ({ a: oct(e.a, x * 2.5, .001, 4), d: oct(e.d, x * 1.6, .01, 6), s: e.s, r: oct(e.r, x * 2.2, .01, 8) });

/** Returns the slot with its XY offset applied to the current engine's sound fields. */
export function applyXY(s: Slot): Slot {
  const x = cl(s.xy?.x ?? 0, -1, 1), y = cl(s.xy?.y ?? 0, -1, 1);
  if (!x && !y) return s;
  if (s.engine === "synth") {
    const c = cleanOf(s.synth);
    return { ...s, synth: { ...s.synth, clean: { ...c, env: envXY(c.env, x), detune: cl(c.detune + x * .35, 0, 1), sub: cl(c.sub - x * .2, 0, 1), glide: oct(c.glide || .02, x, 0, .5),
      cutoff: oct(c.cutoff, y * 3, 40, 16000), res: cl(c.res + y * .3, 0, 1), envAmt: cl(c.envAmt + y * .35, 0, 1), drive: cl(c.drive + Math.max(0, y) * .45, 0, 1), wave: cl(c.wave - y * 1.2, 0, 3) } } };
  }
  if (s.engine === "808") {
    const b = s.bass;
    if (b.mode === "acid") { const a = acidParams(b.acid); return { ...s, bass: { ...b, acid: { ...a, decay: oct(a.decay, x * 1.4, .06, 1.5), accent: cl(a.accent + x * .3, 0, 1), cutoff: oct(a.cutoff, y * 2.2, 40, 8000), res: cl(a.res + y * .25, 0, 1), envMod: cl(a.envMod + y * 1.6, 0, 5), drive: cl(a.drive + Math.max(0, y) * .4, 0, 1) } } }; }
    if (b.mode === "reese") { const r = reeseParams(b.reese); return { ...s, bass: { ...b, reese: { ...r, detune: cl(r.detune + x * 16, 0, 50), width: cl(r.width + x * .35, 0, 1), drift: cl(r.drift + x * .3, 0, 1), env: envXY(r.env, x), cutoff: oct(r.cutoff, y * 2.6, 40, 16000), res: cl(r.res + y * 2.5, 0, 8), sub: cl(r.sub - y * .3, 0, 1) } } }; }
    return { ...s, bass: { ...b, decay: oct(b.decay, x * 1.5, .05, 4), pitchDecay: oct(b.pitchDecay, x, .005, .4), pitchEnv: cl(b.pitchEnv + x * 10, 0, 48), tone: oct(b.tone, y * 2, 200, 16000), harmonics: cl(b.harmonics + y * .45, 0, 1), click: cl(b.click + y * .4, 0, 1), tube: cl(b.tube + Math.max(0, y) * .4, 0, 1) } };
  }
  if (s.engine === "drum") {
    const d = s.drum;
    return { ...s, drum: { ...d, env: { ...d.env, d: oct(d.env.d, x * 1.5, .01, 4) }, pitchDecay: oct(d.pitchDecay, x, .003, .5), noiseDecay: d.noiseDecay !== undefined ? oct(d.noiseDecay, x * 1.2, .01, 1) : undefined, tail: d.tail !== undefined ? cl(d.tail + x * .3, 0, 1) : undefined,
      cutoff: oct(d.cutoff, y * 2, 40, 16000), drive: cl((d.drive ?? 0) + Math.max(0, y) * .45, 0, 1), noiseTone: d.noiseTone !== undefined ? oct(d.noiseTone, y, 200, 12000) : undefined, fm: Math.max(0, d.fm * (1 + y * .7)), transient: cl((d.transient ?? .3) + y * .3, 0, 1) } };
  }
  if (s.engine === "idm") {
    const p = idmParams(s.idm);
    return { ...s, idm: { ...p, decay: oct(p.decay, x * 1.8, .01, 3), a: cl(p.a + x * .25, 0, 1), c: cl(p.c + y * .4, 0, 1), b: cl(p.b + y * .2, 0, 1), grit: cl(p.grit + Math.max(0, y) * .45, 0, 1), drive: cl(p.drive + Math.max(0, y) * .3, 0, 1), tune: oct(p.tune, y * .5, 20, 12000) } };
  }
  if (s.engine === "sampler") {
    const m = s.sampler;
    return { ...s, sampler: { ...m, env: envXY(m.env, x), grainSize: oct(m.grainSize ?? .08, x, .02, .4), spray: cl((m.spray ?? .1) + x * .25, 0, 1), loopXfade: cl((m.loopXfade ?? 0) + x * .3, 0, 1),
      fine: cl((m.fine ?? 0) + y * 35, -50, 50), grainDens: oct(m.grainDens ?? 12, y, 2, 40), grainRnd: cl((m.grainRnd ?? 0) + Math.max(0, y) * .6, 0, 4) } };
  }
  return s;
}

/** Fields an engine's XY touches, so COMMIT writes only those into the pad. */
export function commitXY(s: Slot): Partial<Slot> {
  const a = applyXY(s), z = { xy: { ...XY_CENTER, hold: s.xy?.hold } };
  if (s.engine === "synth") return { synth: a.synth, ...z };
  if (s.engine === "808") return { bass: a.bass, ...z };
  if (s.engine === "drum") return { drum: a.drum, ...z };
  if (s.engine === "idm") return { idm: a.idm, ...z };
  if (s.engine === "sampler") return { sampler: a.sampler, ...z };
  return z;
}

/** Short readouts of what the pad is moving, for the XY screen. */
export function xyLabels(s: Slot): [string, string] {
  if (s.engine === "synth") return ["ENV DET SUB", "CUT RES WAVE"];
  if (s.engine === "808") return s.bass.mode === "acid" ? ["DEC ACC", "CUT RES ENV"] : s.bass.mode === "reese" ? ["DET WID ENV", "CUT RES SUB"] : ["DEC PENV", "TONE HRM CLK"];
  if (s.engine === "drum") return ["DEC TAIL", "CUT DRV FM"];
  if (s.engine === "idm") return ["DEC SHAPE", "TONE GRIT"];
  return ["ENV GRAIN", "FINE DENS"];
}
