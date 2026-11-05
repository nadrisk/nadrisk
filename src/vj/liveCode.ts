// AV live-code layer: a Strudel-style document built from real pad hits, edited on screen by a simulated human typist.
import type { VjKind, VjPad } from "./bus";
import { noteName } from "./raster";

const DRUM: Partial<Record<VjKind, string>> = { kick: "bd", snare: "sd", hat: "hh", open: "oh", perc: "cp" };
const STALE = 8, MUTE = 8, DROP = 16;
type Tok = string | null;

/** Mini-notation for one sub-span: rests collapse to ~, a lone leading hit collapses to the bare word. */
function render(a: Tok[]): string {
  if (a.every(x => !x)) return "~";
  if (a.length === 1) return a[0] ?? "~";
  if (a[0] && a.slice(1).every(x => !x)) return a[0];
  const h = a.length / 2, wrap = (s: string) => s.includes(" ") ? `[${s}]` : s;
  return `${wrap(render(a.slice(0, h)))} ${wrap(render(a.slice(h)))}`;
}

/** Compact 16-step mini-notation: shortest repeating period, then `x*n` / `[..]*n`. */
export function miniNotation(tok: Tok[]): string {
  let p = 16;
  for (const q of [1, 2, 4, 8]) if (tok.every((x, i) => x === tok[i % q])) { p = q; break; }
  const body = render(tok.slice(0, p)), n = 16 / p;
  if (n === 1) return body;
  return body.includes(" ") ? `[${body}]*${n}` : `${body}*${n}`;
}

export function token(kind: VjKind, pad?: VjPad) {
  const d = DRUM[kind]; if (d) return d;
  const n = pad?.notes?.[0]; return Number.isFinite(n) ? noteName(n as number).toLowerCase().replace("#", "s") : "c3";
}

const num = (v: number) => { const s = (Math.round(v * 100) / 100).toString(); return s.startsWith("0.") ? s.slice(1) : s; };
const FX_CALL: [RegExp, string][] = [[/rev|room|verb/i, "room"], [/del|dly|tape|echo/i, "delay"], [/crush|bit/i, "crush"], [/dist|drive|sat|clip/i, "distort"], [/hack|bend|glitch/i, "coarse"], [/chor|flang|phas/i, "phaser"]];

export type Track = { pad: VjPad; kind: VjKind; tok: Tok[]; at: number[]; last: number; vel: number };

/** The two (or three) lines of one `$:` block. */
export function blockLines(t: Track, muted: boolean): string[] {
  const drum = !!DRUM[t.kind], pat = miniNotation(t.tok);
  const head = `${muted ? "_" : ""}$: ${drum ? "s" : "note"}("${pat}")`;
  const name = t.pad.name.toLowerCase(), eng = (t.pad.engine || "").toLowerCase();
  const calls: string[] = [];
  if (drum) calls.push(`.bank("${/909/.test(name) ? "RolandTR909" : /808/.test(name) ? "RolandTR808" : /ukg|dnb|house|dub|hip/.test(name) ? `nad_${name.split(" ")[0]}` : "nad"}")`);
  else calls.push(`.s("${eng === "808" ? "sine" : eng === "sampler" ? "nad_smp" : eng === "synth" ? "sawtooth" : eng || "triangle"}")`);
  calls.push(`.gain(${num(t.vel)})`);
  const cut = t.pad.cut;
  if (Number.isFinite(cut) && (cut as number) < 12000) calls.push(drum ? `.lpf(${Math.round(cut as number / 50) * 50})` : `.lpf(sine.range(${Math.round((cut as number) / 2 / 50) * 50},${Math.round(cut as number / 50) * 50}).slow(8))`);
  for (const f of t.pad.fx ?? []) { const m = FX_CALL.find(([r]) => r.test(f.type)); if (m && !calls.some(c => c.startsWith(`.${m[1]}`))) calls.push(`.${m[1]}(${num(Math.max(.05, Math.min(1, f.mix)))})`); }
  const out = [head]; let cur = "  ";
  for (const c of calls) { if (cur.length + c.length > 38 && cur.trim()) { out.push(cur); cur = "  "; } cur += c; }
  if (cur.trim()) out.push(cur);
  return out;
}

/** Char span of the k-th sounding atom inside the quoted pattern (rests and *n excluded). */
export function atomSpan(line: string, k: number): [number, number] | null {
  const q0 = line.indexOf('("'), q1 = line.indexOf('")', q0 + 2); if (q0 < 0 || q1 < 0) return null;
  const re = /[a-z][a-z0-9]*/g; re.lastIndex = q0 + 2; let m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(line)) && m.index < q1) { if (i++ === k) return [m.index, m.index + m[0].length]; }
  return null;
}

function rng(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export type CodeView = { lines: string[]; cursor: [number, number]; flash: number[]; status: string; spans: ([number, number] | null)[]; typing: boolean };

export class LiveCode {
  tracks = new Map<number, Track>();
  screen: string[] = ["// nadrisk live set", ""];
  cursor: [number, number] = [0, 0];
  private wait = .6; private rand = rng(7); private typo: string | null = null;
  private flashes: number[] = []; private status = ""; private statusUntil = 0; private t = 0; private dirty = false;
  private target: string[] = []; private blocks: { pad: number; start: number; len: number }[] = [];

  hit(kind: VjKind, vel: number, pad: VjPad | undefined, step: number, beat: number) {
    if (!pad) return;
    let t = this.tracks.get(pad.index);
    if (!t) { t = { pad, kind, tok: Array(16).fill(null), at: Array(16).fill(-1e9), last: beat, vel: Math.round(vel * 20) / 20 }; this.tracks.set(pad.index, t); }
    const i = ((Math.floor(step) % 16) + 16) % 16;
    t.pad = pad; t.kind = kind; t.tok[i] = token(kind, pad); t.at[i] = beat; t.last = beat;
    t.vel = Math.round((t.vel * .8 + vel * .2) * 20) / 20;
  }

  private build(beat: number, bpm: number) {
    const out = ["// nadrisk live set", `setcps(${Math.round(bpm)}/60/4)`, ""]; this.blocks = [];
    for (const [k, t] of [...this.tracks].sort((a, b) => a[0] - b[0])) {
      const idle = beat - t.last;
      if (idle > DROP) { this.tracks.delete(k); continue; }
      if (idle <= MUTE) t.tok = t.tok.map((x, i) => x && beat - t.at[i] > STALE ? null : x);
      const ls = blockLines(t, idle > MUTE);
      this.blocks.push({ pad: k, start: out.length, len: ls.length });
      out.push(...ls, "");
    }
    return out;
  }

  /** One typist action per call when its wait expires: human speed, pauses between edits, rare typo + fix. */
  tick(dt: number, beat: number, bpm: number) {
    this.t += dt;
    if (dt > 0) this.target = this.build(beat, bpm);
    this.flashes = this.flashes.map(f => Math.max(0, f - dt * 3));
    this.wait -= dt;
    let guard = 0;
    while (this.wait <= 0 && guard++ < 50) this.step();
  }

  private step() {
    const S = this.screen, T = this.target, r = this.rand;
    const slow = () => .045 + r() * .09 + (r() < .06 ? .25 + r() * .3 : 0);
    if (this.typo !== null) { const [l, c] = this.cursor; S[l] = S[l].slice(0, c - 1) + S[l].slice(c); this.cursor = [l, c - 1]; this.typo = null; this.wait += .12 + r() * .1; return; }
    let l = 0; while (l < S.length && l < T.length && S[l] === T[l]) l++;
    if (l >= S.length && l >= T.length) {
      if (this.dirty) { this.dirty = false; this.evaluate(); this.wait += .5 + r() * 1.2; } else this.wait += .25;
      return;
    }
    const startEdit = this.cursor[0] !== l;
    if (startEdit) this.wait += .25 + r() * .5;
    this.dirty = true;
    if (l >= T.length) { // extra screen lines: clear then remove
      if (S[l]) { S[l] = S[l].slice(0, -Math.min(S[l].length, 3)); this.cursor = [l, S[l].length]; this.wait += .02; }
      else { S.splice(l, 1); this.cursor = [Math.max(0, l - 1), S[Math.max(0, l - 1)]?.length ?? 0]; this.wait += .05; }
      return;
    }
    if (l >= S.length) { S.push(""); this.cursor = [l, 0]; this.wait += .1; return; }
    const a = S[l], b = T[l];
    let p = 0; while (p < a.length && p < b.length && a[p] === b[p]) p++;
    let q = 0; while (q < a.length - p && q < b.length - p && a[a.length - 1 - q] === b[b.length - 1 - q]) q++;
    if (a.length - q > p) { const at = a.length - q; S[l] = a.slice(0, at - 1) + a.slice(at); this.cursor = [l, at - 1]; this.wait += .035 + r() * .04; return; }
    const ch = b[p];
    if (r() < .025 && /[a-z]/.test(ch)) { const wrong = "asdfghjklqwertyuiop"[Math.floor(r() * 19)]; S[l] = a.slice(0, p) + wrong + a.slice(p); this.cursor = [l, p + 1]; this.typo = wrong; this.wait += .15 + r() * .2; return; }
    S[l] = a.slice(0, p) + ch + a.slice(p); this.cursor = [l, p + 1]; this.wait += slow();
  }

  private evaluate() {
    const l = this.cursor[0], b = this.blocks.find(x => l >= x.start && l < x.start + x.len);
    const from = b ? b.start : 0, len = b ? b.len : this.screen.length;
    for (let i = from; i < from + len; i++) this.flashes[i] = 1;
    this.status = `// evaluated ${b ? `p${b.pad + 1}` : "all"}`; this.statusUntil = this.t + 1.4;
  }

  view(step: number): CodeView {
    const i = ((Math.floor(step) % 16) + 16) % 16;
    const spans = this.screen.map((): [number, number] | null => null);
    for (const b of this.blocks) {
      const t = this.tracks.get(b.pad), line = this.screen[b.start];
      if (!t || !t.tok[i] || line !== this.target[b.start] || line.startsWith("_")) continue;
      let p = 16; for (const q of [1, 2, 4, 8]) if (t.tok.every((x, j) => x === t.tok[j % q])) { p = q; break; }
      const k = t.tok.slice(0, i % p).filter(Boolean).length;
      spans[b.start] = atomSpan(line, k);
    }
    return { lines: this.screen, cursor: this.cursor, flash: this.screen.map((_, j) => this.flashes[j] ?? 0), status: this.t < this.statusUntil ? this.status : "", spans, typing: this.dirty };
  }

  /** Steps hit per sounding track for the punchcard strip. */
  punch() { return [...this.tracks].sort((a, b) => a[0] - b[0]).map(([, t]) => t.tok.map(Boolean)); }
}
