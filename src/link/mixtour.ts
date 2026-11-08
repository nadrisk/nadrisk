// Reloop Mixtour (1st edition) factory MIDI map: left side sends on MIDI channel 1, right side on channel 2.
// Numbers from Reloop's published MIDI map (as used by Mixxx's Mixtour mapping). Values are on-screen control labels.
const side = (ch: number, d: "A" | "B", keyBase: number): Record<string, string> => ({
  [`cc:${ch}:1`]: `Deck ${d} HI EQ`,
  [`cc:${ch}:2`]: `Deck ${d} MID EQ`,
  [`cc:${ch}:3`]: `Deck ${d} LOW EQ`,
  [`cc:${ch}:4`]: `Deck ${d} filter`,
  [`cc:${ch}:5`]: `Deck ${d} channel fader`,
  [`note:${ch}:12`]: `Start deck ${d} on next bar`, // PLAY
  [`note:${ch}:11`]: `Stop deck ${d}`, // CUE
  [`note:${ch}:1`]: `Reset deck ${d} filter`, // FX
  // C1–C4 pads: left = mute keys 1–4, right = 5–8; SHIFT+C1–C4 on the left launch patterns A–D.
  ...Object.fromEntries([13, 14, 15, 16].map((n, i) => [`note:${ch}:${n}`, `Mute key ${keyBase + i}`])),
});
export const MIXTOUR_MAP: Record<string, string> = {
  ...side(0, "A", 1), ...side(1, "B", 5),
  "cc:0:8": "Crossfader",
  "note:0:2": "Mute page", // left LOAD
  "note:1:2": "Crossfader curve", // right LOAD
  "note:0:10": "Shift mute keys to solo", // left SYNC
  "note:1:10": "Unmute all pads", // right SYNC
  ...Object.fromEntries(["A", "B", "C", "D"].map((b, i) => [`note:0:${76 + i}`, `Performance pattern ${b}`])),
};
