// Groovebox → VJ event bus. Same-window listeners plus a BroadcastChannel so a pop-out window on a TV gets every hit.
export type VjKind = "kick" | "snare" | "hat" | "open" | "perc" | "tone";
export type VjPad = { index: number; name: string; engine: string; role: string; notes: number[]; cut?: number; fx?: { type: string; mix: number }[] };
export type DocPad = { index: number; name: string; engine: string; role: string; kind: VjKind; note: number; mute: boolean; solo: boolean; len: number; steps: number[]; vel: number[]; chance: number[]; cut?: number; env?: { a: number; r: number }; fx: { type: string; mix: number }[] };
export type VjMsg = { t: "hit"; kind: VjKind; vel: number; pad?: VjPad } | { t: "level"; v: number } | { t: "signal"; wave: number[]; beat: number; bpm: number; running: boolean; peak?: number; rms?: number; step?: number; bank?: string } | { t: "theme"; theme: string } | { t: "hello" } | { t: "doc"; bank: string; bpm: number; pads: DocPad[] } | { t: "ctl"; model: number; size: number };

const ch = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("nad-vj") : null;
const subs = new Set<(m: VjMsg) => void>();
ch?.addEventListener("message", e => subs.forEach(f => f(e.data as VjMsg)));

export function vjSend(m: VjMsg) { subs.forEach(f => f(m)); ch?.postMessage(m); }
export function vjListen(f: (m: VjMsg) => void) { subs.add(f); return () => { subs.delete(f); }; }

/** Map a pad role to a visual reaction family. */
export function vjKindOf(role: string, engine: string): VjKind {
  if (role === "kick" || role === "snare" || role === "hat" || role === "open" || role === "perc") return role;
  return engine === "drum" || engine === "idm" ? "perc" : "tone";
}
