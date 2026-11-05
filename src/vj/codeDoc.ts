// Groovebox → live-code text. Pure: pads in, styled lines + playable atom spans out.
// Pads are grouped (drums/bass/synth/samples) into comma-stacked layers so the screen stays short.
import type { DocPad, VjKind } from "./bus";
import { noteName } from "./raster";

const DRUM: Partial<Record<VjKind, string>> = { kick: "bd", snare: "sd", hat: "hh", open: "oh", perc: "cp" };
export type Atom = { at: number; len: number; step: number };
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

export type Layer = { pad: number; period: number; atoms: Atom[] };
export type DocLine = { text: string; layers?: Layer[]; muted?: boolean };
export type Group = "drums" | "bass" | "synth" | "samples";

const FX_CALL: [RegExp, string][] = [[/rev|room|verb/i, "room"], [/del|dly|tape|echo/i, "delay"], [/crush|bit/i, "crush"], [/dist|drive|sat|clip/i, "distort"], [/hack|bend|glitch/i, "coarse"], [/chor|flang|phas/i, "phaser"]];
const SOUND: Record<Group, string> = { drums: "", bass: "sine", synth: "sawtooth", samples: "nad_smp" };

const isDrum = (p: DocPad) => !!DRUM[p.kind] && p.engine !== "synth" && p.engine !== "808" && p.engine !== "sampler";
export function groupOf(p: DocPad): Group {
  if (p.engine === "sampler") return "samples";
  if (p.engine === "808") return "bass";
  if (isDrum(p) || p.engine === "drum" || p.engine === "idm") return "drums";
  return "synth";
}
/** Short label used in code and on the step grid. */
export function padWord(p: DocPad) { return isDrum(p) ? DRUM[p.kind]! : noteName(p.note).toLowerCase().replace("#", "s"); }

export function groupPads(pads: DocPad[]) {
  const order: Group[] = ["drums", "bass", "synth", "samples"], m = new Map<Group, DocPad[]>();
  for (const p of pads) { const g = groupOf(p); m.set(g, [...(m.get(g) ?? []), p]); }
  return order.filter(g => m.has(g)).map(g => ({ group: g, pads: m.get(g)! }));
}

/** One pad as a layer string; tracks shorter/longer than 16 get a speed wrap. */
function layer(p: DocPad): { s: string; layer: Layer } {
  const w = padWord(p);
  const tok = p.steps.map((v, i) => v === 1 ? w + (p.chance[i] < .995 ? `?${num(1 - p.chance[i])}` : "") : v >= 2 ? "_" : null);
  const m = mini(tok);
  let s = m.s, atoms = m.atoms;
  if (p.len !== 16) { const k = p.len < 16 ? `*${num(16 / p.len)}` : `/${num(p.len / 16)}`; s = `[${s}]${k}`; atoms = atoms.map(a => ({ ...a, at: a.at + 1 })); }
  return { s, layer: { pad: p.index, period: m.period, atoms } };
}

const MAXW = 44;

/** One `name:` block per group. Muted/unsoloed pads drop out of the stack (they stay on the step grid). */
export function groupBlock(group: Group, pads: DocPad[], soloActive: boolean): DocLine[] {
  const live = pads.filter(p => !(p.mute || (soloActive && !p.solo)));
  const muted = !live.length, use = muted ? pads : live;
  const parts = use.map(layer), fn = group === "drums" ? "s" : "note";
  const head = `${muted ? "_" : ""}${group}: ${fn}("`;
  const out: DocLine[] = [];
  const one = head + parts.map(x => x.s).join(", ") + '")';
  if (one.length <= MAXW) {
    let at = head.length; const layers: Layer[] = [];
    for (const x of parts) { layers.push({ ...x.layer, atoms: x.layer.atoms.map(a => ({ ...a, at: a.at + at })) }); at += x.s.length + 2; }
    out.push({ text: one, layers, muted });
  } else {
    out.push({ text: head.slice(0, -1) + "`", muted });
    parts.forEach((x, i) => { const pre = "  "; out.push({ text: pre + x.s + (i < parts.length - 1 ? "," : "`)"), layers: [{ ...x.layer, atoms: x.layer.atoms.map(a => ({ ...a, at: a.at + pre.length })) }], muted }); });
  }
  const calls: string[] = [];
  if (SOUND[group]) calls.push(`.s("${SOUND[group]}")`);
  const cuts = use.map(p => p.cut).filter((c): c is number => Number.isFinite(c) && (c as number) < 16000);
  if (cuts.length) calls.push(`.lpf(${Math.round(Math.min(...cuts) / 10) * 10})`);
  for (const p of use) for (const f of p.fx) { const c = FX_CALL.find(([r]) => r.test(f.type)); if (c && f.mix > .02 && !calls.some(x => x.startsWith(`.${c[1]}`))) calls.push(`.${c[1]}(${num(Math.max(.05, Math.min(1, f.mix)))})`); }
  let cur = "  ";
  for (const c of calls) { if (cur.length + c.length > MAXW && cur.trim()) { out.push({ text: cur, muted }); cur = "  "; } cur += c; }
  if (cur.trim()) out.push({ text: cur, muted });
  return out;
}

export function codeDoc(pads: DocPad[], bpm: number, bank: string): DocLine[] {
  const solo = pads.some(p => p.solo);
  const out: DocLine[] = [{ text: `// nadrisk groovebox · bank ${bank} · ${Math.round(bpm)} bpm` }, { text: "" }];
  if (!pads.length) out.push({ text: 'drums: s("~") // add steps in the sequencer' });
  for (const g of groupPads(pads)) out.push(...groupBlock(g.group, g.pads, solo), { text: "" });
  return out;
}

/** Atom span sounding at transport tick for one layer, following ties back to their hit. */
export function activeAtom(l: Layer, steps: number[], tick: number): Atom | null {
  if (!steps.length) return null;
  let k = ((tick % steps.length) + steps.length) % steps.length, guard = steps.length;
  while (steps[k] >= 2 && guard--) k = (k - 1 + steps.length) % steps.length;
  if (steps[k] !== 1) return null;
  const s = k % l.period;
  return l.atoms.find(a => a.step === s) ?? null;
}
