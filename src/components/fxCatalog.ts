import type { FxType } from "@/audio/effects";

// Chooser metadata only: effect identifiers, DSP order and MIDI labels stay untouched.
export const FX_CATEGORIES = [
  { label: "DYN", effects: ["compressor", "noisegate", "sidechain", "ott", "gain"] },
  { label: "FILT", effects: ["eq", "dyneq", "djfilter", "morph", "drumbus"] },
  { label: "DIRT", effects: ["saturation", "acid", "bitcrush", "metal", "spectral"] },
  { label: "MOD", effects: ["chorus", "flanger", "phaser", "vibrato", "tremolo"] },
  { label: "TIME", effects: ["delay", "reverseDelay", "reverb", "hack", "gate"] },
] as const satisfies readonly { label: string; effects: readonly FxType[] }[];

export const FX_CHOOSER_NAMES: Record<FxType, string> = {
  compressor: "COMP", noisegate: "GATE", sidechain: "DUCK", ott: "OTT", gain: "GAIN",
  eq: "EQ", dyneq: "DYN.EQ", djfilter: "DJ.FLT", morph: "MORPH", drumbus: "DRM.BUS",
  saturation: "SATUR", acid: "ACID", bitcrush: "CRUSH", metal: "METAL", spectral: "SPECTR",
  chorus: "CHORUS", flanger: "FLANGE", phaser: "PHASER", vibrato: "VIB", tremolo: "TREM",
  delay: "DELAY", reverseDelay: "REVERS", reverb: "REVERB", hack: "HACK", gate: "TRANCE",
};

export const fxCategoryRect = (index: number) => ({ x: 1 + index * 25, y: 10, w: 24, h: 9 });
export const fxChoiceRect = (index: number) => index < 4
  ? { x: 1 + (index % 2) * 63, y: 21 + Math.floor(index / 2) * 11, w: 61, h: 10 }
  : { x: 1, y: 43, w: 124, h: 10 };