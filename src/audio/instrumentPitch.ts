/** Fresh instrument roots; saved notes are never replaced on recall. */
export const defaultInstrumentNote = (engine: string) => engine === "808" ? 29 : engine === "synth" || engine === "pad" ? 53 : 48;
export const SAMPLE_ROOT = 48;
/** Old samples implicitly used C4; new samples carry their explicit original register. */
export const sampleTranspose = (note: number, sampleKey = 0, rootNote = 60) => note - rootNote - sampleKey;
export const sliceIndex = (note: number, count: number) => count > 0 ? ((Math.round(note - SAMPLE_ROOT) % count) + count) % count : 0;