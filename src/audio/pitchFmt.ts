import { NOTE_NAMES } from "./arp";

/** Hz -> note name + cents (e.g. "A4+20c"), used by tuned drum/PRC knobs. */
export const noteCents = (f: number) => {
  const m = 69 + 12 * Math.log2(f / 440), r = Math.round(m), c = Math.round((m - r) * 100);
  return `${NOTE_NAMES[((r % 12) + 12) % 12]}${Math.floor(r / 12) - 1}${c > 0 ? "+" : c < 0 ? "-" : ""}${c ? Math.abs(c) + "c" : ""}`;
};

/** Whether a pad plays one note at a time, so phrase slides may glide its pitch. */
export const isSlotMono = (s: { engine: string; synthVoices?: number; samplerMode?: string }) =>
  s.engine === "808" || (s.engine === "synth" && s.synthVoices === 1) || (s.engine === "sampler" && s.samplerMode === "one");
