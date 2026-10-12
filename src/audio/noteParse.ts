const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Parse "G1", "F#2", "Bb1 -12", "D#3+25c" or a Hz value ("49", "49hz") into Hz; null when unreadable. */
export function parseNote(text: string): number | null {
  const t = text.trim().toUpperCase().replace(/\s+/g, "");
  if (!t) return null;
  const hz = t.match(/^(\d+(?:\.\d+)?)(HZ)?$/);
  if (hz) { const f = Number(hz[1]); return f > 0 ? f : null; }
  const m = t.match(/^([A-G])(#|B)?(-?\d)([+-]\d{1,3}(?:\.\d+)?)?C?$/);
  if (!m) return null;
  const midi = SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "B" ? -1 : 0) + (Number(m[3]) + 1) * 12;
  const cents = m[4] ? Number(m[4]) : 0;
  if (Math.abs(cents) > 100) return null;
  return 440 * 2 ** ((midi + cents / 100 - 69) / 12);
}
