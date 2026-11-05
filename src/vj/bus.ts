// Groovebox → VJ event bus. Same-window listeners plus a BroadcastChannel so a pop-out window on a TV gets every hit.
import { DEFAULT_VISUAL, visualControl, type VisualState } from "./colorSweep";
import type { AvPerformance } from "./performance";
export type VjKind = "kick" | "snare" | "hat" | "open" | "perc" | "tone";
export type VjPad = { index: number; name: string; engine: string; role: string; notes: number[]; cut?: number; fx?: { type: string; mix: number }[] };
export type DocPad = { index: number; name: string; engine: string; role: string; kind: VjKind; note: number; mute: boolean; solo: boolean; len: number; steps: number[]; vel: number[]; chance: number[]; cut?: number; env?: { a: number; r: number }; fx: { type: string; mix: number }[] };
export type VjMsg = { t: "hit"; kind: VjKind; vel: number; pad?: VjPad } | { t: "level"; v: number } | { t: "signal"; wave: number[]; beat: number; bpm: number; running: boolean; peak?: number; rms?: number; step?: number; bank?: string; perf?: AvPerformance } | { t: "perf"; params: AvPerformance } | { t: "theme"; theme: string } | { t: "hello" } | { t: "doc"; bank: string; bpm: number; pads: DocPad[] } | { t: "ctl"; model: number; size: number } | { t: "color"; enabled: boolean } | { t: "visual"; state: VisualState };

const ch = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("nad-vj") : null;
const subs = new Set<(m: VjMsg) => void>();
let visual: VisualState = { ...DEFAULT_VISUAL }, known = false;
export function vjVisualState(): VisualState { return { ...visual }; }
function deliver(m: VjMsg) {
  if (m.t === "ctl") { visual = visualControl(visual, m.model, m.size); known = true; }
  else if (m.t === "color") { visual = { ...visual, color: m.enabled }; known = true; }
  else if (m.t === "visual") { visual = { ...m.state }; known = true; }
  subs.forEach(f => f(m));
  if (m.t === "hello" && known) vjSend({ t: "visual", state: vjVisualState() });
}
ch?.addEventListener("message", e => deliver(e.data as VjMsg));

export function vjSend(m: VjMsg) { deliver(m); ch?.postMessage(m); }
export function vjListen(f: (m: VjMsg) => void) { subs.add(f); return () => { subs.delete(f); }; }

/** Map a pad role to a visual reaction family. */
export function vjKindOf(role: string, engine: string): VjKind {
  if (role === "kick" || role === "snare" || role === "hat" || role === "open" || role === "perc") return role;
  return engine === "drum" || engine === "idm" ? "perc" : "tone";
}
