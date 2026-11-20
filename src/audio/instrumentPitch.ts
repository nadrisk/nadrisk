/** Fresh instrument roots; saved notes are never replaced on recall. */
export const defaultInstrumentNote = (engine: string) => engine === "808" ? 24 : 48;
export const SAMPLE_ROOT = 48;
/** KEY/SCL edits unify pitched roots without moving the instrument's octave or drum tuning. */
export function instrumentKeyNote(engine: string, note: number, key: number): number {
  if (engine === "drum" || engine === "idm") return note;
  return Math.floor(note / 12) * 12 + ((Math.round(key) % 12) + 12) % 12;
}
/** Old samples implicitly used C4; new samples carry their explicit original register. */
export const sampleTranspose = (note: number, sampleKey = 0, rootNote = 60) => note - rootNote - sampleKey;
export const sliceIndex = (note: number, count: number) => count > 0 ? ((Math.round(note - SAMPLE_ROOT) % count) + count) % count : 0;