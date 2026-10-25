// Groovebox → VJ event bus. Same-window listeners plus a BroadcastChannel so a pop-out window on a TV gets every hit.
export type VjKind = "kick" | "snare" | "hat" | "open" | "perc" | "tone";
export type VjMsg = { t: "hit"; kind: VjKind; vel: number } | { t: "level"; v: number } | { t: "signal"; wave: number[]; beat: number; bpm: number; running: boolean } | { t: "theme"; theme: string } | { t: "hello" } | { t: "ctl"; model: number; size: number };

const ch = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("nad-vj") : null;
const subs = new Set<(m: VjMsg) => void>();
ch?.addEventListener("message", e => subs.forEach(f => f(e.data as VjMsg)));

export function vjSend(m: VjMsg) { subs.forEach(f => f(m)); ch?.postMessage(m); }
export function vjListen(f: (m: VjMsg) => void) { subs.add(f); return () => { subs.delete(f); }; }

/** Map a pad role to a visual reaction family. */
export function vjKindOf(role: string, engine: string): VjKind {
  if (role === "kick" || role === "snare" || role === "hat" || role === "open" || role === "perc") return role;
  return engine === "drum" ? "perc" : "tone";
}
