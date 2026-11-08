import type { Slot } from "@/hooks/useGroovebox";
import { cleanOf } from "./clean";
import { idmParams } from "./idm";
import { reeseParams } from "./reese";
import { acidParams } from "./acid";
import type { ADSR } from "./voices";
import { padParams } from "./pad";

/** Instrument XY: X = tight (-1) .. open (+1), Y = dark (-1) .. bright (+1). The centre is the patch exactly as saved.
 *  Each engine moves only its own sound controls; the result is never stored until COMMIT. */
/** ox/oy = where the dot sat at the last SET: the knobs already hold that sound, so offsets are measured from there. */
/** rec/lfo = optional motion (src/audio/xyMotion.ts); held = finger on the pad right now, which overrides motion. */
export type XY = { x: number; y: number; hold?: boolean; ox?: number; oy?: number; held?: boolean; rec?: import("./xyMotion").XYRec; lfo?: import("./xyMotion").XYLfo };
export const XY_CENTER: XY = { x: 0, y: 0 };
const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const oct = (v: number, n: number, lo: number, hi: number) => cl(v * 2 ** n, lo, hi);
/** Asymmetric sweep: toward TIGHT (x<0) uses the stronger `tight` octave range so sounds turn short and plucky. */
const tw = (x: number, open: number, tight: number) => x < 0 ? x * tight : x * open;
/** TIGHT = pluck: instant attack, short decay, sustain falls away, short release. OPEN = bloom. */
const envXY = (e: ADSR, x: number): ADSR => ({ a: oct(e.a, tw(x, 2.5, 4), .001, 4), d: oct(e.d, tw(x, 1.6, 2.6), .008, 6), s: x < 0 ? e.s * (1 + x * .9) : e.s, r: oct(e.r, tw(x, 2.2, 3), .01, 8) });

/** The saved-sound point on the pad (last SET position, centre if never set). */
export const xyHome = (xy?: XY) => ({ x: xy?.ox ?? 0, y: xy?.oy ?? 0 });

/** Returns the slot with its XY offset applied to the current engine's sound fields. */
export function applyXY(s: Slot): Slot {
  const h = xyHome(s.xy), x = cl((s.xy?.x ?? 0) - h.x, -1, 1), y = cl((s.xy?.y ?? 0) - h.y, -1, 1);
  if (Math.abs(x) < 1e-6 && Math.abs(y) < 1e-6) return s;
  if (s.engine === "synth") {
    const c = cleanOf(s.synth);
    return { ...s, synth: { ...s.synth, clean: { ...c, env: envXY(c.env, x), detune: cl(c.detune + x * .35, 0, 1), sub: cl(c.sub - x * .2, 0, 1), glide: oct(c.glide || .02, x, 0, .5),
      cutoff: oct(c.cutoff, y * 3, 40, 16000), res: cl(c.res + y * .3, 0, 1), envAmt: cl(c.envAmt + y * .35, 0, 1), drive: cl(c.drive + Math.max(0, y) * .45, 0, 1), wave: cl(c.wave - y * 1.2, 0, 3) } } };
  }
  if (s.engine === "pad") {
    // X = dark .. bright (filter, vowel morph); Y = short (-1) .. long (+1) attack/release. Always dry.
    const p = padParams(s.pad);
    return { ...s, pad: { ...p, bright: cl(p.bright + x * .5, 0, 1), atk: oct(p.atk, y * 1.5, .002, 6), rel: oct(p.rel, y * 1.2, .05, 8) } };
  }
  if (s.engine === "808") {
    const b = s.bass;
    // ACID: X = tight (short, little env) <-> open (long, deep env sweep); Y = dark <-> bright, cutoff and resonance rise together.
    if (b.mode === "acid") { const a = acidParams(b.acid); return { ...s, bass: { ...b, acid: { ...a, decay: oct(a.decay, tw(x, 2.2, 3), .03, 2), envMod: cl(a.envMod + x * 2.5, 0, 5), accent: cl(a.accent + x * .3, 0, 1), cutoff: oct(a.cutoff, y * 2.4, 40, 8000), res: cl(a.res + y * .6, 0, 1), drive: cl(a.drive + Math.max(0, y) * .3, 0, 1) } } }; }
    if (b.mode === "reese") { const r = reeseParams(b.reese); return { ...s, bass: { ...b, reese: { ...r, detune: cl(r.detune + x * 16, 0, 50), width: cl(r.width + x * .35, 0, 1), drift: cl(r.drift + x * .3, 0, 1), env: envXY(r.env, x), cutoff: oct(r.cutoff, y * 2.6, 40, 16000), res: cl(r.res + y * 2.5, 0, 8), sub: cl(r.sub - y * .3, 0, 1) } } }; }
    return { ...s, bass: { ...b, decay: oct(b.decay, tw(x, 1.5, 2.5), .04, 4), pitchDecay: oct(b.pitchDecay, x, .005, .4), pitchEnv: cl(b.pitchEnv + x * 10, 0, 48), tone: oct(b.tone, y * 2, 200, 16000), harmonics: cl(b.harmonics + Math.max(0, y) * .8, 0, 1), click: cl(b.click + y * .3, 0, 1), tube: cl(b.tube + Math.max(0, y) * .7, 0, 1) } };
  }
  if (s.engine === "drum") {
    // Hats open much further (closed tick -> long open hat); everything chokes harder toward TIGHT.
    const d = s.drum, hat = d.kind === "hat";
    return { ...s, drum: { ...d, env: { ...d.env, d: oct(d.env.d, tw(x, hat ? 3.6 : 1.5, 2.4), .008, 4), r: oct(d.env.r, tw(x, hat ? 2.5 : 1, 2), .005, 2) }, pitchDecay: oct(d.pitchDecay, x, .003, .5), noiseDecay: d.noiseDecay !== undefined ? oct(d.noiseDecay, tw(x, 1.2, 2), .008, 1) : undefined, tail: d.tail !== undefined ? cl(d.tail + x * .3, 0, 1) : undefined,
      cutoff: oct(d.cutoff, y * 2, 40, 16000), drive: cl((d.drive ?? 0) + Math.max(0, y) * .45, 0, 1), noiseTone: d.noiseTone !== undefined ? oct(d.noiseTone, y, 200, 12000) : undefined, fm: Math.max(0, d.fm * (1 + y * .7)), transient: cl((d.transient ?? .3) + y * .3, 0, 1) } };
  }
  if (s.engine === "idm") {
    const p = idmParams(s.idm);
    // X = model knob (COLR / FOLD); Y = TUNE (±1.5 oct) + P.ENV together.
    return { ...s, idm: { ...p, a: cl(p.a + x * .6, 0, 1), tune: oct(p.tune, y * 1.5, 20, 12000), penv: cl(p.penv + y * .6, -1, 1) } };
  }
  if (s.engine === "sampler") {
    // Never touches pitch or fine tune, so samples stay in key. Y = tone on the channel high shelf in every mode.
    const m = s.sampler, eq = s.eq ?? { low: 0, lowFreq: 100, mid: 0, midFreq: 1000, q: .7, high: 0, highFreq: 9000 };
    const tone = { ...eq, high: cl(eq.high + y * 9, -18, 18), highFreq: y < 0 ? oct(eq.highFreq, y * 1.5, 1500, 16000) : eq.highFreq };
    // Stretch variants are cached buffers: quantise so moving the dot reuses a few renders instead of baking one per hit.
    const q = (v: number, n: number) => Math.round(v * n) / n;
    if (m.grain) return { ...s, eq: tone, sampler: { ...m, grainSize: oct(m.grainSize ?? .08, x * 1.5, .02, .4), spray: cl((m.spray ?? .1) + x * .3, 0, 1), start: cl(m.start + y * .3, 0, Math.min(.98, (m.end ?? 1) - .02)) } };
    if (m.stretch) return { ...s, eq: tone, sampler: { ...m, env: envXY(m.env, x), stretchAmt: q(oct(m.stretchAmt ?? 1, x, .25, 4), 8), stretchGrain: q(oct(m.stretchGrain ?? .05, -y, .01, .2), 200) } };
    const end = Math.min(m.endFrac ?? 1, m.end ?? 1), e2 = cl(x < 0 ? end * (1 + x * .85) : end + (1 - end) * x, m.start + .02, 1);
    return { ...s, eq: tone, sampler: { ...m, env: envXY(m.env, x), end: e2, endFrac: e2 } };
  }
  return s;
}

/** Fields an engine's XY touches, so COMMIT writes only those into the pad. */
export function commitXY(s: Slot): Partial<Slot> {
  const x = s.xy?.x ?? 0, y = s.xy?.y ?? 0, a = applyXY(s), z = { xy: { x, y, hold: s.xy?.hold, ox: x, oy: y } };
  if (s.engine === "synth") return { synth: a.synth, ...z };
  if (s.engine === "pad") return { pad: a.pad, ...z };
  if (s.engine === "808") return { bass: a.bass, ...z };
  if (s.engine === "drum") return { drum: a.drum, ...z };
  if (s.engine === "idm") return { idm: a.idm, ...z };
  if (s.engine === "sampler") return { sampler: a.sampler, eq: a.eq, ...z };
  return z;
}

/** Short readouts of what the pad is moving, for the XY screen. */
export function xyLabels(s: Slot): [string, string] {
  if (s.engine === "synth") return ["ENV DET SUB", "CUT RES WAVE"];
  if (s.engine === "pad") return ["BRIGHT VOWL", "ATK REL"];
  if (s.engine === "808") return s.bass.mode === "acid" ? ["DEC ENV", "CUT RES"] : s.bass.mode === "reese" ? ["DET WID ENV", "CUT RES SUB"] : ["DEC PENV", "HRM DRV"];
  if (s.engine === "drum") return ["DEC TAIL", "CUT DRV FM"];
  if (s.engine === "idm") return [idmParams(s.idm).model === "nois" ? "COLR" : "FOLD", "TUNE P.ENV"];
  if (s.sampler.grain) return ["SIZE SPRAY", "POS TONE"];
  if (s.sampler.stretch) return ["STRCH ENV", "GRAIN TONE"];
  return ["END ENV", "TONE"];
}

/** Corner words for the pad: [left, right, top, bottom]. */
export function xyCorners(s: Slot): [string, string, string, string] {
  if (s.engine === "sampler" && s.sampler.grain) return ["TIGHT", "WIDE", "FWD", "BACK"];
  if (s.engine === "sampler" && s.sampler.stretch) return ["SHRT", "LONG", "BRT", "DRK"];
  if (s.engine === "pad") return ["DARK", "BRT", "LONG", "SHRT"];
  return ["TIGHT", "OPEN", "BRT", "DRK"];
}
