/** Six fixed channels replace the old 16 fillable pads. Slot indices 0..5 are the channels; the rest stay as silent hidden placeholders so per-index audio graphs keep their shape. */
export type ChannelId = "KIK" | "SNR" | "HAT" | "CLP" | "PRC" | "SURF";
export type ChannelSpec = { id: ChannelId; engine: "drum" | "idm" | "synth"; kind?: "kick" | "snare" | "hat" | "clap" };
export const CHANNELS: readonly ChannelSpec[] = [
  { id: "KIK", engine: "drum", kind: "kick" },
  { id: "SNR", engine: "drum", kind: "snare" },
  { id: "HAT", engine: "drum", kind: "hat" },
  { id: "CLP", engine: "drum", kind: "clap" },
  { id: "PRC", engine: "idm" },
  { id: "SURF", engine: "synth" },
];
export const CHANNEL_COUNT = CHANNELS.length;
type SlotLike = { engine: string; drum?: { kind?: string } };
const fits = (c: ChannelSpec, s: SlotLike) => s.engine === c.engine && (!c.kind || s.drum?.kind === c.kind);
/** For each channel, the index of the first old slot of that voice type (or null). Each old slot is used at most once. */
export function pickChannels(old: readonly (SlotLike | null | undefined)[]): (number | null)[] {
  const used = new Set<number>();
  return CHANNELS.map(c => { const i = old.findIndex((s, k) => !!s && !used.has(k) && fits(c, s)); if (i < 0) return null; used.add(i); return i; });
}
/** How many old slots that made sound were left out by the mapping. */
export const droppedCount = (old: readonly (SlotLike | null | undefined)[], picked: (number | null)[]) =>
  old.filter((s, k) => !!s && s.engine !== "sampler" && !picked.includes(k)).length;
