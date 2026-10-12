import type { Slot } from "@/hooks/useGroovebox";

/** A pad's sound + effects rack. Rhythm, phrases, name, mute/solo and choke stay with the pad. */
export type PatchSound = Partial<Pick<Slot, "engine" | "note" | "drum" | "synth" | "sampler" | "poly" | "bass" | "siren" | "chord" | "eq" | "fx">>;
export type SampleMap = Record<string, { name: string; type: string; data: string }>;
export type Patch = { v: 1; id: string; name: string; engine: Slot["engine"]; savedAt: number; sound: PatchSound };
export const PATCH_KEY = "nadrisk.patches.v1";
const ENGINES = ["drum", "synth", "sampler", "poly", "808", "siren"];
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function capturePatch(s: Slot, name: string): Patch {
  const { engine, note, drum, synth, sampler, poly, bass, siren, chord, eq, fx } = s;
  return { v: 1, id: newId(), name: name.trim() || "PATCH", engine, savedAt: Date.now(), sound: copy({ engine, note, drum, synth, sampler, poly, bass, siren, chord, eq, fx }) };
}

/** Accepts anything parsed from JSON and returns a safe patch, or null. */
export function validPatch(x: unknown): Patch | null {
  if (!x || typeof x !== "object") return null;
  const p = x as Partial<Patch>, snd = p.sound;
  if (!snd || typeof snd !== "object") return null;
  const engine = (ENGINES.includes(String(snd.engine)) ? snd.engine : ENGINES.includes(String(p.engine)) ? p.engine : null) as Slot["engine"] | null;
  if (!engine) return null;
  // Older POLY-ACID patches now belong to the 808.
  const finalEngine = engine === "poly" && (snd.poly as { mode?: string } | undefined)?.mode === "acid" ? "808" : engine;
  return { v: 1, id: typeof p.id === "string" ? p.id : newId(), name: String(p.name ?? "PATCH").slice(0, 24) || "PATCH", engine: finalEngine, savedAt: Number(p.savedAt) || Date.now(), sound: { ...copy(snd), engine, fx: Array.isArray(snd.fx) ? copy(snd.fx) : [] } };
}

export function uniqueName(name: string, taken: string[]) {
  const set = new Set(taken.map(t => t.toUpperCase()));
  if (!set.has(name.toUpperCase())) return name;
  const base = name.replace(/\s+\d+$/, "");
  for (let n = 2; ; n++) { const c = `${base} ${n}`; if (!set.has(c.toUpperCase())) return c; }
}

/** Parses a single-patch or bank file; names already present get a number. */
export function parsePatchFile(raw: unknown, taken: string[]): { patches: Patch[]; samples?: SampleMap } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { kind?: string; patch?: unknown; patches?: unknown[]; samples?: SampleMap };
  const list = r.kind === "nad-patch-bank" && Array.isArray(r.patches) ? r.patches : r.kind === "nad-patch" ? [r.patch] : null;
  if (!list) return null;
  const names = [...taken], out: Patch[] = [];
  for (const x of list) { const p = validPatch(x); if (!p) continue; p.id = newId(); p.name = uniqueName(p.name, names); names.push(p.name); out.push(p); }
  return out.length ? { patches: out, samples: r.samples } : null;
}

export const readPatches = (): Patch[] => { try { const v = JSON.parse(localStorage.getItem(PATCH_KEY) || "[]"); return Array.isArray(v) ? v.map(validPatch).filter((p): p is Patch => !!p) : []; } catch { return []; } };
export const samplesOf = (ps: Patch[]) => [...new Set(ps.map(p => p.sound.sampler?.sampleId ?? "").filter(id => id.startsWith("db:")))];
