// Groovebox → Strudel program. Pure: pads in, styled lines + playable atom spans out.
import type { DocPad, VjKind } from "./bus";
import { noteName } from "./raster";

const DRUM: Partial<Record<VjKind, string>> = { kick: "bd", snare: "sd", hat: "hh", open: "oh", perc: "cp" };
type Atom = { at: number; len: number; step: number };
type Mini = { s: string; atoms: Atom[] };

const isPow2 = (n: number) => n >= 1 && (n & (n - 1)) === 0;
const num = (v: number) => { const s = (Math.round(v * 100) / 100).toString(); return s.startsWith("0.") ? s.slice(1) : s; };

/** Recursive halving render. Tokens null = rest, "_" = tie; a lone leading hit collapses to its word. */
function render(a: (string | null)[], base: number): Mini {
  if (a.every(x => !x)) return { s: "~", atoms: [] };
  if (a.length === 1) return a[0] === "_" ? { s: "_", atoms: [] } : { s: a[0]!, atoms: [{ at: 0, len: a[0]!.length, step: base }] };
  if (a[0] && a[0] !== "_" && a.slice(1).every(x => !x)) return { s: a[0], atoms: [{ at: 0, len: a[0].length, step: base }] };
  const h = a.length / 2, L = render(a.slice(0, h), base), R = render(a.slice(h), base + h);
  const wrap = (m: Mini): Mini => m.s.includes(" ") ? { s: `[${m.s}]`, atoms: m.atoms.map(x => ({ ...x, at: x.at + 1 })) } : m;
  const l = wrap(L), r = wrap(R), off = l.s.length + 1;
  return { s: `${l.s} ${r.s}`, atoms: [...l.atoms, ...r.atoms.map(x => ({ ...x, at: x.at + off }))] };
}

/** Mini-notation for a row of tokens: shortest repeat period, `x*n` / `[..]*n`, flat sequence for odd lengths. */
export function mini(tok: (string | null)[]): Mini & { period: number } {
  const n = tok.length;
  if (!isPow2(n)) {
    let s = ""; const atoms: Atom[] = [];
    tok.forEach((t, i) => { if (i) s += " "; const w = t ?? "~"; if (t && t !== "_") atoms.push({ at: s.length, len: w.length, step: i }); s += w; });
    return { s, atoms, period: n };
  }
  let p = n;
  for (let q = 1; q < n; q *= 2) if (tok.every((x, i) => x === tok[i % q])) { p = q; break; }
  const body = render(tok.slice(0, p), 0), k = n / p;
  if (k === 1) return { ...body, period: p };
  if (body.s.includes(" ")) return { s: `[${body.s}]*${k}`, atoms: body.atoms.map(a => ({ ...a, at: a.at + 1 })), period: p };
  return { s: `${body.s}*${k}`, atoms: body.atoms, period: p };
}
export const miniNotation = (tok: (string | null)[]) => mini(tok).s;

export type DocLine = { text: string; atoms?: Atom[]; pad?: number; period?: number; punch?: number };

const FX_CALL: [RegExp, string][] = [[/rev|room|verb/i, "room"], [/del|dly|tape|echo/i, "delay"], [/crush|bit/i, "crush"], [/dist|drive|sat|clip/i, "distort"], [/hack|bend|glitch/i, "coarse"], [/chor|flang|phas/i, "phaser"]];
const SOUND: Record<string, string> = { synth: "sawtooth", "808": "sine", sampler: "nad_smp", idm: "nad_prc", poly: "square", siren: "triangle" };

function bankOf(name: string) { const n = name.toLowerCase(); return /909/.test(n) ? "RolandTR909" : /808/.test(n) ? "RolandTR808" : /house/.test(n) ? "RolandTR909" : /ukg|dnb|dub|hip/.test(n) ? "AkaiMPC60" : ""; }

/** Lines for one pad's `$:` block (comment, pattern, chained calls, punchcard). */
export function padBlock(p: DocPad, soloActive: boolean): DocLine[] {
  const drum = !!DRUM[p.kind as VjKind] && p.engine !== "synth" && p.engine !== "808";
  const word = drum ? DRUM[p.kind as VjKind]! : noteName(p.note).toLowerCase().replace("#", "s");
  const tok = p.steps.map((v, i) => v === 1 ? word + (p.chance[i] < .995 ? `?${num(1 - p.chance[i])}` : "") : v >= 2 ? "_" : null);
  const m = mini(tok), muted = p.mute || (soloActive && !p.solo);
  const head = `${muted ? "_" : ""}$: ${drum ? "s" : "note"}("`;
  const out: DocLine[] = [{ text: `// pad ${p.index + 1} ${p.name || p.engine.toUpperCase()}${p.solo ? " · solo" : ""}` }];
  out.push({ text: head + m.s + '")', atoms: m.atoms.map(a => ({ ...a, at: a.at + head.length })), pad: p.index, period: m.period });
  const calls: string[] = [];
  if (!drum) calls.push(`.s("${SOUND[p.engine] ?? "triangle"}")`);
  else { const b = bankOf(p.name); if (b) calls.push(`.bank("${b}")`); }
  if (p.len !== 16) calls.push(p.len < 16 ? `.fast(16/${p.len})` : `.slow(${p.len}/16)`);
  const hv = p.vel.filter((_, i) => p.steps[i] === 1);
  if (hv.length && hv.some(v => Math.abs(v - hv[0]) > .02)) calls.push(`.velocity("${mini(p.steps.map((v, i) => v === 1 ? num(p.vel[i]) : v >= 2 ? "_" : null)).s}")`);
  else calls.push(`.gain(${num(hv[0] ?? 1)})`);
  if (p.env) calls.push(`.attack(${num(Math.max(.001, p.env.a))}).release(${num(p.env.r)})`);
  if (Number.isFinite(p.cut) && (p.cut as number) < 16000) calls.push(`.lpf(${Math.round((p.cut as number) / 10) * 10})`);
  for (const f of p.fx) { const c = FX_CALL.find(([r]) => r.test(f.type)); if (c && !calls.some(x => x.startsWith(`.${c[1]}`))) calls.push(`.${c[1]}(${num(Math.max(.05, Math.min(1, f.mix)))})`); }
  let cur = "  ";
  for (const c of calls) { if (cur.length + c.length > 46 && cur.trim()) { out.push({ text: cur }); cur = "  "; } cur += c; }
  out.push({ text: cur + "._punchcard()", punch: p.index });
  return out;
}

export function strudelDoc(pads: DocPad[], bpm: number, bank: string): DocLine[] {
  const solo = pads.some(p => p.solo);
  const out: DocLine[] = [{ text: `// nadrisk groovebox · bank ${bank}` }, { text: `setcps(${Math.round(bpm)}/60/4)` }, { text: "" }];
  if (!pads.length) out.push({ text: '$: s("~") // add steps in the sequencer' });
  for (const p of pads) out.push(...padBlock(p, solo), { text: "" });
  return out;
}

/** Atom span (absolute chars) sounding at transport tick for this line, following ties back to their hit. */
export function activeAtom(line: DocLine, steps: number[], tick: number): Atom | null {
  if (!line.atoms || !steps.length) return null;
  let k = ((tick % steps.length) + steps.length) % steps.length, guard = steps.length;
  while (steps[k] >= 2 && guard--) k = (k - 1 + steps.length) % steps.length;
  if (steps[k] !== 1) return null;
  const s = k % (line.period ?? steps.length);
  return line.atoms.find(a => a.step === s) ?? null;
}
